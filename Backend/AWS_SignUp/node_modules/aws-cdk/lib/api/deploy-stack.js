"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIsSuccessfulDeployStackResult = assertIsSuccessfulDeployStackResult;
exports.deployStack = deployStack;
exports.destroyStack = destroyStack;
const chalk = require("chalk");
const uuid = require("uuid");
const evaluate_cloudformation_template_1 = require("./evaluate-cloudformation-template");
const common_1 = require("./hotswap/common");
const hotswap_deployments_1 = require("./hotswap-deployments");
const assets_1 = require("../assets");
const logging_1 = require("../logging");
const cloudformation_1 = require("./util/cloudformation");
const stack_activity_monitor_1 = require("./util/cloudformation/stack-activity-monitor");
const template_body_parameter_1 = require("./util/template-body-parameter");
const asset_manifest_builder_1 = require("../util/asset-manifest-builder");
const checks_1 = require("./util/checks");
const asset_publishing_1 = require("../util/asset-publishing");
function assertIsSuccessfulDeployStackResult(x) {
    if (x.type !== 'did-deploy-stack') {
        throw new Error(`Unexpected deployStack result. This should not happen: ${JSON.stringify(x)}. If you are seeing this error, please report it at https://github.com/aws/aws-cdk/issues/new/choose.`);
    }
}
async function deployStack(options) {
    const stackArtifact = options.stack;
    const stackEnv = options.resolvedEnvironment;
    options.sdk.appendCustomUserAgent(options.extraUserAgent);
    const cfn = options.sdk.cloudFormation();
    const deployName = options.deployName || stackArtifact.stackName;
    let cloudFormationStack = await cloudformation_1.CloudFormationStack.lookup(cfn, deployName);
    if (cloudFormationStack.stackStatus.isCreationFailure) {
        (0, logging_1.debug)(`Found existing stack ${deployName} that had previously failed creation. Deleting it before attempting to re-create it.`);
        await cfn.deleteStack({ StackName: deployName });
        const deletedStack = await (0, cloudformation_1.waitForStackDelete)(cfn, deployName);
        if (deletedStack && deletedStack.stackStatus.name !== 'DELETE_COMPLETE') {
            throw new Error(`Failed deleting stack ${deployName} that had previously failed creation (current state: ${deletedStack.stackStatus})`);
        }
        // Update variable to mark that the stack does not exist anymore, but avoid
        // doing an actual lookup in CloudFormation (which would be silly to do if
        // we just deleted it).
        cloudFormationStack = cloudformation_1.CloudFormationStack.doesNotExist(cfn, deployName);
    }
    // Detect "legacy" assets (which remain in the metadata) and publish them via
    // an ad-hoc asset manifest, while passing their locations via template
    // parameters.
    const legacyAssets = new asset_manifest_builder_1.AssetManifestBuilder();
    const assetParams = await (0, assets_1.addMetadataAssetsToManifest)(stackArtifact, legacyAssets, options.envResources, options.reuseAssets);
    const finalParameterValues = { ...options.parameters, ...assetParams };
    const templateParams = cloudformation_1.TemplateParameters.fromTemplate(stackArtifact.template);
    const stackParams = options.usePreviousParameters
        ? templateParams.updateExisting(finalParameterValues, cloudFormationStack.parameters)
        : templateParams.supplyAll(finalParameterValues);
    const hotswapMode = options.hotswap ?? common_1.HotswapMode.FULL_DEPLOYMENT;
    const hotswapPropertyOverrides = options.hotswapPropertyOverrides ?? new common_1.HotswapPropertyOverrides();
    if (await canSkipDeploy(options, cloudFormationStack, stackParams.hasChanges(cloudFormationStack.parameters))) {
        (0, logging_1.debug)(`${deployName}: skipping deployment (use --force to override)`);
        // if we can skip deployment and we are performing a hotswap, let the user know
        // that no hotswap deployment happened
        if (hotswapMode !== common_1.HotswapMode.FULL_DEPLOYMENT) {
            (0, logging_1.print)(`\n ${common_1.ICON} %s\n`, chalk.bold('hotswap deployment skipped - no changes were detected (use --force to override)'));
        }
        return {
            type: 'did-deploy-stack',
            noOp: true,
            outputs: cloudFormationStack.outputs,
            stackArn: cloudFormationStack.stackId,
        };
    }
    else {
        (0, logging_1.debug)(`${deployName}: deploying...`);
    }
    const bodyParameter = await (0, template_body_parameter_1.makeBodyParameter)(stackArtifact, options.resolvedEnvironment, legacyAssets, options.envResources, options.overrideTemplate);
    let bootstrapStackName;
    try {
        bootstrapStackName = (await options.envResources.lookupToolkit()).stackName;
    }
    catch (e) {
        (0, logging_1.debug)(`Could not determine the bootstrap stack name: ${e}`);
    }
    await (0, asset_publishing_1.publishAssets)(legacyAssets.toManifest(stackArtifact.assembly.directory), options.sdkProvider, stackEnv, {
        parallel: options.assetParallelism,
        allowCrossAccount: await (0, checks_1.determineAllowCrossAccountAssetPublishing)(options.sdk, bootstrapStackName),
    });
    if (hotswapMode !== common_1.HotswapMode.FULL_DEPLOYMENT) {
        // attempt to short-circuit the deployment if possible
        try {
            const hotswapDeploymentResult = await (0, hotswap_deployments_1.tryHotswapDeployment)(options.sdkProvider, stackParams.values, cloudFormationStack, stackArtifact, hotswapMode, hotswapPropertyOverrides);
            if (hotswapDeploymentResult) {
                return hotswapDeploymentResult;
            }
            (0, logging_1.print)('Could not perform a hotswap deployment, as the stack %s contains non-Asset changes', stackArtifact.displayName);
        }
        catch (e) {
            if (!(e instanceof evaluate_cloudformation_template_1.CfnEvaluationException)) {
                throw e;
            }
            (0, logging_1.print)('Could not perform a hotswap deployment, because the CloudFormation template could not be resolved: %s', e.message);
        }
        if (hotswapMode === common_1.HotswapMode.FALL_BACK) {
            (0, logging_1.print)('Falling back to doing a full deployment');
            options.sdk.appendCustomUserAgent('cdk-hotswap/fallback');
        }
        else {
            return {
                type: 'did-deploy-stack',
                noOp: true,
                stackArn: cloudFormationStack.stackId,
                outputs: cloudFormationStack.outputs,
            };
        }
    }
    // could not short-circuit the deployment, perform a full CFN deploy instead
    const fullDeployment = new FullCloudFormationDeployment(options, cloudFormationStack, stackArtifact, stackParams, bodyParameter);
    return fullDeployment.performDeployment();
}
/**
 * This class shares state and functionality between the different full deployment modes
 */
class FullCloudFormationDeployment {
    constructor(options, cloudFormationStack, stackArtifact, stackParams, bodyParameter) {
        this.options = options;
        this.cloudFormationStack = cloudFormationStack;
        this.stackArtifact = stackArtifact;
        this.stackParams = stackParams;
        this.bodyParameter = bodyParameter;
        this.cfn = options.sdk.cloudFormation();
        this.stackName = options.deployName ?? stackArtifact.stackName;
        this.update = cloudFormationStack.exists && cloudFormationStack.stackStatus.name !== 'REVIEW_IN_PROGRESS';
        this.verb = this.update ? 'update' : 'create';
        this.uuid = uuid.v4();
    }
    async performDeployment() {
        const deploymentMethod = this.options.deploymentMethod ?? {
            method: 'change-set',
        };
        if (deploymentMethod.method === 'direct' && this.options.resourcesToImport) {
            throw new Error('Importing resources requires a changeset deployment');
        }
        switch (deploymentMethod.method) {
            case 'change-set':
                return this.changeSetDeployment(deploymentMethod);
            case 'direct':
                return this.directDeployment();
        }
    }
    async changeSetDeployment(deploymentMethod) {
        const changeSetName = deploymentMethod.changeSetName ?? 'cdk-deploy-change-set';
        const execute = deploymentMethod.execute ?? true;
        const importExistingResources = deploymentMethod.importExistingResources ?? false;
        const changeSetDescription = await this.createChangeSet(changeSetName, execute, importExistingResources);
        await this.updateTerminationProtection();
        if ((0, cloudformation_1.changeSetHasNoChanges)(changeSetDescription)) {
            (0, logging_1.debug)('No changes are to be performed on %s.', this.stackName);
            if (execute) {
                (0, logging_1.debug)('Deleting empty change set %s', changeSetDescription.ChangeSetId);
                await this.cfn.deleteChangeSet({
                    StackName: this.stackName,
                    ChangeSetName: changeSetName,
                });
            }
            if (this.options.force) {
                (0, logging_1.warning)([
                    'You used the --force flag, but CloudFormation reported that the deployment would not make any changes.',
                    'According to CloudFormation, all resources are already up-to-date with the state in your CDK app.',
                    '',
                    'You cannot use the --force flag to get rid of changes you made in the console. Try using',
                    'CloudFormation drift detection instead: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html',
                ].join('\n'));
            }
            return {
                type: 'did-deploy-stack',
                noOp: true,
                outputs: this.cloudFormationStack.outputs,
                stackArn: changeSetDescription.StackId,
            };
        }
        if (!execute) {
            (0, logging_1.print)('Changeset %s created and waiting in review for manual execution (--no-execute)', changeSetDescription.ChangeSetId);
            return {
                type: 'did-deploy-stack',
                noOp: false,
                outputs: this.cloudFormationStack.outputs,
                stackArn: changeSetDescription.StackId,
            };
        }
        // If there are replacements in the changeset, check the rollback flag and stack status
        const replacement = hasReplacement(changeSetDescription);
        const isPausedFailState = this.cloudFormationStack.stackStatus.isRollbackable;
        const rollback = this.options.rollback ?? true;
        if (isPausedFailState && replacement) {
            return { type: 'failpaused-need-rollback-first', reason: 'replacement', status: this.cloudFormationStack.stackStatus.name };
        }
        if (isPausedFailState && rollback) {
            return { type: 'failpaused-need-rollback-first', reason: 'not-norollback', status: this.cloudFormationStack.stackStatus.name };
        }
        if (!rollback && replacement) {
            return { type: 'replacement-requires-rollback' };
        }
        return this.executeChangeSet(changeSetDescription);
    }
    async createChangeSet(changeSetName, willExecute, importExistingResources) {
        await this.cleanupOldChangeset(changeSetName);
        (0, logging_1.debug)(`Attempting to create ChangeSet with name ${changeSetName} to ${this.verb} stack ${this.stackName}`);
        (0, logging_1.print)('%s: creating CloudFormation changeset...', chalk.bold(this.stackName));
        const changeSet = await this.cfn.createChangeSet({
            StackName: this.stackName,
            ChangeSetName: changeSetName,
            ChangeSetType: this.options.resourcesToImport ? 'IMPORT' : this.update ? 'UPDATE' : 'CREATE',
            ResourcesToImport: this.options.resourcesToImport,
            Description: `CDK Changeset for execution ${this.uuid}`,
            ClientToken: `create${this.uuid}`,
            ImportExistingResources: importExistingResources,
            ...this.commonPrepareOptions(),
        });
        (0, logging_1.debug)('Initiated creation of changeset: %s; waiting for it to finish creating...', changeSet.Id);
        // Fetching all pages if we'll execute, so we can have the correct change count when monitoring.
        return (0, cloudformation_1.waitForChangeSet)(this.cfn, this.stackName, changeSetName, {
            fetchAll: willExecute,
        });
    }
    async executeChangeSet(changeSet) {
        (0, logging_1.debug)('Initiating execution of changeset %s on stack %s', changeSet.ChangeSetId, this.stackName);
        await this.cfn.executeChangeSet({
            StackName: this.stackName,
            ChangeSetName: changeSet.ChangeSetName,
            ClientRequestToken: `exec${this.uuid}`,
            ...this.commonExecuteOptions(),
        });
        (0, logging_1.debug)('Execution of changeset %s on stack %s has started; waiting for the update to complete...', changeSet.ChangeSetId, this.stackName);
        // +1 for the extra event emitted from updates.
        const changeSetLength = (changeSet.Changes ?? []).length + (this.update ? 1 : 0);
        return this.monitorDeployment(changeSet.CreationTime, changeSetLength);
    }
    async cleanupOldChangeset(changeSetName) {
        if (this.cloudFormationStack.exists) {
            // Delete any existing change sets generated by CDK since change set names must be unique.
            // The delete request is successful as long as the stack exists (even if the change set does not exist).
            (0, logging_1.debug)(`Removing existing change set with name ${changeSetName} if it exists`);
            await this.cfn.deleteChangeSet({
                StackName: this.stackName,
                ChangeSetName: changeSetName,
            });
        }
    }
    async updateTerminationProtection() {
        // Update termination protection only if it has changed.
        const terminationProtection = this.stackArtifact.terminationProtection ?? false;
        if (!!this.cloudFormationStack.terminationProtection !== terminationProtection) {
            (0, logging_1.debug)('Updating termination protection from %s to %s for stack %s', this.cloudFormationStack.terminationProtection, terminationProtection, this.stackName);
            await this.cfn.updateTerminationProtection({
                StackName: this.stackName,
                EnableTerminationProtection: terminationProtection,
            });
            (0, logging_1.debug)('Termination protection updated to %s for stack %s', terminationProtection, this.stackName);
        }
    }
    async directDeployment() {
        (0, logging_1.print)('%s: %s stack...', chalk.bold(this.stackName), this.update ? 'updating' : 'creating');
        const startTime = new Date();
        if (this.update) {
            await this.updateTerminationProtection();
            try {
                await this.cfn.updateStack({
                    StackName: this.stackName,
                    ClientRequestToken: `update${this.uuid}`,
                    ...this.commonPrepareOptions(),
                    ...this.commonExecuteOptions(),
                });
            }
            catch (err) {
                if (err.message === 'No updates are to be performed.') {
                    (0, logging_1.debug)('No updates are to be performed for stack %s', this.stackName);
                    return {
                        type: 'did-deploy-stack',
                        noOp: true,
                        outputs: this.cloudFormationStack.outputs,
                        stackArn: this.cloudFormationStack.stackId,
                    };
                }
                throw err;
            }
            return this.monitorDeployment(startTime, undefined);
        }
        else {
            // Take advantage of the fact that we can set termination protection during create
            const terminationProtection = this.stackArtifact.terminationProtection ?? false;
            await this.cfn.createStack({
                StackName: this.stackName,
                ClientRequestToken: `create${this.uuid}`,
                ...(terminationProtection ? { EnableTerminationProtection: true } : undefined),
                ...this.commonPrepareOptions(),
                ...this.commonExecuteOptions(),
            });
            return this.monitorDeployment(startTime, undefined);
        }
    }
    async monitorDeployment(startTime, expectedChanges) {
        const monitor = this.options.quiet
            ? undefined
            : stack_activity_monitor_1.StackActivityMonitor.withDefaultPrinter(this.cfn, this.stackName, this.stackArtifact, {
                resourcesTotal: expectedChanges,
                progress: this.options.progress,
                changeSetCreationTime: startTime,
                ci: this.options.ci,
            }).start();
        let finalState = this.cloudFormationStack;
        try {
            const successStack = await (0, cloudformation_1.waitForStackDeploy)(this.cfn, this.stackName);
            // This shouldn't really happen, but catch it anyway. You never know.
            if (!successStack) {
                throw new Error('Stack deploy failed (the stack disappeared while we were deploying it)');
            }
            finalState = successStack;
        }
        catch (e) {
            throw new Error(suffixWithErrors(e.message, monitor?.errors));
        }
        finally {
            await monitor?.stop();
        }
        (0, logging_1.debug)('Stack %s has completed updating', this.stackName);
        return {
            type: 'did-deploy-stack',
            noOp: false,
            outputs: finalState.outputs,
            stackArn: finalState.stackId,
        };
    }
    /**
     * Return the options that are shared between CreateStack, UpdateStack and CreateChangeSet
     */
    commonPrepareOptions() {
        return {
            Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
            NotificationARNs: this.options.notificationArns,
            Parameters: this.stackParams.apiParameters,
            RoleARN: this.options.roleArn,
            TemplateBody: this.bodyParameter.TemplateBody,
            TemplateURL: this.bodyParameter.TemplateURL,
            Tags: this.options.tags,
        };
    }
    /**
     * Return the options that are shared between UpdateStack and CreateChangeSet
     *
     * Be careful not to add in keys for options that aren't used, as the features may not have been
     * deployed everywhere yet.
     */
    commonExecuteOptions() {
        const shouldDisableRollback = this.options.rollback === false;
        return {
            StackName: this.stackName,
            ...(shouldDisableRollback ? { DisableRollback: true } : undefined),
        };
    }
}
async function destroyStack(options) {
    const deployName = options.deployName || options.stack.stackName;
    const cfn = options.sdk.cloudFormation();
    const currentStack = await cloudformation_1.CloudFormationStack.lookup(cfn, deployName);
    if (!currentStack.exists) {
        return;
    }
    const monitor = options.quiet
        ? undefined
        : stack_activity_monitor_1.StackActivityMonitor.withDefaultPrinter(cfn, deployName, options.stack, {
            ci: options.ci,
        }).start();
    try {
        await cfn.deleteStack({ StackName: deployName, RoleARN: options.roleArn });
        const destroyedStack = await (0, cloudformation_1.waitForStackDelete)(cfn, deployName);
        if (destroyedStack && destroyedStack.stackStatus.name !== 'DELETE_COMPLETE') {
            throw new Error(`Failed to destroy ${deployName}: ${destroyedStack.stackStatus}`);
        }
    }
    catch (e) {
        throw new Error(suffixWithErrors(e.message, monitor?.errors));
    }
    finally {
        if (monitor) {
            await monitor.stop();
        }
    }
}
/**
 * Checks whether we can skip deployment
 *
 * We do this in a complicated way by preprocessing (instead of just
 * looking at the changeset), because if there are nested stacks involved
 * the changeset will always show the nested stacks as needing to be
 * updated, and the deployment will take a long time to in effect not
 * do anything.
 */
async function canSkipDeploy(deployStackOptions, cloudFormationStack, parameterChanges) {
    const deployName = deployStackOptions.deployName || deployStackOptions.stack.stackName;
    (0, logging_1.debug)(`${deployName}: checking if we can skip deploy`);
    // Forced deploy
    if (deployStackOptions.force) {
        (0, logging_1.debug)(`${deployName}: forced deployment`);
        return false;
    }
    // Creating changeset only (default true), never skip
    if (deployStackOptions.deploymentMethod?.method === 'change-set' &&
        deployStackOptions.deploymentMethod.execute === false) {
        (0, logging_1.debug)(`${deployName}: --no-execute, always creating change set`);
        return false;
    }
    // No existing stack
    if (!cloudFormationStack.exists) {
        (0, logging_1.debug)(`${deployName}: no existing stack`);
        return false;
    }
    // Template has changed (assets taken into account here)
    if (JSON.stringify(deployStackOptions.stack.template) !== JSON.stringify(await cloudFormationStack.template())) {
        (0, logging_1.debug)(`${deployName}: template has changed`);
        return false;
    }
    // Tags have changed
    if (!compareTags(cloudFormationStack.tags, deployStackOptions.tags ?? [])) {
        (0, logging_1.debug)(`${deployName}: tags have changed`);
        return false;
    }
    // Notification arns have changed
    if (!arrayEquals(cloudFormationStack.notificationArns, deployStackOptions.notificationArns ?? [])) {
        (0, logging_1.debug)(`${deployName}: notification arns have changed`);
        return false;
    }
    // Termination protection has been updated
    if (!!deployStackOptions.stack.terminationProtection !== !!cloudFormationStack.terminationProtection) {
        (0, logging_1.debug)(`${deployName}: termination protection has been updated`);
        return false;
    }
    // Parameters have changed
    if (parameterChanges) {
        if (parameterChanges === 'ssm') {
            (0, logging_1.debug)(`${deployName}: some parameters come from SSM so we have to assume they may have changed`);
        }
        else {
            (0, logging_1.debug)(`${deployName}: parameters have changed`);
        }
        return false;
    }
    // Existing stack is in a failed state
    if (cloudFormationStack.stackStatus.isFailure) {
        (0, logging_1.debug)(`${deployName}: stack is in a failure state`);
        return false;
    }
    // We can skip deploy
    return true;
}
/**
 * Compares two list of tags, returns true if identical.
 */
function compareTags(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (const aTag of a) {
        const bTag = b.find((tag) => tag.Key === aTag.Key);
        if (!bTag || bTag.Value !== aTag.Value) {
            return false;
        }
    }
    return true;
}
function suffixWithErrors(msg, errors) {
    return errors && errors.length > 0 ? `${msg}: ${errors.join(', ')}` : msg;
}
function arrayEquals(a, b) {
    return a.every((item) => b.includes(item)) && b.every((item) => a.includes(item));
}
function hasReplacement(cs) {
    return (cs.Changes ?? []).some(c => {
        const a = c.ResourceChange?.PolicyAction;
        return a === 'ReplaceAndDelete' || a === 'ReplaceAndRetain' || a === 'ReplaceAndSnapshot';
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVwbG95LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBOERBLGtGQUlDO0FBdU5ELGtDQXVJQztBQTJURCxvQ0EyQkM7QUE3dUJELCtCQUErQjtBQUMvQiw2QkFBNkI7QUFHN0IseUZBQTRFO0FBQzVFLDZDQUErRTtBQUMvRSwrREFBNkQ7QUFDN0Qsc0NBQXdEO0FBQ3hELHdDQUFtRDtBQUNuRCwwREFVK0I7QUFDL0IseUZBQWdIO0FBQ2hILDRFQUErRjtBQUMvRiwyRUFBc0U7QUFDdEUsMENBQTBFO0FBQzFFLCtEQUF5RDtBQTZCekQsU0FBZ0IsbUNBQW1DLENBQUMsQ0FBb0I7SUFDdEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQywwREFBMEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsdUdBQXVHLENBQUMsQ0FBQztJQUN0TSxDQUFDO0FBQ0gsQ0FBQztBQXVOTSxLQUFLLFVBQVUsV0FBVyxDQUFDLE9BQTJCO0lBQzNELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFFcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDO0lBRTdDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzFELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDekMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDO0lBQ2pFLElBQUksbUJBQW1CLEdBQUcsTUFBTSxvQ0FBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRTVFLElBQUksbUJBQW1CLENBQUMsV0FBVyxDQUFD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QUFDLEtBQUssa0JBQWtCLElBQUksQ0FBQyxLQUFLLGtCQUFrQixJQUFJLENBQUMsS0FBSyxvQkFBb0IsQ0FBQztJQUM1RixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjeGFwaSBmcm9tICdAYXdzLWNkay9jeC1hcGknO1xuaW1wb3J0IHR5cGUge1xuICBDcmVhdGVDaGFuZ2VTZXRDb21tYW5kSW5wdXQsXG4gIENyZWF0ZVN0YWNrQ29tbWFuZElucHV0LFxuICBEZXNjcmliZUNoYW5nZVNldENvbW1hbmRPdXRwdXQsXG4gIEV4ZWN1dGVDaGFuZ2VTZXRDb21tYW5kSW5wdXQsXG4gIFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0LFxuICBUYWcsXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgKiBhcyBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyB1dWlkIGZyb20gJ3V1aWQnO1xuaW1wb3J0IHR5cGUgeyBTREssIFNka1Byb3ZpZGVyLCBJQ2xvdWRGb3JtYXRpb25DbGllbnQgfSBmcm9tICcuL2F3cy1hdXRoJztcbmltcG9ydCB0eXBlIHsgRW52aXJvbm1lbnRSZXNvdXJjZXMgfSBmcm9tICcuL2Vudmlyb25tZW50LXJlc291cmNlcyc7XG5pbXBvcnQgeyBDZm5FdmFsdWF0aW9uRXhjZXB0aW9uIH0gZnJvbSAnLi9ldmFsdWF0ZS1jbG91ZGZvcm1hdGlvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBIb3Rzd2FwTW9kZSwgSG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzLCBJQ09OIH0gZnJvbSAnLi9ob3Rzd2FwL2NvbW1vbic7XG5pbXBvcnQgeyB0cnlIb3Rzd2FwRGVwbG95bWVudCB9IGZyb20gJy4vaG90c3dhcC1kZXBsb3ltZW50cyc7XG5pbXBvcnQgeyBhZGRNZXRhZGF0YUFzc2V0c1RvTWFuaWZlc3QgfSBmcm9tICcuLi9hc3NldHMnO1xuaW1wb3J0IHsgZGVidWcsIHByaW50LCB3YXJuaW5nIH0gZnJvbSAnLi4vbG9nZ2luZyc7XG5pbXBvcnQge1xuICBjaGFuZ2VTZXRIYXNOb0NoYW5nZXMsXG4gIENsb3VkRm9ybWF0aW9uU3RhY2ssXG4gIFRlbXBsYXRlUGFyYW1ldGVycyxcbiAgd2FpdEZvckNoYW5nZVNldCxcbiAgd2FpdEZvclN0YWNrRGVwbG95LFxuICB3YWl0Rm9yU3RhY2tEZWxldGUsXG4gIFBhcmFtZXRlclZhbHVlcyxcbiAgUGFyYW1ldGVyQ2hhbmdlcyxcbiAgUmVzb3VyY2VzVG9JbXBvcnQsXG59IGZyb20gJy4vdXRpbC9jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgeyBTdGFja0FjdGl2aXR5TW9uaXRvciwgdHlwZSBTdGFja0FjdGl2aXR5UHJvZ3Jlc3MgfSBmcm9tICcuL3V0aWwvY2xvdWRmb3JtYXRpb24vc3RhY2stYWN0aXZpdHktbW9uaXRvcic7XG5pbXBvcnQgeyB0eXBlIFRlbXBsYXRlQm9keVBhcmFtZXRlciwgbWFrZUJvZHlQYXJhbWV0ZXIgfSBmcm9tICcuL3V0aWwvdGVtcGxhdGUtYm9keS1wYXJhbWV0ZXInO1xuaW1wb3J0IHsgQXNzZXRNYW5pZmVzdEJ1aWxkZXIgfSBmcm9tICcuLi91dGlsL2Fzc2V0LW1hbmlmZXN0LWJ1aWxkZXInO1xuaW1wb3J0IHsgZGV0ZXJtaW5lQWxsb3dDcm9zc0FjY291bnRBc3NldFB1Ymxpc2hpbmcgfSBmcm9tICcuL3V0aWwvY2hlY2tzJztcbmltcG9ydCB7IHB1Ymxpc2hBc3NldHMgfSBmcm9tICcuLi91dGlsL2Fzc2V0LXB1Ymxpc2hpbmcnO1xuaW1wb3J0IHsgU3RyaW5nV2l0aG91dFBsYWNlaG9sZGVycyB9IGZyb20gJy4vdXRpbC9wbGFjZWhvbGRlcnMnO1xuXG5leHBvcnQgdHlwZSBEZXBsb3lTdGFja1Jlc3VsdCA9XG4gIHwgU3VjY2Vzc2Z1bERlcGxveVN0YWNrUmVzdWx0XG4gIHwgTmVlZFJvbGxiYWNrRmlyc3REZXBsb3lTdGFja1Jlc3VsdFxuICB8IFJlcGxhY2VtZW50UmVxdWlyZXNSb2xsYmFja1N0YWNrUmVzdWx0XG4gIDtcblxuLyoqIFN1Y2Nlc3NmdWxseSBkZXBsb3llZCBhIHN0YWNrICovXG5leHBvcnQgaW50ZXJmYWNlIFN1Y2Nlc3NmdWxEZXBsb3lTdGFja1Jlc3VsdCB7XG4gIHJlYWRvbmx5IHR5cGU6ICdkaWQtZGVwbG95LXN0YWNrJztcbiAgcmVhZG9ubHkgbm9PcDogYm9vbGVhbjtcbiAgcmVhZG9ubHkgb3V0cHV0czogeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH07XG4gIHJlYWRvbmx5IHN0YWNrQXJuOiBzdHJpbmc7XG59XG5cbi8qKiBUaGUgc3RhY2sgaXMgY3VycmVudGx5IGluIGEgZmFpbHBhdXNlZCBzdGF0ZSwgYW5kIG5lZWRzIHRvIGJlIHJvbGxlZCBiYWNrIGJlZm9yZSB0aGUgZGVwbG95bWVudCAqL1xuZXhwb3J0IGludGVyZmFjZSBOZWVkUm9sbGJhY2tGaXJzdERlcGxveVN0YWNrUmVzdWx0IHtcbiAgcmVhZG9ubHkgdHlwZTogJ2ZhaWxwYXVzZWQtbmVlZC1yb2xsYmFjay1maXJzdCc7XG4gIHJlYWRvbmx5IHJlYXNvbjogJ25vdC1ub3JvbGxiYWNrJyB8ICdyZXBsYWNlbWVudCc7XG4gIHJlYWRvbmx5IHN0YXR1czogc3RyaW5nO1xufVxuXG4vKiogVGhlIHVwY29taW5nIGNoYW5nZSBoYXMgYSByZXBsYWNlbWVudCwgd2hpY2ggcmVxdWlyZXMgZGVwbG95aW5nIHdpdGggLS1yb2xsYmFjayAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXBsYWNlbWVudFJlcXVpcmVzUm9sbGJhY2tTdGFja1Jlc3VsdCB7XG4gIHJlYWRvbmx5IHR5cGU6ICdyZXBsYWNlbWVudC1yZXF1aXJlcy1yb2xsYmFjayc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRJc1N1Y2Nlc3NmdWxEZXBsb3lTdGFja1Jlc3VsdCh4OiBEZXBsb3lTdGFja1Jlc3VsdCk6IGFzc2VydHMgeCBpcyBTdWNjZXNzZnVsRGVwbG95U3RhY2tSZXN1bHQge1xuICBpZiAoeC50eXBlICE9PSAnZGlkLWRlcGxveS1zdGFjaycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgZGVwbG95U3RhY2sgcmVzdWx0LiBUaGlzIHNob3VsZCBub3QgaGFwcGVuOiAke0pTT04uc3RyaW5naWZ5KHgpfS4gSWYgeW91IGFyZSBzZWVpbmcgdGhpcyBlcnJvciwgcGxlYXNlIHJlcG9ydCBpdCBhdCBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzL25ldy9jaG9vc2UuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXBsb3lTdGFja09wdGlvbnMge1xuICAvKipcbiAgICogVGhlIHN0YWNrIHRvIGJlIGRlcGxveWVkXG4gICAqL1xuICByZWFkb25seSBzdGFjazogY3hhcGkuQ2xvdWRGb3JtYXRpb25TdGFja0FydGlmYWN0O1xuXG4gIC8qKlxuICAgKiBUaGUgZW52aXJvbm1lbnQgdG8gZGVwbG95IHRoaXMgc3RhY2sgaW5cbiAgICpcbiAgICogVGhlIGVudmlyb25tZW50IG9uIHRoZSBzdGFjayBhcnRpZmFjdCBtYXkgYmUgdW5yZXNvbHZlZCwgdGhpcyBvbmVcbiAgICogbXVzdCBiZSByZXNvbHZlZC5cbiAgICovXG4gIHJlYWRvbmx5IHJlc29sdmVkRW52aXJvbm1lbnQ6IGN4YXBpLkVudmlyb25tZW50O1xuXG4gIC8qKlxuICAgKiBUaGUgU0RLIHRvIHVzZSBmb3IgZGVwbG95aW5nIHRoZSBzdGFja1xuICAgKlxuICAgKiBTaG91bGQgaGF2ZSBiZWVuIGluaXRpYWxpemVkIHdpdGggdGhlIGNvcnJlY3Qgcm9sZSB3aXRoIHdoaWNoXG4gICAqIHN0YWNrIG9wZXJhdGlvbnMgc2hvdWxkIGJlIHBlcmZvcm1lZC5cbiAgICovXG4gIHJlYWRvbmx5IHNkazogU0RLO1xuXG4gIC8qKlxuICAgKiBTREsgcHJvdmlkZXIgKHNlZWRlZCB3aXRoIGRlZmF1bHQgY3JlZGVudGlhbHMpXG4gICAqXG4gICAqIFdpbGwgYmUgdXNlZCB0bzpcbiAgICpcbiAgICogLSBQdWJsaXNoIGFzc2V0cywgZWl0aGVyIGxlZ2FjeSBhc3NldHMgb3IgbGFyZ2UgQ0ZOIHRlbXBsYXRlc1xuICAgKiAgIHRoYXQgYXJlbid0IHRoZW1zZWx2ZXMgYXNzZXRzIGZyb20gYSBtYW5pZmVzdC4gKE5lZWRzIGFuIFNES1xuICAgKiAgIFByb3ZpZGVyIGJlY2F1c2UgdGhlIGZpbGUgcHVibGlzaGluZyByb2xlIGlzIGRlY2xhcmVkIGFzIHBhcnRcbiAgICogICBvZiB0aGUgYXNzZXQpLlxuICAgKiAtIEhvdHN3YXBcbiAgICovXG4gIHJlYWRvbmx5IHNka1Byb3ZpZGVyOiBTZGtQcm92aWRlcjtcblxuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIGJvb3RzdHJhcCBzdGFjayBmb3VuZCBpbiB0aGUgdGFyZ2V0IGVudmlyb25tZW50XG4gICAqL1xuICByZWFkb25seSBlbnZSZXNvdXJjZXM6IEVudmlyb25tZW50UmVzb3VyY2VzO1xuXG4gIC8qKlxuICAgKiBSb2xlIHRvIHBhc3MgdG8gQ2xvdWRGb3JtYXRpb24gdG8gZXhlY3V0ZSB0aGUgY2hhbmdlIHNldFxuICAgKlxuICAgKiBUbyBvYnRhaW4gYSBgU3RyaW5nV2l0aG91dFBsYWNlaG9sZGVyc2AsIHJ1biBhIHJlZ3VsYXJcbiAgICogc3RyaW5nIHRob3VnaCBgVGFyZ2V0RW52aXJvbm1lbnQucmVwbGFjZVBsYWNlaG9sZGVyc2AuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gTm8gZXhlY3V0aW9uIHJvbGU7IENsb3VkRm9ybWF0aW9uIGVpdGhlciB1c2VzIHRoZSByb2xlIGN1cnJlbnRseSBhc3NvY2lhdGVkIHdpdGhcbiAgICogdGhlIHN0YWNrLCBvciBvdGhlcndpc2UgdXNlcyBjdXJyZW50IEFXUyBjcmVkZW50aWFscy5cbiAgICovXG4gIHJlYWRvbmx5IHJvbGVBcm4/OiBTdHJpbmdXaXRob3V0UGxhY2Vob2xkZXJzO1xuXG4gIC8qKlxuICAgKiBOb3RpZmljYXRpb24gQVJOcyB0byBwYXNzIHRvIENsb3VkRm9ybWF0aW9uIHRvIG5vdGlmeSB3aGVuIHRoZSBjaGFuZ2Ugc2V0IGhhcyBjb21wbGV0ZWRcbiAgICpcbiAgICogQGRlZmF1bHQgLSBObyBub3RpZmljYXRpb25zXG4gICAqL1xuICByZWFkb25seSBub3RpZmljYXRpb25Bcm5zPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIE5hbWUgdG8gZGVwbG95IHRoZSBzdGFjayB1bmRlclxuICAgKlxuICAgKiBAZGVmYXVsdCAtIE5hbWUgZnJvbSBhc3NlbWJseVxuICAgKi9cbiAgcmVhZG9ubHkgZGVwbG95TmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogUXVpZXQgb3IgdmVyYm9zZSBkZXBsb3ltZW50XG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZWFkb25seSBxdWlldD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgYXNzZXQgSURzIHdoaWNoIHNob3VsZG4ndCBiZSBidWlsdFxuICAgKlxuICAgKiBAZGVmYXVsdCAtIEJ1aWxkIGFsbCBhc3NldHNcbiAgICovXG4gIHJlYWRvbmx5IHJldXNlQXNzZXRzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFRhZ3MgdG8gcGFzcyB0byBDbG91ZEZvcm1hdGlvbiB0byBhZGQgdG8gc3RhY2tcbiAgICpcbiAgICogQGRlZmF1bHQgLSBObyB0YWdzXG4gICAqL1xuICByZWFkb25seSB0YWdzPzogVGFnW107XG5cbiAgLyoqXG4gICAqIFdoYXQgZGVwbG95bWVudCBtZXRob2QgdG8gdXNlXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gQ2hhbmdlIHNldCB3aXRoIGRlZmF1bHRzXG4gICAqL1xuICByZWFkb25seSBkZXBsb3ltZW50TWV0aG9kPzogRGVwbG95bWVudE1ldGhvZDtcblxuICAvKipcbiAgICogVGhlIGNvbGxlY3Rpb24gb2YgZXh0cmEgcGFyYW1ldGVyc1xuICAgKiAoaW4gYWRkaXRpb24gdG8gdGhvc2UgdXNlZCBmb3IgYXNzZXRzKVxuICAgKiB0byBwYXNzIHRvIHRoZSBkZXBsb3llZCB0ZW1wbGF0ZS5cbiAgICogTm90ZSB0aGF0IHBhcmFtZXRlcnMgd2l0aCBgdW5kZWZpbmVkYCBvciBlbXB0eSB2YWx1ZXMgd2lsbCBiZSBpZ25vcmVkLFxuICAgKiBhbmQgbm90IHBhc3NlZCB0byB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gbm8gYWRkaXRpb25hbCBwYXJhbWV0ZXJzIHdpbGwgYmUgcGFzc2VkIHRvIHRoZSB0ZW1wbGF0ZVxuICAgKi9cbiAgcmVhZG9ubHkgcGFyYW1ldGVycz86IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9O1xuXG4gIC8qKlxuICAgKiBVc2UgcHJldmlvdXMgdmFsdWVzIGZvciB1bnNwZWNpZmllZCBwYXJhbWV0ZXJzXG4gICAqXG4gICAqIElmIG5vdCBzZXQsIGFsbCBwYXJhbWV0ZXJzIG11c3QgYmUgc3BlY2lmaWVkIGZvciBldmVyeSBkZXBsb3ltZW50LlxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgdXNlUHJldmlvdXNQYXJhbWV0ZXJzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRGlzcGxheSBtb2RlIGZvciBzdGFjayBkZXBsb3ltZW50IHByb2dyZXNzLlxuICAgKlxuICAgKiBAZGVmYXVsdCBTdGFja0FjdGl2aXR5UHJvZ3Jlc3MuQmFyIHN0YWNrIGV2ZW50cyB3aWxsIGJlIGRpc3BsYXllZCBmb3JcbiAgICogICB0aGUgcmVzb3VyY2UgY3VycmVudGx5IGJlaW5nIGRlcGxveWVkLlxuICAgKi9cbiAgcmVhZG9ubHkgcHJvZ3Jlc3M/OiBTdGFja0FjdGl2aXR5UHJvZ3Jlc3M7XG5cbiAgLyoqXG4gICAqIERlcGxveSBldmVuIGlmIHRoZSBkZXBsb3llZCB0ZW1wbGF0ZSBpcyBpZGVudGljYWwgdG8gdGhlIG9uZSB3ZSBhcmUgYWJvdXQgdG8gZGVwbG95LlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgZm9yY2U/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHdlIGFyZSBvbiBhIENJIHN5c3RlbVxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgY2k/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBSb2xsYmFjayBmYWlsZWQgZGVwbG95bWVudHNcbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgcm9sbGJhY2s/OiBib29sZWFuO1xuXG4gIC8qXG4gICAqIFdoZXRoZXIgdG8gcGVyZm9ybSBhICdob3Rzd2FwJyBkZXBsb3ltZW50LlxuICAgKiBBICdob3Rzd2FwJyBkZXBsb3ltZW50IHdpbGwgYXR0ZW1wdCB0byBzaG9ydC1jaXJjdWl0IENsb3VkRm9ybWF0aW9uXG4gICAqIGFuZCB1cGRhdGUgdGhlIGFmZmVjdGVkIHJlc291cmNlcyBsaWtlIExhbWJkYSBmdW5jdGlvbnMgZGlyZWN0bHkuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gYEhvdHN3YXBNb2RlLkZVTExfREVQTE9ZTUVOVGAgZm9yIHJlZ3VsYXIgZGVwbG95bWVudHMsIGBIb3Rzd2FwTW9kZS5IT1RTV0FQX09OTFlgIGZvciAnd2F0Y2gnIGRlcGxveW1lbnRzXG4gICAqL1xuICByZWFkb25seSBob3Rzd2FwPzogSG90c3dhcE1vZGU7XG5cbiAgLyoqXG4gICAqIEV4dHJhIHByb3BlcnRpZXMgdGhhdCBjb25maWd1cmUgaG90c3dhcCBiZWhhdmlvclxuICAgKi9cbiAgcmVhZG9ubHkgaG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzPzogSG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzO1xuXG4gIC8qKlxuICAgKiBUaGUgZXh0cmEgc3RyaW5nIHRvIGFwcGVuZCB0byB0aGUgVXNlci1BZ2VudCBoZWFkZXIgd2hlbiBwZXJmb3JtaW5nIEFXUyBTREsgY2FsbHMuXG4gICAqXG4gICAqIEBkZWZhdWx0IC0gbm90aGluZyBleHRyYSBpcyBhcHBlbmRlZCB0byB0aGUgVXNlci1BZ2VudCBoZWFkZXJcbiAgICovXG4gIHJlYWRvbmx5IGV4dHJhVXNlckFnZW50Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJZiBzZXQsIGNoYW5nZSBzZXQgb2YgdHlwZSBJTVBPUlQgd2lsbCBiZSBjcmVhdGVkLCBhbmQgcmVzb3VyY2VzVG9JbXBvcnRcbiAgICogcGFzc2VkIHRvIGl0LlxuICAgKi9cbiAgcmVhZG9ubHkgcmVzb3VyY2VzVG9JbXBvcnQ/OiBSZXNvdXJjZXNUb0ltcG9ydDtcblxuICAvKipcbiAgICogSWYgcHJlc2VudCwgdXNlIHRoaXMgZ2l2ZW4gdGVtcGxhdGUgaW5zdGVhZCBvZiB0aGUgc3RvcmVkIG9uZVxuICAgKlxuICAgKiBAZGVmYXVsdCAtIFVzZSB0aGUgc3RvcmVkIHRlbXBsYXRlXG4gICAqL1xuICByZWFkb25seSBvdmVycmlkZVRlbXBsYXRlPzogYW55O1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGJ1aWxkL3B1Ymxpc2ggYXNzZXRzIGluIHBhcmFsbGVsXG4gICAqXG4gICAqIEBkZWZhdWx0IHRydWUgVG8gcmVtYWluIGJhY2t3YXJkIGNvbXBhdGlibGUuXG4gICAqL1xuICByZWFkb25seSBhc3NldFBhcmFsbGVsaXNtPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgRGVwbG95bWVudE1ldGhvZCA9IERpcmVjdERlcGxveW1lbnRNZXRob2QgfCBDaGFuZ2VTZXREZXBsb3ltZW50TWV0aG9kO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdERlcGxveW1lbnRNZXRob2Qge1xuICByZWFkb25seSBtZXRob2Q6ICdkaXJlY3QnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENoYW5nZVNldERlcGxveW1lbnRNZXRob2Qge1xuICByZWFkb25seSBtZXRob2Q6ICdjaGFuZ2Utc2V0JztcblxuICAvKipcbiAgICogV2hldGhlciB0byBleGVjdXRlIHRoZSBjaGFuZ2VzZXQgb3IgbGVhdmUgaXQgaW4gcmV2aWV3LlxuICAgKlxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICByZWFkb25seSBleGVjdXRlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogT3B0aW9uYWwgbmFtZSB0byB1c2UgZm9yIHRoZSBDbG91ZEZvcm1hdGlvbiBjaGFuZ2Ugc2V0LlxuICAgKiBJZiBub3QgcHJvdmlkZWQsIGEgbmFtZSB3aWxsIGJlIGdlbmVyYXRlZCBhdXRvbWF0aWNhbGx5LlxuICAgKi9cbiAgcmVhZG9ubHkgY2hhbmdlU2V0TmFtZT86IHN0cmluZztcblxuICAvKipcbiAgICogSW5kaWNhdGVzIGlmIHRoZSBjaGFuZ2Ugc2V0IGltcG9ydHMgcmVzb3VyY2VzIHRoYXQgYWxyZWFkeSBleGlzdC5cbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGltcG9ydEV4aXN0aW5nUmVzb3VyY2VzPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlcGxveVN0YWNrKG9wdGlvbnM6IERlcGxveVN0YWNrT3B0aW9ucyk6IFByb21pc2U8RGVwbG95U3RhY2tSZXN1bHQ+IHtcbiAgY29uc3Qgc3RhY2tBcnRpZmFjdCA9IG9wdGlvbnMuc3RhY2s7XG5cbiAgY29uc3Qgc3RhY2tFbnYgPSBvcHRpb25zLnJlc29sdmVkRW52aXJvbm1lbnQ7XG5cbiAgb3B0aW9ucy5zZGsuYXBwZW5kQ3VzdG9tVXNlckFnZW50KG9wdGlvbnMuZXh0cmFVc2VyQWdlbnQpO1xuICBjb25zdCBjZm4gPSBvcHRpb25zLnNkay5jbG91ZEZvcm1hdGlvbigpO1xuICBjb25zdCBkZXBsb3lOYW1lID0gb3B0aW9ucy5kZXBsb3lOYW1lIHx8IHN0YWNrQXJ0aWZhY3Quc3RhY2tOYW1lO1xuICBsZXQgY2xvdWRGb3JtYXRpb25TdGFjayA9IGF3YWl0IENsb3VkRm9ybWF0aW9uU3RhY2subG9va3VwKGNmbiwgZGVwbG95TmFtZSk7XG5cbiAgaWYgKGNsb3VkRm9ybWF0aW9uU3RhY2suc3RhY2tTdGF0dXMuaXNDcmVhdGlvbkZhaWx1cmUpIHtcbiAgICBkZWJ1ZyhcbiAgICAgIGBGb3VuZCBleGlzdGluZyBzdGFjayAke2RlcGxveU5hbWV9IHRoYXQgaGFkIHByZXZpb3VzbHkgZmFpbGVkIGNyZWF0aW9uLiBEZWxldGluZyBpdCBiZWZvcmUgYXR0ZW1wdGluZyB0byByZS1jcmVhdGUgaXQuYCxcbiAgICApO1xuICAgIGF3YWl0IGNmbi5kZWxldGVTdGFjayh7IFN0YWNrTmFtZTogZGVwbG95TmFtZSB9KTtcbiAgICBjb25zdCBkZWxldGVkU3RhY2sgPSBhd2FpdCB3YWl0Rm9yU3RhY2tEZWxldGUoY2ZuLCBkZXBsb3lOYW1lKTtcbiAgICBpZiAoZGVsZXRlZFN0YWNrICYmIGRlbGV0ZWRTdGFjay5zdGFja1N0YXR1cy5uYW1lICE9PSAnREVMRVRFX0NPTVBMRVRFJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRmFpbGVkIGRlbGV0aW5nIHN0YWNrICR7ZGVwbG95TmFtZX0gdGhhdCBoYWQgcHJldmlvdXNseSBmYWlsZWQgY3JlYXRpb24gKGN1cnJlbnQgc3RhdGU6ICR7ZGVsZXRlZFN0YWNrLnN0YWNrU3RhdHVzfSlgLFxuICAgICAgKTtcbiAgICB9XG4gICAgLy8gVXBkYXRlIHZhcmlhYmxlIHRvIG1hcmsgdGhhdCB0aGUgc3RhY2sgZG9lcyBub3QgZXhpc3QgYW55bW9yZSwgYnV0IGF2b2lkXG4gICAgLy8gZG9pbmcgYW4gYWN0dWFsIGxvb2t1cCBpbiBDbG91ZEZvcm1hdGlvbiAod2hpY2ggd291bGQgYmUgc2lsbHkgdG8gZG8gaWZcbiAgICAvLyB3ZSBqdXN0IGRlbGV0ZWQgaXQpLlxuICAgIGNsb3VkRm9ybWF0aW9uU3RhY2sgPSBDbG91ZEZvcm1hdGlvblN0YWNrLmRvZXNOb3RFeGlzdChjZm4sIGRlcGxveU5hbWUpO1xuICB9XG5cbiAgLy8gRGV0ZWN0IFwibGVnYWN5XCIgYXNzZXRzICh3aGljaCByZW1haW4gaW4gdGhlIG1ldGFkYXRhKSBhbmQgcHVibGlzaCB0aGVtIHZpYVxuICAvLyBhbiBhZC1ob2MgYXNzZXQgbWFuaWZlc3QsIHdoaWxlIHBhc3NpbmcgdGhlaXIgbG9jYXRpb25zIHZpYSB0ZW1wbGF0ZVxuICAvLyBwYXJhbWV0ZXJzLlxuICBjb25zdCBsZWdhY3lBc3NldHMgPSBuZXcgQXNzZXRNYW5pZmVzdEJ1aWxkZXIoKTtcbiAgY29uc3QgYXNzZXRQYXJhbXMgPSBhd2FpdCBhZGRNZXRhZGF0YUFzc2V0c1RvTWFuaWZlc3QoXG4gICAgc3RhY2tBcnRpZmFjdCxcbiAgICBsZWdhY3lBc3NldHMsXG4gICAgb3B0aW9ucy5lbnZSZXNvdXJjZXMsXG4gICAgb3B0aW9ucy5yZXVzZUFzc2V0cyxcbiAgKTtcblxuICBjb25zdCBmaW5hbFBhcmFtZXRlclZhbHVlcyA9IHsgLi4ub3B0aW9ucy5wYXJhbWV0ZXJzLCAuLi5hc3NldFBhcmFtcyB9O1xuXG4gIGNvbnN0IHRlbXBsYXRlUGFyYW1zID0gVGVtcGxhdGVQYXJhbWV0ZXJzLmZyb21UZW1wbGF0ZShzdGFja0FydGlmYWN0LnRlbXBsYXRlKTtcbiAgY29uc3Qgc3RhY2tQYXJhbXMgPSBvcHRpb25zLnVzZVByZXZpb3VzUGFyYW1ldGVyc1xuICAgID8gdGVtcGxhdGVQYXJhbXMudXBkYXRlRXhpc3RpbmcoZmluYWxQYXJhbWV0ZXJWYWx1ZXMsIGNsb3VkRm9ybWF0aW9uU3RhY2sucGFyYW1ldGVycylcbiAgICA6IHRlbXBsYXRlUGFyYW1zLnN1cHBseUFsbChmaW5hbFBhcmFtZXRlclZhbHVlcyk7XG5cbiAgY29uc3QgaG90c3dhcE1vZGUgPSBvcHRpb25zLmhvdHN3YXAgPz8gSG90c3dhcE1vZGUuRlVMTF9ERVBMT1lNRU5UO1xuICBjb25zdCBob3Rzd2FwUHJvcGVydHlPdmVycmlkZXMgPSBvcHRpb25zLmhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlcyA/PyBuZXcgSG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzKCk7XG5cbiAgaWYgKGF3YWl0IGNhblNraXBEZXBsb3kob3B0aW9ucywgY2xvdWRGb3JtYXRpb25TdGFjaywgc3RhY2tQYXJhbXMuaGFzQ2hhbmdlcyhjbG91ZEZvcm1hdGlvblN0YWNrLnBhcmFtZXRlcnMpKSkge1xuICAgIGRlYnVnKGAke2RlcGxveU5hbWV9OiBza2lwcGluZyBkZXBsb3ltZW50ICh1c2UgLS1mb3JjZSB0byBvdmVycmlkZSlgKTtcbiAgICAvLyBpZiB3ZSBjYW4gc2tpcCBkZXBsb3ltZW50IGFuZCB3ZSBhcmUgcGVyZm9ybWluZyBhIGhvdHN3YXAsIGxldCB0aGUgdXNlciBrbm93XG4gICAgLy8gdGhhdCBubyBob3Rzd2FwIGRlcGxveW1lbnQgaGFwcGVuZWRcbiAgICBpZiAoaG90c3dhcE1vZGUgIT09IEhvdHN3YXBNb2RlLkZVTExfREVQTE9ZTUVOVCkge1xuICAgICAgcHJpbnQoXG4gICAgICAgIGBcXG4gJHtJQ09OfSAlc1xcbmAsXG4gICAgICAgIGNoYWxrLmJvbGQoJ2hvdHN3YXAgZGVwbG95bWVudCBza2lwcGVkIC0gbm8gY2hhbmdlcyB3ZXJlIGRldGVjdGVkICh1c2UgLS1mb3JjZSB0byBvdmVycmlkZSknKSxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnZGlkLWRlcGxveS1zdGFjaycsXG4gICAgICBub09wOiB0cnVlLFxuICAgICAgb3V0cHV0czogY2xvdWRGb3JtYXRpb25TdGFjay5vdXRwdXRzLFxuICAgICAgc3RhY2tBcm46IGNsb3VkRm9ybWF0aW9uU3RhY2suc3RhY2tJZCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGRlYnVnKGAke2RlcGxveU5hbWV9OiBkZXBsb3lpbmcuLi5gKTtcbiAgfVxuXG4gIGNvbnN0IGJvZHlQYXJhbWV0ZXIgPSBhd2FpdCBtYWtlQm9keVBhcmFtZXRlcihcbiAgICBzdGFja0FydGlmYWN0LFxuICAgIG9wdGlvbnMucmVzb2x2ZWRFbnZpcm9ubWVudCxcbiAgICBsZWdhY3lBc3NldHMsXG4gICAgb3B0aW9ucy5lbnZSZXNvdXJjZXMsXG4gICAgb3B0aW9ucy5vdmVycmlkZVRlbXBsYXRlLFxuICApO1xuICBsZXQgYm9vdHN0cmFwU3RhY2tOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHRyeSB7XG4gICAgYm9vdHN0cmFwU3RhY2tOYW1lID0gKGF3YWl0IG9wdGlvbnMuZW52UmVzb3VyY2VzLmxvb2t1cFRvb2xraXQoKSkuc3RhY2tOYW1lO1xuICB9IGNhdGNoIChlKSB7XG4gICAgZGVidWcoYENvdWxkIG5vdCBkZXRlcm1pbmUgdGhlIGJvb3RzdHJhcCBzdGFjayBuYW1lOiAke2V9YCk7XG4gIH1cbiAgYXdhaXQgcHVibGlzaEFzc2V0cyhsZWdhY3lBc3NldHMudG9NYW5pZmVzdChzdGFja0FydGlmYWN0LmFzc2VtYmx5LmRpcmVjdG9yeSksIG9wdGlvbnMuc2RrUHJvdmlkZXIsIHN0YWNrRW52LCB7XG4gICAgcGFyYWxsZWw6IG9wdGlvbnMuYXNzZXRQYXJhbGxlbGlzbSxcbiAgICBhbGxvd0Nyb3NzQWNjb3VudDogYXdhaXQgZGV0ZXJtaW5lQWxsb3dDcm9zc0FjY291bnRBc3NldFB1Ymxpc2hpbmcob3B0aW9ucy5zZGssIGJvb3RzdHJhcFN0YWNrTmFtZSksXG4gIH0pO1xuXG4gIGlmIChob3Rzd2FwTW9kZSAhPT0gSG90c3dhcE1vZGUuRlVMTF9ERVBMT1lNRU5UKSB7XG4gICAgLy8gYXR0ZW1wdCB0byBzaG9ydC1jaXJjdWl0IHRoZSBkZXBsb3ltZW50IGlmIHBvc3NpYmxlXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGhvdHN3YXBEZXBsb3ltZW50UmVzdWx0ID0gYXdhaXQgdHJ5SG90c3dhcERlcGxveW1lbnQoXG4gICAgICAgIG9wdGlvbnMuc2RrUHJvdmlkZXIsXG4gICAgICAgIHN0YWNrUGFyYW1zLnZhbHVlcyxcbiAgICAgICAgY2xvdWRGb3JtYXRpb25TdGFjayxcbiAgICAgICAgc3RhY2tBcnRpZmFjdCxcbiAgICAgICAgaG90c3dhcE1vZGUsIGhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlcyxcbiAgICAgICk7XG4gICAgICBpZiAoaG90c3dhcERlcGxveW1lbnRSZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIGhvdHN3YXBEZXBsb3ltZW50UmVzdWx0O1xuICAgICAgfVxuICAgICAgcHJpbnQoXG4gICAgICAgICdDb3VsZCBub3QgcGVyZm9ybSBhIGhvdHN3YXAgZGVwbG95bWVudCwgYXMgdGhlIHN0YWNrICVzIGNvbnRhaW5zIG5vbi1Bc3NldCBjaGFuZ2VzJyxcbiAgICAgICAgc3RhY2tBcnRpZmFjdC5kaXNwbGF5TmFtZSxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIENmbkV2YWx1YXRpb25FeGNlcHRpb24pKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgICBwcmludChcbiAgICAgICAgJ0NvdWxkIG5vdCBwZXJmb3JtIGEgaG90c3dhcCBkZXBsb3ltZW50LCBiZWNhdXNlIHRoZSBDbG91ZEZvcm1hdGlvbiB0ZW1wbGF0ZSBjb3VsZCBub3QgYmUgcmVzb2x2ZWQ6ICVzJyxcbiAgICAgICAgZS5tZXNzYWdlLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoaG90c3dhcE1vZGUgPT09IEhvdHN3YXBNb2RlLkZBTExfQkFDSykge1xuICAgICAgcHJpbnQoJ0ZhbGxpbmcgYmFjayB0byBkb2luZyBhIGZ1bGwgZGVwbG95bWVudCcpO1xuICAgICAgb3B0aW9ucy5zZGsuYXBwZW5kQ3VzdG9tVXNlckFnZW50KCdjZGstaG90c3dhcC9mYWxsYmFjaycpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZGlkLWRlcGxveS1zdGFjaycsXG4gICAgICAgIG5vT3A6IHRydWUsXG4gICAgICAgIHN0YWNrQXJuOiBjbG91ZEZvcm1hdGlvblN0YWNrLnN0YWNrSWQsXG4gICAgICAgIG91dHB1dHM6IGNsb3VkRm9ybWF0aW9uU3RhY2sub3V0cHV0cyxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gY291bGQgbm90IHNob3J0LWNpcmN1aXQgdGhlIGRlcGxveW1lbnQsIHBlcmZvcm0gYSBmdWxsIENGTiBkZXBsb3kgaW5zdGVhZFxuICBjb25zdCBmdWxsRGVwbG95bWVudCA9IG5ldyBGdWxsQ2xvdWRGb3JtYXRpb25EZXBsb3ltZW50KFxuICAgIG9wdGlvbnMsXG4gICAgY2xvdWRGb3JtYXRpb25TdGFjayxcbiAgICBzdGFja0FydGlmYWN0LFxuICAgIHN0YWNrUGFyYW1zLFxuICAgIGJvZHlQYXJhbWV0ZXIsXG4gICk7XG4gIHJldHVybiBmdWxsRGVwbG95bWVudC5wZXJmb3JtRGVwbG95bWVudCgpO1xufVxuXG50eXBlIENvbW1vblByZXBhcmVPcHRpb25zID0ga2V5b2YgQ3JlYXRlU3RhY2tDb21tYW5kSW5wdXQgJlxua2V5b2YgVXBkYXRlU3RhY2tDb21tYW5kSW5wdXQgJlxua2V5b2YgQ3JlYXRlQ2hhbmdlU2V0Q29tbWFuZElucHV0O1xudHlwZSBDb21tb25FeGVjdXRlT3B0aW9ucyA9IGtleW9mIENyZWF0ZVN0YWNrQ29tbWFuZElucHV0ICZcbmtleW9mIFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0ICZcbmtleW9mIEV4ZWN1dGVDaGFuZ2VTZXRDb21tYW5kSW5wdXQ7XG5cbi8qKlxuICogVGhpcyBjbGFzcyBzaGFyZXMgc3RhdGUgYW5kIGZ1bmN0aW9uYWxpdHkgYmV0d2VlbiB0aGUgZGlmZmVyZW50IGZ1bGwgZGVwbG95bWVudCBtb2Rlc1xuICovXG5jbGFzcyBGdWxsQ2xvdWRGb3JtYXRpb25EZXBsb3ltZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBjZm46IElDbG91ZEZvcm1hdGlvbkNsaWVudDtcbiAgcHJpdmF0ZSByZWFkb25seSBzdGFja05hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSB1cGRhdGU6IGJvb2xlYW47XG4gIHByaXZhdGUgcmVhZG9ubHkgdmVyYjogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHV1aWQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IERlcGxveVN0YWNrT3B0aW9ucyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsb3VkRm9ybWF0aW9uU3RhY2s6IENsb3VkRm9ybWF0aW9uU3RhY2ssXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdGFja0FydGlmYWN0OiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3QsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzdGFja1BhcmFtczogUGFyYW1ldGVyVmFsdWVzLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYm9keVBhcmFtZXRlcjogVGVtcGxhdGVCb2R5UGFyYW1ldGVyLFxuICApIHtcbiAgICB0aGlzLmNmbiA9IG9wdGlvbnMuc2RrLmNsb3VkRm9ybWF0aW9uKCk7XG4gICAgdGhpcy5zdGFja05hbWUgPSBvcHRpb25zLmRlcGxveU5hbWUgPz8gc3RhY2tBcnRpZmFjdC5zdGFja05hbWU7XG5cbiAgICB0aGlzLnVwZGF0ZSA9IGNsb3VkRm9ybWF0aW9uU3RhY2suZXhpc3RzICYmIGNsb3VkRm9ybWF0aW9uU3RhY2suc3RhY2tTdGF0dXMubmFtZSAhPT0gJ1JFVklFV19JTl9QUk9HUkVTUyc7XG4gICAgdGhpcy52ZXJiID0gdGhpcy51cGRhdGUgPyAndXBkYXRlJyA6ICdjcmVhdGUnO1xuICAgIHRoaXMudXVpZCA9IHV1aWQudjQoKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBwZXJmb3JtRGVwbG95bWVudCgpOiBQcm9taXNlPERlcGxveVN0YWNrUmVzdWx0PiB7XG4gICAgY29uc3QgZGVwbG95bWVudE1ldGhvZCA9IHRoaXMub3B0aW9ucy5kZXBsb3ltZW50TWV0aG9kID8/IHtcbiAgICAgIG1ldGhvZDogJ2NoYW5nZS1zZXQnLFxuICAgIH07XG5cbiAgICBpZiAoZGVwbG95bWVudE1ldGhvZC5tZXRob2QgPT09ICdkaXJlY3QnICYmIHRoaXMub3B0aW9ucy5yZXNvdXJjZXNUb0ltcG9ydCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbXBvcnRpbmcgcmVzb3VyY2VzIHJlcXVpcmVzIGEgY2hhbmdlc2V0IGRlcGxveW1lbnQnKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKGRlcGxveW1lbnRNZXRob2QubWV0aG9kKSB7XG4gICAgICBjYXNlICdjaGFuZ2Utc2V0JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hhbmdlU2V0RGVwbG95bWVudChkZXBsb3ltZW50TWV0aG9kKTtcblxuICAgICAgY2FzZSAnZGlyZWN0JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlyZWN0RGVwbG95bWVudCgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY2hhbmdlU2V0RGVwbG95bWVudChkZXBsb3ltZW50TWV0aG9kOiBDaGFuZ2VTZXREZXBsb3ltZW50TWV0aG9kKTogUHJvbWlzZTxEZXBsb3lTdGFja1Jlc3VsdD4ge1xuICAgIGNvbnN0IGNoYW5nZVNldE5hbWUgPSBkZXBsb3ltZW50TWV0aG9kLmNoYW5nZVNldE5hbWUgPz8gJ2Nkay1kZXBsb3ktY2hhbmdlLXNldCc7XG4gICAgY29uc3QgZXhlY3V0ZSA9IGRlcGxveW1lbnRNZXRob2QuZXhlY3V0ZSA/PyB0cnVlO1xuICAgIGNvbnN0IGltcG9ydEV4aXN0aW5nUmVzb3VyY2VzID0gZGVwbG95bWVudE1ldGhvZC5pbXBvcnRFeGlzdGluZ1Jlc291cmNlcyA/PyBmYWxzZTtcbiAgICBjb25zdCBjaGFuZ2VTZXREZXNjcmlwdGlvbiA9IGF3YWl0IHRoaXMuY3JlYXRlQ2hhbmdlU2V0KGNoYW5nZVNldE5hbWUsIGV4ZWN1dGUsIGltcG9ydEV4aXN0aW5nUmVzb3VyY2VzKTtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZVRlcm1pbmF0aW9uUHJvdGVjdGlvbigpO1xuXG4gICAgaWYgKGNoYW5nZVNldEhhc05vQ2hhbmdlcyhjaGFuZ2VTZXREZXNjcmlwdGlvbikpIHtcbiAgICAgIGRlYnVnKCdObyBjaGFuZ2VzIGFyZSB0byBiZSBwZXJmb3JtZWQgb24gJXMuJywgdGhpcy5zdGFja05hbWUpO1xuICAgICAgaWYgKGV4ZWN1dGUpIHtcbiAgICAgICAgZGVidWcoJ0RlbGV0aW5nIGVtcHR5IGNoYW5nZSBzZXQgJXMnLCBjaGFuZ2VTZXREZXNjcmlwdGlvbi5DaGFuZ2VTZXRJZCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY2ZuLmRlbGV0ZUNoYW5nZVNldCh7XG4gICAgICAgICAgU3RhY2tOYW1lOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgICAgICBDaGFuZ2VTZXROYW1lOiBjaGFuZ2VTZXROYW1lLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5mb3JjZSkge1xuICAgICAgICB3YXJuaW5nKFxuICAgICAgICAgIFtcbiAgICAgICAgICAgICdZb3UgdXNlZCB0aGUgLS1mb3JjZSBmbGFnLCBidXQgQ2xvdWRGb3JtYXRpb24gcmVwb3J0ZWQgdGhhdCB0aGUgZGVwbG95bWVudCB3b3VsZCBub3QgbWFrZSBhbnkgY2hhbmdlcy4nLFxuICAgICAgICAgICAgJ0FjY29yZGluZyB0byBDbG91ZEZvcm1hdGlvbiwgYWxsIHJlc291cmNlcyBhcmUgYWxyZWFkeSB1cC10by1kYXRlIHdpdGggdGhlIHN0YXRlIGluIHlvdXIgQ0RLIGFwcC4nLFxuICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAnWW91IGNhbm5vdCB1c2UgdGhlIC0tZm9yY2UgZmxhZyB0byBnZXQgcmlkIG9mIGNoYW5nZXMgeW91IG1hZGUgaW4gdGhlIGNvbnNvbGUuIFRyeSB1c2luZycsXG4gICAgICAgICAgICAnQ2xvdWRGb3JtYXRpb24gZHJpZnQgZGV0ZWN0aW9uIGluc3RlYWQ6IGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NDbG91ZEZvcm1hdGlvbi9sYXRlc3QvVXNlckd1aWRlL3VzaW5nLWNmbi1zdGFjay1kcmlmdC5odG1sJyxcbiAgICAgICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZGlkLWRlcGxveS1zdGFjaycsXG4gICAgICAgIG5vT3A6IHRydWUsXG4gICAgICAgIG91dHB1dHM6IHRoaXMuY2xvdWRGb3JtYXRpb25TdGFjay5vdXRwdXRzLFxuICAgICAgICBzdGFja0FybjogY2hhbmdlU2V0RGVzY3JpcHRpb24uU3RhY2tJZCEsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICghZXhlY3V0ZSkge1xuICAgICAgcHJpbnQoXG4gICAgICAgICdDaGFuZ2VzZXQgJXMgY3JlYXRlZCBhbmQgd2FpdGluZyBpbiByZXZpZXcgZm9yIG1hbnVhbCBleGVjdXRpb24gKC0tbm8tZXhlY3V0ZSknLFxuICAgICAgICBjaGFuZ2VTZXREZXNjcmlwdGlvbi5DaGFuZ2VTZXRJZCxcbiAgICAgICk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnZGlkLWRlcGxveS1zdGFjaycsXG4gICAgICAgIG5vT3A6IGZhbHNlLFxuICAgICAgICBvdXRwdXRzOiB0aGlzLmNsb3VkRm9ybWF0aW9uU3RhY2sub3V0cHV0cyxcbiAgICAgICAgc3RhY2tBcm46IGNoYW5nZVNldERlc2NyaXB0aW9uLlN0YWNrSWQhLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgcmVwbGFjZW1lbnRzIGluIHRoZSBjaGFuZ2VzZXQsIGNoZWNrIHRoZSByb2xsYmFjayBmbGFnIGFuZCBzdGFjayBzdGF0dXNcbiAgICBjb25zdCByZXBsYWNlbWVudCA9IGhhc1JlcGxhY2VtZW50KGNoYW5nZVNldERlc2NyaXB0aW9uKTtcbiAgICBjb25zdCBpc1BhdXNlZEZhaWxTdGF0ZSA9IHRoaXMuY2xvdWRGb3JtYXRpb25TdGFjay5zdGFja1N0YXR1cy5pc1JvbGxiYWNrYWJsZTtcbiAgICBjb25zdCByb2xsYmFjayA9IHRoaXMub3B0aW9ucy5yb2xsYmFjayA/PyB0cnVlO1xuICAgIGlmIChpc1BhdXNlZEZhaWxTdGF0ZSAmJiByZXBsYWNlbWVudCkge1xuICAgICAgcmV0dXJuIHsgdHlwZTogJ2ZhaWxwYXVzZWQtbmVlZC1yb2xsYmFjay1maXJzdCcsIHJlYXNvbjogJ3JlcGxhY2VtZW50Jywgc3RhdHVzOiB0aGlzLmNsb3VkRm9ybWF0aW9uU3RhY2suc3RhY2tTdGF0dXMubmFtZSB9O1xuICAgIH1cbiAgICBpZiAoaXNQYXVzZWRGYWlsU3RhdGUgJiYgcm9sbGJhY2spIHtcbiAgICAgIHJldHVybiB7IHR5cGU6ICdmYWlscGF1c2VkLW5lZWQtcm9sbGJhY2stZmlyc3QnLCByZWFzb246ICdub3Qtbm9yb2xsYmFjaycsIHN0YXR1czogdGhpcy5jbG91ZEZvcm1hdGlvblN0YWNrLnN0YWNrU3RhdHVzLm5hbWUgfTtcbiAgICB9XG4gICAgaWYgKCFyb2xsYmFjayAmJiByZXBsYWNlbWVudCkge1xuICAgICAgcmV0dXJuIHsgdHlwZTogJ3JlcGxhY2VtZW50LXJlcXVpcmVzLXJvbGxiYWNrJyB9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVDaGFuZ2VTZXQoY2hhbmdlU2V0RGVzY3JpcHRpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVDaGFuZ2VTZXQoY2hhbmdlU2V0TmFtZTogc3RyaW5nLCB3aWxsRXhlY3V0ZTogYm9vbGVhbiwgaW1wb3J0RXhpc3RpbmdSZXNvdXJjZXM6IGJvb2xlYW4pIHtcbiAgICBhd2FpdCB0aGlzLmNsZWFudXBPbGRDaGFuZ2VzZXQoY2hhbmdlU2V0TmFtZSk7XG5cbiAgICBkZWJ1ZyhgQXR0ZW1wdGluZyB0byBjcmVhdGUgQ2hhbmdlU2V0IHdpdGggbmFtZSAke2NoYW5nZVNldE5hbWV9IHRvICR7dGhpcy52ZXJifSBzdGFjayAke3RoaXMuc3RhY2tOYW1lfWApO1xuICAgIHByaW50KCclczogY3JlYXRpbmcgQ2xvdWRGb3JtYXRpb24gY2hhbmdlc2V0Li4uJywgY2hhbGsuYm9sZCh0aGlzLnN0YWNrTmFtZSkpO1xuICAgIGNvbnN0IGNoYW5nZVNldCA9IGF3YWl0IHRoaXMuY2ZuLmNyZWF0ZUNoYW5nZVNldCh7XG4gICAgICBTdGFja05hbWU6IHRoaXMuc3RhY2tOYW1lLFxuICAgICAgQ2hhbmdlU2V0TmFtZTogY2hhbmdlU2V0TmFtZSxcbiAgICAgIENoYW5nZVNldFR5cGU6IHRoaXMub3B0aW9ucy5yZXNvdXJjZXNUb0ltcG9ydCA/ICdJTVBPUlQnIDogdGhpcy51cGRhdGUgPyAnVVBEQVRFJyA6ICdDUkVBVEUnLFxuICAgICAgUmVzb3VyY2VzVG9JbXBvcnQ6IHRoaXMub3B0aW9ucy5yZXNvdXJjZXNUb0ltcG9ydCxcbiAgICAgIERlc2NyaXB0aW9uOiBgQ0RLIENoYW5nZXNldCBmb3IgZXhlY3V0aW9uICR7dGhpcy51dWlkfWAsXG4gICAgICBDbGllbnRUb2tlbjogYGNyZWF0ZSR7dGhpcy51dWlkfWAsXG4gICAgICBJbXBvcnRFeGlzdGluZ1Jlc291cmNlczogaW1wb3J0RXhpc3RpbmdSZXNvdXJjZXMsXG4gICAgICAuLi50aGlzLmNvbW1vblByZXBhcmVPcHRpb25zKCksXG4gICAgfSk7XG5cbiAgICBkZWJ1ZygnSW5pdGlhdGVkIGNyZWF0aW9uIG9mIGNoYW5nZXNldDogJXM7IHdhaXRpbmcgZm9yIGl0IHRvIGZpbmlzaCBjcmVhdGluZy4uLicsIGNoYW5nZVNldC5JZCk7XG4gICAgLy8gRmV0Y2hpbmcgYWxsIHBhZ2VzIGlmIHdlJ2xsIGV4ZWN1dGUsIHNvIHdlIGNhbiBoYXZlIHRoZSBjb3JyZWN0IGNoYW5nZSBjb3VudCB3aGVuIG1vbml0b3JpbmcuXG4gICAgcmV0dXJuIHdhaXRGb3JDaGFuZ2VTZXQodGhpcy5jZm4sIHRoaXMuc3RhY2tOYW1lLCBjaGFuZ2VTZXROYW1lLCB7XG4gICAgICBmZXRjaEFsbDogd2lsbEV4ZWN1dGUsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVDaGFuZ2VTZXQoY2hhbmdlU2V0OiBEZXNjcmliZUNoYW5nZVNldENvbW1hbmRPdXRwdXQpOiBQcm9taXNlPFN1Y2Nlc3NmdWxEZXBsb3lTdGFja1Jlc3VsdD4ge1xuICAgIGRlYnVnKCdJbml0aWF0aW5nIGV4ZWN1dGlvbiBvZiBjaGFuZ2VzZXQgJXMgb24gc3RhY2sgJXMnLCBjaGFuZ2VTZXQuQ2hhbmdlU2V0SWQsIHRoaXMuc3RhY2tOYW1lKTtcblxuICAgIGF3YWl0IHRoaXMuY2ZuLmV4ZWN1dGVDaGFuZ2VTZXQoe1xuICAgICAgU3RhY2tOYW1lOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgIENoYW5nZVNldE5hbWU6IGNoYW5nZVNldC5DaGFuZ2VTZXROYW1lISxcbiAgICAgIENsaWVudFJlcXVlc3RUb2tlbjogYGV4ZWMke3RoaXMudXVpZH1gLFxuICAgICAgLi4udGhpcy5jb21tb25FeGVjdXRlT3B0aW9ucygpLFxuICAgIH0pO1xuXG4gICAgZGVidWcoXG4gICAgICAnRXhlY3V0aW9uIG9mIGNoYW5nZXNldCAlcyBvbiBzdGFjayAlcyBoYXMgc3RhcnRlZDsgd2FpdGluZyBmb3IgdGhlIHVwZGF0ZSB0byBjb21wbGV0ZS4uLicsXG4gICAgICBjaGFuZ2VTZXQuQ2hhbmdlU2V0SWQsXG4gICAgICB0aGlzLnN0YWNrTmFtZSxcbiAgICApO1xuXG4gICAgLy8gKzEgZm9yIHRoZSBleHRyYSBldmVudCBlbWl0dGVkIGZyb20gdXBkYXRlcy5cbiAgICBjb25zdCBjaGFuZ2VTZXRMZW5ndGg6IG51bWJlciA9IChjaGFuZ2VTZXQuQ2hhbmdlcyA/PyBbXSkubGVuZ3RoICsgKHRoaXMudXBkYXRlID8gMSA6IDApO1xuICAgIHJldHVybiB0aGlzLm1vbml0b3JEZXBsb3ltZW50KGNoYW5nZVNldC5DcmVhdGlvblRpbWUhLCBjaGFuZ2VTZXRMZW5ndGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjbGVhbnVwT2xkQ2hhbmdlc2V0KGNoYW5nZVNldE5hbWU6IHN0cmluZykge1xuICAgIGlmICh0aGlzLmNsb3VkRm9ybWF0aW9uU3RhY2suZXhpc3RzKSB7XG4gICAgICAvLyBEZWxldGUgYW55IGV4aXN0aW5nIGNoYW5nZSBzZXRzIGdlbmVyYXRlZCBieSBDREsgc2luY2UgY2hhbmdlIHNldCBuYW1lcyBtdXN0IGJlIHVuaXF1ZS5cbiAgICAgIC8vIFRoZSBkZWxldGUgcmVxdWVzdCBpcyBzdWNjZXNzZnVsIGFzIGxvbmcgYXMgdGhlIHN0YWNrIGV4aXN0cyAoZXZlbiBpZiB0aGUgY2hhbmdlIHNldCBkb2VzIG5vdCBleGlzdCkuXG4gICAgICBkZWJ1ZyhgUmVtb3ZpbmcgZXhpc3RpbmcgY2hhbmdlIHNldCB3aXRoIG5hbWUgJHtjaGFuZ2VTZXROYW1lfSBpZiBpdCBleGlzdHNgKTtcbiAgICAgIGF3YWl0IHRoaXMuY2ZuLmRlbGV0ZUNoYW5nZVNldCh7XG4gICAgICAgIFN0YWNrTmFtZTogdGhpcy5zdGFja05hbWUsXG4gICAgICAgIENoYW5nZVNldE5hbWU6IGNoYW5nZVNldE5hbWUsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZVRlcm1pbmF0aW9uUHJvdGVjdGlvbigpIHtcbiAgICAvLyBVcGRhdGUgdGVybWluYXRpb24gcHJvdGVjdGlvbiBvbmx5IGlmIGl0IGhhcyBjaGFuZ2VkLlxuICAgIGNvbnN0IHRlcm1pbmF0aW9uUHJvdGVjdGlvbiA9IHRoaXMuc3RhY2tBcnRpZmFjdC50ZXJtaW5hdGlvblByb3RlY3Rpb24gPz8gZmFsc2U7XG4gICAgaWYgKCEhdGhpcy5jbG91ZEZvcm1hdGlvblN0YWNrLnRlcm1pbmF0aW9uUHJvdGVjdGlvbiAhPT0gdGVybWluYXRpb25Qcm90ZWN0aW9uKSB7XG4gICAgICBkZWJ1ZyhcbiAgICAgICAgJ1VwZGF0aW5nIHRlcm1pbmF0aW9uIHByb3RlY3Rpb24gZnJvbSAlcyB0byAlcyBmb3Igc3RhY2sgJXMnLFxuICAgICAgICB0aGlzLmNsb3VkRm9ybWF0aW9uU3RhY2sudGVybWluYXRpb25Qcm90ZWN0aW9uLFxuICAgICAgICB0ZXJtaW5hdGlvblByb3RlY3Rpb24sXG4gICAgICAgIHRoaXMuc3RhY2tOYW1lLFxuICAgICAgKTtcbiAgICAgIGF3YWl0IHRoaXMuY2ZuLnVwZGF0ZVRlcm1pbmF0aW9uUHJvdGVjdGlvbih7XG4gICAgICAgIFN0YWNrTmFtZTogdGhpcy5zdGFja05hbWUsXG4gICAgICAgIEVuYWJsZVRlcm1pbmF0aW9uUHJvdGVjdGlvbjogdGVybWluYXRpb25Qcm90ZWN0aW9uLFxuICAgICAgfSk7XG4gICAgICBkZWJ1ZygnVGVybWluYXRpb24gcHJvdGVjdGlvbiB1cGRhdGVkIHRvICVzIGZvciBzdGFjayAlcycsIHRlcm1pbmF0aW9uUHJvdGVjdGlvbiwgdGhpcy5zdGFja05hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGlyZWN0RGVwbG95bWVudCgpOiBQcm9taXNlPFN1Y2Nlc3NmdWxEZXBsb3lTdGFja1Jlc3VsdD4ge1xuICAgIHByaW50KCclczogJXMgc3RhY2suLi4nLCBjaGFsay5ib2xkKHRoaXMuc3RhY2tOYW1lKSwgdGhpcy51cGRhdGUgPyAndXBkYXRpbmcnIDogJ2NyZWF0aW5nJyk7XG5cbiAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpO1xuXG4gICAgaWYgKHRoaXMudXBkYXRlKSB7XG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZVRlcm1pbmF0aW9uUHJvdGVjdGlvbigpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLmNmbi51cGRhdGVTdGFjayh7XG4gICAgICAgICAgU3RhY2tOYW1lOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgICAgICBDbGllbnRSZXF1ZXN0VG9rZW46IGB1cGRhdGUke3RoaXMudXVpZH1gLFxuICAgICAgICAgIC4uLnRoaXMuY29tbW9uUHJlcGFyZU9wdGlvbnMoKSxcbiAgICAgICAgICAuLi50aGlzLmNvbW1vbkV4ZWN1dGVPcHRpb25zKCksXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgaWYgKGVyci5tZXNzYWdlID09PSAnTm8gdXBkYXRlcyBhcmUgdG8gYmUgcGVyZm9ybWVkLicpIHtcbiAgICAgICAgICBkZWJ1ZygnTm8gdXBkYXRlcyBhcmUgdG8gYmUgcGVyZm9ybWVkIGZvciBzdGFjayAlcycsIHRoaXMuc3RhY2tOYW1lKTtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ2RpZC1kZXBsb3ktc3RhY2snLFxuICAgICAgICAgICAgbm9PcDogdHJ1ZSxcbiAgICAgICAgICAgIG91dHB1dHM6IHRoaXMuY2xvdWRGb3JtYXRpb25TdGFjay5vdXRwdXRzLFxuICAgICAgICAgICAgc3RhY2tBcm46IHRoaXMuY2xvdWRGb3JtYXRpb25TdGFjay5zdGFja0lkLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5tb25pdG9yRGVwbG95bWVudChzdGFydFRpbWUsIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRha2UgYWR2YW50YWdlIG9mIHRoZSBmYWN0IHRoYXQgd2UgY2FuIHNldCB0ZXJtaW5hdGlvbiBwcm90ZWN0aW9uIGR1cmluZyBjcmVhdGVcbiAgICAgIGNvbnN0IHRlcm1pbmF0aW9uUHJvdGVjdGlvbiA9IHRoaXMuc3RhY2tBcnRpZmFjdC50ZXJtaW5hdGlvblByb3RlY3Rpb24gPz8gZmFsc2U7XG5cbiAgICAgIGF3YWl0IHRoaXMuY2ZuLmNyZWF0ZVN0YWNrKHtcbiAgICAgICAgU3RhY2tOYW1lOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgICAgQ2xpZW50UmVxdWVzdFRva2VuOiBgY3JlYXRlJHt0aGlzLnV1aWR9YCxcbiAgICAgICAgLi4uKHRlcm1pbmF0aW9uUHJvdGVjdGlvbiA/IHsgRW5hYmxlVGVybWluYXRpb25Qcm90ZWN0aW9uOiB0cnVlIH0gOiB1bmRlZmluZWQpLFxuICAgICAgICAuLi50aGlzLmNvbW1vblByZXBhcmVPcHRpb25zKCksXG4gICAgICAgIC4uLnRoaXMuY29tbW9uRXhlY3V0ZU9wdGlvbnMoKSxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdGhpcy5tb25pdG9yRGVwbG95bWVudChzdGFydFRpbWUsIHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtb25pdG9yRGVwbG95bWVudChzdGFydFRpbWU6IERhdGUsIGV4cGVjdGVkQ2hhbmdlczogbnVtYmVyIHwgdW5kZWZpbmVkKTogUHJvbWlzZTxTdWNjZXNzZnVsRGVwbG95U3RhY2tSZXN1bHQ+IHtcbiAgICBjb25zdCBtb25pdG9yID0gdGhpcy5vcHRpb25zLnF1aWV0XG4gICAgICA/IHVuZGVmaW5lZFxuICAgICAgOiBTdGFja0FjdGl2aXR5TW9uaXRvci53aXRoRGVmYXVsdFByaW50ZXIodGhpcy5jZm4sIHRoaXMuc3RhY2tOYW1lLCB0aGlzLnN0YWNrQXJ0aWZhY3QsIHtcbiAgICAgICAgcmVzb3VyY2VzVG90YWw6IGV4cGVjdGVkQ2hhbmdlcyxcbiAgICAgICAgcHJvZ3Jlc3M6IHRoaXMub3B0aW9ucy5wcm9ncmVzcyxcbiAgICAgICAgY2hhbmdlU2V0Q3JlYXRpb25UaW1lOiBzdGFydFRpbWUsXG4gICAgICAgIGNpOiB0aGlzLm9wdGlvbnMuY2ksXG4gICAgICB9KS5zdGFydCgpO1xuXG4gICAgbGV0IGZpbmFsU3RhdGUgPSB0aGlzLmNsb3VkRm9ybWF0aW9uU3RhY2s7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN1Y2Nlc3NTdGFjayA9IGF3YWl0IHdhaXRGb3JTdGFja0RlcGxveSh0aGlzLmNmbiwgdGhpcy5zdGFja05hbWUpO1xuXG4gICAgICAvLyBUaGlzIHNob3VsZG4ndCByZWFsbHkgaGFwcGVuLCBidXQgY2F0Y2ggaXQgYW55d2F5LiBZb3UgbmV2ZXIga25vdy5cbiAgICAgIGlmICghc3VjY2Vzc1N0YWNrKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU3RhY2sgZGVwbG95IGZhaWxlZCAodGhlIHN0YWNrIGRpc2FwcGVhcmVkIHdoaWxlIHdlIHdlcmUgZGVwbG95aW5nIGl0KScpO1xuICAgICAgfVxuICAgICAgZmluYWxTdGF0ZSA9IHN1Y2Nlc3NTdGFjaztcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihzdWZmaXhXaXRoRXJyb3JzKGUubWVzc2FnZSwgbW9uaXRvcj8uZXJyb3JzKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IG1vbml0b3I/LnN0b3AoKTtcbiAgICB9XG4gICAgZGVidWcoJ1N0YWNrICVzIGhhcyBjb21wbGV0ZWQgdXBkYXRpbmcnLCB0aGlzLnN0YWNrTmFtZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdkaWQtZGVwbG95LXN0YWNrJyxcbiAgICAgIG5vT3A6IGZhbHNlLFxuICAgICAgb3V0cHV0czogZmluYWxTdGF0ZS5vdXRwdXRzLFxuICAgICAgc3RhY2tBcm46IGZpbmFsU3RhdGUuc3RhY2tJZCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgb3B0aW9ucyB0aGF0IGFyZSBzaGFyZWQgYmV0d2VlbiBDcmVhdGVTdGFjaywgVXBkYXRlU3RhY2sgYW5kIENyZWF0ZUNoYW5nZVNldFxuICAgKi9cbiAgcHJpdmF0ZSBjb21tb25QcmVwYXJlT3B0aW9ucygpOiBQYXJ0aWFsPFBpY2s8VXBkYXRlU3RhY2tDb21tYW5kSW5wdXQsIENvbW1vblByZXBhcmVPcHRpb25zPj4ge1xuICAgIHJldHVybiB7XG4gICAgICBDYXBhYmlsaXRpZXM6IFsnQ0FQQUJJTElUWV9JQU0nLCAnQ0FQQUJJTElUWV9OQU1FRF9JQU0nLCAnQ0FQQUJJTElUWV9BVVRPX0VYUEFORCddLFxuICAgICAgTm90aWZpY2F0aW9uQVJOczogdGhpcy5vcHRpb25zLm5vdGlmaWNhdGlvbkFybnMsXG4gICAgICBQYXJhbWV0ZXJzOiB0aGlzLnN0YWNrUGFyYW1zLmFwaVBhcmFtZXRlcnMsXG4gICAgICBSb2xlQVJOOiB0aGlzLm9wdGlvbnMucm9sZUFybixcbiAgICAgIFRlbXBsYXRlQm9keTogdGhpcy5ib2R5UGFyYW1ldGVyLlRlbXBsYXRlQm9keSxcbiAgICAgIFRlbXBsYXRlVVJMOiB0aGlzLmJvZHlQYXJhbWV0ZXIuVGVtcGxhdGVVUkwsXG4gICAgICBUYWdzOiB0aGlzLm9wdGlvbnMudGFncyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgb3B0aW9ucyB0aGF0IGFyZSBzaGFyZWQgYmV0d2VlbiBVcGRhdGVTdGFjayBhbmQgQ3JlYXRlQ2hhbmdlU2V0XG4gICAqXG4gICAqIEJlIGNhcmVmdWwgbm90IHRvIGFkZCBpbiBrZXlzIGZvciBvcHRpb25zIHRoYXQgYXJlbid0IHVzZWQsIGFzIHRoZSBmZWF0dXJlcyBtYXkgbm90IGhhdmUgYmVlblxuICAgKiBkZXBsb3llZCBldmVyeXdoZXJlIHlldC5cbiAgICovXG4gIHByaXZhdGUgY29tbW9uRXhlY3V0ZU9wdGlvbnMoKTogUGFydGlhbDxQaWNrPFVwZGF0ZVN0YWNrQ29tbWFuZElucHV0LCBDb21tb25FeGVjdXRlT3B0aW9ucz4+IHtcbiAgICBjb25zdCBzaG91bGREaXNhYmxlUm9sbGJhY2sgPSB0aGlzLm9wdGlvbnMucm9sbGJhY2sgPT09IGZhbHNlO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIFN0YWNrTmFtZTogdGhpcy5zdGFja05hbWUsXG4gICAgICAuLi4oc2hvdWxkRGlzYWJsZVJvbGxiYWNrID8geyBEaXNhYmxlUm9sbGJhY2s6IHRydWUgfSA6IHVuZGVmaW5lZCksXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlc3Ryb3lTdGFja09wdGlvbnMge1xuICAvKipcbiAgICogVGhlIHN0YWNrIHRvIGJlIGRlc3Ryb3llZFxuICAgKi9cbiAgc3RhY2s6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdDtcblxuICBzZGs6IFNESztcbiAgcm9sZUFybj86IHN0cmluZztcbiAgZGVwbG95TmFtZT86IHN0cmluZztcbiAgcXVpZXQ/OiBib29sZWFuO1xuICBjaT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZXN0cm95U3RhY2sob3B0aW9uczogRGVzdHJveVN0YWNrT3B0aW9ucykge1xuICBjb25zdCBkZXBsb3lOYW1lID0gb3B0aW9ucy5kZXBsb3lOYW1lIHx8IG9wdGlvbnMuc3RhY2suc3RhY2tOYW1lO1xuICBjb25zdCBjZm4gPSBvcHRpb25zLnNkay5jbG91ZEZvcm1hdGlvbigpO1xuXG4gIGNvbnN0IGN1cnJlbnRTdGFjayA9IGF3YWl0IENsb3VkRm9ybWF0aW9uU3RhY2subG9va3VwKGNmbiwgZGVwbG95TmFtZSk7XG4gIGlmICghY3VycmVudFN0YWNrLmV4aXN0cykge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBtb25pdG9yID0gb3B0aW9ucy5xdWlldFxuICAgID8gdW5kZWZpbmVkXG4gICAgOiBTdGFja0FjdGl2aXR5TW9uaXRvci53aXRoRGVmYXVsdFByaW50ZXIoY2ZuLCBkZXBsb3lOYW1lLCBvcHRpb25zLnN0YWNrLCB7XG4gICAgICBjaTogb3B0aW9ucy5jaSxcbiAgICB9KS5zdGFydCgpO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgY2ZuLmRlbGV0ZVN0YWNrKHsgU3RhY2tOYW1lOiBkZXBsb3lOYW1lLCBSb2xlQVJOOiBvcHRpb25zLnJvbGVBcm4gfSk7XG4gICAgY29uc3QgZGVzdHJveWVkU3RhY2sgPSBhd2FpdCB3YWl0Rm9yU3RhY2tEZWxldGUoY2ZuLCBkZXBsb3lOYW1lKTtcbiAgICBpZiAoZGVzdHJveWVkU3RhY2sgJiYgZGVzdHJveWVkU3RhY2suc3RhY2tTdGF0dXMubmFtZSAhPT0gJ0RFTEVURV9DT01QTEVURScpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGRlc3Ryb3kgJHtkZXBsb3lOYW1lfTogJHtkZXN0cm95ZWRTdGFjay5zdGFja1N0YXR1c31gKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgIHRocm93IG5ldyBFcnJvcihzdWZmaXhXaXRoRXJyb3JzKGUubWVzc2FnZSwgbW9uaXRvcj8uZXJyb3JzKSk7XG4gIH0gZmluYWxseSB7XG4gICAgaWYgKG1vbml0b3IpIHtcbiAgICAgIGF3YWl0IG1vbml0b3Iuc3RvcCgpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIHdlIGNhbiBza2lwIGRlcGxveW1lbnRcbiAqXG4gKiBXZSBkbyB0aGlzIGluIGEgY29tcGxpY2F0ZWQgd2F5IGJ5IHByZXByb2Nlc3NpbmcgKGluc3RlYWQgb2YganVzdFxuICogbG9va2luZyBhdCB0aGUgY2hhbmdlc2V0KSwgYmVjYXVzZSBpZiB0aGVyZSBhcmUgbmVzdGVkIHN0YWNrcyBpbnZvbHZlZFxuICogdGhlIGNoYW5nZXNldCB3aWxsIGFsd2F5cyBzaG93IHRoZSBuZXN0ZWQgc3RhY2tzIGFzIG5lZWRpbmcgdG8gYmVcbiAqIHVwZGF0ZWQsIGFuZCB0aGUgZGVwbG95bWVudCB3aWxsIHRha2UgYSBsb25nIHRpbWUgdG8gaW4gZWZmZWN0IG5vdFxuICogZG8gYW55dGhpbmcuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNhblNraXBEZXBsb3koXG4gIGRlcGxveVN0YWNrT3B0aW9uczogRGVwbG95U3RhY2tPcHRpb25zLFxuICBjbG91ZEZvcm1hdGlvblN0YWNrOiBDbG91ZEZvcm1hdGlvblN0YWNrLFxuICBwYXJhbWV0ZXJDaGFuZ2VzOiBQYXJhbWV0ZXJDaGFuZ2VzLFxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGRlcGxveU5hbWUgPSBkZXBsb3lTdGFja09wdGlvbnMuZGVwbG95TmFtZSB8fCBkZXBsb3lTdGFja09wdGlvbnMuc3RhY2suc3RhY2tOYW1lO1xuICBkZWJ1ZyhgJHtkZXBsb3lOYW1lfTogY2hlY2tpbmcgaWYgd2UgY2FuIHNraXAgZGVwbG95YCk7XG5cbiAgLy8gRm9yY2VkIGRlcGxveVxuICBpZiAoZGVwbG95U3RhY2tPcHRpb25zLmZvcmNlKSB7XG4gICAgZGVidWcoYCR7ZGVwbG95TmFtZX06IGZvcmNlZCBkZXBsb3ltZW50YCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gQ3JlYXRpbmcgY2hhbmdlc2V0IG9ubHkgKGRlZmF1bHQgdHJ1ZSksIG5ldmVyIHNraXBcbiAgaWYgKFxuICAgIGRlcGxveVN0YWNrT3B0aW9ucy5kZXBsb3ltZW50TWV0aG9kPy5tZXRob2QgPT09ICdjaGFuZ2Utc2V0JyAmJlxuICAgIGRlcGxveVN0YWNrT3B0aW9ucy5kZXBsb3ltZW50TWV0aG9kLmV4ZWN1dGUgPT09IGZhbHNlXG4gICkge1xuICAgIGRlYnVnKGAke2RlcGxveU5hbWV9OiAtLW5vLWV4ZWN1dGUsIGFsd2F5cyBjcmVhdGluZyBjaGFuZ2Ugc2V0YCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTm8gZXhpc3Rpbmcgc3RhY2tcbiAgaWYgKCFjbG91ZEZvcm1hdGlvblN0YWNrLmV4aXN0cykge1xuICAgIGRlYnVnKGAke2RlcGxveU5hbWV9OiBubyBleGlzdGluZyBzdGFja2ApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRlbXBsYXRlIGhhcyBjaGFuZ2VkIChhc3NldHMgdGFrZW4gaW50byBhY2NvdW50IGhlcmUpXG4gIGlmIChKU09OLnN0cmluZ2lmeShkZXBsb3lTdGFja09wdGlvbnMuc3RhY2sudGVtcGxhdGUpICE9PSBKU09OLnN0cmluZ2lmeShhd2FpdCBjbG91ZEZvcm1hdGlvblN0YWNrLnRlbXBsYXRlKCkpKSB7XG4gICAgZGVidWcoYCR7ZGVwbG95TmFtZX06IHRlbXBsYXRlIGhhcyBjaGFuZ2VkYCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVGFncyBoYXZlIGNoYW5nZWRcbiAgaWYgKCFjb21wYXJlVGFncyhjbG91ZEZvcm1hdGlvblN0YWNrLnRhZ3MsIGRlcGxveVN0YWNrT3B0aW9ucy50YWdzID8/IFtdKSkge1xuICAgIGRlYnVnKGAke2RlcGxveU5hbWV9OiB0YWdzIGhhdmUgY2hhbmdlZGApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIE5vdGlmaWNhdGlvbiBhcm5zIGhhdmUgY2hhbmdlZFxuICBpZiAoIWFycmF5RXF1YWxzKGNsb3VkRm9ybWF0aW9uU3RhY2subm90aWZpY2F0aW9uQXJucywgZGVwbG95U3RhY2tPcHRpb25zLm5vdGlmaWNhdGlvbkFybnMgPz8gW10pKSB7XG4gICAgZGVidWcoYCR7ZGVwbG95TmFtZX06IG5vdGlmaWNhdGlvbiBhcm5zIGhhdmUgY2hhbmdlZGApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFRlcm1pbmF0aW9uIHByb3RlY3Rpb24gaGFzIGJlZW4gdXBkYXRlZFxuICBpZiAoISFkZXBsb3lTdGFja09wdGlvbnMuc3RhY2sudGVybWluYXRpb25Qcm90ZWN0aW9uICE9PSAhIWNsb3VkRm9ybWF0aW9uU3RhY2sudGVybWluYXRpb25Qcm90ZWN0aW9uKSB7XG4gICAgZGVidWcoYCR7ZGVwbG95TmFtZX06IHRlcm1pbmF0aW9uIHByb3RlY3Rpb24gaGFzIGJlZW4gdXBkYXRlZGApO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFBhcmFtZXRlcnMgaGF2ZSBjaGFuZ2VkXG4gIGlmIChwYXJhbWV0ZXJDaGFuZ2VzKSB7XG4gICAgaWYgKHBhcmFtZXRlckNoYW5nZXMgPT09ICdzc20nKSB7XG4gICAgICBkZWJ1ZyhgJHtkZXBsb3lOYW1lfTogc29tZSBwYXJhbWV0ZXJzIGNvbWUgZnJvbSBTU00gc28gd2UgaGF2ZSB0byBhc3N1bWUgdGhleSBtYXkgaGF2ZSBjaGFuZ2VkYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnKGAke2RlcGxveU5hbWV9OiBwYXJhbWV0ZXJzIGhhdmUgY2hhbmdlZGApO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBFeGlzdGluZyBzdGFjayBpcyBpbiBhIGZhaWxlZCBzdGF0ZVxuICBpZiAoY2xvdWRGb3JtYXRpb25TdGFjay5zdGFja1N0YXR1cy5pc0ZhaWx1cmUpIHtcbiAgICBkZWJ1ZyhgJHtkZXBsb3lOYW1lfTogc3RhY2sgaXMgaW4gYSBmYWlsdXJlIHN0YXRlYCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gV2UgY2FuIHNraXAgZGVwbG95XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHR3byBsaXN0IG9mIHRhZ3MsIHJldHVybnMgdHJ1ZSBpZiBpZGVudGljYWwuXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmVUYWdzKGE6IFRhZ1tdLCBiOiBUYWdbXSk6IGJvb2xlYW4ge1xuICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yIChjb25zdCBhVGFnIG9mIGEpIHtcbiAgICBjb25zdCBiVGFnID0gYi5maW5kKCh0YWcpID0+IHRhZy5LZXkgPT09IGFUYWcuS2V5KTtcblxuICAgIGlmICghYlRhZyB8fCBiVGFnLlZhbHVlICE9PSBhVGFnLlZhbHVlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHN1ZmZpeFdpdGhFcnJvcnMobXNnOiBzdHJpbmcsIGVycm9ycz86IHN0cmluZ1tdKSB7XG4gIHJldHVybiBlcnJvcnMgJiYgZXJyb3JzLmxlbmd0aCA+IDAgPyBgJHttc2d9OiAke2Vycm9ycy5qb2luKCcsICcpfWAgOiBtc2c7XG59XG5cbmZ1bmN0aW9uIGFycmF5RXF1YWxzKGE6IGFueVtdLCBiOiBhbnlbXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gYS5ldmVyeSgoaXRlbSkgPT4gYi5pbmNsdWRlcyhpdGVtKSkgJiYgYi5ldmVyeSgoaXRlbSkgPT4gYS5pbmNsdWRlcyhpdGVtKSk7XG59XG5cbmZ1bmN0aW9uIGhhc1JlcGxhY2VtZW50KGNzOiBEZXNjcmliZUNoYW5nZVNldENvbW1hbmRPdXRwdXQpIHtcbiAgcmV0dXJuIChjcy5DaGFuZ2VzID8/IFtdKS5zb21lKGMgPT4ge1xuICAgIGNvbnN0IGEgPSBjLlJlc291cmNlQ2hhbmdlPy5Qb2xpY3lBY3Rpb247XG4gICAgcmV0dXJuIGEgPT09ICdSZXBsYWNlQW5kRGVsZXRlJyB8fCBhID09PSAnUmVwbGFjZUFuZFJldGFpbicgfHwgYSA9PT0gJ1JlcGxhY2VBbmRTbmFwc2hvdCc7XG4gIH0pO1xufVxuIl19