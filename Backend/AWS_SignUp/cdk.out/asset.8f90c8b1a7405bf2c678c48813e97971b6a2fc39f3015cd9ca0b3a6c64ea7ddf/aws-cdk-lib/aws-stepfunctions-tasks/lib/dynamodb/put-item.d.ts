import { Construct } from 'constructs';
import { DynamoAttributeValue, DynamoConsumedCapacity, DynamoItemCollectionMetrics, DynamoReturnValues } from './shared-types';
import * as ddb from '../../../aws-dynamodb';
import * as iam from '../../../aws-iam';
import * as sfn from '../../../aws-stepfunctions';
/**
 * Properties for DynamoPutItem Task
 */
export interface DynamoPutItemProps extends sfn.TaskStateBaseProps {
    /**
     * A map of attribute name/value pairs, one for each attribute.
     * Only the primary key attributes are required;
     * you can optionally provide other attribute name-value pairs for the item.
     *
     * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-Item
     */
    readonly item: {
        [key: string]: DynamoAttributeValue;
    };
    /**
     * The name of the table where the item should be written .
     */
    readonly table: ddb.ITable;
    /**
     * A condition that must be satisfied in order for a conditional PutItem operation to succeed.
     *
     * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ConditionExpression
     *
     * @default - No condition expression
     */
    readonly conditionExpression?: string;
    /**
     * One or more substitution tokens for attribute names in an expression
     *
     * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ExpressionAttributeNames
     *
     * @default - No expression attribute names
     */
    readonly expressionAttributeNames?: {
        [key: string]: string;
    };
    /**
     * One or more values that can be substituted in an expression.
     *
     * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ExpressionAttributeValues
     *
     * @default - No expression attribute values
     */
    readonly expressionAttributeValues?: {
        [key: string]: DynamoAttributeValue;
    };
    /**
     * Determines the level of detail about provisioned throughput consumption that is returned in the response
     *
     * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnConsumedCapacity
     *
     * @default DynamoConsumedCapacity.NONE
     */
    readonly returnConsumedCapacity?: DynamoConsumedCapacity;
    /**
     * The item collection metrics to returned in the response
     *
     * @see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html#LSI.ItemCollections
     *
     * @default DynamoItemCollectionMetrics.NONE
     */
    readonly returnItemCollectionMetrics?: DynamoItemCollectionMetrics;
    /**
     * Use ReturnValues if you want to get the item attributes as they appeared
     * before they were updated with the PutItem request.
     *
     * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnValues
     *
     * @default DynamoReturnValues.NONE
     */
    readonly returnValues?: DynamoReturnValues;
}
/**
 * A StepFunctions task to call DynamoPutItem
 */
export declare class DynamoPutItem extends sfn.TaskStateBase {
    private readonly props;
    protected readonly taskMetrics?: sfn.TaskMetricsConfig;
    protected readonly taskPolicies?: iam.PolicyStatement[];
    constructor(scope: Construct, id: string, props: DynamoPutItemProps);
    /**
     * @internal
     */
    protected _renderTask(): any;
}
