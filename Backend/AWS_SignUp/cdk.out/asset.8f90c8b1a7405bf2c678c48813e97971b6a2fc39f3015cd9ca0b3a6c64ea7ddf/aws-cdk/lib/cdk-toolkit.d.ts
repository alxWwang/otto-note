import { DeploymentMethod } from './api';
import { SdkProvider } from './api/aws-auth';
import { BootstrapEnvironmentOptions } from './api/bootstrap';
import { CloudAssembly, StackSelector } from './api/cxapp/cloud-assembly';
import { CloudExecutable } from './api/cxapp/cloud-executable';
import { Deployments } from './api/deployments';
import { HotswapMode } from './api/hotswap/common';
import { CloudWatchLogEventMonitor } from './api/logs/logs-monitor';
import { StackActivityProgress } from './api/util/cloudformation/stack-activity-monitor';
import { FromScan } from './commands/migrate';
import { RequireApproval } from './diff';
import { Configuration } from './settings';
export declare function markTesting(): void;
export interface CdkToolkitProps {
    /**
     * The Cloud Executable
     */
    cloudExecutable: CloudExecutable;
    /**
     * The provisioning engine used to apply changes to the cloud
     */
    deployments: Deployments;
    /**
     * Whether to be verbose
     *
     * @default false
     */
    verbose?: boolean;
    /**
     * Don't stop on error metadata
     *
     * @default false
     */
    ignoreErrors?: boolean;
    /**
     * Treat warnings in metadata as errors
     *
     * @default false
     */
    strict?: boolean;
    /**
     * Application configuration (settings and context)
     */
    configuration: Configuration;
    /**
     * AWS object (used by synthesizer and contextprovider)
     */
    sdkProvider: SdkProvider;
}
/**
 * When to build assets
 */
export declare enum AssetBuildTime {
    /**
     * Build all assets before deploying the first stack
     *
     * This is intended for expensive Docker image builds; so that if the Docker image build
     * fails, no stacks are unnecessarily deployed (with the attendant wait time).
     */
    ALL_BEFORE_DEPLOY = 0,
    /**
     * Build assets just-in-time, before publishing
     */
    JUST_IN_TIME = 1
}
/**
 * Toolkit logic
 *
 * The toolkit runs the `cloudExecutable` to obtain a cloud assembly and
 * deploys applies them to `cloudFormation`.
 */
export declare class CdkToolkit {
    private readonly props;
    constructor(props: CdkToolkitProps);
    metadata(stackName: string, json: boolean): Promise<void>;
    acknowledge(noticeId: string): Promise<void>;
    diff(options: DiffOptions): Promise<number>;
    deploy(options: DeployOptions): Promise<void>;
    /**
     * Roll back the given stack or stacks.
     */
    rollback(options: RollbackOptions): Promise<void>;
    watch(options: WatchOptions): Promise<void>;
    import(options: ImportOptions): Promise<void>;
    destroy(options: DestroyOptions): Promise<void>;
    list(selectors: string[], options?: {
        long?: boolean;
        json?: boolean;
        showDeps?: boolean;
    }): Promise<number>;
    /**
     * Synthesize the given set of stacks (called when the user runs 'cdk synth')
     *
     * INPUT: Stack names can be supplied using a glob filter. If no stacks are
     * given, all stacks from the application are implicitly selected.
     *
     * OUTPUT: If more than one stack ends up being selected, an output directory
     * should be supplied, where the templates will be written.
     */
    synth(stackNames: string[], exclusively: boolean, quiet: boolean, autoValidate?: boolean, json?: boolean): Promise<any>;
    /**
     * Bootstrap the CDK Toolkit stack in the accounts used by the specified stack(s).
     *
     * @param userEnvironmentSpecs environment names that need to have toolkit support
     *             provisioned, as a glob filter. If none is provided, all stacks are implicitly selected.
     * @param options The name, role ARN, bootstrapping parameters, etc. to be used for the CDK Toolkit stack.
     */
    bootstrap(userEnvironmentSpecs: string[], options: BootstrapEnvironmentOptions): Promise<void>;
    /**
     * Garbage collects assets from a CDK app's environment
     * @param options Options for Garbage Collection
     */
    garbageCollect(userEnvironmentSpecs: string[], options: GarbageCollectionOptions): Promise<void>;
    private defineEnvironments;
    /**
     * Migrates a CloudFormation stack/template to a CDK app
     * @param options Options for CDK app creation
     */
    migrate(options: MigrateOptions): Promise<void>;
    private selectStacksForList;
    private selectStacksForDeploy;
    private selectStacksForDiff;
    private selectStacksForDestroy;
    /**
     * Validate the stacks for errors and warnings according to the CLI's current settings
     */
    private validateStacks;
    /**
     * Validate that if a user specified a stack name there exists at least 1 stack selected
     */
    private validateStacksSelected;
    /**
     * Select a single stack by its name
     */
    private selectSingleStackByName;
    assembly(cacheCloudAssembly?: boolean): Promise<CloudAssembly>;
    private patternsArrayForWatch;
    private invokeDeployFromWatch;
    /**
     * Remove the asset publishing and building from the work graph for assets that are already in place
     */
    private removePublishedAssets;
    /**
     * Checks to see if a migrate.json file exists. If it does and the source is either `filepath` or
     * is in the same environment as the stack deployment, a new stack is created and the resources are
     * migrated to the stack using an IMPORT changeset. The normal deployment will resume after this is complete
     * to add back in any outputs and the CDKMetadata.
     */
    private tryMigrateResources;
    /**
     * Creates a new stack with just the resources to be migrated
     */
    private performResourceMigration;
    private tryGetResources;
}
export interface DiffOptions {
    /**
     * Stack names to diff
     */
    stackNames: string[];
    /**
     * Name of the toolkit stack, if not the default name
     *
     * @default 'CDKToolkit'
     */
    readonly toolkitStackName?: string;
    /**
     * Only select the given stack
     *
     * @default false
     */
    exclusively?: boolean;
    /**
     * Used a template from disk instead of from the server
     *
     * @default Use from the server
     */
    templatePath?: string;
    /**
     * Strict diff mode
     *
     * @default false
     */
    strict?: boolean;
    /**
     * How many lines of context to show in the diff
     *
     * @default 3
     */
    contextLines?: number;
    /**
     * Where to write the default
     *
     * @default stderr
     */
    stream?: NodeJS.WritableStream;
    /**
     * Whether to fail with exit code 1 in case of diff
     *
     * @default false
     */
    fail?: boolean;
    /**
     * Only run diff on broadened security changes
     *
     * @default false
     */
    securityOnly?: boolean;
    /**
     * Whether to run the diff against the template after the CloudFormation Transforms inside it have been executed
     * (as opposed to the original template, the default, which contains the unprocessed Transforms).
     *
     * @default false
     */
    compareAgainstProcessedTemplate?: boolean;
    quiet?: boolean;
    /**
     * Additional parameters for CloudFormation at diff time, used to create a change set
     * @default {}
     */
    parameters?: {
        [name: string]: string | undefined;
    };
    /**
     * Whether or not to create, analyze, and subsequently delete a changeset
     *
     * @default true
     */
    changeSet?: boolean;
}
interface CfnDeployOptions {
    /**
     * Criteria for selecting stacks to deploy
     */
    selector: StackSelector;
    /**
     * Name of the toolkit stack to use/deploy
     *
     * @default CDKToolkit
     */
    toolkitStackName?: string;
    /**
     * Role to pass to CloudFormation for deployment
     */
    roleArn?: string;
    /**
     * Optional name to use for the CloudFormation change set.
     * If not provided, a name will be generated automatically.
     *
     * @deprecated Use 'deploymentMethod' instead
     */
    changeSetName?: string;
    /**
     * Whether to execute the ChangeSet
     * Not providing `execute` parameter will result in execution of ChangeSet
     *
     * @default true
     * @deprecated Use 'deploymentMethod' instead
     */
    execute?: boolean;
    /**
     * Deployment method
     */
    readonly deploymentMethod?: DeploymentMethod;
    /**
     * Display mode for stack deployment progress.
     *
     * @default - StackActivityProgress.Bar - stack events will be displayed for
     *   the resource currently being deployed.
     */
    progress?: StackActivityProgress;
    /**
     * Rollback failed deployments
     *
     * @default true
     */
    readonly rollback?: boolean;
}
interface WatchOptions extends Omit<CfnDeployOptions, 'execute'> {
    /**
     * Only select the given stack
     *
     * @default false
     */
    exclusively?: boolean;
    /**
     * Reuse the assets with the given asset IDs
     */
    reuseAssets?: string[];
    /**
     * Always deploy, even if templates are identical.
     * @default false
     */
    force?: boolean;
    /**
     * Whether to perform a 'hotswap' deployment.
     * A 'hotswap' deployment will attempt to short-circuit CloudFormation
     * and update the affected resources like Lambda functions directly.
     *
     * @default - `HotswapMode.FALL_BACK` for regular deployments, `HotswapMode.HOTSWAP_ONLY` for 'watch' deployments
     */
    readonly hotswap: HotswapMode;
    /**
     * The extra string to append to the User-Agent header when performing AWS SDK calls.
     *
     * @default - nothing extra is appended to the User-Agent header
     */
    readonly extraUserAgent?: string;
    /**
     * Whether to show CloudWatch logs for hotswapped resources
     * locally in the users terminal
     *
     * @default - false
     */
    readonly traceLogs?: boolean;
    /**
     * Maximum number of simultaneous deployments (dependency permitting) to execute.
     * The default is '1', which executes all deployments serially.
     *
     * @default 1
     */
    readonly concurrency?: number;
}
export interface DeployOptions extends CfnDeployOptions, WatchOptions {
    /**
     * ARNs of SNS topics that CloudFormation will notify with stack related events
     */
    notificationArns?: string[];
    /**
     * What kind of security changes require approval
     *
     * @default RequireApproval.Broadening
     */
    requireApproval?: RequireApproval;
    /**
     * Tags to pass to CloudFormation for deployment
     */
    tags?: Tag[];
    /**
     * Additional parameters for CloudFormation at deploy time
     * @default {}
     */
    parameters?: {
        [name: string]: string | undefined;
    };
    /**
     * Use previous values for unspecified parameters
     *
     * If not set, all parameters must be specified for every deployment.
     *
     * @default true
     */
    usePreviousParameters?: boolean;
    /**
     * Path to file where stack outputs will be written after a successful deploy as JSON
     * @default - Outputs are not written to any file
     */
    outputsFile?: string;
    /**
     * Whether we are on a CI system
     *
     * @default false
     */
    readonly ci?: boolean;
    /**
     * Whether this 'deploy' command should actually delegate to the 'watch' command.
     *
     * @default false
     */
    readonly watch?: boolean;
    /**
     * Whether we should cache the Cloud Assembly after the first time it has been synthesized.
     * The default is 'true', we only don't want to do it in case the deployment is triggered by
     * 'cdk watch'.
     *
     * @default true
     */
    readonly cacheCloudAssembly?: boolean;
    /**
     * Allows adding CloudWatch log groups to the log monitor via
     * cloudWatchLogMonitor.setLogGroups();
     *
     * @default - not monitoring CloudWatch logs
     */
    readonly cloudWatchLogMonitor?: CloudWatchLogEventMonitor;
    /**
     * Maximum number of simultaneous deployments (dependency permitting) to execute.
     * The default is '1', which executes all deployments serially.
     *
     * @default 1
     */
    readonly concurrency?: number;
    /**
     * Build/publish assets for a single stack in parallel
     *
     * Independent of whether stacks are being done in parallel or no.
     *
     * @default true
     */
    readonly assetParallelism?: boolean;
    /**
     * When to build assets
     *
     * The default is the Docker-friendly default.
     *
     * @default AssetBuildTime.ALL_BEFORE_DEPLOY
     */
    readonly assetBuildTime?: AssetBuildTime;
    /**
     * Whether to deploy if the app contains no stacks.
     *
     * @default false
     */
    readonly ignoreNoStacks?: boolean;
}
export interface RollbackOptions {
    /**
     * Criteria for selecting stacks to deploy
     */
    readonly selector: StackSelector;
    /**
     * Name of the toolkit stack to use/deploy
     *
     * @default CDKToolkit
     */
    readonly toolkitStackName?: string;
    /**
     * Role to pass to CloudFormation for deployment
     *
     * @default - Default stack role
     */
    readonly roleArn?: string;
    /**
     * Whether to force the rollback or not
     *
     * @default false
     */
    readonly force?: boolean;
    /**
     * Logical IDs of resources to orphan
     *
     * @default - No orphaning
     */
    readonly orphanLogicalIds?: string[];
    /**
     * Whether to validate the version of the bootstrap stack permissions
     *
     * @default true
     */
    readonly validateBootstrapStackVersion?: boolean;
}
export interface ImportOptions extends CfnDeployOptions {
    /**
     * Build a physical resource mapping and write it to the given file, without performing the actual import operation
     *
     * @default - No file
     */
    readonly recordResourceMapping?: string;
    /**
     * Path to a file with the physical resource mapping to CDK constructs in JSON format
     *
     * @default - No mapping file
     */
    readonly resourceMappingFile?: string;
    /**
     * Allow non-addition changes to the template
     *
     * @default false
     */
    readonly force?: boolean;
}
export interface DestroyOptions {
    /**
     * Criteria for selecting stacks to deploy
     */
    selector: StackSelector;
    /**
     * Whether to exclude stacks that depend on the stacks to be deleted
     */
    exclusively: boolean;
    /**
     * Whether to skip prompting for confirmation
     */
    force: boolean;
    /**
     * The arn of the IAM role to use
     */
    roleArn?: string;
    /**
     * Whether the destroy request came from a deploy.
     */
    fromDeploy?: boolean;
    /**
     * Whether we are on a CI system
     *
     * @default false
     */
    readonly ci?: boolean;
}
/**
 * Options for the garbage collection
 */
export interface GarbageCollectionOptions {
    /**
     * The action to perform.
     *
     * @default 'full'
     */
    readonly action: 'print' | 'tag' | 'delete-tagged' | 'full';
    /**
     * The type of the assets to be garbage collected.
     *
     * @default 'all'
     */
    readonly type: 's3' | 'ecr' | 'all';
    /**
     * Elapsed time between an asset being marked as isolated and actually deleted.
     *
     * @default 0
     */
    readonly rollbackBufferDays: number;
    /**
     * Refuse deletion of any assets younger than this number of days.
     */
    readonly createdBufferDays: number;
    /**
     * The stack name of the bootstrap stack.
     *
     * @default DEFAULT_TOOLKIT_STACK_NAME
     */
    readonly bootstrapStackName?: string;
    /**
     * Skips the prompt before actual deletion begins
     *
     * @default false
     */
    readonly confirm?: boolean;
}
export interface MigrateOptions {
    /**
     * The name assigned to the generated stack. This is also used to get
     * the stack from the user's account if `--from-stack` is used.
     */
    readonly stackName: string;
    /**
     * The target language for the generated the CDK app.
     *
     * @default typescript
     */
    readonly language?: string;
    /**
     * The local path of the template used to generate the CDK app.
     *
     * @default - Local path is not used for the template source.
     */
    readonly fromPath?: string;
    /**
     * Whether to get the template from an existing CloudFormation stack.
     *
     * @default false
     */
    readonly fromStack?: boolean;
    /**
     * The output path at which to create the CDK app.
     *
     * @default - The current directory
     */
    readonly outputPath?: string;
    /**
     * The account from which to retrieve the template of the CloudFormation stack.
     *
     * @default - Uses the account for the credentials in use by the user.
     */
    readonly account?: string;
    /**
     * The region from which to retrieve the template of the CloudFormation stack.
     *
     * @default - Uses the default region for the credentials in use by the user.
     */
    readonly region?: string;
    /**
     * Filtering criteria used to select the resources to be included in the generated CDK app.
     *
     * @default - Include all resources
     */
    readonly filter?: string[];
    /**
     * Whether to initiate a new account scan for generating the CDK app.
     *
     * @default false
     */
    readonly fromScan?: FromScan;
    /**
     * Whether to zip the generated cdk app folder.
     *
     * @default false
     */
    readonly compress?: boolean;
}
export interface Tag {
    readonly Key: string;
    readonly Value: string;
}
export {};
