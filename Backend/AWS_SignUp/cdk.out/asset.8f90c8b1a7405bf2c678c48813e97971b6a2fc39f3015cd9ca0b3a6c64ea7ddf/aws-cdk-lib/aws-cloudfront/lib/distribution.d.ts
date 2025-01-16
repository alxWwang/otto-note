import { Construct } from 'constructs';
import { ICachePolicy } from './cache-policy';
import { FunctionAssociation } from './function';
import { GeoRestriction } from './geo-restriction';
import { IKeyGroup } from './key-group';
import { IOrigin } from './origin';
import { IOriginRequestPolicy } from './origin-request-policy';
import { IRealtimeLogConfig } from './realtime-log-config';
import { IResponseHeadersPolicy } from './response-headers-policy';
import * as acm from '../../aws-certificatemanager';
import * as cloudwatch from '../../aws-cloudwatch';
import * as iam from '../../aws-iam';
import * as lambda from '../../aws-lambda';
import * as s3 from '../../aws-s3';
import { IResource, Resource, Duration } from '../../core';
/**
 * Interface for CloudFront distributions
 */
export interface IDistribution extends IResource {
    /**
     * The domain name of the Distribution, such as d111111abcdef8.cloudfront.net.
     *
     * @attribute
     */
    readonly distributionDomainName: string;
    /**
     * The distribution ID for this distribution.
     *
     * @attribute
     */
    readonly distributionId: string;
    /**
     * The distribution ARN for this distribution.
     *
     * @attribute
     */
    readonly distributionArn: string;
    /**
     * Adds an IAM policy statement associated with this distribution to an IAM
     * principal's policy.
     *
     * @param identity The principal
     * @param actions The set of actions to allow (i.e. "cloudfront:ListInvalidations")
     */
    grant(identity: iam.IGrantable, ...actions: string[]): iam.Grant;
    /**
     * Grant to create invalidations for this bucket to an IAM principal (Role/Group/User).
     *
     * @param identity The principal
     */
    grantCreateInvalidation(identity: iam.IGrantable): iam.Grant;
}
/**
 * Attributes used to import a Distribution.
 */
export interface DistributionAttributes {
    /**
     * The generated domain name of the Distribution, such as d111111abcdef8.cloudfront.net.
     *
     * @attribute
     */
    readonly domainName: string;
    /**
     * The distribution ID for this distribution.
     *
     * @attribute
     */
    readonly distributionId: string;
}
/**
 * Properties for a Distribution
 */
export interface DistributionProps {
    /**
     * The default behavior for the distribution.
     */
    readonly defaultBehavior: BehaviorOptions;
    /**
     * Additional behaviors for the distribution, mapped by the pathPattern that specifies which requests to apply the behavior to.
     *
     * @default - no additional behaviors are added.
     */
    readonly additionalBehaviors?: Record<string, BehaviorOptions>;
    /**
     * A certificate to associate with the distribution. The certificate must be located in N. Virginia (us-east-1).
     *
     * @default - the CloudFront wildcard certificate (*.cloudfront.net) will be used.
     */
    readonly certificate?: acm.ICertificate;
    /**
     * Any comments you want to include about the distribution.
     *
     * @default - no comment
     */
    readonly comment?: string;
    /**
     * The object that you want CloudFront to request from your origin (for example, index.html)
     * when a viewer requests the root URL for your distribution. If no default object is set, the
     * request goes to the origin's root (e.g., example.com/).
     *
     * @default - no default root object
     */
    readonly defaultRootObject?: string;
    /**
     * Alternative domain names for this distribution.
     *
     * If you want to use your own domain name, such as www.example.com, instead of the cloudfront.net domain name,
     * you can add an alternate domain name to your distribution. If you attach a certificate to the distribution,
     * you should add (at least one of) the domain names of the certificate to this list.
     *
     * When you want to move a domain name between distributions, you can associate a certificate without specifying any domain names.
     * For more information, see the _Moving an alternate domain name to a different distribution_ section in the README.
     *
     * @default - The distribution will only support the default generated name (e.g., d111111abcdef8.cloudfront.net)
     */
    readonly domainNames?: string[];
    /**
     * Enable or disable the distribution.
     *
     * @default true
     */
    readonly enabled?: boolean;
    /**
     * Whether CloudFront will respond to IPv6 DNS requests with an IPv6 address.
     *
     * If you specify false, CloudFront responds to IPv6 DNS requests with the DNS response code NOERROR and with no IP addresses.
     * This allows viewers to submit a second request, for an IPv4 address for your distribution.
     *
     * @default true
     */
    readonly enableIpv6?: boolean;
    /**
     * Enable access logging for the distribution.
     *
     * @default - false, unless `logBucket` is specified.
     */
    readonly enableLogging?: boolean;
    /**
     * Controls the countries in which your content is distributed.
     *
     * @default - No geographic restrictions
     */
    readonly geoRestriction?: GeoRestriction;
    /**
     * Specify the maximum HTTP version that you want viewers to use to communicate with CloudFront.
     *
     * For viewers and CloudFront to use HTTP/2, viewers must support TLS 1.2 or later, and must support server name identification (SNI).
     *
     * @default HttpVersion.HTTP2
     */
    readonly httpVersion?: HttpVersion;
    /**
     * The Amazon S3 bucket to store the access logs in.
     * Make sure to set `objectOwnership` to `s3.ObjectOwnership.OBJECT_WRITER` in your custom bucket.
     *
     * @default - A bucket is created if `enableLogging` is true
     */
    readonly logBucket?: s3.IBucket;
    /**
     * Specifies whether you want CloudFront to include cookies in access logs
     *
     * @default false
     */
    readonly logIncludesCookies?: boolean;
    /**
     * An optional string that you want CloudFront to prefix to the access log filenames for this distribution.
     *
     * @default - no prefix
     */
    readonly logFilePrefix?: string;
    /**
     * The price class that corresponds with the maximum price that you want to pay for CloudFront service.
     * If you specify PriceClass_All, CloudFront responds to requests for your objects from all CloudFront edge locations.
     * If you specify a price class other than PriceClass_All, CloudFront serves your objects from the CloudFront edge location
     * that has the lowest latency among the edge locations in your price class.
     *
     * @default PriceClass.PRICE_CLASS_ALL
     */
    readonly priceClass?: PriceClass;
    /**
     * Unique identifier that specifies the AWS WAF web ACL to associate with this CloudFront distribution.
     *
     * To specify a web ACL created using the latest version of AWS WAF, use the ACL ARN, for example
     * `arn:aws:wafv2:us-east-1:123456789012:global/webacl/ExampleWebACL/473e64fd-f30b-4765-81a0-62ad96dd167a`.
     * To specify a web ACL created using AWS WAF Classic, use the ACL ID, for example `473e64fd-f30b-4765-81a0-62ad96dd167a`.
     *
     * @see https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html
     * @see https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_CreateDistribution.html#API_CreateDistribution_RequestParameters.
     *
     * @default - No AWS Web Application Firewall web access control list (web ACL).
     */
    readonly webAclId?: string;
    /**
     * How CloudFront should handle requests that are not successful (e.g., PageNotFound).
     *
     * @default - No custom error responses.
     */
    readonly errorResponses?: ErrorResponse[];
    /**
     * The minimum version of the SSL protocol that you want CloudFront to use for HTTPS connections.
     *
     * CloudFront serves your objects only to browsers or devices that support at
     * least the SSL version that you specify.
     *
     * @default - SecurityPolicyProtocol.TLS_V1_2_2021 if the '@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021' feature flag is set; otherwise, SecurityPolicyProtocol.TLS_V1_2_2019.
     */
    readonly minimumProtocolVersion?: SecurityPolicyProtocol;
    /**
     * The SSL method CloudFront will use for your distribution.
     *
     * Server Name Indication (SNI) - is an extension to the TLS computer networking protocol by which a client indicates
     * which hostname it is attempting to connect to at the start of the handshaking process. This allows a server to present
     * multiple certificates on the same IP address and TCP port number and hence allows multiple secure (HTTPS) websites
     * (or any other service over TLS) to be served by the same IP address without requiring all those sites to use the same certificate.
     *
     * CloudFront can use SNI to host multiple distributions on the same IP - which a large majority of clients will support.
     *
     * If your clients cannot support SNI however - CloudFront can use dedicated IPs for your distribution - but there is a prorated monthly charge for
     * using this feature. By default, we use SNI - but you can optionally enable dedicated IPs (VIP).
     *
     * See the CloudFront SSL for more details about pricing : https://aws.amazon.com/cloudfront/custom-ssl-domains/
     *
     * @default SSLMethod.SNI
     */
    readonly sslSupportMethod?: SSLMethod;
    /**
     * Whether to enable additional CloudWatch metrics.
     *
     * @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/viewing-cloudfront-metrics.html
     *
     * @default false
     */
    readonly publishAdditionalMetrics?: boolean;
}
/**
 * A CloudFront distribution with associated origin(s) and caching behavior(s).
 */
export declare class Distribution extends Resource implements IDistribution {
    /**
     * Creates a Distribution construct that represents an external (imported) distribution.
     */
    static fromDistributionAttributes(scope: Construct, id: string, attrs: DistributionAttributes): IDistribution;
    readonly domainName: string;
    readonly distributionDomainName: string;
    readonly distributionId: string;
    private readonly defaultBehavior;
    private readonly additionalBehaviors;
    private readonly boundOrigins;
    private readonly originGroups;
    private readonly errorResponses;
    private readonly certificate?;
    private readonly publishAdditionalMetrics?;
    private webAclId?;
    constructor(scope: Construct, id: string, props: DistributionProps);
    get distributionArn(): string;
    /**
     * Return the given named metric for this Distribution
     */
    metric(metricName: string, props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the total number of viewer requests received by CloudFront, for all HTTP methods and for both HTTP and HTTPS requests.
     *
     * @default - sum over 5 minutes
     */
    metricRequests(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the total number of bytes that viewers uploaded to your origin with CloudFront, using POST and PUT requests.
     *
     * @default - sum over 5 minutes
     */
    metricBytesUploaded(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the total number of bytes downloaded by viewers for GET, HEAD, and OPTIONS requests.
     *
     * @default - sum over 5 minutes
     */
    metricBytesDownloaded(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 4xx or 5xx.
     *
     * @default - average over 5 minutes
     */
    metricTotalErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 4xx.
     *
     * @default - average over 5 minutes
     */
    metric4xxErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 5xx.
     *
     * @default - average over 5 minutes
     */
    metric5xxErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the total time spent from when CloudFront receives a request to when it starts providing a response to the network (not the viewer),
     * for requests that are served from the origin, not the CloudFront cache.
     *
     * This is also known as first byte latency, or time-to-first-byte.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metricOriginLatency(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all cacheable requests for which CloudFront served the content from its cache.
     *
     * HTTP POST and PUT requests, and errors, are not considered cacheable requests.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metricCacheHitRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 401.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metric401ErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 403.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metric403ErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 404.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metric404ErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 502.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metric502ErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 503.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metric503ErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Metric for the percentage of all viewer requests for which the response's HTTP status code is 504.
     *
     * To obtain this metric, you need to set `publishAdditionalMetrics` to `true`.
     *
     * @default - average over 5 minutes
     */
    metric504ErrorRate(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * Adds a new behavior to this distribution for the given pathPattern.
     *
     * @param pathPattern the path pattern (e.g., 'images/*') that specifies which requests to apply the behavior to.
     * @param origin the origin to use for this behavior
     * @param behaviorOptions the options for the behavior at this path.
     */
    addBehavior(pathPattern: string, origin: IOrigin, behaviorOptions?: AddBehaviorOptions): void;
    /**
     * Adds an IAM policy statement associated with this distribution to an IAM
     * principal's policy.
     *
     * @param identity The principal
     * @param actions The set of actions to allow (i.e. "cloudfront:ListInvalidations")
     */
    grant(identity: iam.IGrantable, ...actions: string[]): iam.Grant;
    /**
     * Grant to create invalidations for this bucket to an IAM principal (Role/Group/User).
     *
     * @param identity The principal
     */
    grantCreateInvalidation(identity: iam.IGrantable): iam.Grant;
    /**
     * Attach WAF WebACL to this CloudFront distribution
     *
     * WebACL must be in the us-east-1 region
     *
     * @param webAclId The WAF WebACL to associate with this distribution
     */
    attachWebAclId(webAclId: string): void;
    private validateWebAclId;
    private addOrigin;
    private addOriginGroup;
    private renderOrigins;
    private renderOriginGroups;
    private renderCacheBehaviors;
    private renderErrorResponses;
    private renderLogging;
    private renderRestrictions;
    private renderViewerCertificate;
}
/** Maximum HTTP version to support */
export declare enum HttpVersion {
    /** HTTP 1.1 */
    HTTP1_1 = "http1.1",
    /** HTTP 2 */
    HTTP2 = "http2",
    /** HTTP 2 and HTTP 3 */
    HTTP2_AND_3 = "http2and3",
    /** HTTP 3 */
    HTTP3 = "http3"
}
/**
 * The price class determines how many edge locations CloudFront will use for your distribution.
 * See https://aws.amazon.com/cloudfront/pricing/ for full list of supported regions.
 */
export declare enum PriceClass {
    /** USA, Canada, Europe, & Israel */
    PRICE_CLASS_100 = "PriceClass_100",
    /** PRICE_CLASS_100 + South Africa, Kenya, Middle East, Japan, Singapore, South Korea, Taiwan, Hong Kong, & Philippines */
    PRICE_CLASS_200 = "PriceClass_200",
    /** All locations */
    PRICE_CLASS_ALL = "PriceClass_All"
}
/**
 * How HTTPs should be handled with your distribution.
 */
export declare enum ViewerProtocolPolicy {
    /** HTTPS only */
    HTTPS_ONLY = "https-only",
    /** Will redirect HTTP requests to HTTPS */
    REDIRECT_TO_HTTPS = "redirect-to-https",
    /** Both HTTP and HTTPS supported */
    ALLOW_ALL = "allow-all"
}
/**
 * Defines what protocols CloudFront will use to connect to an origin.
 */
export declare enum OriginProtocolPolicy {
    /** Connect on HTTP only */
    HTTP_ONLY = "http-only",
    /** Connect with the same protocol as the viewer */
    MATCH_VIEWER = "match-viewer",
    /** Connect on HTTPS only */
    HTTPS_ONLY = "https-only"
}
/**
 * The SSL method CloudFront will use for your distribution.
 *
 * Server Name Indication (SNI) - is an extension to the TLS computer networking protocol by which a client indicates
 *  which hostname it is attempting to connect to at the start of the handshaking process. This allows a server to present
 *  multiple certificates on the same IP address and TCP port number and hence allows multiple secure (HTTPS) websites
 * (or any other service over TLS) to be served by the same IP address without requiring all those sites to use the same certificate.
 *
 * CloudFront can use SNI to host multiple distributions on the same IP - which a large majority of clients will support.
 *
 * If your clients cannot support SNI however - CloudFront can use dedicated IPs for your distribution - but there is a prorated monthly charge for
 * using this feature. By default, we use SNI - but you can optionally enable dedicated IPs (VIP).
 *
 * See the CloudFront SSL for more details about pricing : https://aws.amazon.com/cloudfront/custom-ssl-domains/
 *
 */
export declare enum SSLMethod {
    SNI = "sni-only",
    VIP = "vip"
}
/**
 * The minimum version of the SSL protocol that you want CloudFront to use for HTTPS connections.
 * CloudFront serves your objects only to browsers or devices that support at least the SSL version that you specify.
 */
export declare enum SecurityPolicyProtocol {
    SSL_V3 = "SSLv3",
    TLS_V1 = "TLSv1",
    TLS_V1_2016 = "TLSv1_2016",
    TLS_V1_1_2016 = "TLSv1.1_2016",
    TLS_V1_2_2018 = "TLSv1.2_2018",
    TLS_V1_2_2019 = "TLSv1.2_2019",
    TLS_V1_2_2021 = "TLSv1.2_2021"
}
/**
 * The HTTP methods that the Behavior will accept requests on.
 */
export declare class AllowedMethods {
    /** HEAD and GET */
    static readonly ALLOW_GET_HEAD: AllowedMethods;
    /** HEAD, GET, and OPTIONS */
    static readonly ALLOW_GET_HEAD_OPTIONS: AllowedMethods;
    /** All supported HTTP methods */
    static readonly ALLOW_ALL: AllowedMethods;
    /** HTTP methods supported */
    readonly methods: string[];
    private constructor();
}
/**
 * The HTTP methods that the Behavior will cache requests on.
 */
export declare class CachedMethods {
    /** HEAD and GET */
    static readonly CACHE_GET_HEAD: CachedMethods;
    /** HEAD, GET, and OPTIONS */
    static readonly CACHE_GET_HEAD_OPTIONS: CachedMethods;
    /** HTTP methods supported */
    readonly methods: string[];
    private constructor();
}
/**
 * Options for configuring custom error responses.
 */
export interface ErrorResponse {
    /**
     * The minimum amount of time, in seconds, that you want CloudFront to cache the HTTP status code specified in ErrorCode.
     *
     * @default - the default caching TTL behavior applies
     */
    readonly ttl?: Duration;
    /**
     * The HTTP status code for which you want to specify a custom error page and/or a caching duration.
     */
    readonly httpStatus: number;
    /**
     * The HTTP status code that you want CloudFront to return to the viewer along with the custom error page.
     *
     * If you specify a value for `responseHttpStatus`, you must also specify a value for `responsePagePath`.
     *
     * @default - the error code will be returned as the response code.
     */
    readonly responseHttpStatus?: number;
    /**
     * The path to the custom error page that you want CloudFront to return to a viewer when your origin returns the
     * `httpStatus`, for example, /4xx-errors/403-forbidden.html
     *
     * @default - the default CloudFront response is shown.
     */
    readonly responsePagePath?: string;
}
/**
 * The type of events that a Lambda@Edge function can be invoked in response to.
 */
export declare enum LambdaEdgeEventType {
    /**
     * The origin-request specifies the request to the
     * origin location (e.g. S3)
     */
    ORIGIN_REQUEST = "origin-request",
    /**
     * The origin-response specifies the response from the
     * origin location (e.g. S3)
     */
    ORIGIN_RESPONSE = "origin-response",
    /**
     * The viewer-request specifies the incoming request
     */
    VIEWER_REQUEST = "viewer-request",
    /**
     * The viewer-response specifies the outgoing response
     */
    VIEWER_RESPONSE = "viewer-response"
}
/**
 * Represents a Lambda function version and event type when using Lambda@Edge.
 * The type of the `AddBehaviorOptions.edgeLambdas` property.
 */
export interface EdgeLambda {
    /**
     * The version of the Lambda function that will be invoked.
     *
     * **Note**: it's not possible to use the '$LATEST' function version for Lambda@Edge!
     */
    readonly functionVersion: lambda.IVersion;
    /** The type of event in response to which should the function be invoked. */
    readonly eventType: LambdaEdgeEventType;
    /**
     * Allows a Lambda function to have read access to the body content.
     * Only valid for "request" event types (`ORIGIN_REQUEST` or `VIEWER_REQUEST`).
     * See https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-include-body-access.html
     *
     * @default false
     */
    readonly includeBody?: boolean;
}
/**
 * Options for adding a new behavior to a Distribution.
 */
export interface AddBehaviorOptions {
    /**
     * HTTP methods to allow for this behavior.
     *
     * @default AllowedMethods.ALLOW_GET_HEAD
     */
    readonly allowedMethods?: AllowedMethods;
    /**
     * HTTP methods to cache for this behavior.
     *
     * @default CachedMethods.CACHE_GET_HEAD
     */
    readonly cachedMethods?: CachedMethods;
    /**
     * The cache policy for this behavior. The cache policy determines what values are included in the cache key,
     * and the time-to-live (TTL) values for the cache.
     *
     * @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html.
     * @default CachePolicy.CACHING_OPTIMIZED
     */
    readonly cachePolicy?: ICachePolicy;
    /**
     * Whether you want CloudFront to automatically compress certain files for this cache behavior.
     * See https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html#compressed-content-cloudfront-file-types
     * for file types CloudFront will compress.
     *
     * @default true
     */
    readonly compress?: boolean;
    /**
     * The origin request policy for this behavior. The origin request policy determines which values (e.g., headers, cookies)
     * are included in requests that CloudFront sends to the origin.
     *
     * @default - none
     */
    readonly originRequestPolicy?: IOriginRequestPolicy;
    /**
     * The real-time log configuration to be attached to this cache behavior.
     *
     * @default - none
     */
    readonly realtimeLogConfig?: IRealtimeLogConfig;
    /**
     * The response headers policy for this behavior. The response headers policy determines which headers are included in responses
     *
     * @default - none
     */
    readonly responseHeadersPolicy?: IResponseHeadersPolicy;
    /**
     * Set this to true to indicate you want to distribute media files in the Microsoft Smooth Streaming format using this behavior.
     *
     * @default false
     */
    readonly smoothStreaming?: boolean;
    /**
     * The protocol that viewers can use to access the files controlled by this behavior.
     *
     * @default ViewerProtocolPolicy.ALLOW_ALL
     */
    readonly viewerProtocolPolicy?: ViewerProtocolPolicy;
    /**
     * The CloudFront functions to invoke before serving the contents.
     *
     * @default - no functions will be invoked
     */
    readonly functionAssociations?: FunctionAssociation[];
    /**
     * The Lambda@Edge functions to invoke before serving the contents.
     *
     * @default - no Lambda functions will be invoked
     * @see https://aws.amazon.com/lambda/edge
     */
    readonly edgeLambdas?: EdgeLambda[];
    /**
     * A list of Key Groups that CloudFront can use to validate signed URLs or signed cookies.
     *
     * @default - no KeyGroups are associated with cache behavior
     * @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html
     */
    readonly trustedKeyGroups?: IKeyGroup[];
}
/**
 * Options for creating a new behavior.
 */
export interface BehaviorOptions extends AddBehaviorOptions {
    /**
     * The origin that you want CloudFront to route requests to when they match this behavior.
     */
    readonly origin: IOrigin;
}
