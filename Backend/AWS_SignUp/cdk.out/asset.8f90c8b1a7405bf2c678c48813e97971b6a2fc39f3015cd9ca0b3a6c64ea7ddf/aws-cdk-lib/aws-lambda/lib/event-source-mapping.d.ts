import { Construct } from 'constructs';
import { IEventSourceDlq } from './dlq';
import { IFunction } from './function-base';
import { IKey } from '../../aws-kms';
import * as cdk from '../../core';
/**
 * The type of authentication protocol or the VPC components for your event source's SourceAccessConfiguration
 * @see https://docs.aws.amazon.com/lambda/latest/dg/API_SourceAccessConfiguration.html#SSS-Type-SourceAccessConfiguration-Type
 */
export declare class SourceAccessConfigurationType {
    /**
     * (MQ) The Secrets Manager secret that stores your broker credentials.
     */
    static readonly BASIC_AUTH: SourceAccessConfigurationType;
    /**
     * The subnets associated with your VPC. Lambda connects to these subnets to fetch data from your Self-Managed Apache Kafka cluster.
     */
    static readonly VPC_SUBNET: SourceAccessConfigurationType;
    /**
     * The VPC security group used to manage access to your Self-Managed Apache Kafka brokers.
     */
    static readonly VPC_SECURITY_GROUP: SourceAccessConfigurationType;
    /**
     * The Secrets Manager ARN of your secret key used for SASL SCRAM-256 authentication of your Self-Managed Apache Kafka brokers.
     */
    static readonly SASL_SCRAM_256_AUTH: SourceAccessConfigurationType;
    /**
     * The Secrets Manager ARN of your secret key used for SASL SCRAM-512 authentication of your Self-Managed Apache Kafka brokers.
     */
    static readonly SASL_SCRAM_512_AUTH: SourceAccessConfigurationType;
    /**
     * The Secrets Manager ARN of your secret key containing the certificate chain (X.509 PEM), private key (PKCS#8 PEM),
     * and private key password (optional) used for mutual TLS authentication of your MSK/Apache Kafka brokers.
     */
    static readonly CLIENT_CERTIFICATE_TLS_AUTH: SourceAccessConfigurationType;
    /**
     * The Secrets Manager ARN of your secret key containing the root CA certificate (X.509 PEM) used for TLS encryption of your Apache Kafka brokers.
     */
    static readonly SERVER_ROOT_CA_CERTIFICATE: SourceAccessConfigurationType;
    /** A custom source access configuration property */
    static of(name: string): SourceAccessConfigurationType;
    /**
     * The key to use in `SourceAccessConfigurationProperty.Type` property in CloudFormation
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-sourceaccessconfiguration.html#cfn-lambda-eventsourcemapping-sourceaccessconfiguration-type
     */
    readonly type: string;
    private constructor();
}
/**
 * Specific settings like the authentication protocol or the VPC components to secure access to your event source.
 */
export interface SourceAccessConfiguration {
    /**
     * The type of authentication protocol or the VPC components for your event source. For example: "SASL_SCRAM_512_AUTH".
     */
    readonly type: SourceAccessConfigurationType;
    /**
     * The value for your chosen configuration in type.
     * For example: "URI": "arn:aws:secretsmanager:us-east-1:01234567890:secret:MyBrokerSecretName".
     * The exact string depends on the type.
     * @see SourceAccessConfigurationType
     */
    readonly uri: string;
}
/**
 * (Amazon MSK and self-managed Apache Kafka only) The provisioned mode configuration for the event source.
 */
export interface ProvisionedPollerConfig {
    /**
     * The minimum number of pollers that should be provisioned.
     *
     * @default - 1
     */
    readonly minimumPollers?: number;
    /**
     * The maximum number of pollers that can be provisioned.
     *
     * @default - 200
     */
    readonly maximumPollers?: number;
}
export interface EventSourceMappingOptions {
    /**
     * The Amazon Resource Name (ARN) of the event source. Any record added to
     * this stream can invoke the Lambda function.
     *
     * @default - not set if using a self managed Kafka cluster, throws an error otherwise
     */
    readonly eventSourceArn?: string;
    /**
     * The largest number of records that AWS Lambda will retrieve from your event
     * source at the time of invoking your function. Your function receives an
     * event with all the retrieved records.
     *
     * Valid Range: Minimum value of 1. Maximum value of 10000.
     *
     * @default - Amazon Kinesis, Amazon DynamoDB, and Amazon MSK is 100 records.
     * The default for Amazon SQS is 10 messages. For standard SQS queues, the maximum is 10,000. For FIFO SQS queues, the maximum is 10.
     */
    readonly batchSize?: number;
    /**
     * If the function returns an error, split the batch in two and retry.
     *
     * @default false
     */
    readonly bisectBatchOnError?: boolean;
    /**
     * An Amazon SQS queue or Amazon SNS topic destination for discarded records.
     *
     * @default discarded records are ignored
     */
    readonly onFailure?: IEventSourceDlq;
    /**
     * Set to false to disable the event source upon creation.
     *
     * @default true
     */
    readonly enabled?: boolean;
    /**
     * The position in the DynamoDB, Kinesis or MSK stream where AWS Lambda should
     * start reading.
     *
     * @see https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetShardIterator.html#Kinesis-GetShardIterator-request-ShardIteratorType
     *
     * @default - no starting position
     */
    readonly startingPosition?: StartingPosition;
    /**
     * The time from which to start reading, in Unix time seconds.
     *
     * @default - no timestamp
     */
    readonly startingPositionTimestamp?: number;
    /**
     * Allow functions to return partially successful responses for a batch of records.
     *
     * @see https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#services-ddb-batchfailurereporting
     *
     * @default false
     */
    readonly reportBatchItemFailures?: boolean;
    /**
     * The maximum amount of time to gather records before invoking the function.
     * Maximum of Duration.minutes(5)
     *
     * @default Duration.seconds(0)
     */
    readonly maxBatchingWindow?: cdk.Duration;
    /**
     * The maximum concurrency setting limits the number of concurrent instances of the function that an Amazon SQS event source can invoke.
     *
     * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-max-concurrency
     *
     * Valid Range: Minimum value of 2. Maximum value of 1000.
     *
     * @default - No specific limit.
     */
    readonly maxConcurrency?: number;
    /**
     * The maximum age of a record that Lambda sends to a function for processing.
     * Valid Range:
     * * Minimum value of 60 seconds
     * * Maximum value of 7 days
     *
     * @default - infinite or until the record expires.
     */
    readonly maxRecordAge?: cdk.Duration;
    /**
     * The maximum number of times to retry when the function returns an error.
     * Set to `undefined` if you want lambda to keep retrying infinitely or until
     * the record expires.
     *
     * Valid Range:
     * * Minimum value of 0
     * * Maximum value of 10000
     *
     * @default - infinite or until the record expires.
     */
    readonly retryAttempts?: number;
    /**
     * The number of batches to process from each shard concurrently.
     * Valid Range:
     * * Minimum value of 1
     * * Maximum value of 10
     *
     * @default 1
     */
    readonly parallelizationFactor?: number;
    /**
     * The name of the Kafka topic.
     *
     * @default - no topic
     */
    readonly kafkaTopic?: string;
    /**
     * The size of the tumbling windows to group records sent to DynamoDB or Kinesis
     *
     * @see https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#services-ddb-windows
     *
     * Valid Range: 0 - 15 minutes
     *
     * @default - None
     */
    readonly tumblingWindow?: cdk.Duration;
    /**
     * A list of host and port pairs that are the addresses of the Kafka brokers in a self managed "bootstrap" Kafka cluster
     * that a Kafka client connects to initially to bootstrap itself.
     * They are in the format `abc.example.com:9096`.
     *
     * @default - none
     */
    readonly kafkaBootstrapServers?: string[];
    /**
     * The identifier for the Kafka consumer group to join. The consumer group ID must be unique among all your Kafka event sources. After creating a Kafka event source mapping with the consumer group ID specified, you cannot update this value. The value must have a lenght between 1 and 200 and full the pattern '[a-zA-Z0-9-\/*:_+=.@-]*'. For more information, see [Customizable consumer group ID](https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html#services-msk-consumer-group-id).
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-amazonmanagedkafkaeventsourceconfig.html
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-selfmanagedkafkaeventsourceconfig.html
     *
     * @default - none
     */
    readonly kafkaConsumerGroupId?: string;
    /**
     * Specific settings like the authentication protocol or the VPC components to secure access to your event source.
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-eventsourcemapping-sourceaccessconfiguration.html
     *
     * @default - none
     */
    readonly sourceAccessConfigurations?: SourceAccessConfiguration[];
    /**
     * Add filter criteria to Event Source
     * @see https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
     *
     * @default - none
     */
    readonly filters?: Array<{
        [key: string]: any;
    }>;
    /**
     * Add Customer managed KMS key to encrypt Filter Criteria.
     * @see https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
     * By default, Lambda will encrypt Filter Criteria using AWS managed keys
     * @see https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk
     *
     * @default - none
     */
    readonly filterEncryption?: IKey;
    /**
     * Check if support S3 onfailure destination(ODF). Currently only MSK and self managed kafka event support S3 ODF
     *
     * @default false
     */
    readonly supportS3OnFailureDestination?: boolean;
    /**
     * Configuration for provisioned pollers that read from the event source.
     * When specified, allows control over the minimum and maximum number of pollers
     * that can be provisioned to process events from the source.
     * @default - no provisioned pollers
     */
    readonly provisionedPollerConfig?: ProvisionedPollerConfig;
    /**
     * Configuration for enhanced monitoring metrics collection
     * When specified, enables collection of additional metrics for the stream event source
     *
     * @default - Enhanced monitoring is disabled
     */
    readonly metricsConfig?: MetricsConfig;
}
export declare enum MetricType {
    /**
     * Event Count metrics provide insights into the processing behavior of your event source mapping,
     * including the number of events successfully processed, filtered out, or dropped.
     * These metrics help you monitor the flow and status of events through your event source mapping.
     */
    EVENT_COUNT = "EventCount"
}
/**
 * Configuration for collecting metrics from the event source
 */
export interface MetricsConfig {
    /**
    * List of metric types to enable for this event source
    */
    readonly metrics: MetricType[];
}
/**
 * Properties for declaring a new event source mapping.
 */
export interface EventSourceMappingProps extends EventSourceMappingOptions {
    /**
     * The target AWS Lambda function.
     */
    readonly target: IFunction;
}
/**
 * Represents an event source mapping for a lambda function.
 * @see https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html
 */
export interface IEventSourceMapping extends cdk.IResource {
    /**
     * The identifier for this EventSourceMapping
     * @attribute
     */
    readonly eventSourceMappingId: string;
    /**
     * The ARN of the event source mapping (i.e. arn:aws:lambda:region:account-id:event-source-mapping/event-source-mapping-id)
     */
    readonly eventSourceMappingArn: string;
}
/**
 * Defines a Lambda EventSourceMapping resource.
 *
 * Usually, you won't need to define the mapping yourself. This will usually be done by
 * event sources. For example, to add an SQS event source to a function:
 *
 * ```ts
 * import * as sqs from 'aws-cdk-lib/aws-sqs';
 * import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
 *
 * declare const handler: lambda.Function;
 * declare const queue: sqs.Queue;
 *
 * handler.addEventSource(new eventsources.SqsEventSource(queue));
 * ```
 *
 * The `SqsEventSource` class will automatically create the mapping, and will also
 * modify the Lambda's execution role so it can consume messages from the queue.
 */
export declare class EventSourceMapping extends cdk.Resource implements IEventSourceMapping {
    /**
     * Import an event source into this stack from its event source id.
     */
    static fromEventSourceMappingId(scope: Construct, id: string, eventSourceMappingId: string): IEventSourceMapping;
    private static formatArn;
    readonly eventSourceMappingId: string;
    readonly eventSourceMappingArn: string;
    constructor(scope: Construct, id: string, props: EventSourceMappingProps);
    private validateKafkaConsumerGroupIdOrThrow;
}
/**
 * The position in the DynamoDB, Kinesis or MSK stream where AWS Lambda should start
 * reading.
 */
export declare enum StartingPosition {
    /**
     * Start reading at the last untrimmed record in the shard in the system,
     * which is the oldest data record in the shard.
     */
    TRIM_HORIZON = "TRIM_HORIZON",
    /**
     * Start reading just after the most recent record in the shard, so that you
     * always read the most recent data in the shard
     */
    LATEST = "LATEST",
    /**
     * Start reading from a position defined by a time stamp.
     * Only supported for Amazon Kinesis streams, otherwise an error will occur.
     * If supplied, `startingPositionTimestamp` must also be set.
     */
    AT_TIMESTAMP = "AT_TIMESTAMP"
}
