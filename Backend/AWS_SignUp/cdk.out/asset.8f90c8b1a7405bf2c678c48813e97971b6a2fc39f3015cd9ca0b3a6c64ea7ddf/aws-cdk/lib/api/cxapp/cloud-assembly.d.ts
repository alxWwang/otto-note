import * as cxapi from '@aws-cdk/cx-api';
export declare enum DefaultSelection {
    /**
     * Returns an empty selection in case there are no selectors.
     */
    None = "none",
    /**
     * If the app includes a single stack, returns it. Otherwise throws an exception.
     * This behavior is used by "deploy".
     */
    OnlySingle = "single",
    /**
     * Returns all stacks in the main (top level) assembly only.
     */
    MainAssembly = "main",
    /**
     * If no selectors are provided, returns all stacks in the app,
     * including stacks inside nested assemblies.
     */
    AllStacks = "all"
}
export interface SelectStacksOptions {
    /**
     * Extend the selection to upstread/downstream stacks
     * @default ExtendedStackSelection.None only select the specified stacks.
     */
    extend?: ExtendedStackSelection;
    /**
     * The behavior if no selectors are provided.
     */
    defaultBehavior: DefaultSelection;
    /**
     * Whether to deploy if the app contains no stacks.
     *
     * @default false
     */
    ignoreNoStacks?: boolean;
}
/**
 * When selecting stacks, what other stacks to include because of dependencies
 */
export declare enum ExtendedStackSelection {
    /**
     * Don't select any extra stacks
     */
    None = 0,
    /**
     * Include stacks that this stack depends on
     */
    Upstream = 1,
    /**
     * Include stacks that depend on this stack
     */
    Downstream = 2
}
/**
 * A specification of which stacks should be selected
 */
export interface StackSelector {
    /**
     * Whether all stacks at the top level assembly should
     * be selected and nothing else
     */
    allTopLevel?: boolean;
    /**
     * A list of patterns to match the stack hierarchical ids
     */
    patterns: string[];
}
/**
 * A single Cloud Assembly and the operations we do on it to deploy the artifacts inside
 */
export declare class CloudAssembly {
    readonly assembly: cxapi.CloudAssembly;
    /**
     * The directory this CloudAssembly was read from
     */
    readonly directory: string;
    constructor(assembly: cxapi.CloudAssembly);
    selectStacks(selector: StackSelector, options: SelectStacksOptions): Promise<StackCollection>;
    private selectTopLevelStacks;
    private selectMatchingStacks;
    private selectDefaultStacks;
    private extendStacks;
    /**
     * Select a single stack by its ID
     */
    stackById(stackId: string): StackCollection;
}
/**
 * A collection of stacks and related artifacts
 *
 * In practice, not all artifacts in the CloudAssembly are created equal;
 * stacks can be selected independently, but other artifacts such as asset
 * bundles cannot.
 */
export declare class StackCollection {
    readonly assembly: CloudAssembly;
    readonly stackArtifacts: cxapi.CloudFormationStackArtifact[];
    constructor(assembly: CloudAssembly, stackArtifacts: cxapi.CloudFormationStackArtifact[]);
    get stackCount(): number;
    get firstStack(): cxapi.CloudFormationStackArtifact;
    get stackIds(): string[];
    reversed(): StackCollection;
    filter(predicate: (art: cxapi.CloudFormationStackArtifact) => boolean): StackCollection;
    concat(other: StackCollection): StackCollection;
    /**
     * Extracts 'aws:cdk:warning|info|error' metadata entries from the stack synthesis
     */
    processMetadataMessages(options?: MetadataMessageOptions): void;
}
export interface MetadataMessageOptions {
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
}
