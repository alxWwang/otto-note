import type { AmiContextQuery } from '@aws-cdk/cloud-assembly-schema';
import { type SdkProvider } from '../api/aws-auth/sdk-provider';
import { ContextProviderPlugin } from '../api/plugin';
/**
 * Plugin to search AMIs for the current account
 */
export declare class AmiContextProviderPlugin implements ContextProviderPlugin {
    private readonly aws;
    constructor(aws: SdkProvider);
    getValue(args: AmiContextQuery): Promise<string>;
}
