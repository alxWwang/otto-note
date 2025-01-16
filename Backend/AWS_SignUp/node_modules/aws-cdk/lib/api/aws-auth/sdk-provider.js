"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SdkProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SdkProvider = void 0;
exports.initContextProviderSdk = initContextProviderSdk;
const os = require("os");
const cx_api_1 = require("@aws-cdk/cx-api");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const awscli_compatible_1 = require("./awscli-compatible");
const cached_1 = require("./cached");
const credential_plugins_1 = require("./credential-plugins");
const provider_caching_1 = require("./provider-caching");
const sdk_1 = require("./sdk");
const logging_1 = require("../../logging");
const error_1 = require("../../toolkit/error");
const tracing_1 = require("../../util/tracing");
const mode_1 = require("../plugin/mode");
const CACHED_ACCOUNT = Symbol('cached_account');
/**
 * Creates instances of the AWS SDK appropriate for a given account/region.
 *
 * Behavior is as follows:
 *
 * - First, a set of "base" credentials are established
 *   - If a target environment is given and the default ("current") SDK credentials are for
 *     that account, return those; otherwise
 *   - If a target environment is given, scan all credential provider plugins
 *     for credentials, and return those if found; otherwise
 *   - Return default ("current") SDK credentials, noting that they might be wrong.
 *
 * - Second, a role may optionally need to be assumed. Use the base credentials
 *   established in the previous process to assume that role.
 *   - If assuming the role fails and the base credentials are for the correct
 *     account, return those. This is a fallback for people who are trying to interact
 *     with a Default Synthesized stack and already have right credentials setup.
 *
 *     Typical cases we see in the wild:
 *     - Credential plugin setup that, although not recommended, works for them
 *     - Seeded terminal with `ReadOnly` credentials in order to do `cdk diff`--the `ReadOnly`
 *       role doesn't have `sts:AssumeRole` and will fail for no real good reason.
 */
let SdkProvider = SdkProvider_1 = class SdkProvider {
    /**
     * Create a new SdkProvider which gets its defaults in a way that behaves like the AWS CLI does
     *
     * The AWS SDK for JS behaves slightly differently from the AWS CLI in a number of ways; see the
     * class `AwsCliCompatible` for the details.
     */
    static async withAwsCliCompatibleDefaults(options = {}) {
        const credentialProvider = await awscli_compatible_1.AwsCliCompatible.credentialChainBuilder({
            profile: options.profile,
            httpOptions: options.httpOptions,
            logger: options.logger,
        });
        const region = await awscli_compatible_1.AwsCliCompatible.region(options.profile);
        const requestHandler = awscli_compatible_1.AwsCliCompatible.requestHandlerBuilder(options.httpOptions);
        return new SdkProvider_1(credentialProvider, region, requestHandler, options.logger);
    }
    constructor(defaultCredentialProvider, 
    /**
     * Default region
     */
    defaultRegion, requestHandler = {}, logger) {
        this.defaultCredentialProvider = defaultCredentialProvider;
        this.defaultRegion = defaultRegion;
        this.requestHandler = requestHandler;
        this.logger = logger;
        this.plugins = new credential_plugins_1.CredentialPlugins();
    }
    /**
     * Return an SDK which can do operations in the given environment
     *
     * The `environment` parameter is resolved first (see `resolveEnvironment()`).
     */
    async forEnvironment(environment, mode, options, quiet = false) {
        const env = await this.resolveEnvironment(environment);
        const baseCreds = await this.obtainBaseCredentials(env.account, mode);
        // At this point, we need at least SOME credentials
        if (baseCreds.source === 'none') {
            throw new error_1.AuthenticationError(fmtObtainCredentialsError(env.account, baseCreds));
        }
        // Simple case is if we don't need to "assumeRole" here. If so, we must now have credentials for the right
        // account.
        if (options?.assumeRoleArn === undefined) {
            if (baseCreds.source === 'incorrectDefault') {
                throw new error_1.AuthenticationError(fmtObtainCredentialsError(env.account, baseCreds));
            }
            // Our current credentials must be valid and not expired. Confirm that before we get into doing
            // actual CloudFormation calls, which might take a long time to hang.
            const sdk = new sdk_1.SDK(baseCreds.credentials, env.region, this.requestHandler, this.logger);
            await sdk.validateCredentials();
            return { sdk, didAssumeRole: false };
        }
        try {
            // We will proceed to AssumeRole using whatever we've been given.
            const sdk = await this.withAssumedRole(baseCreds, options.assumeRoleArn, options.assumeRoleExternalId, options.assumeRoleAdditionalOptions, env.region);
            return { sdk, didAssumeRole: true };
        }
        catch (err) {
            if (err.name === 'ExpiredToken') {
                throw err;
            }
            // AssumeRole failed. Proceed and warn *if and only if* the baseCredentials were already for the right account
            // or returned from a plugin. This is to cover some current setups for people using plugins or preferring to
            // feed the CLI credentials which are sufficient by themselves. Prefer to assume the correct role if we can,
            // but if we can't then let's just try with available credentials anyway.
            if (baseCreds.source === 'correctDefault' || baseCreds.source === 'plugin') {
                (0, logging_1.debug)(err.message);
                const logger = quiet ? logging_1.debug : logging_1.warning;
                logger(`${fmtObtainedCredentials(baseCreds)} could not be used to assume '${options.assumeRoleArn}', but are for the right account. Proceeding anyway.`);
                return {
                    sdk: new sdk_1.SDK(baseCreds.credentials, env.region, this.requestHandler, this.logger),
                    didAssumeRole: false,
                };
            }
            throw err;
        }
    }
    /**
     * Return the partition that base credentials are for
     *
     * Returns `undefined` if there are no base credentials.
     */
    async baseCredentialsPartition(environment, mode) {
        const env = await this.resolveEnvironment(environment);
        const baseCreds = await this.obtainBaseCredentials(env.account, mode);
        if (baseCreds.source === 'none') {
            return undefined;
        }
        return (await new sdk_1.SDK(baseCreds.credentials, env.region, this.requestHandler, this.logger).currentAccount()).partition;
    }
    /**
     * Resolve the environment for a stack
     *
     * Replaces the magic values `UNKNOWN_REGION` and `UNKNOWN_ACCOUNT`
     * with the defaults for the current SDK configuration (`~/.aws/config` or
     * otherwise).
     *
     * It is an error if `UNKNOWN_ACCOUNT` is used but the user hasn't configured
     * any SDK credentials.
     */
    async resolveEnvironment(env) {
        const region = env.region !== cx_api_1.UNKNOWN_REGION ? env.region : this.defaultRegion;
        const account = env.account !== cx_api_1.UNKNOWN_ACCOUNT ? env.account : (await this.defaultAccount())?.accountId;
        if (!account) {
            throw new error_1.AuthenticationError('Unable to resolve AWS account to use. It must be either configured when you define your CDK Stack, or through the environment');
        }
        return {
            region,
            account,
            name: cx_api_1.EnvironmentUtils.format(account, region),
        };
    }
    /**
     * The account we'd auth into if we used default credentials.
     *
     * Default credentials are the set of ambiently configured credentials using
     * one of the environment variables, or ~/.aws/credentials, or the *one*
     * profile that was passed into the CLI.
     *
     * Might return undefined if there are no default/ambient credentials
     * available (in which case the user should better hope they have
     * credential plugins configured).
     *
     * Uses a cache to avoid STS calls if we don't need 'em.
     */
    async defaultAccount() {
        return (0, cached_1.cached)(this, CACHED_ACCOUNT, async () => {
            try {
                return await new sdk_1.SDK(this.defaultCredentialProvider, this.defaultRegion, this.requestHandler, this.logger).currentAccount();
            }
            catch (e) {
                // Treat 'ExpiredToken' specially. This is a common situation that people may find themselves in, and
                // they are complaining about if we fail 'cdk synth' on them. We loudly complain in order to show that
                // the current situation is probably undesirable, but we don't fail.
                if (e.name === 'ExpiredToken') {
                    (0, logging_1.warning)('There are expired AWS credentials in your environment. The CDK app will synth without current account information.');
                    return undefined;
                }
                (0, logging_1.debug)(`Unable to determine the default AWS account (${e.name}): ${e.message}`);
                return undefined;
            }
        });
    }
    /**
     * Get credentials for the given account ID in the given mode
     *
     * 1. Use the default credentials if the destination account matches the
     *    current credentials' account.
     * 2. Otherwise try all credential plugins.
     * 3. Fail if neither of these yield any credentials.
     * 4. Return a failure if any of them returned credentials
     */
    async obtainBaseCredentials(accountId, mode) {
        // First try 'current' credentials
        const defaultAccountId = (await this.defaultAccount())?.accountId;
        if (defaultAccountId === accountId) {
            return {
                source: 'correctDefault',
                credentials: await this.defaultCredentialProvider,
            };
        }
        // Then try the plugins
        const pluginCreds = await this.plugins.fetchCredentialsFor(accountId, mode);
        if (pluginCreds) {
            return { source: 'plugin', ...pluginCreds };
        }
        // Fall back to default credentials with a note that they're not the right ones yet
        if (defaultAccountId !== undefined) {
            return {
                source: 'incorrectDefault',
                accountId: defaultAccountId,
                credentials: await this.defaultCredentialProvider,
                unusedPlugins: this.plugins.availablePluginNames,
            };
        }
        // Apparently we didn't find any at all
        return {
            source: 'none',
            unusedPlugins: this.plugins.availablePluginNames,
        };
    }
    /**
     * Return an SDK which uses assumed role credentials
     *
     * The base credentials used to retrieve the assumed role credentials will be the
     * same credentials returned by obtainCredentials if an environment and mode is passed,
     * otherwise it will be the current credentials.
     */
    async withAssumedRole(mainCredentials, roleArn, externalId, additionalOptions, region) {
        (0, logging_1.debug)(`Assuming role '${roleArn}'.`);
        region = region ?? this.defaultRegion;
        const sourceDescription = fmtObtainedCredentials(mainCredentials);
        try {
            const credentials = await (0, provider_caching_1.makeCachingProvider)((0, credential_providers_1.fromTemporaryCredentials)({
                masterCredentials: mainCredentials.credentials,
                params: {
                    RoleArn: roleArn,
                    ExternalId: externalId,
                    RoleSessionName: `aws-cdk-${safeUsername()}`,
                    ...additionalOptions,
                    TransitiveTagKeys: additionalOptions?.Tags ? additionalOptions.Tags.map((t) => t.Key) : undefined,
                },
                clientConfig: {
                    region,
                    requestHandler: this.requestHandler,
                    customUserAgent: 'aws-cdk',
                    logger: this.logger,
                },
                logger: this.logger,
            }));
            // Call the provider at least once here, to catch an error if it occurs
            await credentials();
            return new sdk_1.SDK(credentials, region, this.requestHandler, this.logger);
        }
        catch (err) {
            if (err.name === 'ExpiredToken') {
                throw err;
            }
            (0, logging_1.debug)(`Assuming role failed: ${err.message}`);
            throw new error_1.AuthenticationError([
                'Could not assume role in target account',
                ...(sourceDescription ? [`using ${sourceDescription}`] : []),
                err.message,
                ". Please make sure that this role exists in the account. If it doesn't exist, (re)-bootstrap the environment " +
                    "with the right '--trust', using the latest version of the CDK CLI.",
            ].join(' '));
        }
    }
};
exports.SdkProvider = SdkProvider;
exports.SdkProvider = SdkProvider = SdkProvider_1 = __decorate([
    tracing_1.traceMethods
], SdkProvider);
/**
 * Return the username with characters invalid for a RoleSessionName removed
 *
 * @see https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html#API_AssumeRole_RequestParameters
 */
function safeUsername() {
    try {
        return os.userInfo().username.replace(/[^\w+=,.@-]/g, '@');
    }
    catch {
        return 'noname';
    }
}
/**
 * Isolating the code that translates calculation errors into human error messages
 *
 * We cover the following cases:
 *
 * - No credentials are available at all
 * - Default credentials are for the wrong account
 */
function fmtObtainCredentialsError(targetAccountId, obtainResult) {
    const msg = [`Need to perform AWS calls for account ${targetAccountId}`];
    switch (obtainResult.source) {
        case 'incorrectDefault':
            msg.push(`but the current credentials are for ${obtainResult.accountId}`);
            break;
        case 'none':
            msg.push('but no credentials have been configured');
    }
    if (obtainResult.unusedPlugins.length > 0) {
        msg.push(`and none of these plugins found any: ${obtainResult.unusedPlugins.join(', ')}`);
    }
    return msg.join(', ');
}
/**
 * Format a message indicating where we got base credentials for the assume role
 *
 * We cover the following cases:
 *
 * - Default credentials for the right account
 * - Default credentials for the wrong account
 * - Credentials returned from a plugin
 */
function fmtObtainedCredentials(obtainResult) {
    switch (obtainResult.source) {
        case 'correctDefault':
            return 'current credentials';
        case 'plugin':
            return `credentials returned by plugin '${obtainResult.pluginName}'`;
        case 'incorrectDefault':
            const msg = [];
            msg.push(`current credentials (which are for account ${obtainResult.accountId}`);
            if (obtainResult.unusedPlugins.length > 0) {
                msg.push(`, and none of the following plugins provided credentials: ${obtainResult.unusedPlugins.join(', ')}`);
            }
            msg.push(')');
            return msg.join('');
    }
}
/**
 * Instantiate an SDK for context providers. This function ensures that all
 * lookup assume role options are used when context providers perform lookups.
 */
async function initContextProviderSdk(aws, options) {
    const account = options.account;
    const region = options.region;
    const creds = {
        assumeRoleArn: options.lookupRoleArn,
        assumeRoleExternalId: options.lookupRoleExternalId,
        assumeRoleAdditionalOptions: options.assumeRoleAdditionalOptions,
    };
    return (await aws.forEnvironment(cx_api_1.EnvironmentUtils.make(account, region), mode_1.Mode.ForReading, creds)).sdk;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2RrLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2RrLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFzZ0JBLHdEQVdDO0FBamhCRCx5QkFBeUI7QUFFekIsNENBQWlHO0FBRWpHLHdFQUF5RTtBQUd6RSwyREFBdUQ7QUFDdkQscUNBQWtDO0FBQ2xDLDZEQUF5RDtBQUN6RCx5REFBeUQ7QUFDekQsK0JBQTRCO0FBQzVCLDJDQUErQztBQUMvQywrQ0FBMEQ7QUFDMUQsZ0RBQWtEO0FBQ2xELHlDQUFzQztBQTZDdEMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUE2QmhEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0JHO0FBRUksSUFBTSxXQUFXLG1CQUFqQixNQUFNLFdBQVc7SUFDdEI7Ozs7O09BS0c7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLFVBQThCLEVBQUU7UUFDL0UsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLG9DQUFnQixDQUFDLHNCQUFzQixDQUFDO1lBQ3ZFLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sb0NBQWdCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5RCxNQUFNLGNBQWMsR0FBRyxvQ0FBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkYsT0FBTyxJQUFJLGFBQVcsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBSUQsWUFDbUIseUJBQXdEO0lBQ3pFOztPQUVHO0lBQ2EsYUFB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LElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUUsV0FBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN4RyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHsgQ29udGV4dExvb2t1cFJvbGVPcHRpb25zIH0gZnJvbSAnQGF3cy1jZGsvY2xvdWQtYXNzZW1ibHktc2NoZW1hJztcbmltcG9ydCB7IEVudmlyb25tZW50LCBFbnZpcm9ubWVudFV0aWxzLCBVTktOT1dOX0FDQ09VTlQsIFVOS05PV05fUkVHSU9OIH0gZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCB7IEFzc3VtZVJvbGVDb21tYW5kSW5wdXQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3RzJztcbmltcG9ydCB7IGZyb21UZW1wb3JhcnlDcmVkZW50aWFscyB9IGZyb20gJ0Bhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXJzJztcbmltcG9ydCB0eXBlIHsgTm9kZUh0dHBIYW5kbGVyT3B0aW9ucyB9IGZyb20gJ0BzbWl0aHkvbm9kZS1odHRwLWhhbmRsZXInO1xuaW1wb3J0IHsgQXdzQ3JlZGVudGlhbElkZW50aXR5UHJvdmlkZXIsIExvZ2dlciB9IGZyb20gJ0BzbWl0aHkvdHlwZXMnO1xuaW1wb3J0IHsgQXdzQ2xpQ29tcGF0aWJsZSB9IGZyb20gJy4vYXdzY2xpLWNvbXBhdGlibGUnO1xuaW1wb3J0IHsgY2FjaGVkIH0gZnJvbSAnLi9jYWNoZWQnO1xuaW1wb3J0IHsgQ3JlZGVudGlhbFBsdWdpbnMgfSBmcm9tICcuL2NyZWRlbnRpYWwtcGx1Z2lucyc7XG5pbXBvcnQgeyBtYWtlQ2FjaGluZ1Byb3ZpZGVyIH0gZnJvbSAnLi9wcm92aWRlci1jYWNoaW5nJztcbmltcG9ydCB7IFNESyB9IGZyb20gJy4vc2RrJztcbmltcG9ydCB7IGRlYnVnLCB3YXJuaW5nIH0gZnJvbSAnLi4vLi4vbG9nZ2luZyc7XG5pbXBvcnQgeyBBdXRoZW50aWNhdGlvbkVycm9yIH0gZnJvbSAnLi4vLi4vdG9vbGtpdC9lcnJvcic7XG5pbXBvcnQgeyB0cmFjZU1ldGhvZHMgfSBmcm9tICcuLi8uLi91dGlsL3RyYWNpbmcnO1xuaW1wb3J0IHsgTW9kZSB9IGZyb20gJy4uL3BsdWdpbi9tb2RlJztcblxuZXhwb3J0IHR5cGUgQXNzdW1lUm9sZUFkZGl0aW9uYWxPcHRpb25zID0gUGFydGlhbDxPbWl0PEFzc3VtZVJvbGVDb21tYW5kSW5wdXQsICdFeHRlcm5hbElkJyB8ICdSb2xlQXJuJz4+O1xuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHRoZSBkZWZhdWx0IFNESyBwcm92aWRlclxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNka1Byb3ZpZGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBQcm9maWxlIHRvIHJlYWQgZnJvbSB+Ly5hd3NcbiAgICpcbiAgICogQGRlZmF1bHQgLSBObyBwcm9maWxlXG4gICAqL1xuICByZWFkb25seSBwcm9maWxlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIVFRQIG9wdGlvbnMgZm9yIFNES1xuICAgKi9cbiAgcmVhZG9ubHkgaHR0cE9wdGlvbnM/OiBTZGtIdHRwT3B0aW9ucztcblxuICAvKipcbiAgICogVGhlIGxvZ2dlciBmb3Igc2RrIGNhbGxzLlxuICAgKi9cbiAgcmVhZG9ubHkgbG9nZ2VyPzogTG9nZ2VyO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIGluZGl2aWR1YWwgU0RLc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFNka0h0dHBPcHRpb25zIHtcbiAgLyoqXG4gICAqIFByb3h5IGFkZHJlc3MgdG8gdXNlXG4gICAqXG4gICAqIEBkZWZhdWx0IE5vIHByb3h5XG4gICAqL1xuICByZWFkb25seSBwcm94eUFkZHJlc3M/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEEgcGF0aCB0byBhIGNlcnRpZmljYXRlIGJ1bmRsZSB0aGF0IGNvbnRhaW5zIGEgY2VydCB0byBiZSB0cnVzdGVkLlxuICAgKlxuICAgKiBAZGVmYXVsdCBObyBjZXJ0aWZpY2F0ZSBidW5kbGVcbiAgICovXG4gIHJlYWRvbmx5IGNhQnVuZGxlUGF0aD86IHN0cmluZztcbn1cblxuY29uc3QgQ0FDSEVEX0FDQ09VTlQgPSBTeW1ib2woJ2NhY2hlZF9hY2NvdW50Jyk7XG5cbi8qKlxuICogU0RLIGNvbmZpZ3VyYXRpb24gZm9yIGEgZ2l2ZW4gZW52aXJvbm1lbnRcbiAqICdmb3JFbnZpcm9ubWVudCcgd2lsbCBhdHRlbXB0IHRvIGFzc3VtZSBhIHJvbGUgYW5kIGlmIGl0XG4gKiBpcyBub3Qgc3VjY2Vzc2Z1bCwgdGhlbiBpdCB3aWxsIGVpdGhlcjpcbiAqICAgMS4gQ2hlY2sgdG8gc2VlIGlmIHRoZSBkZWZhdWx0IGNyZWRlbnRpYWxzIChsb2NhbCBjcmVkZW50aWFscyB0aGUgQ0xJIHdhcyBleGVjdXRlZCB3aXRoKVxuICogICAgICBhcmUgZm9yIHRoZSBnaXZlbiBlbnZpcm9ubWVudC4gSWYgdGhleSBhcmUgdGhlbiByZXR1cm4gdGhvc2UuXG4gKiAgIDIuIElmIHRoZSBkZWZhdWx0IGNyZWRlbnRpYWxzIGFyZSBub3QgZm9yIHRoZSBnaXZlbiBlbnZpcm9ubWVudCB0aGVuXG4gKiAgICAgIHRocm93IGFuIGVycm9yXG4gKlxuICogJ2RpZEFzc3VtZVJvbGUnIGFsbG93cyBjYWxsZXJzIHRvIHdoZXRoZXIgdGhleSBhcmUgcmVjZWl2aW5nIHRoZSBhc3N1bWUgcm9sZVxuICogY3JlZGVudGlhbHMgb3IgdGhlIGRlZmF1bHQgY3JlZGVudGlhbHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2RrRm9yRW52aXJvbm1lbnQge1xuICAvKipcbiAgICogVGhlIFNESyBmb3IgdGhlIGdpdmVuIGVudmlyb25tZW50XG4gICAqL1xuICByZWFkb25seSBzZGs6IFNESztcblxuICAvKipcbiAgICogV2hldGhlciBvciBub3QgdGhlIGFzc3VtZSByb2xlIHdhcyBzdWNjZXNzZnVsLlxuICAgKiBJZiB0aGUgYXNzdW1lIHJvbGUgd2FzIG5vdCBzdWNjZXNzZnVsIChmYWxzZSlcbiAgICogdGhlbiB0aGF0IG1lYW5zIHRoYXQgdGhlICdzZGsnIHJldHVybmVkIGNvbnRhaW5zXG4gICAqIHRoZSBkZWZhdWx0IGNyZWRlbnRpYWxzIChub3QgdGhlIGFzc3VtZSByb2xlIGNyZWRlbnRpYWxzKVxuICAgKi9cbiAgcmVhZG9ubHkgZGlkQXNzdW1lUm9sZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGluc3RhbmNlcyBvZiB0aGUgQVdTIFNESyBhcHByb3ByaWF0ZSBmb3IgYSBnaXZlbiBhY2NvdW50L3JlZ2lvbi5cbiAqXG4gKiBCZWhhdmlvciBpcyBhcyBmb2xsb3dzOlxuICpcbiAqIC0gRmlyc3QsIGEgc2V0IG9mIFwiYmFzZVwiIGNyZWRlbnRpYWxzIGFyZSBlc3RhYmxpc2hlZFxuICogICAtIElmIGEgdGFyZ2V0IGVudmlyb25tZW50IGlzIGdpdmVuIGFuZCB0aGUgZGVmYXVsdCAoXCJjdXJyZW50XCIpIFNESyBjcmVkZW50aWFscyBhcmUgZm9yXG4gKiAgICAgdGhhdCBhY2NvdW50LCByZXR1cm4gdGhvc2U7IG90aGVyd2lzZVxuICogICAtIElmIGEgdGFyZ2V0IGVudmlyb25tZW50IGlzIGdpdmVuLCBzY2FuIGFsbCBjcmVkZW50aWFsIHByb3ZpZGVyIHBsdWdpbnNcbiAqICAgICBmb3IgY3JlZGVudGlhbHMsIGFuZCByZXR1cm4gdGhvc2UgaWYgZm91bmQ7IG90aGVyd2lzZVxuICogICAtIFJldHVybiBkZWZhdWx0IChcImN1cnJlbnRcIikgU0RLIGNyZWRlbnRpYWxzLCBub3RpbmcgdGhhdCB0aGV5IG1pZ2h0IGJlIHdyb25nLlxuICpcbiAqIC0gU2Vjb25kLCBhIHJvbGUgbWF5IG9wdGlvbmFsbHkgbmVlZCB0byBiZSBhc3N1bWVkLiBVc2UgdGhlIGJhc2UgY3JlZGVudGlhbHNcbiAqICAgZXN0YWJsaXNoZWQgaW4gdGhlIHByZXZpb3VzIHByb2Nlc3MgdG8gYXNzdW1lIHRoYXQgcm9sZS5cbiAqICAgLSBJZiBhc3N1bWluZyB0aGUgcm9sZSBmYWlscyBhbmQgdGhlIGJhc2UgY3JlZGVudGlhbHMgYXJlIGZvciB0aGUgY29ycmVjdFxuICogICAgIGFjY291bnQsIHJldHVybiB0aG9zZS4gVGhpcyBpcyBhIGZhbGxiYWNrIGZvciBwZW9wbGUgd2hvIGFyZSB0cnlpbmcgdG8gaW50ZXJhY3RcbiAqICAgICB3aXRoIGEgRGVmYXVsdCBTeW50aGVzaXplZCBzdGFjayBhbmQgYWxyZWFkeSBoYXZlIHJpZ2h0IGNyZWRlbnRpYWxzIHNldHVwLlxuICpcbiAqICAgICBUeXBpY2FsIGNhc2VzIHdlIHNlZSBpbiB0aGUgd2lsZDpcbiAqICAgICAtIENyZWRlbnRpYWwgcGx1Z2luIHNldHVwIHRoYXQsIGFsdGhvdWdoIG5vdCByZWNvbW1lbmRlZCwgd29ya3MgZm9yIHRoZW1cbiAqICAgICAtIFNlZWRlZCB0ZXJtaW5hbCB3aXRoIGBSZWFkT25seWAgY3JlZGVudGlhbHMgaW4gb3JkZXIgdG8gZG8gYGNkayBkaWZmYC0tdGhlIGBSZWFkT25seWBcbiAqICAgICAgIHJvbGUgZG9lc24ndCBoYXZlIGBzdHM6QXNzdW1lUm9sZWAgYW5kIHdpbGwgZmFpbCBmb3Igbm8gcmVhbCBnb29kIHJlYXNvbi5cbiAqL1xuQHRyYWNlTWV0aG9kc1xuZXhwb3J0IGNsYXNzIFNka1Byb3ZpZGVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBTZGtQcm92aWRlciB3aGljaCBnZXRzIGl0cyBkZWZhdWx0cyBpbiBhIHdheSB0aGF0IGJlaGF2ZXMgbGlrZSB0aGUgQVdTIENMSSBkb2VzXG4gICAqXG4gICAqIFRoZSBBV1MgU0RLIGZvciBKUyBiZWhhdmVzIHNsaWdodGx5IGRpZmZlcmVudGx5IGZyb20gdGhlIEFXUyBDTEkgaW4gYSBudW1iZXIgb2Ygd2F5czsgc2VlIHRoZVxuICAgKiBjbGFzcyBgQXdzQ2xpQ29tcGF0aWJsZWAgZm9yIHRoZSBkZXRhaWxzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBhc3luYyB3aXRoQXdzQ2xpQ29tcGF0aWJsZURlZmF1bHRzKG9wdGlvbnM6IFNka1Byb3ZpZGVyT3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgY3JlZGVudGlhbFByb3ZpZGVyID0gYXdhaXQgQXdzQ2xpQ29tcGF0aWJsZS5jcmVkZW50aWFsQ2hhaW5CdWlsZGVyKHtcbiAgICAgIHByb2ZpbGU6IG9wdGlvbnMucHJvZmlsZSxcbiAgICAgIGh0dHBPcHRpb25zOiBvcHRpb25zLmh0dHBPcHRpb25zLFxuICAgICAgbG9nZ2VyOiBvcHRpb25zLmxvZ2dlcixcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlZ2lvbiA9IGF3YWl0IEF3c0NsaUNvbXBhdGlibGUucmVnaW9uKG9wdGlvbnMucHJvZmlsZSk7XG4gICAgY29uc3QgcmVxdWVzdEhhbmRsZXIgPSBBd3NDbGlDb21wYXRpYmxlLnJlcXVlc3RIYW5kbGVyQnVpbGRlcihvcHRpb25zLmh0dHBPcHRpb25zKTtcbiAgICByZXR1cm4gbmV3IFNka1Byb3ZpZGVyKGNyZWRlbnRpYWxQcm92aWRlciwgcmVnaW9uLCByZXF1ZXN0SGFuZGxlciwgb3B0aW9ucy5sb2dnZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFkb25seSBwbHVnaW5zID0gbmV3IENyZWRlbnRpYWxQbHVnaW5zKCk7XG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGVmYXVsdENyZWRlbnRpYWxQcm92aWRlcjogQXdzQ3JlZGVudGlhbElkZW50aXR5UHJvdmlkZXIsXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCByZWdpb25cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVhZG9ubHkgZGVmYXVsdFJlZ2lvbjogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVxdWVzdEhhbmRsZXI6IE5vZGVIdHRwSGFuZGxlck9wdGlvbnMgPSB7fSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGxvZ2dlcj86IExvZ2dlcixcbiAgKSB7fVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gU0RLIHdoaWNoIGNhbiBkbyBvcGVyYXRpb25zIGluIHRoZSBnaXZlbiBlbnZpcm9ubWVudFxuICAgKlxuICAgKiBUaGUgYGVudmlyb25tZW50YCBwYXJhbWV0ZXIgaXMgcmVzb2x2ZWQgZmlyc3QgKHNlZSBgcmVzb2x2ZUVudmlyb25tZW50KClgKS5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBmb3JFbnZpcm9ubWVudChcbiAgICBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQsXG4gICAgbW9kZTogTW9kZSxcbiAgICBvcHRpb25zPzogQ3JlZGVudGlhbHNPcHRpb25zLFxuICAgIHF1aWV0ID0gZmFsc2UsXG4gICk6IFByb21pc2U8U2RrRm9yRW52aXJvbm1lbnQ+IHtcbiAgICBjb25zdCBlbnYgPSBhd2FpdCB0aGlzLnJlc29sdmVFbnZpcm9ubWVudChlbnZpcm9ubWVudCk7XG5cbiAgICBjb25zdCBiYXNlQ3JlZHMgPSBhd2FpdCB0aGlzLm9idGFpbkJhc2VDcmVkZW50aWFscyhlbnYuYWNjb3VudCwgbW9kZSk7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCB3ZSBuZWVkIGF0IGxlYXN0IFNPTUUgY3JlZGVudGlhbHNcbiAgICBpZiAoYmFzZUNyZWRzLnNvdXJjZSA9PT0gJ25vbmUnKSB7XG4gICAgICB0aHJvdyBuZXcgQXV0aGVudGljYXRpb25FcnJvcihmbXRPYnRhaW5DcmVkZW50aWFsc0Vycm9yKGVudi5hY2NvdW50LCBiYXNlQ3JlZHMpKTtcbiAgICB9XG5cbiAgICAvLyBTaW1wbGUgY2FzZSBpcyBpZiB3ZSBkb24ndCBuZWVkIHRvIFwiYXNzdW1lUm9sZVwiIGhlcmUuIElmIHNvLCB3ZSBtdXN0IG5vdyBoYXZlIGNyZWRlbnRpYWxzIGZvciB0aGUgcmlnaHRcbiAgICAvLyBhY2NvdW50LlxuICAgIGlmIChvcHRpb25zPy5hc3N1bWVSb2xlQXJuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChiYXNlQ3JlZHMuc291cmNlID09PSAnaW5jb3JyZWN0RGVmYXVsdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEF1dGhlbnRpY2F0aW9uRXJyb3IoZm10T2J0YWluQ3JlZGVudGlhbHNFcnJvcihlbnYuYWNjb3VudCwgYmFzZUNyZWRzKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE91ciBjdXJyZW50IGNyZWRlbnRpYWxzIG11c3QgYmUgdmFsaWQgYW5kIG5vdCBleHBpcmVkLiBDb25maXJtIHRoYXQgYmVmb3JlIHdlIGdldCBpbnRvIGRvaW5nXG4gICAgICAvLyBhY3R1YWwgQ2xvdWRGb3JtYXRpb24gY2FsbHMsIHdoaWNoIG1pZ2h0IHRha2UgYSBsb25nIHRpbWUgdG8gaGFuZy5cbiAgICAgIGNvbnN0IHNkayA9IG5ldyBTREsoYmFzZUNyZWRzLmNyZWRlbnRpYWxzLCBlbnYucmVnaW9uLCB0aGlzLnJlcXVlc3RIYW5kbGVyLCB0aGlzLmxvZ2dlcik7XG4gICAgICBhd2FpdCBzZGsudmFsaWRhdGVDcmVkZW50aWFscygpO1xuICAgICAgcmV0dXJuIHsgc2RrLCBkaWRBc3N1bWVSb2xlOiBmYWxzZSB9O1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAvLyBXZSB3aWxsIHByb2NlZWQgdG8gQXNzdW1lUm9sZSB1c2luZyB3aGF0ZXZlciB3ZSd2ZSBiZWVuIGdpdmVuLlxuICAgICAgY29uc3Qgc2RrID0gYXdhaXQgdGhpcy53aXRoQXNzdW1lZFJvbGUoXG4gICAgICAgIGJhc2VDcmVkcyxcbiAgICAgICAgb3B0aW9ucy5hc3N1bWVSb2xlQXJuLFxuICAgICAgICBvcHRpb25zLmFzc3VtZVJvbGVFeHRlcm5hbElkLFxuICAgICAgICBvcHRpb25zLmFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucyxcbiAgICAgICAgZW52LnJlZ2lvbixcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiB7IHNkaywgZGlkQXNzdW1lUm9sZTogdHJ1ZSB9O1xuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBpZiAoZXJyLm5hbWUgPT09ICdFeHBpcmVkVG9rZW4nKSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cblxuICAgICAgLy8gQXNzdW1lUm9sZSBmYWlsZWQuIFByb2NlZWQgYW5kIHdhcm4gKmlmIGFuZCBvbmx5IGlmKiB0aGUgYmFzZUNyZWRlbnRpYWxzIHdlcmUgYWxyZWFkeSBmb3IgdGhlIHJpZ2h0IGFjY291bnRcbiAgICAgIC8vIG9yIHJldHVybmVkIGZyb20gYSBwbHVnaW4uIFRoaXMgaXMgdG8gY292ZXIgc29tZSBjdXJyZW50IHNldHVwcyBmb3IgcGVvcGxlIHVzaW5nIHBsdWdpbnMgb3IgcHJlZmVycmluZyB0b1xuICAgICAgLy8gZmVlZCB0aGUgQ0xJIGNyZWRlbnRpYWxzIHdoaWNoIGFyZSBzdWZmaWNpZW50IGJ5IHRoZW1zZWx2ZXMuIFByZWZlciB0byBhc3N1bWUgdGhlIGNvcnJlY3Qgcm9sZSBpZiB3ZSBjYW4sXG4gICAgICAvLyBidXQgaWYgd2UgY2FuJ3QgdGhlbiBsZXQncyBqdXN0IHRyeSB3aXRoIGF2YWlsYWJsZSBjcmVkZW50aWFscyBhbnl3YXkuXG4gICAgICBpZiAoYmFzZUNyZWRzLnNvdXJjZSA9PT0gJ2NvcnJlY3REZWZhdWx0JyB8fCBiYXNlQ3JlZHMuc291cmNlID09PSAncGx1Z2luJykge1xuICAgICAgICBkZWJ1ZyhlcnIubWVzc2FnZSk7XG4gICAgICAgIGNvbnN0IGxvZ2dlciA9IHF1aWV0ID8gZGVidWcgOiB3YXJuaW5nO1xuICAgICAgICBsb2dnZXIoXG4gICAgICAgICAgYCR7Zm10T2J0YWluZWRDcmVkZW50aWFscyhiYXNlQ3JlZHMpfSBjb3VsZCBub3QgYmUgdXNlZCB0byBhc3N1bWUgJyR7b3B0aW9ucy5hc3N1bWVSb2xlQXJufScsIGJ1dCBhcmUgZm9yIHRoZSByaWdodCBhY2NvdW50LiBQcm9jZWVkaW5nIGFueXdheS5gLFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNkazogbmV3IFNESyhiYXNlQ3JlZHMuY3JlZGVudGlhbHMsIGVudi5yZWdpb24sIHRoaXMucmVxdWVzdEhhbmRsZXIsIHRoaXMubG9nZ2VyKSxcbiAgICAgICAgICBkaWRBc3N1bWVSb2xlOiBmYWxzZSxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHBhcnRpdGlvbiB0aGF0IGJhc2UgY3JlZGVudGlhbHMgYXJlIGZvclxuICAgKlxuICAgKiBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIHRoZXJlIGFyZSBubyBiYXNlIGNyZWRlbnRpYWxzLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGJhc2VDcmVkZW50aWFsc1BhcnRpdGlvbihlbnZpcm9ubWVudDogRW52aXJvbm1lbnQsIG1vZGU6IE1vZGUpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IGVudiA9IGF3YWl0IHRoaXMucmVzb2x2ZUVudmlyb25tZW50KGVudmlyb25tZW50KTtcbiAgICBjb25zdCBiYXNlQ3JlZHMgPSBhd2FpdCB0aGlzLm9idGFpbkJhc2VDcmVkZW50aWFscyhlbnYuYWNjb3VudCwgbW9kZSk7XG4gICAgaWYgKGJhc2VDcmVkcy5zb3VyY2UgPT09ICdub25lJykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIChhd2FpdCBuZXcgU0RLKGJhc2VDcmVkcy5jcmVkZW50aWFscywgZW52LnJlZ2lvbiwgdGhpcy5yZXF1ZXN0SGFuZGxlciwgdGhpcy5sb2dnZXIpLmN1cnJlbnRBY2NvdW50KCkpLnBhcnRpdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIHRoZSBlbnZpcm9ubWVudCBmb3IgYSBzdGFja1xuICAgKlxuICAgKiBSZXBsYWNlcyB0aGUgbWFnaWMgdmFsdWVzIGBVTktOT1dOX1JFR0lPTmAgYW5kIGBVTktOT1dOX0FDQ09VTlRgXG4gICAqIHdpdGggdGhlIGRlZmF1bHRzIGZvciB0aGUgY3VycmVudCBTREsgY29uZmlndXJhdGlvbiAoYH4vLmF3cy9jb25maWdgIG9yXG4gICAqIG90aGVyd2lzZSkuXG4gICAqXG4gICAqIEl0IGlzIGFuIGVycm9yIGlmIGBVTktOT1dOX0FDQ09VTlRgIGlzIHVzZWQgYnV0IHRoZSB1c2VyIGhhc24ndCBjb25maWd1cmVkXG4gICAqIGFueSBTREsgY3JlZGVudGlhbHMuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgcmVzb2x2ZUVudmlyb25tZW50KGVudjogRW52aXJvbm1lbnQpOiBQcm9taXNlPEVudmlyb25tZW50PiB7XG4gICAgY29uc3QgcmVnaW9uID0gZW52LnJlZ2lvbiAhPT0gVU5LTk9XTl9SRUdJT04gPyBlbnYucmVnaW9uIDogdGhpcy5kZWZhdWx0UmVnaW9uO1xuICAgIGNvbnN0IGFjY291bnQgPSBlbnYuYWNjb3VudCAhPT0gVU5LTk9XTl9BQ0NPVU5UID8gZW52LmFjY291bnQgOiAoYXdhaXQgdGhpcy5kZWZhdWx0QWNjb3VudCgpKT8uYWNjb3VudElkO1xuXG4gICAgaWYgKCFhY2NvdW50KSB7XG4gICAgICB0aHJvdyBuZXcgQXV0aGVudGljYXRpb25FcnJvcihcbiAgICAgICAgJ1VuYWJsZSB0byByZXNvbHZlIEFXUyBhY2NvdW50IHRvIHVzZS4gSXQgbXVzdCBiZSBlaXRoZXIgY29uZmlndXJlZCB3aGVuIHlvdSBkZWZpbmUgeW91ciBDREsgU3RhY2ssIG9yIHRocm91Z2ggdGhlIGVudmlyb25tZW50JyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlZ2lvbixcbiAgICAgIGFjY291bnQsXG4gICAgICBuYW1lOiBFbnZpcm9ubWVudFV0aWxzLmZvcm1hdChhY2NvdW50LCByZWdpb24pLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVGhlIGFjY291bnQgd2UnZCBhdXRoIGludG8gaWYgd2UgdXNlZCBkZWZhdWx0IGNyZWRlbnRpYWxzLlxuICAgKlxuICAgKiBEZWZhdWx0IGNyZWRlbnRpYWxzIGFyZSB0aGUgc2V0IG9mIGFtYmllbnRseSBjb25maWd1cmVkIGNyZWRlbnRpYWxzIHVzaW5nXG4gICAqIG9uZSBvZiB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzLCBvciB+Ly5hd3MvY3JlZGVudGlhbHMsIG9yIHRoZSAqb25lKlxuICAgKiBwcm9maWxlIHRoYXQgd2FzIHBhc3NlZCBpbnRvIHRoZSBDTEkuXG4gICAqXG4gICAqIE1pZ2h0IHJldHVybiB1bmRlZmluZWQgaWYgdGhlcmUgYXJlIG5vIGRlZmF1bHQvYW1iaWVudCBjcmVkZW50aWFsc1xuICAgKiBhdmFpbGFibGUgKGluIHdoaWNoIGNhc2UgdGhlIHVzZXIgc2hvdWxkIGJldHRlciBob3BlIHRoZXkgaGF2ZVxuICAgKiBjcmVkZW50aWFsIHBsdWdpbnMgY29uZmlndXJlZCkuXG4gICAqXG4gICAqIFVzZXMgYSBjYWNoZSB0byBhdm9pZCBTVFMgY2FsbHMgaWYgd2UgZG9uJ3QgbmVlZCAnZW0uXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgZGVmYXVsdEFjY291bnQoKTogUHJvbWlzZTxBY2NvdW50IHwgdW5kZWZpbmVkPiB7XG4gICAgcmV0dXJuIGNhY2hlZCh0aGlzLCBDQUNIRURfQUNDT1VOVCwgYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IG5ldyBTREsodGhpcy5kZWZhdWx0Q3JlZGVudGlhbFByb3ZpZGVyLCB0aGlzLmRlZmF1bHRSZWdpb24sIHRoaXMucmVxdWVzdEhhbmRsZXIsIHRoaXMubG9nZ2VyKS5jdXJyZW50QWNjb3VudCgpO1xuICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgIC8vIFRyZWF0ICdFeHBpcmVkVG9rZW4nIHNwZWNpYWxseS4gVGhpcyBpcyBhIGNvbW1vbiBzaXR1YXRpb24gdGhhdCBwZW9wbGUgbWF5IGZpbmQgdGhlbXNlbHZlcyBpbiwgYW5kXG4gICAgICAgIC8vIHRoZXkgYXJlIGNvbXBsYWluaW5nIGFib3V0IGlmIHdlIGZhaWwgJ2NkayBzeW50aCcgb24gdGhlbS4gV2UgbG91ZGx5IGNvbXBsYWluIGluIG9yZGVyIHRvIHNob3cgdGhhdFxuICAgICAgICAvLyB0aGUgY3VycmVudCBzaXR1YXRpb24gaXMgcHJvYmFibHkgdW5kZXNpcmFibGUsIGJ1dCB3ZSBkb24ndCBmYWlsLlxuICAgICAgICBpZiAoZS5uYW1lID09PSAnRXhwaXJlZFRva2VuJykge1xuICAgICAgICAgIHdhcm5pbmcoXG4gICAgICAgICAgICAnVGhlcmUgYXJlIGV4cGlyZWQgQVdTIGNyZWRlbnRpYWxzIGluIHlvdXIgZW52aXJvbm1lbnQuIFRoZSBDREsgYXBwIHdpbGwgc3ludGggd2l0aG91dCBjdXJyZW50IGFjY291bnQgaW5mb3JtYXRpb24uJyxcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBkZWJ1ZyhgVW5hYmxlIHRvIGRldGVybWluZSB0aGUgZGVmYXVsdCBBV1MgYWNjb3VudCAoJHtlLm5hbWV9KTogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGNyZWRlbnRpYWxzIGZvciB0aGUgZ2l2ZW4gYWNjb3VudCBJRCBpbiB0aGUgZ2l2ZW4gbW9kZVxuICAgKlxuICAgKiAxLiBVc2UgdGhlIGRlZmF1bHQgY3JlZGVudGlhbHMgaWYgdGhlIGRlc3RpbmF0aW9uIGFjY291bnQgbWF0Y2hlcyB0aGVcbiAgICogICAgY3VycmVudCBjcmVkZW50aWFscycgYWNjb3VudC5cbiAgICogMi4gT3RoZXJ3aXNlIHRyeSBhbGwgY3JlZGVudGlhbCBwbHVnaW5zLlxuICAgKiAzLiBGYWlsIGlmIG5laXRoZXIgb2YgdGhlc2UgeWllbGQgYW55IGNyZWRlbnRpYWxzLlxuICAgKiA0LiBSZXR1cm4gYSBmYWlsdXJlIGlmIGFueSBvZiB0aGVtIHJldHVybmVkIGNyZWRlbnRpYWxzXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIG9idGFpbkJhc2VDcmVkZW50aWFscyhhY2NvdW50SWQ6IHN0cmluZywgbW9kZTogTW9kZSk6IFByb21pc2U8T2J0YWluQmFzZUNyZWRlbnRpYWxzUmVzdWx0PiB7XG4gICAgLy8gRmlyc3QgdHJ5ICdjdXJyZW50JyBjcmVkZW50aWFsc1xuICAgIGNvbnN0IGRlZmF1bHRBY2NvdW50SWQgPSAoYXdhaXQgdGhpcy5kZWZhdWx0QWNjb3VudCgpKT8uYWNjb3VudElkO1xuICAgIGlmIChkZWZhdWx0QWNjb3VudElkID09PSBhY2NvdW50SWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogJ2NvcnJlY3REZWZhdWx0JyxcbiAgICAgICAgY3JlZGVudGlhbHM6IGF3YWl0IHRoaXMuZGVmYXVsdENyZWRlbnRpYWxQcm92aWRlcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVGhlbiB0cnkgdGhlIHBsdWdpbnNcbiAgICBjb25zdCBwbHVnaW5DcmVkcyA9IGF3YWl0IHRoaXMucGx1Z2lucy5mZXRjaENyZWRlbnRpYWxzRm9yKGFjY291bnRJZCwgbW9kZSk7XG4gICAgaWYgKHBsdWdpbkNyZWRzKSB7XG4gICAgICByZXR1cm4geyBzb3VyY2U6ICdwbHVnaW4nLCAuLi5wbHVnaW5DcmVkcyB9O1xuICAgIH1cblxuICAgIC8vIEZhbGwgYmFjayB0byBkZWZhdWx0IGNyZWRlbnRpYWxzIHdpdGggYSBub3RlIHRoYXQgdGhleSdyZSBub3QgdGhlIHJpZ2h0IG9uZXMgeWV0XG4gICAgaWYgKGRlZmF1bHRBY2NvdW50SWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiAnaW5jb3JyZWN0RGVmYXVsdCcsXG4gICAgICAgIGFjY291bnRJZDogZGVmYXVsdEFjY291bnRJZCxcbiAgICAgICAgY3JlZGVudGlhbHM6IGF3YWl0IHRoaXMuZGVmYXVsdENyZWRlbnRpYWxQcm92aWRlcixcbiAgICAgICAgdW51c2VkUGx1Z2luczogdGhpcy5wbHVnaW5zLmF2YWlsYWJsZVBsdWdpbk5hbWVzLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBcHBhcmVudGx5IHdlIGRpZG4ndCBmaW5kIGFueSBhdCBhbGxcbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiAnbm9uZScsXG4gICAgICB1bnVzZWRQbHVnaW5zOiB0aGlzLnBsdWdpbnMuYXZhaWxhYmxlUGx1Z2luTmFtZXMsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gU0RLIHdoaWNoIHVzZXMgYXNzdW1lZCByb2xlIGNyZWRlbnRpYWxzXG4gICAqXG4gICAqIFRoZSBiYXNlIGNyZWRlbnRpYWxzIHVzZWQgdG8gcmV0cmlldmUgdGhlIGFzc3VtZWQgcm9sZSBjcmVkZW50aWFscyB3aWxsIGJlIHRoZVxuICAgKiBzYW1lIGNyZWRlbnRpYWxzIHJldHVybmVkIGJ5IG9idGFpbkNyZWRlbnRpYWxzIGlmIGFuIGVudmlyb25tZW50IGFuZCBtb2RlIGlzIHBhc3NlZCxcbiAgICogb3RoZXJ3aXNlIGl0IHdpbGwgYmUgdGhlIGN1cnJlbnQgY3JlZGVudGlhbHMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHdpdGhBc3N1bWVkUm9sZShcbiAgICBtYWluQ3JlZGVudGlhbHM6IEV4Y2x1ZGU8T2J0YWluQmFzZUNyZWRlbnRpYWxzUmVzdWx0LCB7IHNvdXJjZTogJ25vbmUnIH0+LFxuICAgIHJvbGVBcm46IHN0cmluZyxcbiAgICBleHRlcm5hbElkPzogc3RyaW5nLFxuICAgIGFkZGl0aW9uYWxPcHRpb25zPzogQXNzdW1lUm9sZUFkZGl0aW9uYWxPcHRpb25zLFxuICAgIHJlZ2lvbj86IHN0cmluZyxcbiAgKTogUHJvbWlzZTxTREs+IHtcbiAgICBkZWJ1ZyhgQXNzdW1pbmcgcm9sZSAnJHtyb2xlQXJufScuYCk7XG5cbiAgICByZWdpb24gPSByZWdpb24gPz8gdGhpcy5kZWZhdWx0UmVnaW9uO1xuXG4gICAgY29uc3Qgc291cmNlRGVzY3JpcHRpb24gPSBmbXRPYnRhaW5lZENyZWRlbnRpYWxzKG1haW5DcmVkZW50aWFscyk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgY3JlZGVudGlhbHMgPSBhd2FpdCBtYWtlQ2FjaGluZ1Byb3ZpZGVyKGZyb21UZW1wb3JhcnlDcmVkZW50aWFscyh7XG4gICAgICAgIG1hc3RlckNyZWRlbnRpYWxzOiBtYWluQ3JlZGVudGlhbHMuY3JlZGVudGlhbHMsXG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIFJvbGVBcm46IHJvbGVBcm4sXG4gICAgICAgICAgRXh0ZXJuYWxJZDogZXh0ZXJuYWxJZCxcbiAgICAgICAgICBSb2xlU2Vzc2lvbk5hbWU6IGBhd3MtY2RrLSR7c2FmZVVzZXJuYW1lKCl9YCxcbiAgICAgICAgICAuLi5hZGRpdGlvbmFsT3B0aW9ucyxcbiAgICAgICAgICBUcmFuc2l0aXZlVGFnS2V5czogYWRkaXRpb25hbE9wdGlvbnM/LlRhZ3MgPyBhZGRpdGlvbmFsT3B0aW9ucy5UYWdzLm1hcCgodCkgPT4gdC5LZXkhKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgfSxcbiAgICAgICAgY2xpZW50Q29uZmlnOiB7XG4gICAgICAgICAgcmVnaW9uLFxuICAgICAgICAgIHJlcXVlc3RIYW5kbGVyOiB0aGlzLnJlcXVlc3RIYW5kbGVyLFxuICAgICAgICAgIGN1c3RvbVVzZXJBZ2VudDogJ2F3cy1jZGsnLFxuICAgICAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgICAgIH0sXG4gICAgICAgIGxvZ2dlcjogdGhpcy5sb2dnZXIsXG4gICAgICB9KSk7XG5cbiAgICAgIC8vIENhbGwgdGhlIHByb3ZpZGVyIGF0IGxlYXN0IG9uY2UgaGVyZSwgdG8gY2F0Y2ggYW4gZXJyb3IgaWYgaXQgb2NjdXJzXG4gICAgICBhd2FpdCBjcmVkZW50aWFscygpO1xuXG4gICAgICByZXR1cm4gbmV3IFNESyhjcmVkZW50aWFscywgcmVnaW9uLCB0aGlzLnJlcXVlc3RIYW5kbGVyLCB0aGlzLmxvZ2dlcik7XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGlmIChlcnIubmFtZSA9PT0gJ0V4cGlyZWRUb2tlbicpIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuXG4gICAgICBkZWJ1ZyhgQXNzdW1pbmcgcm9sZSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICB0aHJvdyBuZXcgQXV0aGVudGljYXRpb25FcnJvcihcbiAgICAgICAgW1xuICAgICAgICAgICdDb3VsZCBub3QgYXNzdW1lIHJvbGUgaW4gdGFyZ2V0IGFjY291bnQnLFxuICAgICAgICAgIC4uLihzb3VyY2VEZXNjcmlwdGlvbiA/IFtgdXNpbmcgJHtzb3VyY2VEZXNjcmlwdGlvbn1gXSA6IFtdKSxcbiAgICAgICAgICBlcnIubWVzc2FnZSxcbiAgICAgICAgICBcIi4gUGxlYXNlIG1ha2Ugc3VyZSB0aGF0IHRoaXMgcm9sZSBleGlzdHMgaW4gdGhlIGFjY291bnQuIElmIGl0IGRvZXNuJ3QgZXhpc3QsIChyZSktYm9vdHN0cmFwIHRoZSBlbnZpcm9ubWVudCBcIiArXG4gICAgICAgICAgICBcIndpdGggdGhlIHJpZ2h0ICctLXRydXN0JywgdXNpbmcgdGhlIGxhdGVzdCB2ZXJzaW9uIG9mIHRoZSBDREsgQ0xJLlwiLFxuICAgICAgICBdLmpvaW4oJyAnKSxcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQW4gQVdTIGFjY291bnRcbiAqXG4gKiBBbiBBV1MgYWNjb3VudCBhbHdheXMgZXhpc3RzIGluIG9ubHkgb25lIHBhcnRpdGlvbi4gVXN1YWxseSB3ZSBkb24ndCBjYXJlIGFib3V0XG4gKiB0aGUgcGFydGl0aW9uLCBidXQgd2hlbiB3ZSBuZWVkIHRvIGZvcm0gQVJOcyB3ZSBkby5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBY2NvdW50IHtcbiAgLyoqXG4gICAqIFRoZSBhY2NvdW50IG51bWJlclxuICAgKi9cbiAgcmVhZG9ubHkgYWNjb3VudElkOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0aXRpb24gKCdhd3MnIG9yICdhd3MtY24nIG9yIG90aGVyd2lzZSlcbiAgICovXG4gIHJlYWRvbmx5IHBhcnRpdGlvbjogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdXNlcm5hbWUgd2l0aCBjaGFyYWN0ZXJzIGludmFsaWQgZm9yIGEgUm9sZVNlc3Npb25OYW1lIHJlbW92ZWRcbiAqXG4gKiBAc2VlIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9TVFMvbGF0ZXN0L0FQSVJlZmVyZW5jZS9BUElfQXNzdW1lUm9sZS5odG1sI0FQSV9Bc3N1bWVSb2xlX1JlcXVlc3RQYXJhbWV0ZXJzXG4gKi9cbmZ1bmN0aW9uIHNhZmVVc2VybmFtZSgpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gb3MudXNlckluZm8oKS51c2VybmFtZS5yZXBsYWNlKC9bXlxcdys9LC5ALV0vZywgJ0AnKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuICdub25hbWUnO1xuICB9XG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3Igb2J0YWluaW5nIGNyZWRlbnRpYWxzIGZvciBhbiBlbnZpcm9ubWVudFxuICovXG5leHBvcnQgaW50ZXJmYWNlIENyZWRlbnRpYWxzT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBUaGUgQVJOIG9mIHRoZSByb2xlIHRoYXQgbmVlZHMgdG8gYmUgYXNzdW1lZCwgaWYgYW55XG4gICAqL1xuICByZWFkb25seSBhc3N1bWVSb2xlQXJuPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFeHRlcm5hbCBJRCByZXF1aXJlZCB0byBhc3N1bWUgdGhlIGdpdmVuIHJvbGUuXG4gICAqL1xuICByZWFkb25seSBhc3N1bWVSb2xlRXh0ZXJuYWxJZD86IHN0cmluZztcblxuICAvKipcbiAgICogU2Vzc2lvbiB0YWdzIHJlcXVpcmVkIHRvIGFzc3VtZSB0aGUgZ2l2ZW4gcm9sZS5cbiAgICovXG4gIHJlYWRvbmx5IGFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucz86IEFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucztcbn1cblxuLyoqXG4gKiBSZXN1bHQgb2Ygb2J0YWluaW5nIGJhc2UgY3JlZGVudGlhbHNcbiAqL1xudHlwZSBPYnRhaW5CYXNlQ3JlZGVudGlhbHNSZXN1bHQgPVxuICB8IHsgc291cmNlOiAnY29ycmVjdERlZmF1bHQnOyBjcmVkZW50aWFsczogQXdzQ3JlZGVudGlhbElkZW50aXR5UHJvdmlkZXIgfVxuICB8IHsgc291cmNlOiAncGx1Z2luJzsgcGx1Z2luTmFtZTogc3RyaW5nOyBjcmVkZW50aWFsczogQXdzQ3JlZGVudGlhbElkZW50aXR5UHJvdmlkZXIgfVxuICB8IHtcbiAgICBzb3VyY2U6ICdpbmNvcnJlY3REZWZhdWx0JztcbiAgICBjcmVkZW50aWFsczogQXdzQ3JlZGVudGlhbElkZW50aXR5UHJvdmlkZXI7XG4gICAgYWNjb3VudElkOiBzdHJpbmc7XG4gICAgdW51c2VkUGx1Z2luczogc3RyaW5nW107XG4gIH1cbiAgfCB7IHNvdXJjZTogJ25vbmUnOyB1bnVzZWRQbHVnaW5zOiBzdHJpbmdbXSB9O1xuXG4vKipcbiAqIElzb2xhdGluZyB0aGUgY29kZSB0aGF0IHRyYW5zbGF0ZXMgY2FsY3VsYXRpb24gZXJyb3JzIGludG8gaHVtYW4gZXJyb3IgbWVzc2FnZXNcbiAqXG4gKiBXZSBjb3ZlciB0aGUgZm9sbG93aW5nIGNhc2VzOlxuICpcbiAqIC0gTm8gY3JlZGVudGlhbHMgYXJlIGF2YWlsYWJsZSBhdCBhbGxcbiAqIC0gRGVmYXVsdCBjcmVkZW50aWFscyBhcmUgZm9yIHRoZSB3cm9uZyBhY2NvdW50XG4gKi9cbmZ1bmN0aW9uIGZtdE9idGFpbkNyZWRlbnRpYWxzRXJyb3IoXG4gIHRhcmdldEFjY291bnRJZDogc3RyaW5nLFxuICBvYnRhaW5SZXN1bHQ6IE9idGFpbkJhc2VDcmVkZW50aWFsc1Jlc3VsdCAmIHtcbiAgICBzb3VyY2U6ICdub25lJyB8ICdpbmNvcnJlY3REZWZhdWx0JztcbiAgfSxcbik6IHN0cmluZyB7XG4gIGNvbnN0IG1zZyA9IFtgTmVlZCB0byBwZXJmb3JtIEFXUyBjYWxscyBmb3IgYWNjb3VudCAke3RhcmdldEFjY291bnRJZH1gXTtcbiAgc3dpdGNoIChvYnRhaW5SZXN1bHQuc291cmNlKSB7XG4gICAgY2FzZSAnaW5jb3JyZWN0RGVmYXVsdCc6XG4gICAgICBtc2cucHVzaChgYnV0IHRoZSBjdXJyZW50IGNyZWRlbnRpYWxzIGFyZSBmb3IgJHtvYnRhaW5SZXN1bHQuYWNjb3VudElkfWApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbm9uZSc6XG4gICAgICBtc2cucHVzaCgnYnV0IG5vIGNyZWRlbnRpYWxzIGhhdmUgYmVlbiBjb25maWd1cmVkJyk7XG4gIH1cbiAgaWYgKG9idGFpblJlc3VsdC51bnVzZWRQbHVnaW5zLmxlbmd0aCA+IDApIHtcbiAgICBtc2cucHVzaChgYW5kIG5vbmUgb2YgdGhlc2UgcGx1Z2lucyBmb3VuZCBhbnk6ICR7b2J0YWluUmVzdWx0LnVudXNlZFBsdWdpbnMuam9pbignLCAnKX1gKTtcbiAgfVxuICByZXR1cm4gbXNnLmpvaW4oJywgJyk7XG59XG5cbi8qKlxuICogRm9ybWF0IGEgbWVzc2FnZSBpbmRpY2F0aW5nIHdoZXJlIHdlIGdvdCBiYXNlIGNyZWRlbnRpYWxzIGZvciB0aGUgYXNzdW1lIHJvbGVcbiAqXG4gKiBXZSBjb3ZlciB0aGUgZm9sbG93aW5nIGNhc2VzOlxuICpcbiAqIC0gRGVmYXVsdCBjcmVkZW50aWFscyBmb3IgdGhlIHJpZ2h0IGFjY291bnRcbiAqIC0gRGVmYXVsdCBjcmVkZW50aWFscyBmb3IgdGhlIHdyb25nIGFjY291bnRcbiAqIC0gQ3JlZGVudGlhbHMgcmV0dXJuZWQgZnJvbSBhIHBsdWdpblxuICovXG5mdW5jdGlvbiBmbXRPYnRhaW5lZENyZWRlbnRpYWxzKG9idGFpblJlc3VsdDogRXhjbHVkZTxPYnRhaW5CYXNlQ3JlZGVudGlhbHNSZXN1bHQsIHsgc291cmNlOiAnbm9uZScgfT4pOiBzdHJpbmcge1xuICBzd2l0Y2ggKG9idGFpblJlc3VsdC5zb3VyY2UpIHtcbiAgICBjYXNlICdjb3JyZWN0RGVmYXVsdCc6XG4gICAgICByZXR1cm4gJ2N1cnJlbnQgY3JlZGVudGlhbHMnO1xuICAgIGNhc2UgJ3BsdWdpbic6XG4gICAgICByZXR1cm4gYGNyZWRlbnRpYWxzIHJldHVybmVkIGJ5IHBsdWdpbiAnJHtvYnRhaW5SZXN1bHQucGx1Z2luTmFtZX0nYDtcbiAgICBjYXNlICdpbmNvcnJlY3REZWZhdWx0JzpcbiAgICAgIGNvbnN0IG1zZyA9IFtdO1xuICAgICAgbXNnLnB1c2goYGN1cnJlbnQgY3JlZGVudGlhbHMgKHdoaWNoIGFyZSBmb3IgYWNjb3VudCAke29idGFpblJlc3VsdC5hY2NvdW50SWR9YCk7XG5cbiAgICAgIGlmIChvYnRhaW5SZXN1bHQudW51c2VkUGx1Z2lucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIG1zZy5wdXNoKGAsIGFuZCBub25lIG9mIHRoZSBmb2xsb3dpbmcgcGx1Z2lucyBwcm92aWRlZCBjcmVkZW50aWFsczogJHtvYnRhaW5SZXN1bHQudW51c2VkUGx1Z2lucy5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgICAgbXNnLnB1c2goJyknKTtcblxuICAgICAgcmV0dXJuIG1zZy5qb2luKCcnKTtcbiAgfVxufVxuXG4vKipcbiAqIEluc3RhbnRpYXRlIGFuIFNESyBmb3IgY29udGV4dCBwcm92aWRlcnMuIFRoaXMgZnVuY3Rpb24gZW5zdXJlcyB0aGF0IGFsbFxuICogbG9va3VwIGFzc3VtZSByb2xlIG9wdGlvbnMgYXJlIHVzZWQgd2hlbiBjb250ZXh0IHByb3ZpZGVycyBwZXJmb3JtIGxvb2t1cHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0Q29udGV4dFByb3ZpZGVyU2RrKGF3czogU2RrUHJvdmlkZXIsIG9wdGlvbnM6IENvbnRleHRMb29rdXBSb2xlT3B0aW9ucyk6IFByb21pc2U8U0RLPiB7XG4gIGNvbnN0IGFjY291bnQgPSBvcHRpb25zLmFjY291bnQ7XG4gIGNvbnN0IHJlZ2lvbiA9IG9wdGlvbnMucmVnaW9uO1xuXG4gIGNvbnN0IGNyZWRzOiBDcmVkZW50aWFsc09wdGlvbnMgPSB7XG4gICAgYXNzdW1lUm9sZUFybjogb3B0aW9ucy5sb29rdXBSb2xlQXJuLFxuICAgIGFzc3VtZVJvbGVFeHRlcm5hbElkOiBvcHRpb25zLmxvb2t1cFJvbGVFeHRlcm5hbElkLFxuICAgIGFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9uczogb3B0aW9ucy5hc3N1bWVSb2xlQWRkaXRpb25hbE9wdGlvbnMsXG4gIH07XG5cbiAgcmV0dXJuIChhd2FpdCBhd3MuZm9yRW52aXJvbm1lbnQoRW52aXJvbm1lbnRVdGlscy5tYWtlKGFjY291bnQsIHJlZ2lvbiksIE1vZGUuRm9yUmVhZGluZywgY3JlZHMpKS5zZGs7XG59XG4iXX0=