"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_TO_LOGGER = exports.PublishingAws = void 0;
exports.publishAssets = publishAssets;
exports.buildAssets = buildAssets;
const cx_api_1 = require("@aws-cdk/cx-api");
const cdk_assets_1 = require("cdk-assets");
const mode_1 = require("../api/plugin/mode");
const logging_1 = require("../logging");
/**
 * Use cdk-assets to publish all assets in the given manifest.
 */
async function publishAssets(manifest, sdk, targetEnv, options) {
    // This shouldn't really happen (it's a programming error), but we don't have
    // the types here to guide us. Do an runtime validation to be super super sure.
    if (targetEnv.account === undefined ||
        targetEnv.account === cx_api_1.UNKNOWN_ACCOUNT ||
        targetEnv.region === undefined ||
        targetEnv.account === cx_api_1.UNKNOWN_REGION) {
        throw new Error(`Asset publishing requires resolved account and region, got ${JSON.stringify(targetEnv)}`);
    }
    const publisher = new cdk_assets_1.AssetPublishing(manifest, {
        aws: new PublishingAws(sdk, targetEnv),
        progressListener: new PublishingProgressListener(options.quiet ?? false),
        throwOnError: false,
        publishInParallel: options.parallel ?? true,
        buildAssets: options.buildAssets ?? true,
        publishAssets: true,
        quiet: options.quiet,
    });
    await publisher.publish({ allowCrossAccount: options.allowCrossAccount });
    if (publisher.hasFailures) {
        throw new Error('Failed to publish one or more assets. See the error messages above for more information.');
    }
}
/**
 * Use cdk-assets to build all assets in the given manifest.
 */
async function buildAssets(manifest, sdk, targetEnv, options = {}) {
    // This shouldn't really happen (it's a programming error), but we don't have
    // the types here to guide us. Do an runtime validation to be super super sure.
    if (targetEnv.account === undefined ||
        targetEnv.account === cx_api_1.UNKNOWN_ACCOUNT ||
        targetEnv.region === undefined ||
        targetEnv.account === cx_api_1.UNKNOWN_REGION) {
        throw new Error(`Asset building requires resolved account and region, got ${JSON.stringify(targetEnv)}`);
    }
    const publisher = new cdk_assets_1.AssetPublishing(manifest, {
        aws: new PublishingAws(sdk, targetEnv),
        progressListener: new PublishingProgressListener(options.quiet ?? false),
        throwOnError: false,
        publishInParallel: options.parallel ?? true,
        buildAssets: true,
        publishAssets: false,
    });
    await publisher.publish();
    if (publisher.hasFailures) {
        throw new Error('Failed to build one or more assets. See the error messages above for more information.');
    }
}
class PublishingAws {
    constructor(
    /**
     * The base SDK to work with
     */
    aws, 
    /**
     * Environment where the stack we're deploying is going
     */
    targetEnv) {
        this.aws = aws;
        this.targetEnv = targetEnv;
        this.sdkCache = new Map();
    }
    async discoverPartition() {
        return (await this.aws.baseCredentialsPartition(this.targetEnv, mode_1.Mode.ForWriting)) ?? 'aws';
    }
    async discoverDefaultRegion() {
        return this.targetEnv.region;
    }
    async discoverCurrentAccount() {
        const account = await this.aws.defaultAccount();
        return (account ?? {
            accountId: '<unknown account>',
            partition: 'aws',
        });
    }
    async discoverTargetAccount(options) {
        return (await this.sdk(options)).currentAccount();
    }
    async s3Client(options) {
        return (await this.sdk(options)).s3();
    }
    async ecrClient(options) {
        return (await this.sdk(options)).ecr();
    }
    async secretsManagerClient(options) {
        return (await this.sdk(options)).secretsManager();
    }
    /**
     * Get an SDK appropriate for the given client options
     */
    async sdk(options) {
        const env = {
            ...this.targetEnv,
            region: options.region ?? this.targetEnv.region, // Default: same region as the stack
        };
        const cacheKeyMap = {
            env, // region, name, account
            assumeRuleArn: options.assumeRoleArn,
            assumeRoleExternalId: options.assumeRoleExternalId,
            quiet: options.quiet,
        };
        if (options.assumeRoleAdditionalOptions) {
            cacheKeyMap.assumeRoleAdditionalOptions = options.assumeRoleAdditionalOptions;
        }
        const cacheKey = JSON.stringify(cacheKeyMap);
        const maybeSdk = this.sdkCache.get(cacheKey);
        if (maybeSdk) {
            return maybeSdk;
        }
        const sdk = (await this.aws.forEnvironment(env, mode_1.Mode.ForWriting, {
            assumeRoleArn: options.assumeRoleArn,
            assumeRoleExternalId: options.assumeRoleExternalId,
            assumeRoleAdditionalOptions: options.assumeRoleAdditionalOptions,
        }, options.quiet)).sdk;
        this.sdkCache.set(cacheKey, sdk);
        return sdk;
    }
}
exports.PublishingAws = PublishingAws;
exports.EVENT_TO_LOGGER = {
    build: logging_1.debug,
    cached: logging_1.debug,
    check: logging_1.debug,
    debug: logging_1.debug,
    fail: logging_1.error,
    found: logging_1.debug,
    start: logging_1.print,
    success: logging_1.print,
    upload: logging_1.debug,
};
class PublishingProgressListener {
    constructor(quiet) {
        this.quiet = quiet;
    }
    onPublishEvent(type, event) {
        const handler = this.quiet && type !== 'fail' ? logging_1.debug : exports.EVENT_TO_LOGGER[type];
        handler(`[${event.percentComplete}%] ${type}: ${event.message}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtcHVibGlzaGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFzc2V0LXB1Ymxpc2hpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBZ0RBLHNDQThCQztBQW1CRCxrQ0E2QkM7QUE5SEQsNENBQW9GO0FBQ3BGLDJDQVlvQjtBQUdwQiw2Q0FBMEM7QUFDMUMsd0NBQWlEO0FBNEJqRDs7R0FFRztBQUNJLEtBQUssVUFBVSxhQUFhLENBQ2pDLFFBQXVCLEVBQ3ZCLEdBQWdCLEVBQ2hCLFNBQXNCLEVBQ3RCLE9BQTZCO0lBRTdCLDZFQUE2RTtJQUM3RSwrRUFBK0U7SUFDL0UsSUFDRSxTQUFTLENBQUMsT0FBTyxLQUFLLFNBQVM7UUFDL0IsU0FBUyxDQUFDLE9BQU8sS0FBSyx3QkFBZTtRQUNyQyxTQUFTLENBQUMsTUFBTSxLQUFLLFNBQVM7UUFDOUIsU0FBUyxDQUFDLE9BQU8sS0FBSyx1QkFBYyxFQUNwQyxDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyw4REFBOEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN0csQ0FBQztJQUVELE1BQU0sU0FBUyxHQUFHLElBQUksNEJBQWUsQ0FBQyxRQUFRLEVBQUU7UUFDOUMsR0FBRyxFQUFFLElBQUksYUFBYSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUM7UUFDdEMsZ0JBQWdCLEVBQUUsSUFBSSwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUN4RSxZQUFZLEVBQUUsS0FBSztRQUNuQixpQkFBaUIsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLElBQUk7UUFDM0MsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLElBQUksSUFBSTtRQUN4QyxhQUFhLEVBQUUsSUFBSTtRQUNuQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7S0FDckIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxTQUFTLENBQUMsT0FBTyxDQUFDLEVB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QjtZQUNsRCwyQkFBMkIsRUFBRSxPQUFPLENBQUMsMkJBQTJCO1NBQ2pFLEVBQ0QsT0FBTyxDQUFDLEtBQUssQ0FDZCxDQUNGLENBQUMsR0FBRyxDQUFDO1FBQ04sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRWpDLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUNGO0FBNUZELHNDQTRGQztBQUVZLFFBQUEsZUFBZSxHQUEyQztJQUNyRSxLQUFLLEVBQUUsZUFBSztJQUNaLE1BQU0sRUFBRSxlQUFLO0lBQ2IsS0FBSyxFQUFFLGVBQUs7SUFDWixLQUFLLEVBQUwsZUFBSztJQUNMLElBQUksRUFBRSxlQUFLO0lBQ1gsS0FBSyxFQUFFLGVBQUs7SUFDWixLQUFLLEVBQUUsZUFBSztJQUNaLE9BQU8sRUFBRSxlQUFLO0lBQ2QsTUFBTSxFQUFFLGVBQUs7Q0FDZCxDQUFDO0FBRUYsTUFBTSwwQkFBMEI7SUFDOUIsWUFBNkIsS0FBYztRQUFkLFVBQUssR0FBTCxLQUFLLENBQVM7SUFBRyxDQUFDO0lBRXhDLGNBQWMsQ0FBQyxJQUFlLEVBQUUsS0FBdUI7UUFDNUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsQ0FBQyxDQUFDLHVCQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUUsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsTUFBTSxJQUFJLEtBQUssS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdHlwZSBFbnZpcm9ubWVudCwgVU5LTk9XTl9BQ0NPVU5ULCBVTktOT1dOX1JFR0lPTiB9IGZyb20gJ0Bhd3MtY2RrL2N4LWFwaSc7XG5pbXBvcnQge1xuICB0eXBlIEFjY291bnQsXG4gIHR5cGUgQXNzZXRNYW5pZmVzdCxcbiAgQXNzZXRQdWJsaXNoaW5nLFxuICBDbGllbnRPcHRpb25zLFxuICBFdmVudFR5cGUsXG4gIHR5cGUgSUF3cyxcbiAgdHlwZSBJRUNSQ2xpZW50LFxuICB0eXBlIElQdWJsaXNoUHJvZ3Jlc3MsXG4gIHR5cGUgSVB1Ymxpc2hQcm9ncmVzc0xpc3RlbmVyLFxuICB0eXBlIElTM0NsaWVudCxcbiAgdHlwZSBJU2VjcmV0c01hbmFnZXJDbGllbnQsXG59IGZyb20gJ2Nkay1hc3NldHMnO1xuaW1wb3J0IHR5cGUgeyBTREsgfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHR5cGUgeyBTZGtQcm92aWRlciB9IGZyb20gJy4uL2FwaS9hd3MtYXV0aC9zZGstcHJvdmlkZXInO1xuaW1wb3J0IHsgTW9kZSB9IGZyb20gJy4uL2FwaS9wbHVnaW4vbW9kZSc7XG5pbXBvcnQgeyBkZWJ1ZywgZXJyb3IsIHByaW50IH0gZnJvbSAnLi4vbG9nZ2luZyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHVibGlzaEFzc2V0c09wdGlvbnMge1xuICAvKipcbiAgICogUHJpbnQgcHJvZ3Jlc3MgYXQgJ2RlYnVnJyBsZXZlbFxuICAgKi9cbiAgcmVhZG9ubHkgcXVpZXQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGJ1aWxkIGFzc2V0cyBiZWZvcmUgcHVibGlzaGluZy5cbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZSBUbyByZW1haW4gYmFja3dhcmQgY29tcGF0aWJsZS5cbiAgICovXG4gIHJlYWRvbmx5IGJ1aWxkQXNzZXRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBidWlsZC9wdWJsaXNoIGFzc2V0cyBpbiBwYXJhbGxlbFxuICAgKlxuICAgKiBAZGVmYXVsdCB0cnVlIFRvIHJlbWFpbiBiYWNrd2FyZCBjb21wYXRpYmxlLlxuICAgKi9cbiAgcmVhZG9ubHkgcGFyYWxsZWw/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGNkay1hc3NldHMgaXMgYWxsb3dlZCB0byBkbyBjcm9zcyBhY2NvdW50IHB1Ymxpc2hpbmcuXG4gICAqL1xuICByZWFkb25seSBhbGxvd0Nyb3NzQWNjb3VudDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBVc2UgY2RrLWFzc2V0cyB0byBwdWJsaXNoIGFsbCBhc3NldHMgaW4gdGhlIGdpdmVuIG1hbmlmZXN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHVibGlzaEFzc2V0cyhcbiAgbWFuaWZlc3Q6IEFzc2V0TWFuaWZlc3QsXG4gIHNkazogU2RrUHJvdmlkZXIsXG4gIHRhcmdldEVudjogRW52aXJvbm1lbnQsXG4gIG9wdGlvbnM6IFB1Ymxpc2hBc3NldHNPcHRpb25zLFxuKSB7XG4gIC8vIFRoaXMgc2hvdWxkbid0IHJlYWxseSBoYXBwZW4gKGl0J3MgYSBwcm9ncmFtbWluZyBlcnJvciksIGJ1dCB3ZSBkb24ndCBoYXZlXG4gIC8vIHRoZSB0eXBlcyBoZXJlIHRvIGd1aWRlIHVzLiBEbyBhbiBydW50aW1lIHZhbGlkYXRpb24gdG8gYmUgc3VwZXIgc3VwZXIgc3VyZS5cbiAgaWYgKFxuICAgIHRhcmdldEVudi5hY2NvdW50ID09PSB1bmRlZmluZWQgfHxcbiAgICB0YXJnZXRFbnYuYWNjb3VudCA9PT0gVU5LTk9XTl9BQ0NPVU5UIHx8XG4gICAgdGFyZ2V0RW52LnJlZ2lvbiA9PT0gdW5kZWZpbmVkIHx8XG4gICAgdGFyZ2V0RW52LmFjY291bnQgPT09IFVOS05PV05fUkVHSU9OXG4gICkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXQgcHVibGlzaGluZyByZXF1aXJlcyByZXNvbHZlZCBhY2NvdW50IGFuZCByZWdpb24sIGdvdCAke0pTT04uc3RyaW5naWZ5KHRhcmdldEVudil9YCk7XG4gIH1cblxuICBjb25zdCBwdWJsaXNoZXIgPSBuZXcgQXNzZXRQdWJsaXNoaW5nKG1hbmlmZXN0LCB7XG4gICAgYXdzOiBuZXcgUHVibGlzaGluZ0F3cyhzZGssIHRhcmdldEVudiksXG4gICAgcHJvZ3Jlc3NMaXN0ZW5lcjogbmV3IFB1Ymxpc2hpbmdQcm9ncmVzc0xpc3RlbmVyKG9wdGlvbnMucXVpZXQgPz8gZmFsc2UpLFxuICAgIHRocm93T25FcnJvcjogZmFsc2UsXG4gICAgcHVibGlzaEluUGFyYWxsZWw6IG9wdGlvbnMucGFyYWxsZWwgPz8gdHJ1ZSxcbiAgICBidWlsZEFzc2V0czogb3B0aW9ucy5idWlsZEFzc2V0cyA/PyB0cnVlLFxuICAgIHB1Ymxpc2hBc3NldHM6IHRydWUsXG4gICAgcXVpZXQ6IG9wdGlvbnMucXVpZXQsXG4gIH0pO1xuICBhd2FpdCBwdWJsaXNoZXIucHVibGlzaCh7IGFsbG93Q3Jvc3NBY2NvdW50OiBvcHRpb25zLmFsbG93Q3Jvc3NBY2NvdW50IH0pO1xuICBpZiAocHVibGlzaGVyLmhhc0ZhaWx1cmVzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gcHVibGlzaCBvbmUgb3IgbW9yZSBhc3NldHMuIFNlZSB0aGUgZXJyb3IgbWVzc2FnZXMgYWJvdmUgZm9yIG1vcmUgaW5mb3JtYXRpb24uJyk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBCdWlsZEFzc2V0c09wdGlvbnMge1xuICAvKipcbiAgICogUHJpbnQgcHJvZ3Jlc3MgYXQgJ2RlYnVnJyBsZXZlbFxuICAgKi9cbiAgcmVhZG9ubHkgcXVpZXQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBCdWlsZCBhc3NldHMgaW4gcGFyYWxsZWxcbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgcGFyYWxsZWw/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFVzZSBjZGstYXNzZXRzIHRvIGJ1aWxkIGFsbCBhc3NldHMgaW4gdGhlIGdpdmVuIG1hbmlmZXN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVpbGRBc3NldHMoXG4gIG1hbmlmZXN0OiBBc3NldE1hbmlmZXN0LFxuICBzZGs6IFNka1Byb3ZpZGVyLFxuICB0YXJnZXRFbnY6IEVudmlyb25tZW50LFxuICBvcHRpb25zOiBCdWlsZEFzc2V0c09wdGlvbnMgPSB7fSxcbikge1xuICAvLyBUaGlzIHNob3VsZG4ndCByZWFsbHkgaGFwcGVuIChpdCdzIGEgcHJvZ3JhbW1pbmcgZXJyb3IpLCBidXQgd2UgZG9uJ3QgaGF2ZVxuICAvLyB0aGUgdHlwZXMgaGVyZSB0byBndWlkZSB1cy4gRG8gYW4gcnVudGltZSB2YWxpZGF0aW9uIHRvIGJlIHN1cGVyIHN1cGVyIHN1cmUuXG4gIGlmIChcbiAgICB0YXJnZXRFbnYuYWNjb3VudCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgdGFyZ2V0RW52LmFjY291bnQgPT09IFVOS05PV05fQUNDT1VOVCB8fFxuICAgIHRhcmdldEVudi5yZWdpb24gPT09IHVuZGVmaW5lZCB8fFxuICAgIHRhcmdldEVudi5hY2NvdW50ID09PSBVTktOT1dOX1JFR0lPTlxuICApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2V0IGJ1aWxkaW5nIHJlcXVpcmVzIHJlc29sdmVkIGFjY291bnQgYW5kIHJlZ2lvbiwgZ290ICR7SlNPTi5zdHJpbmdpZnkodGFyZ2V0RW52KX1gKTtcbiAgfVxuXG4gIGNvbnN0IHB1Ymxpc2hlciA9IG5ldyBBc3NldFB1Ymxpc2hpbmcobWFuaWZlc3QsIHtcbiAgICBhd3M6IG5ldyBQdWJsaXNoaW5nQXdzKHNkaywgdGFyZ2V0RW52KSxcbiAgICBwcm9ncmVzc0xpc3RlbmVyOiBuZXcgUHVibGlzaGluZ1Byb2dyZXNzTGlzdGVuZXIob3B0aW9ucy5xdWlldCA/PyBmYWxzZSksXG4gICAgdGhyb3dPbkVycm9yOiBmYWxzZSxcbiAgICBwdWJsaXNoSW5QYXJhbGxlbDogb3B0aW9ucy5wYXJhbGxlbCA/PyB0cnVlLFxuICAgIGJ1aWxkQXNzZXRzOiB0cnVlLFxuICAgIHB1Ymxpc2hBc3NldHM6IGZhbHNlLFxuICB9KTtcbiAgYXdhaXQgcHVibGlzaGVyLnB1Ymxpc2goKTtcbiAgaWYgKHB1Ymxpc2hlci5oYXNGYWlsdXJlcykge1xuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGJ1aWxkIG9uZSBvciBtb3JlIGFzc2V0cy4gU2VlIHRoZSBlcnJvciBtZXNzYWdlcyBhYm92ZSBmb3IgbW9yZSBpbmZvcm1hdGlvbi4nKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUHVibGlzaGluZ0F3cyBpbXBsZW1lbnRzIElBd3Mge1xuICBwcml2YXRlIHNka0NhY2hlOiBNYXA8U3RyaW5nLCBTREs+ID0gbmV3IE1hcCgpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIFNESyB0byB3b3JrIHdpdGhcbiAgICAgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IGF3czogU2RrUHJvdmlkZXIsXG5cbiAgICAvKipcbiAgICAgKiBFbnZpcm9ubWVudCB3aGVyZSB0aGUgc3RhY2sgd2UncmUgZGVwbG95aW5nIGlzIGdvaW5nXG4gICAgICovXG4gICAgcHJpdmF0ZSByZWFkb25seSB0YXJnZXRFbnY6IEVudmlyb25tZW50LFxuICApIHt9XG5cbiAgcHVibGljIGFzeW5jIGRpc2NvdmVyUGFydGl0aW9uKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLmF3cy5iYXNlQ3JlZGVudGlhbHNQYXJ0aXRpb24odGhpcy50YXJnZXRFbnYsIE1vZGUuRm9yV3JpdGluZykpID8/ICdhd3MnO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGRpc2NvdmVyRGVmYXVsdFJlZ2lvbigpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiB0aGlzLnRhcmdldEVudi5yZWdpb247XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZGlzY292ZXJDdXJyZW50QWNjb3VudCgpOiBQcm9taXNlPEFjY291bnQ+IHtcbiAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgdGhpcy5hd3MuZGVmYXVsdEFjY291bnQoKTtcbiAgICByZXR1cm4gKFxuICAgICAgYWNjb3VudCA/PyB7XG4gICAgICAgIGFjY291bnRJZDogJzx1bmtub3duIGFjY291bnQ+JyxcbiAgICAgICAgcGFydGl0aW9uOiAnYXdzJyxcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGRpc2NvdmVyVGFyZ2V0QWNjb3VudChvcHRpb25zOiBDbGllbnRPcHRpb25zKTogUHJvbWlzZTxBY2NvdW50PiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLnNkayhvcHRpb25zKSkuY3VycmVudEFjY291bnQoKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzM0NsaWVudChvcHRpb25zOiBDbGllbnRPcHRpb25zKTogUHJvbWlzZTxJUzNDbGllbnQ+IHtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMuc2RrKG9wdGlvbnMpKS5zMygpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGVjckNsaWVudChvcHRpb25zOiBDbGllbnRPcHRpb25zKTogUHJvbWlzZTxJRUNSQ2xpZW50PiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLnNkayhvcHRpb25zKSkuZWNyKCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2VjcmV0c01hbmFnZXJDbGllbnQob3B0aW9uczogQ2xpZW50T3B0aW9ucyk6IFByb21pc2U8SVNlY3JldHNNYW5hZ2VyQ2xpZW50PiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLnNkayhvcHRpb25zKSkuc2VjcmV0c01hbmFnZXIoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYW4gU0RLIGFwcHJvcHJpYXRlIGZvciB0aGUgZ2l2ZW4gY2xpZW50IG9wdGlvbnNcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgc2RrKG9wdGlvbnM6IENsaWVudE9wdGlvbnMpOiBQcm9taXNlPFNESz4ge1xuICAgIGNvbnN0IGVudiA9IHtcbiAgICAgIC4uLnRoaXMudGFyZ2V0RW52LFxuICAgICAgcmVnaW9uOiBvcHRpb25zLnJlZ2lvbiA/PyB0aGlzLnRhcmdldEVudi5yZWdpb24sIC8vIERlZmF1bHQ6IHNhbWUgcmVnaW9uIGFzIHRoZSBzdGFja1xuICAgIH07XG5cbiAgICBjb25zdCBjYWNoZUtleU1hcDogYW55ID0ge1xuICAgICAgZW52LCAvLyByZWdpb24sIG5hbWUsIGFjY291bnRcbiAgICAgIGFzc3VtZVJ1bGVBcm46IG9wdGlvbnMuYXNzdW1lUm9sZUFybixcbiAgICAgIGFzc3VtZVJvbGVFeHRlcm5hbElkOiBvcHRpb25zLmFzc3VtZVJvbGVFeHRlcm5hbElkLFxuICAgICAgcXVpZXQ6IG9wdGlvbnMucXVpZXQsXG4gICAgfTtcblxuICAgIGlmIChvcHRpb25zLmFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucykge1xuICAgICAgY2FjaGVLZXlNYXAuYXNzdW1lUm9sZUFkZGl0aW9uYWxPcHRpb25zID0gb3B0aW9ucy5hc3N1bWVSb2xlQWRkaXRpb25hbE9wdGlvbnM7XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGVLZXkgPSBKU09OLnN0cmluZ2lmeShjYWNoZUtleU1hcCk7XG5cbiAgICBjb25zdCBtYXliZVNkayA9IHRoaXMuc2RrQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgICBpZiAobWF5YmVTZGspIHtcbiAgICAgIHJldHVybiBtYXliZVNkaztcbiAgICB9XG5cbiAgICBjb25zdCBzZGsgPSAoXG4gICAgICBhd2FpdCB0aGlzLmF3cy5mb3JFbnZpcm9ubWVudChcbiAgICAgICAgZW52LFxuICAgICAgICBNb2RlLkZvcldyaXRpbmcsXG4gICAgICAgIHtcbiAgICAgICAgICBhc3N1bWVSb2xlQXJuOiBvcHRpb25zLmFzc3VtZVJvbGVBcm4sXG4gICAgICAgICAgYXNzdW1lUm9sZUV4dGVybmFsSWQ6IG9wdGlvbnMuYXNzdW1lUm9sZUV4dGVybmFsSWQsXG4gICAgICAgICAgYXNzdW1lUm9sZUFkZGl0aW9uYWxPcHRpb25zOiBvcHRpb25zLmFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucyxcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aW9ucy5xdWlldCxcbiAgICAgIClcbiAgICApLnNkaztcbiAgICB0aGlzLnNka0NhY2hlLnNldChjYWNoZUtleSwgc2RrKTtcblxuICAgIHJldHVybiBzZGs7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IEVWRU5UX1RPX0xPR0dFUjogUmVjb3JkPEV2ZW50VHlwZSwgKHg6IHN0cmluZykgPT4gdm9pZD4gPSB7XG4gIGJ1aWxkOiBkZWJ1ZyxcbiAgY2FjaGVkOiBkZWJ1ZyxcbiAgY2hlY2s6IGRlYnVnLFxuICBkZWJ1ZyxcbiAgZmFpbDogZXJyb3IsXG4gIGZvdW5kOiBkZWJ1ZyxcbiAgc3RhcnQ6IHByaW50LFxuICBzdWNjZXNzOiBwcmludCxcbiAgdXBsb2FkOiBkZWJ1Zyxcbn07XG5cbmNsYXNzIFB1Ymxpc2hpbmdQcm9ncmVzc0xpc3RlbmVyIGltcGxlbWVudHMgSVB1Ymxpc2hQcm9ncmVzc0xpc3RlbmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBxdWlldDogYm9vbGVhbikge31cblxuICBwdWJsaWMgb25QdWJsaXNoRXZlbnQodHlwZTogRXZlbnRUeXBlLCBldmVudDogSVB1Ymxpc2hQcm9ncmVzcyk6IHZvaWQge1xuICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLnF1aWV0ICYmIHR5cGUgIT09ICdmYWlsJyA/IGRlYnVnIDogRVZFTlRfVE9fTE9HR0VSW3R5cGVdO1xuICAgIGhhbmRsZXIoYFske2V2ZW50LnBlcmNlbnRDb21wbGV0ZX0lXSAke3R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gIH1cbn1cbiJdfQ==