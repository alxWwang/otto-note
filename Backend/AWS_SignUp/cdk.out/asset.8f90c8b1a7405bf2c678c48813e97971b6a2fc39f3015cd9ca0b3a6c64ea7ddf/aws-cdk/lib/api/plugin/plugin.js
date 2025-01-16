"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginHost = exports.TESTING = void 0;
exports.markTesting = markTesting;
const util_1 = require("util");
const chalk = require("chalk");
const context_provider_plugin_1 = require("./context-provider-plugin");
const logging_1 = require("../../logging");
const error_1 = require("../../toolkit/error");
exports.TESTING = false;
function markTesting() {
    exports.TESTING = true;
}
/**
 * A utility to manage plug-ins.
 *
 */
class PluginHost {
    constructor() {
        /**
         * Access the currently registered CredentialProviderSources. New sources can
         * be registered using the +registerCredentialProviderSource+ method.
         */
        this.credentialProviderSources = new Array();
        this.contextProviderPlugins = {};
        if (!exports.TESTING && PluginHost.instance && PluginHost.instance !== this) {
            throw new error_1.ToolkitError('New instances of PluginHost must not be built. Use PluginHost.instance instead!');
        }
    }
    /**
     * Loads a plug-in into this PluginHost.
     *
     * @param moduleSpec the specification (path or name) of the plug-in module to be loaded.
     */
    load(moduleSpec) {
        try {
            /* eslint-disable @typescript-eslint/no-require-imports */
            const plugin = require(moduleSpec);
            /* eslint-enable */
            if (!isPlugin(plugin)) {
                (0, logging_1.error)(`Module ${chalk.green(moduleSpec)} is not a valid plug-in, or has an unsupported version.`);
                throw new error_1.ToolkitError(`Module ${moduleSpec} does not define a valid plug-in.`);
            }
            if (plugin.init) {
                plugin.init(this);
            }
        }
        catch (e) {
            (0, logging_1.error)(`Unable to load ${chalk.green(moduleSpec)}: ${e.stack}`);
            throw new error_1.ToolkitError(`Unable to load plug-in: ${moduleSpec}: ${e}`);
        }
        function isPlugin(x) {
            return x != null && x.version === '1';
        }
    }
    /**
     * Allows plug-ins to register new CredentialProviderSources.
     *
     * @param source a new CredentialProviderSource to register.
     */
    registerCredentialProviderSource(source) {
        // Forward to the right credentials-related plugin host
        this.credentialProviderSources.push(source);
    }
    /**
     * (EXPERIMENTAL) Allow plugins to register context providers
     *
     * Context providers are objects with the following method:
     *
     * ```ts
     *   getValue(args: {[key: string]: any}): Promise<any>;
     * ```
     *
     * Currently, they cannot reuse the CDK's authentication mechanisms, so they
     * must be prepared to either not make AWS calls or use their own source of
     * AWS credentials.
     *
     * This feature is experimental, and only intended to be used internally at Amazon
     * as a trial.
     *
     * After registering with 'my-plugin-name', the provider must be addressed as follows:
     *
     * ```ts
     * const value = ContextProvider.getValue(this, {
     *   providerName: 'plugin',
     *   props: {
     *     pluginName: 'my-plugin-name',
     *     myParameter1: 'xyz',
     *   },
     *   includeEnvironment: true | false,
     *   dummyValue: 'what-to-return-on-the-first-pass',
     * })
     * ```
     *
     * @experimental
     */
    registerContextProviderAlpha(pluginProviderName, provider) {
        if (!(0, context_provider_plugin_1.isContextProviderPlugin)(provider)) {
            throw new error_1.ToolkitError(`Object you gave me does not look like a ContextProviderPlugin: ${(0, util_1.inspect)(provider)}`);
        }
        this.contextProviderPlugins[pluginProviderName] = provider;
    }
}
exports.PluginHost = PluginHost;
PluginHost.instance = new PluginHost();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQVVBLGtDQUVDO0FBWkQsK0JBQStCO0FBRS9CLCtCQUErQjtBQUUvQix1RUFBZ0c7QUFDaEcsMkNBQXNDO0FBQ3RDLCtDQUFtRDtBQUV4QyxRQUFBLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFFM0IsU0FBZ0IsV0FBVztJQUN6QixlQUFPLEdBQUcsSUFBSSxDQUFDO0FBQ2pCLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFhLFVBQVU7SUFXckI7UUFSQTs7O1dBR0c7UUFDYSw4QkFBeUIsR0FBRyxJQUFJLEtBQUssRUFBNEIsQ0FBQztRQUVsRSwyQkFBc0IsR0FBMEMsRUFBRSxDQUFDO1FBR2pGLElBQUksQ0FBQyxlQUFPLElBQUksVUFBVSxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3BFLE1BQU0sSUFBSSxvQkFBWSxDQUFDLGlGQUFpRixDQUFDLENBQUM7UUFDNUcsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksSUFBSSxDQUFDLFVBQWtCO1FBQzVCLElBQUksQ0FBQztZQUNILDBEQUEwRDtZQUMxRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkMsbUJBQW1CO1lBQ25CLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsSUFBQSxlQUFLLEVBQUMsVUFBVSxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO2dCQUNsRyxNQUFNLElBQUksb0JBQVksQ0FBQyxVQUFVLFVBQVUsbUNBQW1DLENBQUMsQ0FBQztZQUNsRixDQUFDO1lBQ0QsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEIsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLENBQU0sRUFBRSxDQUFDO1lBQ2hCLElBQUEsZUFBSyxFQUFDLGtCQUFrQixLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sSUFBSSxvQkFBWSxDQUFDLDJCQUEyQixVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsU0FBUyxRQUFRLENBQUMsQ0FBTTtZQUN0QixPQUFPLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxHQUFHLENBQUM7UUFDeEMsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksZ0NBQWdDLENBQUMsTUFBZ0M7UUFDdEUsdURBQXVEO1FBQ3ZELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BK0JHO0lBQ0ksNEJBQTRCLENBQUMsa0JBQTBCLEVBQUUsUUFBK0I7UUFDN0YsSUFBSSxDQUFDLElBQUEsaURBQXVCLEVBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksb0JBQVksQ0FBQyxrRUFBa0UsSUFBQSxjQUFPLEVBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hILENBQUM7UUFDRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxRQUFRLENBQUM7SUFDN0QsQ0FBQzs7QUEzRkgsZ0NBNEZDO0FBM0ZlLG1CQUFRLEdBQUcsSUFBSSxVQUFVLEVBQUUsQUFBbkIsQ0FBb0IiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpbnNwZWN0IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgdHlwZSB7IENyZWRlbnRpYWxQcm92aWRlclNvdXJjZSwgSVBsdWdpbkhvc3QsIFBsdWdpbiB9IGZyb20gJ0Bhd3MtY2RrL2NsaS1wbHVnaW4tY29udHJhY3QnO1xuaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5pbXBvcnQgeyB0eXBlIENvbnRleHRQcm92aWRlclBsdWdpbiwgaXNDb250ZXh0UHJvdmlkZXJQbHVnaW4gfSBmcm9tICcuL2NvbnRleHQtcHJvdmlkZXItcGx1Z2luJztcbmltcG9ydCB7IGVycm9yIH0gZnJvbSAnLi4vLi4vbG9nZ2luZyc7XG5pbXBvcnQgeyBUb29sa2l0RXJyb3IgfSBmcm9tICcuLi8uLi90b29sa2l0L2Vycm9yJztcblxuZXhwb3J0IGxldCBURVNUSU5HID0gZmFsc2U7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXJrVGVzdGluZygpIHtcbiAgVEVTVElORyA9IHRydWU7XG59XG5cbi8qKlxuICogQSB1dGlsaXR5IHRvIG1hbmFnZSBwbHVnLWlucy5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBQbHVnaW5Ib3N0IGltcGxlbWVudHMgSVBsdWdpbkhvc3Qge1xuICBwdWJsaWMgc3RhdGljIGluc3RhbmNlID0gbmV3IFBsdWdpbkhvc3QoKTtcblxuICAvKipcbiAgICogQWNjZXNzIHRoZSBjdXJyZW50bHkgcmVnaXN0ZXJlZCBDcmVkZW50aWFsUHJvdmlkZXJTb3VyY2VzLiBOZXcgc291cmNlcyBjYW5cbiAgICogYmUgcmVnaXN0ZXJlZCB1c2luZyB0aGUgK3JlZ2lzdGVyQ3JlZGVudGlhbFByb3ZpZGVyU291cmNlKyBtZXRob2QuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgY3JlZGVudGlhbFByb3ZpZGVyU291cmNlcyA9IG5ldyBBcnJheTxDcmVkZW50aWFsUHJvdmlkZXJTb3VyY2U+KCk7XG5cbiAgcHVibGljIHJlYWRvbmx5IGNvbnRleHRQcm92aWRlclBsdWdpbnM6IFJlY29yZDxzdHJpbmcsIENvbnRleHRQcm92aWRlclBsdWdpbj4gPSB7fTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBpZiAoIVRFU1RJTkcgJiYgUGx1Z2luSG9zdC5pbnN0YW5jZSAmJiBQbHVnaW5Ib3N0Lmluc3RhbmNlICE9PSB0aGlzKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdOZXcgaW5zdGFuY2VzIG9mIFBsdWdpbkhvc3QgbXVzdCBub3QgYmUgYnVpbHQuIFVzZSBQbHVnaW5Ib3N0Lmluc3RhbmNlIGluc3RlYWQhJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvYWRzIGEgcGx1Zy1pbiBpbnRvIHRoaXMgUGx1Z2luSG9zdC5cbiAgICpcbiAgICogQHBhcmFtIG1vZHVsZVNwZWMgdGhlIHNwZWNpZmljYXRpb24gKHBhdGggb3IgbmFtZSkgb2YgdGhlIHBsdWctaW4gbW9kdWxlIHRvIGJlIGxvYWRlZC5cbiAgICovXG4gIHB1YmxpYyBsb2FkKG1vZHVsZVNwZWM6IHN0cmluZykge1xuICAgIHRyeSB7XG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzICovXG4gICAgICBjb25zdCBwbHVnaW4gPSByZXF1aXJlKG1vZHVsZVNwZWMpO1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAqL1xuICAgICAgaWYgKCFpc1BsdWdpbihwbHVnaW4pKSB7XG4gICAgICAgIGVycm9yKGBNb2R1bGUgJHtjaGFsay5ncmVlbihtb2R1bGVTcGVjKX0gaXMgbm90IGEgdmFsaWQgcGx1Zy1pbiwgb3IgaGFzIGFuIHVuc3VwcG9ydGVkIHZlcnNpb24uYCk7XG4gICAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYE1vZHVsZSAke21vZHVsZVNwZWN9IGRvZXMgbm90IGRlZmluZSBhIHZhbGlkIHBsdWctaW4uYCk7XG4gICAgICB9XG4gICAgICBpZiAocGx1Z2luLmluaXQpIHtcbiAgICAgICAgcGx1Z2luLmluaXQodGhpcyk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICBlcnJvcihgVW5hYmxlIHRvIGxvYWQgJHtjaGFsay5ncmVlbihtb2R1bGVTcGVjKX06ICR7ZS5zdGFja31gKTtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYFVuYWJsZSB0byBsb2FkIHBsdWctaW46ICR7bW9kdWxlU3BlY306ICR7ZX1gKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1BsdWdpbih4OiBhbnkpOiB4IGlzIFBsdWdpbiB7XG4gICAgICByZXR1cm4geCAhPSBudWxsICYmIHgudmVyc2lvbiA9PT0gJzEnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvd3MgcGx1Zy1pbnMgdG8gcmVnaXN0ZXIgbmV3IENyZWRlbnRpYWxQcm92aWRlclNvdXJjZXMuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2UgYSBuZXcgQ3JlZGVudGlhbFByb3ZpZGVyU291cmNlIHRvIHJlZ2lzdGVyLlxuICAgKi9cbiAgcHVibGljIHJlZ2lzdGVyQ3JlZGVudGlhbFByb3ZpZGVyU291cmNlKHNvdXJjZTogQ3JlZGVudGlhbFByb3ZpZGVyU291cmNlKSB7XG4gICAgLy8gRm9yd2FyZCB0byB0aGUgcmlnaHQgY3JlZGVudGlhbHMtcmVsYXRlZCBwbHVnaW4gaG9zdFxuICAgIHRoaXMuY3JlZGVudGlhbFByb3ZpZGVyU291cmNlcy5wdXNoKHNvdXJjZSk7XG4gIH1cblxuICAvKipcbiAgICogKEVYUEVSSU1FTlRBTCkgQWxsb3cgcGx1Z2lucyB0byByZWdpc3RlciBjb250ZXh0IHByb3ZpZGVyc1xuICAgKlxuICAgKiBDb250ZXh0IHByb3ZpZGVycyBhcmUgb2JqZWN0cyB3aXRoIHRoZSBmb2xsb3dpbmcgbWV0aG9kOlxuICAgKlxuICAgKiBgYGB0c1xuICAgKiAgIGdldFZhbHVlKGFyZ3M6IHtba2V5OiBzdHJpbmddOiBhbnl9KTogUHJvbWlzZTxhbnk+O1xuICAgKiBgYGBcbiAgICpcbiAgICogQ3VycmVudGx5LCB0aGV5IGNhbm5vdCByZXVzZSB0aGUgQ0RLJ3MgYXV0aGVudGljYXRpb24gbWVjaGFuaXNtcywgc28gdGhleVxuICAgKiBtdXN0IGJlIHByZXBhcmVkIHRvIGVpdGhlciBub3QgbWFrZSBBV1MgY2FsbHMgb3IgdXNlIHRoZWlyIG93biBzb3VyY2Ugb2ZcbiAgICogQVdTIGNyZWRlbnRpYWxzLlxuICAgKlxuICAgKiBUaGlzIGZlYXR1cmUgaXMgZXhwZXJpbWVudGFsLCBhbmQgb25seSBpbnRlbmRlZCB0byBiZSB1c2VkIGludGVybmFsbHkgYXQgQW1hem9uXG4gICAqIGFzIGEgdHJpYWwuXG4gICAqXG4gICAqIEFmdGVyIHJlZ2lzdGVyaW5nIHdpdGggJ215LXBsdWdpbi1uYW1lJywgdGhlIHByb3ZpZGVyIG11c3QgYmUgYWRkcmVzc2VkIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGNvbnN0IHZhbHVlID0gQ29udGV4dFByb3ZpZGVyLmdldFZhbHVlKHRoaXMsIHtcbiAgICogICBwcm92aWRlck5hbWU6ICdwbHVnaW4nLFxuICAgKiAgIHByb3BzOiB7XG4gICAqICAgICBwbHVnaW5OYW1lOiAnbXktcGx1Z2luLW5hbWUnLFxuICAgKiAgICAgbXlQYXJhbWV0ZXIxOiAneHl6JyxcbiAgICogICB9LFxuICAgKiAgIGluY2x1ZGVFbnZpcm9ubWVudDogdHJ1ZSB8IGZhbHNlLFxuICAgKiAgIGR1bW15VmFsdWU6ICd3aGF0LXRvLXJldHVybi1vbi10aGUtZmlyc3QtcGFzcycsXG4gICAqIH0pXG4gICAqIGBgYFxuICAgKlxuICAgKiBAZXhwZXJpbWVudGFsXG4gICAqL1xuICBwdWJsaWMgcmVnaXN0ZXJDb250ZXh0UHJvdmlkZXJBbHBoYShwbHVnaW5Qcm92aWRlck5hbWU6IHN0cmluZywgcHJvdmlkZXI6IENvbnRleHRQcm92aWRlclBsdWdpbikge1xuICAgIGlmICghaXNDb250ZXh0UHJvdmlkZXJQbHVnaW4ocHJvdmlkZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBPYmplY3QgeW91IGdhdmUgbWUgZG9lcyBub3QgbG9vayBsaWtlIGEgQ29udGV4dFByb3ZpZGVyUGx1Z2luOiAke2luc3BlY3QocHJvdmlkZXIpfWApO1xuICAgIH1cbiAgICB0aGlzLmNvbnRleHRQcm92aWRlclBsdWdpbnNbcGx1Z2luUHJvdmlkZXJOYW1lXSA9IHByb3ZpZGVyO1xuICB9XG59XG4iXX0=