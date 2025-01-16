"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentAccess = void 0;
const logging_1 = require("../logging");
const environment_resources_1 = require("./environment-resources");
const mode_1 = require("./plugin/mode");
const placeholders_1 = require("./util/placeholders");
/**
 * Access particular AWS resources, based on information from the CX manifest
 *
 * It is not possible to grab direct access to AWS credentials; 9 times out of 10
 * we have to allow for role assumption, and role assumption can only work if
 * there is a CX Manifest that contains a role ARN.
 *
 * This class exists so new code isn't tempted to go and get SDK credentials directly.
 */
class EnvironmentAccess {
    constructor(sdkProvider, toolkitStackName) {
        this.sdkProvider = sdkProvider;
        this.sdkCache = new Map();
        this.environmentResources = new environment_resources_1.EnvironmentResourcesRegistry(toolkitStackName);
    }
    /**
     * Resolves the environment for a stack.
     */
    async resolveStackEnvironment(stack) {
        return this.sdkProvider.resolveEnvironment(stack.environment);
    }
    /**
     * Get an SDK to access the given stack's environment for stack operations
     *
     * Will ask plugins for readonly credentials if available, use the default
     * AWS credentials if not.
     *
     * Will assume the deploy role if configured on the stack. Check the default `deploy-role`
     * policies to see what you can do with this role.
     */
    async accessStackForReadOnlyStackOperations(stack) {
        return this.accessStackForStackOperations(stack, mode_1.Mode.ForReading);
    }
    /**
     * Get an SDK to access the given stack's environment for stack operations
     *
     * Will ask plugins for mutating credentials if available, use the default AWS
     * credentials if not.  The `mode` parameter is only used for querying
     * plugins.
     *
     * Will assume the deploy role if configured on the stack. Check the default `deploy-role`
     * policies to see what you can do with this role.
     */
    async accessStackForMutableStackOperations(stack) {
        return this.accessStackForStackOperations(stack, mode_1.Mode.ForWriting);
    }
    /**
     * Get an SDK to access the given stack's environment for environmental lookups
     *
     * Will use a plugin if available, use the default AWS credentials if not.
     * The `mode` parameter is only used for querying plugins.
     *
     * Will assume the lookup role if configured on the stack. Check the default `lookup-role`
     * policies to see what you can do with this role. It can generally read everything
     * in the account that does not require KMS access.
     *
     * ---
     *
     * For backwards compatibility reasons, there are some scenarios that are handled here:
     *
     *  1. The lookup role may not exist (it was added in bootstrap stack version 7). If so:
     *     a. Return the default credentials if the default credentials are for the stack account
     *        (you will notice this as `isFallbackCredentials=true`).
     *     b. Throw an error if the default credentials are not for the stack account.
     *
     *  2. The lookup role may not have the correct permissions (for example, ReadOnlyAccess was added in
     *     bootstrap stack version 8); the stack will have a minimum version number on it.
     *     a. If it does not we throw an error which should be handled in the calling
     *        function (and fallback to use a different role, etc)
     *
     * Upon success, caller will have an SDK for the right account, which may or may not have
     * the right permissions.
     */
    async accessStackForLookup(stack) {
        if (!stack.environment) {
            throw new Error(`The stack ${stack.displayName} does not have an environment`);
        }
        const lookupEnv = await this.prepareSdk({
            environment: stack.environment,
            mode: mode_1.Mode.ForReading,
            assumeRoleArn: stack.lookupRole?.arn,
            assumeRoleExternalId: stack.lookupRole?.assumeRoleExternalId,
            assumeRoleAdditionalOptions: stack.lookupRole?.assumeRoleAdditionalOptions,
        });
        // if we succeed in assuming the lookup role, make sure we have the correct bootstrap stack version
        if (lookupEnv.didAssumeRole && stack.lookupRole?.bootstrapStackVersionSsmParameter && stack.lookupRole.requiresBootstrapStackVersion) {
            const version = await lookupEnv.resources.versionFromSsmParameter(stack.lookupRole.bootstrapStackVersionSsmParameter);
            if (version < stack.lookupRole.requiresBootstrapStackVersion) {
                throw new Error(`Bootstrap stack version '${stack.lookupRole.requiresBootstrapStackVersion}' is required, found version '${version}'. To get rid of this error, please upgrade to bootstrap version >= ${stack.lookupRole.requiresBootstrapStackVersion}`);
            }
        }
        if (lookupEnv.isFallbackCredentials) {
            const arn = await lookupEnv.replacePlaceholders(stack.lookupRole?.arn);
            (0, logging_1.warning)(`Lookup role ${arn} was not assumed. Proceeding with default credentials.`);
        }
        return lookupEnv;
    }
    /**
     * Get an SDK to access the given stack's environment for reading stack attributes
     *
     * Will use a plugin if available, use the default AWS credentials if not.
     * The `mode` parameter is only used for querying plugins.
     *
     * Will try to assume the lookup role if given, will use the regular stack operations
     * access (deploy-role) otherwise. When calling this, you should assume that you will get
     * the least privileged role, so don't try to use it for anything the `deploy-role`
     * wouldn't be able to do. Also you cannot rely on being able to read encrypted anything.
     */
    async accessStackForLookupBestEffort(stack) {
        if (!stack.environment) {
            throw new Error(`The stack ${stack.displayName} does not have an environment`);
        }
        try {
            return await this.accessStackForLookup(stack);
        }
        catch (e) {
            (0, logging_1.warning)(`${e.message}`);
        }
        return this.accessStackForStackOperations(stack, mode_1.Mode.ForReading);
    }
    /**
     * Get an SDK to access the given stack's environment for stack operations
     *
     * Will use a plugin if available, use the default AWS credentials if not.
     * The `mode` parameter is only used for querying plugins.
     *
     * Will assume the deploy role if configured on the stack. Check the default `deploy-role`
     * policies to see what you can do with this role.
     */
    async accessStackForStackOperations(stack, mode) {
        if (!stack.environment) {
            throw new Error(`The stack ${stack.displayName} does not have an environment`);
        }
        return this.prepareSdk({
            environment: stack.environment,
            mode,
            assumeRoleArn: stack.assumeRoleArn,
            assumeRoleExternalId: stack.assumeRoleExternalId,
            assumeRoleAdditionalOptions: stack.assumeRoleAdditionalOptions,
        });
    }
    /**
     * Prepare an SDK for use in the given environment and optionally with a role assumed.
     */
    async prepareSdk(options) {
        const resolvedEnvironment = await this.sdkProvider.resolveEnvironment(options.environment);
        // Substitute any placeholders with information about the current environment
        const { assumeRoleArn } = await (0, placeholders_1.replaceEnvPlaceholders)({
            assumeRoleArn: options.assumeRoleArn,
        }, resolvedEnvironment, this.sdkProvider);
        const stackSdk = await this.cachedSdkForEnvironment(resolvedEnvironment, options.mode, {
            assumeRoleArn,
            assumeRoleExternalId: options.assumeRoleExternalId,
            assumeRoleAdditionalOptions: options.assumeRoleAdditionalOptions,
        });
        return {
            sdk: stackSdk.sdk,
            resolvedEnvironment,
            resources: this.environmentResources.for(resolvedEnvironment, stackSdk.sdk),
            // If we asked for a role, did not successfully assume it, and yet got here without an exception: that
            // means we must have fallback credentials.
            isFallbackCredentials: !stackSdk.didAssumeRole && !!assumeRoleArn,
            didAssumeRole: stackSdk.didAssumeRole,
            replacePlaceholders: async (str) => {
                const ret = await (0, placeholders_1.replaceEnvPlaceholders)({ str }, resolvedEnvironment, this.sdkProvider);
                return ret.str;
            },
        };
    }
    async cachedSdkForEnvironment(environment, mode, options) {
        const cacheKeyElements = [
            environment.account,
            environment.region,
            `${mode}`,
            options?.assumeRoleArn ?? '',
            options?.assumeRoleExternalId ?? '',
        ];
        if (options?.assumeRoleAdditionalOptions) {
            cacheKeyElements.push(JSON.stringify(options.assumeRoleAdditionalOptions));
        }
        const cacheKey = cacheKeyElements.join(':');
        const existing = this.sdkCache.get(cacheKey);
        if (existing) {
            return existing;
        }
        const ret = await this.sdkProvider.forEnvironment(environment, mode, options);
        this.sdkCache.set(cacheKey, ret);
        return ret;
    }
}
exports.EnvironmentAccess = EnvironmentAccess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQtYWNjZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW52aXJvbm1lbnQtYWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLHdDQUFxQztBQUVyQyxtRUFBNkY7QUFDN0Ysd0NBQXFDO0FBQ3JDLHNEQUF3RjtBQUV4Rjs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsaUJBQWlCO0lBSTVCLFlBQTZCLFdBQXdCLEVBQUUsZ0JBQXdCO1FBQWxELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBSHBDLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztRQUkvRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxvREFBNEIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxLQUF3QztRQUMzRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7Ozs7Ozs7T0FRRztJQUNJLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxLQUF3QztRQUN6RixPQUFPLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLEVBQUUsV0FBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsS0FBd0M7UUFDeEYsT0FBTyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxFQUFFLFdBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BMEJHO0lBQ0ksS0FBSyxDQUFDLG9CQUFvQixDQUFDLEtBQXdDO1FBQ3hFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxhQUFhLEtB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QUMsT0FBTztZQUNuQixXQUFXLENBQUMsTUFBTTtZQUNsQixHQUFHLElBQUksRUFBRTtZQUNULE9BQU8sRUFBRSxhQUFhLElBQUksRUFBRTtZQUM1QixPQUFPLEVBQUUsb0JBQW9CLElBQUksRUFBRTtTQUNwQyxDQUFDO1FBRUYsSUFBSSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQztZQUN6QyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO1FBQzdFLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0MsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztDQUNGO0FBM01ELDhDQTJNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGN4YXBpIGZyb20gJ0Bhd3MtY2RrL2N4LWFwaSc7XG5pbXBvcnQgeyBTREsgfSBmcm9tICcuL2F3cy1hdXRoJztcbmltcG9ydCB7IHdhcm5pbmcgfSBmcm9tICcuLi9sb2dnaW5nJztcbmltcG9ydCB7IENyZWRlbnRpYWxzT3B0aW9ucywgU2RrRm9yRW52aXJvbm1lbnQsIFNka1Byb3ZpZGVyIH0gZnJvbSAnLi9hd3MtYXV0aC9zZGstcHJvdmlkZXInO1xuaW1wb3J0IHsgRW52aXJvbm1lbnRSZXNvdXJjZXMsIEVudmlyb25tZW50UmVzb3VyY2VzUmVnaXN0cnkgfSBmcm9tICcuL2Vudmlyb25tZW50LXJlc291cmNlcyc7XG5pbXBvcnQgeyBNb2RlIH0gZnJvbSAnLi9wbHVnaW4vbW9kZSc7XG5pbXBvcnQgeyByZXBsYWNlRW52UGxhY2Vob2xkZXJzLCBTdHJpbmdXaXRob3V0UGxhY2Vob2xkZXJzIH0gZnJvbSAnLi91dGlsL3BsYWNlaG9sZGVycyc7XG5cbi8qKlxuICogQWNjZXNzIHBhcnRpY3VsYXIgQVdTIHJlc291cmNlcywgYmFzZWQgb24gaW5mb3JtYXRpb24gZnJvbSB0aGUgQ1ggbWFuaWZlc3RcbiAqXG4gKiBJdCBpcyBub3QgcG9zc2libGUgdG8gZ3JhYiBkaXJlY3QgYWNjZXNzIHRvIEFXUyBjcmVkZW50aWFsczsgOSB0aW1lcyBvdXQgb2YgMTBcbiAqIHdlIGhhdmUgdG8gYWxsb3cgZm9yIHJvbGUgYXNzdW1wdGlvbiwgYW5kIHJvbGUgYXNzdW1wdGlvbiBjYW4gb25seSB3b3JrIGlmXG4gKiB0aGVyZSBpcyBhIENYIE1hbmlmZXN0IHRoYXQgY29udGFpbnMgYSByb2xlIEFSTi5cbiAqXG4gKiBUaGlzIGNsYXNzIGV4aXN0cyBzbyBuZXcgY29kZSBpc24ndCB0ZW1wdGVkIHRvIGdvIGFuZCBnZXQgU0RLIGNyZWRlbnRpYWxzIGRpcmVjdGx5LlxuICovXG5leHBvcnQgY2xhc3MgRW52aXJvbm1lbnRBY2Nlc3Mge1xuICBwcml2YXRlIHJlYWRvbmx5IHNka0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFNka0ZvckVudmlyb25tZW50PigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGVudmlyb25tZW50UmVzb3VyY2VzOiBFbnZpcm9ubWVudFJlc291cmNlc1JlZ2lzdHJ5O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgc2RrUHJvdmlkZXI6IFNka1Byb3ZpZGVyLCB0b29sa2l0U3RhY2tOYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmVudmlyb25tZW50UmVzb3VyY2VzID0gbmV3IEVudmlyb25tZW50UmVzb3VyY2VzUmVnaXN0cnkodG9vbGtpdFN0YWNrTmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZXMgdGhlIGVudmlyb25tZW50IGZvciBhIHN0YWNrLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIHJlc29sdmVTdGFja0Vudmlyb25tZW50KHN0YWNrOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3QpOiBQcm9taXNlPGN4YXBpLkVudmlyb25tZW50PiB7XG4gICAgcmV0dXJuIHRoaXMuc2RrUHJvdmlkZXIucmVzb2x2ZUVudmlyb25tZW50KHN0YWNrLmVudmlyb25tZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYW4gU0RLIHRvIGFjY2VzcyB0aGUgZ2l2ZW4gc3RhY2sncyBlbnZpcm9ubWVudCBmb3Igc3RhY2sgb3BlcmF0aW9uc1xuICAgKlxuICAgKiBXaWxsIGFzayBwbHVnaW5zIGZvciByZWFkb25seSBjcmVkZW50aWFscyBpZiBhdmFpbGFibGUsIHVzZSB0aGUgZGVmYXVsdFxuICAgKiBBV1MgY3JlZGVudGlhbHMgaWYgbm90LlxuICAgKlxuICAgKiBXaWxsIGFzc3VtZSB0aGUgZGVwbG95IHJvbGUgaWYgY29uZmlndXJlZCBvbiB0aGUgc3RhY2suIENoZWNrIHRoZSBkZWZhdWx0IGBkZXBsb3ktcm9sZWBcbiAgICogcG9saWNpZXMgdG8gc2VlIHdoYXQgeW91IGNhbiBkbyB3aXRoIHRoaXMgcm9sZS5cbiAgICovXG4gIHB1YmxpYyBhc3luYyBhY2Nlc3NTdGFja0ZvclJlYWRPbmx5U3RhY2tPcGVyYXRpb25zKHN0YWNrOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3QpOiBQcm9taXNlPFRhcmdldEVudmlyb25tZW50PiB7XG4gICAgcmV0dXJuIHRoaXMuYWNjZXNzU3RhY2tGb3JTdGFja09wZXJhdGlvbnMoc3RhY2ssIE1vZGUuRm9yUmVhZGluZyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFuIFNESyB0byBhY2Nlc3MgdGhlIGdpdmVuIHN0YWNrJ3MgZW52aXJvbm1lbnQgZm9yIHN0YWNrIG9wZXJhdGlvbnNcbiAgICpcbiAgICogV2lsbCBhc2sgcGx1Z2lucyBmb3IgbXV0YXRpbmcgY3JlZGVudGlhbHMgaWYgYXZhaWxhYmxlLCB1c2UgdGhlIGRlZmF1bHQgQVdTXG4gICAqIGNyZWRlbnRpYWxzIGlmIG5vdC4gIFRoZSBgbW9kZWAgcGFyYW1ldGVyIGlzIG9ubHkgdXNlZCBmb3IgcXVlcnlpbmdcbiAgICogcGx1Z2lucy5cbiAgICpcbiAgICogV2lsbCBhc3N1bWUgdGhlIGRlcGxveSByb2xlIGlmIGNvbmZpZ3VyZWQgb24gdGhlIHN0YWNrLiBDaGVjayB0aGUgZGVmYXVsdCBgZGVwbG95LXJvbGVgXG4gICAqIHBvbGljaWVzIHRvIHNlZSB3aGF0IHlvdSBjYW4gZG8gd2l0aCB0aGlzIHJvbGUuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgYWNjZXNzU3RhY2tGb3JNdXRhYmxlU3RhY2tPcGVyYXRpb25zKHN0YWNrOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3QpOiBQcm9taXNlPFRhcmdldEVudmlyb25tZW50PiB7XG4gICAgcmV0dXJuIHRoaXMuYWNjZXNzU3RhY2tGb3JTdGFja09wZXJhdGlvbnMoc3RhY2ssIE1vZGUuRm9yV3JpdGluZyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFuIFNESyB0byBhY2Nlc3MgdGhlIGdpdmVuIHN0YWNrJ3MgZW52aXJvbm1lbnQgZm9yIGVudmlyb25tZW50YWwgbG9va3Vwc1xuICAgKlxuICAgKiBXaWxsIHVzZSBhIHBsdWdpbiBpZiBhdmFpbGFibGUsIHVzZSB0aGUgZGVmYXVsdCBBV1MgY3JlZGVudGlhbHMgaWYgbm90LlxuICAgKiBUaGUgYG1vZGVgIHBhcmFtZXRlciBpcyBvbmx5IHVzZWQgZm9yIHF1ZXJ5aW5nIHBsdWdpbnMuXG4gICAqXG4gICAqIFdpbGwgYXNzdW1lIHRoZSBsb29rdXAgcm9sZSBpZiBjb25maWd1cmVkIG9uIHRoZSBzdGFjay4gQ2hlY2sgdGhlIGRlZmF1bHQgYGxvb2t1cC1yb2xlYFxuICAgKiBwb2xpY2llcyB0byBzZWUgd2hhdCB5b3UgY2FuIGRvIHdpdGggdGhpcyByb2xlLiBJdCBjYW4gZ2VuZXJhbGx5IHJlYWQgZXZlcnl0aGluZ1xuICAgKiBpbiB0aGUgYWNjb3VudCB0aGF0IGRvZXMgbm90IHJlcXVpcmUgS01TIGFjY2Vzcy5cbiAgICpcbiAgICogLS0tXG4gICAqXG4gICAqIEZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSByZWFzb25zLCB0aGVyZSBhcmUgc29tZSBzY2VuYXJpb3MgdGhhdCBhcmUgaGFuZGxlZCBoZXJlOlxuICAgKlxuICAgKiAgMS4gVGhlIGxvb2t1cCByb2xlIG1heSBub3QgZXhpc3QgKGl0IHdhcyBhZGRlZCBpbiBib290c3RyYXAgc3RhY2sgdmVyc2lvbiA3KS4gSWYgc286XG4gICAqICAgICBhLiBSZXR1cm4gdGhlIGRlZmF1bHQgY3JlZGVudGlhbHMgaWYgdGhlIGRlZmF1bHQgY3JlZGVudGlhbHMgYXJlIGZvciB0aGUgc3RhY2sgYWNjb3VudFxuICAgKiAgICAgICAgKHlvdSB3aWxsIG5vdGljZSB0aGlzIGFzIGBpc0ZhbGxiYWNrQ3JlZGVudGlhbHM9dHJ1ZWApLlxuICAgKiAgICAgYi4gVGhyb3cgYW4gZXJyb3IgaWYgdGhlIGRlZmF1bHQgY3JlZGVudGlhbHMgYXJlIG5vdCBmb3IgdGhlIHN0YWNrIGFjY291bnQuXG4gICAqXG4gICAqICAyLiBUaGUgbG9va3VwIHJvbGUgbWF5IG5vdCBoYXZlIHRoZSBjb3JyZWN0IHBlcm1pc3Npb25zIChmb3IgZXhhbXBsZSwgUmVhZE9ubHlBY2Nlc3Mgd2FzIGFkZGVkIGluXG4gICAqICAgICBib290c3RyYXAgc3RhY2sgdmVyc2lvbiA4KTsgdGhlIHN0YWNrIHdpbGwgaGF2ZSBhIG1pbmltdW0gdmVyc2lvbiBudW1iZXIgb24gaXQuXG4gICAqICAgICBhLiBJZiBpdCBkb2VzIG5vdCB3ZSB0aHJvdyBhbiBlcnJvciB3aGljaCBzaG91bGQgYmUgaGFuZGxlZCBpbiB0aGUgY2FsbGluZ1xuICAgKiAgICAgICAgZnVuY3Rpb24gKGFuZCBmYWxsYmFjayB0byB1c2UgYSBkaWZmZXJlbnQgcm9sZSwgZXRjKVxuICAgKlxuICAgKiBVcG9uIHN1Y2Nlc3MsIGNhbGxlciB3aWxsIGhhdmUgYW4gU0RLIGZvciB0aGUgcmlnaHQgYWNjb3VudCwgd2hpY2ggbWF5IG9yIG1heSBub3QgaGF2ZVxuICAgKiB0aGUgcmlnaHQgcGVybWlzc2lvbnMuXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgYWNjZXNzU3RhY2tGb3JMb29rdXAoc3RhY2s6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdCk6IFByb21pc2U8VGFyZ2V0RW52aXJvbm1lbnQ+IHtcbiAgICBpZiAoIXN0YWNrLmVudmlyb25tZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBzdGFjayAke3N0YWNrLmRpc3BsYXlOYW1lfSBkb2VzIG5vdCBoYXZlIGFuIGVudmlyb25tZW50YCk7XG4gICAgfVxuXG4gICAgY29uc3QgbG9va3VwRW52ID0gYXdhaXQgdGhpcy5wcmVwYXJlU2RrKHtcbiAgICAgIGVudmlyb25tZW50OiBzdGFjay5lbnZpcm9ubWVudCxcbiAgICAgIG1vZGU6IE1vZGUuRm9yUmVhZGluZyxcbiAgICAgIGFzc3VtZVJvbGVBcm46IHN0YWNrLmxvb2t1cFJvbGU/LmFybixcbiAgICAgIGFzc3VtZVJvbGVFeHRlcm5hbElkOiBzdGFjay5sb29rdXBSb2xlPy5hc3N1bWVSb2xlRXh0ZXJuYWxJZCxcbiAgICAgIGFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9uczogc3RhY2subG9va3VwUm9sZT8uYXNzdW1lUm9sZUFkZGl0aW9uYWxPcHRpb25zLFxuICAgIH0pO1xuXG4gICAgLy8gaWYgd2Ugc3VjY2VlZCBpbiBhc3N1bWluZyB0aGUgbG9va3VwIHJvbGUsIG1ha2Ugc3VyZSB3ZSBoYXZlIHRoZSBjb3JyZWN0IGJvb3RzdHJhcCBzdGFjayB2ZXJzaW9uXG4gICAgaWYgKGxvb2t1cEVudi5kaWRBc3N1bWVSb2xlICYmIHN0YWNrLmxvb2t1cFJvbGU/LmJvb3RzdHJhcFN0YWNrVmVyc2lvblNzbVBhcmFtZXRlciAmJiBzdGFjay5sb29rdXBSb2xlLnJlcXVpcmVzQm9vdHN0cmFwU3RhY2tWZXJzaW9uKSB7XG4gICAgICBjb25zdCB2ZXJzaW9uID0gYXdhaXQgbG9va3VwRW52LnJlc291cmNlcy52ZXJzaW9uRnJvbVNzbVBhcmFtZXRlcihzdGFjay5sb29rdXBSb2xlLmJvb3RzdHJhcFN0YWNrVmVyc2lvblNzbVBhcmFtZXRlcik7XG4gICAgICBpZiAodmVyc2lvbiA8IHN0YWNrLmxvb2t1cFJvbGUucmVxdWlyZXNCb290c3RyYXBTdGFja1ZlcnNpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCb290c3RyYXAgc3RhY2sgdmVyc2lvbiAnJHtzdGFjay5sb29rdXBSb2xlLnJlcXVpcmVzQm9vdHN0cmFwU3RhY2tWZXJzaW9ufScgaXMgcmVxdWlyZWQsIGZvdW5kIHZlcnNpb24gJyR7dmVyc2lvbn0nLiBUbyBnZXQgcmlkIG9mIHRoaXMgZXJyb3IsIHBsZWFzZSB1cGdyYWRlIHRvIGJvb3RzdHJhcCB2ZXJzaW9uID49ICR7c3RhY2subG9va3VwUm9sZS5yZXF1aXJlc0Jvb3RzdHJhcFN0YWNrVmVyc2lvbn1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGxvb2t1cEVudi5pc0ZhbGxiYWNrQ3JlZGVudGlhbHMpIHtcbiAgICAgIGNvbnN0IGFybiA9IGF3YWl0IGxvb2t1cEVudi5yZXBsYWNlUGxhY2Vob2xkZXJzKHN0YWNrLmxvb2t1cFJvbGU/LmFybik7XG4gICAgICB3YXJuaW5nKGBMb29rdXAgcm9sZSAke2Fybn0gd2FzIG5vdCBhc3N1bWVkLiBQcm9jZWVkaW5nIHdpdGggZGVmYXVsdCBjcmVkZW50aWFscy5gKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvb2t1cEVudjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYW4gU0RLIHRvIGFjY2VzcyB0aGUgZ2l2ZW4gc3RhY2sncyBlbnZpcm9ubWVudCBmb3IgcmVhZGluZyBzdGFjayBhdHRyaWJ1dGVzXG4gICAqXG4gICAqIFdpbGwgdXNlIGEgcGx1Z2luIGlmIGF2YWlsYWJsZSwgdXNlIHRoZSBkZWZhdWx0IEFXUyBjcmVkZW50aWFscyBpZiBub3QuXG4gICAqIFRoZSBgbW9kZWAgcGFyYW1ldGVyIGlzIG9ubHkgdXNlZCBmb3IgcXVlcnlpbmcgcGx1Z2lucy5cbiAgICpcbiAgICogV2lsbCB0cnkgdG8gYXNzdW1lIHRoZSBsb29rdXAgcm9sZSBpZiBnaXZlbiwgd2lsbCB1c2UgdGhlIHJlZ3VsYXIgc3RhY2sgb3BlcmF0aW9uc1xuICAgKiBhY2Nlc3MgKGRlcGxveS1yb2xlKSBvdGhlcndpc2UuIFdoZW4gY2FsbGluZyB0aGlzLCB5b3Ugc2hvdWxkIGFzc3VtZSB0aGF0IHlvdSB3aWxsIGdldFxuICAgKiB0aGUgbGVhc3QgcHJpdmlsZWdlZCByb2xlLCBzbyBkb24ndCB0cnkgdG8gdXNlIGl0IGZvciBhbnl0aGluZyB0aGUgYGRlcGxveS1yb2xlYFxuICAgKiB3b3VsZG4ndCBiZSBhYmxlIHRvIGRvLiBBbHNvIHlvdSBjYW5ub3QgcmVseSBvbiBiZWluZyBhYmxlIHRvIHJlYWQgZW5jcnlwdGVkIGFueXRoaW5nLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGFjY2Vzc1N0YWNrRm9yTG9va3VwQmVzdEVmZm9ydChzdGFjazogY3hhcGkuQ2xvdWRGb3JtYXRpb25TdGFja0FydGlmYWN0KTogUHJvbWlzZTxUYXJnZXRFbnZpcm9ubWVudD4ge1xuICAgIGlmICghc3RhY2suZW52aXJvbm1lbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHN0YWNrICR7c3RhY2suZGlzcGxheU5hbWV9IGRvZXMgbm90IGhhdmUgYW4gZW52aXJvbm1lbnRgKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYWNjZXNzU3RhY2tGb3JMb29rdXAoc3RhY2spO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgd2FybmluZyhgJHtlLm1lc3NhZ2V9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFjY2Vzc1N0YWNrRm9yU3RhY2tPcGVyYXRpb25zKHN0YWNrLCBNb2RlLkZvclJlYWRpbmcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbiBTREsgdG8gYWNjZXNzIHRoZSBnaXZlbiBzdGFjaydzIGVudmlyb25tZW50IGZvciBzdGFjayBvcGVyYXRpb25zXG4gICAqXG4gICAqIFdpbGwgdXNlIGEgcGx1Z2luIGlmIGF2YWlsYWJsZSwgdXNlIHRoZSBkZWZhdWx0IEFXUyBjcmVkZW50aWFscyBpZiBub3QuXG4gICAqIFRoZSBgbW9kZWAgcGFyYW1ldGVyIGlzIG9ubHkgdXNlZCBmb3IgcXVlcnlpbmcgcGx1Z2lucy5cbiAgICpcbiAgICogV2lsbCBhc3N1bWUgdGhlIGRlcGxveSByb2xlIGlmIGNvbmZpZ3VyZWQgb24gdGhlIHN0YWNrLiBDaGVjayB0aGUgZGVmYXVsdCBgZGVwbG95LXJvbGVgXG4gICAqIHBvbGljaWVzIHRvIHNlZSB3aGF0IHlvdSBjYW4gZG8gd2l0aCB0aGlzIHJvbGUuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGFjY2Vzc1N0YWNrRm9yU3RhY2tPcGVyYXRpb25zKHN0YWNrOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3QsIG1vZGU6IE1vZGUpOiBQcm9taXNlPFRhcmdldEVudmlyb25tZW50PiB7XG4gICAgaWYgKCFzdGFjay5lbnZpcm9ubWVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgc3RhY2sgJHtzdGFjay5kaXNwbGF5TmFtZX0gZG9lcyBub3QgaGF2ZSBhbiBlbnZpcm9ubWVudGApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnByZXBhcmVTZGsoe1xuICAgICAgZW52aXJvbm1lbnQ6IHN0YWNrLmVudmlyb25tZW50LFxuICAgICAgbW9kZSxcbiAgICAgIGFzc3VtZVJvbGVBcm46IHN0YWNrLmFzc3VtZVJvbGVBcm4sXG4gICAgICBhc3N1bWVSb2xlRXh0ZXJuYWxJZDogc3RhY2suYXNzdW1lUm9sZUV4dGVybmFsSWQsXG4gICAgICBhc3N1bWVSb2xlQWRkaXRpb25hbE9wdGlvbnM6IHN0YWNrLmFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucyxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIGFuIFNESyBmb3IgdXNlIGluIHRoZSBnaXZlbiBlbnZpcm9ubWVudCBhbmQgb3B0aW9uYWxseSB3aXRoIGEgcm9sZSBhc3N1bWVkLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwcmVwYXJlU2RrKFxuICAgIG9wdGlvbnM6IFByZXBhcmVTZGtSb2xlT3B0aW9ucyxcbiAgKTogUHJvbWlzZTxUYXJnZXRFbnZpcm9ubWVudD4ge1xuICAgIGNvbnN0IHJlc29sdmVkRW52aXJvbm1lbnQgPSBhd2FpdCB0aGlzLnNka1Byb3ZpZGVyLnJlc29sdmVFbnZpcm9ubWVudChvcHRpb25zLmVudmlyb25tZW50KTtcblxuICAgIC8vIFN1YnN0aXR1dGUgYW55IHBsYWNlaG9sZGVycyB3aXRoIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IGVudmlyb25tZW50XG4gICAgY29uc3QgeyBhc3N1bWVSb2xlQXJuIH0gPSBhd2FpdCByZXBsYWNlRW52UGxhY2Vob2xkZXJzKHtcbiAgICAgIGFzc3VtZVJvbGVBcm46IG9wdGlvbnMuYXNzdW1lUm9sZUFybixcbiAgICB9LCByZXNvbHZlZEVudmlyb25tZW50LCB0aGlzLnNka1Byb3ZpZGVyKTtcblxuICAgIGNvbnN0IHN0YWNrU2RrID0gYXdhaXQgdGhpcy5jYWNoZWRTZGtGb3JFbnZpcm9ubWVudChyZXNvbHZlZEVudmlyb25tZW50LCBvcHRpb25zLm1vZGUsIHtcbiAgICAgIGFzc3VtZVJvbGVBcm4sXG4gICAgICBhc3N1bWVSb2xlRXh0ZXJuYWxJZDogb3B0aW9ucy5hc3N1bWVSb2xlRXh0ZXJuYWxJZCxcbiAgICAgIGFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9uczogb3B0aW9ucy5hc3N1bWVSb2xlQWRkaXRpb25hbE9wdGlvbnMsXG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc2RrOiBzdGFja1Nkay5zZGssXG4gICAgICByZXNvbHZlZEVudmlyb25tZW50LFxuICAgICAgcmVzb3VyY2VzOiB0aGlzLmVudmlyb25tZW50UmVzb3VyY2VzLmZvcihyZXNvbHZlZEVudmlyb25tZW50LCBzdGFja1Nkay5zZGspLFxuICAgICAgLy8gSWYgd2UgYXNrZWQgZm9yIGEgcm9sZSwgZGlkIG5vdCBzdWNjZXNzZnVsbHkgYXNzdW1lIGl0LCBhbmQgeWV0IGdvdCBoZXJlIHdpdGhvdXQgYW4gZXhjZXB0aW9uOiB0aGF0XG4gICAgICAvLyBtZWFucyB3ZSBtdXN0IGhhdmUgZmFsbGJhY2sgY3JlZGVudGlhbHMuXG4gICAgICBpc0ZhbGxiYWNrQ3JlZGVudGlhbHM6ICFzdGFja1Nkay5kaWRBc3N1bWVSb2xlICYmICEhYXNzdW1lUm9sZUFybixcbiAgICAgIGRpZEFzc3VtZVJvbGU6IHN0YWNrU2RrLmRpZEFzc3VtZVJvbGUsXG4gICAgICByZXBsYWNlUGxhY2Vob2xkZXJzOiBhc3luYyA8QSBleHRlbmRzIHN0cmluZyB8IHVuZGVmaW5lZD4oc3RyOiBBKSA9PiB7XG4gICAgICAgIGNvbnN0IHJldCA9IGF3YWl0IHJlcGxhY2VFbnZQbGFjZWhvbGRlcnMoeyBzdHIgfSwgcmVzb2x2ZWRFbnZpcm9ubWVudCwgdGhpcy5zZGtQcm92aWRlcik7XG4gICAgICAgIHJldHVybiByZXQuc3RyO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjYWNoZWRTZGtGb3JFbnZpcm9ubWVudChcbiAgICBlbnZpcm9ubWVudDogY3hhcGkuRW52aXJvbm1lbnQsXG4gICAgbW9kZTogTW9kZSxcbiAgICBvcHRpb25zPzogQ3JlZGVudGlhbHNPcHRpb25zLFxuICApIHtcbiAgICBjb25zdCBjYWNoZUtleUVsZW1lbnRzID0gW1xuICAgICAgZW52aXJvbm1lbnQuYWNjb3VudCxcbiAgICAgIGVudmlyb25tZW50LnJlZ2lvbixcbiAgICAgIGAke21vZGV9YCxcbiAgICAgIG9wdGlvbnM/LmFzc3VtZVJvbGVBcm4gPz8gJycsXG4gICAgICBvcHRpb25zPy5hc3N1bWVSb2xlRXh0ZXJuYWxJZCA/PyAnJyxcbiAgICBdO1xuXG4gICAgaWYgKG9wdGlvbnM/LmFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucykge1xuICAgICAgY2FjaGVLZXlFbGVtZW50cy5wdXNoKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuYXNzdW1lUm9sZUFkZGl0aW9uYWxPcHRpb25zKSk7XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGVLZXkgPSBjYWNoZUtleUVsZW1lbnRzLmpvaW4oJzonKTtcbiAgICBjb25zdCBleGlzdGluZyA9IHRoaXMuc2RrQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIHJldHVybiBleGlzdGluZztcbiAgICB9XG4gICAgY29uc3QgcmV0ID0gYXdhaXQgdGhpcy5zZGtQcm92aWRlci5mb3JFbnZpcm9ubWVudChlbnZpcm9ubWVudCwgbW9kZSwgb3B0aW9ucyk7XG4gICAgdGhpcy5zZGtDYWNoZS5zZXQoY2FjaGVLZXksIHJldCk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufVxuXG4vKipcbiAqIFNESyBvYnRhaW5lZCBieSBhc3N1bWluZyB0aGUgZGVwbG95IHJvbGVcbiAqIGZvciBhIGdpdmVuIGVudmlyb25tZW50XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGFyZ2V0RW52aXJvbm1lbnQge1xuICAvKipcbiAgICogVGhlIFNESyBmb3IgdGhlIGdpdmVuIGVudmlyb25tZW50XG4gICAqL1xuICByZWFkb25seSBzZGs6IFNESztcblxuICAvKipcbiAgICogVGhlIHJlc29sdmVkIGVudmlyb25tZW50IGZvciB0aGUgc3RhY2tcbiAgICogKG5vIG1vcmUgJ3Vua25vd24tYWNjb3VudC91bmtub3duLXJlZ2lvbicpXG4gICAqL1xuICByZWFkb25seSByZXNvbHZlZEVudmlyb25tZW50OiBjeGFwaS5FbnZpcm9ubWVudDtcblxuICAvKipcbiAgICogQWNjZXNzIGNsYXNzIGZvciBlbnZpcm9ubWVudGFsIHJlc291cmNlcyB0byBoZWxwIHRoZSBkZXBsb3ltZW50XG4gICAqL1xuICByZWFkb25seSByZXNvdXJjZXM6IEVudmlyb25tZW50UmVzb3VyY2VzO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG9yIG5vdCB3ZSBhc3N1bWVkIGEgcm9sZSBpbiB0aGUgcHJvY2VzcyBvZiBnZXR0aW5nIHRoZXNlIGNyZWRlbnRpYWxzXG4gICAqL1xuICByZWFkb25seSBkaWRBc3N1bWVSb2xlOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG9yIG5vdCB0aGVzZSBhcmUgZmFsbGJhY2sgY3JlZGVudGlhbHNcbiAgICpcbiAgICogRmFsbGJhY2sgY3JlZGVudGlhbHMgbWVhbnMgdGhhdCBhc3N1bWluZyB0aGUgaW50ZW5kZWQgcm9sZSBmYWlsZWQsIGJ1dCB0aGVcbiAgICogYmFzZSBjcmVkZW50aWFscyBoYXBwZW4gdG8gYmUgZm9yIHRoZSByaWdodCBhY2NvdW50IHNvIHdlIGp1c3QgcGlja2VkIHRob3NlXG4gICAqIGFuZCBob3BlIHRoZSBmdXR1cmUgU0RLIGNhbGxzIHN1Y2NlZWQuXG4gICAqXG4gICAqIFRoaXMgaXMgYSBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBtZWNoYW5pc20gZnJvbSBhcm91bmQgdGhlIHRpbWUgd2UgaW50cm9kdWNlZFxuICAgKiBkZXBsb3ltZW50IHJvbGVzLlxuICAgKi9cbiAgcmVhZG9ubHkgaXNGYWxsYmFja0NyZWRlbnRpYWxzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBSZXBsYWNlIGVudmlyb25tZW50IHBsYWNlaG9sZGVycyBhY2NvcmRpbmcgdG8gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnRcbiAgICovXG4gIHJlcGxhY2VQbGFjZWhvbGRlcnMoeDogc3RyaW5nIHwgdW5kZWZpbmVkKTogUHJvbWlzZTxTdHJpbmdXaXRob3V0UGxhY2Vob2xkZXJzIHwgdW5kZWZpbmVkPjtcbn1cblxuaW50ZXJmYWNlIFByZXBhcmVTZGtSb2xlT3B0aW9ucyB7XG4gIHJlYWRvbmx5IGVudmlyb25tZW50OiBjeGFwaS5FbnZpcm9ubWVudDtcbiAgcmVhZG9ubHkgbW9kZTogTW9kZTtcbiAgcmVhZG9ubHkgYXNzdW1lUm9sZUFybj86IHN0cmluZztcbiAgcmVhZG9ubHkgYXNzdW1lUm9sZUV4dGVybmFsSWQ/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGFzc3VtZVJvbGVBZGRpdGlvbmFsT3B0aW9ucz86IHsgW2tleTogc3RyaW5nXTogYW55IH07XG59XG4iXX0=