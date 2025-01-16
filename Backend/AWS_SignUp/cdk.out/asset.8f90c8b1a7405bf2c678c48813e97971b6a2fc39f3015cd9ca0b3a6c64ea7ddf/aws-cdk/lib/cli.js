"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = exec;
exports.cli = cli;
const cxapi = require("@aws-cdk/cx-api");
require("@jsii/check-node/run");
const chalk = require("chalk");
const common_1 = require("./api/hotswap/common");
const parse_command_line_arguments_1 = require("./parse-command-line-arguments");
const platform_warnings_1 = require("./platform-warnings");
const tracing_1 = require("./util/tracing");
const aws_auth_1 = require("../lib/api/aws-auth");
const bootstrap_1 = require("../lib/api/bootstrap");
const cloud_executable_1 = require("../lib/api/cxapp/cloud-executable");
const exec_1 = require("../lib/api/cxapp/exec");
const deployments_1 = require("../lib/api/deployments");
const plugin_1 = require("../lib/api/plugin");
const toolkit_info_1 = require("../lib/api/toolkit-info");
const cdk_toolkit_1 = require("../lib/cdk-toolkit");
const context_1 = require("../lib/commands/context");
const docs_1 = require("../lib/commands/docs");
const doctor_1 = require("../lib/commands/doctor");
const migrate_1 = require("../lib/commands/migrate");
const init_1 = require("../lib/init");
const logging_1 = require("../lib/logging");
const notices_1 = require("../lib/notices");
const settings_1 = require("../lib/settings");
const version = require("../lib/version");
const sdk_logger_1 = require("./api/aws-auth/sdk-logger");
const error_1 = require("./toolkit/error");
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-shadow */ // yargs
if (!process.stdout.isTTY) {
    // Disable chalk color highlighting
    process.env.FORCE_COLOR = '0';
}
async function exec(args, synthesizer) {
    const argv = await (0, parse_command_line_arguments_1.parseCommandLineArguments)(args);
    // if one -v, log at a DEBUG level
    // if 2 -v, log at a TRACE level
    if (argv.verbose) {
        let logLevel;
        switch (argv.verbose) {
            case 1:
                logLevel = logging_1.LogLevel.DEBUG;
                break;
            case 2:
            default:
                logLevel = logging_1.LogLevel.TRACE;
                break;
        }
        (0, logging_1.setLogLevel)(logLevel);
    }
    // Debug should always imply tracing
    if (argv.debug || argv.verbose > 2) {
        (0, tracing_1.enableTracing)(true);
    }
    if (argv.ci) {
        (0, logging_1.setCI)(true);
    }
    try {
        await (0, platform_warnings_1.checkForPlatformWarnings)();
    }
    catch (e) {
        (0, logging_1.debug)(`Error while checking for platform warnings: ${e}`);
    }
    (0, logging_1.debug)('CDK toolkit version:', version.DISPLAY_VERSION);
    (0, logging_1.debug)('Command line arguments:', argv);
    const configuration = new settings_1.Configuration({
        commandLineArguments: {
            ...argv,
            _: argv._, // TypeScript at its best
        },
    });
    await configuration.load();
    const cmd = argv._[0];
    const notices = notices_1.Notices.create({
        context: configuration.context,
        output: configuration.settings.get(['outdir']),
        shouldDisplay: configuration.settings.get(['notices']),
        includeAcknowledged: cmd === 'notices' ? !argv.unacknowledged : false,
        httpOptions: {
            proxyAddress: configuration.settings.get(['proxy']),
            caBundlePath: configuration.settings.get(['caBundlePath']),
        },
    });
    await notices.refresh();
    const sdkProvider = await aws_auth_1.SdkProvider.withAwsCliCompatibleDefaults({
        profile: configuration.settings.get(['profile']),
        httpOptions: {
            proxyAddress: argv.proxy,
            caBundlePath: argv['ca-bundle-path'],
        },
        logger: new sdk_logger_1.SdkToCliLogger(),
    });
    let outDirLock;
    const cloudExecutable = new cloud_executable_1.CloudExecutable({
        configuration,
        sdkProvider,
        synthesizer: synthesizer ??
            (async (aws, config) => {
                // Invoke 'execProgram', and copy the lock for the directory in the global
                // variable here. It will be released when the CLI exits. Locks are not re-entrant
                // so release it if we have to synthesize more than once (because of context lookups).
                await outDirLock?.release();
                const { assembly, lock } = await (0, exec_1.execProgram)(aws, config);
                outDirLock = lock;
                return assembly;
            }),
    });
    /** Function to load plug-ins, using configurations additively. */
    function loadPlugins(...settings) {
        const loaded = new Set();
        for (const source of settings) {
            const plugins = source.get(['plugin']) || [];
            for (const plugin of plugins) {
                const resolved = tryResolve(plugin);
                if (loaded.has(resolved)) {
                    continue;
                }
                (0, logging_1.debug)(`Loading plug-in: ${chalk.green(plugin)} from ${chalk.blue(resolved)}`);
                plugin_1.PluginHost.instance.load(plugin);
                loaded.add(resolved);
            }
        }
        function tryResolve(plugin) {
            try {
                return require.resolve(plugin);
            }
            catch (e) {
                (0, logging_1.error)(`Unable to resolve plugin ${chalk.green(plugin)}: ${e.stack}`);
                throw new error_1.ToolkitError(`Unable to resolve plug-in: ${plugin}`);
            }
        }
    }
    loadPlugins(configuration.settings);
    if (typeof (cmd) !== 'string') {
        throw new error_1.ToolkitError(`First argument should be a string. Got: ${cmd} (${typeof (cmd)})`);
    }
    try {
        return await main(cmd, argv);
    }
    finally {
        // If we locked the 'cdk.out' directory, release it here.
        await outDirLock?.release();
        // Do PSAs here
        await version.displayVersionMessage();
        if (cmd === 'notices') {
            await notices.refresh({ force: true });
            notices.display({ showTotal: argv.unacknowledged });
        }
        else if (cmd !== 'version') {
            await notices.refresh();
            notices.display();
        }
    }
    async function main(command, args) {
        const toolkitStackName = toolkit_info_1.ToolkitInfo.determineName(configuration.settings.get(['toolkitStackName']));
        (0, logging_1.debug)(`Toolkit stack: ${chalk.bold(toolkitStackName)}`);
        const cloudFormation = new deployments_1.Deployments({ sdkProvider, toolkitStackName });
        if (args.all && args.STACKS) {
            throw new error_1.ToolkitError('You must either specify a list of Stacks or the `--all` argument');
        }
        args.STACKS = args.STACKS ?? (args.STACK ? [args.STACK] : []);
        args.ENVIRONMENTS = args.ENVIRONMENTS ?? [];
        const selector = {
            allTopLevel: args.all,
            patterns: args.STACKS,
        };
        const cli = new cdk_toolkit_1.CdkToolkit({
            cloudExecutable,
            deployments: cloudFormation,
            verbose: argv.trace || argv.verbose > 0,
            ignoreErrors: argv['ignore-errors'],
            strict: argv.strict,
            configuration,
            sdkProvider,
        });
        switch (command) {
            case 'context':
                return (0, context_1.contextHandler)({
                    context: configuration.context,
                    clear: argv.clear,
                    json: argv.json,
                    force: argv.force,
                    reset: argv.reset,
                });
            case 'docs':
                return (0, docs_1.docs)({ browser: configuration.settings.get(['browser']) });
            case 'doctor':
                return (0, doctor_1.doctor)();
            case 'ls':
            case 'list':
                return cli.list(args.STACKS, {
                    long: args.long,
                    json: argv.json,
                    showDeps: args.showDependencies,
                });
            case 'diff':
                const enableDiffNoFail = isFeatureEnabled(configuration, cxapi.ENABLE_DIFF_NO_FAIL_CONTEXT);
                return cli.diff({
                    stackNames: args.STACKS,
                    exclusively: args.exclusively,
                    templatePath: args.template,
                    strict: args.strict,
                    contextLines: args.contextLines,
                    securityOnly: args.securityOnly,
                    fail: args.fail != null ? args.fail : !enableDiffNoFail,
                    stream: args.ci ? process.stdout : undefined,
                    compareAgainstProcessedTemplate: args.processed,
                    quiet: args.quiet,
                    changeSet: args['change-set'],
                    toolkitStackName: toolkitStackName,
                });
            case 'bootstrap':
                const source = determineBootstrapVersion(args);
                if (args.showTemplate) {
                    const bootstrapper = new bootstrap_1.Bootstrapper(source);
                    return bootstrapper.showTemplate(args.json);
                }
                return cli.bootstrap(args.ENVIRONMENTS, {
                    source,
                    roleArn: args.roleArn,
                    force: argv.force,
                    toolkitStackName: toolkitStackName,
                    execute: args.execute,
                    tags: configuration.settings.get(['tags']),
                    terminationProtection: args.terminationProtection,
                    usePreviousParameters: args['previous-parameters'],
                    parameters: {
                        bucketName: configuration.settings.get(['toolkitBucket', 'bucketName']),
                        kmsKeyId: configuration.settings.get(['toolkitBucket', 'kmsKeyId']),
                        createCustomerMasterKey: args.bootstrapCustomerKey,
                        qualifier: args.qualifier ?? configuration.context.get('@aws-cdk/core:bootstrapQualifier'),
                        publicAccessBlockConfiguration: args.publicAccessBlockConfiguration,
                        examplePermissionsBoundary: argv.examplePermissionsBoundary,
                        customPermissionsBoundary: argv.customPermissionsBoundary,
                        trustedAccounts: arrayFromYargs(args.trust),
                        trustedAccountsForLookup: arrayFromYargs(args.trustForLookup),
                        cloudFormationExecutionPolicies: arrayFromYargs(args.cloudformationExecutionPolicies),
                    },
                });
            case 'deploy':
                const parameterMap = {};
                for (const parameter of args.parameters) {
                    if (typeof parameter === 'string') {
                        const keyValue = parameter.split('=');
                        parameterMap[keyValue[0]] = keyValue.slice(1).join('=');
                    }
                }
                if (args.execute !== undefined && args.method !== undefined) {
                    throw new error_1.ToolkitError('Can not supply both --[no-]execute and --method at the same time');
                }
                let deploymentMethod;
                switch (args.method) {
                    case 'direct':
                        if (args.changeSetName) {
                            throw new error_1.ToolkitError('--change-set-name cannot be used with method=direct');
                        }
                        if (args.importExistingResources) {
                            throw new Error('--import-existing-resources cannot be enabled with method=direct');
                        }
                        deploymentMethod = { method: 'direct' };
                        break;
                    case 'change-set':
                        deploymentMethod = {
                            method: 'change-set',
                            execute: true,
                            changeSetName: args.changeSetName,
                            importExistingResources: args.importExistingResources,
                        };
                        break;
                    case 'prepare-change-set':
                        deploymentMethod = {
                            method: 'change-set',
                            execute: false,
                            changeSetName: args.changeSetName,
                            importExistingResources: args.importExistingResources,
                        };
                        break;
                    case undefined:
                        deploymentMethod = {
                            method: 'change-set',
                            execute: args.execute ?? true,
                            changeSetName: args.changeSetName,
                            importExistingResources: args.importExistingResources,
                        };
                        break;
                }
                return cli.deploy({
                    selector,
                    exclusively: args.exclusively,
                    toolkitStackName,
                    roleArn: args.roleArn,
                    notificationArns: args.notificationArns,
                    requireApproval: configuration.settings.get(['requireApproval']),
                    reuseAssets: args['build-exclude'],
                    tags: configuration.settings.get(['tags']),
                    deploymentMethod,
                    force: args.force,
                    parameters: parameterMap,
                    usePreviousParameters: args['previous-parameters'],
                    outputsFile: configuration.settings.get(['outputsFile']),
                    progress: configuration.settings.get(['progress']),
                    ci: args.ci,
                    rollback: configuration.settings.get(['rollback']),
                    hotswap: determineHotswapMode(args.hotswap, args.hotswapFallback),
                    watch: args.watch,
                    traceLogs: args.logs,
                    concurrency: args.concurrency,
                    assetParallelism: configuration.settings.get(['assetParallelism']),
                    assetBuildTime: configuration.settings.get(['assetPrebuild'])
                        ? cdk_toolkit_1.AssetBuildTime.ALL_BEFORE_DEPLOY
                        : cdk_toolkit_1.AssetBuildTime.JUST_IN_TIME,
                    ignoreNoStacks: args.ignoreNoStacks,
                });
            case 'rollback':
                return cli.rollback({
                    selector,
                    toolkitStackName,
                    roleArn: args.roleArn,
                    force: args.force,
                    validateBootstrapStackVersion: args['validate-bootstrap-version'],
                    orphanLogicalIds: args.orphan,
                });
            case 'import':
                return cli.import({
                    selector,
                    toolkitStackName,
                    roleArn: args.roleArn,
                    deploymentMethod: {
                        method: 'change-set',
                        execute: args.execute,
                        changeSetName: args.changeSetName,
                    },
                    progress: configuration.settings.get(['progress']),
                    rollback: configuration.settings.get(['rollback']),
                    recordResourceMapping: args['record-resource-mapping'],
                    resourceMappingFile: args['resource-mapping'],
                    force: args.force,
                });
            case 'watch':
                return cli.watch({
                    selector,
                    exclusively: args.exclusively,
                    toolkitStackName,
                    roleArn: args.roleArn,
                    reuseAssets: args['build-exclude'],
                    deploymentMethod: {
                        method: 'change-set',
                        changeSetName: args.changeSetName,
                    },
                    force: args.force,
                    progress: configuration.settings.get(['progress']),
                    rollback: configuration.settings.get(['rollback']),
                    hotswap: determineHotswapMode(args.hotswap, args.hotswapFallback, true),
                    traceLogs: args.logs,
                    concurrency: args.concurrency,
                });
            case 'destroy':
                return cli.destroy({
                    selector,
                    exclusively: args.exclusively,
                    force: args.force,
                    roleArn: args.roleArn,
                    ci: args.ci,
                });
            case 'gc':
                if (!configuration.settings.get(['unstable']).includes('gc')) {
                    throw new error_1.ToolkitError('Unstable feature use: \'gc\' is unstable. It must be opted in via \'--unstable\', e.g. \'cdk gc --unstable=gc\'');
                }
                return cli.garbageCollect(args.ENVIRONMENTS, {
                    action: args.action,
                    type: args.type,
                    rollbackBufferDays: args['rollback-buffer-days'],
                    createdBufferDays: args['created-buffer-days'],
                    bootstrapStackName: args.bootstrapStackName,
                    confirm: args.confirm,
                });
            case 'synthesize':
            case 'synth':
                const quiet = configuration.settings.get(['quiet']) ?? args.quiet;
                if (args.exclusively) {
                    return cli.synth(args.STACKS, args.exclusively, quiet, args.validation, argv.json);
                }
                else {
                    return cli.synth(args.STACKS, true, quiet, args.validation, argv.json);
                }
            case 'notices':
                // This is a valid command, but we're postponing its execution
                return;
            case 'metadata':
                return cli.metadata(args.STACK, argv.json);
            case 'acknowledge':
            case 'ack':
                return cli.acknowledge(args.ID);
            case 'init':
                const language = configuration.settings.get(['language']);
                if (args.list) {
                    return (0, init_1.printAvailableTemplates)(language);
                }
                else {
                    return (0, init_1.cliInit)({
                        type: args.TEMPLATE,
                        language,
                        canUseNetwork: undefined,
                        generateOnly: args.generateOnly,
                    });
                }
            case 'migrate':
                return cli.migrate({
                    stackName: args['stack-name'],
                    fromPath: args['from-path'],
                    fromStack: args['from-stack'],
                    language: args.language,
                    outputPath: args['output-path'],
                    fromScan: (0, migrate_1.getMigrateScanType)(args['from-scan']),
                    filter: args.filter,
                    account: args.account,
                    region: args.region,
                    compress: args.compress,
                });
            case 'version':
                return (0, logging_1.data)(version.DISPLAY_VERSION);
            default:
                throw new error_1.ToolkitError('Unknown command: ' + command);
        }
    }
}
/**
 * Determine which version of bootstrapping
 */
function determineBootstrapVersion(args) {
    let source;
    if (args.template) {
        (0, logging_1.print)(`Using bootstrapping template from ${args.template}`);
        source = { source: 'custom', templateFile: args.template };
    }
    else if (process.env.CDK_LEGACY_BOOTSTRAP) {
        (0, logging_1.print)('CDK_LEGACY_BOOTSTRAP set, using legacy-style bootstrapping');
        source = { source: 'legacy' };
    }
    else {
        // in V2, the "new" bootstrapping is the default
        source = { source: 'default' };
    }
    return source;
}
function isFeatureEnabled(configuration, featureFlag) {
    return configuration.context.get(featureFlag) ?? cxapi.futureFlagDefault(featureFlag);
}
/**
 * Translate a Yargs input array to something that makes more sense in a programming language
 * model (telling the difference between absence and an empty array)
 *
 * - An empty array is the default case, meaning the user didn't pass any arguments. We return
 *   undefined.
 * - If the user passed a single empty string, they did something like `--array=`, which we'll
 *   take to mean they passed an empty array.
 */
function arrayFromYargs(xs) {
    if (xs.length === 0) {
        return undefined;
    }
    return xs.filter((x) => x !== '');
}
function determineHotswapMode(hotswap, hotswapFallback, watch) {
    if (hotswap && hotswapFallback) {
        throw new error_1.ToolkitError('Can not supply both --hotswap and --hotswap-fallback at the same time');
    }
    else if (!hotswap && !hotswapFallback) {
        if (hotswap === undefined && hotswapFallback === undefined) {
            return watch ? common_1.HotswapMode.HOTSWAP_ONLY : common_1.HotswapMode.FULL_DEPLOYMENT;
        }
        else if (hotswap === false || hotswapFallback === false) {
            return common_1.HotswapMode.FULL_DEPLOYMENT;
        }
    }
    let hotswapMode;
    if (hotswap) {
        hotswapMode = common_1.HotswapMode.HOTSWAP_ONLY;
        /*if (hotswapFallback)*/
    }
    else {
        hotswapMode = common_1.HotswapMode.FALL_BACK;
    }
    return hotswapMode;
}
/* istanbul ignore next: we never call this in unit tests */
function cli(args = process.argv.slice(2)) {
    exec(args)
        .then(async (value) => {
        if (typeof value === 'number') {
            process.exitCode = value;
        }
    })
        .catch((err) => {
        (0, logging_1.error)(err.message);
        // Log the stack trace if we're on a developer workstation. Otherwise this will be into a minified
        // file and the printed code line and stack trace are huge and useless.
        if (err.stack && version.isDeveloperBuild()) {
            (0, logging_1.debug)(err.stack);
        }
        process.exitCode = 1;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBdUNBLG9CQWtiQztBQStERCxrQkFpQkM7QUF6aUJELHlDQUF5QztBQUN6QyxnQ0FBOEI7QUFDOUIsK0JBQStCO0FBRy9CLGlEQUFtRDtBQUVuRCxpRkFBMkU7QUFDM0UsMkRBQStEO0FBQy9ELDRDQUErQztBQUMvQyxrREFBa0Q7QUFDbEQsb0RBQXFFO0FBRXJFLHdFQUFpRjtBQUNqRixnREFBb0Q7QUFDcEQsd0RBQXFEO0FBQ3JELDhDQUErQztBQUMvQywwREFBc0Q7QUFDdEQsb0RBQWdFO0FBQ2hFLHFEQUFvRTtBQUNwRSwrQ0FBNEM7QUFDNUMsbURBQWdEO0FBQ2hELHFEQUE2RDtBQUM3RCxzQ0FBK0Q7QUFDL0QsNENBQXlGO0FBQ3pGLDRDQUF5QztBQUN6Qyw4Q0FBbUU7QUFDbkUsMENBQTBDO0FBQzFDLDBEQUEyRDtBQUMzRCwyQ0FBK0M7QUFFL0MsNEJBQTRCO0FBQzVCLGlEQUFpRCxDQUFDLFFBQVE7QUFFMUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDMUIsbUNBQW1DO0lBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztBQUNoQyxDQUFDO0FBRU0sS0FBSyxVQUFVLElBQUksQ0FBQyxJQUFjLEVBQUUsV0FBeUI7SUFDbEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLHdEQUF5QixFQUFDLElBQUksQ0FBQyxDQUFDO0lBRW5ELGtDQUFrQztJQUNsQyxnQ0FBZ0M7SUFDaEMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakIsSUFBSSxRQUFrQixDQUFDO1FBQ3ZCLFFBQVEsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JCLEtBQUssQ0FBQztnQkFDSixRQUFRLEdBQUcsa0JBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQzFCLE1BQU07WUFD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S0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUMzQixDQUFDO0lBQ0gsQ0FBQyxDQUFDO1NBQ0QsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDYixJQUFBLGVBQUssRUFBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFbkIsa0dBQWtHO1FBQ2xHLHVFQUF1RTtRQUN2RSxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztZQUM1QyxJQUFBLGVBQUssRUFBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsQ0FBQztRQUNELE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGN4YXBpIGZyb20gJ0Bhd3MtY2RrL2N4LWFwaSc7XG5pbXBvcnQgJ0Bqc2lpL2NoZWNrLW5vZGUvcnVuJztcbmltcG9ydCAqIGFzIGNoYWxrIGZyb20gJ2NoYWxrJztcblxuaW1wb3J0IHsgRGVwbG95bWVudE1ldGhvZCB9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7IEhvdHN3YXBNb2RlIH0gZnJvbSAnLi9hcGkvaG90c3dhcC9jb21tb24nO1xuaW1wb3J0IHsgSUxvY2sgfSBmcm9tICcuL2FwaS91dGlsL3J3bG9jayc7XG5pbXBvcnQgeyBwYXJzZUNvbW1hbmRMaW5lQXJndW1lbnRzIH0gZnJvbSAnLi9wYXJzZS1jb21tYW5kLWxpbmUtYXJndW1lbnRzJztcbmltcG9ydCB7IGNoZWNrRm9yUGxhdGZvcm1XYXJuaW5ncyB9IGZyb20gJy4vcGxhdGZvcm0td2FybmluZ3MnO1xuaW1wb3J0IHsgZW5hYmxlVHJhY2luZyB9IGZyb20gJy4vdXRpbC90cmFjaW5nJztcbmltcG9ydCB7IFNka1Byb3ZpZGVyIH0gZnJvbSAnLi4vbGliL2FwaS9hd3MtYXV0aCc7XG5pbXBvcnQgeyBCb290c3RyYXBTb3VyY2UsIEJvb3RzdHJhcHBlciB9IGZyb20gJy4uL2xpYi9hcGkvYm9vdHN0cmFwJztcbmltcG9ydCB7IFN0YWNrU2VsZWN0b3IgfSBmcm9tICcuLi9saWIvYXBpL2N4YXBwL2Nsb3VkLWFzc2VtYmx5JztcbmltcG9ydCB7IENsb3VkRXhlY3V0YWJsZSwgU3ludGhlc2l6ZXIgfSBmcm9tICcuLi9saWIvYXBpL2N4YXBwL2Nsb3VkLWV4ZWN1dGFibGUnO1xuaW1wb3J0IHsgZXhlY1Byb2dyYW0gfSBmcm9tICcuLi9saWIvYXBpL2N4YXBwL2V4ZWMnO1xuaW1wb3J0IHsgRGVwbG95bWVudHMgfSBmcm9tICcuLi9saWIvYXBpL2RlcGxveW1lbnRzJztcbmltcG9ydCB7IFBsdWdpbkhvc3QgfSBmcm9tICcuLi9saWIvYXBpL3BsdWdpbic7XG5pbXBvcnQgeyBUb29sa2l0SW5mbyB9IGZyb20gJy4uL2xpYi9hcGkvdG9vbGtpdC1pbmZvJztcbmltcG9ydCB7IENka1Rvb2xraXQsIEFzc2V0QnVpbGRUaW1lIH0gZnJvbSAnLi4vbGliL2Nkay10b29sa2l0JztcbmltcG9ydCB7IGNvbnRleHRIYW5kbGVyIGFzIGNvbnRleHQgfSBmcm9tICcuLi9saWIvY29tbWFuZHMvY29udGV4dCc7XG5pbXBvcnQgeyBkb2NzIH0gZnJvbSAnLi4vbGliL2NvbW1hbmRzL2RvY3MnO1xuaW1wb3J0IHsgZG9jdG9yIH0gZnJvbSAnLi4vbGliL2NvbW1hbmRzL2RvY3Rvcic7XG5pbXBvcnQgeyBnZXRNaWdyYXRlU2NhblR5cGUgfSBmcm9tICcuLi9saWIvY29tbWFuZHMvbWlncmF0ZSc7XG5pbXBvcnQgeyBjbGlJbml0LCBwcmludEF2YWlsYWJsZVRlbXBsYXRlcyB9IGZyb20gJy4uL2xpYi9pbml0JztcbmltcG9ydCB7IGRhdGEsIGRlYnVnLCBlcnJvciwgcHJpbnQsIHNldENJLCBzZXRMb2dMZXZlbCwgTG9nTGV2ZWwgfSBmcm9tICcuLi9saWIvbG9nZ2luZyc7XG5pbXBvcnQgeyBOb3RpY2VzIH0gZnJvbSAnLi4vbGliL25vdGljZXMnO1xuaW1wb3J0IHsgQ29tbWFuZCwgQ29uZmlndXJhdGlvbiwgU2V0dGluZ3MgfSBmcm9tICcuLi9saWIvc2V0dGluZ3MnO1xuaW1wb3J0ICogYXMgdmVyc2lvbiBmcm9tICcuLi9saWIvdmVyc2lvbic7XG5pbXBvcnQgeyBTZGtUb0NsaUxvZ2dlciB9IGZyb20gJy4vYXBpL2F3cy1hdXRoL3Nkay1sb2dnZXInO1xuaW1wb3J0IHsgVG9vbGtpdEVycm9yIH0gZnJvbSAnLi90b29sa2l0L2Vycm9yJztcblxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXNoYWRvdyAqLyAvLyB5YXJnc1xuXG5pZiAoIXByb2Nlc3Muc3Rkb3V0LmlzVFRZKSB7XG4gIC8vIERpc2FibGUgY2hhbGsgY29sb3IgaGlnaGxpZ2h0aW5nXG4gIHByb2Nlc3MuZW52LkZPUkNFX0NPTE9SID0gJzAnO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlYyhhcmdzOiBzdHJpbmdbXSwgc3ludGhlc2l6ZXI/OiBTeW50aGVzaXplcik6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICBjb25zdCBhcmd2ID0gYXdhaXQgcGFyc2VDb21tYW5kTGluZUFyZ3VtZW50cyhhcmdzKTtcblxuICAvLyBpZiBvbmUgLXYsIGxvZyBhdCBhIERFQlVHIGxldmVsXG4gIC8vIGlmIDIgLXYsIGxvZyBhdCBhIFRSQUNFIGxldmVsXG4gIGlmIChhcmd2LnZlcmJvc2UpIHtcbiAgICBsZXQgbG9nTGV2ZWw6IExvZ0xldmVsO1xuICAgIHN3aXRjaCAoYXJndi52ZXJib3NlKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIGxvZ0xldmVsID0gTG9nTGV2ZWwuREVCVUc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbG9nTGV2ZWwgPSBMb2dMZXZlbC5UUkFDRTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHNldExvZ0xldmVsKGxvZ0xldmVsKTtcbiAgfVxuXG4gIC8vIERlYnVnIHNob3VsZCBhbHdheXMgaW1wbHkgdHJhY2luZ1xuICBpZiAoYXJndi5kZWJ1ZyB8fCBhcmd2LnZlcmJvc2UgPiAyKSB7XG4gICAgZW5hYmxlVHJhY2luZyh0cnVlKTtcbiAgfVxuXG4gIGlmIChhcmd2LmNpKSB7XG4gICAgc2V0Q0kodHJ1ZSk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IGNoZWNrRm9yUGxhdGZvcm1XYXJuaW5ncygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgZGVidWcoYEVycm9yIHdoaWxlIGNoZWNraW5nIGZvciBwbGF0Zm9ybSB3YXJuaW5nczogJHtlfWApO1xuICB9XG5cbiAgZGVidWcoJ0NESyB0b29sa2l0IHZlcnNpb246JywgdmVyc2lvbi5ESVNQTEFZX1ZFUlNJT04pO1xuICBkZWJ1ZygnQ29tbWFuZCBsaW5lIGFyZ3VtZW50czonLCBhcmd2KTtcblxuICBjb25zdCBjb25maWd1cmF0aW9uID0gbmV3IENvbmZpZ3VyYXRpb24oe1xuICAgIGNvbW1hbmRMaW5lQXJndW1lbnRzOiB7XG4gICAgICAuLi5hcmd2LFxuICAgICAgXzogYXJndi5fIGFzIFtDb21tYW5kLCAuLi5zdHJpbmdbXV0sIC8vIFR5cGVTY3JpcHQgYXQgaXRzIGJlc3RcbiAgICB9LFxuICB9KTtcbiAgYXdhaXQgY29uZmlndXJhdGlvbi5sb2FkKCk7XG5cbiAgY29uc3QgY21kID0gYXJndi5fWzBdO1xuXG4gIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7XG4gICAgY29udGV4dDogY29uZmlndXJhdGlvbi5jb250ZXh0LFxuICAgIG91dHB1dDogY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWydvdXRkaXInXSksXG4gICAgc2hvdWxkRGlzcGxheTogY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWydub3RpY2VzJ10pLFxuICAgIGluY2x1ZGVBY2tub3dsZWRnZWQ6IGNtZCA9PT0gJ25vdGljZXMnID8gIWFyZ3YudW5hY2tub3dsZWRnZWQgOiBmYWxzZSxcbiAgICBodHRwT3B0aW9uczoge1xuICAgICAgcHJveHlBZGRyZXNzOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ3Byb3h5J10pLFxuICAgICAgY2FCdW5kbGVQYXRoOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ2NhQnVuZGxlUGF0aCddKSxcbiAgICB9LFxuICB9KTtcbiAgYXdhaXQgbm90aWNlcy5yZWZyZXNoKCk7XG5cbiAgY29uc3Qgc2RrUHJvdmlkZXIgPSBhd2FpdCBTZGtQcm92aWRlci53aXRoQXdzQ2xpQ29tcGF0aWJsZURlZmF1bHRzKHtcbiAgICBwcm9maWxlOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ3Byb2ZpbGUnXSksXG4gICAgaHR0cE9wdGlvbnM6IHtcbiAgICAgIHByb3h5QWRkcmVzczogYXJndi5wcm94eSxcbiAgICAgIGNhQnVuZGxlUGF0aDogYXJndlsnY2EtYnVuZGxlLXBhdGgnXSxcbiAgICB9LFxuICAgIGxvZ2dlcjogbmV3IFNka1RvQ2xpTG9nZ2VyKCksXG4gIH0pO1xuXG4gIGxldCBvdXREaXJMb2NrOiBJTG9jayB8IHVuZGVmaW5lZDtcbiAgY29uc3QgY2xvdWRFeGVjdXRhYmxlID0gbmV3IENsb3VkRXhlY3V0YWJsZSh7XG4gICAgY29uZmlndXJhdGlvbixcbiAgICBzZGtQcm92aWRlcixcbiAgICBzeW50aGVzaXplcjpcbiAgICAgIHN5bnRoZXNpemVyID8/XG4gICAgICAoYXN5bmMgKGF3cywgY29uZmlnKSA9PiB7XG4gICAgICAgIC8vIEludm9rZSAnZXhlY1Byb2dyYW0nLCBhbmQgY29weSB0aGUgbG9jayBmb3IgdGhlIGRpcmVjdG9yeSBpbiB0aGUgZ2xvYmFsXG4gICAgICAgIC8vIHZhcmlhYmxlIGhlcmUuIEl0IHdpbGwgYmUgcmVsZWFzZWQgd2hlbiB0aGUgQ0xJIGV4aXRzLiBMb2NrcyBhcmUgbm90IHJlLWVudHJhbnRcbiAgICAgICAgLy8gc28gcmVsZWFzZSBpdCBpZiB3ZSBoYXZlIHRvIHN5bnRoZXNpemUgbW9yZSB0aGFuIG9uY2UgKGJlY2F1c2Ugb2YgY29udGV4dCBsb29rdXBzKS5cbiAgICAgICAgYXdhaXQgb3V0RGlyTG9jaz8ucmVsZWFzZSgpO1xuICAgICAgICBjb25zdCB7IGFzc2VtYmx5LCBsb2NrIH0gPSBhd2FpdCBleGVjUHJvZ3JhbShhd3MsIGNvbmZpZyk7XG4gICAgICAgIG91dERpckxvY2sgPSBsb2NrO1xuICAgICAgICByZXR1cm4gYXNzZW1ibHk7XG4gICAgICB9KSxcbiAgfSk7XG5cbiAgLyoqIEZ1bmN0aW9uIHRvIGxvYWQgcGx1Zy1pbnMsIHVzaW5nIGNvbmZpZ3VyYXRpb25zIGFkZGl0aXZlbHkuICovXG4gIGZ1bmN0aW9uIGxvYWRQbHVnaW5zKC4uLnNldHRpbmdzOiBTZXR0aW5nc1tdKSB7XG4gICAgY29uc3QgbG9hZGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc2V0dGluZ3MpIHtcbiAgICAgIGNvbnN0IHBsdWdpbnM6IHN0cmluZ1tdID0gc291cmNlLmdldChbJ3BsdWdpbiddKSB8fCBbXTtcbiAgICAgIGZvciAoY29uc3QgcGx1Z2luIG9mIHBsdWdpbnMpIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0cnlSZXNvbHZlKHBsdWdpbik7XG4gICAgICAgIGlmIChsb2FkZWQuaGFzKHJlc29sdmVkKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnKGBMb2FkaW5nIHBsdWctaW46ICR7Y2hhbGsuZ3JlZW4ocGx1Z2luKX0gZnJvbSAke2NoYWxrLmJsdWUocmVzb2x2ZWQpfWApO1xuICAgICAgICBQbHVnaW5Ib3N0Lmluc3RhbmNlLmxvYWQocGx1Z2luKTtcbiAgICAgICAgbG9hZGVkLmFkZChyZXNvbHZlZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJ5UmVzb2x2ZShwbHVnaW46IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcmVxdWlyZS5yZXNvbHZlKHBsdWdpbik7XG4gICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgZXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIHBsdWdpbiAke2NoYWxrLmdyZWVuKHBsdWdpbil9OiAke2Uuc3RhY2t9YCk7XG4gICAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYFVuYWJsZSB0byByZXNvbHZlIHBsdWctaW46ICR7cGx1Z2lufWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGxvYWRQbHVnaW5zKGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MpO1xuXG4gIGlmICh0eXBlb2YoY21kKSAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBGaXJzdCBhcmd1bWVudCBzaG91bGQgYmUgYSBzdHJpbmcuIEdvdDogJHtjbWR9ICgke3R5cGVvZihjbWQpfSlgKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGF3YWl0IG1haW4oY21kLCBhcmd2KTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyBJZiB3ZSBsb2NrZWQgdGhlICdjZGsub3V0JyBkaXJlY3RvcnksIHJlbGVhc2UgaXQgaGVyZS5cbiAgICBhd2FpdCBvdXREaXJMb2NrPy5yZWxlYXNlKCk7XG5cbiAgICAvLyBEbyBQU0FzIGhlcmVcbiAgICBhd2FpdCB2ZXJzaW9uLmRpc3BsYXlWZXJzaW9uTWVzc2FnZSgpO1xuXG4gICAgaWYgKGNtZCA9PT0gJ25vdGljZXMnKSB7XG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goeyBmb3JjZTogdHJ1ZSB9KTtcbiAgICAgIG5vdGljZXMuZGlzcGxheSh7IHNob3dUb3RhbDogYXJndi51bmFja25vd2xlZGdlZCB9KTtcblxuICAgIH0gZWxzZSBpZiAoY21kICE9PSAndmVyc2lvbicpIHtcbiAgICAgIGF3YWl0IG5vdGljZXMucmVmcmVzaCgpO1xuICAgICAgbm90aWNlcy5kaXNwbGF5KCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gbWFpbihjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8bnVtYmVyIHwgdm9pZD4ge1xuICAgIGNvbnN0IHRvb2xraXRTdGFja05hbWU6IHN0cmluZyA9IFRvb2xraXRJbmZvLmRldGVybWluZU5hbWUoY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWyd0b29sa2l0U3RhY2tOYW1lJ10pKTtcbiAgICBkZWJ1ZyhgVG9vbGtpdCBzdGFjazogJHtjaGFsay5ib2xkKHRvb2xraXRTdGFja05hbWUpfWApO1xuXG4gICAgY29uc3QgY2xvdWRGb3JtYXRpb24gPSBuZXcgRGVwbG95bWVudHMoeyBzZGtQcm92aWRlciwgdG9vbGtpdFN0YWNrTmFtZSB9KTtcblxuICAgIGlmIChhcmdzLmFsbCAmJiBhcmdzLlNUQUNLUykge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcignWW91IG11c3QgZWl0aGVyIHNwZWNpZnkgYSBsaXN0IG9mIFN0YWNrcyBvciB0aGUgYC0tYWxsYCBhcmd1bWVudCcpO1xuICAgIH1cblxuICAgIGFyZ3MuU1RBQ0tTID0gYXJncy5TVEFDS1MgPz8gKGFyZ3MuU1RBQ0sgPyBbYXJncy5TVEFDS10gOiBbXSk7XG4gICAgYXJncy5FTlZJUk9OTUVOVFMgPSBhcmdzLkVOVklST05NRU5UUyA/PyBbXTtcblxuICAgIGNvbnN0IHNlbGVjdG9yOiBTdGFja1NlbGVjdG9yID0ge1xuICAgICAgYWxsVG9wTGV2ZWw6IGFyZ3MuYWxsLFxuICAgICAgcGF0dGVybnM6IGFyZ3MuU1RBQ0tTLFxuICAgIH07XG5cbiAgICBjb25zdCBjbGkgPSBuZXcgQ2RrVG9vbGtpdCh7XG4gICAgICBjbG91ZEV4ZWN1dGFibGUsXG4gICAgICBkZXBsb3ltZW50czogY2xvdWRGb3JtYXRpb24sXG4gICAgICB2ZXJib3NlOiBhcmd2LnRyYWNlIHx8IGFyZ3YudmVyYm9zZSA+IDAsXG4gICAgICBpZ25vcmVFcnJvcnM6IGFyZ3ZbJ2lnbm9yZS1lcnJvcnMnXSxcbiAgICAgIHN0cmljdDogYXJndi5zdHJpY3QsXG4gICAgICBjb25maWd1cmF0aW9uLFxuICAgICAgc2RrUHJvdmlkZXIsXG4gICAgfSk7XG5cbiAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgIGNhc2UgJ2NvbnRleHQnOlxuICAgICAgICByZXR1cm4gY29udGV4dCh7XG4gICAgICAgICAgY29udGV4dDogY29uZmlndXJhdGlvbi5jb250ZXh0LFxuICAgICAgICAgIGNsZWFyOiBhcmd2LmNsZWFyLFxuICAgICAgICAgIGpzb246IGFyZ3YuanNvbixcbiAgICAgICAgICBmb3JjZTogYXJndi5mb3JjZSxcbiAgICAgICAgICByZXNldDogYXJndi5yZXNldCxcbiAgICAgICAgfSk7XG5cbiAgICAgIGNhc2UgJ2RvY3MnOlxuICAgICAgICByZXR1cm4gZG9jcyh7IGJyb3dzZXI6IGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsnYnJvd3NlciddKSB9KTtcblxuICAgICAgY2FzZSAnZG9jdG9yJzpcbiAgICAgICAgcmV0dXJuIGRvY3RvcigpO1xuXG4gICAgICBjYXNlICdscyc6XG4gICAgICBjYXNlICdsaXN0JzpcbiAgICAgICAgcmV0dXJuIGNsaS5saXN0KGFyZ3MuU1RBQ0tTLCB7XG4gICAgICAgICAgbG9uZzogYXJncy5sb25nLFxuICAgICAgICAgIGpzb246IGFyZ3YuanNvbixcbiAgICAgICAgICBzaG93RGVwczogYXJncy5zaG93RGVwZW5kZW5jaWVzLFxuICAgICAgICB9KTtcblxuICAgICAgY2FzZSAnZGlmZic6XG4gICAgICAgIGNvbnN0IGVuYWJsZURpZmZOb0ZhaWwgPSBpc0ZlYXR1cmVFbmFibGVkKGNvbmZpZ3VyYXRpb24sIGN4YXBpLkVOQUJMRV9ESUZGX05PX0ZBSUxfQ09OVEVYVCk7XG4gICAgICAgIHJldHVybiBjbGkuZGlmZih7XG4gICAgICAgICAgc3RhY2tOYW1lczogYXJncy5TVEFDS1MsXG4gICAgICAgICAgZXhjbHVzaXZlbHk6IGFyZ3MuZXhjbHVzaXZlbHksXG4gICAgICAgICAgdGVtcGxhdGVQYXRoOiBhcmdzLnRlbXBsYXRlLFxuICAgICAgICAgIHN0cmljdDogYXJncy5zdHJpY3QsXG4gICAgICAgICAgY29udGV4dExpbmVzOiBhcmdzLmNvbnRleHRMaW5lcyxcbiAgICAgICAgICBzZWN1cml0eU9ubHk6IGFyZ3Muc2VjdXJpdHlPbmx5LFxuICAgICAgICAgIGZhaWw6IGFyZ3MuZmFpbCAhPSBudWxsID8gYXJncy5mYWlsIDogIWVuYWJsZURpZmZOb0ZhaWwsXG4gICAgICAgICAgc3RyZWFtOiBhcmdzLmNpID8gcHJvY2Vzcy5zdGRvdXQgOiB1bmRlZmluZWQsXG4gICAgICAgICAgY29tcGFyZUFnYWluc3RQcm9jZXNzZWRUZW1wbGF0ZTogYXJncy5wcm9jZXNzZWQsXG4gICAgICAgICAgcXVpZXQ6IGFyZ3MucXVpZXQsXG4gICAgICAgICAgY2hhbmdlU2V0OiBhcmdzWydjaGFuZ2Utc2V0J10sXG4gICAgICAgICAgdG9vbGtpdFN0YWNrTmFtZTogdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICAgfSk7XG5cbiAgICAgIGNhc2UgJ2Jvb3RzdHJhcCc6XG4gICAgICAgIGNvbnN0IHNvdXJjZTogQm9vdHN0cmFwU291cmNlID0gZGV0ZXJtaW5lQm9vdHN0cmFwVmVyc2lvbihhcmdzKTtcblxuICAgICAgICBpZiAoYXJncy5zaG93VGVtcGxhdGUpIHtcbiAgICAgICAgICBjb25zdCBib290c3RyYXBwZXIgPSBuZXcgQm9vdHN0cmFwcGVyKHNvdXJjZSk7XG4gICAgICAgICAgcmV0dXJuIGJvb3RzdHJhcHBlci5zaG93VGVtcGxhdGUoYXJncy5qc29uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjbGkuYm9vdHN0cmFwKGFyZ3MuRU5WSVJPTk1FTlRTLCB7XG4gICAgICAgICAgc291cmNlLFxuICAgICAgICAgIHJvbGVBcm46IGFyZ3Mucm9sZUFybixcbiAgICAgICAgICBmb3JjZTogYXJndi5mb3JjZSxcbiAgICAgICAgICB0b29sa2l0U3RhY2tOYW1lOiB0b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAgIGV4ZWN1dGU6IGFyZ3MuZXhlY3V0ZSxcbiAgICAgICAgICB0YWdzOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ3RhZ3MnXSksXG4gICAgICAgICAgdGVybWluYXRpb25Qcm90ZWN0aW9uOiBhcmdzLnRlcm1pbmF0aW9uUHJvdGVjdGlvbixcbiAgICAgICAgICB1c2VQcmV2aW91c1BhcmFtZXRlcnM6IGFyZ3NbJ3ByZXZpb3VzLXBhcmFtZXRlcnMnXSxcbiAgICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICBidWNrZXROYW1lOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ3Rvb2xraXRCdWNrZXQnLCAnYnVja2V0TmFtZSddKSxcbiAgICAgICAgICAgIGttc0tleUlkOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ3Rvb2xraXRCdWNrZXQnLCAna21zS2V5SWQnXSksXG4gICAgICAgICAgICBjcmVhdGVDdXN0b21lck1hc3RlcktleTogYXJncy5ib290c3RyYXBDdXN0b21lcktleSxcbiAgICAgICAgICAgIHF1YWxpZmllcjogYXJncy5xdWFsaWZpZXIgPz8gY29uZmlndXJhdGlvbi5jb250ZXh0LmdldCgnQGF3cy1jZGsvY29yZTpib290c3RyYXBRdWFsaWZpZXInKSxcbiAgICAgICAgICAgIHB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbjogYXJncy5wdWJsaWNBY2Nlc3NCbG9ja0NvbmZpZ3VyYXRpb24sXG4gICAgICAgICAgICBleGFtcGxlUGVybWlzc2lvbnNCb3VuZGFyeTogYXJndi5leGFtcGxlUGVybWlzc2lvbnNCb3VuZGFyeSxcbiAgICAgICAgICAgIGN1c3RvbVBlcm1pc3Npb25zQm91bmRhcnk6IGFyZ3YuY3VzdG9tUGVybWlzc2lvbnNCb3VuZGFyeSxcbiAgICAgICAgICAgIHRydXN0ZWRBY2NvdW50czogYXJyYXlGcm9tWWFyZ3MoYXJncy50cnVzdCksXG4gICAgICAgICAgICB0cnVzdGVkQWNjb3VudHNGb3JMb29rdXA6IGFycmF5RnJvbVlhcmdzKGFyZ3MudHJ1c3RGb3JMb29rdXApLFxuICAgICAgICAgICAgY2xvdWRGb3JtYXRpb25FeGVjdXRpb25Qb2xpY2llczogYXJyYXlGcm9tWWFyZ3MoYXJncy5jbG91ZGZvcm1hdGlvbkV4ZWN1dGlvblBvbGljaWVzKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgY2FzZSAnZGVwbG95JzpcbiAgICAgICAgY29uc3QgcGFyYW1ldGVyTWFwOiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQgfSA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IHBhcmFtZXRlciBvZiBhcmdzLnBhcmFtZXRlcnMpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtZXRlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IGtleVZhbHVlID0gKHBhcmFtZXRlciBhcyBzdHJpbmcpLnNwbGl0KCc9Jyk7XG4gICAgICAgICAgICBwYXJhbWV0ZXJNYXBba2V5VmFsdWVbMF1dID0ga2V5VmFsdWUuc2xpY2UoMSkuam9pbignPScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhcmdzLmV4ZWN1dGUgIT09IHVuZGVmaW5lZCAmJiBhcmdzLm1ldGhvZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcignQ2FuIG5vdCBzdXBwbHkgYm90aCAtLVtuby1dZXhlY3V0ZSBhbmQgLS1tZXRob2QgYXQgdGhlIHNhbWUgdGltZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGRlcGxveW1lbnRNZXRob2Q6IERlcGxveW1lbnRNZXRob2QgfCB1bmRlZmluZWQ7XG4gICAgICAgIHN3aXRjaCAoYXJncy5tZXRob2QpIHtcbiAgICAgICAgICBjYXNlICdkaXJlY3QnOlxuICAgICAgICAgICAgaWYgKGFyZ3MuY2hhbmdlU2V0TmFtZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCctLWNoYW5nZS1zZXQtbmFtZSBjYW5ub3QgYmUgdXNlZCB3aXRoIG1ldGhvZD1kaXJlY3QnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhcmdzLmltcG9ydEV4aXN0aW5nUmVzb3VyY2VzKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignLS1pbXBvcnQtZXhpc3RpbmctcmVzb3VyY2VzIGNhbm5vdCBiZSBlbmFibGVkIHdpdGggbWV0aG9kPWRpcmVjdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVwbG95bWVudE1ldGhvZCA9IHsgbWV0aG9kOiAnZGlyZWN0JyB9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnY2hhbmdlLXNldCc6XG4gICAgICAgICAgICBkZXBsb3ltZW50TWV0aG9kID0ge1xuICAgICAgICAgICAgICBtZXRob2Q6ICdjaGFuZ2Utc2V0JyxcbiAgICAgICAgICAgICAgZXhlY3V0ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgY2hhbmdlU2V0TmFtZTogYXJncy5jaGFuZ2VTZXROYW1lLFxuICAgICAgICAgICAgICBpbXBvcnRFeGlzdGluZ1Jlc291cmNlczogYXJncy5pbXBvcnRFeGlzdGluZ1Jlc291cmNlcyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdwcmVwYXJlLWNoYW5nZS1zZXQnOlxuICAgICAgICAgICAgZGVwbG95bWVudE1ldGhvZCA9IHtcbiAgICAgICAgICAgICAgbWV0aG9kOiAnY2hhbmdlLXNldCcsXG4gICAgICAgICAgICAgIGV4ZWN1dGU6IGZhbHNlLFxuICAgICAgICAgICAgICBjaGFuZ2VTZXROYW1lOiBhcmdzLmNoYW5nZVNldE5hbWUsXG4gICAgICAgICAgICAgIGltcG9ydEV4aXN0aW5nUmVzb3VyY2VzOiBhcmdzLmltcG9ydEV4aXN0aW5nUmVzb3VyY2VzLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICAgICAgZGVwbG95bWVudE1ldGhvZCA9IHtcbiAgICAgICAgICAgICAgbWV0aG9kOiAnY2hhbmdlLXNldCcsXG4gICAgICAgICAgICAgIGV4ZWN1dGU6IGFyZ3MuZXhlY3V0ZSA/PyB0cnVlLFxuICAgICAgICAgICAgICBjaGFuZ2VTZXROYW1lOiBhcmdzLmNoYW5nZVNldE5hbWUsXG4gICAgICAgICAgICAgIGltcG9ydEV4aXN0aW5nUmVzb3VyY2VzOiBhcmdzLmltcG9ydEV4aXN0aW5nUmVzb3VyY2VzLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNsaS5kZXBsb3koe1xuICAgICAgICAgIHNlbGVjdG9yLFxuICAgICAgICAgIGV4Y2x1c2l2ZWx5OiBhcmdzLmV4Y2x1c2l2ZWx5LFxuICAgICAgICAgIHRvb2xraXRTdGFja05hbWUsXG4gICAgICAgICAgcm9sZUFybjogYXJncy5yb2xlQXJuLFxuICAgICAgICAgIG5vdGlmaWNhdGlvbkFybnM6IGFyZ3Mubm90aWZpY2F0aW9uQXJucyxcbiAgICAgICAgICByZXF1aXJlQXBwcm92YWw6IGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsncmVxdWlyZUFwcHJvdmFsJ10pLFxuICAgICAgICAgIHJldXNlQXNzZXRzOiBhcmdzWydidWlsZC1leGNsdWRlJ10sXG4gICAgICAgICAgdGFnczogY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWyd0YWdzJ10pLFxuICAgICAgICAgIGRlcGxveW1lbnRNZXRob2QsXG4gICAgICAgICAgZm9yY2U6IGFyZ3MuZm9yY2UsXG4gICAgICAgICAgcGFyYW1ldGVyczogcGFyYW1ldGVyTWFwLFxuICAgICAgICAgIHVzZVByZXZpb3VzUGFyYW1ldGVyczogYXJnc1sncHJldmlvdXMtcGFyYW1ldGVycyddLFxuICAgICAgICAgIG91dHB1dHNGaWxlOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ291dHB1dHNGaWxlJ10pLFxuICAgICAgICAgIHByb2dyZXNzOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ3Byb2dyZXNzJ10pLFxuICAgICAgICAgIGNpOiBhcmdzLmNpLFxuICAgICAgICAgIHJvbGxiYWNrOiBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ3JvbGxiYWNrJ10pLFxuICAgICAgICAgIGhvdHN3YXA6IGRldGVybWluZUhvdHN3YXBNb2RlKGFyZ3MuaG90c3dhcCwgYXJncy5ob3Rzd2FwRmFsbGJhY2spLFxuICAgICAgICAgIHdhdGNoOiBhcmdzLndhdGNoLFxuICAgICAgICAgIHRyYWNlTG9nczogYXJncy5sb2dzLFxuICAgICAgICAgIGNvbmN1cnJlbmN5OiBhcmdzLmNvbmN1cnJlbmN5LFxuICAgICAgICAgIGFzc2V0UGFyYWxsZWxpc206IGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsnYXNzZXRQYXJhbGxlbGlzbSddKSxcbiAgICAgICAgICBhc3NldEJ1aWxkVGltZTogY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWydhc3NldFByZWJ1aWxkJ10pXG4gICAgICAgICAgICA/IEFzc2V0QnVpbGRUaW1lLkFMTF9CRUZPUkVfREVQTE9ZXG4gICAgICAgICAgICA6IEFzc2V0QnVpbGRUaW1lLkpVU1RfSU5fVElNRSxcbiAgICAgICAgICBpZ25vcmVOb1N0YWNrczogYXJncy5pZ25vcmVOb1N0YWNrcyxcbiAgICAgICAgfSk7XG5cbiAgICAgIGNhc2UgJ3JvbGxiYWNrJzpcbiAgICAgICAgcmV0dXJuIGNsaS5yb2xsYmFjayh7XG4gICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICAgICByb2xlQXJuOiBhcmdzLnJvbGVBcm4sXG4gICAgICAgICAgZm9yY2U6IGFyZ3MuZm9yY2UsXG4gICAgICAgICAgdmFsaWRhdGVCb290c3RyYXBTdGFja1ZlcnNpb246IGFyZ3NbJ3ZhbGlkYXRlLWJvb3RzdHJhcC12ZXJzaW9uJ10sXG4gICAgICAgICAgb3JwaGFuTG9naWNhbElkczogYXJncy5vcnBoYW4sXG4gICAgICAgIH0pO1xuXG4gICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICByZXR1cm4gY2xpLmltcG9ydCh7XG4gICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgdG9vbGtpdFN0YWNrTmFtZSxcbiAgICAgICAgICByb2xlQXJuOiBhcmdzLnJvbGVBcm4sXG4gICAgICAgICAgZGVwbG95bWVudE1ldGhvZDoge1xuICAgICAgICAgICAgbWV0aG9kOiAnY2hhbmdlLXNldCcsXG4gICAgICAgICAgICBleGVjdXRlOiBhcmdzLmV4ZWN1dGUsXG4gICAgICAgICAgICBjaGFuZ2VTZXROYW1lOiBhcmdzLmNoYW5nZVNldE5hbWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwcm9ncmVzczogY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWydwcm9ncmVzcyddKSxcbiAgICAgICAgICByb2xsYmFjazogY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWydyb2xsYmFjayddKSxcbiAgICAgICAgICByZWNvcmRSZXNvdXJjZU1hcHBpbmc6IGFyZ3NbJ3JlY29yZC1yZXNvdXJjZS1tYXBwaW5nJ10sXG4gICAgICAgICAgcmVzb3VyY2VNYXBwaW5nRmlsZTogYXJnc1sncmVzb3VyY2UtbWFwcGluZyddLFxuICAgICAgICAgIGZvcmNlOiBhcmdzLmZvcmNlLFxuICAgICAgICB9KTtcblxuICAgICAgY2FzZSAnd2F0Y2gnOlxuICAgICAgICByZXR1cm4gY2xpLndhdGNoKHtcbiAgICAgICAgICBzZWxlY3RvcixcbiAgICAgICAgICBleGNsdXNpdmVseTogYXJncy5leGNsdXNpdmVseSxcbiAgICAgICAgICB0b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICAgIHJvbGVBcm46IGFyZ3Mucm9sZUFybixcbiAgICAgICAgICByZXVzZUFzc2V0czogYXJnc1snYnVpbGQtZXhjbHVkZSddLFxuICAgICAgICAgIGRlcGxveW1lbnRNZXRob2Q6IHtcbiAgICAgICAgICAgIG1ldGhvZDogJ2NoYW5nZS1zZXQnLFxuICAgICAgICAgICAgY2hhbmdlU2V0TmFtZTogYXJncy5jaGFuZ2VTZXROYW1lLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZm9yY2U6IGFyZ3MuZm9yY2UsXG4gICAgICAgICAgcHJvZ3Jlc3M6IGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsncHJvZ3Jlc3MnXSksXG4gICAgICAgICAgcm9sbGJhY2s6IGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsncm9sbGJhY2snXSksXG4gICAgICAgICAgaG90c3dhcDogZGV0ZXJtaW5lSG90c3dhcE1vZGUoYXJncy5ob3Rzd2FwLCBhcmdzLmhvdHN3YXBGYWxsYmFjaywgdHJ1ZSksXG4gICAgICAgICAgdHJhY2VMb2dzOiBhcmdzLmxvZ3MsXG4gICAgICAgICAgY29uY3VycmVuY3k6IGFyZ3MuY29uY3VycmVuY3ksXG4gICAgICAgIH0pO1xuXG4gICAgICBjYXNlICdkZXN0cm95JzpcbiAgICAgICAgcmV0dXJuIGNsaS5kZXN0cm95KHtcbiAgICAgICAgICBzZWxlY3RvcixcbiAgICAgICAgICBleGNsdXNpdmVseTogYXJncy5leGNsdXNpdmVseSxcbiAgICAgICAgICBmb3JjZTogYXJncy5mb3JjZSxcbiAgICAgICAgICByb2xlQXJuOiBhcmdzLnJvbGVBcm4sXG4gICAgICAgICAgY2k6IGFyZ3MuY2ksXG4gICAgICAgIH0pO1xuXG4gICAgICBjYXNlICdnYyc6XG4gICAgICAgIGlmICghY29uZmlndXJhdGlvbi5zZXR0aW5ncy5nZXQoWyd1bnN0YWJsZSddKS5pbmNsdWRlcygnZ2MnKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoJ1Vuc3RhYmxlIGZlYXR1cmUgdXNlOiBcXCdnY1xcJyBpcyB1bnN0YWJsZS4gSXQgbXVzdCBiZSBvcHRlZCBpbiB2aWEgXFwnLS11bnN0YWJsZVxcJywgZS5nLiBcXCdjZGsgZ2MgLS11bnN0YWJsZT1nY1xcJycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbGkuZ2FyYmFnZUNvbGxlY3QoYXJncy5FTlZJUk9OTUVOVFMsIHtcbiAgICAgICAgICBhY3Rpb246IGFyZ3MuYWN0aW9uLFxuICAgICAgICAgIHR5cGU6IGFyZ3MudHlwZSxcbiAgICAgICAgICByb2xsYmFja0J1ZmZlckRheXM6IGFyZ3NbJ3JvbGxiYWNrLWJ1ZmZlci1kYXlzJ10sXG4gICAgICAgICAgY3JlYXRlZEJ1ZmZlckRheXM6IGFyZ3NbJ2NyZWF0ZWQtYnVmZmVyLWRheXMnXSxcbiAgICAgICAgICBib290c3RyYXBTdGFja05hbWU6IGFyZ3MuYm9vdHN0cmFwU3RhY2tOYW1lLFxuICAgICAgICAgIGNvbmZpcm06IGFyZ3MuY29uZmlybSxcbiAgICAgICAgfSk7XG5cbiAgICAgIGNhc2UgJ3N5bnRoZXNpemUnOlxuICAgICAgY2FzZSAnc3ludGgnOlxuICAgICAgICBjb25zdCBxdWlldCA9IGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsncXVpZXQnXSkgPz8gYXJncy5xdWlldDtcbiAgICAgICAgaWYgKGFyZ3MuZXhjbHVzaXZlbHkpIHtcbiAgICAgICAgICByZXR1cm4gY2xpLnN5bnRoKGFyZ3MuU1RBQ0tTLCBhcmdzLmV4Y2x1c2l2ZWx5LCBxdWlldCwgYXJncy52YWxpZGF0aW9uLCBhcmd2Lmpzb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBjbGkuc3ludGgoYXJncy5TVEFDS1MsIHRydWUsIHF1aWV0LCBhcmdzLnZhbGlkYXRpb24sIGFyZ3YuanNvbik7XG4gICAgICAgIH1cblxuICAgICAgY2FzZSAnbm90aWNlcyc6XG4gICAgICAgIC8vIFRoaXMgaXMgYSB2YWxpZCBjb21tYW5kLCBidXQgd2UncmUgcG9zdHBvbmluZyBpdHMgZXhlY3V0aW9uXG4gICAgICAgIHJldHVybjtcblxuICAgICAgY2FzZSAnbWV0YWRhdGEnOlxuICAgICAgICByZXR1cm4gY2xpLm1ldGFkYXRhKGFyZ3MuU1RBQ0ssIGFyZ3YuanNvbik7XG5cbiAgICAgIGNhc2UgJ2Fja25vd2xlZGdlJzpcbiAgICAgIGNhc2UgJ2Fjayc6XG4gICAgICAgIHJldHVybiBjbGkuYWNrbm93bGVkZ2UoYXJncy5JRCk7XG5cbiAgICAgIGNhc2UgJ2luaXQnOlxuICAgICAgICBjb25zdCBsYW5ndWFnZSA9IGNvbmZpZ3VyYXRpb24uc2V0dGluZ3MuZ2V0KFsnbGFuZ3VhZ2UnXSk7XG4gICAgICAgIGlmIChhcmdzLmxpc3QpIHtcbiAgICAgICAgICByZXR1cm4gcHJpbnRBdmFpbGFibGVUZW1wbGF0ZXMobGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBjbGlJbml0KHtcbiAgICAgICAgICAgIHR5cGU6IGFyZ3MuVEVNUExBVEUsXG4gICAgICAgICAgICBsYW5ndWFnZSxcbiAgICAgICAgICAgIGNhblVzZU5ldHdvcms6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGdlbmVyYXRlT25seTogYXJncy5nZW5lcmF0ZU9ubHksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIGNhc2UgJ21pZ3JhdGUnOlxuICAgICAgICByZXR1cm4gY2xpLm1pZ3JhdGUoe1xuICAgICAgICAgIHN0YWNrTmFtZTogYXJnc1snc3RhY2stbmFtZSddLFxuICAgICAgICAgIGZyb21QYXRoOiBhcmdzWydmcm9tLXBhdGgnXSxcbiAgICAgICAgICBmcm9tU3RhY2s6IGFyZ3NbJ2Zyb20tc3RhY2snXSxcbiAgICAgICAgICBsYW5ndWFnZTogYXJncy5sYW5ndWFnZSxcbiAgICAgICAgICBvdXRwdXRQYXRoOiBhcmdzWydvdXRwdXQtcGF0aCddLFxuICAgICAgICAgIGZyb21TY2FuOiBnZXRNaWdyYXRlU2NhblR5cGUoYXJnc1snZnJvbS1zY2FuJ10pLFxuICAgICAgICAgIGZpbHRlcjogYXJncy5maWx0ZXIsXG4gICAgICAgICAgYWNjb3VudDogYXJncy5hY2NvdW50LFxuICAgICAgICAgIHJlZ2lvbjogYXJncy5yZWdpb24sXG4gICAgICAgICAgY29tcHJlc3M6IGFyZ3MuY29tcHJlc3MsXG4gICAgICAgIH0pO1xuICAgICAgY2FzZSAndmVyc2lvbic6XG4gICAgICAgIHJldHVybiBkYXRhKHZlcnNpb24uRElTUExBWV9WRVJTSU9OKTtcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcignVW5rbm93biBjb21tYW5kOiAnICsgY29tbWFuZCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIHdoaWNoIHZlcnNpb24gb2YgYm9vdHN0cmFwcGluZ1xuICovXG5mdW5jdGlvbiBkZXRlcm1pbmVCb290c3RyYXBWZXJzaW9uKGFyZ3M6IHsgdGVtcGxhdGU/OiBzdHJpbmcgfSk6IEJvb3RzdHJhcFNvdXJjZSB7XG4gIGxldCBzb3VyY2U6IEJvb3RzdHJhcFNvdXJjZTtcbiAgaWYgKGFyZ3MudGVtcGxhdGUpIHtcbiAgICBwcmludChgVXNpbmcgYm9vdHN0cmFwcGluZyB0ZW1wbGF0ZSBmcm9tICR7YXJncy50ZW1wbGF0ZX1gKTtcbiAgICBzb3VyY2UgPSB7IHNvdXJjZTogJ2N1c3RvbScsIHRlbXBsYXRlRmlsZTogYXJncy50ZW1wbGF0ZSB9O1xuICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52LkNES19MRUdBQ1lfQk9PVFNUUkFQKSB7XG4gICAgcHJpbnQoJ0NES19MRUdBQ1lfQk9PVFNUUkFQIHNldCwgdXNpbmcgbGVnYWN5LXN0eWxlIGJvb3RzdHJhcHBpbmcnKTtcbiAgICBzb3VyY2UgPSB7IHNvdXJjZTogJ2xlZ2FjeScgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBpbiBWMiwgdGhlIFwibmV3XCIgYm9vdHN0cmFwcGluZyBpcyB0aGUgZGVmYXVsdFxuICAgIHNvdXJjZSA9IHsgc291cmNlOiAnZGVmYXVsdCcgfTtcbiAgfVxuICByZXR1cm4gc291cmNlO1xufVxuXG5mdW5jdGlvbiBpc0ZlYXR1cmVFbmFibGVkKGNvbmZpZ3VyYXRpb246IENvbmZpZ3VyYXRpb24sIGZlYXR1cmVGbGFnOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNvbmZpZ3VyYXRpb24uY29udGV4dC5nZXQoZmVhdHVyZUZsYWcpID8/IGN4YXBpLmZ1dHVyZUZsYWdEZWZhdWx0KGZlYXR1cmVGbGFnKTtcbn1cblxuLyoqXG4gKiBUcmFuc2xhdGUgYSBZYXJncyBpbnB1dCBhcnJheSB0byBzb21ldGhpbmcgdGhhdCBtYWtlcyBtb3JlIHNlbnNlIGluIGEgcHJvZ3JhbW1pbmcgbGFuZ3VhZ2VcbiAqIG1vZGVsICh0ZWxsaW5nIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gYWJzZW5jZSBhbmQgYW4gZW1wdHkgYXJyYXkpXG4gKlxuICogLSBBbiBlbXB0eSBhcnJheSBpcyB0aGUgZGVmYXVsdCBjYXNlLCBtZWFuaW5nIHRoZSB1c2VyIGRpZG4ndCBwYXNzIGFueSBhcmd1bWVudHMuIFdlIHJldHVyblxuICogICB1bmRlZmluZWQuXG4gKiAtIElmIHRoZSB1c2VyIHBhc3NlZCBhIHNpbmdsZSBlbXB0eSBzdHJpbmcsIHRoZXkgZGlkIHNvbWV0aGluZyBsaWtlIGAtLWFycmF5PWAsIHdoaWNoIHdlJ2xsXG4gKiAgIHRha2UgdG8gbWVhbiB0aGV5IHBhc3NlZCBhbiBlbXB0eSBhcnJheS5cbiAqL1xuZnVuY3Rpb24gYXJyYXlGcm9tWWFyZ3MoeHM6IHN0cmluZ1tdKTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xuICBpZiAoeHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4geHMuZmlsdGVyKCh4KSA9PiB4ICE9PSAnJyk7XG59XG5cbmZ1bmN0aW9uIGRldGVybWluZUhvdHN3YXBNb2RlKGhvdHN3YXA/OiBib29sZWFuLCBob3Rzd2FwRmFsbGJhY2s/OiBib29sZWFuLCB3YXRjaD86IGJvb2xlYW4pOiBIb3Rzd2FwTW9kZSB7XG4gIGlmIChob3Rzd2FwICYmIGhvdHN3YXBGYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoJ0NhbiBub3Qgc3VwcGx5IGJvdGggLS1ob3Rzd2FwIGFuZCAtLWhvdHN3YXAtZmFsbGJhY2sgYXQgdGhlIHNhbWUgdGltZScpO1xuICB9IGVsc2UgaWYgKCFob3Rzd2FwICYmICFob3Rzd2FwRmFsbGJhY2spIHtcbiAgICBpZiAoaG90c3dhcCA9PT0gdW5kZWZpbmVkICYmIGhvdHN3YXBGYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gd2F0Y2ggPyBIb3Rzd2FwTW9kZS5IT1RTV0FQX09OTFkgOiBIb3Rzd2FwTW9kZS5GVUxMX0RFUExPWU1FTlQ7XG4gICAgfSBlbHNlIGlmIChob3Rzd2FwID09PSBmYWxzZSB8fCBob3Rzd2FwRmFsbGJhY2sgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gSG90c3dhcE1vZGUuRlVMTF9ERVBMT1lNRU5UO1xuICAgIH1cbiAgfVxuXG4gIGxldCBob3Rzd2FwTW9kZTogSG90c3dhcE1vZGU7XG4gIGlmIChob3Rzd2FwKSB7XG4gICAgaG90c3dhcE1vZGUgPSBIb3Rzd2FwTW9kZS5IT1RTV0FQX09OTFk7XG4gIC8qaWYgKGhvdHN3YXBGYWxsYmFjaykqL1xuICB9IGVsc2Uge1xuICAgIGhvdHN3YXBNb2RlID0gSG90c3dhcE1vZGUuRkFMTF9CQUNLO1xuICB9XG5cbiAgcmV0dXJuIGhvdHN3YXBNb2RlO1xufVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dDogd2UgbmV2ZXIgY2FsbCB0aGlzIGluIHVuaXQgdGVzdHMgKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGkoYXJnczogc3RyaW5nW10gPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpIHtcbiAgZXhlYyhhcmdzKVxuICAgIC50aGVuKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgIGVycm9yKGVyci5tZXNzYWdlKTtcblxuICAgICAgLy8gTG9nIHRoZSBzdGFjayB0cmFjZSBpZiB3ZSdyZSBvbiBhIGRldmVsb3BlciB3b3Jrc3RhdGlvbi4gT3RoZXJ3aXNlIHRoaXMgd2lsbCBiZSBpbnRvIGEgbWluaWZpZWRcbiAgICAgIC8vIGZpbGUgYW5kIHRoZSBwcmludGVkIGNvZGUgbGluZSBhbmQgc3RhY2sgdHJhY2UgYXJlIGh1Z2UgYW5kIHVzZWxlc3MuXG4gICAgICBpZiAoZXJyLnN0YWNrICYmIHZlcnNpb24uaXNEZXZlbG9wZXJCdWlsZCgpKSB7XG4gICAgICAgIGRlYnVnKGVyci5zdGFjayk7XG4gICAgICB9XG4gICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgICB9KTtcbn1cbiJdfQ==