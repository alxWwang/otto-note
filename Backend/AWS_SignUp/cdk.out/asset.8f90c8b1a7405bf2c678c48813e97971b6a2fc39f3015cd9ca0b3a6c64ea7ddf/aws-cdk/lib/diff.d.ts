import { type DescribeChangeSetOutput, type FormatStream } from '@aws-cdk/cloudformation-diff';
import * as cxapi from '@aws-cdk/cx-api';
import { NestedStackTemplates } from './api/nested-stack-helpers';
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
export declare function printStackDiff(oldTemplate: any, newTemplate: cxapi.CloudFormationStackArtifact, strict: boolean, context: number, quiet: boolean, stackName?: string, changeSet?: DescribeChangeSetOutput, isImport?: boolean, stream?: FormatStream, nestedStackTemplates?: {
    [nestedStackLogicalId: string]: NestedStackTemplates;
}): number;
export declare enum RequireApproval {
    Never = "never",
    AnyChange = "any-change",
    Broadening = "broadening"
}
/**
 * Print the security changes of this diff, if the change is impactful enough according to the approval level
 *
 * Returns true if the changes are prompt-worthy, false otherwise.
 */
export declare function printSecurityDiff(oldTemplate: any, newTemplate: cxapi.CloudFormationStackArtifact, requireApproval: RequireApproval, _quiet?: boolean, stackName?: string, changeSet?: DescribeChangeSetOutput, stream?: FormatStream): boolean;
