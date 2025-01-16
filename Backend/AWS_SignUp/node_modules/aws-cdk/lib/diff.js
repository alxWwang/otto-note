"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireApproval = void 0;
exports.printStackDiff = printStackDiff;
exports.printSecurityDiff = printSecurityDiff;
const util_1 = require("util");
const cxschema = require("@aws-cdk/cloud-assembly-schema");
const cloudformation_diff_1 = require("@aws-cdk/cloudformation-diff");
const chalk = require("chalk");
const logging_1 = require("./logging");
const error_1 = require("./toolkit/error");
/**
 * Pretty-prints the differences between two template states to the console.
 *
 * @param oldTemplate the old/current state of the stack.
 * @param newTemplate the new/target state of the stack.
 * @param strict      do not filter out AWS::CDK::Metadata or Rules
 * @param context     lines of context to use in arbitrary JSON diff
 * @param quiet       silences \'There were no differences\' messages
 *
 * @returns the number of stacks in this stack tree that have differences, including the top-level root stack
 */
function printStackDiff(oldTemplate, newTemplate, strict, context, quiet, stackName, changeSet, isImport, stream = process.stderr, nestedStackTemplates) {
    let diff = (0, cloudformation_diff_1.fullDiff)(oldTemplate, newTemplate.template, changeSet, isImport);
    // must output the stack name if there are differences, even if quiet
    if (stackName && (!quiet || !diff.isEmpty)) {
        stream.write((0, util_1.format)('Stack %s\n', chalk.bold(stackName)));
    }
    if (!quiet && isImport) {
        stream.write('Parameters and rules created during migration do not affect resource configuration.\n');
    }
    // detect and filter out mangled characters from the diff
    let filteredChangesCount = 0;
    if (diff.differenceCount && !strict) {
        const mangledNewTemplate = JSON.parse((0, cloudformation_diff_1.mangleLikeCloudFormation)(JSON.stringify(newTemplate.template)));
        const mangledDiff = (0, cloudformation_diff_1.fullDiff)(oldTemplate, mangledNewTemplate, changeSet);
        filteredChangesCount = Math.max(0, diff.differenceCount - mangledDiff.differenceCount);
        if (filteredChangesCount > 0) {
            diff = mangledDiff;
        }
    }
    // filter out 'AWS::CDK::Metadata' resources from the template
    // filter out 'CheckBootstrapVersion' rules from the template
    if (!strict) {
        obscureDiff(diff);
    }
    let stackDiffCount = 0;
    if (!diff.isEmpty) {
        stackDiffCount++;
        (0, cloudformation_diff_1.formatDifferences)(stream, diff, {
            ...logicalIdMapFromTemplate(oldTemplate),
            ...buildLogicalToPathMap(newTemplate),
        }, context);
    }
    else if (!quiet) {
        (0, logging_1.print)(chalk.green('There were no differences'));
    }
    if (filteredChangesCount > 0) {
        (0, logging_1.print)(chalk.yellow(`Omitted ${filteredChangesCount} changes because they are likely mangled non-ASCII characters. Use --strict to print them.`));
    }
    for (const nestedStackLogicalId of Object.keys(nestedStackTemplates ?? {})) {
        if (!nestedStackTemplates) {
            break;
        }
        const nestedStack = nestedStackTemplates[nestedStackLogicalId];
        newTemplate._template = nestedStack.generatedTemplate;
        stackDiffCount += printStackDiff(nestedStack.deployedTemplate, newTemplate, strict, context, quiet, nestedStack.physicalName ?? nestedStackLogicalId, undefined, isImport, stream, nestedStack.nestedStackTemplates);
    }
    return stackDiffCount;
}
var RequireApproval;
(function (RequireApproval) {
    RequireApproval["Never"] = "never";
    RequireApproval["AnyChange"] = "any-change";
    RequireApproval["Broadening"] = "broadening";
})(RequireApproval || (exports.RequireApproval = RequireApproval = {}));
/**
 * Print the security changes of this diff, if the change is impactful enough according to the approval level
 *
 * Returns true if the changes are prompt-worthy, false otherwise.
 */
function printSecurityDiff(oldTemplate, newTemplate, requireApproval, _quiet, stackName, changeSet, stream = process.stderr) {
    const diff = (0, cloudformation_diff_1.fullDiff)(oldTemplate, newTemplate.template, changeSet);
    if (diffRequiresApproval(diff, requireApproval)) {
        stream.write((0, util_1.format)('Stack %s\n', chalk.bold(stackName)));
        // eslint-disable-next-line max-len
        (0, logging_1.warning)(`This deployment will make potentially sensitive changes according to your current security approval level (--require-approval ${requireApproval}).`);
        (0, logging_1.warning)('Please confirm you intend to make the following modifications:\n');
        (0, cloudformation_diff_1.formatSecurityChanges)(process.stdout, diff, buildLogicalToPathMap(newTemplate));
        return true;
    }
    return false;
}
/**
 * Return whether the diff has security-impacting changes that need confirmation
 *
 * TODO: Filter the security impact determination based off of an enum that allows
 * us to pick minimum "severities" to alert on.
 */
function diffRequiresApproval(diff, requireApproval) {
    switch (requireApproval) {
        case RequireApproval.Never: return false;
        case RequireApproval.AnyChange: return diff.permissionsAnyChanges;
        case RequireApproval.Broadening: return diff.permissionsBroadened;
        default: throw new error_1.ToolkitError(`Unrecognized approval level: ${requireApproval}`);
    }
}
function buildLogicalToPathMap(stack) {
    const map = {};
    for (const md of stack.findMetadataByType(cxschema.ArtifactMetadataEntryType.LOGICAL_ID)) {
        map[md.data] = md.path;
    }
    return map;
}
function logicalIdMapFromTemplate(template) {
    const ret = {};
    for (const [logicalId, resource] of Object.entries(template.Resources ?? {})) {
        const path = resource?.Metadata?.['aws:cdk:path'];
        if (path) {
            ret[logicalId] = path;
        }
    }
    return ret;
}
/**
 * Remove any template elements that we don't want to show users.
 * This is currently:
 * - AWS::CDK::Metadata resource
 * - CheckBootstrapVersion Rule
 */
function obscureDiff(diff) {
    if (diff.unknown) {
        // see https://github.com/aws/aws-cdk/issues/17942
        diff.unknown = diff.unknown.filter(change => {
            if (!change) {
                return true;
            }
            if (change.newValue?.CheckBootstrapVersion) {
                return false;
            }
            if (change.oldValue?.CheckBootstrapVersion) {
                return false;
            }
            return true;
        });
    }
    if (diff.resources) {
        diff.resources = diff.resources.filter(change => {
            if (!change) {
                return true;
            }
            if (change.newResourceType === 'AWS::CDK::Metadata') {
                return false;
            }
            if (change.oldResourceType === 'AWS::CDK::Metadata') {
                return false;
            }
            return true;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBNEJBLHdDQTJFQztBQWVELDhDQXNCQztBQTVJRCwrQkFBOEI7QUFDOUIsMkRBQTJEO0FBQzNELHNFQVFzQztBQUV0QywrQkFBK0I7QUFFL0IsdUNBQTJDO0FBQzNDLDJDQUErQztBQUUvQzs7Ozs7Ozs7OztHQVVHO0FBQ0gsU0FBZ0IsY0FBYyxDQUM1QixXQUFnQixFQUNoQixXQUE4QyxFQUM5QyxNQUFlLEVBQ2YsT0FBZSxFQUNmLEtBQWMsRUFDZCxTQUFrQixFQUNsQixTQUFtQyxFQUNuQyxRQUFrQixFQUNsQixTQUF1QixPQUFPLENBQUMsTUFBTSxFQUNyQyxvQkFBK0U7SUFDL0UsSUFBSSxJQUFJLEdBQUcsSUFBQSw4QkFBUSxFQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUU1RSxxRUFBcUU7SUFDckUsSUFBSSxTQUFTLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBQSxhQUFNLEVBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUZBQXVGLENBQUMsQ0FBQztJQUN4RyxDQUFDO0lBRUQseURBQXlEO0lBQ3pELElBQUksb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO0lBQzdCLElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLDhDQUF3QixFQUFD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SSxNQUFNLENBQUMsZUFBZSxLQUFLLG9CQUFvQixFQUFFLENBQUM7Z0JBQUMsT0FBTyxLQUFLLENBQUM7WUFBQyxDQUFDO1lBQ3RFLElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxvQkFBb0IsRUFBRSxDQUFDO2dCQUFDLE9BQU8sS0FBSyxDQUFDO1lBQUMsQ0FBQztZQUN0RSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBmb3JtYXQgfSBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIGN4c2NoZW1hIGZyb20gJ0Bhd3MtY2RrL2Nsb3VkLWFzc2VtYmx5LXNjaGVtYSc7XG5pbXBvcnQge1xuICB0eXBlIERlc2NyaWJlQ2hhbmdlU2V0T3V0cHV0LFxuICB0eXBlIEZvcm1hdFN0cmVhbSxcbiAgdHlwZSBUZW1wbGF0ZURpZmYsXG4gIGZvcm1hdERpZmZlcmVuY2VzLFxuICBmb3JtYXRTZWN1cml0eUNoYW5nZXMsXG4gIGZ1bGxEaWZmLFxuICBtYW5nbGVMaWtlQ2xvdWRGb3JtYXRpb24sXG59IGZyb20gJ0Bhd3MtY2RrL2Nsb3VkZm9ybWF0aW9uLWRpZmYnO1xuaW1wb3J0ICogYXMgY3hhcGkgZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCAqIGFzIGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IE5lc3RlZFN0YWNrVGVtcGxhdGVzIH0gZnJvbSAnLi9hcGkvbmVzdGVkLXN0YWNrLWhlbHBlcnMnO1xuaW1wb3J0IHsgcHJpbnQsIHdhcm5pbmcgfSBmcm9tICcuL2xvZ2dpbmcnO1xuaW1wb3J0IHsgVG9vbGtpdEVycm9yIH0gZnJvbSAnLi90b29sa2l0L2Vycm9yJztcblxuLyoqXG4gKiBQcmV0dHktcHJpbnRzIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHR3byB0ZW1wbGF0ZSBzdGF0ZXMgdG8gdGhlIGNvbnNvbGUuXG4gKlxuICogQHBhcmFtIG9sZFRlbXBsYXRlIHRoZSBvbGQvY3VycmVudCBzdGF0ZSBvZiB0aGUgc3RhY2suXG4gKiBAcGFyYW0gbmV3VGVtcGxhdGUgdGhlIG5ldy90YXJnZXQgc3RhdGUgb2YgdGhlIHN0YWNrLlxuICogQHBhcmFtIHN0cmljdCAgICAgIGRvIG5vdCBmaWx0ZXIgb3V0IEFXUzo6Q0RLOjpNZXRhZGF0YSBvciBSdWxlc1xuICogQHBhcmFtIGNvbnRleHQgICAgIGxpbmVzIG9mIGNvbnRleHQgdG8gdXNlIGluIGFyYml0cmFyeSBKU09OIGRpZmZcbiAqIEBwYXJhbSBxdWlldCAgICAgICBzaWxlbmNlcyBcXCdUaGVyZSB3ZXJlIG5vIGRpZmZlcmVuY2VzXFwnIG1lc3NhZ2VzXG4gKlxuICogQHJldHVybnMgdGhlIG51bWJlciBvZiBzdGFja3MgaW4gdGhpcyBzdGFjayB0cmVlIHRoYXQgaGF2ZSBkaWZmZXJlbmNlcywgaW5jbHVkaW5nIHRoZSB0b3AtbGV2ZWwgcm9vdCBzdGFja1xuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRTdGFja0RpZmYoXG4gIG9sZFRlbXBsYXRlOiBhbnksXG4gIG5ld1RlbXBsYXRlOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3QsXG4gIHN0cmljdDogYm9vbGVhbixcbiAgY29udGV4dDogbnVtYmVyLFxuICBxdWlldDogYm9vbGVhbixcbiAgc3RhY2tOYW1lPzogc3RyaW5nLFxuICBjaGFuZ2VTZXQ/OiBEZXNjcmliZUNoYW5nZVNldE91dHB1dCxcbiAgaXNJbXBvcnQ/OiBib29sZWFuLFxuICBzdHJlYW06IEZvcm1hdFN0cmVhbSA9IHByb2Nlc3Muc3RkZXJyLFxuICBuZXN0ZWRTdGFja1RlbXBsYXRlcz86IHsgW25lc3RlZFN0YWNrTG9naWNhbElkOiBzdHJpbmddOiBOZXN0ZWRTdGFja1RlbXBsYXRlcyB9KTogbnVtYmVyIHtcbiAgbGV0IGRpZmYgPSBmdWxsRGlmZihvbGRUZW1wbGF0ZSwgbmV3VGVtcGxhdGUudGVtcGxhdGUsIGNoYW5nZVNldCwgaXNJbXBvcnQpO1xuXG4gIC8vIG11c3Qgb3V0cHV0IHRoZSBzdGFjayBuYW1lIGlmIHRoZXJlIGFyZSBkaWZmZXJlbmNlcywgZXZlbiBpZiBxdWlldFxuICBpZiAoc3RhY2tOYW1lICYmICghcXVpZXQgfHwgIWRpZmYuaXNFbXB0eSkpIHtcbiAgICBzdHJlYW0ud3JpdGUoZm9ybWF0KCdTdGFjayAlc1xcbicsIGNoYWxrLmJvbGQoc3RhY2tOYW1lKSkpO1xuICB9XG5cbiAgaWYgKCFxdWlldCAmJiBpc0ltcG9ydCkge1xuICAgIHN0cmVhbS53cml0ZSgnUGFyYW1ldGVycyBhbmQgcnVsZXMgY3JlYXRlZCBkdXJpbmcgbWlncmF0aW9uIGRvIG5vdCBhZmZlY3QgcmVzb3VyY2UgY29uZmlndXJhdGlvbi5cXG4nKTtcbiAgfVxuXG4gIC8vIGRldGVjdCBhbmQgZmlsdGVyIG91dCBtYW5nbGVkIGNoYXJhY3RlcnMgZnJvbSB0aGUgZGlmZlxuICBsZXQgZmlsdGVyZWRDaGFuZ2VzQ291bnQgPSAwO1xuICBpZiAoZGlmZi5kaWZmZXJlbmNlQ291bnQgJiYgIXN0cmljdCkge1xuICAgIGNvbnN0IG1hbmdsZWROZXdUZW1wbGF0ZSA9IEpTT04ucGFyc2UobWFuZ2xlTGlrZUNsb3VkRm9ybWF0aW9uKEpTT04uc3RyaW5naWZ5KG5ld1RlbXBsYXRlLnRlbXBsYXRlKSkpO1xuICAgIGNvbnN0IG1hbmdsZWREaWZmID0gZnVsbERpZmYob2xkVGVtcGxhdGUsIG1hbmdsZWROZXdUZW1wbGF0ZSwgY2hhbmdlU2V0KTtcbiAgICBmaWx0ZXJlZENoYW5nZXNDb3VudCA9IE1hdGgubWF4KDAsIGRpZmYuZGlmZmVyZW5jZUNvdW50IC0gbWFuZ2xlZERpZmYuZGlmZmVyZW5jZUNvdW50KTtcbiAgICBpZiAoZmlsdGVyZWRDaGFuZ2VzQ291bnQgPiAwKSB7XG4gICAgICBkaWZmID0gbWFuZ2xlZERpZmY7XG4gICAgfVxuICB9XG5cbiAgLy8gZmlsdGVyIG91dCAnQVdTOjpDREs6Ok1ldGFkYXRhJyByZXNvdXJjZXMgZnJvbSB0aGUgdGVtcGxhdGVcbiAgLy8gZmlsdGVyIG91dCAnQ2hlY2tCb290c3RyYXBWZXJzaW9uJyBydWxlcyBmcm9tIHRoZSB0ZW1wbGF0ZVxuICBpZiAoIXN0cmljdCkge1xuICAgIG9ic2N1cmVEaWZmKGRpZmYpO1xuICB9XG5cbiAgbGV0IHN0YWNrRGlmZkNvdW50ID0gMDtcbiAgaWYgKCFkaWZmLmlzRW1wdHkpIHtcbiAgICBzdGFja0RpZmZDb3VudCsrO1xuICAgIGZvcm1hdERpZmZlcmVuY2VzKHN0cmVhbSwgZGlmZiwge1xuICAgICAgLi4ubG9naWNhbElkTWFwRnJvbVRlbXBsYXRlKG9sZFRlbXBsYXRlKSxcbiAgICAgIC4uLmJ1aWxkTG9naWNhbFRvUGF0aE1hcChuZXdUZW1wbGF0ZSksXG4gICAgfSwgY29udGV4dCk7XG4gIH0gZWxzZSBpZiAoIXF1aWV0KSB7XG4gICAgcHJpbnQoY2hhbGsuZ3JlZW4oJ1RoZXJlIHdlcmUgbm8gZGlmZmVyZW5jZXMnKSk7XG4gIH1cbiAgaWYgKGZpbHRlcmVkQ2hhbmdlc0NvdW50ID4gMCkge1xuICAgIHByaW50KGNoYWxrLnllbGxvdyhgT21pdHRlZCAke2ZpbHRlcmVkQ2hhbmdlc0NvdW50fSBjaGFuZ2VzIGJlY2F1c2UgdGhleSBhcmUgbGlrZWx5IG1hbmdsZWQgbm9uLUFTQ0lJIGNoYXJhY3RlcnMuIFVzZSAtLXN0cmljdCB0byBwcmludCB0aGVtLmApKTtcbiAgfVxuXG4gIGZvciAoY29uc3QgbmVzdGVkU3RhY2tMb2dpY2FsSWQgb2YgT2JqZWN0LmtleXMobmVzdGVkU3RhY2tUZW1wbGF0ZXMgPz8ge30pKSB7XG4gICAgaWYgKCFuZXN0ZWRTdGFja1RlbXBsYXRlcykge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IG5lc3RlZFN0YWNrID0gbmVzdGVkU3RhY2tUZW1wbGF0ZXNbbmVzdGVkU3RhY2tMb2dpY2FsSWRdO1xuXG4gICAgKG5ld1RlbXBsYXRlIGFzIGFueSkuX3RlbXBsYXRlID0gbmVzdGVkU3RhY2suZ2VuZXJhdGVkVGVtcGxhdGU7XG4gICAgc3RhY2tEaWZmQ291bnQgKz0gcHJpbnRTdGFja0RpZmYoXG4gICAgICBuZXN0ZWRTdGFjay5kZXBsb3llZFRlbXBsYXRlLFxuICAgICAgbmV3VGVtcGxhdGUsXG4gICAgICBzdHJpY3QsXG4gICAgICBjb250ZXh0LFxuICAgICAgcXVpZXQsXG4gICAgICBuZXN0ZWRTdGFjay5waHlzaWNhbE5hbWUgPz8gbmVzdGVkU3RhY2tMb2dpY2FsSWQsXG4gICAgICB1bmRlZmluZWQsXG4gICAgICBpc0ltcG9ydCxcbiAgICAgIHN0cmVhbSxcbiAgICAgIG5lc3RlZFN0YWNrLm5lc3RlZFN0YWNrVGVtcGxhdGVzLFxuICAgICk7XG4gIH1cblxuICByZXR1cm4gc3RhY2tEaWZmQ291bnQ7XG59XG5cbmV4cG9ydCBlbnVtIFJlcXVpcmVBcHByb3ZhbCB7XG4gIE5ldmVyID0gJ25ldmVyJyxcblxuICBBbnlDaGFuZ2UgPSAnYW55LWNoYW5nZScsXG5cbiAgQnJvYWRlbmluZyA9ICdicm9hZGVuaW5nJyxcbn1cblxuLyoqXG4gKiBQcmludCB0aGUgc2VjdXJpdHkgY2hhbmdlcyBvZiB0aGlzIGRpZmYsIGlmIHRoZSBjaGFuZ2UgaXMgaW1wYWN0ZnVsIGVub3VnaCBhY2NvcmRpbmcgdG8gdGhlIGFwcHJvdmFsIGxldmVsXG4gKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBjaGFuZ2VzIGFyZSBwcm9tcHQtd29ydGh5LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmludFNlY3VyaXR5RGlmZihcbiAgb2xkVGVtcGxhdGU6IGFueSxcbiAgbmV3VGVtcGxhdGU6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdCxcbiAgcmVxdWlyZUFwcHJvdmFsOiBSZXF1aXJlQXBwcm92YWwsXG4gIF9xdWlldD86IGJvb2xlYW4sXG4gIHN0YWNrTmFtZT86IHN0cmluZyxcbiAgY2hhbmdlU2V0PzogRGVzY3JpYmVDaGFuZ2VTZXRPdXRwdXQsXG4gIHN0cmVhbTogRm9ybWF0U3RyZWFtID0gcHJvY2Vzcy5zdGRlcnIsXG4pOiBib29sZWFuIHtcbiAgY29uc3QgZGlmZiA9IGZ1bGxEaWZmKG9sZFRlbXBsYXRlLCBuZXdUZW1wbGF0ZS50ZW1wbGF0ZSwgY2hhbmdlU2V0KTtcblxuICBpZiAoZGlmZlJlcXVpcmVzQXBwcm92YWwoZGlmZiwgcmVxdWlyZUFwcHJvdmFsKSkge1xuICAgIHN0cmVhbS53cml0ZShmb3JtYXQoJ1N0YWNrICVzXFxuJywgY2hhbGsuYm9sZChzdGFja05hbWUpKSk7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIHdhcm5pbmcoYFRoaXMgZGVwbG95bWVudCB3aWxsIG1ha2UgcG90ZW50aWFsbHkgc2Vuc2l0aXZlIGNoYW5nZXMgYWNjb3JkaW5nIHRvIHlvdXIgY3VycmVudCBzZWN1cml0eSBhcHByb3ZhbCBsZXZlbCAoLS1yZXF1aXJlLWFwcHJvdmFsICR7cmVxdWlyZUFwcHJvdmFsfSkuYCk7XG4gICAgd2FybmluZygnUGxlYXNlIGNvbmZpcm0geW91IGludGVuZCB0byBtYWtlIHRoZSBmb2xsb3dpbmcgbW9kaWZpY2F0aW9uczpcXG4nKTtcblxuICAgIGZvcm1hdFNlY3VyaXR5Q2hhbmdlcyhwcm9jZXNzLnN0ZG91dCwgZGlmZiwgYnVpbGRMb2dpY2FsVG9QYXRoTWFwKG5ld1RlbXBsYXRlKSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFJldHVybiB3aGV0aGVyIHRoZSBkaWZmIGhhcyBzZWN1cml0eS1pbXBhY3RpbmcgY2hhbmdlcyB0aGF0IG5lZWQgY29uZmlybWF0aW9uXG4gKlxuICogVE9ETzogRmlsdGVyIHRoZSBzZWN1cml0eSBpbXBhY3QgZGV0ZXJtaW5hdGlvbiBiYXNlZCBvZmYgb2YgYW4gZW51bSB0aGF0IGFsbG93c1xuICogdXMgdG8gcGljayBtaW5pbXVtIFwic2V2ZXJpdGllc1wiIHRvIGFsZXJ0IG9uLlxuICovXG5mdW5jdGlvbiBkaWZmUmVxdWlyZXNBcHByb3ZhbChkaWZmOiBUZW1wbGF0ZURpZmYsIHJlcXVpcmVBcHByb3ZhbDogUmVxdWlyZUFwcHJvdmFsKSB7XG4gIHN3aXRjaCAocmVxdWlyZUFwcHJvdmFsKSB7XG4gICAgY2FzZSBSZXF1aXJlQXBwcm92YWwuTmV2ZXI6IHJldHVybiBmYWxzZTtcbiAgICBjYXNlIFJlcXVpcmVBcHByb3ZhbC5BbnlDaGFuZ2U6IHJldHVybiBkaWZmLnBlcm1pc3Npb25zQW55Q2hhbmdlcztcbiAgICBjYXNlIFJlcXVpcmVBcHByb3ZhbC5Ccm9hZGVuaW5nOiByZXR1cm4gZGlmZi5wZXJtaXNzaW9uc0Jyb2FkZW5lZDtcbiAgICBkZWZhdWx0OiB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBVbnJlY29nbml6ZWQgYXBwcm92YWwgbGV2ZWw6ICR7cmVxdWlyZUFwcHJvdmFsfWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkTG9naWNhbFRvUGF0aE1hcChzdGFjazogY3hhcGkuQ2xvdWRGb3JtYXRpb25TdGFja0FydGlmYWN0KSB7XG4gIGNvbnN0IG1hcDogeyBbaWQ6IHN0cmluZ106IHN0cmluZyB9ID0ge307XG4gIGZvciAoY29uc3QgbWQgb2Ygc3RhY2suZmluZE1ldGFkYXRhQnlUeXBlKGN4c2NoZW1hLkFydGlmYWN0TWV0YWRhdGFFbnRyeVR5cGUuTE9HSUNBTF9JRCkpIHtcbiAgICBtYXBbbWQuZGF0YSBhcyBzdHJpbmddID0gbWQucGF0aDtcbiAgfVxuICByZXR1cm4gbWFwO1xufVxuXG5mdW5jdGlvbiBsb2dpY2FsSWRNYXBGcm9tVGVtcGxhdGUodGVtcGxhdGU6IGFueSkge1xuICBjb25zdCByZXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtsb2dpY2FsSWQsIHJlc291cmNlXSBvZiBPYmplY3QuZW50cmllcyh0ZW1wbGF0ZS5SZXNvdXJjZXMgPz8ge30pKSB7XG4gICAgY29uc3QgcGF0aCA9IChyZXNvdXJjZSBhcyBhbnkpPy5NZXRhZGF0YT8uWydhd3M6Y2RrOnBhdGgnXTtcbiAgICBpZiAocGF0aCkge1xuICAgICAgcmV0W2xvZ2ljYWxJZF0gPSBwYXRoO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIFJlbW92ZSBhbnkgdGVtcGxhdGUgZWxlbWVudHMgdGhhdCB3ZSBkb24ndCB3YW50IHRvIHNob3cgdXNlcnMuXG4gKiBUaGlzIGlzIGN1cnJlbnRseTpcbiAqIC0gQVdTOjpDREs6Ok1ldGFkYXRhIHJlc291cmNlXG4gKiAtIENoZWNrQm9vdHN0cmFwVmVyc2lvbiBSdWxlXG4gKi9cbmZ1bmN0aW9uIG9ic2N1cmVEaWZmKGRpZmY6IFRlbXBsYXRlRGlmZikge1xuICBpZiAoZGlmZi51bmtub3duKSB7XG4gICAgLy8gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMTc5NDJcbiAgICBkaWZmLnVua25vd24gPSBkaWZmLnVua25vd24uZmlsdGVyKGNoYW5nZSA9PiB7XG4gICAgICBpZiAoIWNoYW5nZSkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgaWYgKGNoYW5nZS5uZXdWYWx1ZT8uQ2hlY2tCb290c3RyYXBWZXJzaW9uKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgaWYgKGNoYW5nZS5vbGRWYWx1ZT8uQ2hlY2tCb290c3RyYXBWZXJzaW9uKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH1cblxuICBpZiAoZGlmZi5yZXNvdXJjZXMpIHtcbiAgICBkaWZmLnJlc291cmNlcyA9IGRpZmYucmVzb3VyY2VzLmZpbHRlcihjaGFuZ2UgPT4ge1xuICAgICAgaWYgKCFjaGFuZ2UpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgIGlmIChjaGFuZ2UubmV3UmVzb3VyY2VUeXBlID09PSAnQVdTOjpDREs6Ok1ldGFkYXRhJykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIGlmIChjaGFuZ2Uub2xkUmVzb3VyY2VUeXBlID09PSAnQVdTOjpDREs6Ok1ldGFkYXRhJykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9XG59XG4iXX0=