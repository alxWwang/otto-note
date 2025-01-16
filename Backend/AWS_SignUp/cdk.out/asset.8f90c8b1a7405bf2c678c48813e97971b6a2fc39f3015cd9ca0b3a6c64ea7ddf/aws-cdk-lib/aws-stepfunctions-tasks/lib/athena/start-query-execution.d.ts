import { Construct } from 'constructs';
import * as iam from '../../../aws-iam';
import * as kms from '../../../aws-kms';
import * as s3 from '../../../aws-s3';
import * as sfn from '../../../aws-stepfunctions';
import * as cdk from '../../../core';
/**
 * Properties for starting a Query Execution
 */
export interface AthenaStartQueryExecutionProps extends sfn.TaskStateBaseProps {
    /**
     * Query that will be started
     */
    readonly queryString: string;
    /**
     * Unique string string to ensure idempotence
     *
     * @default - No client request token
     */
    readonly clientRequestToken?: string;
    /**
     * Database within which query executes
     *
     * @default - No query execution context
     */
    readonly queryExecutionContext?: QueryExecutionContext;
    /**
     * Configuration on how and where to save query
     *
     * @default - No result configuration
     */
    readonly resultConfiguration?: ResultConfiguration;
    /**
     * Configuration on how and where to save query
     *
     * @default - No work group
     */
    readonly workGroup?: string;
    /**
     * A list of values for the parameters in a query.
     *
     * The values are applied sequentially to the parameters in the query in the order
     * in which the parameters occur.
     *
     * @default - No parameters
     */
    readonly executionParameters?: string[];
    /**
     * Specifies, in minutes, the maximum age of a previous query result that Athena should consider for reuse.
     *
     * @default - Query results are not reused
     */
    readonly resultReuseConfigurationMaxAge?: cdk.Duration;
}
/**
 * Start an Athena Query as a Task
 *
 * @see https://docs.aws.amazon.com/step-functions/latest/dg/connect-athena.html
 */
export declare class AthenaStartQueryExecution extends sfn.TaskStateBase {
    private readonly props;
    private static readonly SUPPORTED_INTEGRATION_PATTERNS;
    protected readonly taskMetrics?: sfn.TaskMetricsConfig;
    protected readonly taskPolicies?: iam.PolicyStatement[];
    private readonly integrationPattern;
    constructor(scope: Construct, id: string, props: AthenaStartQueryExecutionProps);
    private validateExecutionParameters;
    private validateMaxAgeInMinutes;
    private createPolicyStatements;
    private renderEncryption;
    /**
     * Provides the Athena start query execution service integration task configuration
     */
    /**
     * @internal
     */
    protected _renderTask(): any;
}
/**
 * Location of query result along with S3 bucket configuration
 *
 * @see https://docs.aws.amazon.com/athena/latest/APIReference/API_ResultConfiguration.html
 */
export interface ResultConfiguration {
    /**
     * S3 path of query results
     *
     * Example value: `s3://query-results-bucket/folder/`
     *
     * @default - Query Result Location set in Athena settings for this workgroup
    */
    readonly outputLocation?: s3.Location;
    /**
     * Encryption option used if enabled in S3
     *
     * @default - SSE_S3 encryption is enabled with default encryption key
     */
    readonly encryptionConfiguration?: EncryptionConfiguration;
}
/**
 * Encryption Configuration of the S3 bucket
 *
 * @see https://docs.aws.amazon.com/athena/latest/APIReference/API_EncryptionConfiguration.html
 */
export interface EncryptionConfiguration {
    /**
     * Type of S3 server-side encryption enabled
     *
     * @default EncryptionOption.S3_MANAGED
     */
    readonly encryptionOption: EncryptionOption;
    /**
     * KMS key ARN or ID
     *
     * @default - No KMS key for Encryption Option SSE_S3 and default master key for Encryption Option SSE_KMS and CSE_KMS
     */
    readonly encryptionKey?: kms.IKey;
}
/**
 * Encryption Options of the S3 bucket
 *
 * @see https://docs.aws.amazon.com/athena/latest/APIReference/API_EncryptionConfiguration.html#athena-Type-EncryptionConfiguration-EncryptionOption
 */
export declare enum EncryptionOption {
    /**
     * Server side encryption (SSE) with an Amazon S3-managed key.
     *
     * @see https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingServerSideEncryption.html
     */
    S3_MANAGED = "SSE_S3",
    /**
     * Server-side encryption (SSE) with an AWS KMS key managed by the account owner.
     *
     * @see https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingKMSEncryption.html
     */
    KMS = "SSE_KMS",
    /**
     * Client-side encryption (CSE) with an AWS KMS key managed by the account owner.
     *
     * @see https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingClientSideEncryption.html
     */
    CLIENT_SIDE_KMS = "CSE_KMS"
}
/**
 * Database and data catalog context in which the query execution occurs
 *
 * @see https://docs.aws.amazon.com/athena/latest/APIReference/API_QueryExecutionContext.html
 */
export interface QueryExecutionContext {
    /**
     * Name of catalog used in query execution
     *
     * @default - No catalog
     */
    readonly catalogName?: string;
    /**
     * Name of database used in query execution
     *
     * @default - No database
     */
    readonly databaseName?: string;
}
