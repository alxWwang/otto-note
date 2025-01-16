import { Construct } from 'constructs';
import * as iam from '../../../aws-iam';
import * as sns from '../../../aws-sns';
import * as sfn from '../../../aws-stepfunctions';
/**
 * The data type set for the SNS message attributes
 *
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html#SNSMessageAttributes.DataTypes
 */
export declare enum MessageAttributeDataType {
    /**
     * Strings are Unicode with UTF-8 binary encoding
     */
    STRING = "String",
    /**
     * An array, formatted as a string
     *
     * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html#SNSMessageAttributes.DataTypes
     */
    STRING_ARRAY = "String.Array",
    /**
     * Numbers are positive or negative integers or floating-point numbers
     *
     * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html#SNSMessageAttributes.DataTypes
     */
    NUMBER = "Number",
    /**
     * Binary type attributes can store any binary data
     *
     * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html#SNSMessageAttributes.DataTypes
     */
    BINARY = "Binary"
}
/**
 * A message attribute to add to the SNS message
 *
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
 */
export interface MessageAttribute {
    /**
     * The value of the attribute
     */
    readonly value: any;
    /**
     * The data type for the attribute
     *
     * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html#SNSMessageAttributes.DataTypes
     * @default determined by type inspection if possible, fallback is String
     */
    readonly dataType?: MessageAttributeDataType;
}
/**
 * Properties for publishing a message to an SNS topic
 */
export interface SnsPublishProps extends sfn.TaskStateBaseProps {
    /**
     * The SNS topic that the task will publish to.
     */
    readonly topic: sns.ITopic;
    /**
     * The message you want to send.
     *
     * With the exception of SMS, messages must be UTF-8 encoded strings and
     * at most 256 KB in size.
     * For SMS, each message can contain up to 140 characters.
     */
    readonly message: sfn.TaskInput;
    /**
     * Add message attributes when publishing.
     *
     * These attributes carry additional metadata about the message and may be used
     * for subscription filters.
     *
     * @see https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
     * @default {}
     */
    readonly messageAttributes?: {
        [key: string]: MessageAttribute;
    };
    /**
     * Send different messages for each transport protocol.
     *
     * For example, you might want to send a shorter message to SMS subscribers
     * and a more verbose message to email and SQS subscribers.
     *
     * Your message must be a JSON object with a top-level JSON key of
     * "default" with a value that is a string
     * You can define other top-level keys that define the message you want to
     * send to a specific transport protocol (i.e. "sqs", "email", "http", etc)
     *
     * @see https://docs.aws.amazon.com/sns/latest/api/API_Publish.html#API_Publish_RequestParameters
     * @default false
     */
    readonly messagePerSubscriptionType?: boolean;
    /**
     * Used as the "Subject" line when the message is delivered to email endpoints.
     * This field will also be included, if present, in the standard JSON messages
     * delivered to other endpoints.
     *
     * @default - No subject
     */
    readonly subject?: string;
    /**
     * This parameter applies only to FIFO topics.
     *
     * The MessageGroupId is a tag that specifies that a message belongs to a specific message group.
     * Messages that belong to the same message group are processed in a FIFO manner
     * (however, messages in different message groups might be processed out of order).
     * Every message must include a MessageGroupId.
     *
     * @default - Not used for standard topics, required for FIFO topics.
     */
    readonly messageGroupId?: string;
    /**
     * This parameter applies only to FIFO topics.
     *
     * Every message must have a unique MessageDeduplicationId, which is a token used for deduplication of sent messages.
     * If a message with a particular MessageDeduplicationId is sent successfully, any message sent with the same MessageDeduplicationId
     * during the 5-minute deduplication interval is treated as a duplicate.
     *
     * If the topic has ContentBasedDeduplication set, the system generates a MessageDeduplicationId
     * based on the contents of the message. Your MessageDeduplicationId overrides the generated one.
     *
     * @default - Not used for standard topics, required for FIFO topics with ContentBasedDeduplication disabled.
     */
    readonly messageDeduplicationId?: string;
}
/**
 * A Step Functions Task to publish messages to SNS topic.
 *
 */
export declare class SnsPublish extends sfn.TaskStateBase {
    private readonly props;
    private static readonly SUPPORTED_INTEGRATION_PATTERNS;
    protected readonly taskMetrics: sfn.TaskMetricsConfig | undefined;
    protected readonly taskPolicies: iam.PolicyStatement[] | undefined;
    private readonly integrationPattern;
    constructor(scope: Construct, id: string, props: SnsPublishProps);
    /**
     * Provides the SNS Publish service integration task configuration
     */
    /**
     * @internal
     */
    protected _renderTask(): any;
}
