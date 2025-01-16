import { Environment } from '@aws-cdk/cx-api';
import type { DescribeGeneratedTemplateCommandOutput, DescribeResourceScanCommandOutput, GetGeneratedTemplateCommandOutput, ResourceDefinition, ResourceDetail, ResourceIdentifierSummary, ResourceScanSummary, ScannedResource, ScannedResourceIdentifier } from '@aws-sdk/client-cloudformation';
import type { ICloudFormationClient, SdkProvider } from '../api/aws-auth';
/** The list of languages supported by the built-in noctilucent binary. */
export declare const MIGRATE_SUPPORTED_LANGUAGES: readonly string[];
/**
 * Generates a CDK app from a yaml or json template.
 *
 * @param stackName The name to assign to the stack in the generated app
 * @param stack The yaml or json template for the stack
 * @param language The language to generate the CDK app in
 * @param outputPath The path at which to generate the CDK app
 */
export declare function generateCdkApp(stackName: string, stack: string, language: string, outputPath?: string, compress?: boolean): Promise<void>;
/**
 * Generates a CDK stack file.
 * @param template The template to translate into a CDK stack
 * @param stackName The name to assign to the stack
 * @param language The language to generate the stack in
 * @returns A string representation of a CDK stack file
 */
export declare function generateStack(template: string, stackName: string, language: string): string;
/**
 * Reads and returns a stack template from a local path.
 *
 * @param inputPath The location of the template
 * @returns A string representation of the template if present, otherwise undefined
 */
export declare function readFromPath(inputPath: string): string;
/**
 * Reads and returns a stack template from a deployed CloudFormation stack.
 *
 * @param stackName The name of the stack
 * @param sdkProvider The sdk provider for making CloudFormation calls
 * @param environment The account and region where the stack is deployed
 * @returns A string representation of the template if present, otherwise undefined
 */
export declare function readFromStack(stackName: string, sdkProvider: SdkProvider, environment: Environment): Promise<string | undefined>;
/**
 * Takes in a stack name and account and region and returns a generated cloudformation template using the cloudformation
 * template generator.
 *
 * @param GenerateTemplateOptions An object containing the stack name, filters, sdkProvider, environment, and newScan flag
 * @returns a generated cloudformation template
 */
export declare function generateTemplate(options: GenerateTemplateOptions): Promise<GenerateTemplateOutput>;
/**
 * Takes a list of any type and breaks it up into chunks of a specified size.
 *
 * @param list The list to break up
 * @param chunkSize The size of each chunk
 * @returns A list of lists of the specified size
 */
export declare function chunks(list: any[], chunkSize: number): any[][];
/**
 * Sets the account and region for making CloudFormation calls.
 * @param account The account to use
 * @param region The region to use
 * @returns The environment object
 */
export declare function setEnvironment(account?: string, region?: string): Environment;
/**
 * Enum for the source options for the template
 */
export declare enum TemplateSourceOptions {
    PATH = "path",
    STACK = "stack",
    SCAN = "scan"
}
/**
 * An object representing the source of a template.
 */
type TemplateSource = {
    source: TemplateSourceOptions.SCAN;
} | {
    source: TemplateSourceOptions.PATH;
    templatePath: string;
} | {
    source: TemplateSourceOptions.STACK;
    stackName: string;
};
/**
 * Enum for the status of a resource scan
 */
export declare enum ScanStatus {
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETE = "COMPLETE",
    FAILED = "FAILED"
}
export declare enum FilterType {
    RESOURCE_IDENTIFIER = "resource-identifier",
    RESOURCE_TYPE_PREFIX = "resource-type-prefix",
    TAG_KEY = "tag-key",
    TAG_VALUE = "tag-value"
}
/**
 * Validates that exactly one source option has been provided.
 * @param fromPath The content of the flag `--from-path`
 * @param fromStack the content of the flag `--from-stack`
 */
export declare function parseSourceOptions(fromPath?: string, fromStack?: boolean, stackName?: string): TemplateSource;
/**
 * Takes a scan id and maintains a progress bar to display the progress of a scan to the user.
 *
 * @param scanId A string representing the scan id
 * @param cloudFormation The CloudFormation sdk client to use
 */
export declare function scanProgressBar(scanId: string, cfn: CfnTemplateGeneratorProvider): Promise<void>;
/**
 * Prints a progress bar to the console. To be used in a while loop to show progress of a long running task.
 * The progress bar deletes the current line on the console and rewrites it with the progress amount.
 *
 * @param width The width of the progress bar
 * @param progress The current progress to display as a percentage of 100
 */
export declare function printBar(width: number, progress: number): void;
/**
 * Prints a message to the console with a series periods appended to it. To be used in a while loop to show progress of a long running task.
 * The message deletes the current line and rewrites it several times to display 1-3 periods to show the user that the task is still running.
 *
 * @param message The message to display
 * @param timeoutx4 The amount of time to wait before printing the next period
 */
export declare function printDots(message: string, timeoutx4: number): Promise<void>;
/**
 * Rewrites the current line on the console and writes a new message to it.
 * This is a helper funciton for printDots and printBar.
 *
 * @param message The message to display
 */
export declare function rewriteLine(message: string): void;
/**
 * Prints the time difference between two dates in days, hours, and minutes.
 *
 * @param time1 The first date to compare
 * @param time2 The second date to compare
 */
export declare function displayTimeDiff(time1: Date, time2: Date): void;
/**
 * Writes a migrate.json file to the output directory.
 *
 * @param outputPath The path to write the migrate.json file to
 * @param stackName The name of the stack
 * @param generatedOutput The output of the template generator
 */
export declare function writeMigrateJsonFile(outputPath: string | undefined, stackName: string, migrateJson: MigrateJsonFormat): void;
/**
 * Takes a string representing the from-scan flag and returns a FromScan enum value.
 *
 * @param scanType A string representing the from-scan flag
 * @returns A FromScan enum value
 */
export declare function getMigrateScanType(scanType: string): FromScan;
/**
 * Takes a generatedTemplateOutput objct and returns a boolean representing whether there are any warnings on any rescources.
 *
 * @param generatedTemplateOutput A GenerateTemplateOutput object
 * @returns A boolean representing whether there are any warnings on any rescources
 */
export declare function isThereAWarning(generatedTemplateOutput: GenerateTemplateOutput): boolean;
/**
 * Builds the GenerateTemplateOutput object from the DescribeGeneratedTemplateOutput and the template body.
 *
 * @param generatedTemplateSummary The output of the describe generated template call
 * @param templateBody The body of the generated template
 * @returns A GenerateTemplateOutput object
 */
export declare function buildGenertedTemplateOutput(generatedTemplateSummary: DescribeGeneratedTemplateCommandOutput, templateBody: string, source: string): GenerateTemplateOutput;
/**
 * Builds a CloudFormation sdk client for making requests with the CFN template generator.
 *
 * @param sdkProvider The sdk provider for making CloudFormation calls
 * @param environment The account and region where the stack is deployed
 * @returns A CloudFormation sdk client
 */
export declare function buildCfnClient(sdkProvider: SdkProvider, environment: Environment): Promise<ICloudFormationClient>;
/**
 * Appends a list of warnings to a readme file.
 *
 * @param filepath The path to the readme file
 * @param resources A list of resources to append warnings for
 */
export declare function appendWarningsToReadme(filepath: string, resources: ResourceDetail[]): void;
/**
 * Class for making CloudFormation template generator calls
 */
export declare class CfnTemplateGeneratorProvider {
    private cfn;
    constructor(cfn: ICloudFormationClient);
    checkForResourceScan(resourceScanSummaries: ResourceScanSummary[] | undefined, options: GenerateTemplateOptions, clientRequestToken: string): Promise<void>;
    /**
     * Retrieves a tokenized list of resources and their associated scan. If a token is present the function
     * will loop through all pages and combine them into a single list of ScannedRelatedResources
     *
     * @param scanId scan id for the to list resources for
     * @param resources A list of resources to find related resources for
     */
    getResourceScanRelatedResources(scanId: string, resources: ScannedResource[]): Promise<ScannedResourceIdentifier[]>;
    /**
     * Kicks off a scan of a customers account, returning the scan id. A scan can take
     * 10 minutes or longer to complete. However this will return a scan id as soon as
     * the scan has begun.
     *
     * @returns A string representing the scan id
     */
    startResourceScan(requestToken: string): Promise<string | undefined>;
    /**
     * Gets the most recent scans a customer has completed
     *
     * @returns a list of resource scan summaries
     */
    listResourceScans(): Promise<import("@aws-sdk/client-cloudformation").ListResourceScansCommandOutput>;
    /**
     * Retrieves a tokenized list of resources from a resource scan. If a token is present, this function
     * will loop through all pages and combine them into a single list of ScannedResource[].
     * Additionally will apply any filters provided by the customer.
     *
     * @param scanId scan id for the to list resources for
     * @param filters a string of filters in the format of key1=value1,key2=value2
     * @returns a combined list of all resources from the scan
     */
    listResourceScanResources(scanId: string, filters?: string[]): Promise<ScannedResourceIdentifier[]>;
    /**
     * Retrieves information about a resource scan.
     *
     * @param scanId scan id for the to list resources for
     * @returns information about the scan
     */
    describeResourceScan(scanId: string): Promise<DescribeResourceScanCommandOutput>;
    /**
     * Describes the current status of the template being generated.
     *
     * @param templateId A string representing the template id
     * @returns DescribeGeneratedTemplateOutput an object containing the template status and results
     */
    describeGeneratedTemplate(templateId: string): Promise<DescribeGeneratedTemplateCommandOutput>;
    /**
     * Retrieves a completed generated cloudformation template from the template generator.
     *
     * @param templateId A string representing the template id
     * @param cloudFormation The CloudFormation sdk client to use
     * @returns DescribeGeneratedTemplateOutput an object containing the template status and body
     */
    getGeneratedTemplate(templateId: string): Promise<GetGeneratedTemplateCommandOutput>;
    /**
     * Kicks off a template generation for a set of resources.
     *
     * @param stackName The name of the stack
     * @param resources A list of resources to generate the template from
     * @returns CreateGeneratedTemplateOutput an object containing the template arn to query on later
     */
    createGeneratedTemplate(stackName: string, resources: ResourceDefinition[]): Promise<import("@aws-sdk/client-cloudformation").CreateGeneratedTemplateCommandOutput>;
    /**
     * Deletes a generated template from the template generator.
     *
     * @param templateArn The arn of the template to delete
     * @returns A promise that resolves when the template has been deleted
     */
    deleteGeneratedTemplate(templateArn: string): Promise<void>;
}
/**
 * The possible ways to choose a scan to generate a CDK application from
 */
export declare enum FromScan {
    /**
     * Initiate a new resource scan to build the CDK application from.
     */
    NEW = 0,
    /**
     * Use the last successful scan to build the CDK application from. Will fail if no scan is found.
     */
    MOST_RECENT = 1,
    /**
     * Starts a scan if none exists, otherwise uses the most recent successful scan to build the CDK application from.
     */
    DEFAULT = 2
}
/**
 * Interface for the options object passed to the generateTemplate function
 *
 * @param stackName The name of the stack
 * @param filters A list of filters to apply to the scan
 * @param fromScan An enum value specifying whether a new scan should be started or the most recent successful scan should be used
 * @param sdkProvider The sdk provider for making CloudFormation calls
 * @param environment The account and region where the stack is deployed
 */
export interface GenerateTemplateOptions {
    stackName: string;
    filters?: string[];
    fromScan?: FromScan;
    sdkProvider: SdkProvider;
    environment: Environment;
}
/**
 * Interface for the output of the generateTemplate function
 *
 * @param migrateJson The generated Migrate.json file
 * @param resources The generated template
 */
export interface GenerateTemplateOutput {
    migrateJson: MigrateJsonFormat;
    resources?: ResourceDetail[];
    templateId?: string;
}
/**
 * Interface defining the format of the generated Migrate.json file
 *
 * @param TemplateBody The generated template
 * @param Source The source of the template
 * @param Resources A list of resources that were used to generate the template
 */
export interface MigrateJsonFormat {
    templateBody: string;
    source: string;
    resources?: GeneratedResourceImportIdentifier[];
}
/**
 * Interface representing the format of a resource identifier required for resource import
 *
 * @param ResourceType The type of resource
 * @param LogicalResourceId The logical id of the resource
 * @param ResourceIdentifier The resource identifier of the resource
 */
export interface GeneratedResourceImportIdentifier {
    ResourceType: string;
    LogicalResourceId: string;
    ResourceIdentifier: ResourceIdentifierSummary;
}
export {};
