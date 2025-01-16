"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkToolkit = exports.AssetBuildTime = void 0;
exports.markTesting = markTesting;
const path = require("path");
const util_1 = require("util");
const cxapi = require("@aws-cdk/cx-api");
const chalk = require("chalk");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const promptly = require("promptly");
const uuid = require("uuid");
const bootstrap_1 = require("./api/bootstrap");
const cloud_assembly_1 = require("./api/cxapp/cloud-assembly");
const garbage_collector_1 = require("./api/garbage-collection/garbage-collector");
const common_1 = require("./api/hotswap/common");
const find_cloudwatch_logs_1 = require("./api/logs/find-cloudwatch-logs");
const logs_monitor_1 = require("./api/logs/logs-monitor");
const cloudformation_1 = require("./api/util/cloudformation");
const stack_activity_monitor_1 = require("./api/util/cloudformation/stack-activity-monitor");
const migrate_1 = require("./commands/migrate");
const diff_1 = require("./diff");
const import_1 = require("./import");
const list_stacks_1 = require("./list-stacks");
const logging_1 = require("./logging");
const serialize_1 = require("./serialize");
const settings_1 = require("./settings");
const error_1 = require("./toolkit/error");
const util_2 = require("./util");
const validate_notification_arn_1 = require("./util/validate-notification-arn");
const work_graph_builder_1 = require("./util/work-graph-builder");
const environments_1 = require("../lib/api/cxapp/environments");
// Must use a require() otherwise esbuild complains about calling a namespace
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pLimit = require('p-limit');
let TESTING = false;
function markTesting() {
    TESTING = true;
}
/**
 * When to build assets
 */
var AssetBuildTime;
(function (AssetBuildTime) {
    /**
     * Build all assets before deploying the first stack
     *
     * This is intended for expensive Docker image builds; so that if the Docker image build
     * fails, no stacks are unnecessarily deployed (with the attendant wait time).
     */
    AssetBuildTime[AssetBuildTime["ALL_BEFORE_DEPLOY"] = 0] = "ALL_BEFORE_DEPLOY";
    /**
     * Build assets just-in-time, before publishing
     */
    AssetBuildTime[AssetBuildTime["JUST_IN_TIME"] = 1] = "JUST_IN_TIME";
})(AssetBuildTime || (exports.AssetBuildTime = AssetBuildTime = {}));
/**
 * Toolkit logic
 *
 * The toolkit runs the `cloudExecutable` to obtain a cloud assembly and
 * deploys applies them to `cloudFormation`.
 */
class CdkToolkit {
    constructor(props) {
        this.props = props;
    }
    async metadata(stackName, json) {
        const stacks = await this.selectSingleStackByName(stackName);
        printSerializedObject(stacks.firstStack.manifest.metadata ?? {}, json);
    }
    async acknowledge(noticeId) {
        const acks = this.props.configuration.context.get('acknowledged-issue-numbers') ?? [];
        acks.push(Number(noticeId));
        this.props.configuration.context.set('acknowledged-issue-numbers', acks);
        await this.props.configuration.saveContext();
    }
    async diff(options) {
        const stacks = await this.selectStacksForDiff(options.stackNames, options.exclusively);
        const strict = !!options.strict;
        const contextLines = options.contextLines || 3;
        const stream = options.stream || process.stderr;
        const quiet = options.quiet || false;
        let diffs = 0;
        const parameterMap = buildParameterMap(options.parameters);
        if (options.templatePath !== undefined) {
            // Compare single stack against fixed template
            if (stacks.stackCount !== 1) {
                throw new error_1.ToolkitError('Can only select one stack when comparing to fixed template. Use --exclusively to avoid selecting multiple stacks.');
            }
            if (!(await fs.pathExists(options.templatePath))) {
                throw new error_1.ToolkitError(`There is no file at ${options.templatePath}`);
            }
            const template = (0, serialize_1.deserializeStructure)(await fs.readFile(options.templatePath, { encoding: 'UTF-8' }));
            diffs = options.securityOnly
                ? (0, util_2.numberFromBool)((0, diff_1.printSecurityDiff)(template, stacks.firstStack, diff_1.RequireApproval.Broadening, quiet))
                : (0, diff_1.printStackDiff)(template, stacks.firstStack, strict, contextLines, quiet, undefined, undefined, false, stream);
        }
        else {
            // Compare N stacks against deployed templates
            for (const stack of stacks.stackArtifacts) {
                const templateWithNestedStacks = await this.props.deployments.readCurrentTemplateWithNestedStacks(stack, options.compareAgainstProcessedTemplate);
                const currentTemplate = templateWithNestedStacks.deployedRootTemplate;
                const nestedStacks = templateWithNestedStacks.nestedStacks;
                const resourcesToImport = await this.tryGetResources(await this.props.deployments.resolveEnvironment(stack));
                if (resourcesToImport) {
                    (0, import_1.removeNonImportResources)(stack);
                }
                let changeSet = undefined;
                if (options.changeSet) {
                    let stackExists = false;
                    try {
                        stackExists = await this.props.deployments.stackExists({
                            stack,
                            deployName: stack.stackName,
                            tryLookupRole: true,
                        });
                    }
                    catch (e) {
                        (0, logging_1.debug)(e.message);
                        if (!quiet) {
                            stream.write(`Checking if the stack ${stack.stackName} exists before creating the changeset has failed, will base the diff on template differences (run again with -v to see the reason)\n`);
                        }
                        stackExists = false;
                    }
                    if (stackExists) {
                        changeSet = await (0, cloudformation_1.createDiffChangeSet)({
                            stack,
                            uuid: uuid.v4(),
                            deployments: this.props.deployments,
                            willExecute: false,
                            sdkProvider: this.props.sdkProvider,
                            parameters: Object.assign({}, parameterMap['*'], parameterMap[stack.stackName]),
                            resourcesToImport,
                            stream,
                        });
                    }
                    else {
                        (0, logging_1.debug)(`the stack '${stack.stackName}' has not been deployed to CloudFormation or describeStacks call failed, skipping changeset creation.`);
                    }
                }
                const stackCount = options.securityOnly
                    ? (0, util_2.numberFromBool)((0, diff_1.printSecurityDiff)(currentTemplate, stack, diff_1.RequireApproval.Broadening, quiet, stack.displayName, changeSet))
                    : (0, diff_1.printStackDiff)(currentTemplate, stack, strict, contextLines, quiet, stack.displayName, changeSet, !!resourcesToImport, stream, nestedStacks);
                diffs += stackCount;
            }
        }
        stream.write((0, util_1.format)('\n✨  Number of stacks with differences: %s\n', diffs));
        return diffs && options.fail ? 1 : 0;
    }
    async deploy(options) {
        if (options.watch) {
            return this.watch(options);
        }
        const startSynthTime = new Date().getTime();
        const stackCollection = await this.selectStacksForDeploy(options.selector, options.exclusively, options.cacheCloudAssembly, options.ignoreNoStacks);
        const elapsedSynthTime = new Date().getTime() - startSynthTime;
        (0, logging_1.print)('\n✨  Synthesis time: %ss\n', formatTime(elapsedSynthTime));
        if (stackCollection.stackCount === 0) {
            // eslint-disable-next-line no-console
            console.error('This app contains no stacks');
            return;
        }
        await this.tryMigrateResources(stackCollection, options);
        const requireApproval = options.requireApproval ?? diff_1.RequireApproval.Broadening;
        const parameterMap = buildParameterMap(options.parameters);
        if (options.hotswap !== common_1.HotswapMode.FULL_DEPLOYMENT) {
            (0, logging_1.warning)('⚠️ The --hotswap and --hotswap-fallback flags deliberately introduce CloudFormation drift to speed up deployments');
            (0, logging_1.warning)('⚠️ They should only be used for development - never use them for your production Stacks!\n');
        }
        let hotswapPropertiesFromSettings = this.props.configuration.settings.get(['hotswap']) || {};
        let hotswapPropertyOverrides = new common_1.HotswapPropertyOverrides();
        hotswapPropertyOverrides.ecsHotswapProperties = new common_1.EcsHotswapProperties(hotswapPropertiesFromSettings.ecs?.minimumHealthyPercent, hotswapPropertiesFromSettings.ecs?.maximumHealthyPercent);
        const stacks = stackCollection.stackArtifacts;
        const stackOutputs = {};
        const outputsFile = options.outputsFile;
        const buildAsset = async (assetNode) => {
            await this.props.deployments.buildSingleAsset(assetNode.assetManifestArtifact, assetNode.assetManifest, assetNode.asset, {
                stack: assetNode.parentStack,
                roleArn: options.roleArn,
                stackName: assetNode.parentStack.stackName,
            });
        };
        const publishAsset = async (assetNode) => {
            await this.props.deployments.publishSingleAsset(assetNode.assetManifest, assetNode.asset, {
                stack: assetNode.parentStack,
                roleArn: options.roleArn,
                stackName: assetNode.parentStack.stackName,
            });
        };
        const deployStack = async (stackNode) => {
            const stack = stackNode.stack;
            if (stackCollection.stackCount !== 1) {
                (0, logging_1.highlight)(stack.displayName);
            }
            if (!stack.environment) {
                // eslint-disable-next-line max-len
                throw new error_1.ToolkitError(`Stack ${stack.displayName} does not define an environment, and AWS credentials could not be obtained from standard locations or no region was configured.`);
            }
            if (Object.keys(stack.template.Resources || {}).length === 0) {
                // The generated stack has no resources
                if (!(await this.props.deployments.stackExists({ stack }))) {
                    (0, logging_1.warning)('%s: stack has no resources, skipping deployment.', chalk.bold(stack.displayName));
                }
                else {
                    (0, logging_1.warning)('%s: stack has no resources, deleting existing stack.', chalk.bold(stack.displayName));
                    await this.destroy({
                        selector: { patterns: [stack.hierarchicalId] },
                        exclusively: true,
                        force: true,
                        roleArn: options.roleArn,
                        fromDeploy: true,
                        ci: options.ci,
                    });
                }
                return;
            }
            if (requireApproval !== diff_1.RequireApproval.Never) {
                const currentTemplate = await this.props.deployments.readCurrentTemplate(stack);
                if ((0, diff_1.printSecurityDiff)(currentTemplate, stack, requireApproval)) {
                    await askUserConfirmation(concurrency, '"--require-approval" is enabled and stack includes security-sensitive updates', 'Do you wish to deploy these changes');
                }
            }
            // Following are the same semantics we apply with respect to Notification ARNs (dictated by the SDK)
            //
            //  - undefined  =>  cdk ignores it, as if it wasn't supported (allows external management).
            //  - []:        =>  cdk manages it, and the user wants to wipe it out.
            //  - ['arn-1']  =>  cdk manages it, and the user wants to set it to ['arn-1'].
            const notificationArns = (!!options.notificationArns || !!stack.notificationArns)
                ? (options.notificationArns ?? []).concat(stack.notificationArns ?? [])
                : undefined;
            for (const notificationArn of notificationArns ?? []) {
                if (!(0, validate_notification_arn_1.validateSnsTopicArn)(notificationArn)) {
                    throw new error_1.ToolkitError(`Notification arn ${notificationArn} is not a valid arn for an SNS topic`);
                }
            }
            const stackIndex = stacks.indexOf(stack) + 1;
            (0, logging_1.print)('%s: deploying... [%s/%s]', chalk.bold(stack.displayName), stackIndex, stackCollection.stackCount);
            const startDeployTime = new Date().getTime();
            let tags = options.tags;
            if (!tags || tags.length === 0) {
                tags = tagsForStack(stack);
            }
            let elapsedDeployTime = 0;
            try {
                let deployResult;
                let rollback = options.rollback;
                let iteration = 0;
                while (!deployResult) {
                    if (++iteration > 2) {
                        throw new error_1.ToolkitError('This loop should have stabilized in 2 iterations, but didn\'t. If you are seeing this error, please report it at https://github.com/aws/aws-cdk/issues/new/choose');
                    }
                    const r = await this.props.deployments.deployStack({
                        stack,
                        deployName: stack.stackName,
                        roleArn: options.roleArn,
                        toolkitStackName: options.toolkitStackName,
                        reuseAssets: options.reuseAssets,
                        notificationArns,
                        tags,
                        execute: options.execute,
                        changeSetName: options.changeSetName,
                        deploymentMethod: options.deploymentMethod,
                        force: options.force,
                        parameters: Object.assign({}, parameterMap['*'], parameterMap[stack.stackName]),
                        usePreviousParameters: options.usePreviousParameters,
                        progress,
                        ci: options.ci,
                        rollback,
                        hotswap: options.hotswap,
                        hotswapPropertyOverrides: hotswapPropertyOverrides,
                        extraUserAgent: options.extraUserAgent,
                        assetParallelism: options.assetParallelism,
                        ignoreNoStacks: options.ignoreNoStacks,
                    });
                    switch (r.type) {
                        case 'did-deploy-stack':
                            deployResult = r;
                            break;
                        case 'failpaused-need-rollback-first': {
                            const motivation = r.reason === 'replacement'
                                ? `Stack is in a paused fail state (${r.status}) and change includes a replacement which cannot be deployed with "--no-rollback"`
                                : `Stack is in a paused fail state (${r.status}) and command line arguments do not include "--no-rollback"`;
                            if (options.force) {
                                (0, logging_1.warning)(`${motivation}. Rolling back first (--force).`);
                            }
                            else {
                                await askUserConfirmation(concurrency, motivation, `${motivation}. Roll back first and then proceed with deployment`);
                            }
                            // Perform a rollback
                            await this.rollback({
                                selector: { patterns: [stack.hierarchicalId] },
                                toolkitStackName: options.toolkitStackName,
                                force: options.force,
                            });
                            // Go around through the 'while' loop again but switch rollback to true.
                            rollback = true;
                            break;
                        }
                        case 'replacement-requires-rollback': {
                            const motivation = 'Change includes a replacement which cannot be deployed with "--no-rollback"';
                            if (options.force) {
                                (0, logging_1.warning)(`${motivation}. Proceeding with regular deployment (--force).`);
                            }
                            else {
                                await askUserConfirmation(concurrency, motivation, `${motivation}. Perform a regular deployment`);
                            }
                            // Go around through the 'while' loop again but switch rollback to false.
                            rollback = true;
                            break;
                        }
                        default:
                            throw new error_1.ToolkitError(`Unexpected result type from deployStack: ${JSON.stringify(r)}. If you are seeing this error, please report it at https://github.com/aws/aws-cdk/issues/new/choose`);
                    }
                }
                const message = deployResult.noOp
                    ? ' ✅  %s (no changes)'
                    : ' ✅  %s';
                (0, logging_1.success)('\n' + message, stack.displayName);
                elapsedDeployTime = new Date().getTime() - startDeployTime;
                (0, logging_1.print)('\n✨  Deployment time: %ss\n', formatTime(elapsedDeployTime));
                if (Object.keys(deployResult.outputs).length > 0) {
                    (0, logging_1.print)('Outputs:');
                    stackOutputs[stack.stackName] = deployResult.outputs;
                }
                for (const name of Object.keys(deployResult.outputs).sort()) {
                    const value = deployResult.outputs[name];
                    (0, logging_1.print)('%s.%s = %s', chalk.cyan(stack.id), chalk.cyan(name), chalk.underline(chalk.cyan(value)));
                }
                (0, logging_1.print)('Stack ARN:');
                (0, logging_1.data)(deployResult.stackArn);
            }
            catch (e) {
                // It has to be exactly this string because an integration test tests for
                // "bold(stackname) failed: ResourceNotReady: <error>"
                throw new error_1.ToolkitError([`❌  ${chalk.bold(stack.stackName)} failed:`, ...(e.name ? [`${e.name}:`] : []), e.message].join(' '));
            }
            finally {
                if (options.cloudWatchLogMonitor) {
                    const foundLogGroupsResult = await (0, find_cloudwatch_logs_1.findCloudWatchLogGroups)(this.props.sdkProvider, stack);
                    options.cloudWatchLogMonitor.addLogGroups(foundLogGroupsResult.env, foundLogGroupsResult.sdk, foundLogGroupsResult.logGroupNames);
                }
                // If an outputs file has been specified, create the file path and write stack outputs to it once.
                // Outputs are written after all stacks have been deployed. If a stack deployment fails,
                // all of the outputs from successfully deployed stacks before the failure will still be written.
                if (outputsFile) {
                    fs.ensureFileSync(outputsFile);
                    await fs.writeJson(outputsFile, stackOutputs, {
                        spaces: 2,
                        encoding: 'utf8',
                    });
                }
            }
            (0, logging_1.print)('\n✨  Total time: %ss\n', formatTime(elapsedSynthTime + elapsedDeployTime));
        };
        const assetBuildTime = options.assetBuildTime ?? AssetBuildTime.ALL_BEFORE_DEPLOY;
        const prebuildAssets = assetBuildTime === AssetBuildTime.ALL_BEFORE_DEPLOY;
        const concurrency = options.concurrency || 1;
        const progress = concurrency > 1 ? stack_activity_monitor_1.StackActivityProgress.EVENTS : options.progress;
        if (concurrency > 1 && options.progress && options.progress != stack_activity_monitor_1.StackActivityProgress.EVENTS) {
            (0, logging_1.warning)('⚠️ The --concurrency flag only supports --progress "events". Switching to "events".');
        }
        const stacksAndTheirAssetManifests = stacks.flatMap((stack) => [
            stack,
            ...stack.dependencies.filter(cxapi.AssetManifestArtifact.isAssetManifestArtifact),
        ]);
        const workGraph = new work_graph_builder_1.WorkGraphBuilder(prebuildAssets).build(stacksAndTheirAssetManifests);
        // Unless we are running with '--force', skip already published assets
        if (!options.force) {
            await this.removePublishedAssets(workGraph, options);
        }
        const graphConcurrency = {
            'stack': concurrency,
            'asset-build': 1, // This will be CPU-bound/memory bound, mostly matters for Docker builds
            'asset-publish': (options.assetParallelism ?? true) ? 8 : 1, // This will be I/O-bound, 8 in parallel seems reasonable
        };
        await workGraph.doParallel(graphConcurrency, {
            deployStack,
            buildAsset,
            publishAsset,
        });
    }
    /**
     * Roll back the given stack or stacks.
     */
    async rollback(options) {
        const startSynthTime = new Date().getTime();
        const stackCollection = await this.selectStacksForDeploy(options.selector, true);
        const elapsedSynthTime = new Date().getTime() - startSynthTime;
        (0, logging_1.print)('\n✨  Synthesis time: %ss\n', formatTime(elapsedSynthTime));
        if (stackCollection.stackCount === 0) {
            // eslint-disable-next-line no-console
            console.error('No stacks selected');
            return;
        }
        let anyRollbackable = false;
        for (const stack of stackCollection.stackArtifacts) {
            (0, logging_1.print)('Rolling back %s', chalk.bold(stack.displayName));
            const startRollbackTime = new Date().getTime();
            try {
                const result = await this.props.deployments.rollbackStack({
                    stack,
                    roleArn: options.roleArn,
                    toolkitStackName: options.toolkitStackName,
                    force: options.force,
                    validateBootstrapStackVersion: options.validateBootstrapStackVersion,
                    orphanLogicalIds: options.orphanLogicalIds,
                });
                if (!result.notInRollbackableState) {
                    anyRollbackable = true;
                }
                const elapsedRollbackTime = new Date().getTime() - startRollbackTime;
                (0, logging_1.print)('\n✨  Rollback time: %ss\n', formatTime(elapsedRollbackTime));
            }
            catch (e) {
                (0, logging_1.error)('\n ❌  %s failed: %s', chalk.bold(stack.displayName), e.message);
                throw new error_1.ToolkitError('Rollback failed (use --force to orphan failing resources)');
            }
        }
        if (!anyRollbackable) {
            throw new error_1.ToolkitError('No stacks were in a state that could be rolled back');
        }
    }
    async watch(options) {
        const rootDir = path.dirname(path.resolve(settings_1.PROJECT_CONFIG));
        (0, logging_1.debug)("root directory used for 'watch' is: %s", rootDir);
        const watchSettings = this.props.configuration.settings.get(['watch']);
        if (!watchSettings) {
            throw new error_1.ToolkitError("Cannot use the 'watch' command without specifying at least one directory to monitor. " +
                'Make sure to add a "watch" key to your cdk.json');
        }
        // For the "include" subkey under the "watch" key, the behavior is:
        // 1. No "watch" setting? We error out.
        // 2. "watch" setting without an "include" key? We default to observing "./**".
        // 3. "watch" setting with an empty "include" key? We default to observing "./**".
        // 4. Non-empty "include" key? Just use the "include" key.
        const watchIncludes = this.patternsArrayForWatch(watchSettings.include, {
            rootDir,
            returnRootDirIfEmpty: true,
        });
        (0, logging_1.debug)("'include' patterns for 'watch': %s", watchIncludes);
        // For the "exclude" subkey under the "watch" key,
        // the behavior is to add some default excludes in addition to the ones specified by the user:
        // 1. The CDK output directory.
        // 2. Any file whose name starts with a dot.
        // 3. Any directory's content whose name starts with a dot.
        // 4. Any node_modules and its content (even if it's not a JS/TS project, you might be using a local aws-cli package)
        const outputDir = this.props.configuration.settings.get(['output']);
        const watchExcludes = this.patternsArrayForWatch(watchSettings.exclude, {
            rootDir,
            returnRootDirIfEmpty: false,
        }).concat(`${outputDir}/**`, '**/.*', '**/.*/**', '**/node_modules/**');
        (0, logging_1.debug)("'exclude' patterns for 'watch': %s", watchExcludes);
        // Since 'cdk deploy' is a relatively slow operation for a 'watch' process,
        // introduce a concurrency latch that tracks the state.
        // This way, if file change events arrive when a 'cdk deploy' is still executing,
        // we will batch them, and trigger another 'cdk deploy' after the current one finishes,
        // making sure 'cdk deploy's  always execute one at a time.
        // Here's a diagram showing the state transitions:
        // --------------                --------    file changed     --------------    file changed     --------------  file changed
        // |            |  ready event   |      | ------------------> |            | ------------------> |            | --------------|
        // | pre-ready  | -------------> | open |                     | deploying  |                     |   queued   |               |
        // |            |                |      | <------------------ |            | <------------------ |            | <-------------|
        // --------------                --------  'cdk deploy' done  --------------  'cdk deploy' done  --------------
        let latch = 'pre-ready';
        const cloudWatchLogMonitor = options.traceLogs ? new logs_monitor_1.CloudWatchLogEventMonitor() : undefined;
        const deployAndWatch = async () => {
            latch = 'deploying';
            cloudWatchLogMonitor?.deactivate();
            await this.invokeDeployFromWatch(options, cloudWatchLogMonitor);
            // If latch is still 'deploying' after the 'await', that's fine,
            // but if it's 'queued', that means we need to deploy again
            while (latch === 'queued') {
                // TypeScript doesn't realize latch can change between 'awaits',
                // and thinks the above 'while' condition is always 'false' without the cast
                latch = 'deploying';
                (0, logging_1.print)("Detected file changes during deployment. Invoking 'cdk deploy' again");
                await this.invokeDeployFromWatch(options, cloudWatchLogMonitor);
            }
            latch = 'open';
            cloudWatchLogMonitor?.activate();
        };
        chokidar
            .watch(watchIncludes, {
            ignored: watchExcludes,
            cwd: rootDir,
            // ignoreInitial: true,
        })
            .on('ready', async () => {
            latch = 'open';
            (0, logging_1.debug)("'watch' received the 'ready' event. From now on, all file changes will trigger a deployment");
            (0, logging_1.print)("Triggering initial 'cdk deploy'");
            await deployAndWatch();
        })
            .on('all', async (event, filePath) => {
            if (latch === 'pre-ready') {
                (0, logging_1.print)(`'watch' is observing ${event === 'addDir' ? 'directory' : 'the file'} '%s' for changes`, filePath);
            }
            else if (latch === 'open') {
                (0, logging_1.print)("Detected change to '%s' (type: %s). Triggering 'cdk deploy'", filePath, event);
                await deployAndWatch();
            }
            else {
                // this means latch is either 'deploying' or 'queued'
                latch = 'queued';
                (0, logging_1.print)("Detected change to '%s' (type: %s) while 'cdk deploy' is still running. " +
                    'Will queue for another deployment after this one finishes', filePath, event);
            }
        });
    }
    async import(options) {
        const stacks = await this.selectStacksForDeploy(options.selector, true, true, false);
        if (stacks.stackCount > 1) {
            throw new error_1.ToolkitError(`Stack selection is ambiguous, please choose a specific stack for import [${stacks.stackArtifacts.map((x) => x.id).join(', ')}]`);
        }
        if (!process.stdout.isTTY && !options.resourceMappingFile) {
            throw new error_1.ToolkitError('--resource-mapping is required when input is not a terminal');
        }
        const stack = stacks.stackArtifacts[0];
        (0, logging_1.highlight)(stack.displayName);
        const resourceImporter = new import_1.ResourceImporter(stack, this.props.deployments);
        const { additions, hasNonAdditions } = await resourceImporter.discoverImportableResources(options.force);
        if (additions.length === 0) {
            (0, logging_1.warning)('%s: no new resources compared to the currently deployed stack, skipping import.', chalk.bold(stack.displayName));
            return;
        }
        // Prepare a mapping of physical resources to CDK constructs
        const actualImport = !options.resourceMappingFile
            ? await resourceImporter.askForResourceIdentifiers(additions)
            : await resourceImporter.loadResourceIdentifiers(additions, options.resourceMappingFile);
        if (actualImport.importResources.length === 0) {
            (0, logging_1.warning)('No resources selected for import.');
            return;
        }
        // If "--create-resource-mapping" option was passed, write the resource mapping to the given file and exit
        if (options.recordResourceMapping) {
            const outputFile = options.recordResourceMapping;
            fs.ensureFileSync(outputFile);
            await fs.writeJson(outputFile, actualImport.resourceMap, {
                spaces: 2,
                encoding: 'utf8',
            });
            (0, logging_1.print)('%s: mapping file written.', outputFile);
            return;
        }
        // Import the resources according to the given mapping
        (0, logging_1.print)('%s: importing resources into stack...', chalk.bold(stack.displayName));
        const tags = tagsForStack(stack);
        await resourceImporter.importResourcesFromMap(actualImport, {
            roleArn: options.roleArn,
            toolkitStackName: options.toolkitStackName,
            tags,
            deploymentMethod: options.deploymentMethod,
            usePreviousParameters: true,
            progress: options.progress,
            rollback: options.rollback,
        });
        // Notify user of next steps
        (0, logging_1.print)(`Import operation complete. We recommend you run a ${chalk.blueBright('drift detection')} operation ` +
            'to confirm your CDK app resource definitions are up-to-date. Read more here: ' +
            chalk.underline.blueBright('https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/detect-drift-stack.html'));
        if (actualImport.importResources.length < additions.length) {
            (0, logging_1.print)('');
            (0, logging_1.warning)(`Some resources were skipped. Run another ${chalk.blueBright('cdk import')} or a ${chalk.blueBright('cdk deploy')} to bring the stack up-to-date with your CDK app definition.`);
        }
        else if (hasNonAdditions) {
            (0, logging_1.print)('');
            (0, logging_1.warning)(`Your app has pending updates or deletes excluded from this import operation. Run a ${chalk.blueBright('cdk deploy')} to bring the stack up-to-date with your CDK app definition.`);
        }
    }
    async destroy(options) {
        let stacks = await this.selectStacksForDestroy(options.selector, options.exclusively);
        // The stacks will have been ordered for deployment, so reverse them for deletion.
        stacks = stacks.reversed();
        if (!options.force) {
            // eslint-disable-next-line max-len
            const confirmed = await promptly.confirm(`Are you sure you want to delete: ${chalk.blue(stacks.stackArtifacts.map((s) => s.hierarchicalId).join(', '))} (y/n)?`);
            if (!confirmed) {
                return;
            }
        }
        const action = options.fromDeploy ? 'deploy' : 'destroy';
        for (const [index, stack] of stacks.stackArtifacts.entries()) {
            (0, logging_1.success)('%s: destroying... [%s/%s]', chalk.blue(stack.displayName), index + 1, stacks.stackCount);
            try {
                await this.props.deployments.destroyStack({
                    stack,
                    deployName: stack.stackName,
                    roleArn: options.roleArn,
                    ci: options.ci,
                });
                (0, logging_1.success)(`\n ✅  %s: ${action}ed`, chalk.blue(stack.displayName));
            }
            catch (e) {
                (0, logging_1.error)(`\n ❌  %s: ${action} failed`, chalk.blue(stack.displayName), e);
                throw e;
            }
        }
    }
    async list(selectors, options = {}) {
        const stacks = await (0, list_stacks_1.listStacks)(this, {
            selectors: selectors,
        });
        if (options.long && options.showDeps) {
            printSerializedObject(stacks, options.json ?? false);
            return 0;
        }
        if (options.showDeps) {
            const stackDeps = [];
            for (const stack of stacks) {
                stackDeps.push({
                    id: stack.id,
                    dependencies: stack.dependencies,
                });
            }
            printSerializedObject(stackDeps, options.json ?? false);
            return 0;
        }
        if (options.long) {
            const long = [];
            for (const stack of stacks) {
                long.push({
                    id: stack.id,
                    name: stack.name,
                    environment: stack.environment,
                });
            }
            printSerializedObject(long, options.json ?? false);
            return 0;
        }
        // just print stack IDs
        for (const stack of stacks) {
            (0, logging_1.data)(stack.id);
        }
        return 0; // exit-code
    }
    /**
     * Synthesize the given set of stacks (called when the user runs 'cdk synth')
     *
     * INPUT: Stack names can be supplied using a glob filter. If no stacks are
     * given, all stacks from the application are implicitly selected.
     *
     * OUTPUT: If more than one stack ends up being selected, an output directory
     * should be supplied, where the templates will be written.
     */
    async synth(stackNames, exclusively, quiet, autoValidate, json) {
        const stacks = await this.selectStacksForDiff(stackNames, exclusively, autoValidate);
        // if we have a single stack, print it to STDOUT
        if (stacks.stackCount === 1) {
            if (!quiet) {
                printSerializedObject(obscureTemplate(stacks.firstStack.template), json ?? false);
            }
            return undefined;
        }
        // not outputting template to stdout, let's explain things to the user a little bit...
        (0, logging_1.success)(`Successfully synthesized to ${chalk.blue(path.resolve(stacks.assembly.directory))}`);
        (0, logging_1.print)(`Supply a stack id (${stacks.stackArtifacts.map((s) => chalk.green(s.hierarchicalId)).join(', ')}) to display its template.`);
        return undefined;
    }
    /**
     * Bootstrap the CDK Toolkit stack in the accounts used by the specified stack(s).
     *
     * @param userEnvironmentSpecs environment names that need to have toolkit support
     *             provisioned, as a glob filter. If none is provided, all stacks are implicitly selected.
     * @param options The name, role ARN, bootstrapping parameters, etc. to be used for the CDK Toolkit stack.
     */
    async bootstrap(userEnvironmentSpecs, options) {
        const bootstrapper = new bootstrap_1.Bootstrapper(options.source);
        // If there is an '--app' argument and an environment looks like a glob, we
        // select the environments from the app. Otherwise, use what the user said.
        const environments = await this.defineEnvironments(userEnvironmentSpecs);
        const limit = pLimit(20);
        // eslint-disable-next-line @cdklabs/promiseall-no-unbounded-parallelism
        await Promise.all(environments.map((environment) => limit(async () => {
            (0, logging_1.success)(' ⏳  Bootstrapping environment %s...', chalk.blue(environment.name));
            try {
                const result = await bootstrapper.bootstrapEnvironment(environment, this.props.sdkProvider, options);
                const message = result.noOp
                    ? ' ✅  Environment %s bootstrapped (no changes).'
                    : ' ✅  Environment %s bootstrapped.';
                (0, logging_1.success)(message, chalk.blue(environment.name));
            }
            catch (e) {
                (0, logging_1.error)(' ❌  Environment %s failed bootstrapping: %s', chalk.blue(environment.name), e);
                throw e;
            }
        })));
    }
    /**
     * Garbage collects assets from a CDK app's environment
     * @param options Options for Garbage Collection
     */
    async garbageCollect(userEnvironmentSpecs, options) {
        const environments = await this.defineEnvironments(userEnvironmentSpecs);
        for (const environment of environments) {
            (0, logging_1.success)(' ⏳  Garbage Collecting environment %s...', chalk.blue(environment.name));
            const gc = new garbage_collector_1.GarbageCollector({
                sdkProvider: this.props.sdkProvider,
                resolvedEnvironment: environment,
                bootstrapStackName: options.bootstrapStackName,
                rollbackBufferDays: options.rollbackBufferDays,
                createdBufferDays: options.createdBufferDays,
                action: options.action ?? 'full',
                type: options.type ?? 'all',
                confirm: options.confirm ?? true,
            });
            await gc.garbageCollect();
        }
        ;
    }
    async defineEnvironments(userEnvironmentSpecs) {
        // By default, glob for everything
        const environmentSpecs = userEnvironmentSpecs.length > 0 ? [...userEnvironmentSpecs] : ['**'];
        // Partition into globs and non-globs (this will mutate environmentSpecs).
        const globSpecs = (0, util_2.partition)(environmentSpecs, environments_1.looksLikeGlob);
        if (globSpecs.length > 0 && !this.props.cloudExecutable.hasApp) {
            if (userEnvironmentSpecs.length > 0) {
                // User did request this glob
                throw new error_1.ToolkitError(`'${globSpecs}' is not an environment name. Specify an environment name like 'aws://123456789012/us-east-1', or run in a directory with 'cdk.json' to use wildcards.`);
            }
            else {
                // User did not request anything
                throw new error_1.ToolkitError("Specify an environment name like 'aws://123456789012/us-east-1', or run in a directory with 'cdk.json'.");
            }
        }
        const environments = [...(0, environments_1.environmentsFromDescriptors)(environmentSpecs)];
        // If there is an '--app' argument, select the environments from the app.
        if (this.props.cloudExecutable.hasApp) {
            environments.push(...(await (0, environments_1.globEnvironmentsFromStacks)(await this.selectStacksForList([]), globSpecs, this.props.sdkProvider)));
        }
        return environments;
    }
    /**
     * Migrates a CloudFormation stack/template to a CDK app
     * @param options Options for CDK app creation
     */
    async migrate(options) {
        (0, logging_1.warning)('This command is an experimental feature.');
        const language = options.language?.toLowerCase() ?? 'typescript';
        const environment = (0, migrate_1.setEnvironment)(options.account, options.region);
        let generateTemplateOutput;
        let cfn;
        let templateToDelete;
        try {
            // if neither fromPath nor fromStack is provided, generate a template using cloudformation
            const scanType = (0, migrate_1.parseSourceOptions)(options.fromPath, options.fromStack, options.stackName).source;
            if (scanType == migrate_1.TemplateSourceOptions.SCAN) {
                generateTemplateOutput = await (0, migrate_1.generateTemplate)({
                    stackName: options.stackName,
                    filters: options.filter,
                    fromScan: options.fromScan,
                    sdkProvider: this.props.sdkProvider,
                    environment: environment,
                });
                templateToDelete = generateTemplateOutput.templateId;
            }
            else if (scanType == migrate_1.TemplateSourceOptions.PATH) {
                const templateBody = (0, migrate_1.readFromPath)(options.fromPath);
                const parsedTemplate = (0, serialize_1.deserializeStructure)(templateBody);
                const templateId = parsedTemplate.Metadata?.TemplateId?.toString();
                if (templateId) {
                    // if we have a template id, we can call describe generated template to get the resource identifiers
                    // resource metadata, and template source to generate the template
                    cfn = new migrate_1.CfnTemplateGeneratorProvider(await (0, migrate_1.buildCfnClient)(this.props.sdkProvider, environment));
                    const generatedTemplateSummary = await cfn.describeGeneratedTemplate(templateId);
                    generateTemplateOutput = (0, migrate_1.buildGenertedTemplateOutput)(generatedTemplateSummary, templateBody, generatedTemplateSummary.GeneratedTemplateId);
                }
                else {
                    generateTemplateOutput = {
                        migrateJson: {
                            templateBody: templateBody,
                            source: 'localfile',
                        },
                    };
                }
            }
            else if (scanType == migrate_1.TemplateSourceOptions.STACK) {
                const template = await (0, migrate_1.readFromStack)(options.stackName, this.props.sdkProvider, environment);
                if (!template) {
                    throw new error_1.ToolkitError(`No template found for stack-name: ${options.stackName}`);
                }
                generateTemplateOutput = {
                    migrateJson: {
                        templateBody: template,
                        source: options.stackName,
                    },
                };
            }
            else {
                // We shouldn't ever get here, but just in case.
                throw new error_1.ToolkitError(`Invalid source option provided: ${scanType}`);
            }
            const stack = (0, migrate_1.generateStack)(generateTemplateOutput.migrateJson.templateBody, options.stackName, language);
            (0, logging_1.success)(' ⏳  Generating CDK app for %s...', chalk.blue(options.stackName));
            await (0, migrate_1.generateCdkApp)(options.stackName, stack, language, options.outputPath, options.compress);
            if (generateTemplateOutput) {
                (0, migrate_1.writeMigrateJsonFile)(options.outputPath, options.stackName, generateTemplateOutput.migrateJson);
            }
            if ((0, migrate_1.isThereAWarning)(generateTemplateOutput)) {
                (0, logging_1.warning)(' ⚠️  Some resources could not be migrated completely. Please review the README.md file for more information.');
                (0, migrate_1.appendWarningsToReadme)(`${path.join(options.outputPath ?? process.cwd(), options.stackName)}/README.md`, generateTemplateOutput.resources);
            }
        }
        catch (e) {
            (0, logging_1.error)(' ❌  Migrate failed for `%s`: %s', options.stackName, e.message);
            throw e;
        }
        finally {
            if (templateToDelete) {
                if (!cfn) {
                    cfn = new migrate_1.CfnTemplateGeneratorProvider(await (0, migrate_1.buildCfnClient)(this.props.sdkProvider, environment));
                }
                if (!process.env.MIGRATE_INTEG_TEST) {
                    await cfn.deleteGeneratedTemplate(templateToDelete);
                }
            }
        }
    }
    async selectStacksForList(patterns) {
        const assembly = await this.assembly();
        const stacks = await assembly.selectStacks({ patterns }, { defaultBehavior: cloud_assembly_1.DefaultSelection.AllStacks });
        // No validation
        return stacks;
    }
    async selectStacksForDeploy(selector, exclusively, cacheCloudAssembly, ignoreNoStacks) {
        const assembly = await this.assembly(cacheCloudAssembly);
        const stacks = await assembly.selectStacks(selector, {
            extend: exclusively ? cloud_assembly_1.ExtendedStackSelection.None : cloud_assembly_1.ExtendedStackSelection.Upstream,
            defaultBehavior: cloud_assembly_1.DefaultSelection.OnlySingle,
            ignoreNoStacks,
        });
        this.validateStacksSelected(stacks, selector.patterns);
        this.validateStacks(stacks);
        return stacks;
    }
    async selectStacksForDiff(stackNames, exclusively, autoValidate) {
        const assembly = await this.assembly();
        const selectedForDiff = await assembly.selectStacks({ patterns: stackNames }, {
            extend: exclusively ? cloud_assembly_1.ExtendedStackSelection.None : cloud_assembly_1.ExtendedStackSelection.Upstream,
            defaultBehavior: cloud_assembly_1.DefaultSelection.MainAssembly,
        });
        const allStacks = await this.selectStacksForList([]);
        const autoValidateStacks = autoValidate
            ? allStacks.filter((art) => art.validateOnSynth ?? false)
            : new cloud_assembly_1.StackCollection(assembly, []);
        this.validateStacksSelected(selectedForDiff.concat(autoValidateStacks), stackNames);
        this.validateStacks(selectedForDiff.concat(autoValidateStacks));
        return selectedForDiff;
    }
    async selectStacksForDestroy(selector, exclusively) {
        const assembly = await this.assembly();
        const stacks = await assembly.selectStacks(selector, {
            extend: exclusively ? cloud_assembly_1.ExtendedStackSelection.None : cloud_assembly_1.ExtendedStackSelection.Downstream,
            defaultBehavior: cloud_assembly_1.DefaultSelection.OnlySingle,
        });
        // No validation
        return stacks;
    }
    /**
     * Validate the stacks for errors and warnings according to the CLI's current settings
     */
    validateStacks(stacks) {
        stacks.processMetadataMessages({
            ignoreErrors: this.props.ignoreErrors,
            strict: this.props.strict,
            verbose: this.props.verbose,
        });
    }
    /**
     * Validate that if a user specified a stack name there exists at least 1 stack selected
     */
    validateStacksSelected(stacks, stackNames) {
        if (stackNames.length != 0 && stacks.stackCount == 0) {
            throw new error_1.ToolkitError(`No stacks match the name(s) ${stackNames}`);
        }
    }
    /**
     * Select a single stack by its name
     */
    async selectSingleStackByName(stackName) {
        const assembly = await this.assembly();
        const stacks = await assembly.selectStacks({ patterns: [stackName] }, {
            extend: cloud_assembly_1.ExtendedStackSelection.None,
            defaultBehavior: cloud_assembly_1.DefaultSelection.None,
        });
        // Could have been a glob so check that we evaluated to exactly one
        if (stacks.stackCount > 1) {
            throw new error_1.ToolkitError(`This command requires exactly one stack and we matched more than one: ${stacks.stackIds}`);
        }
        return assembly.stackById(stacks.firstStack.id);
    }
    assembly(cacheCloudAssembly) {
        return this.props.cloudExecutable.synthesize(cacheCloudAssembly);
    }
    patternsArrayForWatch(patterns, options) {
        const patternsArray = patterns !== undefined ? (Array.isArray(patterns) ? patterns : [patterns]) : [];
        return patternsArray.length > 0 ? patternsArray : options.returnRootDirIfEmpty ? [options.rootDir] : [];
    }
    async invokeDeployFromWatch(options, cloudWatchLogMonitor) {
        const deployOptions = {
            ...options,
            requireApproval: diff_1.RequireApproval.Never,
            // if 'watch' is called by invoking 'cdk deploy --watch',
            // we need to make sure to not call 'deploy' with 'watch' again,
            // as that would lead to a cycle
            watch: false,
            cloudWatchLogMonitor,
            cacheCloudAssembly: false,
            hotswap: options.hotswap,
            extraUserAgent: `cdk-watch/hotswap-${options.hotswap !== common_1.HotswapMode.FALL_BACK ? 'on' : 'off'}`,
            concurrency: options.concurrency,
        };
        try {
            await this.deploy(deployOptions);
        }
        catch {
            // just continue - deploy will show the error
        }
    }
    /**
     * Remove the asset publishing and building from the work graph for assets that are already in place
     */
    async removePublishedAssets(graph, options) {
        await graph.removeUnnecessaryAssets(assetNode => this.props.deployments.isSingleAssetPublished(assetNode.assetManifest, assetNode.asset, {
            stack: assetNode.parentStack,
            roleArn: options.roleArn,
            stackName: assetNode.parentStack.stackName,
        }));
    }
    /**
     * Checks to see if a migrate.json file exists. If it does and the source is either `filepath` or
     * is in the same environment as the stack deployment, a new stack is created and the resources are
     * migrated to the stack using an IMPORT changeset. The normal deployment will resume after this is complete
     * to add back in any outputs and the CDKMetadata.
     */
    async tryMigrateResources(stacks, options) {
        const stack = stacks.stackArtifacts[0];
        const migrateDeployment = new import_1.ResourceImporter(stack, this.props.deployments);
        const resourcesToImport = await this.tryGetResources(await migrateDeployment.resolveEnvironment());
        if (resourcesToImport) {
            (0, logging_1.print)('%s: creating stack for resource migration...', chalk.bold(stack.displayName));
            (0, logging_1.print)('%s: importing resources into stack...', chalk.bold(stack.displayName));
            await this.performResourceMigration(migrateDeployment, resourcesToImport, options);
            fs.rmSync('migrate.json');
            (0, logging_1.print)('%s: applying CDKMetadata and Outputs to stack (if applicable)...', chalk.bold(stack.displayName));
        }
    }
    /**
     * Creates a new stack with just the resources to be migrated
     */
    async performResourceMigration(migrateDeployment, resourcesToImport, options) {
        const startDeployTime = new Date().getTime();
        let elapsedDeployTime = 0;
        // Initial Deployment
        await migrateDeployment.importResourcesFromMigrate(resourcesToImport, {
            roleArn: options.roleArn,
            toolkitStackName: options.toolkitStackName,
            deploymentMethod: options.deploymentMethod,
            usePreviousParameters: true,
            progress: options.progress,
            rollback: options.rollback,
        });
        elapsedDeployTime = new Date().getTime() - startDeployTime;
        (0, logging_1.print)('\n✨  Resource migration time: %ss\n', formatTime(elapsedDeployTime));
    }
    async tryGetResources(environment) {
        try {
            const migrateFile = fs.readJsonSync('migrate.json', {
                encoding: 'utf-8',
            });
            const sourceEnv = migrateFile.Source.split(':');
            if (sourceEnv[0] === 'localfile' ||
                (sourceEnv[4] === environment.account && sourceEnv[3] === environment.region)) {
                return migrateFile.Resources;
            }
        }
        catch (e) {
            // Nothing to do
        }
        return undefined;
    }
}
exports.CdkToolkit = CdkToolkit;
/**
 * Print a serialized object (YAML or JSON) to stdout.
 */
function printSerializedObject(obj, json) {
    (0, logging_1.data)((0, serialize_1.serializeStructure)(obj, json));
}
/**
 * @returns an array with the tags available in the stack metadata.
 */
function tagsForStack(stack) {
    return Object.entries(stack.tags).map(([Key, Value]) => ({ Key, Value }));
}
/**
 * Formats time in milliseconds (which we get from 'Date.getTime()')
 * to a human-readable time; returns time in seconds rounded to 2
 * decimal places.
 */
function formatTime(num) {
    return roundPercentage(millisecondsToSeconds(num));
}
/**
 * Rounds a decimal number to two decimal points.
 * The function is useful for fractions that need to be outputted as percentages.
 */
function roundPercentage(num) {
    return Math.round(100 * num) / 100;
}
/**
 * Given a time in milliseconds, return an equivalent amount in seconds.
 */
function millisecondsToSeconds(num) {
    return num / 1000;
}
function buildParameterMap(parameters) {
    const parameterMap = { '*': {} };
    for (const key in parameters) {
        if (parameters.hasOwnProperty(key)) {
            const [stack, parameter] = key.split(':', 2);
            if (!parameter) {
                parameterMap['*'][stack] = parameters[key];
            }
            else {
                if (!parameterMap[stack]) {
                    parameterMap[stack] = {};
                }
                parameterMap[stack][parameter] = parameters[key];
            }
        }
    }
    return parameterMap;
}
/**
 * Remove any template elements that we don't want to show users.
 */
function obscureTemplate(template = {}) {
    if (template.Rules) {
        // see https://github.com/aws/aws-cdk/issues/17942
        if (template.Rules.CheckBootstrapVersion) {
            if (Object.keys(template.Rules).length > 1) {
                delete template.Rules.CheckBootstrapVersion;
            }
            else {
                delete template.Rules;
            }
        }
    }
    return template;
}
/**
 * Ask the user for a yes/no confirmation
 *
 * Automatically fail the confirmation in case we're in a situation where the confirmation
 * cannot be interactively obtained from a human at the keyboard.
 */
async function askUserConfirmation(concurrency, motivation, question) {
    await (0, logging_1.withCorkedLogging)(async () => {
        // only talk to user if STDIN is a terminal (otherwise, fail)
        if (!TESTING && !process.stdin.isTTY) {
            throw new error_1.ToolkitError(`${motivation}, but terminal (TTY) is not attached so we are unable to get a confirmation from the user`);
        }
        // only talk to user if concurrency is 1 (otherwise, fail)
        if (concurrency > 1) {
            throw new error_1.ToolkitError(`${motivation}, but concurrency is greater than 1 so we are unable to get a confirmation from the user`);
        }
        const confirmed = await promptly.confirm(`${chalk.cyan(question)} (y/n)?`);
        if (!confirmed) {
            throw new error_1.ToolkitError('Aborted by user');
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLXRvb2xraXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjZGstdG9vbGtpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFnRUEsa0NBRUM7QUFsRUQsNkJBQTZCO0FBQzdCLCtCQUE4QjtBQUM5Qix5Q0FBeUM7QUFDekMsK0JBQStCO0FBQy9CLHFDQUFxQztBQUNyQywrQkFBK0I7QUFDL0IscUNBQXFDO0FBQ3JDLDZCQUE2QjtBQUc3QiwrQ0FBNEU7QUFDNUUsK0RBTW9DO0FBR3BDLGtGQUE4RTtBQUM5RSxpREFBbUc7QUFDbkcsMEVBQTBFO0FBQzFFLDBEQUFvRTtBQUNwRSw4REFBbUY7QUFDbkYsNkZBQXlGO0FBQ3pGLGdEQWlCNEI7QUFDNUIsaUNBQTRFO0FBQzVFLHFDQUFzRTtBQUN0RSwrQ0FBMkM7QUFDM0MsdUNBQXNHO0FBQ3RHLDJDQUF1RTtBQUN2RSx5Q0FBMkQ7QUFDM0QsMkNBQStDO0FBQy9DLGlDQUFtRDtBQUNuRCxnRkFBdUU7QUFFdkUsa0VBQTZEO0FBRTdELGdFQUF1SDtBQUV2SCw2RUFBNkU7QUFDN0UsaUVBQWlFO0FBQ2pFLE1BQU0sTUFBTSxHQUE2QixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFNUQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBRXBCLFNBQWdCLFdBQVc7SUFDekIsT0FBTyxHQUFHLElBQUksQ0FBQztBQUNqQixDQUFDO0FBNkNEOztHQUVHO0FBQ0gsSUFBWSxjQWFYO0FBYkQsV0FBWSxjQUFjO0lBQ3hCOzs7OztPQUtHO0lBQ0gsNkVBQWlCLENBQUE7SUFFakI7O09BRUc7SUFDSCxtRUFBWSxDQUFBO0FBQ2QsQ0FBQyxFQWJXLGNBQWMsOEJBQWQsY0FBYyxRQWF6QjtBQUVEOzs7OztHQUtHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLFlBQTZCLEtBQXNCO1FBQXRCLFVBQUssR0FBTCxLQUFLLENBQWlCO0lBQUcsQ0FBQztJQUVoRCxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQWlCLEVB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QztJQUVELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILEtBQUssVUFBVSxtQkFBbUIsQ0FDaEMsV0FBbUIsRUFDbkIsVUFBa0IsRUFDbEIsUUFBZ0I7SUFFaEIsTUFBTSxJQUFBLDJCQUFpQixFQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2pDLDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxNQUFNLElBQUksb0JBQVksQ0FBQyxHQUFHLFVBQVUsMkZBQTJGLENBQUMsQ0FBQztRQUNuSSxDQUFDO1FBRUQsMERBQTBEO1FBQzFELElBQUksV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sSUFBSSxvQkFBWSxDQUFDLEdBQUcsVUFBVSwwRkFBMEYsQ0FBQyxDQUFDO1FBQ2xJLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFBQyxNQUFNLElBQUksb0JBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQUMsQ0FBQztJQUNoRSxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZm9ybWF0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyBjeGFwaSBmcm9tICdAYXdzLWNkay9jeC1hcGknO1xuaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcHJvbXB0bHkgZnJvbSAncHJvbXB0bHknO1xuaW1wb3J0ICogYXMgdXVpZCBmcm9tICd1dWlkJztcbmltcG9ydCB7IERlcGxveW1lbnRNZXRob2QsIFN1Y2Nlc3NmdWxEZXBsb3lTdGFja1Jlc3VsdCB9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7IFNka1Byb3ZpZGVyIH0gZnJvbSAnLi9hcGkvYXdzLWF1dGgnO1xuaW1wb3J0IHsgQm9vdHN0cmFwcGVyLCBCb290c3RyYXBFbnZpcm9ubWVudE9wdGlvbnMgfSBmcm9tICcuL2FwaS9ib290c3RyYXAnO1xuaW1wb3J0IHtcbiAgQ2xvdWRBc3NlbWJseSxcbiAgRGVmYXVsdFNlbGVjdGlvbixcbiAgRXh0ZW5kZWRTdGFja1NlbGVjdGlvbixcbiAgU3RhY2tDb2xsZWN0aW9uLFxuICBTdGFja1NlbGVjdG9yLFxufSBmcm9tICcuL2FwaS9jeGFwcC9jbG91ZC1hc3NlbWJseSc7XG5pbXBvcnQgeyBDbG91ZEV4ZWN1dGFibGUgfSBmcm9tICcuL2FwaS9jeGFwcC9jbG91ZC1leGVjdXRhYmxlJztcbmltcG9ydCB7IERlcGxveW1lbnRzIH0gZnJvbSAnLi9hcGkvZGVwbG95bWVudHMnO1xuaW1wb3J0IHsgR2FyYmFnZUNvbGxlY3RvciB9IGZyb20gJy4vYXBpL2dhcmJhZ2UtY29sbGVjdGlvbi9nYXJiYWdlLWNvbGxlY3Rvcic7XG5pbXBvcnQgeyBIb3Rzd2FwTW9kZSwgSG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzLCBFY3NIb3Rzd2FwUHJvcGVydGllcyB9IGZyb20gJy4vYXBpL2hvdHN3YXAvY29tbW9uJztcbmltcG9ydCB7IGZpbmRDbG91ZFdhdGNoTG9nR3JvdXBzIH0gZnJvbSAnLi9hcGkvbG9ncy9maW5kLWNsb3Vkd2F0Y2gtbG9ncyc7XG5pbXBvcnQgeyBDbG91ZFdhdGNoTG9nRXZlbnRNb25pdG9yIH0gZnJvbSAnLi9hcGkvbG9ncy9sb2dzLW1vbml0b3InO1xuaW1wb3J0IHsgY3JlYXRlRGlmZkNoYW5nZVNldCwgUmVzb3VyY2VzVG9JbXBvcnQgfSBmcm9tICcuL2FwaS91dGlsL2Nsb3VkZm9ybWF0aW9uJztcbmltcG9ydCB7IFN0YWNrQWN0aXZpdHlQcm9ncmVzcyB9IGZyb20gJy4vYXBpL3V0aWwvY2xvdWRmb3JtYXRpb24vc3RhY2stYWN0aXZpdHktbW9uaXRvcic7XG5pbXBvcnQge1xuICBnZW5lcmF0ZUNka0FwcCxcbiAgZ2VuZXJhdGVTdGFjayxcbiAgcmVhZEZyb21QYXRoLFxuICByZWFkRnJvbVN0YWNrLFxuICBzZXRFbnZpcm9ubWVudCxcbiAgcGFyc2VTb3VyY2VPcHRpb25zLFxuICBnZW5lcmF0ZVRlbXBsYXRlLFxuICBGcm9tU2NhbixcbiAgVGVtcGxhdGVTb3VyY2VPcHRpb25zLFxuICBHZW5lcmF0ZVRlbXBsYXRlT3V0cHV0LFxuICBDZm5UZW1wbGF0ZUdlbmVyYXRvclByb3ZpZGVyLFxuICB3cml0ZU1pZ3JhdGVKc29uRmlsZSxcbiAgYnVpbGRHZW5lcnRlZFRlbXBsYXRlT3V0cHV0LFxuICBhcHBlbmRXYXJuaW5nc1RvUmVhZG1lLFxuICBpc1RoZXJlQVdhcm5pbmcsXG4gIGJ1aWxkQ2ZuQ2xpZW50LFxufSBmcm9tICcuL2NvbW1hbmRzL21pZ3JhdGUnO1xuaW1wb3J0IHsgcHJpbnRTZWN1cml0eURpZmYsIHByaW50U3RhY2tEaWZmLCBSZXF1aXJlQXBwcm92YWwgfSBmcm9tICcuL2RpZmYnO1xuaW1wb3J0IHsgUmVzb3VyY2VJbXBvcnRlciwgcmVtb3ZlTm9uSW1wb3J0UmVzb3VyY2VzIH0gZnJvbSAnLi9pbXBvcnQnO1xuaW1wb3J0IHsgbGlzdFN0YWNrcyB9IGZyb20gJy4vbGlzdC1zdGFja3MnO1xuaW1wb3J0IHsgZGF0YSwgZGVidWcsIGVycm9yLCBoaWdobGlnaHQsIHByaW50LCBzdWNjZXNzLCB3YXJuaW5nLCB3aXRoQ29ya2VkTG9nZ2luZyB9IGZyb20gJy4vbG9nZ2luZyc7XG5pbXBvcnQgeyBkZXNlcmlhbGl6ZVN0cnVjdHVyZSwgc2VyaWFsaXplU3RydWN0dXJlIH0gZnJvbSAnLi9zZXJpYWxpemUnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgUFJPSkVDVF9DT05GSUcgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IFRvb2xraXRFcnJvciB9IGZyb20gJy4vdG9vbGtpdC9lcnJvcic7XG5pbXBvcnQgeyBudW1iZXJGcm9tQm9vbCwgcGFydGl0aW9uIH0gZnJvbSAnLi91dGlsJztcbmltcG9ydCB7IHZhbGlkYXRlU25zVG9waWNBcm4gfSBmcm9tICcuL3V0aWwvdmFsaWRhdGUtbm90aWZpY2F0aW9uLWFybic7XG5pbXBvcnQgeyBDb25jdXJyZW5jeSwgV29ya0dyYXBoIH0gZnJvbSAnLi91dGlsL3dvcmstZ3JhcGgnO1xuaW1wb3J0IHsgV29ya0dyYXBoQnVpbGRlciB9IGZyb20gJy4vdXRpbC93b3JrLWdyYXBoLWJ1aWxkZXInO1xuaW1wb3J0IHsgQXNzZXRCdWlsZE5vZGUsIEFzc2V0UHVibGlzaE5vZGUsIFN0YWNrTm9kZSB9IGZyb20gJy4vdXRpbC93b3JrLWdyYXBoLXR5cGVzJztcbmltcG9ydCB7IGVudmlyb25tZW50c0Zyb21EZXNjcmlwdG9ycywgZ2xvYkVudmlyb25tZW50c0Zyb21TdGFja3MsIGxvb2tzTGlrZUdsb2IgfSBmcm9tICcuLi9saWIvYXBpL2N4YXBwL2Vudmlyb25tZW50cyc7XG5cbi8vIE11c3QgdXNlIGEgcmVxdWlyZSgpIG90aGVyd2lzZSBlc2J1aWxkIGNvbXBsYWlucyBhYm91dCBjYWxsaW5nIGEgbmFtZXNwYWNlXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0c1xuY29uc3QgcExpbWl0OiB0eXBlb2YgaW1wb3J0KCdwLWxpbWl0JykgPSByZXF1aXJlKCdwLWxpbWl0Jyk7XG5cbmxldCBURVNUSU5HID0gZmFsc2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXJrVGVzdGluZygpIHtcbiAgVEVTVElORyA9IHRydWU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2RrVG9vbGtpdFByb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBDbG91ZCBFeGVjdXRhYmxlXG4gICAqL1xuICBjbG91ZEV4ZWN1dGFibGU6IENsb3VkRXhlY3V0YWJsZTtcblxuICAvKipcbiAgICogVGhlIHByb3Zpc2lvbmluZyBlbmdpbmUgdXNlZCB0byBhcHBseSBjaGFuZ2VzIHRvIHRoZSBjbG91ZFxuICAgKi9cbiAgZGVwbG95bWVudHM6IERlcGxveW1lbnRzO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGJlIHZlcmJvc2VcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHZlcmJvc2U/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEb24ndCBzdG9wIG9uIGVycm9yIG1ldGFkYXRhXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBpZ25vcmVFcnJvcnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUcmVhdCB3YXJuaW5ncyBpbiBtZXRhZGF0YSBhcyBlcnJvcnNcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHN0cmljdD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFwcGxpY2F0aW9uIGNvbmZpZ3VyYXRpb24gKHNldHRpbmdzIGFuZCBjb250ZXh0KVxuICAgKi9cbiAgY29uZmlndXJhdGlvbjogQ29uZmlndXJhdGlvbjtcblxuICAvKipcbiAgICogQVdTIG9iamVjdCAodXNlZCBieSBzeW50aGVzaXplciBhbmQgY29udGV4dHByb3ZpZGVyKVxuICAgKi9cbiAgc2RrUHJvdmlkZXI6IFNka1Byb3ZpZGVyO1xufVxuXG4vKipcbiAqIFdoZW4gdG8gYnVpbGQgYXNzZXRzXG4gKi9cbmV4cG9ydCBlbnVtIEFzc2V0QnVpbGRUaW1lIHtcbiAgLyoqXG4gICAqIEJ1aWxkIGFsbCBhc3NldHMgYmVmb3JlIGRlcGxveWluZyB0aGUgZmlyc3Qgc3RhY2tcbiAgICpcbiAgICogVGhpcyBpcyBpbnRlbmRlZCBmb3IgZXhwZW5zaXZlIERvY2tlciBpbWFnZSBidWlsZHM7IHNvIHRoYXQgaWYgdGhlIERvY2tlciBpbWFnZSBidWlsZFxuICAgKiBmYWlscywgbm8gc3RhY2tzIGFyZSB1bm5lY2Vzc2FyaWx5IGRlcGxveWVkICh3aXRoIHRoZSBhdHRlbmRhbnQgd2FpdCB0aW1lKS5cbiAgICovXG4gIEFMTF9CRUZPUkVfREVQTE9ZLFxuXG4gIC8qKlxuICAgKiBCdWlsZCBhc3NldHMganVzdC1pbi10aW1lLCBiZWZvcmUgcHVibGlzaGluZ1xuICAgKi9cbiAgSlVTVF9JTl9USU1FLFxufVxuXG4vKipcbiAqIFRvb2xraXQgbG9naWNcbiAqXG4gKiBUaGUgdG9vbGtpdCBydW5zIHRoZSBgY2xvdWRFeGVjdXRhYmxlYCB0byBvYnRhaW4gYSBjbG91ZCBhc3NlbWJseSBhbmRcbiAqIGRlcGxveXMgYXBwbGllcyB0aGVtIHRvIGBjbG91ZEZvcm1hdGlvbmAuXG4gKi9cbmV4cG9ydCBjbGFzcyBDZGtUb29sa2l0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwcm9wczogQ2RrVG9vbGtpdFByb3BzKSB7fVxuXG4gIHB1YmxpYyBhc3luYyBtZXRhZGF0YShzdGFja05hbWU6IHN0cmluZywganNvbjogYm9vbGVhbikge1xuICAgIGNvbnN0IHN0YWNrcyA9IGF3YWl0IHRoaXMuc2VsZWN0U2luZ2xlU3RhY2tCeU5hbWUoc3RhY2tOYW1lKTtcbiAgICBwcmludFNlcmlhbGl6ZWRPYmplY3Qoc3RhY2tzLmZpcnN0U3RhY2subWFuaWZlc3QubWV0YWRhdGEgPz8ge30sIGpzb24pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGFja25vd2xlZGdlKG5vdGljZUlkOiBzdHJpbmcpIHtcbiAgICBjb25zdCBhY2tzID0gdGhpcy5wcm9wcy5jb25maWd1cmF0aW9uLmNvbnRleHQuZ2V0KCdhY2tub3dsZWRnZWQtaXNzdWUtbnVtYmVycycpID8/IFtdO1xuICAgIGFja3MucHVzaChOdW1iZXIobm90aWNlSWQpKTtcbiAgICB0aGlzLnByb3BzLmNvbmZpZ3VyYXRpb24uY29udGV4dC5zZXQoJ2Fja25vd2xlZGdlZC1pc3N1ZS1udW1iZXJzJywgYWNrcyk7XG4gICAgYXdhaXQgdGhpcy5wcm9wcy5jb25maWd1cmF0aW9uLnNhdmVDb250ZXh0KCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZGlmZihvcHRpb25zOiBEaWZmT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3Qgc3RhY2tzID0gYXdhaXQgdGhpcy5zZWxlY3RTdGFja3NGb3JEaWZmKG9wdGlvbnMuc3RhY2tOYW1lcywgb3B0aW9ucy5leGNsdXNpdmVseSk7XG5cbiAgICBjb25zdCBzdHJpY3QgPSAhIW9wdGlvbnMuc3RyaWN0O1xuICAgIGNvbnN0IGNvbnRleHRMaW5lcyA9IG9wdGlvbnMuY29udGV4dExpbmVzIHx8IDM7XG4gICAgY29uc3Qgc3RyZWFtID0gb3B0aW9ucy5zdHJlYW0gfHwgcHJvY2Vzcy5zdGRlcnI7XG4gICAgY29uc3QgcXVpZXQgPSBvcHRpb25zLnF1aWV0IHx8IGZhbHNlO1xuXG4gICAgbGV0IGRpZmZzID0gMDtcbiAgICBjb25zdCBwYXJhbWV0ZXJNYXAgPSBidWlsZFBhcmFtZXRlck1hcChvcHRpb25zLnBhcmFtZXRlcnMpO1xuXG4gICAgaWYgKG9wdGlvbnMudGVtcGxhdGVQYXRoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIENvbXBhcmUgc2luZ2xlIHN0YWNrIGFnYWluc3QgZml4ZWQgdGVtcGxhdGVcbiAgICAgIGlmIChzdGFja3Muc3RhY2tDb3VudCAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKFxuICAgICAgICAgICdDYW4gb25seSBzZWxlY3Qgb25lIHN0YWNrIHdoZW4gY29tcGFyaW5nIHRvIGZpeGVkIHRlbXBsYXRlLiBVc2UgLS1leGNsdXNpdmVseSB0byBhdm9pZCBzZWxlY3RpbmcgbXVsdGlwbGUgc3RhY2tzLicsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICghKGF3YWl0IGZzLnBhdGhFeGlzdHMob3B0aW9ucy50ZW1wbGF0ZVBhdGgpKSkge1xuICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBUaGVyZSBpcyBubyBmaWxlIGF0ICR7b3B0aW9ucy50ZW1wbGF0ZVBhdGh9YCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gZGVzZXJpYWxpemVTdHJ1Y3R1cmUoYXdhaXQgZnMucmVhZEZpbGUob3B0aW9ucy50ZW1wbGF0ZVBhdGgsIHsgZW5jb2Rpbmc6ICdVVEYtOCcgfSkpO1xuICAgICAgZGlmZnMgPSBvcHRpb25zLnNlY3VyaXR5T25seVxuICAgICAgICA/IG51bWJlckZyb21Cb29sKHByaW50U2VjdXJpdHlEaWZmKHRlbXBsYXRlLCBzdGFja3MuZmlyc3RTdGFjaywgUmVxdWlyZUFwcHJvdmFsLkJyb2FkZW5pbmcsIHF1aWV0KSlcbiAgICAgICAgOiBwcmludFN0YWNrRGlmZih0ZW1wbGF0ZSwgc3RhY2tzLmZpcnN0U3RhY2ssIHN0cmljdCwgY29udGV4dExpbmVzLCBxdWlldCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGZhbHNlLCBzdHJlYW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDb21wYXJlIE4gc3RhY2tzIGFnYWluc3QgZGVwbG95ZWQgdGVtcGxhdGVzXG4gICAgICBmb3IgKGNvbnN0IHN0YWNrIG9mIHN0YWNrcy5zdGFja0FydGlmYWN0cykge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZVdpdGhOZXN0ZWRTdGFja3MgPSBhd2FpdCB0aGlzLnByb3BzLmRlcGxveW1lbnRzLnJlYWRDdXJyZW50VGVtcGxhdGVXaXRoTmVzdGVkU3RhY2tzKFxuICAgICAgICAgIHN0YWNrLFxuICAgICAgICAgIG9wdGlvbnMuY29tcGFyZUFnYWluc3RQcm9jZXNzZWRUZW1wbGF0ZSxcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgY3VycmVudFRlbXBsYXRlID0gdGVtcGxhdGVXaXRoTmVzdGVkU3RhY2tzLmRlcGxveWVkUm9vdFRlbXBsYXRlO1xuICAgICAgICBjb25zdCBuZXN0ZWRTdGFja3MgPSB0ZW1wbGF0ZVdpdGhOZXN0ZWRTdGFja3MubmVzdGVkU3RhY2tzO1xuXG4gICAgICAgIGNvbnN0IHJlc291cmNlc1RvSW1wb3J0ID0gYXdhaXQgdGhpcy50cnlHZXRSZXNvdXJjZXMoYXdhaXQgdGhpcy5wcm9wcy5kZXBsb3ltZW50cy5yZXNvbHZlRW52aXJvbm1lbnQoc3RhY2spKTtcbiAgICAgICAgaWYgKHJlc291cmNlc1RvSW1wb3J0KSB7XG4gICAgICAgICAgcmVtb3ZlTm9uSW1wb3J0UmVzb3VyY2VzKHN0YWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjaGFuZ2VTZXQgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuY2hhbmdlU2V0KSB7XG4gICAgICAgICAgbGV0IHN0YWNrRXhpc3RzID0gZmFsc2U7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0YWNrRXhpc3RzID0gYXdhaXQgdGhpcy5wcm9wcy5kZXBsb3ltZW50cy5zdGFja0V4aXN0cyh7XG4gICAgICAgICAgICAgIHN0YWNrLFxuICAgICAgICAgICAgICBkZXBsb3lOYW1lOiBzdGFjay5zdGFja05hbWUsXG4gICAgICAgICAgICAgIHRyeUxvb2t1cFJvbGU6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIGRlYnVnKGUubWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoIXF1aWV0KSB7XG4gICAgICAgICAgICAgIHN0cmVhbS53cml0ZShcbiAgICAgICAgICAgICAgICBgQ2hlY2tpbmcgaWYgdGhlIHN0YWNrICR7c3RhY2suc3RhY2tOYW1lfSBleGlzdHMgYmVmb3JlIGNyZWF0aW5nIHRoZSBjaGFuZ2VzZXQgaGFzIGZhaWxlZCwgd2lsbCBiYXNlIHRoZSBkaWZmIG9uIHRlbXBsYXRlIGRpZmZlcmVuY2VzIChydW4gYWdhaW4gd2l0aCAtdiB0byBzZWUgdGhlIHJlYXNvbilcXG5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhY2tFeGlzdHMgPSBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc3RhY2tFeGlzdHMpIHtcbiAgICAgICAgICAgIGNoYW5nZVNldCA9IGF3YWl0IGNyZWF0ZURpZmZDaGFuZ2VTZXQoe1xuICAgICAgICAgICAgICBzdGFjayxcbiAgICAgICAgICAgICAgdXVpZDogdXVpZC52NCgpLFxuICAgICAgICAgICAgICBkZXBsb3ltZW50czogdGhpcy5wcm9wcy5kZXBsb3ltZW50cyxcbiAgICAgICAgICAgICAgd2lsbEV4ZWN1dGU6IGZhbHNlLFxuICAgICAgICAgICAgICBzZGtQcm92aWRlcjogdGhpcy5wcm9wcy5zZGtQcm92aWRlcixcbiAgICAgICAgICAgICAgcGFyYW1ldGVyczogT2JqZWN0LmFzc2lnbih7fSwgcGFyYW1ldGVyTWFwWycqJ10sIHBhcmFtZXRlck1hcFtzdGFjay5zdGFja05hbWVdKSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzVG9JbXBvcnQsXG4gICAgICAgICAgICAgIHN0cmVhbSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWJ1ZyhcbiAgICAgICAgICAgICAgYHRoZSBzdGFjayAnJHtzdGFjay5zdGFja05hbWV9JyBoYXMgbm90IGJlZW4gZGVwbG95ZWQgdG8gQ2xvdWRGb3JtYXRpb24gb3IgZGVzY3JpYmVTdGFja3MgY2FsbCBmYWlsZWQsIHNraXBwaW5nIGNoYW5nZXNldCBjcmVhdGlvbi5gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdGFja0NvdW50ID0gb3B0aW9ucy5zZWN1cml0eU9ubHlcbiAgICAgICAgICA/IG51bWJlckZyb21Cb29sKFxuICAgICAgICAgICAgcHJpbnRTZWN1cml0eURpZmYoXG4gICAgICAgICAgICAgIGN1cnJlbnRUZW1wbGF0ZSxcbiAgICAgICAgICAgICAgc3RhY2ssXG4gICAgICAgICAgICAgIFJlcXVpcmVBcHByb3ZhbC5Ccm9hZGVuaW5nLFxuICAgICAgICAgICAgICBxdWlldCxcbiAgICAgICAgICAgICAgc3RhY2suZGlzcGxheU5hbWUsXG4gICAgICAgICAgICAgIGNoYW5nZVNldCxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgKVxuICAgICAgICAgIDogcHJpbnRTdGFja0RpZmYoXG4gICAgICAgICAgICBjdXJyZW50VGVtcGxhdGUsXG4gICAgICAgICAgICBzdGFjayxcbiAgICAgICAgICAgIHN0cmljdCxcbiAgICAgICAgICAgIGNvbnRleHRMaW5lcyxcbiAgICAgICAgICAgIHF1aWV0LFxuICAgICAgICAgICAgc3RhY2suZGlzcGxheU5hbWUsXG4gICAgICAgICAgICBjaGFuZ2VTZXQsXG4gICAgICAgICAgICAhIXJlc291cmNlc1RvSW1wb3J0LFxuICAgICAgICAgICAgc3RyZWFtLFxuICAgICAgICAgICAgbmVzdGVkU3RhY2tzLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgZGlmZnMgKz0gc3RhY2tDb3VudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzdHJlYW0ud3JpdGUoZm9ybWF0KCdcXG7inKggIE51bWJlciBvZiBzdGFja3Mgd2l0aCBkaWZmZXJlbmNlczogJXNcXG4nLCBkaWZmcykpO1xuXG4gICAgcmV0dXJuIGRpZmZzICYmIG9wdGlvbnMuZmFpbCA/IDEgOiAwO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGRlcGxveShvcHRpb25zOiBEZXBsb3lPcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMud2F0Y2gpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXJ0U3ludGhUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgY29uc3Qgc3RhY2tDb2xsZWN0aW9uID0gYXdhaXQgdGhpcy5zZWxlY3RTdGFja3NGb3JEZXBsb3koXG4gICAgICBvcHRpb25zLnNlbGVjdG9yLFxuICAgICAgb3B0aW9ucy5leGNsdXNpdmVseSxcbiAgICAgIG9wdGlvbnMuY2FjaGVDbG91ZEFzc2VtYmx5LFxuICAgICAgb3B0aW9ucy5pZ25vcmVOb1N0YWNrcyxcbiAgICApO1xuICAgIGNvbnN0IGVsYXBzZWRTeW50aFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0U3ludGhUaW1lO1xuICAgIHByaW50KCdcXG7inKggIFN5bnRoZXNpcyB0aW1lOiAlc3NcXG4nLCBmb3JtYXRUaW1lKGVsYXBzZWRTeW50aFRpbWUpKTtcblxuICAgIGlmIChzdGFja0NvbGxlY3Rpb24uc3RhY2tDb3VudCA9PT0gMCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1RoaXMgYXBwIGNvbnRhaW5zIG5vIHN0YWNrcycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudHJ5TWlncmF0ZVJlc291cmNlcyhzdGFja0NvbGxlY3Rpb24sIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgcmVxdWlyZUFwcHJvdmFsID0gb3B0aW9ucy5yZXF1aXJlQXBwcm92YWwgPz8gUmVxdWlyZUFwcHJvdmFsLkJyb2FkZW5pbmc7XG5cbiAgICBjb25zdCBwYXJhbWV0ZXJNYXAgPSBidWlsZFBhcmFtZXRlck1hcChvcHRpb25zLnBhcmFtZXRlcnMpO1xuXG4gICAgaWYgKG9wdGlvbnMuaG90c3dhcCAhPT0gSG90c3dhcE1vZGUuRlVMTF9ERVBMT1lNRU5UKSB7XG4gICAgICB3YXJuaW5nKFxuICAgICAgICAn4pqg77iPIFRoZSAtLWhvdHN3YXAgYW5kIC0taG90c3dhcC1mYWxsYmFjayBmbGFncyBkZWxpYmVyYXRlbHkgaW50cm9kdWNlIENsb3VkRm9ybWF0aW9uIGRyaWZ0IHRvIHNwZWVkIHVwIGRlcGxveW1lbnRzJyxcbiAgICAgICk7XG4gICAgICB3YXJuaW5nKCfimqDvuI8gVGhleSBzaG91bGQgb25seSBiZSB1c2VkIGZvciBkZXZlbG9wbWVudCAtIG5ldmVyIHVzZSB0aGVtIGZvciB5b3VyIHByb2R1Y3Rpb24gU3RhY2tzIVxcbicpO1xuICAgIH1cblxuICAgIGxldCBob3Rzd2FwUHJvcGVydGllc0Zyb21TZXR0aW5ncyA9IHRoaXMucHJvcHMuY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWydob3Rzd2FwJ10pIHx8IHt9O1xuXG4gICAgbGV0IGhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlcyA9IG5ldyBIb3Rzd2FwUHJvcGVydHlPdmVycmlkZXMoKTtcbiAgICBob3Rzd2FwUHJvcGVydHlPdmVycmlkZXMuZWNzSG90c3dhcFByb3BlcnRpZXMgPSBuZXcgRWNzSG90c3dhcFByb3BlcnRpZXMoXG4gICAgICBob3Rzd2FwUHJvcGVydGllc0Zyb21TZXR0aW5ncy5lY3M/Lm1pbmltdW1IZWFsdGh5UGVyY2VudCxcbiAgICAgIGhvdHN3YXBQcm9wZXJ0aWVzRnJvbVNldHRpbmdzLmVjcz8ubWF4aW11bUhlYWx0aHlQZXJjZW50LFxuICAgICk7XG5cbiAgICBjb25zdCBzdGFja3MgPSBzdGFja0NvbGxlY3Rpb24uc3RhY2tBcnRpZmFjdHM7XG5cbiAgICBjb25zdCBzdGFja091dHB1dHM6IHsgW2tleTogc3RyaW5nXTogYW55IH0gPSB7fTtcbiAgICBjb25zdCBvdXRwdXRzRmlsZSA9IG9wdGlvbnMub3V0cHV0c0ZpbGU7XG5cbiAgICBjb25zdCBidWlsZEFzc2V0ID0gYXN5bmMgKGFzc2V0Tm9kZTogQXNzZXRCdWlsZE5vZGUpID0+IHtcbiAgICAgIGF3YWl0IHRoaXMucHJvcHMuZGVwbG95bWVudHMuYnVpbGRTaW5nbGVBc3NldChcbiAgICAgICAgYXNzZXROb2RlLmFzc2V0TWFuaWZlc3RBcnRpZmFjdCxcbiAgICAgICAgYXNzZXROb2RlLmFzc2V0TWFuaWZlc3QsXG4gICAgICAgIGFzc2V0Tm9kZS5hc3NldCxcbiAgICAgICAge1xuICAgICAgICAgIHN0YWNrOiBhc3NldE5vZGUucGFyZW50U3RhY2ssXG4gICAgICAgICAgcm9sZUFybjogb3B0aW9ucy5yb2xlQXJuLFxuICAgICAgICAgIHN0YWNrTmFtZTogYXNzZXROb2RlLnBhcmVudFN0YWNrLnN0YWNrTmFtZSxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfTtcblxuICAgIGNvbnN0IHB1Ymxpc2hBc3NldCA9IGFzeW5jIChhc3NldE5vZGU6IEFzc2V0UHVibGlzaE5vZGUpID0+IHtcbiAgICAgIGF3YWl0IHRoaXMucHJvcHMuZGVwbG95bWVudHMucHVibGlzaFNpbmdsZUFzc2V0KGFzc2V0Tm9kZS5hc3NldE1hbmlmZXN0LCBhc3NldE5vZGUuYXNzZXQsIHtcbiAgICAgICAgc3RhY2s6IGFzc2V0Tm9kZS5wYXJlbnRTdGFjayxcbiAgICAgICAgcm9sZUFybjogb3B0aW9ucy5yb2xlQXJuLFxuICAgICAgICBzdGFja05hbWU6IGFzc2V0Tm9kZS5wYXJlbnRTdGFjay5zdGFja05hbWUsXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgZGVwbG95U3RhY2sgPSBhc3luYyAoc3RhY2tOb2RlOiBTdGFja05vZGUpID0+IHtcbiAgICAgIGNvbnN0IHN0YWNrID0gc3RhY2tOb2RlLnN0YWNrO1xuICAgICAgaWYgKHN0YWNrQ29sbGVjdGlvbi5zdGFja0NvdW50ICE9PSAxKSB7XG4gICAgICAgIGhpZ2hsaWdodChzdGFjay5kaXNwbGF5TmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghc3RhY2suZW52aXJvbm1lbnQpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihcbiAgICAgICAgICBgU3RhY2sgJHtzdGFjay5kaXNwbGF5TmFtZX0gZG9lcyBub3QgZGVmaW5lIGFuIGVudmlyb25tZW50LCBhbmQgQVdTIGNyZWRlbnRpYWxzIGNvdWxkIG5vdCBiZSBvYnRhaW5lZCBmcm9tIHN0YW5kYXJkIGxvY2F0aW9ucyBvciBubyByZWdpb24gd2FzIGNvbmZpZ3VyZWQuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHN0YWNrLnRlbXBsYXRlLlJlc291cmNlcyB8fCB7fSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIFRoZSBnZW5lcmF0ZWQgc3RhY2sgaGFzIG5vIHJlc291cmNlc1xuICAgICAgICBpZiAoIShhd2FpdCB0aGlzLnByb3BzLmRlcGxveW1lbnRzLnN0YWNrRXhpc3RzKHsgc3RhY2sgfSkpKSB7XG4gICAgICAgICAgd2FybmluZygnJXM6IHN0YWNrIGhhcyBubyByZXNvdXJjZXMsIHNraXBwaW5nIGRlcGxveW1lbnQuJywgY2hhbGsuYm9sZChzdGFjay5kaXNwbGF5TmFtZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdhcm5pbmcoJyVzOiBzdGFjayBoYXMgbm8gcmVzb3VyY2VzLCBkZWxldGluZyBleGlzdGluZyBzdGFjay4nLCBjaGFsay5ib2xkKHN0YWNrLmRpc3BsYXlOYW1lKSk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5kZXN0cm95KHtcbiAgICAgICAgICAgIHNlbGVjdG9yOiB7IHBhdHRlcm5zOiBbc3RhY2suaGllcmFyY2hpY2FsSWRdIH0sXG4gICAgICAgICAgICBleGNsdXNpdmVseTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlOiB0cnVlLFxuICAgICAgICAgICAgcm9sZUFybjogb3B0aW9ucy5yb2xlQXJuLFxuICAgICAgICAgICAgZnJvbURlcGxveTogdHJ1ZSxcbiAgICAgICAgICAgIGNpOiBvcHRpb25zLmNpLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlcXVpcmVBcHByb3ZhbCAhPT0gUmVxdWlyZUFwcHJvdmFsLk5ldmVyKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRUZW1wbGF0ZSA9IGF3YWl0IHRoaXMucHJvcHMuZGVwbG95bWVudHMucmVhZEN1cnJlbnRUZW1wbGF0ZShzdGFjayk7XG4gICAgICAgIGlmIChwcmludFNlY3VyaXR5RGlmZihjdXJyZW50VGVtcGxhdGUsIHN0YWNrLCByZXF1aXJlQXBwcm92YWwpKSB7XG4gICAgICAgICAgYXdhaXQgYXNrVXNlckNvbmZpcm1hdGlvbihcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5LFxuICAgICAgICAgICAgJ1wiLS1yZXF1aXJlLWFwcHJvdmFsXCIgaXMgZW5hYmxlZCBhbmQgc3RhY2sgaW5jbHVkZXMgc2VjdXJpdHktc2Vuc2l0aXZlIHVwZGF0ZXMnLFxuICAgICAgICAgICAgJ0RvIHlvdSB3aXNoIHRvIGRlcGxveSB0aGVzZSBjaGFuZ2VzJyxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEZvbGxvd2luZyBhcmUgdGhlIHNhbWUgc2VtYW50aWNzIHdlIGFwcGx5IHdpdGggcmVzcGVjdCB0byBOb3RpZmljYXRpb24gQVJOcyAoZGljdGF0ZWQgYnkgdGhlIFNESylcbiAgICAgIC8vXG4gICAgICAvLyAgLSB1bmRlZmluZWQgID0+ICBjZGsgaWdub3JlcyBpdCwgYXMgaWYgaXQgd2Fzbid0IHN1cHBvcnRlZCAoYWxsb3dzIGV4dGVybmFsIG1hbmFnZW1lbnQpLlxuICAgICAgLy8gIC0gW106ICAgICAgICA9PiAgY2RrIG1hbmFnZXMgaXQsIGFuZCB0aGUgdXNlciB3YW50cyB0byB3aXBlIGl0IG91dC5cbiAgICAgIC8vICAtIFsnYXJuLTEnXSAgPT4gIGNkayBtYW5hZ2VzIGl0LCBhbmQgdGhlIHVzZXIgd2FudHMgdG8gc2V0IGl0IHRvIFsnYXJuLTEnXS5cbiAgICAgIGNvbnN0IG5vdGlmaWNhdGlvbkFybnMgPSAoISFvcHRpb25zLm5vdGlmaWNhdGlvbkFybnMgfHwgISFzdGFjay5ub3RpZmljYXRpb25Bcm5zKVxuICAgICAgICA/IChvcHRpb25zLm5vdGlmaWNhdGlvbkFybnMgPz8gW10pLmNvbmNhdChzdGFjay5ub3RpZmljYXRpb25Bcm5zID8/IFtdKVxuICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgZm9yIChjb25zdCBub3RpZmljYXRpb25Bcm4gb2Ygbm90aWZpY2F0aW9uQXJucyA/PyBbXSkge1xuICAgICAgICBpZiAoIXZhbGlkYXRlU25zVG9waWNBcm4obm90aWZpY2F0aW9uQXJuKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYE5vdGlmaWNhdGlvbiBhcm4gJHtub3RpZmljYXRpb25Bcm59IGlzIG5vdCBhIHZhbGlkIGFybiBmb3IgYW4gU05TIHRvcGljYCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3RhY2tJbmRleCA9IHN0YWNrcy5pbmRleE9mKHN0YWNrKSArIDE7XG4gICAgICBwcmludCgnJXM6IGRlcGxveWluZy4uLiBbJXMvJXNdJywgY2hhbGsuYm9sZChzdGFjay5kaXNwbGF5TmFtZSksIHN0YWNrSW5kZXgsIHN0YWNrQ29sbGVjdGlvbi5zdGFja0NvdW50KTtcbiAgICAgIGNvbnN0IHN0YXJ0RGVwbG95VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgICBsZXQgdGFncyA9IG9wdGlvbnMudGFncztcbiAgICAgIGlmICghdGFncyB8fCB0YWdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0YWdzID0gdGFnc0ZvclN0YWNrKHN0YWNrKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGVsYXBzZWREZXBsb3lUaW1lID0gMDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCBkZXBsb3lSZXN1bHQ6IFN1Y2Nlc3NmdWxEZXBsb3lTdGFja1Jlc3VsdCB8IHVuZGVmaW5lZDtcblxuICAgICAgICBsZXQgcm9sbGJhY2sgPSBvcHRpb25zLnJvbGxiYWNrO1xuICAgICAgICBsZXQgaXRlcmF0aW9uID0gMDtcbiAgICAgICAgd2hpbGUgKCFkZXBsb3lSZXN1bHQpIHtcbiAgICAgICAgICBpZiAoKytpdGVyYXRpb24gPiAyKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdUaGlzIGxvb3Agc2hvdWxkIGhhdmUgc3RhYmlsaXplZCBpbiAyIGl0ZXJhdGlvbnMsIGJ1dCBkaWRuXFwndC4gSWYgeW91IGFyZSBzZWVpbmcgdGhpcyBlcnJvciwgcGxlYXNlIHJlcG9ydCBpdCBhdCBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzL25ldy9jaG9vc2UnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5wcm9wcy5kZXBsb3ltZW50cy5kZXBsb3lTdGFjayh7XG4gICAgICAgICAgICBzdGFjayxcbiAgICAgICAgICAgIGRlcGxveU5hbWU6IHN0YWNrLnN0YWNrTmFtZSxcbiAgICAgICAgICAgIHJvbGVBcm46IG9wdGlvbnMucm9sZUFybixcbiAgICAgICAgICAgIHRvb2xraXRTdGFja05hbWU6IG9wdGlvbnMudG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICAgICAgIHJldXNlQXNzZXRzOiBvcHRpb25zLnJldXNlQXNzZXRzLFxuICAgICAgICAgICAgbm90aWZpY2F0aW9uQXJucyxcbiAgICAgICAgICAgIHRhZ3MsXG4gICAgICAgICAgICBleGVjdXRlOiBvcHRpb25zLmV4ZWN1dGUsXG4gICAgICAgICAgICBjaGFuZ2VTZXROYW1lOiBvcHRpb25zLmNoYW5nZVNldE5hbWUsXG4gICAgICAgICAgICBkZXBsb3ltZW50TWV0aG9kOiBvcHRpb25zLmRlcGxveW1lbnRNZXRob2QsXG4gICAgICAgICAgICBmb3JjZTogb3B0aW9ucy5mb3JjZSxcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IE9iamVjdC5hc3NpZ24oe30sIHBhcmFtZXRlck1hcFsnKiddLCBwYXJhbWV0ZXJNYXBbc3RhY2suc3RhY2tOYW1lXSksXG4gICAgICAgICAgICB1c2VQcmV2aW91c1BhcmFtZXRlcnM6IG9wdGlvbnMudXNlUHJldmlvdXNQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgcHJvZ3Jlc3MsXG4gICAgICAgICAgICBjaTogb3B0aW9ucy5jaSxcbiAgICAgICAgICAgIHJvbGxiYWNrLFxuICAgICAgICAgICAgaG90c3dhcDogb3B0aW9ucy5ob3Rzd2FwLFxuICAgICAgICAgICAgaG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzOiBob3Rzd2FwUHJvcGVydHlPdmVycmlkZXMsXG4gICAgICAgICAgICBleHRyYVVzZXJBZ2VudDogb3B0aW9ucy5leHRyYVVzZXJBZ2VudCxcbiAgICAgICAgICAgIGFzc2V0UGFyYWxsZWxpc206IG9wdGlvbnMuYXNzZXRQYXJhbGxlbGlzbSxcbiAgICAgICAgICAgIGlnbm9yZU5vU3RhY2tzOiBvcHRpb25zLmlnbm9yZU5vU3RhY2tzLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgc3dpdGNoIChyLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2RpZC1kZXBsb3ktc3RhY2snOlxuICAgICAgICAgICAgICBkZXBsb3lSZXN1bHQgPSByO1xuICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnZmFpbHBhdXNlZC1uZWVkLXJvbGxiYWNrLWZpcnN0Jzoge1xuICAgICAgICAgICAgICBjb25zdCBtb3RpdmF0aW9uID0gci5yZWFzb24gPT09ICdyZXBsYWNlbWVudCdcbiAgICAgICAgICAgICAgICA/IGBTdGFjayBpcyBpbiBhIHBhdXNlZCBmYWlsIHN0YXRlICgke3Iuc3RhdHVzfSkgYW5kIGNoYW5nZSBpbmNsdWRlcyBhIHJlcGxhY2VtZW50IHdoaWNoIGNhbm5vdCBiZSBkZXBsb3llZCB3aXRoIFwiLS1uby1yb2xsYmFja1wiYFxuICAgICAgICAgICAgICAgIDogYFN0YWNrIGlzIGluIGEgcGF1c2VkIGZhaWwgc3RhdGUgKCR7ci5zdGF0dXN9KSBhbmQgY29tbWFuZCBsaW5lIGFyZ3VtZW50cyBkbyBub3QgaW5jbHVkZSBcIi0tbm8tcm9sbGJhY2tcImA7XG5cbiAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZm9yY2UpIHtcbiAgICAgICAgICAgICAgICB3YXJuaW5nKGAke21vdGl2YXRpb259LiBSb2xsaW5nIGJhY2sgZmlyc3QgKC0tZm9yY2UpLmApO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF3YWl0IGFza1VzZXJDb25maXJtYXRpb24oXG4gICAgICAgICAgICAgICAgICBjb25jdXJyZW5jeSxcbiAgICAgICAgICAgICAgICAgIG1vdGl2YXRpb24sXG4gICAgICAgICAgICAgICAgICBgJHttb3RpdmF0aW9ufS4gUm9sbCBiYWNrIGZpcnN0IGFuZCB0aGVuIHByb2NlZWQgd2l0aCBkZXBsb3ltZW50YCxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gUGVyZm9ybSBhIHJvbGxiYWNrXG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucm9sbGJhY2soe1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiB7IHBhdHRlcm5zOiBbc3RhY2suaGllcmFyY2hpY2FsSWRdIH0sXG4gICAgICAgICAgICAgICAgdG9vbGtpdFN0YWNrTmFtZTogb3B0aW9ucy50b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAgICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAvLyBHbyBhcm91bmQgdGhyb3VnaCB0aGUgJ3doaWxlJyBsb29wIGFnYWluIGJ1dCBzd2l0Y2ggcm9sbGJhY2sgdG8gdHJ1ZS5cbiAgICAgICAgICAgICAgcm9sbGJhY2sgPSB0cnVlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FzZSAncmVwbGFjZW1lbnQtcmVxdWlyZXMtcm9sbGJhY2snOiB7XG4gICAgICAgICAgICAgIGNvbnN0IG1vdGl2YXRpb24gPSAnQ2hhbmdlIGluY2x1ZGVzIGEgcmVwbGFjZW1lbnQgd2hpY2ggY2Fubm90IGJlIGRlcGxveWVkIHdpdGggXCItLW5vLXJvbGxiYWNrXCInO1xuXG4gICAgICAgICAgICAgIGlmIChvcHRpb25zLmZvcmNlKSB7XG4gICAgICAgICAgICAgICAgd2FybmluZyhgJHttb3RpdmF0aW9ufS4gUHJvY2VlZGluZyB3aXRoIHJlZ3VsYXIgZGVwbG95bWVudCAoLS1mb3JjZSkuYCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgYXNrVXNlckNvbmZpcm1hdGlvbihcbiAgICAgICAgICAgICAgICAgIGNvbmN1cnJlbmN5LFxuICAgICAgICAgICAgICAgICAgbW90aXZhdGlvbixcbiAgICAgICAgICAgICAgICAgIGAke21vdGl2YXRpb259LiBQZXJmb3JtIGEgcmVndWxhciBkZXBsb3ltZW50YCxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gR28gYXJvdW5kIHRocm91Z2ggdGhlICd3aGlsZScgbG9vcCBhZ2FpbiBidXQgc3dpdGNoIHJvbGxiYWNrIHRvIGZhbHNlLlxuICAgICAgICAgICAgICByb2xsYmFjayA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBVbmV4cGVjdGVkIHJlc3VsdCB0eXBlIGZyb20gZGVwbG95U3RhY2s6ICR7SlNPTi5zdHJpbmdpZnkocil9LiBJZiB5b3UgYXJlIHNlZWluZyB0aGlzIGVycm9yLCBwbGVhc2UgcmVwb3J0IGl0IGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvbmV3L2Nob29zZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBkZXBsb3lSZXN1bHQubm9PcFxuICAgICAgICAgID8gJyDinIUgICVzIChubyBjaGFuZ2VzKSdcbiAgICAgICAgICA6ICcg4pyFICAlcyc7XG5cbiAgICAgICAgc3VjY2VzcygnXFxuJyArIG1lc3NhZ2UsIHN0YWNrLmRpc3BsYXlOYW1lKTtcbiAgICAgICAgZWxhcHNlZERlcGxveVRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0RGVwbG95VGltZTtcbiAgICAgICAgcHJpbnQoJ1xcbuKcqCAgRGVwbG95bWVudCB0aW1lOiAlc3NcXG4nLCBmb3JtYXRUaW1lKGVsYXBzZWREZXBsb3lUaW1lKSk7XG5cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKGRlcGxveVJlc3VsdC5vdXRwdXRzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcHJpbnQoJ091dHB1dHM6Jyk7XG5cbiAgICAgICAgICBzdGFja091dHB1dHNbc3RhY2suc3RhY2tOYW1lXSA9IGRlcGxveVJlc3VsdC5vdXRwdXRzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC5rZXlzKGRlcGxveVJlc3VsdC5vdXRwdXRzKS5zb3J0KCkpIHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRlcGxveVJlc3VsdC5vdXRwdXRzW25hbWVdO1xuICAgICAgICAgIHByaW50KCclcy4lcyA9ICVzJywgY2hhbGsuY3lhbihzdGFjay5pZCksIGNoYWxrLmN5YW4obmFtZSksIGNoYWxrLnVuZGVybGluZShjaGFsay5jeWFuKHZhbHVlKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpbnQoJ1N0YWNrIEFSTjonKTtcblxuICAgICAgICBkYXRhKGRlcGxveVJlc3VsdC5zdGFja0Fybik7XG4gICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgLy8gSXQgaGFzIHRvIGJlIGV4YWN0bHkgdGhpcyBzdHJpbmcgYmVjYXVzZSBhbiBpbnRlZ3JhdGlvbiB0ZXN0IHRlc3RzIGZvclxuICAgICAgICAvLyBcImJvbGQoc3RhY2tuYW1lKSBmYWlsZWQ6IFJlc291cmNlTm90UmVhZHk6IDxlcnJvcj5cIlxuICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKFxuICAgICAgICAgIFtg4p2MICAke2NoYWxrLmJvbGQoc3RhY2suc3RhY2tOYW1lKX0gZmFpbGVkOmAsIC4uLihlLm5hbWUgPyBbYCR7ZS5uYW1lfTpgXSA6IFtdKSwgZS5tZXNzYWdlXS5qb2luKCcgJyksXG4gICAgICAgICk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAob3B0aW9ucy5jbG91ZFdhdGNoTG9nTW9uaXRvcikge1xuICAgICAgICAgIGNvbnN0IGZvdW5kTG9nR3JvdXBzUmVzdWx0ID0gYXdhaXQgZmluZENsb3VkV2F0Y2hMb2dHcm91cHModGhpcy5wcm9wcy5zZGtQcm92aWRlciwgc3RhY2spO1xuICAgICAgICAgIG9wdGlvbnMuY2xvdWRXYXRjaExvZ01vbml0b3IuYWRkTG9nR3JvdXBzKFxuICAgICAgICAgICAgZm91bmRMb2dHcm91cHNSZXN1bHQuZW52LFxuICAgICAgICAgICAgZm91bmRMb2dHcm91cHNSZXN1bHQuc2RrLFxuICAgICAgICAgICAgZm91bmRMb2dHcm91cHNSZXN1bHQubG9nR3JvdXBOYW1lcyxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIGFuIG91dHB1dHMgZmlsZSBoYXMgYmVlbiBzcGVjaWZpZWQsIGNyZWF0ZSB0aGUgZmlsZSBwYXRoIGFuZCB3cml0ZSBzdGFjayBvdXRwdXRzIHRvIGl0IG9uY2UuXG4gICAgICAgIC8vIE91dHB1dHMgYXJlIHdyaXR0ZW4gYWZ0ZXIgYWxsIHN0YWNrcyBoYXZlIGJlZW4gZGVwbG95ZWQuIElmIGEgc3RhY2sgZGVwbG95bWVudCBmYWlscyxcbiAgICAgICAgLy8gYWxsIG9mIHRoZSBvdXRwdXRzIGZyb20gc3VjY2Vzc2Z1bGx5IGRlcGxveWVkIHN0YWNrcyBiZWZvcmUgdGhlIGZhaWx1cmUgd2lsbCBzdGlsbCBiZSB3cml0dGVuLlxuICAgICAgICBpZiAob3V0cHV0c0ZpbGUpIHtcbiAgICAgICAgICBmcy5lbnN1cmVGaWxlU3luYyhvdXRwdXRzRmlsZSk7XG4gICAgICAgICAgYXdhaXQgZnMud3JpdGVKc29uKG91dHB1dHNGaWxlLCBzdGFja091dHB1dHMsIHtcbiAgICAgICAgICAgIHNwYWNlczogMixcbiAgICAgICAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHByaW50KCdcXG7inKggIFRvdGFsIHRpbWU6ICVzc1xcbicsIGZvcm1hdFRpbWUoZWxhcHNlZFN5bnRoVGltZSArIGVsYXBzZWREZXBsb3lUaW1lKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGFzc2V0QnVpbGRUaW1lID0gb3B0aW9ucy5hc3NldEJ1aWxkVGltZSA/PyBBc3NldEJ1aWxkVGltZS5BTExfQkVGT1JFX0RFUExPWTtcbiAgICBjb25zdCBwcmVidWlsZEFzc2V0cyA9IGFzc2V0QnVpbGRUaW1lID09PSBBc3NldEJ1aWxkVGltZS5BTExfQkVGT1JFX0RFUExPWTtcbiAgICBjb25zdCBjb25jdXJyZW5jeSA9IG9wdGlvbnMuY29uY3VycmVuY3kgfHwgMTtcbiAgICBjb25zdCBwcm9ncmVzcyA9IGNvbmN1cnJlbmN5ID4gMSA/IFN0YWNrQWN0aXZpdHlQcm9ncmVzcy5FVkVOVFMgOiBvcHRpb25zLnByb2dyZXNzO1xuICAgIGlmIChjb25jdXJyZW5jeSA+IDEgJiYgb3B0aW9ucy5wcm9ncmVzcyAmJiBvcHRpb25zLnByb2dyZXNzICE9IFN0YWNrQWN0aXZpdHlQcm9ncmVzcy5FVkVOVFMpIHtcbiAgICAgIHdhcm5pbmcoJ+KaoO+4jyBUaGUgLS1jb25jdXJyZW5jeSBmbGFnIG9ubHkgc3VwcG9ydHMgLS1wcm9ncmVzcyBcImV2ZW50c1wiLiBTd2l0Y2hpbmcgdG8gXCJldmVudHNcIi4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdGFja3NBbmRUaGVpckFzc2V0TWFuaWZlc3RzID0gc3RhY2tzLmZsYXRNYXAoKHN0YWNrKSA9PiBbXG4gICAgICBzdGFjayxcbiAgICAgIC4uLnN0YWNrLmRlcGVuZGVuY2llcy5maWx0ZXIoY3hhcGkuQXNzZXRNYW5pZmVzdEFydGlmYWN0LmlzQXNzZXRNYW5pZmVzdEFydGlmYWN0KSxcbiAgICBdKTtcbiAgICBjb25zdCB3b3JrR3JhcGggPSBuZXcgV29ya0dyYXBoQnVpbGRlcihwcmVidWlsZEFzc2V0cykuYnVpbGQoc3RhY2tzQW5kVGhlaXJBc3NldE1hbmlmZXN0cyk7XG5cbiAgICAvLyBVbmxlc3Mgd2UgYXJlIHJ1bm5pbmcgd2l0aCAnLS1mb3JjZScsIHNraXAgYWxyZWFkeSBwdWJsaXNoZWQgYXNzZXRzXG4gICAgaWYgKCFvcHRpb25zLmZvcmNlKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbW92ZVB1Ymxpc2hlZEFzc2V0cyh3b3JrR3JhcGgsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IGdyYXBoQ29uY3VycmVuY3k6IENvbmN1cnJlbmN5ID0ge1xuICAgICAgJ3N0YWNrJzogY29uY3VycmVuY3ksXG4gICAgICAnYXNzZXQtYnVpbGQnOiAxLCAvLyBUaGlzIHdpbGwgYmUgQ1BVLWJvdW5kL21lbW9yeSBib3VuZCwgbW9zdGx5IG1hdHRlcnMgZm9yIERvY2tlciBidWlsZHNcbiAgICAgICdhc3NldC1wdWJsaXNoJzogKG9wdGlvbnMuYXNzZXRQYXJhbGxlbGlzbSA/PyB0cnVlKSA/IDggOiAxLCAvLyBUaGlzIHdpbGwgYmUgSS9PLWJvdW5kLCA4IGluIHBhcmFsbGVsIHNlZW1zIHJlYXNvbmFibGVcbiAgICB9O1xuXG4gICAgYXdhaXQgd29ya0dyYXBoLmRvUGFyYWxsZWwoZ3JhcGhDb25jdXJyZW5jeSwge1xuICAgICAgZGVwbG95U3RhY2ssXG4gICAgICBidWlsZEFzc2V0LFxuICAgICAgcHVibGlzaEFzc2V0LFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJvbGwgYmFjayB0aGUgZ2l2ZW4gc3RhY2sgb3Igc3RhY2tzLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIHJvbGxiYWNrKG9wdGlvbnM6IFJvbGxiYWNrT3B0aW9ucykge1xuICAgIGNvbnN0IHN0YXJ0U3ludGhUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgY29uc3Qgc3RhY2tDb2xsZWN0aW9uID0gYXdhaXQgdGhpcy5zZWxlY3RTdGFja3NGb3JEZXBsb3kob3B0aW9ucy5zZWxlY3RvciwgdHJ1ZSk7XG4gICAgY29uc3QgZWxhcHNlZFN5bnRoVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRTeW50aFRpbWU7XG4gICAgcHJpbnQoJ1xcbuKcqCAgU3ludGhlc2lzIHRpbWU6ICVzc1xcbicsIGZvcm1hdFRpbWUoZWxhcHNlZFN5bnRoVGltZSkpO1xuXG4gICAgaWYgKHN0YWNrQ29sbGVjdGlvbi5zdGFja0NvdW50ID09PSAwKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcignTm8gc3RhY2tzIHNlbGVjdGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGFueVJvbGxiYWNrYWJsZSA9IGZhbHNlO1xuXG4gICAgZm9yIChjb25zdCBzdGFjayBvZiBzdGFja0NvbGxlY3Rpb24uc3RhY2tBcnRpZmFjdHMpIHtcbiAgICAgIHByaW50KCdSb2xsaW5nIGJhY2sgJXMnLCBjaGFsay5ib2xkKHN0YWNrLmRpc3BsYXlOYW1lKSk7XG4gICAgICBjb25zdCBzdGFydFJvbGxiYWNrVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wcm9wcy5kZXBsb3ltZW50cy5yb2xsYmFja1N0YWNrKHtcbiAgICAgICAgICBzdGFjayxcbiAgICAgICAgICByb2xlQXJuOiBvcHRpb25zLnJvbGVBcm4sXG4gICAgICAgICAgdG9vbGtpdFN0YWNrTmFtZTogb3B0aW9ucy50b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAgIGZvcmNlOiBvcHRpb25zLmZvcmNlLFxuICAgICAgICAgIHZhbGlkYXRlQm9vdHN0cmFwU3RhY2tWZXJzaW9uOiBvcHRpb25zLnZhbGlkYXRlQm9vdHN0cmFwU3RhY2tWZXJzaW9uLFxuICAgICAgICAgIG9ycGhhbkxvZ2ljYWxJZHM6IG9wdGlvbnMub3JwaGFuTG9naWNhbElkcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghcmVzdWx0Lm5vdEluUm9sbGJhY2thYmxlU3RhdGUpIHtcbiAgICAgICAgICBhbnlSb2xsYmFja2FibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsYXBzZWRSb2xsYmFja1RpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0Um9sbGJhY2tUaW1lO1xuICAgICAgICBwcmludCgnXFxu4pyoICBSb2xsYmFjayB0aW1lOiAlc3NcXG4nLCBmb3JtYXRUaW1lKGVsYXBzZWRSb2xsYmFja1RpbWUpKTtcbiAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICBlcnJvcignXFxuIOKdjCAgJXMgZmFpbGVkOiAlcycsIGNoYWxrLmJvbGQoc3RhY2suZGlzcGxheU5hbWUpLCBlLm1lc3NhZ2UpO1xuICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdSb2xsYmFjayBmYWlsZWQgKHVzZSAtLWZvcmNlIHRvIG9ycGhhbiBmYWlsaW5nIHJlc291cmNlcyknKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFhbnlSb2xsYmFja2FibGUpIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoJ05vIHN0YWNrcyB3ZXJlIGluIGEgc3RhdGUgdGhhdCBjb3VsZCBiZSByb2xsZWQgYmFjaycpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB3YXRjaChvcHRpb25zOiBXYXRjaE9wdGlvbnMpIHtcbiAgICBjb25zdCByb290RGlyID0gcGF0aC5kaXJuYW1lKHBhdGgucmVzb2x2ZShQUk9KRUNUX0NPTkZJRykpO1xuICAgIGRlYnVnKFwicm9vdCBkaXJlY3RvcnkgdXNlZCBmb3IgJ3dhdGNoJyBpczogJXNcIiwgcm9vdERpcik7XG5cbiAgICBjb25zdCB3YXRjaFNldHRpbmdzOiB7IGluY2x1ZGU/OiBzdHJpbmcgfCBzdHJpbmdbXTsgZXhjbHVkZTogc3RyaW5nIHwgc3RyaW5nW10gfSB8IHVuZGVmaW5lZCA9XG4gICAgICB0aGlzLnByb3BzLmNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsnd2F0Y2gnXSk7XG4gICAgaWYgKCF3YXRjaFNldHRpbmdzKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKFxuICAgICAgICBcIkNhbm5vdCB1c2UgdGhlICd3YXRjaCcgY29tbWFuZCB3aXRob3V0IHNwZWNpZnlpbmcgYXQgbGVhc3Qgb25lIGRpcmVjdG9yeSB0byBtb25pdG9yLiBcIiArXG4gICAgICAgICAgJ01ha2Ugc3VyZSB0byBhZGQgYSBcIndhdGNoXCIga2V5IHRvIHlvdXIgY2RrLmpzb24nLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBGb3IgdGhlIFwiaW5jbHVkZVwiIHN1YmtleSB1bmRlciB0aGUgXCJ3YXRjaFwiIGtleSwgdGhlIGJlaGF2aW9yIGlzOlxuICAgIC8vIDEuIE5vIFwid2F0Y2hcIiBzZXR0aW5nPyBXZSBlcnJvciBvdXQuXG4gICAgLy8gMi4gXCJ3YXRjaFwiIHNldHRpbmcgd2l0aG91dCBhbiBcImluY2x1ZGVcIiBrZXk/IFdlIGRlZmF1bHQgdG8gb2JzZXJ2aW5nIFwiLi8qKlwiLlxuICAgIC8vIDMuIFwid2F0Y2hcIiBzZXR0aW5nIHdpdGggYW4gZW1wdHkgXCJpbmNsdWRlXCIga2V5PyBXZSBkZWZhdWx0IHRvIG9ic2VydmluZyBcIi4vKipcIi5cbiAgICAvLyA0LiBOb24tZW1wdHkgXCJpbmNsdWRlXCIga2V5PyBKdXN0IHVzZSB0aGUgXCJpbmNsdWRlXCIga2V5LlxuICAgIGNvbnN0IHdhdGNoSW5jbHVkZXMgPSB0aGlzLnBhdHRlcm5zQXJyYXlGb3JXYXRjaCh3YXRjaFNldHRpbmdzLmluY2x1ZGUsIHtcbiAgICAgIHJvb3REaXIsXG4gICAgICByZXR1cm5Sb290RGlySWZFbXB0eTogdHJ1ZSxcbiAgICB9KTtcbiAgICBkZWJ1ZyhcIidpbmNsdWRlJyBwYXR0ZXJucyBmb3IgJ3dhdGNoJzogJXNcIiwgd2F0Y2hJbmNsdWRlcyk7XG5cbiAgICAvLyBGb3IgdGhlIFwiZXhjbHVkZVwiIHN1YmtleSB1bmRlciB0aGUgXCJ3YXRjaFwiIGtleSxcbiAgICAvLyB0aGUgYmVoYXZpb3IgaXMgdG8gYWRkIHNvbWUgZGVmYXVsdCBleGNsdWRlcyBpbiBhZGRpdGlvbiB0byB0aGUgb25lcyBzcGVjaWZpZWQgYnkgdGhlIHVzZXI6XG4gICAgLy8gMS4gVGhlIENESyBvdXRwdXQgZGlyZWN0b3J5LlxuICAgIC8vIDIuIEFueSBmaWxlIHdob3NlIG5hbWUgc3RhcnRzIHdpdGggYSBkb3QuXG4gICAgLy8gMy4gQW55IGRpcmVjdG9yeSdzIGNvbnRlbnQgd2hvc2UgbmFtZSBzdGFydHMgd2l0aCBhIGRvdC5cbiAgICAvLyA0LiBBbnkgbm9kZV9tb2R1bGVzIGFuZCBpdHMgY29udGVudCAoZXZlbiBpZiBpdCdzIG5vdCBhIEpTL1RTIHByb2plY3QsIHlvdSBtaWdodCBiZSB1c2luZyBhIGxvY2FsIGF3cy1jbGkgcGFja2FnZSlcbiAgICBjb25zdCBvdXRwdXREaXIgPSB0aGlzLnByb3BzLmNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsnb3V0cHV0J10pO1xuICAgIGNvbnN0IHdhdGNoRXhjbHVkZXMgPSB0aGlzLnBhdHRlcm5zQXJyYXlGb3JXYXRjaCh3YXRjaFNldHRpbmdzLmV4Y2x1ZGUsIHtcbiAgICAgIHJvb3REaXIsXG4gICAgICByZXR1cm5Sb290RGlySWZFbXB0eTogZmFsc2UsXG4gICAgfSkuY29uY2F0KGAke291dHB1dERpcn0vKipgLCAnKiovLionLCAnKiovLiovKionLCAnKiovbm9kZV9tb2R1bGVzLyoqJyk7XG4gICAgZGVidWcoXCInZXhjbHVkZScgcGF0dGVybnMgZm9yICd3YXRjaCc6ICVzXCIsIHdhdGNoRXhjbHVkZXMpO1xuXG4gICAgLy8gU2luY2UgJ2NkayBkZXBsb3knIGlzIGEgcmVsYXRpdmVseSBzbG93IG9wZXJhdGlvbiBmb3IgYSAnd2F0Y2gnIHByb2Nlc3MsXG4gICAgLy8gaW50cm9kdWNlIGEgY29uY3VycmVuY3kgbGF0Y2ggdGhhdCB0cmFja3MgdGhlIHN0YXRlLlxuICAgIC8vIFRoaXMgd2F5LCBpZiBmaWxlIGNoYW5nZSBldmVudHMgYXJyaXZlIHdoZW4gYSAnY2RrIGRlcGxveScgaXMgc3RpbGwgZXhlY3V0aW5nLFxuICAgIC8vIHdlIHdpbGwgYmF0Y2ggdGhlbSwgYW5kIHRyaWdnZXIgYW5vdGhlciAnY2RrIGRlcGxveScgYWZ0ZXIgdGhlIGN1cnJlbnQgb25lIGZpbmlzaGVzLFxuICAgIC8vIG1ha2luZyBzdXJlICdjZGsgZGVwbG95J3MgIGFsd2F5cyBleGVjdXRlIG9uZSBhdCBhIHRpbWUuXG4gICAgLy8gSGVyZSdzIGEgZGlhZ3JhbSBzaG93aW5nIHRoZSBzdGF0ZSB0cmFuc2l0aW9uczpcbiAgICAvLyAtLS0tLS0tLS0tLS0tLSAgICAgICAgICAgICAgICAtLS0tLS0tLSAgICBmaWxlIGNoYW5nZWQgICAgIC0tLS0tLS0tLS0tLS0tICAgIGZpbGUgY2hhbmdlZCAgICAgLS0tLS0tLS0tLS0tLS0gIGZpbGUgY2hhbmdlZFxuICAgIC8vIHwgICAgICAgICAgICB8ICByZWFkeSBldmVudCAgIHwgICAgICB8IC0tLS0tLS0tLS0tLS0tLS0tLT4gfCAgICAgICAgICAgIHwgLS0tLS0tLS0tLS0tLS0tLS0tPiB8ICAgICAgICAgICAgfCAtLS0tLS0tLS0tLS0tLXxcbiAgICAvLyB8IHByZS1yZWFkeSAgfCAtLS0tLS0tLS0tLS0tPiB8IG9wZW4gfCAgICAgICAgICAgICAgICAgICAgIHwgZGVwbG95aW5nICB8ICAgICAgICAgICAgICAgICAgICAgfCAgIHF1ZXVlZCAgIHwgICAgICAgICAgICAgICB8XG4gICAgLy8gfCAgICAgICAgICAgIHwgICAgICAgICAgICAgICAgfCAgICAgIHwgPC0tLS0tLS0tLS0tLS0tLS0tLSB8ICAgICAgICAgICAgfCA8LS0tLS0tLS0tLS0tLS0tLS0tIHwgICAgICAgICAgICB8IDwtLS0tLS0tLS0tLS0tfFxuICAgIC8vIC0tLS0tLS0tLS0tLS0tICAgICAgICAgICAgICAgIC0tLS0tLS0tICAnY2RrIGRlcGxveScgZG9uZSAgLS0tLS0tLS0tLS0tLS0gICdjZGsgZGVwbG95JyBkb25lICAtLS0tLS0tLS0tLS0tLVxuICAgIGxldCBsYXRjaDogJ3ByZS1yZWFkeScgfCAnb3BlbicgfCAnZGVwbG95aW5nJyB8ICdxdWV1ZWQnID0gJ3ByZS1yZWFkeSc7XG5cbiAgICBjb25zdCBjbG91ZFdhdGNoTG9nTW9uaXRvciA9IG9wdGlvbnMudHJhY2VMb2dzID8gbmV3IENsb3VkV2F0Y2hMb2dFdmVudE1vbml0b3IoKSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBkZXBsb3lBbmRXYXRjaCA9IGFzeW5jICgpID0+IHtcbiAgICAgIGxhdGNoID0gJ2RlcGxveWluZyc7XG4gICAgICBjbG91ZFdhdGNoTG9nTW9uaXRvcj8uZGVhY3RpdmF0ZSgpO1xuXG4gICAgICBhd2FpdCB0aGlzLmludm9rZURlcGxveUZyb21XYXRjaChvcHRpb25zLCBjbG91ZFdhdGNoTG9nTW9uaXRvcik7XG5cbiAgICAgIC8vIElmIGxhdGNoIGlzIHN0aWxsICdkZXBsb3lpbmcnIGFmdGVyIHRoZSAnYXdhaXQnLCB0aGF0J3MgZmluZSxcbiAgICAgIC8vIGJ1dCBpZiBpdCdzICdxdWV1ZWQnLCB0aGF0IG1lYW5zIHdlIG5lZWQgdG8gZGVwbG95IGFnYWluXG4gICAgICB3aGlsZSAoKGxhdGNoIGFzICdkZXBsb3lpbmcnIHwgJ3F1ZXVlZCcpID09PSAncXVldWVkJykge1xuICAgICAgICAvLyBUeXBlU2NyaXB0IGRvZXNuJ3QgcmVhbGl6ZSBsYXRjaCBjYW4gY2hhbmdlIGJldHdlZW4gJ2F3YWl0cycsXG4gICAgICAgIC8vIGFuZCB0aGlua3MgdGhlIGFib3ZlICd3aGlsZScgY29uZGl0aW9uIGlzIGFsd2F5cyAnZmFsc2UnIHdpdGhvdXQgdGhlIGNhc3RcbiAgICAgICAgbGF0Y2ggPSAnZGVwbG95aW5nJztcbiAgICAgICAgcHJpbnQoXCJEZXRlY3RlZCBmaWxlIGNoYW5nZXMgZHVyaW5nIGRlcGxveW1lbnQuIEludm9raW5nICdjZGsgZGVwbG95JyBhZ2FpblwiKTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnZva2VEZXBsb3lGcm9tV2F0Y2gob3B0aW9ucywgY2xvdWRXYXRjaExvZ01vbml0b3IpO1xuICAgICAgfVxuICAgICAgbGF0Y2ggPSAnb3Blbic7XG4gICAgICBjbG91ZFdhdGNoTG9nTW9uaXRvcj8uYWN0aXZhdGUoKTtcbiAgICB9O1xuXG4gICAgY2hva2lkYXJcbiAgICAgIC53YXRjaCh3YXRjaEluY2x1ZGVzLCB7XG4gICAgICAgIGlnbm9yZWQ6IHdhdGNoRXhjbHVkZXMsXG4gICAgICAgIGN3ZDogcm9vdERpcixcbiAgICAgICAgLy8gaWdub3JlSW5pdGlhbDogdHJ1ZSxcbiAgICAgIH0pXG4gICAgICAub24oJ3JlYWR5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBsYXRjaCA9ICdvcGVuJztcbiAgICAgICAgZGVidWcoXCInd2F0Y2gnIHJlY2VpdmVkIHRoZSAncmVhZHknIGV2ZW50LiBGcm9tIG5vdyBvbiwgYWxsIGZpbGUgY2hhbmdlcyB3aWxsIHRyaWdnZXIgYSBkZXBsb3ltZW50XCIpO1xuICAgICAgICBwcmludChcIlRyaWdnZXJpbmcgaW5pdGlhbCAnY2RrIGRlcGxveSdcIik7XG4gICAgICAgIGF3YWl0IGRlcGxveUFuZFdhdGNoKCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdhbGwnLCBhc3luYyAoZXZlbnQ6ICdhZGQnIHwgJ2FkZERpcicgfCAnY2hhbmdlJyB8ICd1bmxpbmsnIHwgJ3VubGlua0RpcicsIGZpbGVQYXRoPzogc3RyaW5nKSA9PiB7XG4gICAgICAgIGlmIChsYXRjaCA9PT0gJ3ByZS1yZWFkeScpIHtcbiAgICAgICAgICBwcmludChgJ3dhdGNoJyBpcyBvYnNlcnZpbmcgJHtldmVudCA9PT0gJ2FkZERpcicgPyAnZGlyZWN0b3J5JyA6ICd0aGUgZmlsZSd9ICclcycgZm9yIGNoYW5nZXNgLCBmaWxlUGF0aCk7XG4gICAgICAgIH0gZWxzZSBpZiAobGF0Y2ggPT09ICdvcGVuJykge1xuICAgICAgICAgIHByaW50KFwiRGV0ZWN0ZWQgY2hhbmdlIHRvICclcycgKHR5cGU6ICVzKS4gVHJpZ2dlcmluZyAnY2RrIGRlcGxveSdcIiwgZmlsZVBhdGgsIGV2ZW50KTtcbiAgICAgICAgICBhd2FpdCBkZXBsb3lBbmRXYXRjaCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHRoaXMgbWVhbnMgbGF0Y2ggaXMgZWl0aGVyICdkZXBsb3lpbmcnIG9yICdxdWV1ZWQnXG4gICAgICAgICAgbGF0Y2ggPSAncXVldWVkJztcbiAgICAgICAgICBwcmludChcbiAgICAgICAgICAgIFwiRGV0ZWN0ZWQgY2hhbmdlIHRvICclcycgKHR5cGU6ICVzKSB3aGlsZSAnY2RrIGRlcGxveScgaXMgc3RpbGwgcnVubmluZy4gXCIgK1xuICAgICAgICAgICAgICAnV2lsbCBxdWV1ZSBmb3IgYW5vdGhlciBkZXBsb3ltZW50IGFmdGVyIHRoaXMgb25lIGZpbmlzaGVzJyxcbiAgICAgICAgICAgIGZpbGVQYXRoLFxuICAgICAgICAgICAgZXZlbnQsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgaW1wb3J0KG9wdGlvbnM6IEltcG9ydE9wdGlvbnMpIHtcbiAgICBjb25zdCBzdGFja3MgPSBhd2FpdCB0aGlzLnNlbGVjdFN0YWNrc0ZvckRlcGxveShvcHRpb25zLnNlbGVjdG9yLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG5cbiAgICBpZiAoc3RhY2tzLnN0YWNrQ291bnQgPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKFxuICAgICAgICBgU3RhY2sgc2VsZWN0aW9uIGlzIGFtYmlndW91cywgcGxlYXNlIGNob29zZSBhIHNwZWNpZmljIHN0YWNrIGZvciBpbXBvcnQgWyR7c3RhY2tzLnN0YWNrQXJ0aWZhY3RzLm1hcCgoeCkgPT4geC5pZCkuam9pbignLCAnKX1dYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9jZXNzLnN0ZG91dC5pc1RUWSAmJiAhb3B0aW9ucy5yZXNvdXJjZU1hcHBpbmdGaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCctLXJlc291cmNlLW1hcHBpbmcgaXMgcmVxdWlyZWQgd2hlbiBpbnB1dCBpcyBub3QgYSB0ZXJtaW5hbCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YWNrID0gc3RhY2tzLnN0YWNrQXJ0aWZhY3RzWzBdO1xuXG4gICAgaGlnaGxpZ2h0KHN0YWNrLmRpc3BsYXlOYW1lKTtcblxuICAgIGNvbnN0IHJlc291cmNlSW1wb3J0ZXIgPSBuZXcgUmVzb3VyY2VJbXBvcnRlcihzdGFjaywgdGhpcy5wcm9wcy5kZXBsb3ltZW50cyk7XG4gICAgY29uc3QgeyBhZGRpdGlvbnMsIGhhc05vbkFkZGl0aW9ucyB9ID0gYXdhaXQgcmVzb3VyY2VJbXBvcnRlci5kaXNjb3ZlckltcG9ydGFibGVSZXNvdXJjZXMob3B0aW9ucy5mb3JjZSk7XG4gICAgaWYgKGFkZGl0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIHdhcm5pbmcoXG4gICAgICAgICclczogbm8gbmV3IHJlc291cmNlcyBjb21wYXJlZCB0byB0aGUgY3VycmVudGx5IGRlcGxveWVkIHN0YWNrLCBza2lwcGluZyBpbXBvcnQuJyxcbiAgICAgICAgY2hhbGsuYm9sZChzdGFjay5kaXNwbGF5TmFtZSksXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFByZXBhcmUgYSBtYXBwaW5nIG9mIHBoeXNpY2FsIHJlc291cmNlcyB0byBDREsgY29uc3RydWN0c1xuICAgIGNvbnN0IGFjdHVhbEltcG9ydCA9ICFvcHRpb25zLnJlc291cmNlTWFwcGluZ0ZpbGVcbiAgICAgID8gYXdhaXQgcmVzb3VyY2VJbXBvcnRlci5hc2tGb3JSZXNvdXJjZUlkZW50aWZpZXJzKGFkZGl0aW9ucylcbiAgICAgIDogYXdhaXQgcmVzb3VyY2VJbXBvcnRlci5sb2FkUmVzb3VyY2VJZGVudGlmaWVycyhhZGRpdGlvbnMsIG9wdGlvbnMucmVzb3VyY2VNYXBwaW5nRmlsZSk7XG5cbiAgICBpZiAoYWN0dWFsSW1wb3J0LmltcG9ydFJlc291cmNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHdhcm5pbmcoJ05vIHJlc291cmNlcyBzZWxlY3RlZCBmb3IgaW1wb3J0LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIFwiLS1jcmVhdGUtcmVzb3VyY2UtbWFwcGluZ1wiIG9wdGlvbiB3YXMgcGFzc2VkLCB3cml0ZSB0aGUgcmVzb3VyY2UgbWFwcGluZyB0byB0aGUgZ2l2ZW4gZmlsZSBhbmQgZXhpdFxuICAgIGlmIChvcHRpb25zLnJlY29yZFJlc291cmNlTWFwcGluZykge1xuICAgICAgY29uc3Qgb3V0cHV0RmlsZSA9IG9wdGlvbnMucmVjb3JkUmVzb3VyY2VNYXBwaW5nO1xuICAgICAgZnMuZW5zdXJlRmlsZVN5bmMob3V0cHV0RmlsZSk7XG4gICAgICBhd2FpdCBmcy53cml0ZUpzb24ob3V0cHV0RmlsZSwgYWN0dWFsSW1wb3J0LnJlc291cmNlTWFwLCB7XG4gICAgICAgIHNwYWNlczogMixcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgIH0pO1xuICAgICAgcHJpbnQoJyVzOiBtYXBwaW5nIGZpbGUgd3JpdHRlbi4nLCBvdXRwdXRGaWxlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJbXBvcnQgdGhlIHJlc291cmNlcyBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIG1hcHBpbmdcbiAgICBwcmludCgnJXM6IGltcG9ydGluZyByZXNvdXJjZXMgaW50byBzdGFjay4uLicsIGNoYWxrLmJvbGQoc3RhY2suZGlzcGxheU5hbWUpKTtcbiAgICBjb25zdCB0YWdzID0gdGFnc0ZvclN0YWNrKHN0YWNrKTtcbiAgICBhd2FpdCByZXNvdXJjZUltcG9ydGVyLmltcG9ydFJlc291cmNlc0Zyb21NYXAoYWN0dWFsSW1wb3J0LCB7XG4gICAgICByb2xlQXJuOiBvcHRpb25zLnJvbGVBcm4sXG4gICAgICB0b29sa2l0U3RhY2tOYW1lOiBvcHRpb25zLnRvb2xraXRTdGFja05hbWUsXG4gICAgICB0YWdzLFxuICAgICAgZGVwbG95bWVudE1ldGhvZDogb3B0aW9ucy5kZXBsb3ltZW50TWV0aG9kLFxuICAgICAgdXNlUHJldmlvdXNQYXJhbWV0ZXJzOiB0cnVlLFxuICAgICAgcHJvZ3Jlc3M6IG9wdGlvbnMucHJvZ3Jlc3MsXG4gICAgICByb2xsYmFjazogb3B0aW9ucy5yb2xsYmFjayxcbiAgICB9KTtcblxuICAgIC8vIE5vdGlmeSB1c2VyIG9mIG5leHQgc3RlcHNcbiAgICBwcmludChcbiAgICAgIGBJbXBvcnQgb3BlcmF0aW9uIGNvbXBsZXRlLiBXZSByZWNvbW1lbmQgeW91IHJ1biBhICR7Y2hhbGsuYmx1ZUJyaWdodCgnZHJpZnQgZGV0ZWN0aW9uJyl9IG9wZXJhdGlvbiBgICtcbiAgICAgICAgJ3RvIGNvbmZpcm0geW91ciBDREsgYXBwIHJlc291cmNlIGRlZmluaXRpb25zIGFyZSB1cC10by1kYXRlLiBSZWFkIG1vcmUgaGVyZTogJyArXG4gICAgICAgIGNoYWxrLnVuZGVybGluZS5ibHVlQnJpZ2h0KFxuICAgICAgICAgICdodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vQVdTQ2xvdWRGb3JtYXRpb24vbGF0ZXN0L1VzZXJHdWlkZS9kZXRlY3QtZHJpZnQtc3RhY2suaHRtbCcsXG4gICAgICAgICksXG4gICAgKTtcbiAgICBpZiAoYWN0dWFsSW1wb3J0LmltcG9ydFJlc291cmNlcy5sZW5ndGggPCBhZGRpdGlvbnMubGVuZ3RoKSB7XG4gICAgICBwcmludCgnJyk7XG4gICAgICB3YXJuaW5nKFxuICAgICAgICBgU29tZSByZXNvdXJjZXMgd2VyZSBza2lwcGVkLiBSdW4gYW5vdGhlciAke2NoYWxrLmJsdWVCcmlnaHQoJ2NkayBpbXBvcnQnKX0gb3IgYSAke2NoYWxrLmJsdWVCcmlnaHQoJ2NkayBkZXBsb3knKX0gdG8gYnJpbmcgdGhlIHN0YWNrIHVwLXRvLWRhdGUgd2l0aCB5b3VyIENESyBhcHAgZGVmaW5pdGlvbi5gLFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGhhc05vbkFkZGl0aW9ucykge1xuICAgICAgcHJpbnQoJycpO1xuICAgICAgd2FybmluZyhcbiAgICAgICAgYFlvdXIgYXBwIGhhcyBwZW5kaW5nIHVwZGF0ZXMgb3IgZGVsZXRlcyBleGNsdWRlZCBmcm9tIHRoaXMgaW1wb3J0IG9wZXJhdGlvbi4gUnVuIGEgJHtjaGFsay5ibHVlQnJpZ2h0KCdjZGsgZGVwbG95Jyl9IHRvIGJyaW5nIHRoZSBzdGFjayB1cC10by1kYXRlIHdpdGggeW91ciBDREsgYXBwIGRlZmluaXRpb24uYCxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIGRlc3Ryb3kob3B0aW9uczogRGVzdHJveU9wdGlvbnMpIHtcbiAgICBsZXQgc3RhY2tzID0gYXdhaXQgdGhpcy5zZWxlY3RTdGFja3NGb3JEZXN0cm95KG9wdGlvbnMuc2VsZWN0b3IsIG9wdGlvbnMuZXhjbHVzaXZlbHkpO1xuXG4gICAgLy8gVGhlIHN0YWNrcyB3aWxsIGhhdmUgYmVlbiBvcmRlcmVkIGZvciBkZXBsb3ltZW50LCBzbyByZXZlcnNlIHRoZW0gZm9yIGRlbGV0aW9uLlxuICAgIHN0YWNrcyA9IHN0YWNrcy5yZXZlcnNlZCgpO1xuXG4gICAgaWYgKCFvcHRpb25zLmZvcmNlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgICAgY29uc3QgY29uZmlybWVkID0gYXdhaXQgcHJvbXB0bHkuY29uZmlybShcbiAgICAgICAgYEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGU6ICR7Y2hhbGsuYmx1ZShzdGFja3Muc3RhY2tBcnRpZmFjdHMubWFwKChzKSA9PiBzLmhpZXJhcmNoaWNhbElkKS5qb2luKCcsICcpKX0gKHkvbik/YCxcbiAgICAgICk7XG4gICAgICBpZiAoIWNvbmZpcm1lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgYWN0aW9uID0gb3B0aW9ucy5mcm9tRGVwbG95ID8gJ2RlcGxveScgOiAnZGVzdHJveSc7XG4gICAgZm9yIChjb25zdCBbaW5kZXgsIHN0YWNrXSBvZiBzdGFja3Muc3RhY2tBcnRpZmFjdHMuZW50cmllcygpKSB7XG4gICAgICBzdWNjZXNzKCclczogZGVzdHJveWluZy4uLiBbJXMvJXNdJywgY2hhbGsuYmx1ZShzdGFjay5kaXNwbGF5TmFtZSksIGluZGV4ICsgMSwgc3RhY2tzLnN0YWNrQ291bnQpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5wcm9wcy5kZXBsb3ltZW50cy5kZXN0cm95U3RhY2soe1xuICAgICAgICAgIHN0YWNrLFxuICAgICAgICAgIGRlcGxveU5hbWU6IHN0YWNrLnN0YWNrTmFtZSxcbiAgICAgICAgICByb2xlQXJuOiBvcHRpb25zLnJvbGVBcm4sXG4gICAgICAgICAgY2k6IG9wdGlvbnMuY2ksXG4gICAgICAgIH0pO1xuICAgICAgICBzdWNjZXNzKGBcXG4g4pyFICAlczogJHthY3Rpb259ZWRgLCBjaGFsay5ibHVlKHN0YWNrLmRpc3BsYXlOYW1lKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yKGBcXG4g4p2MICAlczogJHthY3Rpb259IGZhaWxlZGAsIGNoYWxrLmJsdWUoc3RhY2suZGlzcGxheU5hbWUpLCBlKTtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgbGlzdChcbiAgICBzZWxlY3RvcnM6IHN0cmluZ1tdLFxuICAgIG9wdGlvbnM6IHsgbG9uZz86IGJvb2xlYW47IGpzb24/OiBib29sZWFuOyBzaG93RGVwcz86IGJvb2xlYW4gfSA9IHt9LFxuICApOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHN0YWNrcyA9IGF3YWl0IGxpc3RTdGFja3ModGhpcywge1xuICAgICAgc2VsZWN0b3JzOiBzZWxlY3RvcnMsXG4gICAgfSk7XG5cbiAgICBpZiAob3B0aW9ucy5sb25nICYmIG9wdGlvbnMuc2hvd0RlcHMpIHtcbiAgICAgIHByaW50U2VyaWFsaXplZE9iamVjdChzdGFja3MsIG9wdGlvbnMuanNvbiA/PyBmYWxzZSk7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5zaG93RGVwcykge1xuICAgICAgY29uc3Qgc3RhY2tEZXBzID0gW107XG5cbiAgICAgIGZvciAoY29uc3Qgc3RhY2sgb2Ygc3RhY2tzKSB7XG4gICAgICAgIHN0YWNrRGVwcy5wdXNoKHtcbiAgICAgICAgICBpZDogc3RhY2suaWQsXG4gICAgICAgICAgZGVwZW5kZW5jaWVzOiBzdGFjay5kZXBlbmRlbmNpZXMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBwcmludFNlcmlhbGl6ZWRPYmplY3Qoc3RhY2tEZXBzLCBvcHRpb25zLmpzb24gPz8gZmFsc2UpO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMubG9uZykge1xuICAgICAgY29uc3QgbG9uZyA9IFtdO1xuXG4gICAgICBmb3IgKGNvbnN0IHN0YWNrIG9mIHN0YWNrcykge1xuICAgICAgICBsb25nLnB1c2goe1xuICAgICAgICAgIGlkOiBzdGFjay5pZCxcbiAgICAgICAgICBuYW1lOiBzdGFjay5uYW1lLFxuICAgICAgICAgIGVudmlyb25tZW50OiBzdGFjay5lbnZpcm9ubWVudCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBwcmludFNlcmlhbGl6ZWRPYmplY3QobG9uZywgb3B0aW9ucy5qc29uID8/IGZhbHNlKTtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIC8vIGp1c3QgcHJpbnQgc3RhY2sgSURzXG4gICAgZm9yIChjb25zdCBzdGFjayBvZiBzdGFja3MpIHtcbiAgICAgIGRhdGEoc3RhY2suaWQpO1xuICAgIH1cblxuICAgIHJldHVybiAwOyAvLyBleGl0LWNvZGVcbiAgfVxuXG4gIC8qKlxuICAgKiBTeW50aGVzaXplIHRoZSBnaXZlbiBzZXQgb2Ygc3RhY2tzIChjYWxsZWQgd2hlbiB0aGUgdXNlciBydW5zICdjZGsgc3ludGgnKVxuICAgKlxuICAgKiBJTlBVVDogU3RhY2sgbmFtZXMgY2FuIGJlIHN1cHBsaWVkIHVzaW5nIGEgZ2xvYiBmaWx0ZXIuIElmIG5vIHN0YWNrcyBhcmVcbiAgICogZ2l2ZW4sIGFsbCBzdGFja3MgZnJvbSB0aGUgYXBwbGljYXRpb24gYXJlIGltcGxpY2l0bHkgc2VsZWN0ZWQuXG4gICAqXG4gICAqIE9VVFBVVDogSWYgbW9yZSB0aGFuIG9uZSBzdGFjayBlbmRzIHVwIGJlaW5nIHNlbGVjdGVkLCBhbiBvdXRwdXQgZGlyZWN0b3J5XG4gICAqIHNob3VsZCBiZSBzdXBwbGllZCwgd2hlcmUgdGhlIHRlbXBsYXRlcyB3aWxsIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgc3ludGgoXG4gICAgc3RhY2tOYW1lczogc3RyaW5nW10sXG4gICAgZXhjbHVzaXZlbHk6IGJvb2xlYW4sXG4gICAgcXVpZXQ6IGJvb2xlYW4sXG4gICAgYXV0b1ZhbGlkYXRlPzogYm9vbGVhbixcbiAgICBqc29uPzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBzdGFja3MgPSBhd2FpdCB0aGlzLnNlbGVjdFN0YWNrc0ZvckRpZmYoc3RhY2tOYW1lcywgZXhjbHVzaXZlbHksIGF1dG9WYWxpZGF0ZSk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc2luZ2xlIHN0YWNrLCBwcmludCBpdCB0byBTVERPVVRcbiAgICBpZiAoc3RhY2tzLnN0YWNrQ291bnQgPT09IDEpIHtcbiAgICAgIGlmICghcXVpZXQpIHtcbiAgICAgICAgcHJpbnRTZXJpYWxpemVkT2JqZWN0KG9ic2N1cmVUZW1wbGF0ZShzdGFja3MuZmlyc3RTdGFjay50ZW1wbGF0ZSksIGpzb24gPz8gZmFsc2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBub3Qgb3V0cHV0dGluZyB0ZW1wbGF0ZSB0byBzdGRvdXQsIGxldCdzIGV4cGxhaW4gdGhpbmdzIHRvIHRoZSB1c2VyIGEgbGl0dGxlIGJpdC4uLlxuICAgIHN1Y2Nlc3MoYFN1Y2Nlc3NmdWxseSBzeW50aGVzaXplZCB0byAke2NoYWxrLmJsdWUocGF0aC5yZXNvbHZlKHN0YWNrcy5hc3NlbWJseS5kaXJlY3RvcnkpKX1gKTtcbiAgICBwcmludChcbiAgICAgIGBTdXBwbHkgYSBzdGFjayBpZCAoJHtzdGFja3Muc3RhY2tBcnRpZmFjdHMubWFwKChzKSA9PiBjaGFsay5ncmVlbihzLmhpZXJhcmNoaWNhbElkKSkuam9pbignLCAnKX0pIHRvIGRpc3BsYXkgaXRzIHRlbXBsYXRlLmAsXG4gICAgKTtcblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogQm9vdHN0cmFwIHRoZSBDREsgVG9vbGtpdCBzdGFjayBpbiB0aGUgYWNjb3VudHMgdXNlZCBieSB0aGUgc3BlY2lmaWVkIHN0YWNrKHMpLlxuICAgKlxuICAgKiBAcGFyYW0gdXNlckVudmlyb25tZW50U3BlY3MgZW52aXJvbm1lbnQgbmFtZXMgdGhhdCBuZWVkIHRvIGhhdmUgdG9vbGtpdCBzdXBwb3J0XG4gICAqICAgICAgICAgICAgIHByb3Zpc2lvbmVkLCBhcyBhIGdsb2IgZmlsdGVyLiBJZiBub25lIGlzIHByb3ZpZGVkLCBhbGwgc3RhY2tzIGFyZSBpbXBsaWNpdGx5IHNlbGVjdGVkLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBUaGUgbmFtZSwgcm9sZSBBUk4sIGJvb3RzdHJhcHBpbmcgcGFyYW1ldGVycywgZXRjLiB0byBiZSB1c2VkIGZvciB0aGUgQ0RLIFRvb2xraXQgc3RhY2suXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgYm9vdHN0cmFwKFxuICAgIHVzZXJFbnZpcm9ubWVudFNwZWNzOiBzdHJpbmdbXSxcbiAgICBvcHRpb25zOiBCb290c3RyYXBFbnZpcm9ubWVudE9wdGlvbnMsXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGJvb3RzdHJhcHBlciA9IG5ldyBCb290c3RyYXBwZXIob3B0aW9ucy5zb3VyY2UpO1xuICAgIC8vIElmIHRoZXJlIGlzIGFuICctLWFwcCcgYXJndW1lbnQgYW5kIGFuIGVudmlyb25tZW50IGxvb2tzIGxpa2UgYSBnbG9iLCB3ZVxuICAgIC8vIHNlbGVjdCB0aGUgZW52aXJvbm1lbnRzIGZyb20gdGhlIGFwcC4gT3RoZXJ3aXNlLCB1c2Ugd2hhdCB0aGUgdXNlciBzYWlkLlxuXG4gICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXdhaXQgdGhpcy5kZWZpbmVFbnZpcm9ubWVudHModXNlckVudmlyb25tZW50U3BlY3MpO1xuXG4gICAgY29uc3QgbGltaXQgPSBwTGltaXQoMjApO1xuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBjZGtsYWJzL3Byb21pc2VhbGwtbm8tdW5ib3VuZGVkLXBhcmFsbGVsaXNtXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoZW52aXJvbm1lbnRzLm1hcCgoZW52aXJvbm1lbnQpID0+IGxpbWl0KGFzeW5jICgpID0+IHtcbiAgICAgIHN1Y2Nlc3MoJyDij7MgIEJvb3RzdHJhcHBpbmcgZW52aXJvbm1lbnQgJXMuLi4nLCBjaGFsay5ibHVlKGVudmlyb25tZW50Lm5hbWUpKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJvb3RzdHJhcHBlci5ib290c3RyYXBFbnZpcm9ubWVudChlbnZpcm9ubWVudCwgdGhpcy5wcm9wcy5zZGtQcm92aWRlciwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSByZXN1bHQubm9PcFxuICAgICAgICAgID8gJyDinIUgIEVudmlyb25tZW50ICVzIGJvb3RzdHJhcHBlZCAobm8gY2hhbmdlcykuJ1xuICAgICAgICAgIDogJyDinIUgIEVudmlyb25tZW50ICVzIGJvb3RzdHJhcHBlZC4nO1xuICAgICAgICBzdWNjZXNzKG1lc3NhZ2UsIGNoYWxrLmJsdWUoZW52aXJvbm1lbnQubmFtZSkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvcignIOKdjCAgRW52aXJvbm1lbnQgJXMgZmFpbGVkIGJvb3RzdHJhcHBpbmc6ICVzJywgY2hhbGsuYmx1ZShlbnZpcm9ubWVudC5uYW1lKSwgZSk7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfSkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHYXJiYWdlIGNvbGxlY3RzIGFzc2V0cyBmcm9tIGEgQ0RLIGFwcCdzIGVudmlyb25tZW50XG4gICAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgZm9yIEdhcmJhZ2UgQ29sbGVjdGlvblxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdhcmJhZ2VDb2xsZWN0KHVzZXJFbnZpcm9ubWVudFNwZWNzOiBzdHJpbmdbXSwgb3B0aW9uczogR2FyYmFnZUNvbGxlY3Rpb25PcHRpb25zKSB7XG4gICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXdhaXQgdGhpcy5kZWZpbmVFbnZpcm9ubWVudHModXNlckVudmlyb25tZW50U3BlY3MpO1xuXG4gICAgZm9yIChjb25zdCBlbnZpcm9ubWVudCBvZiBlbnZpcm9ubWVudHMpIHtcbiAgICAgIHN1Y2Nlc3MoJyDij7MgIEdhcmJhZ2UgQ29sbGVjdGluZyBlbnZpcm9ubWVudCAlcy4uLicsIGNoYWxrLmJsdWUoZW52aXJvbm1lbnQubmFtZSkpO1xuICAgICAgY29uc3QgZ2MgPSBuZXcgR2FyYmFnZUNvbGxlY3Rvcih7XG4gICAgICAgIHNka1Byb3ZpZGVyOiB0aGlzLnByb3BzLnNka1Byb3ZpZGVyLFxuICAgICAgICByZXNvbHZlZEVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcbiAgICAgICAgYm9vdHN0cmFwU3RhY2tOYW1lOiBvcHRpb25zLmJvb3RzdHJhcFN0YWNrTmFtZSxcbiAgICAgICAgcm9sbGJhY2tCdWZmZXJEYXlzOiBvcHRpb25zLnJvbGxiYWNrQnVmZmVyRGF5cyxcbiAgICAgICAgY3JlYXRlZEJ1ZmZlckRheXM6IG9wdGlvbnMuY3JlYXRlZEJ1ZmZlckRheXMsXG4gICAgICAgIGFjdGlvbjogb3B0aW9ucy5hY3Rpb24gPz8gJ2Z1bGwnLFxuICAgICAgICB0eXBlOiBvcHRpb25zLnR5cGUgPz8gJ2FsbCcsXG4gICAgICAgIGNvbmZpcm06IG9wdGlvbnMuY29uZmlybSA/PyB0cnVlLFxuICAgICAgfSk7XG4gICAgICBhd2FpdCBnYy5nYXJiYWdlQ29sbGVjdCgpO1xuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGRlZmluZUVudmlyb25tZW50cyh1c2VyRW52aXJvbm1lbnRTcGVjczogc3RyaW5nW10pOiBQcm9taXNlPGN4YXBpLkVudmlyb25tZW50W10+IHtcbiAgICAvLyBCeSBkZWZhdWx0LCBnbG9iIGZvciBldmVyeXRoaW5nXG4gICAgY29uc3QgZW52aXJvbm1lbnRTcGVjcyA9IHVzZXJFbnZpcm9ubWVudFNwZWNzLmxlbmd0aCA+IDAgPyBbLi4udXNlckVudmlyb25tZW50U3BlY3NdIDogWycqKiddO1xuXG4gICAgLy8gUGFydGl0aW9uIGludG8gZ2xvYnMgYW5kIG5vbi1nbG9icyAodGhpcyB3aWxsIG11dGF0ZSBlbnZpcm9ubWVudFNwZWNzKS5cbiAgICBjb25zdCBnbG9iU3BlY3MgPSBwYXJ0aXRpb24oZW52aXJvbm1lbnRTcGVjcywgbG9va3NMaWtlR2xvYik7XG4gICAgaWYgKGdsb2JTcGVjcy5sZW5ndGggPiAwICYmICF0aGlzLnByb3BzLmNsb3VkRXhlY3V0YWJsZS5oYXNBcHApIHtcbiAgICAgIGlmICh1c2VyRW52aXJvbm1lbnRTcGVjcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIFVzZXIgZGlkIHJlcXVlc3QgdGhpcyBnbG9iXG4gICAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoXG4gICAgICAgICAgYCcke2dsb2JTcGVjc30nIGlzIG5vdCBhbiBlbnZpcm9ubWVudCBuYW1lLiBTcGVjaWZ5IGFuIGVudmlyb25tZW50IG5hbWUgbGlrZSAnYXdzOi8vMTIzNDU2Nzg5MDEyL3VzLWVhc3QtMScsIG9yIHJ1biBpbiBhIGRpcmVjdG9yeSB3aXRoICdjZGsuanNvbicgdG8gdXNlIHdpbGRjYXJkcy5gLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVXNlciBkaWQgbm90IHJlcXVlc3QgYW55dGhpbmdcbiAgICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihcbiAgICAgICAgICBcIlNwZWNpZnkgYW4gZW52aXJvbm1lbnQgbmFtZSBsaWtlICdhd3M6Ly8xMjM0NTY3ODkwMTIvdXMtZWFzdC0xJywgb3IgcnVuIGluIGEgZGlyZWN0b3J5IHdpdGggJ2Nkay5qc29uJy5cIixcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBlbnZpcm9ubWVudHM6IGN4YXBpLkVudmlyb25tZW50W10gPSBbLi4uZW52aXJvbm1lbnRzRnJvbURlc2NyaXB0b3JzKGVudmlyb25tZW50U3BlY3MpXTtcblxuICAgIC8vIElmIHRoZXJlIGlzIGFuICctLWFwcCcgYXJndW1lbnQsIHNlbGVjdCB0aGUgZW52aXJvbm1lbnRzIGZyb20gdGhlIGFwcC5cbiAgICBpZiAodGhpcy5wcm9wcy5jbG91ZEV4ZWN1dGFibGUuaGFzQXBwKSB7XG4gICAgICBlbnZpcm9ubWVudHMucHVzaChcbiAgICAgICAgLi4uKGF3YWl0IGdsb2JFbnZpcm9ubWVudHNGcm9tU3RhY2tzKGF3YWl0IHRoaXMuc2VsZWN0U3RhY2tzRm9yTGlzdChbXSksIGdsb2JTcGVjcywgdGhpcy5wcm9wcy5zZGtQcm92aWRlcikpLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW52aXJvbm1lbnRzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1pZ3JhdGVzIGEgQ2xvdWRGb3JtYXRpb24gc3RhY2svdGVtcGxhdGUgdG8gYSBDREsgYXBwXG4gICAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgZm9yIENESyBhcHAgY3JlYXRpb25cbiAgICovXG4gIHB1YmxpYyBhc3luYyBtaWdyYXRlKG9wdGlvbnM6IE1pZ3JhdGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgd2FybmluZygnVGhpcyBjb21tYW5kIGlzIGFuIGV4cGVyaW1lbnRhbCBmZWF0dXJlLicpO1xuICAgIGNvbnN0IGxhbmd1YWdlID0gb3B0aW9ucy5sYW5ndWFnZT8udG9Mb3dlckNhc2UoKSA/PyAndHlwZXNjcmlwdCc7XG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBzZXRFbnZpcm9ubWVudChvcHRpb25zLmFjY291bnQsIG9wdGlvbnMucmVnaW9uKTtcbiAgICBsZXQgZ2VuZXJhdGVUZW1wbGF0ZU91dHB1dDogR2VuZXJhdGVUZW1wbGF0ZU91dHB1dCB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY2ZuOiBDZm5UZW1wbGF0ZUdlbmVyYXRvclByb3ZpZGVyIHwgdW5kZWZpbmVkO1xuICAgIGxldCB0ZW1wbGF0ZVRvRGVsZXRlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICB0cnkge1xuICAgICAgLy8gaWYgbmVpdGhlciBmcm9tUGF0aCBub3IgZnJvbVN0YWNrIGlzIHByb3ZpZGVkLCBnZW5lcmF0ZSBhIHRlbXBsYXRlIHVzaW5nIGNsb3VkZm9ybWF0aW9uXG4gICAgICBjb25zdCBzY2FuVHlwZSA9IHBhcnNlU291cmNlT3B0aW9ucyhvcHRpb25zLmZyb21QYXRoLCBvcHRpb25zLmZyb21TdGFjaywgb3B0aW9ucy5zdGFja05hbWUpLnNvdXJjZTtcbiAgICAgIGlmIChzY2FuVHlwZSA9PSBUZW1wbGF0ZVNvdXJjZU9wdGlvbnMuU0NBTikge1xuICAgICAgICBnZW5lcmF0ZVRlbXBsYXRlT3V0cHV0ID0gYXdhaXQgZ2VuZXJhdGVUZW1wbGF0ZSh7XG4gICAgICAgICAgc3RhY2tOYW1lOiBvcHRpb25zLnN0YWNrTmFtZSxcbiAgICAgICAgICBmaWx0ZXJzOiBvcHRpb25zLmZpbHRlcixcbiAgICAgICAgICBmcm9tU2Nhbjogb3B0aW9ucy5mcm9tU2NhbixcbiAgICAgICAgICBzZGtQcm92aWRlcjogdGhpcy5wcm9wcy5zZGtQcm92aWRlcixcbiAgICAgICAgICBlbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXG4gICAgICAgIH0pO1xuICAgICAgICB0ZW1wbGF0ZVRvRGVsZXRlID0gZ2VuZXJhdGVUZW1wbGF0ZU91dHB1dC50ZW1wbGF0ZUlkO1xuICAgICAgfSBlbHNlIGlmIChzY2FuVHlwZSA9PSBUZW1wbGF0ZVNvdXJjZU9wdGlvbnMuUEFUSCkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZUJvZHkgPSByZWFkRnJvbVBhdGgob3B0aW9ucy5mcm9tUGF0aCEpO1xuXG4gICAgICAgIGNvbnN0IHBhcnNlZFRlbXBsYXRlID0gZGVzZXJpYWxpemVTdHJ1Y3R1cmUodGVtcGxhdGVCb2R5KTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVJZCA9IHBhcnNlZFRlbXBsYXRlLk1ldGFkYXRhPy5UZW1wbGF0ZUlkPy50b1N0cmluZygpO1xuICAgICAgICBpZiAodGVtcGxhdGVJZCkge1xuICAgICAgICAgIC8vIGlmIHdlIGhhdmUgYSB0ZW1wbGF0ZSBpZCwgd2UgY2FuIGNhbGwgZGVzY3JpYmUgZ2VuZXJhdGVkIHRlbXBsYXRlIHRvIGdldCB0aGUgcmVzb3VyY2UgaWRlbnRpZmllcnNcbiAgICAgICAgICAvLyByZXNvdXJjZSBtZXRhZGF0YSwgYW5kIHRlbXBsYXRlIHNvdXJjZSB0byBnZW5lcmF0ZSB0aGUgdGVtcGxhdGVcbiAgICAgICAgICBjZm4gPSBuZXcgQ2ZuVGVtcGxhdGVHZW5lcmF0b3JQcm92aWRlcihhd2FpdCBidWlsZENmbkNsaWVudCh0aGlzLnByb3BzLnNka1Byb3ZpZGVyLCBlbnZpcm9ubWVudCkpO1xuICAgICAgICAgIGNvbnN0IGdlbmVyYXRlZFRlbXBsYXRlU3VtbWFyeSA9IGF3YWl0IGNmbi5kZXNjcmliZUdlbmVyYXRlZFRlbXBsYXRlKHRlbXBsYXRlSWQpO1xuICAgICAgICAgIGdlbmVyYXRlVGVtcGxhdGVPdXRwdXQgPSBidWlsZEdlbmVydGVkVGVtcGxhdGVPdXRwdXQoXG4gICAgICAgICAgICBnZW5lcmF0ZWRUZW1wbGF0ZVN1bW1hcnksXG4gICAgICAgICAgICB0ZW1wbGF0ZUJvZHksXG4gICAgICAgICAgICBnZW5lcmF0ZWRUZW1wbGF0ZVN1bW1hcnkuR2VuZXJhdGVkVGVtcGxhdGVJZCEsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBnZW5lcmF0ZVRlbXBsYXRlT3V0cHV0ID0ge1xuICAgICAgICAgICAgbWlncmF0ZUpzb246IHtcbiAgICAgICAgICAgICAgdGVtcGxhdGVCb2R5OiB0ZW1wbGF0ZUJvZHksXG4gICAgICAgICAgICAgIHNvdXJjZTogJ2xvY2FsZmlsZScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc2NhblR5cGUgPT0gVGVtcGxhdGVTb3VyY2VPcHRpb25zLlNUQUNLKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gYXdhaXQgcmVhZEZyb21TdGFjayhvcHRpb25zLnN0YWNrTmFtZSwgdGhpcy5wcm9wcy5zZGtQcm92aWRlciwgZW52aXJvbm1lbnQpO1xuICAgICAgICBpZiAoIXRlbXBsYXRlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihgTm8gdGVtcGxhdGUgZm91bmQgZm9yIHN0YWNrLW5hbWU6ICR7b3B0aW9ucy5zdGFja05hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgZ2VuZXJhdGVUZW1wbGF0ZU91dHB1dCA9IHtcbiAgICAgICAgICBtaWdyYXRlSnNvbjoge1xuICAgICAgICAgICAgdGVtcGxhdGVCb2R5OiB0ZW1wbGF0ZSxcbiAgICAgICAgICAgIHNvdXJjZTogb3B0aW9ucy5zdGFja05hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdlIHNob3VsZG4ndCBldmVyIGdldCBoZXJlLCBidXQganVzdCBpbiBjYXNlLlxuICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBJbnZhbGlkIHNvdXJjZSBvcHRpb24gcHJvdmlkZWQ6ICR7c2NhblR5cGV9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBzdGFjayA9IGdlbmVyYXRlU3RhY2soZ2VuZXJhdGVUZW1wbGF0ZU91dHB1dC5taWdyYXRlSnNvbi50ZW1wbGF0ZUJvZHksIG9wdGlvbnMuc3RhY2tOYW1lLCBsYW5ndWFnZSk7XG4gICAgICBzdWNjZXNzKCcg4o+zICBHZW5lcmF0aW5nIENESyBhcHAgZm9yICVzLi4uJywgY2hhbGsuYmx1ZShvcHRpb25zLnN0YWNrTmFtZSkpO1xuICAgICAgYXdhaXQgZ2VuZXJhdGVDZGtBcHAob3B0aW9ucy5zdGFja05hbWUsIHN0YWNrISwgbGFuZ3VhZ2UsIG9wdGlvbnMub3V0cHV0UGF0aCwgb3B0aW9ucy5jb21wcmVzcyk7XG4gICAgICBpZiAoZ2VuZXJhdGVUZW1wbGF0ZU91dHB1dCkge1xuICAgICAgICB3cml0ZU1pZ3JhdGVKc29uRmlsZShvcHRpb25zLm91dHB1dFBhdGgsIG9wdGlvbnMuc3RhY2tOYW1lLCBnZW5lcmF0ZVRlbXBsYXRlT3V0cHV0Lm1pZ3JhdGVKc29uKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc1RoZXJlQVdhcm5pbmcoZ2VuZXJhdGVUZW1wbGF0ZU91dHB1dCkpIHtcbiAgICAgICAgd2FybmluZyhcbiAgICAgICAgICAnIOKaoO+4jyAgU29tZSByZXNvdXJjZXMgY291bGQgbm90IGJlIG1pZ3JhdGVkIGNvbXBsZXRlbHkuIFBsZWFzZSByZXZpZXcgdGhlIFJFQURNRS5tZCBmaWxlIGZvciBtb3JlIGluZm9ybWF0aW9uLicsXG4gICAgICAgICk7XG4gICAgICAgIGFwcGVuZFdhcm5pbmdzVG9SZWFkbWUoXG4gICAgICAgICAgYCR7cGF0aC5qb2luKG9wdGlvbnMub3V0cHV0UGF0aCA/PyBwcm9jZXNzLmN3ZCgpLCBvcHRpb25zLnN0YWNrTmFtZSl9L1JFQURNRS5tZGAsXG4gICAgICAgICAgZ2VuZXJhdGVUZW1wbGF0ZU91dHB1dC5yZXNvdXJjZXMhLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGVycm9yKCcg4p2MICBNaWdyYXRlIGZhaWxlZCBmb3IgYCVzYDogJXMnLCBvcHRpb25zLnN0YWNrTmFtZSwgKGUgYXMgRXJyb3IpLm1lc3NhZ2UpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKHRlbXBsYXRlVG9EZWxldGUpIHtcbiAgICAgICAgaWYgKCFjZm4pIHtcbiAgICAgICAgICBjZm4gPSBuZXcgQ2ZuVGVtcGxhdGVHZW5lcmF0b3JQcm92aWRlcihhd2FpdCBidWlsZENmbkNsaWVudCh0aGlzLnByb3BzLnNka1Byb3ZpZGVyLCBlbnZpcm9ubWVudCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcHJvY2Vzcy5lbnYuTUlHUkFURV9JTlRFR19URVNUKSB7XG4gICAgICAgICAgYXdhaXQgY2ZuLmRlbGV0ZUdlbmVyYXRlZFRlbXBsYXRlKHRlbXBsYXRlVG9EZWxldGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzZWxlY3RTdGFja3NGb3JMaXN0KHBhdHRlcm5zOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IGFzc2VtYmx5ID0gYXdhaXQgdGhpcy5hc3NlbWJseSgpO1xuICAgIGNvbnN0IHN0YWNrcyA9IGF3YWl0IGFzc2VtYmx5LnNlbGVjdFN0YWNrcyh7IHBhdHRlcm5zIH0sIHsgZGVmYXVsdEJlaGF2aW9yOiBEZWZhdWx0U2VsZWN0aW9uLkFsbFN0YWNrcyB9KTtcblxuICAgIC8vIE5vIHZhbGlkYXRpb25cblxuICAgIHJldHVybiBzdGFja3M7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNlbGVjdFN0YWNrc0ZvckRlcGxveShcbiAgICBzZWxlY3RvcjogU3RhY2tTZWxlY3RvcixcbiAgICBleGNsdXNpdmVseT86IGJvb2xlYW4sXG4gICAgY2FjaGVDbG91ZEFzc2VtYmx5PzogYm9vbGVhbixcbiAgICBpZ25vcmVOb1N0YWNrcz86IGJvb2xlYW4sXG4gICk6IFByb21pc2U8U3RhY2tDb2xsZWN0aW9uPiB7XG4gICAgY29uc3QgYXNzZW1ibHkgPSBhd2FpdCB0aGlzLmFzc2VtYmx5KGNhY2hlQ2xvdWRBc3NlbWJseSk7XG4gICAgY29uc3Qgc3RhY2tzID0gYXdhaXQgYXNzZW1ibHkuc2VsZWN0U3RhY2tzKHNlbGVjdG9yLCB7XG4gICAgICBleHRlbmQ6IGV4Y2x1c2l2ZWx5ID8gRXh0ZW5kZWRTdGFja1NlbGVjdGlvbi5Ob25lIDogRXh0ZW5kZWRTdGFja1NlbGVjdGlvbi5VcHN0cmVhbSxcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjogRGVmYXVsdFNlbGVjdGlvbi5Pbmx5U2luZ2xlLFxuICAgICAgaWdub3JlTm9TdGFja3MsXG4gICAgfSk7XG5cbiAgICB0aGlzLnZhbGlkYXRlU3RhY2tzU2VsZWN0ZWQoc3RhY2tzLCBzZWxlY3Rvci5wYXR0ZXJucyk7XG4gICAgdGhpcy52YWxpZGF0ZVN0YWNrcyhzdGFja3MpO1xuXG4gICAgcmV0dXJuIHN0YWNrcztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2VsZWN0U3RhY2tzRm9yRGlmZihcbiAgICBzdGFja05hbWVzOiBzdHJpbmdbXSxcbiAgICBleGNsdXNpdmVseT86IGJvb2xlYW4sXG4gICAgYXV0b1ZhbGlkYXRlPzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxTdGFja0NvbGxlY3Rpb24+IHtcbiAgICBjb25zdCBhc3NlbWJseSA9IGF3YWl0IHRoaXMuYXNzZW1ibHkoKTtcblxuICAgIGNvbnN0IHNlbGVjdGVkRm9yRGlmZiA9IGF3YWl0IGFzc2VtYmx5LnNlbGVjdFN0YWNrcyhcbiAgICAgIHsgcGF0dGVybnM6IHN0YWNrTmFtZXMgfSxcbiAgICAgIHtcbiAgICAgICAgZXh0ZW5kOiBleGNsdXNpdmVseSA/IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24uTm9uZSA6IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24uVXBzdHJlYW0sXG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjogRGVmYXVsdFNlbGVjdGlvbi5NYWluQXNzZW1ibHksXG4gICAgICB9LFxuICAgICk7XG5cbiAgICBjb25zdCBhbGxTdGFja3MgPSBhd2FpdCB0aGlzLnNlbGVjdFN0YWNrc0Zvckxpc3QoW10pO1xuICAgIGNvbnN0IGF1dG9WYWxpZGF0ZVN0YWNrcyA9IGF1dG9WYWxpZGF0ZVxuICAgICAgPyBhbGxTdGFja3MuZmlsdGVyKChhcnQpID0+IGFydC52YWxpZGF0ZU9uU3ludGggPz8gZmFsc2UpXG4gICAgICA6IG5ldyBTdGFja0NvbGxlY3Rpb24oYXNzZW1ibHksIFtdKTtcblxuICAgIHRoaXMudmFsaWRhdGVTdGFja3NTZWxlY3RlZChzZWxlY3RlZEZvckRpZmYuY29uY2F0KGF1dG9WYWxpZGF0ZVN0YWNrcyksIHN0YWNrTmFtZXMpO1xuICAgIHRoaXMudmFsaWRhdGVTdGFja3Moc2VsZWN0ZWRGb3JEaWZmLmNvbmNhdChhdXRvVmFsaWRhdGVTdGFja3MpKTtcblxuICAgIHJldHVybiBzZWxlY3RlZEZvckRpZmY7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNlbGVjdFN0YWNrc0ZvckRlc3Ryb3koc2VsZWN0b3I6IFN0YWNrU2VsZWN0b3IsIGV4Y2x1c2l2ZWx5PzogYm9vbGVhbikge1xuICAgIGNvbnN0IGFzc2VtYmx5ID0gYXdhaXQgdGhpcy5hc3NlbWJseSgpO1xuICAgIGNvbnN0IHN0YWNrcyA9IGF3YWl0IGFzc2VtYmx5LnNlbGVjdFN0YWNrcyhzZWxlY3Rvciwge1xuICAgICAgZXh0ZW5kOiBleGNsdXNpdmVseSA/IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24uTm9uZSA6IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24uRG93bnN0cmVhbSxcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjogRGVmYXVsdFNlbGVjdGlvbi5Pbmx5U2luZ2xlLFxuICAgIH0pO1xuXG4gICAgLy8gTm8gdmFsaWRhdGlvblxuXG4gICAgcmV0dXJuIHN0YWNrcztcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSB0aGUgc3RhY2tzIGZvciBlcnJvcnMgYW5kIHdhcm5pbmdzIGFjY29yZGluZyB0byB0aGUgQ0xJJ3MgY3VycmVudCBzZXR0aW5nc1xuICAgKi9cbiAgcHJpdmF0ZSB2YWxpZGF0ZVN0YWNrcyhzdGFja3M6IFN0YWNrQ29sbGVjdGlvbikge1xuICAgIHN0YWNrcy5wcm9jZXNzTWV0YWRhdGFNZXNzYWdlcyh7XG4gICAgICBpZ25vcmVFcnJvcnM6IHRoaXMucHJvcHMuaWdub3JlRXJyb3JzLFxuICAgICAgc3RyaWN0OiB0aGlzLnByb3BzLnN0cmljdCxcbiAgICAgIHZlcmJvc2U6IHRoaXMucHJvcHMudmVyYm9zZSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSB0aGF0IGlmIGEgdXNlciBzcGVjaWZpZWQgYSBzdGFjayBuYW1lIHRoZXJlIGV4aXN0cyBhdCBsZWFzdCAxIHN0YWNrIHNlbGVjdGVkXG4gICAqL1xuICBwcml2YXRlIHZhbGlkYXRlU3RhY2tzU2VsZWN0ZWQoc3RhY2tzOiBTdGFja0NvbGxlY3Rpb24sIHN0YWNrTmFtZXM6IHN0cmluZ1tdKSB7XG4gICAgaWYgKHN0YWNrTmFtZXMubGVuZ3RoICE9IDAgJiYgc3RhY2tzLnN0YWNrQ291bnQgPT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihgTm8gc3RhY2tzIG1hdGNoIHRoZSBuYW1lKHMpICR7c3RhY2tOYW1lc31gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2VsZWN0IGEgc2luZ2xlIHN0YWNrIGJ5IGl0cyBuYW1lXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHNlbGVjdFNpbmdsZVN0YWNrQnlOYW1lKHN0YWNrTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgYXNzZW1ibHkgPSBhd2FpdCB0aGlzLmFzc2VtYmx5KCk7XG5cbiAgICBjb25zdCBzdGFja3MgPSBhd2FpdCBhc3NlbWJseS5zZWxlY3RTdGFja3MoXG4gICAgICB7IHBhdHRlcm5zOiBbc3RhY2tOYW1lXSB9LFxuICAgICAge1xuICAgICAgICBleHRlbmQ6IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24uTm9uZSxcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiBEZWZhdWx0U2VsZWN0aW9uLk5vbmUsXG4gICAgICB9LFxuICAgICk7XG5cbiAgICAvLyBDb3VsZCBoYXZlIGJlZW4gYSBnbG9iIHNvIGNoZWNrIHRoYXQgd2UgZXZhbHVhdGVkIHRvIGV4YWN0bHkgb25lXG4gICAgaWYgKHN0YWNrcy5zdGFja0NvdW50ID4gMSkge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihgVGhpcyBjb21tYW5kIHJlcXVpcmVzIGV4YWN0bHkgb25lIHN0YWNrIGFuZCB3ZSBtYXRjaGVkIG1vcmUgdGhhbiBvbmU6ICR7c3RhY2tzLnN0YWNrSWRzfWApO1xuICAgIH1cblxuICAgIHJldHVybiBhc3NlbWJseS5zdGFja0J5SWQoc3RhY2tzLmZpcnN0U3RhY2suaWQpO1xuICB9XG5cbiAgcHVibGljIGFzc2VtYmx5KGNhY2hlQ2xvdWRBc3NlbWJseT86IGJvb2xlYW4pOiBQcm9taXNlPENsb3VkQXNzZW1ibHk+IHtcbiAgICByZXR1cm4gdGhpcy5wcm9wcy5jbG91ZEV4ZWN1dGFibGUuc3ludGhlc2l6ZShjYWNoZUNsb3VkQXNzZW1ibHkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwYXR0ZXJuc0FycmF5Rm9yV2F0Y2goXG4gICAgcGF0dGVybnM6IHN0cmluZyB8IHN0cmluZ1tdIHwgdW5kZWZpbmVkLFxuICAgIG9wdGlvbnM6IHsgcm9vdERpcjogc3RyaW5nOyByZXR1cm5Sb290RGlySWZFbXB0eTogYm9vbGVhbiB9LFxuICApOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgcGF0dGVybnNBcnJheTogc3RyaW5nW10gPSBwYXR0ZXJucyAhPT0gdW5kZWZpbmVkID8gKEFycmF5LmlzQXJyYXkocGF0dGVybnMpID8gcGF0dGVybnMgOiBbcGF0dGVybnNdKSA6IFtdO1xuICAgIHJldHVybiBwYXR0ZXJuc0FycmF5Lmxlbmd0aCA+IDAgPyBwYXR0ZXJuc0FycmF5IDogb3B0aW9ucy5yZXR1cm5Sb290RGlySWZFbXB0eSA/IFtvcHRpb25zLnJvb3REaXJdIDogW107XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGludm9rZURlcGxveUZyb21XYXRjaChcbiAgICBvcHRpb25zOiBXYXRjaE9wdGlvbnMsXG4gICAgY2xvdWRXYXRjaExvZ01vbml0b3I/OiBDbG91ZFdhdGNoTG9nRXZlbnRNb25pdG9yLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBkZXBsb3lPcHRpb25zOiBEZXBsb3lPcHRpb25zID0ge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIHJlcXVpcmVBcHByb3ZhbDogUmVxdWlyZUFwcHJvdmFsLk5ldmVyLFxuICAgICAgLy8gaWYgJ3dhdGNoJyBpcyBjYWxsZWQgYnkgaW52b2tpbmcgJ2NkayBkZXBsb3kgLS13YXRjaCcsXG4gICAgICAvLyB3ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0byBub3QgY2FsbCAnZGVwbG95JyB3aXRoICd3YXRjaCcgYWdhaW4sXG4gICAgICAvLyBhcyB0aGF0IHdvdWxkIGxlYWQgdG8gYSBjeWNsZVxuICAgICAgd2F0Y2g6IGZhbHNlLFxuICAgICAgY2xvdWRXYXRjaExvZ01vbml0b3IsXG4gICAgICBjYWNoZUNsb3VkQXNzZW1ibHk6IGZhbHNlLFxuICAgICAgaG90c3dhcDogb3B0aW9ucy5ob3Rzd2FwLFxuICAgICAgZXh0cmFVc2VyQWdlbnQ6IGBjZGstd2F0Y2gvaG90c3dhcC0ke29wdGlvbnMuaG90c3dhcCAhPT0gSG90c3dhcE1vZGUuRkFMTF9CQUNLID8gJ29uJyA6ICdvZmYnfWAsXG4gICAgICBjb25jdXJyZW5jeTogb3B0aW9ucy5jb25jdXJyZW5jeSxcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuZGVwbG95KGRlcGxveU9wdGlvbnMpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8ganVzdCBjb250aW51ZSAtIGRlcGxveSB3aWxsIHNob3cgdGhlIGVycm9yXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgYXNzZXQgcHVibGlzaGluZyBhbmQgYnVpbGRpbmcgZnJvbSB0aGUgd29yayBncmFwaCBmb3IgYXNzZXRzIHRoYXQgYXJlIGFscmVhZHkgaW4gcGxhY2VcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVtb3ZlUHVibGlzaGVkQXNzZXRzKGdyYXBoOiBXb3JrR3JhcGgsIG9wdGlvbnM6IERlcGxveU9wdGlvbnMpIHtcbiAgICBhd2FpdCBncmFwaC5yZW1vdmVVbm5lY2Vzc2FyeUFzc2V0cyhhc3NldE5vZGUgPT4gdGhpcy5wcm9wcy5kZXBsb3ltZW50cy5pc1NpbmdsZUFzc2V0UHVibGlzaGVkKGFzc2V0Tm9kZS5hc3NldE1hbmlmZXN0LCBhc3NldE5vZGUuYXNzZXQsIHtcbiAgICAgIHN0YWNrOiBhc3NldE5vZGUucGFyZW50U3RhY2ssXG4gICAgICByb2xlQXJuOiBvcHRpb25zLnJvbGVBcm4sXG4gICAgICBzdGFja05hbWU6IGFzc2V0Tm9kZS5wYXJlbnRTdGFjay5zdGFja05hbWUsXG4gICAgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0byBzZWUgaWYgYSBtaWdyYXRlLmpzb24gZmlsZSBleGlzdHMuIElmIGl0IGRvZXMgYW5kIHRoZSBzb3VyY2UgaXMgZWl0aGVyIGBmaWxlcGF0aGAgb3JcbiAgICogaXMgaW4gdGhlIHNhbWUgZW52aXJvbm1lbnQgYXMgdGhlIHN0YWNrIGRlcGxveW1lbnQsIGEgbmV3IHN0YWNrIGlzIGNyZWF0ZWQgYW5kIHRoZSByZXNvdXJjZXMgYXJlXG4gICAqIG1pZ3JhdGVkIHRvIHRoZSBzdGFjayB1c2luZyBhbiBJTVBPUlQgY2hhbmdlc2V0LiBUaGUgbm9ybWFsIGRlcGxveW1lbnQgd2lsbCByZXN1bWUgYWZ0ZXIgdGhpcyBpcyBjb21wbGV0ZVxuICAgKiB0byBhZGQgYmFjayBpbiBhbnkgb3V0cHV0cyBhbmQgdGhlIENES01ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyB0cnlNaWdyYXRlUmVzb3VyY2VzKHN0YWNrczogU3RhY2tDb2xsZWN0aW9uLCBvcHRpb25zOiBEZXBsb3lPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgc3RhY2sgPSBzdGFja3Muc3RhY2tBcnRpZmFjdHNbMF07XG4gICAgY29uc3QgbWlncmF0ZURlcGxveW1lbnQgPSBuZXcgUmVzb3VyY2VJbXBvcnRlcihzdGFjaywgdGhpcy5wcm9wcy5kZXBsb3ltZW50cyk7XG4gICAgY29uc3QgcmVzb3VyY2VzVG9JbXBvcnQgPSBhd2FpdCB0aGlzLnRyeUdldFJlc291cmNlcyhhd2FpdCBtaWdyYXRlRGVwbG95bWVudC5yZXNvbHZlRW52aXJvbm1lbnQoKSk7XG5cbiAgICBpZiAocmVzb3VyY2VzVG9JbXBvcnQpIHtcbiAgICAgIHByaW50KCclczogY3JlYXRpbmcgc3RhY2sgZm9yIHJlc291cmNlIG1pZ3JhdGlvbi4uLicsIGNoYWxrLmJvbGQoc3RhY2suZGlzcGxheU5hbWUpKTtcbiAgICAgIHByaW50KCclczogaW1wb3J0aW5nIHJlc291cmNlcyBpbnRvIHN0YWNrLi4uJywgY2hhbGsuYm9sZChzdGFjay5kaXNwbGF5TmFtZSkpO1xuXG4gICAgICBhd2FpdCB0aGlzLnBlcmZvcm1SZXNvdXJjZU1pZ3JhdGlvbihtaWdyYXRlRGVwbG95bWVudCwgcmVzb3VyY2VzVG9JbXBvcnQsIG9wdGlvbnMpO1xuXG4gICAgICBmcy5ybVN5bmMoJ21pZ3JhdGUuanNvbicpO1xuICAgICAgcHJpbnQoJyVzOiBhcHBseWluZyBDREtNZXRhZGF0YSBhbmQgT3V0cHV0cyB0byBzdGFjayAoaWYgYXBwbGljYWJsZSkuLi4nLCBjaGFsay5ib2xkKHN0YWNrLmRpc3BsYXlOYW1lKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgc3RhY2sgd2l0aCBqdXN0IHRoZSByZXNvdXJjZXMgdG8gYmUgbWlncmF0ZWRcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcGVyZm9ybVJlc291cmNlTWlncmF0aW9uKFxuICAgIG1pZ3JhdGVEZXBsb3ltZW50OiBSZXNvdXJjZUltcG9ydGVyLFxuICAgIHJlc291cmNlc1RvSW1wb3J0OiBSZXNvdXJjZXNUb0ltcG9ydCxcbiAgICBvcHRpb25zOiBEZXBsb3lPcHRpb25zLFxuICApIHtcbiAgICBjb25zdCBzdGFydERlcGxveVRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsZXQgZWxhcHNlZERlcGxveVRpbWUgPSAwO1xuXG4gICAgLy8gSW5pdGlhbCBEZXBsb3ltZW50XG4gICAgYXdhaXQgbWlncmF0ZURlcGxveW1lbnQuaW1wb3J0UmVzb3VyY2VzRnJvbU1pZ3JhdGUocmVzb3VyY2VzVG9JbXBvcnQsIHtcbiAgICAgIHJvbGVBcm46IG9wdGlvbnMucm9sZUFybixcbiAgICAgIHRvb2xraXRTdGFja05hbWU6IG9wdGlvbnMudG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgIGRlcGxveW1lbnRNZXRob2Q6IG9wdGlvbnMuZGVwbG95bWVudE1ldGhvZCxcbiAgICAgIHVzZVByZXZpb3VzUGFyYW1ldGVyczogdHJ1ZSxcbiAgICAgIHByb2dyZXNzOiBvcHRpb25zLnByb2dyZXNzLFxuICAgICAgcm9sbGJhY2s6IG9wdGlvbnMucm9sbGJhY2ssXG4gICAgfSk7XG5cbiAgICBlbGFwc2VkRGVwbG95VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnREZXBsb3lUaW1lO1xuICAgIHByaW50KCdcXG7inKggIFJlc291cmNlIG1pZ3JhdGlvbiB0aW1lOiAlc3NcXG4nLCBmb3JtYXRUaW1lKGVsYXBzZWREZXBsb3lUaW1lKSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHRyeUdldFJlc291cmNlcyhlbnZpcm9ubWVudDogY3hhcGkuRW52aXJvbm1lbnQpOiBQcm9taXNlPFJlc291cmNlc1RvSW1wb3J0IHwgdW5kZWZpbmVkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1pZ3JhdGVGaWxlID0gZnMucmVhZEpzb25TeW5jKCdtaWdyYXRlLmpzb24nLCB7XG4gICAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBzb3VyY2VFbnYgPSAobWlncmF0ZUZpbGUuU291cmNlIGFzIHN0cmluZykuc3BsaXQoJzonKTtcbiAgICAgIGlmIChcbiAgICAgICAgc291cmNlRW52WzBdID09PSAnbG9jYWxmaWxlJyB8fFxuICAgICAgICAoc291cmNlRW52WzRdID09PSBlbnZpcm9ubWVudC5hY2NvdW50ICYmIHNvdXJjZUVudlszXSA9PT0gZW52aXJvbm1lbnQucmVnaW9uKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBtaWdyYXRlRmlsZS5SZXNvdXJjZXM7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gTm90aGluZyB0byBkb1xuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmludCBhIHNlcmlhbGl6ZWQgb2JqZWN0IChZQU1MIG9yIEpTT04pIHRvIHN0ZG91dC5cbiAqL1xuZnVuY3Rpb24gcHJpbnRTZXJpYWxpemVkT2JqZWN0KG9iajogYW55LCBqc29uOiBib29sZWFuKSB7XG4gIGRhdGEoc2VyaWFsaXplU3RydWN0dXJlKG9iaiwganNvbikpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpZmZPcHRpb25zIHtcbiAgLyoqXG4gICAqIFN0YWNrIG5hbWVzIHRvIGRpZmZcbiAgICovXG4gIHN0YWNrTmFtZXM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSB0b29sa2l0IHN0YWNrLCBpZiBub3QgdGhlIGRlZmF1bHQgbmFtZVxuICAgKlxuICAgKiBAZGVmYXVsdCAnQ0RLVG9vbGtpdCdcbiAgICovXG4gIHJlYWRvbmx5IHRvb2xraXRTdGFja05hbWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE9ubHkgc2VsZWN0IHRoZSBnaXZlbiBzdGFja1xuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZXhjbHVzaXZlbHk/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBVc2VkIGEgdGVtcGxhdGUgZnJvbSBkaXNrIGluc3RlYWQgb2YgZnJvbSB0aGUgc2VydmVyXG4gICAqXG4gICAqIEBkZWZhdWx0IFVzZSBmcm9tIHRoZSBzZXJ2ZXJcbiAgICovXG4gIHRlbXBsYXRlUGF0aD86IHN0cmluZztcblxuICAvKipcbiAgICogU3RyaWN0IGRpZmYgbW9kZVxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgc3RyaWN0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSG93IG1hbnkgbGluZXMgb2YgY29udGV4dCB0byBzaG93IGluIHRoZSBkaWZmXG4gICAqXG4gICAqIEBkZWZhdWx0IDNcbiAgICovXG4gIGNvbnRleHRMaW5lcz86IG51bWJlcjtcblxuICAvKipcbiAgICogV2hlcmUgdG8gd3JpdGUgdGhlIGRlZmF1bHRcbiAgICpcbiAgICogQGRlZmF1bHQgc3RkZXJyXG4gICAqL1xuICBzdHJlYW0/OiBOb2RlSlMuV3JpdGFibGVTdHJlYW07XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZmFpbCB3aXRoIGV4aXQgY29kZSAxIGluIGNhc2Ugb2YgZGlmZlxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZmFpbD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE9ubHkgcnVuIGRpZmYgb24gYnJvYWRlbmVkIHNlY3VyaXR5IGNoYW5nZXNcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHNlY3VyaXR5T25seT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcnVuIHRoZSBkaWZmIGFnYWluc3QgdGhlIHRlbXBsYXRlIGFmdGVyIHRoZSBDbG91ZEZvcm1hdGlvbiBUcmFuc2Zvcm1zIGluc2lkZSBpdCBoYXZlIGJlZW4gZXhlY3V0ZWRcbiAgICogKGFzIG9wcG9zZWQgdG8gdGhlIG9yaWdpbmFsIHRlbXBsYXRlLCB0aGUgZGVmYXVsdCwgd2hpY2ggY29udGFpbnMgdGhlIHVucHJvY2Vzc2VkIFRyYW5zZm9ybXMpLlxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgY29tcGFyZUFnYWluc3RQcm9jZXNzZWRUZW1wbGF0ZT86IGJvb2xlYW47XG5cbiAgLypcbiAgICogUnVuIGRpZmYgaW4gcXVpZXQgbW9kZSB3aXRob3V0IHByaW50aW5nIHRoZSBkaWZmIHN0YXR1c2VzXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBxdWlldD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBmb3IgQ2xvdWRGb3JtYXRpb24gYXQgZGlmZiB0aW1lLCB1c2VkIHRvIGNyZWF0ZSBhIGNoYW5nZSBzZXRcbiAgICogQGRlZmF1bHQge31cbiAgICovXG4gIHBhcmFtZXRlcnM/OiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQgfTtcblxuICAvKipcbiAgICogV2hldGhlciBvciBub3QgdG8gY3JlYXRlLCBhbmFseXplLCBhbmQgc3Vic2VxdWVudGx5IGRlbGV0ZSBhIGNoYW5nZXNldFxuICAgKlxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBjaGFuZ2VTZXQ/OiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgQ2ZuRGVwbG95T3B0aW9ucyB7XG4gIC8qKlxuICAgKiBDcml0ZXJpYSBmb3Igc2VsZWN0aW5nIHN0YWNrcyB0byBkZXBsb3lcbiAgICovXG4gIHNlbGVjdG9yOiBTdGFja1NlbGVjdG9yO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSB0b29sa2l0IHN0YWNrIHRvIHVzZS9kZXBsb3lcbiAgICpcbiAgICogQGRlZmF1bHQgQ0RLVG9vbGtpdFxuICAgKi9cbiAgdG9vbGtpdFN0YWNrTmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogUm9sZSB0byBwYXNzIHRvIENsb3VkRm9ybWF0aW9uIGZvciBkZXBsb3ltZW50XG4gICAqL1xuICByb2xlQXJuPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbCBuYW1lIHRvIHVzZSBmb3IgdGhlIENsb3VkRm9ybWF0aW9uIGNoYW5nZSBzZXQuXG4gICAqIElmIG5vdCBwcm92aWRlZCwgYSBuYW1lIHdpbGwgYmUgZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHkuXG4gICAqXG4gICAqIEBkZXByZWNhdGVkIFVzZSAnZGVwbG95bWVudE1ldGhvZCcgaW5zdGVhZFxuICAgKi9cbiAgY2hhbmdlU2V0TmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0byBleGVjdXRlIHRoZSBDaGFuZ2VTZXRcbiAgICogTm90IHByb3ZpZGluZyBgZXhlY3V0ZWAgcGFyYW1ldGVyIHdpbGwgcmVzdWx0IGluIGV4ZWN1dGlvbiBvZiBDaGFuZ2VTZXRcbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKiBAZGVwcmVjYXRlZCBVc2UgJ2RlcGxveW1lbnRNZXRob2QnIGluc3RlYWRcbiAgICovXG4gIGV4ZWN1dGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEZXBsb3ltZW50IG1ldGhvZFxuICAgKi9cbiAgcmVhZG9ubHkgZGVwbG95bWVudE1ldGhvZD86IERlcGxveW1lbnRNZXRob2Q7XG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbW9kZSBmb3Igc3RhY2sgZGVwbG95bWVudCBwcm9ncmVzcy5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBTdGFja0FjdGl2aXR5UHJvZ3Jlc3MuQmFyIC0gc3RhY2sgZXZlbnRzIHdpbGwgYmUgZGlzcGxheWVkIGZvclxuICAgKiAgIHRoZSByZXNvdXJjZSBjdXJyZW50bHkgYmVpbmcgZGVwbG95ZWQuXG4gICAqL1xuICBwcm9ncmVzcz86IFN0YWNrQWN0aXZpdHlQcm9ncmVzcztcblxuICAvKipcbiAgICogUm9sbGJhY2sgZmFpbGVkIGRlcGxveW1lbnRzXG4gICAqXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIHJlYWRvbmx5IHJvbGxiYWNrPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFdhdGNoT3B0aW9ucyBleHRlbmRzIE9taXQ8Q2ZuRGVwbG95T3B0aW9ucywgJ2V4ZWN1dGUnPiB7XG4gIC8qKlxuICAgKiBPbmx5IHNlbGVjdCB0aGUgZ2l2ZW4gc3RhY2tcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGV4Y2x1c2l2ZWx5PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmV1c2UgdGhlIGFzc2V0cyB3aXRoIHRoZSBnaXZlbiBhc3NldCBJRHNcbiAgICovXG4gIHJldXNlQXNzZXRzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEFsd2F5cyBkZXBsb3ksIGV2ZW4gaWYgdGVtcGxhdGVzIGFyZSBpZGVudGljYWwuXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBmb3JjZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcGVyZm9ybSBhICdob3Rzd2FwJyBkZXBsb3ltZW50LlxuICAgKiBBICdob3Rzd2FwJyBkZXBsb3ltZW50IHdpbGwgYXR0ZW1wdCB0byBzaG9ydC1jaXJjdWl0IENsb3VkRm9ybWF0aW9uXG4gICAqIGFuZCB1cGRhdGUgdGhlIGFmZmVjdGVkIHJlc291cmNlcyBsaWtlIExhbWJkYSBmdW5jdGlvbnMgZGlyZWN0bHkuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gYEhvdHN3YXBNb2RlLkZBTExfQkFDS2AgZm9yIHJlZ3VsYXIgZGVwbG95bWVudHMsIGBIb3Rzd2FwTW9kZS5IT1RTV0FQX09OTFlgIGZvciAnd2F0Y2gnIGRlcGxveW1lbnRzXG4gICAqL1xuICByZWFkb25seSBob3Rzd2FwOiBIb3Rzd2FwTW9kZTtcblxuICAvKipcbiAgICogVGhlIGV4dHJhIHN0cmluZyB0byBhcHBlbmQgdG8gdGhlIFVzZXItQWdlbnQgaGVhZGVyIHdoZW4gcGVyZm9ybWluZyBBV1MgU0RLIGNhbGxzLlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIG5vdGhpbmcgZXh0cmEgaXMgYXBwZW5kZWQgdG8gdGhlIFVzZXItQWdlbnQgaGVhZGVyXG4gICAqL1xuICByZWFkb25seSBleHRyYVVzZXJBZ2VudD86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0byBzaG93IENsb3VkV2F0Y2ggbG9ncyBmb3IgaG90c3dhcHBlZCByZXNvdXJjZXNcbiAgICogbG9jYWxseSBpbiB0aGUgdXNlcnMgdGVybWluYWxcbiAgICpcbiAgICogQGRlZmF1bHQgLSBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgdHJhY2VMb2dzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWF4aW11bSBudW1iZXIgb2Ygc2ltdWx0YW5lb3VzIGRlcGxveW1lbnRzIChkZXBlbmRlbmN5IHBlcm1pdHRpbmcpIHRvIGV4ZWN1dGUuXG4gICAqIFRoZSBkZWZhdWx0IGlzICcxJywgd2hpY2ggZXhlY3V0ZXMgYWxsIGRlcGxveW1lbnRzIHNlcmlhbGx5LlxuICAgKlxuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICByZWFkb25seSBjb25jdXJyZW5jeT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXBsb3lPcHRpb25zIGV4dGVuZHMgQ2ZuRGVwbG95T3B0aW9ucywgV2F0Y2hPcHRpb25zIHtcbiAgLyoqXG4gICAqIEFSTnMgb2YgU05TIHRvcGljcyB0aGF0IENsb3VkRm9ybWF0aW9uIHdpbGwgbm90aWZ5IHdpdGggc3RhY2sgcmVsYXRlZCBldmVudHNcbiAgICovXG4gIG5vdGlmaWNhdGlvbkFybnM/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogV2hhdCBraW5kIG9mIHNlY3VyaXR5IGNoYW5nZXMgcmVxdWlyZSBhcHByb3ZhbFxuICAgKlxuICAgKiBAZGVmYXVsdCBSZXF1aXJlQXBwcm92YWwuQnJvYWRlbmluZ1xuICAgKi9cbiAgcmVxdWlyZUFwcHJvdmFsPzogUmVxdWlyZUFwcHJvdmFsO1xuXG4gIC8qKlxuICAgKiBUYWdzIHRvIHBhc3MgdG8gQ2xvdWRGb3JtYXRpb24gZm9yIGRlcGxveW1lbnRcbiAgICovXG4gIHRhZ3M/OiBUYWdbXTtcblxuICAvKipcbiAgICogQWRkaXRpb25hbCBwYXJhbWV0ZXJzIGZvciBDbG91ZEZvcm1hdGlvbiBhdCBkZXBsb3kgdGltZVxuICAgKiBAZGVmYXVsdCB7fVxuICAgKi9cbiAgcGFyYW1ldGVycz86IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9O1xuXG4gIC8qKlxuICAgKiBVc2UgcHJldmlvdXMgdmFsdWVzIGZvciB1bnNwZWNpZmllZCBwYXJhbWV0ZXJzXG4gICAqXG4gICAqIElmIG5vdCBzZXQsIGFsbCBwYXJhbWV0ZXJzIG11c3QgYmUgc3BlY2lmaWVkIGZvciBldmVyeSBkZXBsb3ltZW50LlxuICAgKlxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICB1c2VQcmV2aW91c1BhcmFtZXRlcnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGZpbGUgd2hlcmUgc3RhY2sgb3V0cHV0cyB3aWxsIGJlIHdyaXR0ZW4gYWZ0ZXIgYSBzdWNjZXNzZnVsIGRlcGxveSBhcyBKU09OXG4gICAqIEBkZWZhdWx0IC0gT3V0cHV0cyBhcmUgbm90IHdyaXR0ZW4gdG8gYW55IGZpbGVcbiAgICovXG4gIG91dHB1dHNGaWxlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHdlIGFyZSBvbiBhIENJIHN5c3RlbVxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgY2k/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoaXMgJ2RlcGxveScgY29tbWFuZCBzaG91bGQgYWN0dWFsbHkgZGVsZWdhdGUgdG8gdGhlICd3YXRjaCcgY29tbWFuZC5cbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IHdhdGNoPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB3ZSBzaG91bGQgY2FjaGUgdGhlIENsb3VkIEFzc2VtYmx5IGFmdGVyIHRoZSBmaXJzdCB0aW1lIGl0IGhhcyBiZWVuIHN5bnRoZXNpemVkLlxuICAgKiBUaGUgZGVmYXVsdCBpcyAndHJ1ZScsIHdlIG9ubHkgZG9uJ3Qgd2FudCB0byBkbyBpdCBpbiBjYXNlIHRoZSBkZXBsb3ltZW50IGlzIHRyaWdnZXJlZCBieVxuICAgKiAnY2RrIHdhdGNoJy5cbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgY2FjaGVDbG91ZEFzc2VtYmx5PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQWxsb3dzIGFkZGluZyBDbG91ZFdhdGNoIGxvZyBncm91cHMgdG8gdGhlIGxvZyBtb25pdG9yIHZpYVxuICAgKiBjbG91ZFdhdGNoTG9nTW9uaXRvci5zZXRMb2dHcm91cHMoKTtcbiAgICpcbiAgICogQGRlZmF1bHQgLSBub3QgbW9uaXRvcmluZyBDbG91ZFdhdGNoIGxvZ3NcbiAgICovXG4gIHJlYWRvbmx5IGNsb3VkV2F0Y2hMb2dNb25pdG9yPzogQ2xvdWRXYXRjaExvZ0V2ZW50TW9uaXRvcjtcblxuICAvKipcbiAgICogTWF4aW11bSBudW1iZXIgb2Ygc2ltdWx0YW5lb3VzIGRlcGxveW1lbnRzIChkZXBlbmRlbmN5IHBlcm1pdHRpbmcpIHRvIGV4ZWN1dGUuXG4gICAqIFRoZSBkZWZhdWx0IGlzICcxJywgd2hpY2ggZXhlY3V0ZXMgYWxsIGRlcGxveW1lbnRzIHNlcmlhbGx5LlxuICAgKlxuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICByZWFkb25seSBjb25jdXJyZW5jeT86IG51bWJlcjtcblxuICAvKipcbiAgICogQnVpbGQvcHVibGlzaCBhc3NldHMgZm9yIGEgc2luZ2xlIHN0YWNrIGluIHBhcmFsbGVsXG4gICAqXG4gICAqIEluZGVwZW5kZW50IG9mIHdoZXRoZXIgc3RhY2tzIGFyZSBiZWluZyBkb25lIGluIHBhcmFsbGVsIG9yIG5vLlxuICAgKlxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICByZWFkb25seSBhc3NldFBhcmFsbGVsaXNtPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hlbiB0byBidWlsZCBhc3NldHNcbiAgICpcbiAgICogVGhlIGRlZmF1bHQgaXMgdGhlIERvY2tlci1mcmllbmRseSBkZWZhdWx0LlxuICAgKlxuICAgKiBAZGVmYXVsdCBBc3NldEJ1aWxkVGltZS5BTExfQkVGT1JFX0RFUExPWVxuICAgKi9cbiAgcmVhZG9ubHkgYXNzZXRCdWlsZFRpbWU/OiBBc3NldEJ1aWxkVGltZTtcblxuICAvKipcbiAgICogV2hldGhlciB0byBkZXBsb3kgaWYgdGhlIGFwcCBjb250YWlucyBubyBzdGFja3MuXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZWFkb25seSBpZ25vcmVOb1N0YWNrcz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sbGJhY2tPcHRpb25zIHtcbiAgLyoqXG4gICAqIENyaXRlcmlhIGZvciBzZWxlY3Rpbmcgc3RhY2tzIHRvIGRlcGxveVxuICAgKi9cbiAgcmVhZG9ubHkgc2VsZWN0b3I6IFN0YWNrU2VsZWN0b3I7XG5cbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIHRvb2xraXQgc3RhY2sgdG8gdXNlL2RlcGxveVxuICAgKlxuICAgKiBAZGVmYXVsdCBDREtUb29sa2l0XG4gICAqL1xuICByZWFkb25seSB0b29sa2l0U3RhY2tOYW1lPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBSb2xlIHRvIHBhc3MgdG8gQ2xvdWRGb3JtYXRpb24gZm9yIGRlcGxveW1lbnRcbiAgICpcbiAgICogQGRlZmF1bHQgLSBEZWZhdWx0IHN0YWNrIHJvbGVcbiAgICovXG4gIHJlYWRvbmx5IHJvbGVBcm4/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZm9yY2UgdGhlIHJvbGxiYWNrIG9yIG5vdFxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgZm9yY2U/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBMb2dpY2FsIElEcyBvZiByZXNvdXJjZXMgdG8gb3JwaGFuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm8gb3JwaGFuaW5nXG4gICAqL1xuICByZWFkb25seSBvcnBoYW5Mb2dpY2FsSWRzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gdmFsaWRhdGUgdGhlIHZlcnNpb24gb2YgdGhlIGJvb3RzdHJhcCBzdGFjayBwZXJtaXNzaW9uc1xuICAgKlxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICByZWFkb25seSB2YWxpZGF0ZUJvb3RzdHJhcFN0YWNrVmVyc2lvbj86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0T3B0aW9ucyBleHRlbmRzIENmbkRlcGxveU9wdGlvbnMge1xuICAvKipcbiAgICogQnVpbGQgYSBwaHlzaWNhbCByZXNvdXJjZSBtYXBwaW5nIGFuZCB3cml0ZSBpdCB0byB0aGUgZ2l2ZW4gZmlsZSwgd2l0aG91dCBwZXJmb3JtaW5nIHRoZSBhY3R1YWwgaW1wb3J0IG9wZXJhdGlvblxuICAgKlxuICAgKiBAZGVmYXVsdCAtIE5vIGZpbGVcbiAgICovXG5cbiAgcmVhZG9ubHkgcmVjb3JkUmVzb3VyY2VNYXBwaW5nPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgZmlsZSB3aXRoIHRoZSBwaHlzaWNhbCByZXNvdXJjZSBtYXBwaW5nIHRvIENESyBjb25zdHJ1Y3RzIGluIEpTT04gZm9ybWF0XG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm8gbWFwcGluZyBmaWxlXG4gICAqL1xuICByZWFkb25seSByZXNvdXJjZU1hcHBpbmdGaWxlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBBbGxvdyBub24tYWRkaXRpb24gY2hhbmdlcyB0byB0aGUgdGVtcGxhdGVcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGZvcmNlPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXN0cm95T3B0aW9ucyB7XG4gIC8qKlxuICAgKiBDcml0ZXJpYSBmb3Igc2VsZWN0aW5nIHN0YWNrcyB0byBkZXBsb3lcbiAgICovXG4gIHNlbGVjdG9yOiBTdGFja1NlbGVjdG9yO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGV4Y2x1ZGUgc3RhY2tzIHRoYXQgZGVwZW5kIG9uIHRoZSBzdGFja3MgdG8gYmUgZGVsZXRlZFxuICAgKi9cbiAgZXhjbHVzaXZlbHk6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gc2tpcCBwcm9tcHRpbmcgZm9yIGNvbmZpcm1hdGlvblxuICAgKi9cbiAgZm9yY2U6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBhcm4gb2YgdGhlIElBTSByb2xlIHRvIHVzZVxuICAgKi9cbiAgcm9sZUFybj86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgZGVzdHJveSByZXF1ZXN0IGNhbWUgZnJvbSBhIGRlcGxveS5cbiAgICovXG4gIGZyb21EZXBsb3k/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHdlIGFyZSBvbiBhIENJIHN5c3RlbVxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgY2k/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHRoZSBnYXJiYWdlIGNvbGxlY3Rpb25cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHYXJiYWdlQ29sbGVjdGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogVGhlIGFjdGlvbiB0byBwZXJmb3JtLlxuICAgKlxuICAgKiBAZGVmYXVsdCAnZnVsbCdcbiAgICovXG4gIHJlYWRvbmx5IGFjdGlvbjogJ3ByaW50JyB8ICd0YWcnIHwgJ2RlbGV0ZS10YWdnZWQnIHwgJ2Z1bGwnO1xuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSBvZiB0aGUgYXNzZXRzIHRvIGJlIGdhcmJhZ2UgY29sbGVjdGVkLlxuICAgKlxuICAgKiBAZGVmYXVsdCAnYWxsJ1xuICAgKi9cbiAgcmVhZG9ubHkgdHlwZTogJ3MzJyB8ICdlY3InIHwgJ2FsbCc7XG5cbiAgLyoqXG4gICAqIEVsYXBzZWQgdGltZSBiZXR3ZWVuIGFuIGFzc2V0IGJlaW5nIG1hcmtlZCBhcyBpc29sYXRlZCBhbmQgYWN0dWFsbHkgZGVsZXRlZC5cbiAgICpcbiAgICogQGRlZmF1bHQgMFxuICAgKi9cbiAgcmVhZG9ubHkgcm9sbGJhY2tCdWZmZXJEYXlzOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFJlZnVzZSBkZWxldGlvbiBvZiBhbnkgYXNzZXRzIHlvdW5nZXIgdGhhbiB0aGlzIG51bWJlciBvZiBkYXlzLlxuICAgKi9cbiAgcmVhZG9ubHkgY3JlYXRlZEJ1ZmZlckRheXM6IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIHN0YWNrIG5hbWUgb2YgdGhlIGJvb3RzdHJhcCBzdGFjay5cbiAgICpcbiAgICogQGRlZmF1bHQgREVGQVVMVF9UT09MS0lUX1NUQUNLX05BTUVcbiAgICovXG4gIHJlYWRvbmx5IGJvb3RzdHJhcFN0YWNrTmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogU2tpcHMgdGhlIHByb21wdCBiZWZvcmUgYWN0dWFsIGRlbGV0aW9uIGJlZ2luc1xuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgY29uZmlybT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWlncmF0ZU9wdGlvbnMge1xuICAvKipcbiAgICogVGhlIG5hbWUgYXNzaWduZWQgdG8gdGhlIGdlbmVyYXRlZCBzdGFjay4gVGhpcyBpcyBhbHNvIHVzZWQgdG8gZ2V0XG4gICAqIHRoZSBzdGFjayBmcm9tIHRoZSB1c2VyJ3MgYWNjb3VudCBpZiBgLS1mcm9tLXN0YWNrYCBpcyB1c2VkLlxuICAgKi9cbiAgcmVhZG9ubHkgc3RhY2tOYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSB0YXJnZXQgbGFuZ3VhZ2UgZm9yIHRoZSBnZW5lcmF0ZWQgdGhlIENESyBhcHAuXG4gICAqXG4gICAqIEBkZWZhdWx0IHR5cGVzY3JpcHRcbiAgICovXG4gIHJlYWRvbmx5IGxhbmd1YWdlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgbG9jYWwgcGF0aCBvZiB0aGUgdGVtcGxhdGUgdXNlZCB0byBnZW5lcmF0ZSB0aGUgQ0RLIGFwcC5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBMb2NhbCBwYXRoIGlzIG5vdCB1c2VkIGZvciB0aGUgdGVtcGxhdGUgc291cmNlLlxuICAgKi9cbiAgcmVhZG9ubHkgZnJvbVBhdGg/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZ2V0IHRoZSB0ZW1wbGF0ZSBmcm9tIGFuIGV4aXN0aW5nIENsb3VkRm9ybWF0aW9uIHN0YWNrLlxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgZnJvbVN0YWNrPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIG91dHB1dCBwYXRoIGF0IHdoaWNoIHRvIGNyZWF0ZSB0aGUgQ0RLIGFwcC5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBUaGUgY3VycmVudCBkaXJlY3RvcnlcbiAgICovXG4gIHJlYWRvbmx5IG91dHB1dFBhdGg/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBhY2NvdW50IGZyb20gd2hpY2ggdG8gcmV0cmlldmUgdGhlIHRlbXBsYXRlIG9mIHRoZSBDbG91ZEZvcm1hdGlvbiBzdGFjay5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBVc2VzIHRoZSBhY2NvdW50IGZvciB0aGUgY3JlZGVudGlhbHMgaW4gdXNlIGJ5IHRoZSB1c2VyLlxuICAgKi9cbiAgcmVhZG9ubHkgYWNjb3VudD86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHJlZ2lvbiBmcm9tIHdoaWNoIHRvIHJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBvZiB0aGUgQ2xvdWRGb3JtYXRpb24gc3RhY2suXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gVXNlcyB0aGUgZGVmYXVsdCByZWdpb24gZm9yIHRoZSBjcmVkZW50aWFscyBpbiB1c2UgYnkgdGhlIHVzZXIuXG4gICAqL1xuICByZWFkb25seSByZWdpb24/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEZpbHRlcmluZyBjcml0ZXJpYSB1c2VkIHRvIHNlbGVjdCB0aGUgcmVzb3VyY2VzIHRvIGJlIGluY2x1ZGVkIGluIHRoZSBnZW5lcmF0ZWQgQ0RLIGFwcC5cbiAgICpcbiAgICogQGRlZmF1bHQgLSBJbmNsdWRlIGFsbCByZXNvdXJjZXNcbiAgICovXG4gIHJlYWRvbmx5IGZpbHRlcj86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluaXRpYXRlIGEgbmV3IGFjY291bnQgc2NhbiBmb3IgZ2VuZXJhdGluZyB0aGUgQ0RLIGFwcC5cbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGZyb21TY2FuPzogRnJvbVNjYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gemlwIHRoZSBnZW5lcmF0ZWQgY2RrIGFwcCBmb2xkZXIuXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZWFkb25seSBjb21wcmVzcz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQHJldHVybnMgYW4gYXJyYXkgd2l0aCB0aGUgdGFncyBhdmFpbGFibGUgaW4gdGhlIHN0YWNrIG1ldGFkYXRhLlxuICovXG5mdW5jdGlvbiB0YWdzRm9yU3RhY2soc3RhY2s6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdCk6IFRhZ1tdIHtcbiAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKHN0YWNrLnRhZ3MpLm1hcCgoW0tleSwgVmFsdWVdKSA9PiAoeyBLZXksIFZhbHVlIH0pKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUYWcge1xuICByZWFkb25seSBLZXk6IHN0cmluZztcbiAgcmVhZG9ubHkgVmFsdWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBGb3JtYXRzIHRpbWUgaW4gbWlsbGlzZWNvbmRzICh3aGljaCB3ZSBnZXQgZnJvbSAnRGF0ZS5nZXRUaW1lKCknKVxuICogdG8gYSBodW1hbi1yZWFkYWJsZSB0aW1lOyByZXR1cm5zIHRpbWUgaW4gc2Vjb25kcyByb3VuZGVkIHRvIDJcbiAqIGRlY2ltYWwgcGxhY2VzLlxuICovXG5mdW5jdGlvbiBmb3JtYXRUaW1lKG51bTogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIHJvdW5kUGVyY2VudGFnZShtaWxsaXNlY29uZHNUb1NlY29uZHMobnVtKSk7XG59XG5cbi8qKlxuICogUm91bmRzIGEgZGVjaW1hbCBudW1iZXIgdG8gdHdvIGRlY2ltYWwgcG9pbnRzLlxuICogVGhlIGZ1bmN0aW9uIGlzIHVzZWZ1bCBmb3IgZnJhY3Rpb25zIHRoYXQgbmVlZCB0byBiZSBvdXRwdXR0ZWQgYXMgcGVyY2VudGFnZXMuXG4gKi9cbmZ1bmN0aW9uIHJvdW5kUGVyY2VudGFnZShudW06IG51bWJlcik6IG51bWJlciB7XG4gIHJldHVybiBNYXRoLnJvdW5kKDEwMCAqIG51bSkgLyAxMDA7XG59XG5cbi8qKlxuICogR2l2ZW4gYSB0aW1lIGluIG1pbGxpc2Vjb25kcywgcmV0dXJuIGFuIGVxdWl2YWxlbnQgYW1vdW50IGluIHNlY29uZHMuXG4gKi9cbmZ1bmN0aW9uIG1pbGxpc2Vjb25kc1RvU2Vjb25kcyhudW06IG51bWJlcik6IG51bWJlciB7XG4gIHJldHVybiBudW0gLyAxMDAwO1xufVxuXG5mdW5jdGlvbiBidWlsZFBhcmFtZXRlck1hcChcbiAgcGFyYW1ldGVyczpcbiAgfCB7XG4gICAgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgfVxuICB8IHVuZGVmaW5lZCxcbik6IHsgW25hbWU6IHN0cmluZ106IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9IH0ge1xuICBjb25zdCBwYXJhbWV0ZXJNYXA6IHtcbiAgICBbbmFtZTogc3RyaW5nXTogeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkIH07XG4gIH0gPSB7ICcqJzoge30gfTtcbiAgZm9yIChjb25zdCBrZXkgaW4gcGFyYW1ldGVycykge1xuICAgIGlmIChwYXJhbWV0ZXJzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIGNvbnN0IFtzdGFjaywgcGFyYW1ldGVyXSA9IGtleS5zcGxpdCgnOicsIDIpO1xuICAgICAgaWYgKCFwYXJhbWV0ZXIpIHtcbiAgICAgICAgcGFyYW1ldGVyTWFwWycqJ11bc3RhY2tdID0gcGFyYW1ldGVyc1trZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFwYXJhbWV0ZXJNYXBbc3RhY2tdKSB7XG4gICAgICAgICAgcGFyYW1ldGVyTWFwW3N0YWNrXSA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtZXRlck1hcFtzdGFja11bcGFyYW1ldGVyXSA9IHBhcmFtZXRlcnNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFyYW1ldGVyTWFwO1xufVxuXG4vKipcbiAqIFJlbW92ZSBhbnkgdGVtcGxhdGUgZWxlbWVudHMgdGhhdCB3ZSBkb24ndCB3YW50IHRvIHNob3cgdXNlcnMuXG4gKi9cbmZ1bmN0aW9uIG9ic2N1cmVUZW1wbGF0ZSh0ZW1wbGF0ZTogYW55ID0ge30pIHtcbiAgaWYgKHRlbXBsYXRlLlJ1bGVzKSB7XG4gICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMTc5NDJcbiAgICBpZiAodGVtcGxhdGUuUnVsZXMuQ2hlY2tCb290c3RyYXBWZXJzaW9uKSB7XG4gICAgICBpZiAoT2JqZWN0LmtleXModGVtcGxhdGUuUnVsZXMpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZGVsZXRlIHRlbXBsYXRlLlJ1bGVzLkNoZWNrQm9vdHN0cmFwVmVyc2lvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0ZW1wbGF0ZS5SdWxlcztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cbi8qKlxuICogQXNrIHRoZSB1c2VyIGZvciBhIHllcy9ubyBjb25maXJtYXRpb25cbiAqXG4gKiBBdXRvbWF0aWNhbGx5IGZhaWwgdGhlIGNvbmZpcm1hdGlvbiBpbiBjYXNlIHdlJ3JlIGluIGEgc2l0dWF0aW9uIHdoZXJlIHRoZSBjb25maXJtYXRpb25cbiAqIGNhbm5vdCBiZSBpbnRlcmFjdGl2ZWx5IG9idGFpbmVkIGZyb20gYSBodW1hbiBhdCB0aGUga2V5Ym9hcmQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFza1VzZXJDb25maXJtYXRpb24oXG4gIGNvbmN1cnJlbmN5OiBudW1iZXIsXG4gIG1vdGl2YXRpb246IHN0cmluZyxcbiAgcXVlc3Rpb246IHN0cmluZyxcbikge1xuICBhd2FpdCB3aXRoQ29ya2VkTG9nZ2luZyhhc3luYyAoKSA9PiB7XG4gICAgLy8gb25seSB0YWxrIHRvIHVzZXIgaWYgU1RESU4gaXMgYSB0ZXJtaW5hbCAob3RoZXJ3aXNlLCBmYWlsKVxuICAgIGlmICghVEVTVElORyAmJiAhcHJvY2Vzcy5zdGRpbi5pc1RUWSkge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihgJHttb3RpdmF0aW9ufSwgYnV0IHRlcm1pbmFsIChUVFkpIGlzIG5vdCBhdHRhY2hlZCBzbyB3ZSBhcmUgdW5hYmxlIHRvIGdldCBhIGNvbmZpcm1hdGlvbiBmcm9tIHRoZSB1c2VyYCk7XG4gICAgfVxuXG4gICAgLy8gb25seSB0YWxrIHRvIHVzZXIgaWYgY29uY3VycmVuY3kgaXMgMSAob3RoZXJ3aXNlLCBmYWlsKVxuICAgIGlmIChjb25jdXJyZW5jeSA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYCR7bW90aXZhdGlvbn0sIGJ1dCBjb25jdXJyZW5jeSBpcyBncmVhdGVyIHRoYW4gMSBzbyB3ZSBhcmUgdW5hYmxlIHRvIGdldCBhIGNvbmZpcm1hdGlvbiBmcm9tIHRoZSB1c2VyYCk7XG4gICAgfVxuXG4gICAgY29uc3QgY29uZmlybWVkID0gYXdhaXQgcHJvbXB0bHkuY29uZmlybShgJHtjaGFsay5jeWFuKHF1ZXN0aW9uKX0gKHkvbik/YCk7XG4gICAgaWYgKCFjb25maXJtZWQpIHsgdGhyb3cgbmV3IFRvb2xraXRFcnJvcignQWJvcnRlZCBieSB1c2VyJyk7IH1cbiAgfSk7XG59XG4iXX0=