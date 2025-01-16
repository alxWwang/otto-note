import { Construct } from 'constructs';
import { IResource, Resource } from '../../core';
/**
 * Represents a CloudFront Origin Access Control
 */
export interface IOriginAccessControl extends IResource {
    /**
     * The unique identifier of the origin access control.
     * @attribute
     */
    readonly originAccessControlId: string;
}
/**
 * Common properties for creating a Origin Access Control resource.
 */
export interface OriginAccessControlBaseProps {
    /**
     * A description of the origin access control.
     *
     * @default - no description
     */
    readonly description?: string;
    /**
     * A name to identify the origin access control, with a maximum length of 64 characters.
     *
     * @default - a generated name
     */
    readonly originAccessControlName?: string;
    /**
     * Specifies which requests CloudFront signs and the signing protocol.
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-originaccesscontrol-originaccesscontrolconfig.html#cfn-cloudfront-originaccesscontrol-originaccesscontrolconfig-signingbehavior
     *
     * @default SIGV4_ALWAYS
     */
    readonly signing?: Signing;
}
/**
 * The level of permissions granted to the CloudFront Distribution when configuring OAC
 */
export declare enum AccessLevel {
    /**
     * Grants read permissions to CloudFront Distribution
     */
    READ = "READ",
    /**
     * Grants write permission to CloudFront Distribution
     */
    WRITE = "WRITE",
    /**
     * Grants delete permission to CloudFront Distribution
     */
    DELETE = "DELETE"
}
/**
 * Properties for creating a S3 Origin Access Control resource.
 */
export interface S3OriginAccessControlProps extends OriginAccessControlBaseProps {
}
/**
 * Properties for creating a Lambda Function URL Origin Access Control resource.
 */
export interface FunctionUrlOriginAccessControlProps extends OriginAccessControlBaseProps {
}
/**
 * Origin types supported by Origin Access Control.
 */
export declare enum OriginAccessControlOriginType {
    /**
     * Uses an Amazon S3 bucket origin.
     */
    S3 = "s3",
    /**
     * Uses a Lambda function URL origin.
     */
    LAMBDA = "lambda",
    /**
     * Uses an AWS Elemental MediaStore origin.
     */
    MEDIASTORE = "mediastore",
    /**
     * Uses an AWS Elemental MediaPackage v2 origin.
     */
    MEDIAPACKAGEV2 = "mediapackagev2"
}
/**
 * Options for which requests CloudFront signs.
 * The recommended setting is `always`.
 */
export declare enum SigningBehavior {
    /**
     * Sign all origin requests, overwriting the Authorization header
     * from the viewer request if one exists.
     */
    ALWAYS = "always",
    /**
     * Do not sign any origin requests.
     * This value turns off origin access control for all origins in all
     * distributions that use this origin access control.
     */
    NEVER = "never",
    /**
     * Sign origin requests only if the viewer request
     * doesn't contain the Authorization header.
     */
    NO_OVERRIDE = "no-override"
}
/**
 * The signing protocol of the Origin Access Control.
 */
export declare enum SigningProtocol {
    /**
     * The AWS Signature Version 4 signing protocol.
     */
    SIGV4 = "sigv4"
}
/**
 * Options for how CloudFront signs requests.
 */
export declare class Signing {
    /**
     * Sign all origin requests using the AWS Signature Version 4 signing protocol.
     */
    static readonly SIGV4_ALWAYS: Signing;
    /**
     * Sign only if the viewer request doesn't contain the Authorization header
     * using the AWS Signature Version 4 signing protocol.
     */
    static readonly SIGV4_NO_OVERRIDE: Signing;
    /**
     * Do not sign any origin requests.
     */
    static readonly NEVER: Signing;
    /**
     * The signing protocol
     */
    readonly protocol: SigningProtocol;
    /**
     * Which requests CloudFront signs.
     */
    readonly behavior: SigningBehavior;
    constructor(protocol: SigningProtocol, behavior: SigningBehavior);
}
/**
 * An Origin Access Control.
 * @internal
 */
export declare abstract class OriginAccessControlBase extends Resource implements IOriginAccessControl {
    /**
     * The Id of the origin access control
     * @attribute
     */
    abstract readonly originAccessControlId: string;
}
/**
 * An Origin Access Control for Amazon S3 origins.
 * @resource AWS::CloudFront::OriginAccessControl
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudfront-originaccesscontrol.html
 */
export declare class S3OriginAccessControl extends OriginAccessControlBase {
    /**
     * Imports an S3 origin access control from its id.
     */
    static fromOriginAccessControlId(scope: Construct, id: string, originAccessControlId: string): IOriginAccessControl;
    /**
     * The unique identifier of this Origin Access Control.
     * @attribute
     */
    readonly originAccessControlId: string;
    constructor(scope: Construct, id: string, props?: S3OriginAccessControlProps);
}
/**
 * An Origin Access Control for Lambda Function URLs.
 * @resource AWS::CloudFront::OriginAccessControl
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudfront-originaccesscontrol.html
 */
export declare class FunctionUrlOriginAccessControl extends OriginAccessControlBase {
    /**
     * Imports a Lambda Function URL origin access control from its id.
     */
    static fromOriginAccessControlId(scope: Construct, id: string, originAccessControlId: string): IOriginAccessControl;
    /**
     * The unique identifier of this Origin Access Control.
     * @attribute
     */
    readonly originAccessControlId: string;
    constructor(scope: Construct, id: string, props?: FunctionUrlOriginAccessControlProps);
}
