"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryHotswapDeployment = tryHotswapDeployment;
const cfn_diff = require("@aws-cdk/cloudformation-diff");
const chalk = require("chalk");
const evaluate_cloudformation_template_1 = require("./evaluate-cloudformation-template");
const logging_1 = require("../logging");
const appsync_mapping_templates_1 = require("./hotswap/appsync-mapping-templates");
const code_build_projects_1 = require("./hotswap/code-build-projects");
const common_1 = require("./hotswap/common");
const ecs_services_1 = require("./hotswap/ecs-services");
const lambda_functions_1 = require("./hotswap/lambda-functions");
const s3_bucket_deployments_1 = require("./hotswap/s3-bucket-deployments");
const stepfunctions_state_machines_1 = require("./hotswap/stepfunctions-state-machines");
const nested_stack_helpers_1 = require("./nested-stack-helpers");
const mode_1 = require("./plugin/mode");
// Must use a require() otherwise esbuild complains about calling a namespace
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pLimit = require('p-limit');
const RESOURCE_DETECTORS = {
    // Lambda
    'AWS::Lambda::Function': lambda_functions_1.isHotswappableLambdaFunctionChange,
    'AWS::Lambda::Version': lambda_functions_1.isHotswappableLambdaFunctionChange,
    'AWS::Lambda::Alias': lambda_functions_1.isHotswappableLambdaFunctionChange,
    // AppSync
    'AWS::AppSync::Resolver': appsync_mapping_templates_1.isHotswappableAppSyncChange,
    'AWS::AppSync::FunctionConfiguration': appsync_mapping_templates_1.isHotswappableAppSyncChange,
    'AWS::AppSync::GraphQLSchema': appsync_mapping_templates_1.isHotswappableAppSyncChange,
    'AWS::AppSync::ApiKey': appsync_mapping_templates_1.isHotswappableAppSyncChange,
    'AWS::ECS::TaskDefinition': ecs_services_1.isHotswappableEcsServiceChange,
    'AWS::CodeBuild::Project': code_build_projects_1.isHotswappableCodeBuildProjectChange,
    'AWS::StepFunctions::StateMachine': stepfunctions_state_machines_1.isHotswappableStateMachineChange,
    'Custom::CDKBucketDeployment': s3_bucket_deployments_1.isHotswappableS3BucketDeploymentChange,
    'AWS::IAM::Policy': async (logicalId, change, evaluateCfnTemplate) => {
        // If the policy is for a S3BucketDeploymentChange, we can ignore the change
        if (await (0, s3_bucket_deployments_1.skipChangeForS3DeployCustomResourcePolicy)(logicalId, change, evaluateCfnTemplate)) {
            return [];
        }
        return (0, common_1.reportNonHotswappableResource)(change, 'This resource type is not supported for hotswap deployments');
    },
    'AWS::CDK::Metadata': async () => [],
};
/**
 * Perform a hotswap deployment, short-circuiting CloudFormation if possible.
 * If it's not possible to short-circuit the deployment
 * (because the CDK Stack contains changes that cannot be deployed without CloudFormation),
 * returns `undefined`.
 */
async function tryHotswapDeployment(sdkProvider, assetParams, cloudFormationStack, stackArtifact, hotswapMode, hotswapPropertyOverrides) {
    // resolve the environment, so we can substitute things like AWS::Region in CFN expressions
    const resolvedEnv = await sdkProvider.resolveEnvironment(stackArtifact.environment);
    // create a new SDK using the CLI credentials, because the default one will not work for new-style synthesis -
    // it assumes the bootstrap deploy Role, which doesn't have permissions to update Lambda functions
    const sdk = (await sdkProvider.forEnvironment(resolvedEnv, mode_1.Mode.ForWriting)).sdk;
    const currentTemplate = await (0, nested_stack_helpers_1.loadCurrentTemplateWithNestedStacks)(stackArtifact, sdk);
    const evaluateCfnTemplate = new evaluate_cloudformation_template_1.EvaluateCloudFormationTemplate({
        stackName: stackArtifact.stackName,
        template: stackArtifact.template,
        parameters: assetParams,
        account: resolvedEnv.account,
        region: resolvedEnv.region,
        partition: (await sdk.currentAccount()).partition,
        sdk,
        nestedStacks: currentTemplate.nestedStacks,
    });
    const stackChanges = cfn_diff.fullDiff(currentTemplate.deployedRootTemplate, stackArtifact.template);
    const { hotswappableChanges, nonHotswappableChanges } = await classifyResourceChanges(stackChanges, evaluateCfnTemplate, sdk, currentTemplate.nestedStacks, hotswapPropertyOverrides);
    logNonHotswappableChanges(nonHotswappableChanges, hotswapMode);
    // preserve classic hotswap behavior
    if (hotswapMode === common_1.HotswapMode.FALL_BACK) {
        if (nonHotswappableChanges.length > 0) {
            return undefined;
        }
    }
    // apply the short-circuitable changes
    await applyAllHotswappableChanges(sdk, hotswappableChanges);
    return {
        type: 'did-deploy-stack',
        noOp: hotswappableChanges.length === 0,
        stackArn: cloudFormationStack.stackId,
        outputs: cloudFormationStack.outputs,
    };
}
/**
 * Classifies all changes to all resources as either hotswappable or not.
 * Metadata changes are excluded from the list of (non)hotswappable resources.
 */
async function classifyResourceChanges(stackChanges, evaluateCfnTemplate, sdk, nestedStackNames, hotswapPropertyOverrides) {
    const resourceDifferences = getStackResourceDifferences(stackChanges);
    const promises = [];
    const hotswappableResources = new Array();
    const nonHotswappableResources = new Array();
    for (const logicalId of Object.keys(stackChanges.outputs.changes)) {
        nonHotswappableResources.push({
            hotswappable: false,
            reason: 'output was changed',
            logicalId,
            rejectedChanges: [],
            resourceType: 'Stack Output',
        });
    }
    // gather the results of the detector functions
    for (const [logicalId, change] of Object.entries(resourceDifferences)) {
        if (change.newValue?.Type === 'AWS::CloudFormation::Stack' && change.oldValue?.Type === 'AWS::CloudFormation::Stack') {
            const nestedHotswappableResources = await findNestedHotswappableChanges(logicalId, change, nestedStackNames, evaluateCfnTemplate, sdk, hotswapPropertyOverrides);
            hotswappableResources.push(...nestedHotswappableResources.hotswappableChanges);
            nonHotswappableResources.push(...nestedHotswappableResources.nonHotswappableChanges);
            continue;
        }
        const hotswappableChangeCandidate = isCandidateForHotswapping(change, logicalId);
        // we don't need to run this through the detector functions, we can already judge this
        if ('hotswappable' in hotswappableChangeCandidate) {
            if (!hotswappableChangeCandidate.hotswappable) {
                nonHotswappableResources.push(hotswappableChangeCandidate);
            }
            continue;
        }
        const resourceType = hotswappableChangeCandidate.newValue.Type;
        if (resourceType in RESOURCE_DETECTORS) {
            // run detector functions lazily to prevent unhandled promise rejections
            promises.push(() => RESOURCE_DETECTORS[resourceType](logicalId, hotswappableChangeCandidate, evaluateCfnTemplate, hotswapPropertyOverrides));
        }
        else {
            (0, common_1.reportNonHotswappableChange)(nonHotswappableResources, hotswappableChangeCandidate, undefined, 'This resource type is not supported for hotswap deployments');
        }
    }
    // resolve all detector results
    const changesDetectionResults = [];
    for (const detectorResultPromises of promises) {
        // Constant set of promises per resource
        // eslint-disable-next-line @cdklabs/promiseall-no-unbounded-parallelism
        const hotswapDetectionResults = await Promise.all(await detectorResultPromises());
        changesDetectionResults.push(hotswapDetectionResults);
    }
    for (const resourceDetectionResults of changesDetectionResults) {
        for (const propertyResult of resourceDetectionResults) {
            propertyResult.hotswappable
                ? hotswappableResources.push(propertyResult)
                : nonHotswappableResources.push(propertyResult);
        }
    }
    return {
        hotswappableChanges: hotswappableResources,
        nonHotswappableChanges: nonHotswappableResources,
    };
}
/**
 * Returns all changes to resources in the given Stack.
 *
 * @param stackChanges the collection of all changes to a given Stack
 */
function getStackResourceDifferences(stackChanges) {
    // we need to collapse logical ID rename changes into one change,
    // as they are represented in stackChanges as a pair of two changes: one addition and one removal
    const allResourceChanges = stackChanges.resources.changes;
    const allRemovalChanges = filterDict(allResourceChanges, (resChange) => resChange.isRemoval);
    const allNonRemovalChanges = filterDict(allResourceChanges, (resChange) => !resChange.isRemoval);
    for (const [logId, nonRemovalChange] of Object.entries(allNonRemovalChanges)) {
        if (nonRemovalChange.isAddition) {
            const addChange = nonRemovalChange;
            // search for an identical removal change
            const identicalRemovalChange = Object.entries(allRemovalChanges).find(([_, remChange]) => {
                return changesAreForSameResource(remChange, addChange);
            });
            // if we found one, then this means this is a rename change
            if (identicalRemovalChange) {
                const [removedLogId, removedResourceChange] = identicalRemovalChange;
                allNonRemovalChanges[logId] = makeRenameDifference(removedResourceChange, addChange);
                // delete the removal change that forms the rename pair
                delete allRemovalChanges[removedLogId];
            }
        }
    }
    // the final result are all of the remaining removal changes,
    // plus all of the non-removal changes
    // (we saved the rename changes in that object already)
    return {
        ...allRemovalChanges,
        ...allNonRemovalChanges,
    };
}
/** Filters an object with string keys based on whether the callback returns 'true' for the given value in the object. */
function filterDict(dict, func) {
    return Object.entries(dict).reduce((acc, [key, t]) => {
        if (func(t)) {
            acc[key] = t;
        }
        return acc;
    }, {});
}
/** Finds any hotswappable changes in all nested stacks. */
async function findNestedHotswappableChanges(logicalId, change, nestedStackTemplates, evaluateCfnTemplate, sdk, hotswapPropertyOverrides) {
    const nestedStack = nestedStackTemplates[logicalId];
    if (!nestedStack.physicalName) {
        return {
            hotswappableChanges: [],
            nonHotswappableChanges: [
                {
                    hotswappable: false,
                    logicalId,
                    reason: `physical name for AWS::CloudFormation::Stack '${logicalId}' could not be found in CloudFormation, so this is a newly created nested stack and cannot be hotswapped`,
                    rejectedChanges: [],
                    resourceType: 'AWS::CloudFormation::Stack',
                },
            ],
        };
    }
    const evaluateNestedCfnTemplate = await evaluateCfnTemplate.createNestedEvaluateCloudFormationTemplate(nestedStack.physicalName, nestedStack.generatedTemplate, change.newValue?.Properties?.Parameters);
    const nestedDiff = cfn_diff.fullDiff(nestedStackTemplates[logicalId].deployedTemplate, nestedStackTemplates[logicalId].generatedTemplate);
    return classifyResourceChanges(nestedDiff, evaluateNestedCfnTemplate, sdk, nestedStackTemplates[logicalId].nestedStackTemplates, hotswapPropertyOverrides);
}
/** Returns 'true' if a pair of changes is for the same resource. */
function changesAreForSameResource(oldChange, newChange) {
    return (oldChange.oldResourceType === newChange.newResourceType &&
        // this isn't great, but I don't want to bring in something like underscore just for this comparison
        JSON.stringify(oldChange.oldProperties) === JSON.stringify(newChange.newProperties));
}
function makeRenameDifference(remChange, addChange) {
    return new cfn_diff.ResourceDifference(
    // we have to fill in the old value, because otherwise this will be classified as a non-hotswappable change
    remChange.oldValue, addChange.newValue, {
        resourceType: {
            oldType: remChange.oldResourceType,
            newType: addChange.newResourceType,
        },
        propertyDiffs: addChange.propertyDiffs,
        otherDiffs: addChange.otherDiffs,
    });
}
/**
 * Returns a `HotswappableChangeCandidate` if the change is hotswappable
 * Returns an empty `HotswappableChange` if the change is to CDK::Metadata
 * Returns a `NonHotswappableChange` if the change is not hotswappable
 */
function isCandidateForHotswapping(change, logicalId) {
    // a resource has been removed OR a resource has been added; we can't short-circuit that change
    if (!change.oldValue) {
        return {
            hotswappable: false,
            resourceType: change.newValue.Type,
            logicalId,
            rejectedChanges: [],
            reason: `resource '${logicalId}' was created by this deployment`,
        };
    }
    else if (!change.newValue) {
        return {
            hotswappable: false,
            resourceType: change.oldValue.Type,
            logicalId,
            rejectedChanges: [],
            reason: `resource '${logicalId}' was destroyed by this deployment`,
        };
    }
    // a resource has had its type changed
    if (change.newValue?.Type !== change.oldValue?.Type) {
        return {
            hotswappable: false,
            resourceType: change.newValue?.Type,
            logicalId,
            rejectedChanges: [],
            reason: `resource '${logicalId}' had its type changed from '${change.oldValue?.Type}' to '${change.newValue?.Type}'`,
        };
    }
    return {
        logicalId,
        oldValue: change.oldValue,
        newValue: change.newValue,
        propertyUpdates: change.propertyUpdates,
    };
}
async function applyAllHotswappableChanges(sdk, hotswappableChanges) {
    if (hotswappableChanges.length > 0) {
        (0, logging_1.print)(`\n${common_1.ICON} hotswapping resources:`);
    }
    const limit = pLimit(10);
    // eslint-disable-next-line @cdklabs/promiseall-no-unbounded-parallelism
    return Promise.all(hotswappableChanges.map(hotswapOperation => limit(() => {
        return applyHotswappableChange(sdk, hotswapOperation);
    })));
}
async function applyHotswappableChange(sdk, hotswapOperation) {
    // note the type of service that was successfully hotswapped in the User-Agent
    const customUserAgent = `cdk-hotswap/success-${hotswapOperation.service}`;
    sdk.appendCustomUserAgent(customUserAgent);
    for (const name of hotswapOperation.resourceNames) {
        (0, logging_1.print)(`   ${common_1.ICON} %s`, chalk.bold(name));
    }
    // if the SDK call fails, an error will be thrown by the SDK
    // and will prevent the green 'hotswapped!' text from being displayed
    try {
        await hotswapOperation.apply(sdk);
    }
    catch (e) {
        if (e.name === 'TimeoutError' || e.name === 'AbortError') {
            const result = JSON.parse(e.message);
            const error = new Error([
                `Resource is not in the expected state due to waiter status: ${result.state}`,
                result.reason ? `${result.reason}.` : '',
            ].join('. '));
            error.name = e.name;
            throw error;
        }
        throw e;
    }
    for (const name of hotswapOperation.resourceNames) {
        (0, logging_1.print)(`${common_1.ICON} %s %s`, chalk.bold(name), chalk.green('hotswapped!'));
    }
    sdk.removeCustomUserAgent(customUserAgent);
}
function logNonHotswappableChanges(nonHotswappableChanges, hotswapMode) {
    if (nonHotswappableChanges.length === 0) {
        return;
    }
    /**
     * EKS Services can have a task definition that doesn't refer to the task definition being updated.
     * We have to log this as a non-hotswappable change to the task definition, but when we do,
     * we wind up hotswapping the task definition and logging it as a non-hotswappable change.
     *
     * This logic prevents us from logging that change as non-hotswappable when we hotswap it.
     */
    if (hotswapMode === common_1.HotswapMode.HOTSWAP_ONLY) {
        nonHotswappableChanges = nonHotswappableChanges.filter((change) => change.hotswapOnlyVisible === true);
        if (nonHotswappableChanges.length === 0) {
            return;
        }
    }
    if (hotswapMode === common_1.HotswapMode.HOTSWAP_ONLY) {
        (0, logging_1.print)('\n%s %s', chalk.red('⚠️'), chalk.red('The following non-hotswappable changes were found. To reconcile these using CloudFormation, specify --hotswap-fallback'));
    }
    else {
        (0, logging_1.print)('\n%s %s', chalk.red('⚠️'), chalk.red('The following non-hotswappable changes were found:'));
    }
    for (const change of nonHotswappableChanges) {
        change.rejectedChanges.length > 0
            ? (0, logging_1.print)('    logicalID: %s, type: %s, rejected changes: %s, reason: %s', chalk.bold(change.logicalId), chalk.bold(change.resourceType), chalk.bold(change.rejectedChanges), chalk.red(change.reason))
            : (0, logging_1.print)('    logicalID: %s, type: %s, reason: %s', chalk.bold(change.logicalId), chalk.bold(change.resourceType), chalk.red(change.reason));
    }
    (0, logging_1.print)(''); // newline
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG90c3dhcC1kZXBsb3ltZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvdHN3YXAtZGVwbG95bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFpRkEsb0RBb0RDO0FBcklELHlEQUF5RDtBQUd6RCwrQkFBK0I7QUFHL0IseUZBQW9GO0FBQ3BGLHdDQUFtQztBQUNuQyxtRkFBa0Y7QUFDbEYsdUVBQXFGO0FBQ3JGLDZDQVUwQjtBQUMxQix5REFBd0U7QUFDeEUsaUVBQWdGO0FBQ2hGLDJFQUd5QztBQUN6Qyx5RkFBMEY7QUFDMUYsaUVBQW1HO0FBQ25HLHdDQUFxQztBQUdyQyw2RUFBNkU7QUFDN0UsaUVBQWlFO0FBQ2pFLE1BQU0sTUFBTSxHQUE2QixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFTNUQsTUFBTSxrQkFBa0IsR0FBdUM7SUFDN0QsU0FBUztJQUNULHVCQUF1QixFQUFFLHFEQUFrQztJQUMzRCxzQkFBc0IsRUFBRSxxREFBa0M7SUFDMUQsb0JBQW9CLEVBQUUscURBQWtDO0lBRXhELFVBQVU7SUFDVix3QkFBd0IsRUFBRSx1REFBMkI7SUFDckQscUNBQXFDLEVBQUUsdURBQTJCO0lBQ2xFLDZCQUE2QixFQUFFLHVEQUEyQjtJQUMxRCxzQkFBc0IsRUFBRSx1REFBMkI7SUFFbkQsMEJBQTBCLEVBQUUsNkNBQThCO0lBQzFELHlCQUF5QixFQUFFLDBEQUFvQztJQUMvRCxrQ0FBa0MsRUFBRSwrREFBZ0M7SUFDcEUsNkJBQTZCLEVBQUUsOERBQXNDO0lBQ3JFLGtCQUFrQixFQUFFLEtBQUssRUFDdkIsU0FBaUIsRUFDakIsTUFBbUMsRUFDbkMsbUJBQW1ELEVBQ3JCLEVBQUU7UUFDaEMsNEVBQTRFO1FBQzVFLElBQUksTUFBTSxJQUFBLGlFQUF5QyxFQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxDQUFDO1lBQzVGLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELE9BQU8sSUFBQSxzQ0FBNkIsRUFBQyxNQUFNLEVBQUUsNkRBQTZELENBQUMsQ0FBQztJQUM5RyxDQUFDO0lBRUQsb0JBQW9CLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxFQUFFO0NBQ3JDLENBQUM7QUFFRjs7Ozs7R0FLRztBQUNJLEtBQUssVUFBVSxvQkFBb0IsQ0FDeEMsV0FBd0IsRUFDeEIsV0FBc0MsRUFDdEMsbUJBQXdDLEVBQ3hDLGFBQWdELEVBQ2hELFdBQXdCLEVBQUUsd0JBQWtEO0lBRTVFLDJGQUEyRjtJQUMzRixNQUFNLFdBQVcsR0FBRyxNQUFNLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDcEYsOEdBQThHO0lBQzlHLGtHQUFrRztJQUNsRyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sV0FBVyxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsV0FBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBRWpGLE1BQU0sZUFBZSxHQUFHLE1BQU0sSUFBQSwwREFBbUMsRUFBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFdEYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGlFQUE4QixDQUFDO1FBQzdELFNBQVMsRUFBRSxhQUFhLENBQUMsU0FBUztRQUNsQyxRQUFRLEVBQUUsYUFBYSxDQUFDLFFBQVE7UUFDaEMsVUFBVSxFQUFFLFdBQVc7UUFDdkIsT0FBTyxFQUFFLFdBQVcsQ0FBQyxPQUFPO1FBQzVCLE1BQU0sRUFBRSxXQUFXLENBQUMsTUFBTTtRQUMxQixTQUFTLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLFNBQVM7UUFDakQsR0FBRztRQUNILFlBQVksRUFBRSxlQUFlLENBQUMsWUFBWTtLQUMzQyxDQUFDLENBQUM7SUFFSCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDckcsTUFBTSxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLEdBQUcsTUFBTSx1QkFBdUIsQ0FDbkYsWUFBWSxFQUNaLG1CQUFtQixFQUNuQixHQUFHLEVBQ0gsZUFBZSxDQUFDLFlBQVksRUFBRSx3QkFBd0IsQ0FDdkQsQ0FBQztJQUVGLHlCQUF5QixDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRS9ELG9DQUFvQztJQUNwQyxJQUFJLFdBQVcsS0FBSyxvQkFBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzFDLElBQUksc0JBQXNCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7SUFDSCxDQUFDO0lBRUQsc0NBQXNDO0lBQ3RDLE1BQU0sMkJBQTJCLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFFNUQsT0FBTztRQUNMLElBQUksRUFBRSxrQkFBa0I7UUFDeEIsSUFBSSxFQUFFLG1CQUFtQixDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQ3RDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxPQUFPO1FBQ3JDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxPQUFPO0tBQ3JDLENBQUM7QUFDSixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsS0FBSyxVQUFVLHVCQUF1QixDQUNwQyxZQUFtQyxFQUNuQyxtQkFBbUQsRUFDbkQsR0FBUSxFQUNSLGdCQUFxRSxFQUNyRSx3QkFBa0Q7SUFFbEQsTUFBTSxtQkFBbUIsR0FBRywyQkFBMkIsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUV0RSxNQUFNLFFBQVEsR0FBOEMsRUFBRSxDQUFDO0lBQy9ELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxLQUFLLEVBQXNCLENBQUM7SUFDOUQsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEtBQUssRUFBeUIsQ0FBQztJQUNwRSxLQUFLLE1BQU0sU0FBUyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2xFLHdCQUF3QixDQUFDLElBQUksQ0FBQztZQUM1QixZQUFZLEVBQUUsS0FBSztZQUNuQixNQUFNLEVBQUUsb0JBQW9CO1lBQzVCLFNBQVM7WUFDVCxlQUFlLEVBQUUsRUFBRTtZQUNuQixZQUFZLEVBQUUsY0FBYztTQUM3QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0QsK0NBQStDO0lBQy9DLEtBQUssTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztRQUN0RSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxLQUFLLDRCQUE0QixJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxLQUFLLDRCQUE0QixFQUFFLENBQUM7WUFDckgsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLDZCQUE2QixDQUNyRSxTQUFTLEVBQ1QsTUFBTSxFQUNOLGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsR0FBRyxFQUNILHdCQUF3QixDQUN6QixDQUFDO1lBQ0YscUJBQXFCLENBQUMsSUFBSSxDQUFDLEdBQUcsMkJBQTJCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUMvRSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsR0FBRywyQkFBMkIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBRXJGLFNBQVM7UUFDWCxDQUFDO1FBRUQsTUFBTSwyQkFBMkIsR0FBRyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakYsc0ZBQXNGO1FBQ3RGLElBQUksY0FBYyxJQUFJLDJCQUEyQixFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUM5Qyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUM3RCxDQUFDO1lBRUQsU0FBUztRQUNYLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBVywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ3ZFLElBQUksWUFBWSxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsd0VBQXdFO1lBQ3hFLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQ2pCLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsRUFBRSwyQkFBMkIsRUFBRSxtQkFBbUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUN4SCxDQUFDO1FBQ0osQ0FBQzthQUFNLENBQUM7WUFDTixJQUFBLG9DQUEyQixFQUN6Qix3QkFBd0IsRUFDeEIsMkJBQTJCLEVBQzNCLFNBQVMsRUFDVCw2REFBNkQsQ0FDOUQsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQsK0JBQStCO0lBQy9CLE1BQU0sdUJBQXVCLEdBQStCLEVBQUUsQ0FBQztJQUMvRCxLQUFLLE1BQU0sc0JBQXNCLElBQUksUUFBUSxFQUFFLENBQUM7UUFDOUMsd0NBQXdDO1FBQ3hDLHdFQUF3RTtRQUN4RSxNQUFNLHVCQUF1QixHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUNsRix1QkFBdUIsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsS0FBSyxNQUFNLHdCQUF3QixJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDL0QsS0FBSyxNQUFNLGNBQWMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1lBQ3RELGNBQWMsQ0FBQyxZQUFZO2dCQUN6QixDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztnQkFDNUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwRCxDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU87UUFDTCxtQkFBbUIsRUFBRSxxQkFBcUI7UUFDMUMsc0JBQXNCLEVBQUUsd0JBQXdCO0tBQ2pELENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsMkJBQTJCLENBQUMsWUFBbUM7SUFHdEUsaUVBQWlFO0lBQ2pFLGlHQUFpRztJQUNqRyxNQUFNLGtCQUFrQixHQUFxRCxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztJQUM1RyxNQUFNLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzdGLE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqRyxLQUFLLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztRQUM3RSxJQUFJLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDO1lBQ25DLHlDQUF5QztZQUN6QyxNQUFNLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFO2dCQUN2RixPQUFPLHlCQUF5QixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN6RCxDQUFDLENBQUMsQ0FBQztZQUNILDJEQUEyRDtZQUMzRCxJQUFJLHNCQUFzQixFQUFFLENBQUM7Z0JBQzNCLE1BQU0sQ0FBQyxZQUFZLEVBQUUscUJBQXFCLENBQUMsR0FBRyxzQkFBc0IsQ0FBQztnQkFDckUsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEdBQUcsb0JBQW9CLENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3JGLHVEQUF1RDtnQkFDdkQsT0FBTyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN6QyxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFDRCw2REFBNkQ7SUFDN0Qsc0NBQXNDO0lBQ3RDLHVEQUF1RDtJQUN2RCxPQUFPO1FBQ0wsR0FBRyxpQkFBaUI7UUFDcEIsR0FBRyxvQkFBb0I7S0FDeEIsQ0FBQztBQUNKLENBQUM7QUFFRCx5SEFBeUg7QUFDekgsU0FBUyxVQUFVLENBQUksSUFBMEIsRUFBRSxJQUF1QjtJQUN4RSxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUNoQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ2hCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDWixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxFQUNELEVBQTBCLENBQzNCLENBQUM7QUFDSixDQUFDO0FBRUQsMkRBQTJEO0FBQzNELEtBQUssVUFBVSw2QkFBNkIsQ0FDMUMsU0FBaUIsRUFDakIsTUFBbUMsRUFDbkMsb0JBQXlFLEVBQ3pFLG1CQUFtRCxFQUNuRCxHQUFRLEVBQ1Isd0JBQWtEO0lBRWxELE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BELElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDOUIsT0FBTztZQUNMLG1CQUFtQixFQUFFLEVBQUU7WUFDdkIsc0JBQXNCLEVBQUU7Z0JBQ3RCO29CQUNFLFlBQVksRUFBRSxLQUFLO29CQUNuQixTQUFTO29CQUNULE1BQU0sRUFBRSxpREFBaUQsU0FBUywwR0FBMEc7b0JBQzVLLGVBQWUsRUFBRSxFQUFFO29CQUNuQixZQUFZLEVBQUUsNEJBQTRCO2lCQUMzQzthQUNGO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLHlCQUF5QixHQUFHLE1BQU0sbUJBQW1CLENBQUMsMENBQTBDLENBQ3BHLFdBQVcsQ0FBQyxZQUFZLEVBQ3hCLFdBQVcsQ0FBQyxpQkFBaUIsRUFDN0IsTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUN4QyxDQUFDO0lBRUYsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FDbEMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUMsZ0JBQWdCLEVBQ2hELG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDLGlCQUFpQixDQUNsRCxDQUFDO0lBRUYsT0FBTyx1QkFBdUIsQ0FDNUIsVUFBVSxFQUNWLHlCQUF5QixFQUN6QixHQUFHLEVBQ0gsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUMsb0JBQW9CLEVBQ3BELHdCQUF3QixDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELG9FQUFvRTtBQUNwRSxTQUFTLHlCQUF5QixDQUNoQyxTQUFzQyxFQUN0QyxTQUFzQztJQUV0QyxPQUFPLENBQ0wsU0FBUyxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUMsZUFBZTtRQUN2RCxvR0FBb0c7UUFDcEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQ3BGLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FDM0IsU0FBc0MsRUFDdEMsU0FBc0M7SUFFdEMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxrQkFBa0I7SUFDcEMsMkdBQTJHO0lBQzNHLFNBQVMsQ0FBQyxRQUFRLEVBQ2xCLFNBQVMsQ0FBQyxRQUFRLEVBQ2xCO1FBQ0UsWUFBWSxFQUFFO1lBQ1osT0FBTyxFQUFFLFNBQVMsQ0FBQyxlQUFlO1lBQ2xDLE9BQU8sRUFBRSxTQUFTLENBQUMsZUFBZTtTQUNuQztRQUNELGFBQWEsRUFBRyxTQUFpQixDQUFDLGFBQWE7UUFDL0MsVUFBVSxFQUFHLFNBQWlCLENBQUMsVUFBVTtLQUMxQyxDQUNGLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMseUJBQXlCLENBQ2hDLE1BQW1DLEVBQ25DLFNBQWlCO0lBRWpCLCtGQUErRjtJQUMvRixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3JCLE9BQU87WUFDTCxZQUFZLEVBQUUsS0FBSztZQUNuQixZQUFZLEVBQUUsTUFBTSxDQUFDLFFBQVMsQ0FBQyxJQUFJO1lBQ25DLFNBQVM7WUFDVCxlQUFlLEVBQUUsRUFBRTtZQUNuQixNQUFNLEVBQUUsYUFBYSxTQUFTLGtDQUFrQztTQUNqRSxDQUFDO0lBQ0osQ0FBQztTQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUIsT0FBTztZQUNMLFlBQVksRUFBRSxLQUFLO1lBQ25CLFlBQVksRUFBRSxNQUFNLENBQUMsUUFBUyxDQUFDLElBQUk7WUFDbkMsU0FBUztZQUNULGVBQWUsRUFBRSxFQUFFO1lBQ25CLE1BQU0sRUFBRSxhQUFhLFNBQVMsb0NBQW9DO1NBQ25FLENBQUM7SUFDSixDQUFDO0lBRUQsc0NBQXNDO0lBQ3RDLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUNwRCxPQUFPO1lBQ0wsWUFBWSxFQUFFLEtBQUs7WUFDbkIsWUFBWSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSTtZQUNuQyxTQUFTO1lBQ1QsZUFBZSxFQUFFLEVBQUU7WUFDbkIsTUFBTSxFQUFFLGFBQWEsU0FBUyxnQ0FBZ0MsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLFNBQVMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLEdBQUc7U0FDckgsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPO1FBQ0wsU0FBUztRQUNULFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtRQUN6QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7UUFDekIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlO0tBQ3hDLENBQUM7QUFDSixDQUFDO0FBRUQsS0FBSyxVQUFVLDJCQUEyQixDQUFDLEdBQVEsRUFBRSxtQkFBeUM7SUFDNUYsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbkMsSUFBQSxlQUFLLEVBQUMsS0FBSyxhQUFJLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6Qix3RUFBd0U7SUFDeEUsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUN4RSxPQUFPLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFFRCxLQUFLLFVBQVUsdUJBQXVCLENBQUMsR0FBUSxFQUFFLGdCQUFvQztJQUNuRiw4RUFBOEU7SUFDOUUsTUFBTSxlQUFlLEdBQUcsdUJBQXVCLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUUzQyxLQUFLLE1BQU0sSUFBSSxJQUFJLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2xELElBQUEsZUFBSyxFQUFDLE1BQU0sYUFBSSxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCw0REFBNEQ7SUFDNUQscUVBQXFFO0lBQ3JFLElBQUksQ0FBQztRQUNILE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxjQUFjLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN6RCxNQUFNLE1BQU0sR0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUM7Z0JBQ3RCLCtEQUErRCxNQUFNLENBQUMsS0FBSyxFQUFFO2dCQUM3RSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTthQUN6QyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2QsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3BCLE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELEtBQUssTUFBTSxJQUFJLElBQUksZ0JBQWdCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbEQsSUFBQSxlQUFLLEVBQUMsR0FBRyxhQUFJLFFBQVEsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBRUQsR0FBRyxDQUFDLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLHNCQUErQyxFQUFFLFdBQXdCO0lBQzFHLElBQUksc0JBQXNCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hDLE9BQU87SUFDVCxDQUFDO0lBQ0Q7Ozs7OztPQU1HO0lBQ0gsSUFBSSxXQUFXLEtBQUssb0JBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM3QyxzQkFBc0IsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsS0FBSyxJQUFJLENBQUMsQ0FBQztRQUV2RyxJQUFJLHNCQUFzQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFPO1FBQ1QsQ0FBQztJQUNILENBQUM7SUFDRCxJQUFJLFdBQVcsS0FBSyxvQkFBVyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzdDLElBQUEsZUFBSyxFQUNILFNBQVMsRUFDVCxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUNmLEtBQUssQ0FBQyxHQUFHLENBQ1Asd0hBQXdILENBQ3pILENBQ0YsQ0FBQztJQUNKLENBQUM7U0FBTSxDQUFDO1FBQ04sSUFBQSxlQUFLLEVBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxvREFBb0QsQ0FBQyxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUVELEtBQUssTUFBTSxNQUFNLElBQUksc0JBQXNCLEVBQUUsQ0FBQztRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxJQUFBLGVBQUssRUFDTCwrREFBK0QsRUFDL0QsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQzVCLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFDbEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQ3pCO1lBQ0QsQ0FBQyxDQUFDLElBQUEsZUFBSyxFQUNMLHlDQUF5QyxFQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFDNUIsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQy9CLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUN6QixDQUFDO0lBQ04sQ0FBQztJQUVELElBQUEsZUFBSyxFQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUN2QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2ZuX2RpZmYgZnJvbSAnQGF3cy1jZGsvY2xvdWRmb3JtYXRpb24tZGlmZic7XG5pbXBvcnQgKiBhcyBjeGFwaSBmcm9tICdAYXdzLWNkay9jeC1hcGknO1xuaW1wb3J0IHsgV2FpdGVyUmVzdWx0IH0gZnJvbSAnQHNtaXRoeS91dGlsLXdhaXRlcic7XG5pbXBvcnQgKiBhcyBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgdHlwZSB7IFNESywgU2RrUHJvdmlkZXIgfSBmcm9tICcuL2F3cy1hdXRoJztcbmltcG9ydCB0eXBlIHsgU3VjY2Vzc2Z1bERlcGxveVN0YWNrUmVzdWx0IH0gZnJvbSAnLi9kZXBsb3ktc3RhY2snO1xuaW1wb3J0IHsgRXZhbHVhdGVDbG91ZEZvcm1hdGlvblRlbXBsYXRlIH0gZnJvbSAnLi9ldmFsdWF0ZS1jbG91ZGZvcm1hdGlvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBwcmludCB9IGZyb20gJy4uL2xvZ2dpbmcnO1xuaW1wb3J0IHsgaXNIb3Rzd2FwcGFibGVBcHBTeW5jQ2hhbmdlIH0gZnJvbSAnLi9ob3Rzd2FwL2FwcHN5bmMtbWFwcGluZy10ZW1wbGF0ZXMnO1xuaW1wb3J0IHsgaXNIb3Rzd2FwcGFibGVDb2RlQnVpbGRQcm9qZWN0Q2hhbmdlIH0gZnJvbSAnLi9ob3Rzd2FwL2NvZGUtYnVpbGQtcHJvamVjdHMnO1xuaW1wb3J0IHtcbiAgSUNPTixcbiAgQ2hhbmdlSG90c3dhcFJlc3VsdCxcbiAgSG90c3dhcE1vZGUsXG4gIEhvdHN3YXBwYWJsZUNoYW5nZSxcbiAgTm9uSG90c3dhcHBhYmxlQ2hhbmdlLFxuICBIb3Rzd2FwcGFibGVDaGFuZ2VDYW5kaWRhdGUsXG4gIEhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlcywgQ2xhc3NpZmllZFJlc291cmNlQ2hhbmdlcyxcbiAgcmVwb3J0Tm9uSG90c3dhcHBhYmxlQ2hhbmdlLFxuICByZXBvcnROb25Ib3Rzd2FwcGFibGVSZXNvdXJjZSxcbn0gZnJvbSAnLi9ob3Rzd2FwL2NvbW1vbic7XG5pbXBvcnQgeyBpc0hvdHN3YXBwYWJsZUVjc1NlcnZpY2VDaGFuZ2UgfSBmcm9tICcuL2hvdHN3YXAvZWNzLXNlcnZpY2VzJztcbmltcG9ydCB7IGlzSG90c3dhcHBhYmxlTGFtYmRhRnVuY3Rpb25DaGFuZ2UgfSBmcm9tICcuL2hvdHN3YXAvbGFtYmRhLWZ1bmN0aW9ucyc7XG5pbXBvcnQge1xuICBza2lwQ2hhbmdlRm9yUzNEZXBsb3lDdXN0b21SZXNvdXJjZVBvbGljeSxcbiAgaXNIb3Rzd2FwcGFibGVTM0J1Y2tldERlcGxveW1lbnRDaGFuZ2UsXG59IGZyb20gJy4vaG90c3dhcC9zMy1idWNrZXQtZGVwbG95bWVudHMnO1xuaW1wb3J0IHsgaXNIb3Rzd2FwcGFibGVTdGF0ZU1hY2hpbmVDaGFuZ2UgfSBmcm9tICcuL2hvdHN3YXAvc3RlcGZ1bmN0aW9ucy1zdGF0ZS1tYWNoaW5lcyc7XG5pbXBvcnQgeyBOZXN0ZWRTdGFja1RlbXBsYXRlcywgbG9hZEN1cnJlbnRUZW1wbGF0ZVdpdGhOZXN0ZWRTdGFja3MgfSBmcm9tICcuL25lc3RlZC1zdGFjay1oZWxwZXJzJztcbmltcG9ydCB7IE1vZGUgfSBmcm9tICcuL3BsdWdpbi9tb2RlJztcbmltcG9ydCB7IENsb3VkRm9ybWF0aW9uU3RhY2sgfSBmcm9tICcuL3V0aWwvY2xvdWRmb3JtYXRpb24nO1xuXG4vLyBNdXN0IHVzZSBhIHJlcXVpcmUoKSBvdGhlcndpc2UgZXNidWlsZCBjb21wbGFpbnMgYWJvdXQgY2FsbGluZyBhIG5hbWVzcGFjZVxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHNcbmNvbnN0IHBMaW1pdDogdHlwZW9mIGltcG9ydCgncC1saW1pdCcpID0gcmVxdWlyZSgncC1saW1pdCcpO1xuXG50eXBlIEhvdHN3YXBEZXRlY3RvciA9IChcbiAgbG9naWNhbElkOiBzdHJpbmcsXG4gIGNoYW5nZTogSG90c3dhcHBhYmxlQ2hhbmdlQ2FuZGlkYXRlLFxuICBldmFsdWF0ZUNmblRlbXBsYXRlOiBFdmFsdWF0ZUNsb3VkRm9ybWF0aW9uVGVtcGxhdGUsXG4gIGhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlczogSG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzLFxuKSA9PiBQcm9taXNlPENoYW5nZUhvdHN3YXBSZXN1bHQ+O1xuXG5jb25zdCBSRVNPVVJDRV9ERVRFQ1RPUlM6IHsgW2tleTogc3RyaW5nXTogSG90c3dhcERldGVjdG9yIH0gPSB7XG4gIC8vIExhbWJkYVxuICAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJzogaXNIb3Rzd2FwcGFibGVMYW1iZGFGdW5jdGlvbkNoYW5nZSxcbiAgJ0FXUzo6TGFtYmRhOjpWZXJzaW9uJzogaXNIb3Rzd2FwcGFibGVMYW1iZGFGdW5jdGlvbkNoYW5nZSxcbiAgJ0FXUzo6TGFtYmRhOjpBbGlhcyc6IGlzSG90c3dhcHBhYmxlTGFtYmRhRnVuY3Rpb25DaGFuZ2UsXG5cbiAgLy8gQXBwU3luY1xuICAnQVdTOjpBcHBTeW5jOjpSZXNvbHZlcic6IGlzSG90c3dhcHBhYmxlQXBwU3luY0NoYW5nZSxcbiAgJ0FXUzo6QXBwU3luYzo6RnVuY3Rpb25Db25maWd1cmF0aW9uJzogaXNIb3Rzd2FwcGFibGVBcHBTeW5jQ2hhbmdlLFxuICAnQVdTOjpBcHBTeW5jOjpHcmFwaFFMU2NoZW1hJzogaXNIb3Rzd2FwcGFibGVBcHBTeW5jQ2hhbmdlLFxuICAnQVdTOjpBcHBTeW5jOjpBcGlLZXknOiBpc0hvdHN3YXBwYWJsZUFwcFN5bmNDaGFuZ2UsXG5cbiAgJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbic6IGlzSG90c3dhcHBhYmxlRWNzU2VydmljZUNoYW5nZSxcbiAgJ0FXUzo6Q29kZUJ1aWxkOjpQcm9qZWN0JzogaXNIb3Rzd2FwcGFibGVDb2RlQnVpbGRQcm9qZWN0Q2hhbmdlLFxuICAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnOiBpc0hvdHN3YXBwYWJsZVN0YXRlTWFjaGluZUNoYW5nZSxcbiAgJ0N1c3RvbTo6Q0RLQnVja2V0RGVwbG95bWVudCc6IGlzSG90c3dhcHBhYmxlUzNCdWNrZXREZXBsb3ltZW50Q2hhbmdlLFxuICAnQVdTOjpJQU06OlBvbGljeSc6IGFzeW5jIChcbiAgICBsb2dpY2FsSWQ6IHN0cmluZyxcbiAgICBjaGFuZ2U6IEhvdHN3YXBwYWJsZUNoYW5nZUNhbmRpZGF0ZSxcbiAgICBldmFsdWF0ZUNmblRlbXBsYXRlOiBFdmFsdWF0ZUNsb3VkRm9ybWF0aW9uVGVtcGxhdGUsXG4gICk6IFByb21pc2U8Q2hhbmdlSG90c3dhcFJlc3VsdD4gPT4ge1xuICAgIC8vIElmIHRoZSBwb2xpY3kgaXMgZm9yIGEgUzNCdWNrZXREZXBsb3ltZW50Q2hhbmdlLCB3ZSBjYW4gaWdub3JlIHRoZSBjaGFuZ2VcbiAgICBpZiAoYXdhaXQgc2tpcENoYW5nZUZvclMzRGVwbG95Q3VzdG9tUmVzb3VyY2VQb2xpY3kobG9naWNhbElkLCBjaGFuZ2UsIGV2YWx1YXRlQ2ZuVGVtcGxhdGUpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcG9ydE5vbkhvdHN3YXBwYWJsZVJlc291cmNlKGNoYW5nZSwgJ1RoaXMgcmVzb3VyY2UgdHlwZSBpcyBub3Qgc3VwcG9ydGVkIGZvciBob3Rzd2FwIGRlcGxveW1lbnRzJyk7XG4gIH0sXG5cbiAgJ0FXUzo6Q0RLOjpNZXRhZGF0YSc6IGFzeW5jICgpID0+IFtdLFxufTtcblxuLyoqXG4gKiBQZXJmb3JtIGEgaG90c3dhcCBkZXBsb3ltZW50LCBzaG9ydC1jaXJjdWl0aW5nIENsb3VkRm9ybWF0aW9uIGlmIHBvc3NpYmxlLlxuICogSWYgaXQncyBub3QgcG9zc2libGUgdG8gc2hvcnQtY2lyY3VpdCB0aGUgZGVwbG95bWVudFxuICogKGJlY2F1c2UgdGhlIENESyBTdGFjayBjb250YWlucyBjaGFuZ2VzIHRoYXQgY2Fubm90IGJlIGRlcGxveWVkIHdpdGhvdXQgQ2xvdWRGb3JtYXRpb24pLFxuICogcmV0dXJucyBgdW5kZWZpbmVkYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyeUhvdHN3YXBEZXBsb3ltZW50KFxuICBzZGtQcm92aWRlcjogU2RrUHJvdmlkZXIsXG4gIGFzc2V0UGFyYW1zOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9LFxuICBjbG91ZEZvcm1hdGlvblN0YWNrOiBDbG91ZEZvcm1hdGlvblN0YWNrLFxuICBzdGFja0FydGlmYWN0OiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3QsXG4gIGhvdHN3YXBNb2RlOiBIb3Rzd2FwTW9kZSwgaG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzOiBIb3Rzd2FwUHJvcGVydHlPdmVycmlkZXMsXG4pOiBQcm9taXNlPFN1Y2Nlc3NmdWxEZXBsb3lTdGFja1Jlc3VsdCB8IHVuZGVmaW5lZD4ge1xuICAvLyByZXNvbHZlIHRoZSBlbnZpcm9ubWVudCwgc28gd2UgY2FuIHN1YnN0aXR1dGUgdGhpbmdzIGxpa2UgQVdTOjpSZWdpb24gaW4gQ0ZOIGV4cHJlc3Npb25zXG4gIGNvbnN0IHJlc29sdmVkRW52ID0gYXdhaXQgc2RrUHJvdmlkZXIucmVzb2x2ZUVudmlyb25tZW50KHN0YWNrQXJ0aWZhY3QuZW52aXJvbm1lbnQpO1xuICAvLyBjcmVhdGUgYSBuZXcgU0RLIHVzaW5nIHRoZSBDTEkgY3JlZGVudGlhbHMsIGJlY2F1c2UgdGhlIGRlZmF1bHQgb25lIHdpbGwgbm90IHdvcmsgZm9yIG5ldy1zdHlsZSBzeW50aGVzaXMgLVxuICAvLyBpdCBhc3N1bWVzIHRoZSBib290c3RyYXAgZGVwbG95IFJvbGUsIHdoaWNoIGRvZXNuJ3QgaGF2ZSBwZXJtaXNzaW9ucyB0byB1cGRhdGUgTGFtYmRhIGZ1bmN0aW9uc1xuICBjb25zdCBzZGsgPSAoYXdhaXQgc2RrUHJvdmlkZXIuZm9yRW52aXJvbm1lbnQocmVzb2x2ZWRFbnYsIE1vZGUuRm9yV3JpdGluZykpLnNkaztcblxuICBjb25zdCBjdXJyZW50VGVtcGxhdGUgPSBhd2FpdCBsb2FkQ3VycmVudFRlbXBsYXRlV2l0aE5lc3RlZFN0YWNrcyhzdGFja0FydGlmYWN0LCBzZGspO1xuXG4gIGNvbnN0IGV2YWx1YXRlQ2ZuVGVtcGxhdGUgPSBuZXcgRXZhbHVhdGVDbG91ZEZvcm1hdGlvblRlbXBsYXRlKHtcbiAgICBzdGFja05hbWU6IHN0YWNrQXJ0aWZhY3Quc3RhY2tOYW1lLFxuICAgIHRlbXBsYXRlOiBzdGFja0FydGlmYWN0LnRlbXBsYXRlLFxuICAgIHBhcmFtZXRlcnM6IGFzc2V0UGFyYW1zLFxuICAgIGFjY291bnQ6IHJlc29sdmVkRW52LmFjY291bnQsXG4gICAgcmVnaW9uOiByZXNvbHZlZEVudi5yZWdpb24sXG4gICAgcGFydGl0aW9uOiAoYXdhaXQgc2RrLmN1cnJlbnRBY2NvdW50KCkpLnBhcnRpdGlvbixcbiAgICBzZGssXG4gICAgbmVzdGVkU3RhY2tzOiBjdXJyZW50VGVtcGxhdGUubmVzdGVkU3RhY2tzLFxuICB9KTtcblxuICBjb25zdCBzdGFja0NoYW5nZXMgPSBjZm5fZGlmZi5mdWxsRGlmZihjdXJyZW50VGVtcGxhdGUuZGVwbG95ZWRSb290VGVtcGxhdGUsIHN0YWNrQXJ0aWZhY3QudGVtcGxhdGUpO1xuICBjb25zdCB7IGhvdHN3YXBwYWJsZUNoYW5nZXMsIG5vbkhvdHN3YXBwYWJsZUNoYW5nZXMgfSA9IGF3YWl0IGNsYXNzaWZ5UmVzb3VyY2VDaGFuZ2VzKFxuICAgIHN0YWNrQ2hhbmdlcyxcbiAgICBldmFsdWF0ZUNmblRlbXBsYXRlLFxuICAgIHNkayxcbiAgICBjdXJyZW50VGVtcGxhdGUubmVzdGVkU3RhY2tzLCBob3Rzd2FwUHJvcGVydHlPdmVycmlkZXMsXG4gICk7XG5cbiAgbG9nTm9uSG90c3dhcHBhYmxlQ2hhbmdlcyhub25Ib3Rzd2FwcGFibGVDaGFuZ2VzLCBob3Rzd2FwTW9kZSk7XG5cbiAgLy8gcHJlc2VydmUgY2xhc3NpYyBob3Rzd2FwIGJlaGF2aW9yXG4gIGlmIChob3Rzd2FwTW9kZSA9PT0gSG90c3dhcE1vZGUuRkFMTF9CQUNLKSB7XG4gICAgaWYgKG5vbkhvdHN3YXBwYWJsZUNoYW5nZXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBhcHBseSB0aGUgc2hvcnQtY2lyY3VpdGFibGUgY2hhbmdlc1xuICBhd2FpdCBhcHBseUFsbEhvdHN3YXBwYWJsZUNoYW5nZXMoc2RrLCBob3Rzd2FwcGFibGVDaGFuZ2VzKTtcblxuICByZXR1cm4ge1xuICAgIHR5cGU6ICdkaWQtZGVwbG95LXN0YWNrJyxcbiAgICBub09wOiBob3Rzd2FwcGFibGVDaGFuZ2VzLmxlbmd0aCA9PT0gMCxcbiAgICBzdGFja0FybjogY2xvdWRGb3JtYXRpb25TdGFjay5zdGFja0lkLFxuICAgIG91dHB1dHM6IGNsb3VkRm9ybWF0aW9uU3RhY2sub3V0cHV0cyxcbiAgfTtcbn1cblxuLyoqXG4gKiBDbGFzc2lmaWVzIGFsbCBjaGFuZ2VzIHRvIGFsbCByZXNvdXJjZXMgYXMgZWl0aGVyIGhvdHN3YXBwYWJsZSBvciBub3QuXG4gKiBNZXRhZGF0YSBjaGFuZ2VzIGFyZSBleGNsdWRlZCBmcm9tIHRoZSBsaXN0IG9mIChub24paG90c3dhcHBhYmxlIHJlc291cmNlcy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY2xhc3NpZnlSZXNvdXJjZUNoYW5nZXMoXG4gIHN0YWNrQ2hhbmdlczogY2ZuX2RpZmYuVGVtcGxhdGVEaWZmLFxuICBldmFsdWF0ZUNmblRlbXBsYXRlOiBFdmFsdWF0ZUNsb3VkRm9ybWF0aW9uVGVtcGxhdGUsXG4gIHNkazogU0RLLFxuICBuZXN0ZWRTdGFja05hbWVzOiB7IFtuZXN0ZWRTdGFja05hbWU6IHN0cmluZ106IE5lc3RlZFN0YWNrVGVtcGxhdGVzIH0sXG4gIGhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlczogSG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzLFxuKTogUHJvbWlzZTxDbGFzc2lmaWVkUmVzb3VyY2VDaGFuZ2VzPiB7XG4gIGNvbnN0IHJlc291cmNlRGlmZmVyZW5jZXMgPSBnZXRTdGFja1Jlc291cmNlRGlmZmVyZW5jZXMoc3RhY2tDaGFuZ2VzKTtcblxuICBjb25zdCBwcm9taXNlczogQXJyYXk8KCkgPT4gUHJvbWlzZTxDaGFuZ2VIb3Rzd2FwUmVzdWx0Pj4gPSBbXTtcbiAgY29uc3QgaG90c3dhcHBhYmxlUmVzb3VyY2VzID0gbmV3IEFycmF5PEhvdHN3YXBwYWJsZUNoYW5nZT4oKTtcbiAgY29uc3Qgbm9uSG90c3dhcHBhYmxlUmVzb3VyY2VzID0gbmV3IEFycmF5PE5vbkhvdHN3YXBwYWJsZUNoYW5nZT4oKTtcbiAgZm9yIChjb25zdCBsb2dpY2FsSWQgb2YgT2JqZWN0LmtleXMoc3RhY2tDaGFuZ2VzLm91dHB1dHMuY2hhbmdlcykpIHtcbiAgICBub25Ib3Rzd2FwcGFibGVSZXNvdXJjZXMucHVzaCh7XG4gICAgICBob3Rzd2FwcGFibGU6IGZhbHNlLFxuICAgICAgcmVhc29uOiAnb3V0cHV0IHdhcyBjaGFuZ2VkJyxcbiAgICAgIGxvZ2ljYWxJZCxcbiAgICAgIHJlamVjdGVkQ2hhbmdlczogW10sXG4gICAgICByZXNvdXJjZVR5cGU6ICdTdGFjayBPdXRwdXQnLFxuICAgIH0pO1xuICB9XG4gIC8vIGdhdGhlciB0aGUgcmVzdWx0cyBvZiB0aGUgZGV0ZWN0b3IgZnVuY3Rpb25zXG4gIGZvciAoY29uc3QgW2xvZ2ljYWxJZCwgY2hhbmdlXSBvZiBPYmplY3QuZW50cmllcyhyZXNvdXJjZURpZmZlcmVuY2VzKSkge1xuICAgIGlmIChjaGFuZ2UubmV3VmFsdWU/LlR5cGUgPT09ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpTdGFjaycgJiYgY2hhbmdlLm9sZFZhbHVlPy5UeXBlID09PSAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6U3RhY2snKSB7XG4gICAgICBjb25zdCBuZXN0ZWRIb3Rzd2FwcGFibGVSZXNvdXJjZXMgPSBhd2FpdCBmaW5kTmVzdGVkSG90c3dhcHBhYmxlQ2hhbmdlcyhcbiAgICAgICAgbG9naWNhbElkLFxuICAgICAgICBjaGFuZ2UsXG4gICAgICAgIG5lc3RlZFN0YWNrTmFtZXMsXG4gICAgICAgIGV2YWx1YXRlQ2ZuVGVtcGxhdGUsXG4gICAgICAgIHNkayxcbiAgICAgICAgaG90c3dhcFByb3BlcnR5T3ZlcnJpZGVzLFxuICAgICAgKTtcbiAgICAgIGhvdHN3YXBwYWJsZVJlc291cmNlcy5wdXNoKC4uLm5lc3RlZEhvdHN3YXBwYWJsZVJlc291cmNlcy5ob3Rzd2FwcGFibGVDaGFuZ2VzKTtcbiAgICAgIG5vbkhvdHN3YXBwYWJsZVJlc291cmNlcy5wdXNoKC4uLm5lc3RlZEhvdHN3YXBwYWJsZVJlc291cmNlcy5ub25Ib3Rzd2FwcGFibGVDaGFuZ2VzKTtcblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgaG90c3dhcHBhYmxlQ2hhbmdlQ2FuZGlkYXRlID0gaXNDYW5kaWRhdGVGb3JIb3Rzd2FwcGluZyhjaGFuZ2UsIGxvZ2ljYWxJZCk7XG4gICAgLy8gd2UgZG9uJ3QgbmVlZCB0byBydW4gdGhpcyB0aHJvdWdoIHRoZSBkZXRlY3RvciBmdW5jdGlvbnMsIHdlIGNhbiBhbHJlYWR5IGp1ZGdlIHRoaXNcbiAgICBpZiAoJ2hvdHN3YXBwYWJsZScgaW4gaG90c3dhcHBhYmxlQ2hhbmdlQ2FuZGlkYXRlKSB7XG4gICAgICBpZiAoIWhvdHN3YXBwYWJsZUNoYW5nZUNhbmRpZGF0ZS5ob3Rzd2FwcGFibGUpIHtcbiAgICAgICAgbm9uSG90c3dhcHBhYmxlUmVzb3VyY2VzLnB1c2goaG90c3dhcHBhYmxlQ2hhbmdlQ2FuZGlkYXRlKTtcbiAgICAgIH1cblxuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzb3VyY2VUeXBlOiBzdHJpbmcgPSBob3Rzd2FwcGFibGVDaGFuZ2VDYW5kaWRhdGUubmV3VmFsdWUuVHlwZTtcbiAgICBpZiAocmVzb3VyY2VUeXBlIGluIFJFU09VUkNFX0RFVEVDVE9SUykge1xuICAgICAgLy8gcnVuIGRldGVjdG9yIGZ1bmN0aW9ucyBsYXppbHkgdG8gcHJldmVudCB1bmhhbmRsZWQgcHJvbWlzZSByZWplY3Rpb25zXG4gICAgICBwcm9taXNlcy5wdXNoKCgpID0+XG4gICAgICAgIFJFU09VUkNFX0RFVEVDVE9SU1tyZXNvdXJjZVR5cGVdKGxvZ2ljYWxJZCwgaG90c3dhcHBhYmxlQ2hhbmdlQ2FuZGlkYXRlLCBldmFsdWF0ZUNmblRlbXBsYXRlLCBob3Rzd2FwUHJvcGVydHlPdmVycmlkZXMpLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVwb3J0Tm9uSG90c3dhcHBhYmxlQ2hhbmdlKFxuICAgICAgICBub25Ib3Rzd2FwcGFibGVSZXNvdXJjZXMsXG4gICAgICAgIGhvdHN3YXBwYWJsZUNoYW5nZUNhbmRpZGF0ZSxcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAnVGhpcyByZXNvdXJjZSB0eXBlIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIGhvdHN3YXAgZGVwbG95bWVudHMnLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyByZXNvbHZlIGFsbCBkZXRlY3RvciByZXN1bHRzXG4gIGNvbnN0IGNoYW5nZXNEZXRlY3Rpb25SZXN1bHRzOiBBcnJheTxDaGFuZ2VIb3Rzd2FwUmVzdWx0PiA9IFtdO1xuICBmb3IgKGNvbnN0IGRldGVjdG9yUmVzdWx0UHJvbWlzZXMgb2YgcHJvbWlzZXMpIHtcbiAgICAvLyBDb25zdGFudCBzZXQgb2YgcHJvbWlzZXMgcGVyIHJlc291cmNlXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBjZGtsYWJzL3Byb21pc2VhbGwtbm8tdW5ib3VuZGVkLXBhcmFsbGVsaXNtXG4gICAgY29uc3QgaG90c3dhcERldGVjdGlvblJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChhd2FpdCBkZXRlY3RvclJlc3VsdFByb21pc2VzKCkpO1xuICAgIGNoYW5nZXNEZXRlY3Rpb25SZXN1bHRzLnB1c2goaG90c3dhcERldGVjdGlvblJlc3VsdHMpO1xuICB9XG5cbiAgZm9yIChjb25zdCByZXNvdXJjZURldGVjdGlvblJlc3VsdHMgb2YgY2hhbmdlc0RldGVjdGlvblJlc3VsdHMpIHtcbiAgICBmb3IgKGNvbnN0IHByb3BlcnR5UmVzdWx0IG9mIHJlc291cmNlRGV0ZWN0aW9uUmVzdWx0cykge1xuICAgICAgcHJvcGVydHlSZXN1bHQuaG90c3dhcHBhYmxlXG4gICAgICAgID8gaG90c3dhcHBhYmxlUmVzb3VyY2VzLnB1c2gocHJvcGVydHlSZXN1bHQpXG4gICAgICAgIDogbm9uSG90c3dhcHBhYmxlUmVzb3VyY2VzLnB1c2gocHJvcGVydHlSZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaG90c3dhcHBhYmxlQ2hhbmdlczogaG90c3dhcHBhYmxlUmVzb3VyY2VzLFxuICAgIG5vbkhvdHN3YXBwYWJsZUNoYW5nZXM6IG5vbkhvdHN3YXBwYWJsZVJlc291cmNlcyxcbiAgfTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFsbCBjaGFuZ2VzIHRvIHJlc291cmNlcyBpbiB0aGUgZ2l2ZW4gU3RhY2suXG4gKlxuICogQHBhcmFtIHN0YWNrQ2hhbmdlcyB0aGUgY29sbGVjdGlvbiBvZiBhbGwgY2hhbmdlcyB0byBhIGdpdmVuIFN0YWNrXG4gKi9cbmZ1bmN0aW9uIGdldFN0YWNrUmVzb3VyY2VEaWZmZXJlbmNlcyhzdGFja0NoYW5nZXM6IGNmbl9kaWZmLlRlbXBsYXRlRGlmZik6IHtcbiAgW2xvZ2ljYWxJZDogc3RyaW5nXTogY2ZuX2RpZmYuUmVzb3VyY2VEaWZmZXJlbmNlO1xufSB7XG4gIC8vIHdlIG5lZWQgdG8gY29sbGFwc2UgbG9naWNhbCBJRCByZW5hbWUgY2hhbmdlcyBpbnRvIG9uZSBjaGFuZ2UsXG4gIC8vIGFzIHRoZXkgYXJlIHJlcHJlc2VudGVkIGluIHN0YWNrQ2hhbmdlcyBhcyBhIHBhaXIgb2YgdHdvIGNoYW5nZXM6IG9uZSBhZGRpdGlvbiBhbmQgb25lIHJlbW92YWxcbiAgY29uc3QgYWxsUmVzb3VyY2VDaGFuZ2VzOiB7IFtsb2dJZDogc3RyaW5nXTogY2ZuX2RpZmYuUmVzb3VyY2VEaWZmZXJlbmNlIH0gPSBzdGFja0NoYW5nZXMucmVzb3VyY2VzLmNoYW5nZXM7XG4gIGNvbnN0IGFsbFJlbW92YWxDaGFuZ2VzID0gZmlsdGVyRGljdChhbGxSZXNvdXJjZUNoYW5nZXMsIChyZXNDaGFuZ2UpID0+IHJlc0NoYW5nZS5pc1JlbW92YWwpO1xuICBjb25zdCBhbGxOb25SZW1vdmFsQ2hhbmdlcyA9IGZpbHRlckRpY3QoYWxsUmVzb3VyY2VDaGFuZ2VzLCAocmVzQ2hhbmdlKSA9PiAhcmVzQ2hhbmdlLmlzUmVtb3ZhbCk7XG4gIGZvciAoY29uc3QgW2xvZ0lkLCBub25SZW1vdmFsQ2hhbmdlXSBvZiBPYmplY3QuZW50cmllcyhhbGxOb25SZW1vdmFsQ2hhbmdlcykpIHtcbiAgICBpZiAobm9uUmVtb3ZhbENoYW5nZS5pc0FkZGl0aW9uKSB7XG4gICAgICBjb25zdCBhZGRDaGFuZ2UgPSBub25SZW1vdmFsQ2hhbmdlO1xuICAgICAgLy8gc2VhcmNoIGZvciBhbiBpZGVudGljYWwgcmVtb3ZhbCBjaGFuZ2VcbiAgICAgIGNvbnN0IGlkZW50aWNhbFJlbW92YWxDaGFuZ2UgPSBPYmplY3QuZW50cmllcyhhbGxSZW1vdmFsQ2hhbmdlcykuZmluZCgoW18sIHJlbUNoYW5nZV0pID0+IHtcbiAgICAgICAgcmV0dXJuIGNoYW5nZXNBcmVGb3JTYW1lUmVzb3VyY2UocmVtQ2hhbmdlLCBhZGRDaGFuZ2UpO1xuICAgICAgfSk7XG4gICAgICAvLyBpZiB3ZSBmb3VuZCBvbmUsIHRoZW4gdGhpcyBtZWFucyB0aGlzIGlzIGEgcmVuYW1lIGNoYW5nZVxuICAgICAgaWYgKGlkZW50aWNhbFJlbW92YWxDaGFuZ2UpIHtcbiAgICAgICAgY29uc3QgW3JlbW92ZWRMb2dJZCwgcmVtb3ZlZFJlc291cmNlQ2hhbmdlXSA9IGlkZW50aWNhbFJlbW92YWxDaGFuZ2U7XG4gICAgICAgIGFsbE5vblJlbW92YWxDaGFuZ2VzW2xvZ0lkXSA9IG1ha2VSZW5hbWVEaWZmZXJlbmNlKHJlbW92ZWRSZXNvdXJjZUNoYW5nZSwgYWRkQ2hhbmdlKTtcbiAgICAgICAgLy8gZGVsZXRlIHRoZSByZW1vdmFsIGNoYW5nZSB0aGF0IGZvcm1zIHRoZSByZW5hbWUgcGFpclxuICAgICAgICBkZWxldGUgYWxsUmVtb3ZhbENoYW5nZXNbcmVtb3ZlZExvZ0lkXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gdGhlIGZpbmFsIHJlc3VsdCBhcmUgYWxsIG9mIHRoZSByZW1haW5pbmcgcmVtb3ZhbCBjaGFuZ2VzLFxuICAvLyBwbHVzIGFsbCBvZiB0aGUgbm9uLXJlbW92YWwgY2hhbmdlc1xuICAvLyAod2Ugc2F2ZWQgdGhlIHJlbmFtZSBjaGFuZ2VzIGluIHRoYXQgb2JqZWN0IGFscmVhZHkpXG4gIHJldHVybiB7XG4gICAgLi4uYWxsUmVtb3ZhbENoYW5nZXMsXG4gICAgLi4uYWxsTm9uUmVtb3ZhbENoYW5nZXMsXG4gIH07XG59XG5cbi8qKiBGaWx0ZXJzIGFuIG9iamVjdCB3aXRoIHN0cmluZyBrZXlzIGJhc2VkIG9uIHdoZXRoZXIgdGhlIGNhbGxiYWNrIHJldHVybnMgJ3RydWUnIGZvciB0aGUgZ2l2ZW4gdmFsdWUgaW4gdGhlIG9iamVjdC4gKi9cbmZ1bmN0aW9uIGZpbHRlckRpY3Q8VD4oZGljdDogeyBba2V5OiBzdHJpbmddOiBUIH0sIGZ1bmM6ICh0OiBUKSA9PiBib29sZWFuKTogeyBba2V5OiBzdHJpbmddOiBUIH0ge1xuICByZXR1cm4gT2JqZWN0LmVudHJpZXMoZGljdCkucmVkdWNlKFxuICAgIChhY2MsIFtrZXksIHRdKSA9PiB7XG4gICAgICBpZiAoZnVuYyh0KSkge1xuICAgICAgICBhY2Nba2V5XSA9IHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sXG4gICAge30gYXMgeyBba2V5OiBzdHJpbmddOiBUIH0sXG4gICk7XG59XG5cbi8qKiBGaW5kcyBhbnkgaG90c3dhcHBhYmxlIGNoYW5nZXMgaW4gYWxsIG5lc3RlZCBzdGFja3MuICovXG5hc3luYyBmdW5jdGlvbiBmaW5kTmVzdGVkSG90c3dhcHBhYmxlQ2hhbmdlcyhcbiAgbG9naWNhbElkOiBzdHJpbmcsXG4gIGNoYW5nZTogY2ZuX2RpZmYuUmVzb3VyY2VEaWZmZXJlbmNlLFxuICBuZXN0ZWRTdGFja1RlbXBsYXRlczogeyBbbmVzdGVkU3RhY2tOYW1lOiBzdHJpbmddOiBOZXN0ZWRTdGFja1RlbXBsYXRlcyB9LFxuICBldmFsdWF0ZUNmblRlbXBsYXRlOiBFdmFsdWF0ZUNsb3VkRm9ybWF0aW9uVGVtcGxhdGUsXG4gIHNkazogU0RLLFxuICBob3Rzd2FwUHJvcGVydHlPdmVycmlkZXM6IEhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlcyxcbik6IFByb21pc2U8Q2xhc3NpZmllZFJlc291cmNlQ2hhbmdlcz4ge1xuICBjb25zdCBuZXN0ZWRTdGFjayA9IG5lc3RlZFN0YWNrVGVtcGxhdGVzW2xvZ2ljYWxJZF07XG4gIGlmICghbmVzdGVkU3RhY2sucGh5c2ljYWxOYW1lKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhvdHN3YXBwYWJsZUNoYW5nZXM6IFtdLFxuICAgICAgbm9uSG90c3dhcHBhYmxlQ2hhbmdlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaG90c3dhcHBhYmxlOiBmYWxzZSxcbiAgICAgICAgICBsb2dpY2FsSWQsXG4gICAgICAgICAgcmVhc29uOiBgcGh5c2ljYWwgbmFtZSBmb3IgQVdTOjpDbG91ZEZvcm1hdGlvbjo6U3RhY2sgJyR7bG9naWNhbElkfScgY291bGQgbm90IGJlIGZvdW5kIGluIENsb3VkRm9ybWF0aW9uLCBzbyB0aGlzIGlzIGEgbmV3bHkgY3JlYXRlZCBuZXN0ZWQgc3RhY2sgYW5kIGNhbm5vdCBiZSBob3Rzd2FwcGVkYCxcbiAgICAgICAgICByZWplY3RlZENoYW5nZXM6IFtdLFxuICAgICAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OlN0YWNrJyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGV2YWx1YXRlTmVzdGVkQ2ZuVGVtcGxhdGUgPSBhd2FpdCBldmFsdWF0ZUNmblRlbXBsYXRlLmNyZWF0ZU5lc3RlZEV2YWx1YXRlQ2xvdWRGb3JtYXRpb25UZW1wbGF0ZShcbiAgICBuZXN0ZWRTdGFjay5waHlzaWNhbE5hbWUsXG4gICAgbmVzdGVkU3RhY2suZ2VuZXJhdGVkVGVtcGxhdGUsXG4gICAgY2hhbmdlLm5ld1ZhbHVlPy5Qcm9wZXJ0aWVzPy5QYXJhbWV0ZXJzLFxuICApO1xuXG4gIGNvbnN0IG5lc3RlZERpZmYgPSBjZm5fZGlmZi5mdWxsRGlmZihcbiAgICBuZXN0ZWRTdGFja1RlbXBsYXRlc1tsb2dpY2FsSWRdLmRlcGxveWVkVGVtcGxhdGUsXG4gICAgbmVzdGVkU3RhY2tUZW1wbGF0ZXNbbG9naWNhbElkXS5nZW5lcmF0ZWRUZW1wbGF0ZSxcbiAgKTtcblxuICByZXR1cm4gY2xhc3NpZnlSZXNvdXJjZUNoYW5nZXMoXG4gICAgbmVzdGVkRGlmZixcbiAgICBldmFsdWF0ZU5lc3RlZENmblRlbXBsYXRlLFxuICAgIHNkayxcbiAgICBuZXN0ZWRTdGFja1RlbXBsYXRlc1tsb2dpY2FsSWRdLm5lc3RlZFN0YWNrVGVtcGxhdGVzLFxuICAgIGhvdHN3YXBQcm9wZXJ0eU92ZXJyaWRlcyk7XG59XG5cbi8qKiBSZXR1cm5zICd0cnVlJyBpZiBhIHBhaXIgb2YgY2hhbmdlcyBpcyBmb3IgdGhlIHNhbWUgcmVzb3VyY2UuICovXG5mdW5jdGlvbiBjaGFuZ2VzQXJlRm9yU2FtZVJlc291cmNlKFxuICBvbGRDaGFuZ2U6IGNmbl9kaWZmLlJlc291cmNlRGlmZmVyZW5jZSxcbiAgbmV3Q2hhbmdlOiBjZm5fZGlmZi5SZXNvdXJjZURpZmZlcmVuY2UsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBvbGRDaGFuZ2Uub2xkUmVzb3VyY2VUeXBlID09PSBuZXdDaGFuZ2UubmV3UmVzb3VyY2VUeXBlICYmXG4gICAgLy8gdGhpcyBpc24ndCBncmVhdCwgYnV0IEkgZG9uJ3Qgd2FudCB0byBicmluZyBpbiBzb21ldGhpbmcgbGlrZSB1bmRlcnNjb3JlIGp1c3QgZm9yIHRoaXMgY29tcGFyaXNvblxuICAgIEpTT04uc3RyaW5naWZ5KG9sZENoYW5nZS5vbGRQcm9wZXJ0aWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Q2hhbmdlLm5ld1Byb3BlcnRpZXMpXG4gICk7XG59XG5cbmZ1bmN0aW9uIG1ha2VSZW5hbWVEaWZmZXJlbmNlKFxuICByZW1DaGFuZ2U6IGNmbl9kaWZmLlJlc291cmNlRGlmZmVyZW5jZSxcbiAgYWRkQ2hhbmdlOiBjZm5fZGlmZi5SZXNvdXJjZURpZmZlcmVuY2UsXG4pOiBjZm5fZGlmZi5SZXNvdXJjZURpZmZlcmVuY2Uge1xuICByZXR1cm4gbmV3IGNmbl9kaWZmLlJlc291cmNlRGlmZmVyZW5jZShcbiAgICAvLyB3ZSBoYXZlIHRvIGZpbGwgaW4gdGhlIG9sZCB2YWx1ZSwgYmVjYXVzZSBvdGhlcndpc2UgdGhpcyB3aWxsIGJlIGNsYXNzaWZpZWQgYXMgYSBub24taG90c3dhcHBhYmxlIGNoYW5nZVxuICAgIHJlbUNoYW5nZS5vbGRWYWx1ZSxcbiAgICBhZGRDaGFuZ2UubmV3VmFsdWUsXG4gICAge1xuICAgICAgcmVzb3VyY2VUeXBlOiB7XG4gICAgICAgIG9sZFR5cGU6IHJlbUNoYW5nZS5vbGRSZXNvdXJjZVR5cGUsXG4gICAgICAgIG5ld1R5cGU6IGFkZENoYW5nZS5uZXdSZXNvdXJjZVR5cGUsXG4gICAgICB9LFxuICAgICAgcHJvcGVydHlEaWZmczogKGFkZENoYW5nZSBhcyBhbnkpLnByb3BlcnR5RGlmZnMsXG4gICAgICBvdGhlckRpZmZzOiAoYWRkQ2hhbmdlIGFzIGFueSkub3RoZXJEaWZmcyxcbiAgICB9LFxuICApO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBgSG90c3dhcHBhYmxlQ2hhbmdlQ2FuZGlkYXRlYCBpZiB0aGUgY2hhbmdlIGlzIGhvdHN3YXBwYWJsZVxuICogUmV0dXJucyBhbiBlbXB0eSBgSG90c3dhcHBhYmxlQ2hhbmdlYCBpZiB0aGUgY2hhbmdlIGlzIHRvIENESzo6TWV0YWRhdGFcbiAqIFJldHVybnMgYSBgTm9uSG90c3dhcHBhYmxlQ2hhbmdlYCBpZiB0aGUgY2hhbmdlIGlzIG5vdCBob3Rzd2FwcGFibGVcbiAqL1xuZnVuY3Rpb24gaXNDYW5kaWRhdGVGb3JIb3Rzd2FwcGluZyhcbiAgY2hhbmdlOiBjZm5fZGlmZi5SZXNvdXJjZURpZmZlcmVuY2UsXG4gIGxvZ2ljYWxJZDogc3RyaW5nLFxuKTogSG90c3dhcHBhYmxlQ2hhbmdlIHwgTm9uSG90c3dhcHBhYmxlQ2hhbmdlIHwgSG90c3dhcHBhYmxlQ2hhbmdlQ2FuZGlkYXRlIHtcbiAgLy8gYSByZXNvdXJjZSBoYXMgYmVlbiByZW1vdmVkIE9SIGEgcmVzb3VyY2UgaGFzIGJlZW4gYWRkZWQ7IHdlIGNhbid0IHNob3J0LWNpcmN1aXQgdGhhdCBjaGFuZ2VcbiAgaWYgKCFjaGFuZ2Uub2xkVmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaG90c3dhcHBhYmxlOiBmYWxzZSxcbiAgICAgIHJlc291cmNlVHlwZTogY2hhbmdlLm5ld1ZhbHVlIS5UeXBlLFxuICAgICAgbG9naWNhbElkLFxuICAgICAgcmVqZWN0ZWRDaGFuZ2VzOiBbXSxcbiAgICAgIHJlYXNvbjogYHJlc291cmNlICcke2xvZ2ljYWxJZH0nIHdhcyBjcmVhdGVkIGJ5IHRoaXMgZGVwbG95bWVudGAsXG4gICAgfTtcbiAgfSBlbHNlIGlmICghY2hhbmdlLm5ld1ZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhvdHN3YXBwYWJsZTogZmFsc2UsXG4gICAgICByZXNvdXJjZVR5cGU6IGNoYW5nZS5vbGRWYWx1ZSEuVHlwZSxcbiAgICAgIGxvZ2ljYWxJZCxcbiAgICAgIHJlamVjdGVkQ2hhbmdlczogW10sXG4gICAgICByZWFzb246IGByZXNvdXJjZSAnJHtsb2dpY2FsSWR9JyB3YXMgZGVzdHJveWVkIGJ5IHRoaXMgZGVwbG95bWVudGAsXG4gICAgfTtcbiAgfVxuXG4gIC8vIGEgcmVzb3VyY2UgaGFzIGhhZCBpdHMgdHlwZSBjaGFuZ2VkXG4gIGlmIChjaGFuZ2UubmV3VmFsdWU/LlR5cGUgIT09IGNoYW5nZS5vbGRWYWx1ZT8uVHlwZSkge1xuICAgIHJldHVybiB7XG4gICAgICBob3Rzd2FwcGFibGU6IGZhbHNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiBjaGFuZ2UubmV3VmFsdWU/LlR5cGUsXG4gICAgICBsb2dpY2FsSWQsXG4gICAgICByZWplY3RlZENoYW5nZXM6IFtdLFxuICAgICAgcmVhc29uOiBgcmVzb3VyY2UgJyR7bG9naWNhbElkfScgaGFkIGl0cyB0eXBlIGNoYW5nZWQgZnJvbSAnJHtjaGFuZ2Uub2xkVmFsdWU/LlR5cGV9JyB0byAnJHtjaGFuZ2UubmV3VmFsdWU/LlR5cGV9J2AsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbG9naWNhbElkLFxuICAgIG9sZFZhbHVlOiBjaGFuZ2Uub2xkVmFsdWUsXG4gICAgbmV3VmFsdWU6IGNoYW5nZS5uZXdWYWx1ZSxcbiAgICBwcm9wZXJ0eVVwZGF0ZXM6IGNoYW5nZS5wcm9wZXJ0eVVwZGF0ZXMsXG4gIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFwcGx5QWxsSG90c3dhcHBhYmxlQ2hhbmdlcyhzZGs6IFNESywgaG90c3dhcHBhYmxlQ2hhbmdlczogSG90c3dhcHBhYmxlQ2hhbmdlW10pOiBQcm9taXNlPHZvaWRbXT4ge1xuICBpZiAoaG90c3dhcHBhYmxlQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gICAgcHJpbnQoYFxcbiR7SUNPTn0gaG90c3dhcHBpbmcgcmVzb3VyY2VzOmApO1xuICB9XG4gIGNvbnN0IGxpbWl0ID0gcExpbWl0KDEwKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBjZGtsYWJzL3Byb21pc2VhbGwtbm8tdW5ib3VuZGVkLXBhcmFsbGVsaXNtXG4gIHJldHVybiBQcm9taXNlLmFsbChob3Rzd2FwcGFibGVDaGFuZ2VzLm1hcChob3Rzd2FwT3BlcmF0aW9uID0+IGxpbWl0KCgpID0+IHtcbiAgICByZXR1cm4gYXBwbHlIb3Rzd2FwcGFibGVDaGFuZ2Uoc2RrLCBob3Rzd2FwT3BlcmF0aW9uKTtcbiAgfSkpKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYXBwbHlIb3Rzd2FwcGFibGVDaGFuZ2Uoc2RrOiBTREssIGhvdHN3YXBPcGVyYXRpb246IEhvdHN3YXBwYWJsZUNoYW5nZSk6IFByb21pc2U8dm9pZD4ge1xuICAvLyBub3RlIHRoZSB0eXBlIG9mIHNlcnZpY2UgdGhhdCB3YXMgc3VjY2Vzc2Z1bGx5IGhvdHN3YXBwZWQgaW4gdGhlIFVzZXItQWdlbnRcbiAgY29uc3QgY3VzdG9tVXNlckFnZW50ID0gYGNkay1ob3Rzd2FwL3N1Y2Nlc3MtJHtob3Rzd2FwT3BlcmF0aW9uLnNlcnZpY2V9YDtcbiAgc2RrLmFwcGVuZEN1c3RvbVVzZXJBZ2VudChjdXN0b21Vc2VyQWdlbnQpO1xuXG4gIGZvciAoY29uc3QgbmFtZSBvZiBob3Rzd2FwT3BlcmF0aW9uLnJlc291cmNlTmFtZXMpIHtcbiAgICBwcmludChgICAgJHtJQ09OfSAlc2AsIGNoYWxrLmJvbGQobmFtZSkpO1xuICB9XG5cbiAgLy8gaWYgdGhlIFNESyBjYWxsIGZhaWxzLCBhbiBlcnJvciB3aWxsIGJlIHRocm93biBieSB0aGUgU0RLXG4gIC8vIGFuZCB3aWxsIHByZXZlbnQgdGhlIGdyZWVuICdob3Rzd2FwcGVkIScgdGV4dCBmcm9tIGJlaW5nIGRpc3BsYXllZFxuICB0cnkge1xuICAgIGF3YWl0IGhvdHN3YXBPcGVyYXRpb24uYXBwbHkoc2RrKTtcbiAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgaWYgKGUubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicgfHwgZS5uYW1lID09PSAnQWJvcnRFcnJvcicpIHtcbiAgICAgIGNvbnN0IHJlc3VsdDogV2FpdGVyUmVzdWx0ID0gSlNPTi5wYXJzZShlLm1lc3NhZ2UpO1xuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoW1xuICAgICAgICBgUmVzb3VyY2UgaXMgbm90IGluIHRoZSBleHBlY3RlZCBzdGF0ZSBkdWUgdG8gd2FpdGVyIHN0YXR1czogJHtyZXN1bHQuc3RhdGV9YCxcbiAgICAgICAgcmVzdWx0LnJlYXNvbiA/IGAke3Jlc3VsdC5yZWFzb259LmAgOiAnJyxcbiAgICAgIF0uam9pbignLiAnKSk7XG4gICAgICBlcnJvci5uYW1lID0gZS5uYW1lO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cblxuICBmb3IgKGNvbnN0IG5hbWUgb2YgaG90c3dhcE9wZXJhdGlvbi5yZXNvdXJjZU5hbWVzKSB7XG4gICAgcHJpbnQoYCR7SUNPTn0gJXMgJXNgLCBjaGFsay5ib2xkKG5hbWUpLCBjaGFsay5ncmVlbignaG90c3dhcHBlZCEnKSk7XG4gIH1cblxuICBzZGsucmVtb3ZlQ3VzdG9tVXNlckFnZW50KGN1c3RvbVVzZXJBZ2VudCk7XG59XG5cbmZ1bmN0aW9uIGxvZ05vbkhvdHN3YXBwYWJsZUNoYW5nZXMobm9uSG90c3dhcHBhYmxlQ2hhbmdlczogTm9uSG90c3dhcHBhYmxlQ2hhbmdlW10sIGhvdHN3YXBNb2RlOiBIb3Rzd2FwTW9kZSk6IHZvaWQge1xuICBpZiAobm9uSG90c3dhcHBhYmxlQ2hhbmdlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgLyoqXG4gICAqIEVLUyBTZXJ2aWNlcyBjYW4gaGF2ZSBhIHRhc2sgZGVmaW5pdGlvbiB0aGF0IGRvZXNuJ3QgcmVmZXIgdG8gdGhlIHRhc2sgZGVmaW5pdGlvbiBiZWluZyB1cGRhdGVkLlxuICAgKiBXZSBoYXZlIHRvIGxvZyB0aGlzIGFzIGEgbm9uLWhvdHN3YXBwYWJsZSBjaGFuZ2UgdG8gdGhlIHRhc2sgZGVmaW5pdGlvbiwgYnV0IHdoZW4gd2UgZG8sXG4gICAqIHdlIHdpbmQgdXAgaG90c3dhcHBpbmcgdGhlIHRhc2sgZGVmaW5pdGlvbiBhbmQgbG9nZ2luZyBpdCBhcyBhIG5vbi1ob3Rzd2FwcGFibGUgY2hhbmdlLlxuICAgKlxuICAgKiBUaGlzIGxvZ2ljIHByZXZlbnRzIHVzIGZyb20gbG9nZ2luZyB0aGF0IGNoYW5nZSBhcyBub24taG90c3dhcHBhYmxlIHdoZW4gd2UgaG90c3dhcCBpdC5cbiAgICovXG4gIGlmIChob3Rzd2FwTW9kZSA9PT0gSG90c3dhcE1vZGUuSE9UU1dBUF9PTkxZKSB7XG4gICAgbm9uSG90c3dhcHBhYmxlQ2hhbmdlcyA9IG5vbkhvdHN3YXBwYWJsZUNoYW5nZXMuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS5ob3Rzd2FwT25seVZpc2libGUgPT09IHRydWUpO1xuXG4gICAgaWYgKG5vbkhvdHN3YXBwYWJsZUNoYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGlmIChob3Rzd2FwTW9kZSA9PT0gSG90c3dhcE1vZGUuSE9UU1dBUF9PTkxZKSB7XG4gICAgcHJpbnQoXG4gICAgICAnXFxuJXMgJXMnLFxuICAgICAgY2hhbGsucmVkKCfimqDvuI8nKSxcbiAgICAgIGNoYWxrLnJlZChcbiAgICAgICAgJ1RoZSBmb2xsb3dpbmcgbm9uLWhvdHN3YXBwYWJsZSBjaGFuZ2VzIHdlcmUgZm91bmQuIFRvIHJlY29uY2lsZSB0aGVzZSB1c2luZyBDbG91ZEZvcm1hdGlvbiwgc3BlY2lmeSAtLWhvdHN3YXAtZmFsbGJhY2snLFxuICAgICAgKSxcbiAgICApO1xuICB9IGVsc2Uge1xuICAgIHByaW50KCdcXG4lcyAlcycsIGNoYWxrLnJlZCgn4pqg77iPJyksIGNoYWxrLnJlZCgnVGhlIGZvbGxvd2luZyBub24taG90c3dhcHBhYmxlIGNoYW5nZXMgd2VyZSBmb3VuZDonKSk7XG4gIH1cblxuICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBub25Ib3Rzd2FwcGFibGVDaGFuZ2VzKSB7XG4gICAgY2hhbmdlLnJlamVjdGVkQ2hhbmdlcy5sZW5ndGggPiAwXG4gICAgICA/IHByaW50KFxuICAgICAgICAnICAgIGxvZ2ljYWxJRDogJXMsIHR5cGU6ICVzLCByZWplY3RlZCBjaGFuZ2VzOiAlcywgcmVhc29uOiAlcycsXG4gICAgICAgIGNoYWxrLmJvbGQoY2hhbmdlLmxvZ2ljYWxJZCksXG4gICAgICAgIGNoYWxrLmJvbGQoY2hhbmdlLnJlc291cmNlVHlwZSksXG4gICAgICAgIGNoYWxrLmJvbGQoY2hhbmdlLnJlamVjdGVkQ2hhbmdlcyksXG4gICAgICAgIGNoYWxrLnJlZChjaGFuZ2UucmVhc29uKSxcbiAgICAgIClcbiAgICAgIDogcHJpbnQoXG4gICAgICAgICcgICAgbG9naWNhbElEOiAlcywgdHlwZTogJXMsIHJlYXNvbjogJXMnLFxuICAgICAgICBjaGFsay5ib2xkKGNoYW5nZS5sb2dpY2FsSWQpLFxuICAgICAgICBjaGFsay5ib2xkKGNoYW5nZS5yZXNvdXJjZVR5cGUpLFxuICAgICAgICBjaGFsay5yZWQoY2hhbmdlLnJlYXNvbiksXG4gICAgICApO1xuICB9XG5cbiAgcHJpbnQoJycpOyAvLyBuZXdsaW5lXG59XG4iXX0=