import { Construct } from 'constructs';
import { Logging } from './logging';
import * as ec2 from '../../../aws-ec2';
import * as iam from '../../../aws-iam';
import * as logs from '../../../aws-logs';
import * as cdk from '../../../core';
/**
 * Reference to the physical resource id that can be passed to the AWS operation as a parameter.
 */
export declare class PhysicalResourceIdReference implements cdk.IResolvable {
    readonly creationStack: string[];
    /**
     * toJSON serialization to replace `PhysicalResourceIdReference` with a magic string.
     */
    toJSON(): string;
    resolve(_context: cdk.IResolveContext): any;
    toString(): string;
}
/**
 * Physical ID of the custom resource.
 */
export declare class PhysicalResourceId {
    readonly responsePath?: string | undefined;
    readonly id?: string | undefined;
    /**
     * Extract the physical resource id from the path (dot notation) to the data in the API call response.
     */
    static fromResponse(responsePath: string): PhysicalResourceId;
    /**
     * Explicit physical resource id.
     */
    static of(id: string): PhysicalResourceId;
    /**
     * @param responsePath Path to a response data element to be used as the physical id.
     * @param id Literal string to be used as the physical id.
     */
    private constructor();
}
/**
 * An AWS SDK call.
 *
 * @example
 *
 *    new cr.AwsCustomResource(this, 'GetParameterCustomResource', {
 *      onUpdate: { // will also be called for a CREATE event
 *        service: 'SSM',
 *        action: 'getParameter',
 *        parameters: {
 *          Name: 'my-parameter',
 *          WithDecryption: true,
 *        },
 *        physicalResourceId: cr.PhysicalResourceId.fromResponse('Parameter.ARN'),
 *      },
 *      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
 *        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
 *      }),
 *    });
 *
 */
export interface AwsSdkCall {
    /**
     * The service to call
     *
     * This is the name of an AWS service, in one of the following forms:
     *
     * - An AWS SDK for JavaScript v3 package name (`@aws-sdk/client-api-gateway`)
     * - An AWS SDK for JavaScript v3 client name (`api-gateway`)
     * - An AWS SDK for JavaScript v2 constructor name (`APIGateway`)
     * - A lowercase AWS SDK for JavaScript v2 constructor name (`apigateway`)
     *
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html
     */
    readonly service: string;
    /**
     * The service action to call
     *
     * This is the name of an AWS API call, in one of the following forms:
     *
     * - An API call name as found in the API Reference documentation (`GetObject`)
     * - The API call name starting with a lowercase letter (`getObject`)
     * - The AWS SDK for JavaScript v3 command class name (`GetObjectCommand`)
     *
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html
     */
    readonly action: string;
    /**
     * The parameters for the service action
     *
     * @default - no parameters
     * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html
     */
    readonly parameters?: any;
    /**
     * The physical resource id of the custom resource for this call.
     * Mandatory for onCreate call.
     * In onUpdate, you can omit this to passthrough it from request.
     *
     * @default - no physical resource id
     */
    readonly physicalResourceId?: PhysicalResourceId;
    /**
     * The regex pattern to use to catch API errors. The `code` property of the
     * `Error` object will be tested against this pattern. If there is a match an
     * error will not be thrown.
     *
     * @default - do not catch errors
     */
    readonly ignoreErrorCodesMatching?: string;
    /**
     * API version to use for the service
     *
     * @see https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/locking-api-versions.html
     * @default - use latest available API version
     */
    readonly apiVersion?: string;
    /**
     * The region to send service requests to.
     * **Note: Cross-region operations are generally considered an anti-pattern.**
     * **Consider first deploying a stack in that region.**
     *
     * @default - the region where this custom resource is deployed
     */
    readonly region?: string;
    /**
     * Restrict the data returned by the custom resource to specific paths in
     * the API response. Use this to limit the data returned by the custom
     * resource if working with API calls that could potentially result in custom
     * response objects exceeding the hard limit of 4096 bytes.
     *
     * Example for ECS / updateService: ['service.deploymentConfiguration.maximumPercent']
     *
     * @default - return all data
     */
    readonly outputPaths?: string[];
    /**
     * Used for running the SDK calls in underlying lambda with a different role.
     * Can be used primarily for cross-account requests to for example connect
     * hostedzone with a shared vpc.
     * Region controls where assumeRole call is made.
     *
     * Example for Route53 / associateVPCWithHostedZone
     *
     * @default - run without assuming role
     */
    readonly assumedRoleArn?: string;
    /**
     * A property used to configure logging during lambda function execution.
     *
     * Note: The default Logging configuration is all. This configuration will enable logging on all logged data
     * in the lambda handler. This includes:
     *  - The event object that is received by the lambda handler
     *  - The response received after making a API call
     *  - The response object that the lambda handler will return
     *  - SDK versioning information
     *  - Caught and uncaught errors
     *
     * @default Logging.all()
     */
    readonly logging?: Logging;
}
/**
 * Options for the auto-generation of policies based on the configured SDK calls.
 */
export interface SdkCallsPolicyOptions {
    /**
     * The resources that the calls will have access to.
     *
     * It is best to use specific resource ARN's when possible. However, you can also use `AwsCustomResourcePolicy.ANY_RESOURCE`
     * to allow access to all resources. For example, when `onCreate` is used to create a resource which you don't
     * know the physical name of in advance.
     *
     * Note that will apply to ALL SDK calls.
     */
    readonly resources: string[];
}
/**
 * The IAM Policy that will be applied to the different calls.
 */
export declare class AwsCustomResourcePolicy {
    readonly statements: iam.PolicyStatement[];
    readonly resources?: string[] | undefined;
    /**
     * Use this constant to configure access to any resource.
     */
    static readonly ANY_RESOURCE: string[];
    /**
     * Explicit IAM Policy Statements.
     *
     * @param statements the statements to propagate to the SDK calls.
     */
    static fromStatements(statements: iam.PolicyStatement[]): AwsCustomResourcePolicy;
    /**
     * Generate IAM Policy Statements from the configured SDK calls.
     *
     * Each SDK call with be translated to an IAM Policy Statement in the form of: `call.service:call.action` (e.g `s3:PutObject`).
     *
     * This policy generator assumes the IAM policy name has the same name as the API
     * call. This is true in 99% of cases, but there are exceptions (for example,
     * S3's `PutBucketLifecycleConfiguration` requires
     * `s3:PutLifecycleConfiguration` permissions, Lambda's `Invoke` requires
     * `lambda:InvokeFunction` permissions). Use `fromStatements` if you want to
     * do a call that requires different IAM action names.
     *
     * @param options options for the policy generation
     */
    static fromSdkCalls(options: SdkCallsPolicyOptions): AwsCustomResourcePolicy;
    /**
     * @param statements statements for explicit policy.
     * @param resources resources for auto-generated from SDK calls.
     */
    private constructor();
}
/**
 * Properties for AwsCustomResource.
 *
 * Note that at least onCreate, onUpdate or onDelete must be specified.
 */
export interface AwsCustomResourceProps {
    /**
     * Cloudformation Resource type.
     *
     * @default - Custom::AWS
     */
    readonly resourceType?: string;
    /**
     * The AWS SDK call to make when the resource is created.
     *
     * @default - the call when the resource is updated
     */
    readonly onCreate?: AwsSdkCall;
    /**
     * The AWS SDK call to make when the resource is updated
     *
     * @default - no call
     */
    readonly onUpdate?: AwsSdkCall;
    /**
     * The AWS SDK call to make when the resource is deleted
     *
     * @default - no call
     */
    readonly onDelete?: AwsSdkCall;
    /**
     * The policy that will be added to the execution role of the Lambda
     * function implementing this custom resource provider.
     *
     * The custom resource also implements `iam.IGrantable`, making it possible
     * to use the `grantXxx()` methods.
     *
     * As this custom resource uses a singleton Lambda function, it's important
     * to note the that function's role will eventually accumulate the
     * permissions/grants from all resources.
     *
     * Note that a policy must be specified if `role` is not provided, as
     * by default a new role is created which requires policy changes to access
     * resources.
     *
     * @default - no policy added
     *
     * @see Policy.fromStatements
     * @see Policy.fromSdkCalls
     */
    readonly policy?: AwsCustomResourcePolicy;
    /**
     * The execution role for the singleton Lambda function implementing this custom
     * resource provider. This role will apply to all `AwsCustomResource`
     * instances in the stack. The role must be assumable by the
     * `lambda.amazonaws.com` service principal.
     *
     * @default - a new role is created
     */
    readonly role?: iam.IRole;
    /**
     * The timeout for the singleton Lambda function implementing this custom resource.
     *
     * @default Duration.minutes(2)
     */
    readonly timeout?: cdk.Duration;
    /**
     * The memory size for the singleton Lambda function implementing this custom resource.
     *
     * @default 512 mega in case if installLatestAwsSdk is false.
     */
    readonly memorySize?: number;
    /**
     * The number of days log events of the singleton Lambda function implementing
     * this custom resource are kept in CloudWatch Logs.
     *
     * This is a legacy API and we strongly recommend you migrate to `logGroup` if you can.
     * `logGroup` allows you to create a fully customizable log group and instruct the Lambda function to send logs to it.
     *
     * @default logs.RetentionDays.INFINITE
     */
    readonly logRetention?: logs.RetentionDays;
    /**
     * The Log Group used for logging of events emitted by the custom resource's lambda function.
     *
     * Providing a user-controlled log group was rolled out to commercial regions on 2023-11-16.
     * If you are deploying to another type of region, please check regional availability first.
     *
     * @default - a default log group created by AWS Lambda
     */
    readonly logGroup?: logs.ILogGroup;
    /**
     * Whether to install the latest AWS SDK v2.
     *
     * If not specified, this uses whatever JavaScript SDK version is the default in
     * AWS Lambda at the time of execution.
     *
     * Otherwise, installs the latest version from 'npmjs.com'. The installation takes
     * around 60 seconds and requires internet connectivity.
     *
     * The default can be controlled using the context key
     * `@aws-cdk/customresources:installLatestAwsSdkDefault` is.
     *
     * @default - The value of `@aws-cdk/customresources:installLatestAwsSdkDefault`, otherwise `true`
     */
    readonly installLatestAwsSdk?: boolean;
    /**
     * A name for the singleton Lambda function implementing this custom resource.
     * The function name will remain the same after the first AwsCustomResource is created in a stack.
     *
     * @default - AWS CloudFormation generates a unique physical ID and uses that
     * ID for the function's name. For more information, see Name Type.
     */
    readonly functionName?: string;
    /**
     * The policy to apply when this resource is removed from the application.
     *
     * @default cdk.RemovalPolicy.Destroy
     */
    readonly removalPolicy?: cdk.RemovalPolicy;
    /**
     * The vpc to provision the lambda function in.
     *
     * @default - the function is not provisioned inside a vpc.
     */
    readonly vpc?: ec2.IVpc;
    /**
     * Which subnets from the VPC to place the lambda function in.
     *
     * Only used if 'vpc' is supplied. Note: internet access for Lambdas
     * requires a NAT gateway, so picking Public subnets is not allowed.
     *
     * @default - the Vpc default strategy if not specified
     */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /**
     * The maximum time that can elapse before a custom resource operation times out.
     *
     * You should not need to set this property. It is intended to allow quick turnaround
     * even if the implementor of the custom resource forgets to include a `try/catch`.
     * We have included the `try/catch`, and AWS service calls usually do not take an hour
     * to complete.
     *
     * The value must be between 1 second and 3600 seconds.
     *
     * @default Duration.seconds(3600)
     */
    readonly serviceTimeout?: cdk.Duration;
}
/**
 * Defines a custom resource that is materialized using specific AWS API calls. These calls are created using
 * a singleton Lambda function.
 *
 * Use this to bridge any gap that might exist in the CloudFormation Coverage.
 * You can specify exactly which calls are invoked for the 'CREATE', 'UPDATE' and 'DELETE' life cycle events.
 *
 */
export declare class AwsCustomResource extends Construct implements iam.IGrantable {
    /**
     * The uuid of the custom resource provider singleton lambda function.
     */
    static readonly PROVIDER_FUNCTION_UUID = "679f53fa-c002-430c-b0da-5b7982bd2287";
    private static breakIgnoreErrorsCircuit;
    readonly grantPrincipal: iam.IPrincipal;
    private readonly customResource;
    private readonly props;
    constructor(scope: Construct, id: string, props: AwsCustomResourceProps);
    /**
     * Returns response data for the AWS SDK call.
     *
     * Example for S3 / listBucket : 'Buckets.0.Name'
     *
     * Use `Token.asXxx` to encode the returned `Reference` as a specific type or
     * use the convenience `getDataString` for string attributes.
     *
     * Note that you cannot use this method if `ignoreErrorCodesMatching`
     * is configured for any of the SDK calls. This is because in such a case,
     * the response data might not exist, and will cause a CloudFormation deploy time error.
     *
     * @param dataPath the path to the data
     */
    getResponseFieldReference(dataPath: string): cdk.Reference;
    /**
     * Returns response data for the AWS SDK call as string.
     *
     * Example for S3 / listBucket : 'Buckets.0.Name'
     *
     * Note that you cannot use this method if `ignoreErrorCodesMatching`
     * is configured for any of the SDK calls. This is because in such a case,
     * the response data might not exist, and will cause a CloudFormation deploy time error.
     *
     * @param dataPath the path to the data
     */
    getResponseField(dataPath: string): string;
    private formatSdkCall;
    private encodeJson;
}
