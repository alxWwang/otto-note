"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = exports.Context = exports.Configuration = exports.Command = exports.TRANSIENT_CONTEXT_KEY = exports.USER_DEFAULTS = exports.PROJECT_CONTEXT = exports.PROJECT_CONFIG = void 0;
const os = require("os");
const fs_path = require("path");
const fs = require("fs-extra");
const logging_1 = require("./logging");
const error_1 = require("./toolkit/error");
const util = require("./util");
exports.PROJECT_CONFIG = 'cdk.json';
exports.PROJECT_CONTEXT = 'cdk.context.json';
exports.USER_DEFAULTS = '~/.cdk.json';
/**
 * If a context value is an object with this key set to a truthy value, it won't be saved to cdk.context.json
 */
exports.TRANSIENT_CONTEXT_KEY = '$dontSaveContext';
const CONTEXT_KEY = 'context';
var Command;
(function (Command) {
    Command["LS"] = "ls";
    Command["LIST"] = "list";
    Command["DIFF"] = "diff";
    Command["BOOTSTRAP"] = "bootstrap";
    Command["DEPLOY"] = "deploy";
    Command["DESTROY"] = "destroy";
    Command["SYNTHESIZE"] = "synthesize";
    Command["SYNTH"] = "synth";
    Command["METADATA"] = "metadata";
    Command["INIT"] = "init";
    Command["VERSION"] = "version";
    Command["WATCH"] = "watch";
    Command["GC"] = "gc";
    Command["ROLLBACK"] = "rollback";
    Command["IMPORT"] = "import";
    Command["ACKNOWLEDGE"] = "acknowledge";
    Command["NOTICES"] = "notices";
    Command["MIGRATE"] = "migrate";
    Command["CONTEXT"] = "context";
    Command["DOCS"] = "docs";
    Command["DOCTOR"] = "doctor";
})(Command || (exports.Command = Command = {}));
const BUNDLING_COMMANDS = [
    Command.DEPLOY,
    Command.DIFF,
    Command.SYNTH,
    Command.SYNTHESIZE,
    Command.WATCH,
];
/**
 * All sources of settings combined
 */
class Configuration {
    constructor(props = {}) {
        this.props = props;
        this.settings = new Settings();
        this.context = new Context();
        this.defaultConfig = new Settings({
            versionReporting: true,
            assetMetadata: true,
            pathMetadata: true,
            output: 'cdk.out',
        });
        this.loaded = false;
        this.commandLineArguments = props.commandLineArguments
            ? Settings.fromCommandLineArguments(props.commandLineArguments)
            : new Settings();
        this.commandLineContext = this.commandLineArguments.subSettings([CONTEXT_KEY]).makeReadOnly();
    }
    get projectConfig() {
        if (!this._projectConfig) {
            throw new error_1.ToolkitError('#load has not been called yet!');
        }
        return this._projectConfig;
    }
    get projectContext() {
        if (!this._projectContext) {
            throw new error_1.ToolkitError('#load has not been called yet!');
        }
        return this._projectContext;
    }
    /**
     * Load all config
     */
    async load() {
        const userConfig = await loadAndLog(exports.USER_DEFAULTS);
        this._projectConfig = await loadAndLog(exports.PROJECT_CONFIG);
        this._projectContext = await loadAndLog(exports.PROJECT_CONTEXT);
        const readUserContext = this.props.readUserContext ?? true;
        if (userConfig.get(['build'])) {
            throw new error_1.ToolkitError('The `build` key cannot be specified in the user config (~/.cdk.json), specify it in the project config (cdk.json) instead');
        }
        const contextSources = [
            { bag: this.commandLineContext },
            { fileName: exports.PROJECT_CONFIG, bag: this.projectConfig.subSettings([CONTEXT_KEY]).makeReadOnly() },
            { fileName: exports.PROJECT_CONTEXT, bag: this.projectContext },
        ];
        if (readUserContext) {
            contextSources.push({ fileName: exports.USER_DEFAULTS, bag: userConfig.subSettings([CONTEXT_KEY]).makeReadOnly() });
        }
        this.context = new Context(...contextSources);
        // Build settings from what's left
        this.settings = this.defaultConfig
            .merge(userConfig)
            .merge(this.projectConfig)
            .merge(this.commandLineArguments)
            .makeReadOnly();
        (0, logging_1.debug)('merged settings:', this.settings.all);
        this.loaded = true;
        return this;
    }
    /**
     * Save the project context
     */
    async saveContext() {
        if (!this.loaded) {
            return this;
        } // Avoid overwriting files with nothing
        await this.projectContext.save(exports.PROJECT_CONTEXT);
        return this;
    }
}
exports.Configuration = Configuration;
async function loadAndLog(fileName) {
    const ret = new Settings();
    await ret.load(fileName);
    if (!ret.empty) {
        (0, logging_1.debug)(fileName + ':', JSON.stringify(ret.all, undefined, 2));
    }
    return ret;
}
/**
 * Class that supports overlaying property bags
 *
 * Reads come from the first property bag that can has the given key,
 * writes go to the first property bag that is not readonly. A write
 * will remove the value from all property bags after the first
 * writable one.
 */
class Context {
    constructor(...bags) {
        this.bags = bags.length > 0 ? bags.map(b => b.bag) : [new Settings()];
        this.fileNames = bags.length > 0 ? bags.map(b => b.fileName) : ['default'];
    }
    get keys() {
        return Object.keys(this.all);
    }
    has(key) {
        return this.keys.indexOf(key) > -1;
    }
    get all() {
        let ret = new Settings();
        // In reverse order so keys to the left overwrite keys to the right of them
        for (const bag of [...this.bags].reverse()) {
            ret = ret.merge(bag);
        }
        return ret.all;
    }
    get(key) {
        for (const bag of this.bags) {
            const v = bag.get([key]);
            if (v !== undefined) {
                return v;
            }
        }
        return undefined;
    }
    set(key, value) {
        for (const bag of this.bags) {
            if (bag.readOnly) {
                continue;
            }
            // All bags past the first one have the value erased
            bag.set([key], value);
            value = undefined;
        }
    }
    unset(key) {
        this.set(key, undefined);
    }
    clear() {
        for (const key of this.keys) {
            this.unset(key);
        }
    }
    /**
     * Save a specific context file
     */
    async save(fileName) {
        const index = this.fileNames.indexOf(fileName);
        // File not found, don't do anything in this scenario
        if (index === -1) {
            return this;
        }
        const bag = this.bags[index];
        if (bag.readOnly) {
            throw new Error(`Context file ${fileName} is read only!`);
        }
        await bag.save(fileName);
        return this;
    }
}
exports.Context = Context;
/**
 * A single bag of settings
 */
class Settings {
    /**
     * Parse Settings out of CLI arguments.
     *
     * CLI arguments in must be accessed in the CLI code via
     * `configuration.settings.get(['argName'])` instead of via `args.argName`.
     *
     * The advantage is that they can be configured via `cdk.json` and
     * `$HOME/.cdk.json`. Arguments not listed below and accessed via this object
     * can only be specified on the command line.
     *
     * @param argv the received CLI arguments.
     * @returns a new Settings object.
     */
    static fromCommandLineArguments(argv) {
        const context = this.parseStringContextListToObject(argv);
        const tags = this.parseStringTagsListToObject(expectStringList(argv.tags));
        // Determine bundling stacks
        let bundlingStacks;
        if (BUNDLING_COMMANDS.includes(argv._[0])) {
            // If we deploy, diff, synth or watch a list of stacks exclusively we skip
            // bundling for all other stacks.
            bundlingStacks = argv.exclusively
                ? argv.STACKS ?? ['**']
                : ['**'];
        }
        else { // Skip bundling for all stacks
            bundlingStacks = [];
        }
        return new Settings({
            app: argv.app,
            browser: argv.browser,
            build: argv.build,
            caBundlePath: argv.caBundlePath,
            context,
            debug: argv.debug,
            tags,
            language: argv.language,
            pathMetadata: argv.pathMetadata,
            assetMetadata: argv.assetMetadata,
            profile: argv.profile,
            plugin: argv.plugin,
            requireApproval: argv.requireApproval,
            toolkitStackName: argv.toolkitStackName,
            toolkitBucket: {
                bucketName: argv.bootstrapBucketName,
                kmsKeyId: argv.bootstrapKmsKeyId,
            },
            versionReporting: argv.versionReporting,
            staging: argv.staging,
            output: argv.output,
            outputsFile: argv.outputsFile,
            progress: argv.progress,
            proxy: argv.proxy,
            bundlingStacks,
            lookups: argv.lookups,
            rollback: argv.rollback,
            notices: argv.notices,
            assetParallelism: argv['asset-parallelism'],
            assetPrebuild: argv['asset-prebuild'],
            ignoreNoStacks: argv['ignore-no-stacks'],
            hotswap: {
                ecs: {
                    minimumEcsHealthyPercent: argv.minimumEcsHealthyPercent,
                    maximumEcsHealthyPercent: argv.maximumEcsHealthyPercent,
                },
            },
            unstable: argv.unstable,
        });
    }
    static mergeAll(...settings) {
        let ret = new Settings();
        for (const setting of settings) {
            ret = ret.merge(setting);
        }
        return ret;
    }
    static parseStringContextListToObject(argv) {
        const context = {};
        for (const assignment of (argv.context || [])) {
            const parts = assignment.split(/=(.*)/, 2);
            if (parts.length === 2) {
                (0, logging_1.debug)('CLI argument context: %s=%s', parts[0], parts[1]);
                if (parts[0].match(/^aws:.+/)) {
                    throw new error_1.ToolkitError(`User-provided context cannot use keys prefixed with 'aws:', but ${parts[0]} was provided.`);
                }
                context[parts[0]] = parts[1];
            }
            else {
                (0, logging_1.warning)('Context argument is not an assignment (key=value): %s', assignment);
            }
        }
        return context;
    }
    /**
     * Parse tags out of arguments
     *
     * Return undefined if no tags were provided, return an empty array if only empty
     * strings were provided
     */
    static parseStringTagsListToObject(argTags) {
        if (argTags === undefined) {
            return undefined;
        }
        if (argTags.length === 0) {
            return undefined;
        }
        const nonEmptyTags = argTags.filter(t => t !== '');
        if (nonEmptyTags.length === 0) {
            return [];
        }
        const tags = [];
        for (const assignment of nonEmptyTags) {
            const parts = assignment.split(/=(.*)/, 2);
            if (parts.length === 2) {
                (0, logging_1.debug)('CLI argument tags: %s=%s', parts[0], parts[1]);
                tags.push({
                    Key: parts[0],
                    Value: parts[1],
                });
            }
            else {
                (0, logging_1.warning)('Tags argument is not an assignment (key=value): %s', assignment);
            }
        }
        return tags.length > 0 ? tags : undefined;
    }
    constructor(settings = {}, readOnly = false) {
        this.settings = settings;
        this.readOnly = readOnly;
    }
    async load(fileName) {
        if (this.readOnly) {
            throw new error_1.ToolkitError(`Can't load ${fileName}: settings object is readonly`);
        }
        this.settings = {};
        const expanded = expandHomeDir(fileName);
        if (await fs.pathExists(expanded)) {
            this.settings = await fs.readJson(expanded);
        }
        // See https://github.com/aws/aws-cdk/issues/59
        this.prohibitContextKey('default-account', fileName);
        this.prohibitContextKey('default-region', fileName);
        this.warnAboutContextKey('aws:', fileName);
        return this;
    }
    async save(fileName) {
        const expanded = expandHomeDir(fileName);
        await fs.writeJson(expanded, stripTransientValues(this.settings), { spaces: 2 });
        return this;
    }
    get all() {
        return this.get([]);
    }
    merge(other) {
        return new Settings(util.deepMerge(this.settings, other.settings));
    }
    subSettings(keyPrefix) {
        return new Settings(this.get(keyPrefix) || {}, false);
    }
    makeReadOnly() {
        return new Settings(this.settings, true);
    }
    clear() {
        if (this.readOnly) {
            throw new error_1.ToolkitError('Cannot clear(): settings are readonly');
        }
        this.settings = {};
    }
    get empty() {
        return Object.keys(this.settings).length === 0;
    }
    get(path) {
        return util.deepClone(util.deepGet(this.settings, path));
    }
    set(path, value) {
        if (this.readOnly) {
            throw new error_1.ToolkitError(`Can't set ${path}: settings object is readonly`);
        }
        if (path.length === 0) {
            // deepSet can't handle this case
            this.settings = value;
        }
        else {
            util.deepSet(this.settings, path, value);
        }
        return this;
    }
    unset(path) {
        this.set(path, undefined);
    }
    prohibitContextKey(key, fileName) {
        if (!this.settings.context) {
            return;
        }
        if (key in this.settings.context) {
            // eslint-disable-next-line max-len
            throw new error_1.ToolkitError(`The 'context.${key}' key was found in ${fs_path.resolve(fileName)}, but it is no longer supported. Please remove it.`);
        }
    }
    warnAboutContextKey(prefix, fileName) {
        if (!this.settings.context) {
            return;
        }
        for (const contextKey of Object.keys(this.settings.context)) {
            if (contextKey.startsWith(prefix)) {
                // eslint-disable-next-line max-len
                (0, logging_1.warning)(`A reserved context key ('context.${prefix}') key was found in ${fs_path.resolve(fileName)}, it might cause surprising behavior and should be removed.`);
            }
        }
    }
}
exports.Settings = Settings;
function expandHomeDir(x) {
    if (x.startsWith('~')) {
        return fs_path.join(os.homedir(), x.slice(1));
    }
    return x;
}
/**
 * Return all context value that are not transient context values
 */
function stripTransientValues(obj) {
    const ret = {};
    for (const [key, value] of Object.entries(obj)) {
        if (!isTransientValue(value)) {
            ret[key] = value;
        }
    }
    return ret;
}
/**
 * Return whether the given value is a transient context value
 *
 * Values that are objects with a magic key set to a truthy value are considered transient.
 */
function isTransientValue(value) {
    return typeof value === 'object' && value !== null && value[exports.TRANSIENT_CONTEXT_KEY];
}
function expectStringList(x) {
    if (x === undefined) {
        return undefined;
    }
    if (!Array.isArray(x)) {
        throw new error_1.ToolkitError(`Expected array, got '${x}'`);
    }
    const nonStrings = x.filter(e => typeof e !== 'string');
    if (nonStrings.length > 0) {
        throw new error_1.ToolkitError(`Expected list of strings, found ${nonStrings}`);
    }
    return x;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXR0aW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5QkFBeUI7QUFDekIsZ0NBQWdDO0FBQ2hDLCtCQUErQjtBQUUvQix1Q0FBMkM7QUFDM0MsMkNBQStDO0FBQy9DLCtCQUErQjtBQUlsQixRQUFBLGNBQWMsR0FBRyxVQUFVLENBQUM7QUFDNUIsUUFBQSxlQUFlLEdBQUcsa0JBQWtCLENBQUM7QUFDckMsUUFBQSxhQUFhLEdBQUcsYUFBYSxDQUFDO0FBRTNDOztHQUVHO0FBQ1UsUUFBQSxxQkFBcUIsR0FBRyxrQkFBa0IsQ0FBQztBQUV4RCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUM7QUFFOUIsSUFBWSxPQXNCWDtBQXRCRCxXQUFZLE9BQU87SUFDakIsb0JBQVMsQ0FBQTtJQUNULHdCQUFhLENBQUE7SUFDYix3QkFBYSxDQUFBO0lBQ2Isa0NBQXVCLENBQUE7SUFDdkIsNEJBQWlCLENBQUE7SUFDakIsOEJBQW1CLENBQUE7SUFDbkIsb0NBQXlCLENBQUE7SUFDekIsMEJBQWUsQ0FBQTtJQUNmLGdDQUFxQixDQUFBO0lBQ3JCLHdCQUFhLENBQUE7SUFDYiw4QkFBbUIsQ0FBQTtJQUNuQiwwQkFBZSxDQUFBO0lBQ2Ysb0JBQVMsQ0FBQTtJQUNULGdDQUFxQixDQUFBO0lBQ3JCLDRCQUFpQixDQUFBO0lBQ2pCLHNDQUEyQixDQUFBO0lBQzNCLDhCQUFtQixDQUFBO0lBQ25CLDhCQUFtQixDQUFBO0lBQ25CLDhCQUFtQixDQUFBO0lBQ25CLHdCQUFhLENBQUE7SUFDYiw0QkFBaUIsQ0FBQTtBQUNuQixDQUFDLEVBdEJXLE9BQU8sdUJBQVAsT0FBTyxRQXNCbEI7QUFFRCxNQUFNLGlCQUFpQixHQUFHO0lBQ3hCLE9BQU8sQ0FBQyxNQUFNO0lBQ2QsT0FBTyxDQUFDLElBQUk7SUFDWixPQUFPLENBQUMsS0FBSztJQUNiLE9BQU8sQ0FBQyxVQUFVO0lBQ2xCLE9BQU8s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SyxRQUFRLENBQUMsQ0FBQztJQUN4RCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDMUIsTUFBTSxJQUFJLG9CQUFZLENBQUMsbUNBQW1DLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIGZzX3BhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBUYWcgfSBmcm9tICcuL2Nkay10b29sa2l0JztcbmltcG9ydCB7IGRlYnVnLCB3YXJuaW5nIH0gZnJvbSAnLi9sb2dnaW5nJztcbmltcG9ydCB7IFRvb2xraXRFcnJvciB9IGZyb20gJy4vdG9vbGtpdC9lcnJvcic7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCB0eXBlIFNldHRpbmdzTWFwID0ge1trZXk6IHN0cmluZ106IGFueX07XG5cbmV4cG9ydCBjb25zdCBQUk9KRUNUX0NPTkZJRyA9ICdjZGsuanNvbic7XG5leHBvcnQgY29uc3QgUFJPSkVDVF9DT05URVhUID0gJ2Nkay5jb250ZXh0Lmpzb24nO1xuZXhwb3J0IGNvbnN0IFVTRVJfREVGQVVMVFMgPSAnfi8uY2RrLmpzb24nO1xuXG4vKipcbiAqIElmIGEgY29udGV4dCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCB0aGlzIGtleSBzZXQgdG8gYSB0cnV0aHkgdmFsdWUsIGl0IHdvbid0IGJlIHNhdmVkIHRvIGNkay5jb250ZXh0Lmpzb25cbiAqL1xuZXhwb3J0IGNvbnN0IFRSQU5TSUVOVF9DT05URVhUX0tFWSA9ICckZG9udFNhdmVDb250ZXh0JztcblxuY29uc3QgQ09OVEVYVF9LRVkgPSAnY29udGV4dCc7XG5cbmV4cG9ydCBlbnVtIENvbW1hbmQge1xuICBMUyA9ICdscycsXG4gIExJU1QgPSAnbGlzdCcsXG4gIERJRkYgPSAnZGlmZicsXG4gIEJPT1RTVFJBUCA9ICdib290c3RyYXAnLFxuICBERVBMT1kgPSAnZGVwbG95JyxcbiAgREVTVFJPWSA9ICdkZXN0cm95JyxcbiAgU1lOVEhFU0laRSA9ICdzeW50aGVzaXplJyxcbiAgU1lOVEggPSAnc3ludGgnLFxuICBNRVRBREFUQSA9ICdtZXRhZGF0YScsXG4gIElOSVQgPSAnaW5pdCcsXG4gIFZFUlNJT04gPSAndmVyc2lvbicsXG4gIFdBVENIID0gJ3dhdGNoJyxcbiAgR0MgPSAnZ2MnLFxuICBST0xMQkFDSyA9ICdyb2xsYmFjaycsXG4gIElNUE9SVCA9ICdpbXBvcnQnLFxuICBBQ0tOT1dMRURHRSA9ICdhY2tub3dsZWRnZScsXG4gIE5PVElDRVMgPSAnbm90aWNlcycsXG4gIE1JR1JBVEUgPSAnbWlncmF0ZScsXG4gIENPTlRFWFQgPSAnY29udGV4dCcsXG4gIERPQ1MgPSAnZG9jcycsXG4gIERPQ1RPUiA9ICdkb2N0b3InLFxufVxuXG5jb25zdCBCVU5ETElOR19DT01NQU5EUyA9IFtcbiAgQ29tbWFuZC5ERVBMT1ksXG4gIENvbW1hbmQuRElGRixcbiAgQ29tbWFuZC5TWU5USCxcbiAgQ29tbWFuZC5TWU5USEVTSVpFLFxuICBDb21tYW5kLldBVENILFxuXTtcblxuZXhwb3J0IHR5cGUgQXJndW1lbnRzID0ge1xuICByZWFkb25seSBfOiBbQ29tbWFuZCwgLi4uc3RyaW5nW11dO1xuICByZWFkb25seSBleGNsdXNpdmVseT86IGJvb2xlYW47XG4gIHJlYWRvbmx5IFNUQUNLUz86IHN0cmluZ1tdO1xuICByZWFkb25seSBsb29rdXBzPzogYm9vbGVhbjtcbiAgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IHVua25vd247XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ3VyYXRpb25Qcm9wcyB7XG4gIC8qKlxuICAgKiBDb25maWd1cmF0aW9uIHBhc3NlZCB2aWEgY29tbWFuZCBsaW5lIGFyZ3VtZW50c1xuICAgKlxuICAgKiBAZGVmYXVsdCAtIE5vdGhpbmcgcGFzc2VkXG4gICAqL1xuICByZWFkb25seSBjb21tYW5kTGluZUFyZ3VtZW50cz86IEFyZ3VtZW50cztcblxuICAvKipcbiAgICogV2hldGhlciBvciBub3QgdG8gdXNlIGNvbnRleHQgZnJvbSBgLmNkay5qc29uYCBpbiB1c2VyIGhvbWUgZGlyZWN0b3J5XG4gICAqXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIHJlYWRvbmx5IHJlYWRVc2VyQ29udGV4dD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQWxsIHNvdXJjZXMgb2Ygc2V0dGluZ3MgY29tYmluZWRcbiAqL1xuZXhwb3J0IGNsYXNzIENvbmZpZ3VyYXRpb24ge1xuICBwdWJsaWMgc2V0dGluZ3MgPSBuZXcgU2V0dGluZ3MoKTtcbiAgcHVibGljIGNvbnRleHQgPSBuZXcgQ29udGV4dCgpO1xuXG4gIHB1YmxpYyByZWFkb25seSBkZWZhdWx0Q29uZmlnID0gbmV3IFNldHRpbmdzKHtcbiAgICB2ZXJzaW9uUmVwb3J0aW5nOiB0cnVlLFxuICAgIGFzc2V0TWV0YWRhdGE6IHRydWUsXG4gICAgcGF0aE1ldGFkYXRhOiB0cnVlLFxuICAgIG91dHB1dDogJ2Nkay5vdXQnLFxuICB9KTtcblxuICBwcml2YXRlIHJlYWRvbmx5IGNvbW1hbmRMaW5lQXJndW1lbnRzOiBTZXR0aW5ncztcbiAgcHJpdmF0ZSByZWFkb25seSBjb21tYW5kTGluZUNvbnRleHQ6IFNldHRpbmdzO1xuICBwcml2YXRlIF9wcm9qZWN0Q29uZmlnPzogU2V0dGluZ3M7XG4gIHByaXZhdGUgX3Byb2plY3RDb250ZXh0PzogU2V0dGluZ3M7XG4gIHByaXZhdGUgbG9hZGVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwcm9wczogQ29uZmlndXJhdGlvblByb3BzID0ge30pIHtcbiAgICB0aGlzLmNvbW1hbmRMaW5lQXJndW1lbnRzID0gcHJvcHMuY29tbWFuZExpbmVBcmd1bWVudHNcbiAgICAgID8gU2V0dGluZ3MuZnJvbUNvbW1hbmRMaW5lQXJndW1lbnRzKHByb3BzLmNvbW1hbmRMaW5lQXJndW1lbnRzKVxuICAgICAgOiBuZXcgU2V0dGluZ3MoKTtcbiAgICB0aGlzLmNvbW1hbmRMaW5lQ29udGV4dCA9IHRoaXMuY29tbWFuZExpbmVBcmd1bWVudHMuc3ViU2V0dGluZ3MoW0NPTlRFWFRfS0VZXSkubWFrZVJlYWRPbmx5KCk7XG4gIH1cblxuICBwcml2YXRlIGdldCBwcm9qZWN0Q29uZmlnKCkge1xuICAgIGlmICghdGhpcy5fcHJvamVjdENvbmZpZykge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcignI2xvYWQgaGFzIG5vdCBiZWVuIGNhbGxlZCB5ZXQhJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9wcm9qZWN0Q29uZmlnO1xuICB9XG5cbiAgcHVibGljIGdldCBwcm9qZWN0Q29udGV4dCgpIHtcbiAgICBpZiAoIXRoaXMuX3Byb2plY3RDb250ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCcjbG9hZCBoYXMgbm90IGJlZW4gY2FsbGVkIHlldCEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3Byb2plY3RDb250ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIExvYWQgYWxsIGNvbmZpZ1xuICAgKi9cbiAgcHVibGljIGFzeW5jIGxvYWQoKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgY29uc3QgdXNlckNvbmZpZyA9IGF3YWl0IGxvYWRBbmRMb2coVVNFUl9ERUZBVUxUUyk7XG4gICAgdGhpcy5fcHJvamVjdENvbmZpZyA9IGF3YWl0IGxvYWRBbmRMb2coUFJPSkVDVF9DT05GSUcpO1xuICAgIHRoaXMuX3Byb2plY3RDb250ZXh0ID0gYXdhaXQgbG9hZEFuZExvZyhQUk9KRUNUX0NPTlRFWFQpO1xuXG4gICAgY29uc3QgcmVhZFVzZXJDb250ZXh0ID0gdGhpcy5wcm9wcy5yZWFkVXNlckNvbnRleHQgPz8gdHJ1ZTtcblxuICAgIGlmICh1c2VyQ29uZmlnLmdldChbJ2J1aWxkJ10pKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdUaGUgYGJ1aWxkYCBrZXkgY2Fubm90IGJlIHNwZWNpZmllZCBpbiB0aGUgdXNlciBjb25maWcgKH4vLmNkay5qc29uKSwgc3BlY2lmeSBpdCBpbiB0aGUgcHJvamVjdCBjb25maWcgKGNkay5qc29uKSBpbnN0ZWFkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dFNvdXJjZXMgPSBbXG4gICAgICB7IGJhZzogdGhpcy5jb21tYW5kTGluZUNvbnRleHQgfSxcbiAgICAgIHsgZmlsZU5hbWU6IFBST0pFQ1RfQ09ORklHLCBiYWc6IHRoaXMucHJvamVjdENvbmZpZy5zdWJTZXR0aW5ncyhbQ09OVEVYVF9LRVldKS5tYWtlUmVhZE9ubHkoKSB9LFxuICAgICAgeyBmaWxlTmFtZTogUFJPSkVDVF9DT05URVhULCBiYWc6IHRoaXMucHJvamVjdENvbnRleHQgfSxcbiAgICBdO1xuICAgIGlmIChyZWFkVXNlckNvbnRleHQpIHtcbiAgICAgIGNvbnRleHRTb3VyY2VzLnB1c2goeyBmaWxlTmFtZTogVVNFUl9ERUZBVUxUUywgYmFnOiB1c2VyQ29uZmlnLnN1YlNldHRpbmdzKFtDT05URVhUX0tFWV0pLm1ha2VSZWFkT25seSgpIH0pO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dCA9IG5ldyBDb250ZXh0KC4uLmNvbnRleHRTb3VyY2VzKTtcblxuICAgIC8vIEJ1aWxkIHNldHRpbmdzIGZyb20gd2hhdCdzIGxlZnRcbiAgICB0aGlzLnNldHRpbmdzID0gdGhpcy5kZWZhdWx0Q29uZmlnXG4gICAgICAubWVyZ2UodXNlckNvbmZpZylcbiAgICAgIC5tZXJnZSh0aGlzLnByb2plY3RDb25maWcpXG4gICAgICAubWVyZ2UodGhpcy5jb21tYW5kTGluZUFyZ3VtZW50cylcbiAgICAgIC5tYWtlUmVhZE9ubHkoKTtcblxuICAgIGRlYnVnKCdtZXJnZWQgc2V0dGluZ3M6JywgdGhpcy5zZXR0aW5ncy5hbGwpO1xuXG4gICAgdGhpcy5sb2FkZWQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2F2ZSB0aGUgcHJvamVjdCBjb250ZXh0XG4gICAqL1xuICBwdWJsaWMgYXN5bmMgc2F2ZUNvbnRleHQoKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgaWYgKCF0aGlzLmxvYWRlZCkgeyByZXR1cm4gdGhpczsgfSAvLyBBdm9pZCBvdmVyd3JpdGluZyBmaWxlcyB3aXRoIG5vdGhpbmdcblxuICAgIGF3YWl0IHRoaXMucHJvamVjdENvbnRleHQuc2F2ZShQUk9KRUNUX0NPTlRFWFQpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbG9hZEFuZExvZyhmaWxlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxTZXR0aW5ncz4ge1xuICBjb25zdCByZXQgPSBuZXcgU2V0dGluZ3MoKTtcbiAgYXdhaXQgcmV0LmxvYWQoZmlsZU5hbWUpO1xuICBpZiAoIXJldC5lbXB0eSkge1xuICAgIGRlYnVnKGZpbGVOYW1lICsgJzonLCBKU09OLnN0cmluZ2lmeShyZXQuYWxsLCB1bmRlZmluZWQsIDIpKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG5pbnRlcmZhY2UgQ29udGV4dEJhZyB7XG4gIC8qKlxuICAgKiBUaGUgZmlsZSBuYW1lIG9mIHRoZSBjb250ZXh0LiBXaWxsIGJlIHVzZWQgdG8gcG90ZW50aWFsbHlcbiAgICogc2F2ZSBuZXcgY29udGV4dCBiYWNrIHRvIHRoZSBvcmlnaW5hbCBmaWxlLlxuICAgKi9cbiAgZmlsZU5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBjb250ZXh0IHZhbHVlcy5cbiAgICovXG4gIGJhZzogU2V0dGluZ3M7XG59XG5cbi8qKlxuICogQ2xhc3MgdGhhdCBzdXBwb3J0cyBvdmVybGF5aW5nIHByb3BlcnR5IGJhZ3NcbiAqXG4gKiBSZWFkcyBjb21lIGZyb20gdGhlIGZpcnN0IHByb3BlcnR5IGJhZyB0aGF0IGNhbiBoYXMgdGhlIGdpdmVuIGtleSxcbiAqIHdyaXRlcyBnbyB0byB0aGUgZmlyc3QgcHJvcGVydHkgYmFnIHRoYXQgaXMgbm90IHJlYWRvbmx5LiBBIHdyaXRlXG4gKiB3aWxsIHJlbW92ZSB0aGUgdmFsdWUgZnJvbSBhbGwgcHJvcGVydHkgYmFncyBhZnRlciB0aGUgZmlyc3RcbiAqIHdyaXRhYmxlIG9uZS5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRleHQge1xuICBwcml2YXRlIHJlYWRvbmx5IGJhZ3M6IFNldHRpbmdzW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZU5hbWVzOiAoc3RyaW5nfHVuZGVmaW5lZClbXTtcblxuICBjb25zdHJ1Y3RvciguLi5iYWdzOiBDb250ZXh0QmFnW10pIHtcbiAgICB0aGlzLmJhZ3MgPSBiYWdzLmxlbmd0aCA+IDAgPyBiYWdzLm1hcChiID0+IGIuYmFnKSA6IFtuZXcgU2V0dGluZ3MoKV07XG4gICAgdGhpcy5maWxlTmFtZXMgPSBiYWdzLmxlbmd0aCA+IDAgPyBiYWdzLm1hcChiID0+IGIuZmlsZU5hbWUpIDogWydkZWZhdWx0J107XG4gIH1cblxuICBwdWJsaWMgZ2V0IGtleXMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmFsbCk7XG4gIH1cblxuICBwdWJsaWMgaGFzKGtleTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMua2V5cy5pbmRleE9mKGtleSkgPiAtMTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgYWxsKCk6IHtba2V5OiBzdHJpbmddOiBhbnl9IHtcbiAgICBsZXQgcmV0ID0gbmV3IFNldHRpbmdzKCk7XG5cbiAgICAvLyBJbiByZXZlcnNlIG9yZGVyIHNvIGtleXMgdG8gdGhlIGxlZnQgb3ZlcndyaXRlIGtleXMgdG8gdGhlIHJpZ2h0IG9mIHRoZW1cbiAgICBmb3IgKGNvbnN0IGJhZyBvZiBbLi4udGhpcy5iYWdzXS5yZXZlcnNlKCkpIHtcbiAgICAgIHJldCA9IHJldC5tZXJnZShiYWcpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQuYWxsO1xuICB9XG5cbiAgcHVibGljIGdldChrZXk6IHN0cmluZyk6IGFueSB7XG4gICAgZm9yIChjb25zdCBiYWcgb2YgdGhpcy5iYWdzKSB7XG4gICAgICBjb25zdCB2ID0gYmFnLmdldChba2V5XSk7XG4gICAgICBpZiAodiAhPT0gdW5kZWZpbmVkKSB7IHJldHVybiB2OyB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBwdWJsaWMgc2V0KGtleTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgZm9yIChjb25zdCBiYWcgb2YgdGhpcy5iYWdzKSB7XG4gICAgICBpZiAoYmFnLnJlYWRPbmx5KSB7IGNvbnRpbnVlOyB9XG5cbiAgICAgIC8vIEFsbCBiYWdzIHBhc3QgdGhlIGZpcnN0IG9uZSBoYXZlIHRoZSB2YWx1ZSBlcmFzZWRcbiAgICAgIGJhZy5zZXQoW2tleV0sIHZhbHVlKTtcbiAgICAgIHZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB1bnNldChrZXk6IHN0cmluZykge1xuICAgIHRoaXMuc2V0KGtleSwgdW5kZWZpbmVkKTtcbiAgfVxuXG4gIHB1YmxpYyBjbGVhcigpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiB0aGlzLmtleXMpIHtcbiAgICAgIHRoaXMudW5zZXQoa2V5KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2F2ZSBhIHNwZWNpZmljIGNvbnRleHQgZmlsZVxuICAgKi9cbiAgcHVibGljIGFzeW5jIHNhdmUoZmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8dGhpcz4ge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5maWxlTmFtZXMuaW5kZXhPZihmaWxlTmFtZSk7XG5cbiAgICAvLyBGaWxlIG5vdCBmb3VuZCwgZG9uJ3QgZG8gYW55dGhpbmcgaW4gdGhpcyBzY2VuYXJpb1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGNvbnN0IGJhZyA9IHRoaXMuYmFnc1tpbmRleF07XG4gICAgaWYgKGJhZy5yZWFkT25seSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb250ZXh0IGZpbGUgJHtmaWxlTmFtZX0gaXMgcmVhZCBvbmx5IWApO1xuICAgIH1cblxuICAgIGF3YWl0IGJhZy5zYXZlKGZpbGVOYW1lKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vKipcbiAqIEEgc2luZ2xlIGJhZyBvZiBzZXR0aW5nc1xuICovXG5leHBvcnQgY2xhc3MgU2V0dGluZ3Mge1xuICAvKipcbiAgICogUGFyc2UgU2V0dGluZ3Mgb3V0IG9mIENMSSBhcmd1bWVudHMuXG4gICAqXG4gICAqIENMSSBhcmd1bWVudHMgaW4gbXVzdCBiZSBhY2Nlc3NlZCBpbiB0aGUgQ0xJIGNvZGUgdmlhXG4gICAqIGBjb25maWd1cmF0aW9uLnNldHRpbmdzLmdldChbJ2FyZ05hbWUnXSlgIGluc3RlYWQgb2YgdmlhIGBhcmdzLmFyZ05hbWVgLlxuICAgKlxuICAgKiBUaGUgYWR2YW50YWdlIGlzIHRoYXQgdGhleSBjYW4gYmUgY29uZmlndXJlZCB2aWEgYGNkay5qc29uYCBhbmRcbiAgICogYCRIT01FLy5jZGsuanNvbmAuIEFyZ3VtZW50cyBub3QgbGlzdGVkIGJlbG93IGFuZCBhY2Nlc3NlZCB2aWEgdGhpcyBvYmplY3RcbiAgICogY2FuIG9ubHkgYmUgc3BlY2lmaWVkIG9uIHRoZSBjb21tYW5kIGxpbmUuXG4gICAqXG4gICAqIEBwYXJhbSBhcmd2IHRoZSByZWNlaXZlZCBDTEkgYXJndW1lbnRzLlxuICAgKiBAcmV0dXJucyBhIG5ldyBTZXR0aW5ncyBvYmplY3QuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIGZyb21Db21tYW5kTGluZUFyZ3VtZW50cyhhcmd2OiBBcmd1bWVudHMpOiBTZXR0aW5ncyB7XG4gICAgY29uc3QgY29udGV4dCA9IHRoaXMucGFyc2VTdHJpbmdDb250ZXh0TGlzdFRvT2JqZWN0KGFyZ3YpO1xuICAgIGNvbnN0IHRhZ3MgPSB0aGlzLnBhcnNlU3RyaW5nVGFnc0xpc3RUb09iamVjdChleHBlY3RTdHJpbmdMaXN0KGFyZ3YudGFncykpO1xuXG4gICAgLy8gRGV0ZXJtaW5lIGJ1bmRsaW5nIHN0YWNrc1xuICAgIGxldCBidW5kbGluZ1N0YWNrczogc3RyaW5nW107XG4gICAgaWYgKEJVTkRMSU5HX0NPTU1BTkRTLmluY2x1ZGVzKGFyZ3YuX1swXSkpIHtcbiAgICAvLyBJZiB3ZSBkZXBsb3ksIGRpZmYsIHN5bnRoIG9yIHdhdGNoIGEgbGlzdCBvZiBzdGFja3MgZXhjbHVzaXZlbHkgd2Ugc2tpcFxuICAgIC8vIGJ1bmRsaW5nIGZvciBhbGwgb3RoZXIgc3RhY2tzLlxuICAgICAgYnVuZGxpbmdTdGFja3MgPSBhcmd2LmV4Y2x1c2l2ZWx5XG4gICAgICAgID8gYXJndi5TVEFDS1MgPz8gWycqKiddXG4gICAgICAgIDogWycqKiddO1xuICAgIH0gZWxzZSB7IC8vIFNraXAgYnVuZGxpbmcgZm9yIGFsbCBzdGFja3NcbiAgICAgIGJ1bmRsaW5nU3RhY2tzID0gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBTZXR0aW5ncyh7XG4gICAgICBhcHA6IGFyZ3YuYXBwLFxuICAgICAgYnJvd3NlcjogYXJndi5icm93c2VyLFxuICAgICAgYnVpbGQ6IGFyZ3YuYnVpbGQsXG4gICAgICBjYUJ1bmRsZVBhdGg6IGFyZ3YuY2FCdW5kbGVQYXRoLFxuICAgICAgY29udGV4dCxcbiAgICAgIGRlYnVnOiBhcmd2LmRlYnVnLFxuICAgICAgdGFncyxcbiAgICAgIGxhbmd1YWdlOiBhcmd2Lmxhbmd1YWdlLFxuICAgICAgcGF0aE1ldGFkYXRhOiBhcmd2LnBhdGhNZXRhZGF0YSxcbiAgICAgIGFzc2V0TWV0YWRhdGE6IGFyZ3YuYXNzZXRNZXRhZGF0YSxcbiAgICAgIHByb2ZpbGU6IGFyZ3YucHJvZmlsZSxcbiAgICAgIHBsdWdpbjogYXJndi5wbHVnaW4sXG4gICAgICByZXF1aXJlQXBwcm92YWw6IGFyZ3YucmVxdWlyZUFwcHJvdmFsLFxuICAgICAgdG9vbGtpdFN0YWNrTmFtZTogYXJndi50b29sa2l0U3RhY2tOYW1lLFxuICAgICAgdG9vbGtpdEJ1Y2tldDoge1xuICAgICAgICBidWNrZXROYW1lOiBhcmd2LmJvb3RzdHJhcEJ1Y2tldE5hbWUsXG4gICAgICAgIGttc0tleUlkOiBhcmd2LmJvb3RzdHJhcEttc0tleUlkLFxuICAgICAgfSxcbiAgICAgIHZlcnNpb25SZXBvcnRpbmc6IGFyZ3YudmVyc2lvblJlcG9ydGluZyxcbiAgICAgIHN0YWdpbmc6IGFyZ3Yuc3RhZ2luZyxcbiAgICAgIG91dHB1dDogYXJndi5vdXRwdXQsXG4gICAgICBvdXRwdXRzRmlsZTogYXJndi5vdXRwdXRzRmlsZSxcbiAgICAgIHByb2dyZXNzOiBhcmd2LnByb2dyZXNzLFxuICAgICAgcHJveHk6IGFyZ3YucHJveHksXG4gICAgICBidW5kbGluZ1N0YWNrcyxcbiAgICAgIGxvb2t1cHM6IGFyZ3YubG9va3VwcyxcbiAgICAgIHJvbGxiYWNrOiBhcmd2LnJvbGxiYWNrLFxuICAgICAgbm90aWNlczogYXJndi5ub3RpY2VzLFxuICAgICAgYXNzZXRQYXJhbGxlbGlzbTogYXJndlsnYXNzZXQtcGFyYWxsZWxpc20nXSxcbiAgICAgIGFzc2V0UHJlYnVpbGQ6IGFyZ3ZbJ2Fzc2V0LXByZWJ1aWxkJ10sXG4gICAgICBpZ25vcmVOb1N0YWNrczogYXJndlsnaWdub3JlLW5vLXN0YWNrcyddLFxuICAgICAgaG90c3dhcDoge1xuICAgICAgICBlY3M6IHtcbiAgICAgICAgICBtaW5pbXVtRWNzSGVhbHRoeVBlcmNlbnQ6IGFyZ3YubWluaW11bUVjc0hlYWx0aHlQZXJjZW50LFxuICAgICAgICAgIG1heGltdW1FY3NIZWFsdGh5UGVyY2VudDogYXJndi5tYXhpbXVtRWNzSGVhbHRoeVBlcmNlbnQsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgdW5zdGFibGU6IGFyZ3YudW5zdGFibGUsXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgc3RhdGljIG1lcmdlQWxsKC4uLnNldHRpbmdzOiBTZXR0aW5nc1tdKTogU2V0dGluZ3Mge1xuICAgIGxldCByZXQgPSBuZXcgU2V0dGluZ3MoKTtcbiAgICBmb3IgKGNvbnN0IHNldHRpbmcgb2Ygc2V0dGluZ3MpIHtcbiAgICAgIHJldCA9IHJldC5tZXJnZShzZXR0aW5nKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIHBhcnNlU3RyaW5nQ29udGV4dExpc3RUb09iamVjdChhcmd2OiBBcmd1bWVudHMpOiBhbnkge1xuICAgIGNvbnN0IGNvbnRleHQ6IGFueSA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBhc3NpZ25tZW50IG9mICgoYXJndiBhcyBhbnkpLmNvbnRleHQgfHwgW10pKSB7XG4gICAgICBjb25zdCBwYXJ0cyA9IGFzc2lnbm1lbnQuc3BsaXQoLz0oLiopLywgMik7XG4gICAgICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGRlYnVnKCdDTEkgYXJndW1lbnQgY29udGV4dDogJXM9JXMnLCBwYXJ0c1swXSwgcGFydHNbMV0pO1xuICAgICAgICBpZiAocGFydHNbMF0ubWF0Y2goL15hd3M6LisvKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYFVzZXItcHJvdmlkZWQgY29udGV4dCBjYW5ub3QgdXNlIGtleXMgcHJlZml4ZWQgd2l0aCAnYXdzOicsIGJ1dCAke3BhcnRzWzBdfSB3YXMgcHJvdmlkZWQuYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dFtwYXJ0c1swXV0gPSBwYXJ0c1sxXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdhcm5pbmcoJ0NvbnRleHQgYXJndW1lbnQgaXMgbm90IGFuIGFzc2lnbm1lbnQgKGtleT12YWx1ZSk6ICVzJywgYXNzaWdubWVudCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIHRhZ3Mgb3V0IG9mIGFyZ3VtZW50c1xuICAgKlxuICAgKiBSZXR1cm4gdW5kZWZpbmVkIGlmIG5vIHRhZ3Mgd2VyZSBwcm92aWRlZCwgcmV0dXJuIGFuIGVtcHR5IGFycmF5IGlmIG9ubHkgZW1wdHlcbiAgICogc3RyaW5ncyB3ZXJlIHByb3ZpZGVkXG4gICAqL1xuICBwcml2YXRlIHN0YXRpYyBwYXJzZVN0cmluZ1RhZ3NMaXN0VG9PYmplY3QoYXJnVGFnczogc3RyaW5nW10gfCB1bmRlZmluZWQpOiBUYWdbXSB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKGFyZ1RhZ3MgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gICAgaWYgKGFyZ1RhZ3MubGVuZ3RoID09PSAwKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgICBjb25zdCBub25FbXB0eVRhZ3MgPSBhcmdUYWdzLmZpbHRlcih0ID0+IHQgIT09ICcnKTtcbiAgICBpZiAobm9uRW1wdHlUYWdzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gW107IH1cblxuICAgIGNvbnN0IHRhZ3M6IFRhZ1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2Ygbm9uRW1wdHlUYWdzKSB7XG4gICAgICBjb25zdCBwYXJ0cyA9IGFzc2lnbm1lbnQuc3BsaXQoLz0oLiopLywgMik7XG4gICAgICBpZiAocGFydHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIGRlYnVnKCdDTEkgYXJndW1lbnQgdGFnczogJXM9JXMnLCBwYXJ0c1swXSwgcGFydHNbMV0pO1xuICAgICAgICB0YWdzLnB1c2goe1xuICAgICAgICAgIEtleTogcGFydHNbMF0sXG4gICAgICAgICAgVmFsdWU6IHBhcnRzWzFdLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdhcm5pbmcoJ1RhZ3MgYXJndW1lbnQgaXMgbm90IGFuIGFzc2lnbm1lbnQgKGtleT12YWx1ZSk6ICVzJywgYXNzaWdubWVudCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YWdzLmxlbmd0aCA+IDAgPyB0YWdzIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzZXR0aW5nczogU2V0dGluZ3NNYXAgPSB7fSwgcHVibGljIHJlYWRvbmx5IHJlYWRPbmx5ID0gZmFsc2UpIHt9XG5cbiAgcHVibGljIGFzeW5jIGxvYWQoZmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8dGhpcz4ge1xuICAgIGlmICh0aGlzLnJlYWRPbmx5KSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBDYW4ndCBsb2FkICR7ZmlsZU5hbWV9OiBzZXR0aW5ncyBvYmplY3QgaXMgcmVhZG9ubHlgKTtcbiAgICB9XG4gICAgdGhpcy5zZXR0aW5ncyA9IHt9O1xuXG4gICAgY29uc3QgZXhwYW5kZWQgPSBleHBhbmRIb21lRGlyKGZpbGVOYW1lKTtcbiAgICBpZiAoYXdhaXQgZnMucGF0aEV4aXN0cyhleHBhbmRlZCkpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MgPSBhd2FpdCBmcy5yZWFkSnNvbihleHBhbmRlZCk7XG4gICAgfVxuXG4gICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvNTlcbiAgICB0aGlzLnByb2hpYml0Q29udGV4dEtleSgnZGVmYXVsdC1hY2NvdW50JywgZmlsZU5hbWUpO1xuICAgIHRoaXMucHJvaGliaXRDb250ZXh0S2V5KCdkZWZhdWx0LXJlZ2lvbicsIGZpbGVOYW1lKTtcbiAgICB0aGlzLndhcm5BYm91dENvbnRleHRLZXkoJ2F3czonLCBmaWxlTmFtZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzYXZlKGZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHRoaXM+IHtcbiAgICBjb25zdCBleHBhbmRlZCA9IGV4cGFuZEhvbWVEaXIoZmlsZU5hbWUpO1xuICAgIGF3YWl0IGZzLndyaXRlSnNvbihleHBhbmRlZCwgc3RyaXBUcmFuc2llbnRWYWx1ZXModGhpcy5zZXR0aW5ncyksIHsgc3BhY2VzOiAyIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcHVibGljIGdldCBhbGwoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5nZXQoW10pO1xuICB9XG5cbiAgcHVibGljIG1lcmdlKG90aGVyOiBTZXR0aW5ncyk6IFNldHRpbmdzIHtcbiAgICByZXR1cm4gbmV3IFNldHRpbmdzKHV0aWwuZGVlcE1lcmdlKHRoaXMuc2V0dGluZ3MsIG90aGVyLnNldHRpbmdzKSk7XG4gIH1cblxuICBwdWJsaWMgc3ViU2V0dGluZ3Moa2V5UHJlZml4OiBzdHJpbmdbXSkge1xuICAgIHJldHVybiBuZXcgU2V0dGluZ3ModGhpcy5nZXQoa2V5UHJlZml4KSB8fCB7fSwgZmFsc2UpO1xuICB9XG5cbiAgcHVibGljIG1ha2VSZWFkT25seSgpOiBTZXR0aW5ncyB7XG4gICAgcmV0dXJuIG5ldyBTZXR0aW5ncyh0aGlzLnNldHRpbmdzLCB0cnVlKTtcbiAgfVxuXG4gIHB1YmxpYyBjbGVhcigpIHtcbiAgICBpZiAodGhpcy5yZWFkT25seSkge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcignQ2Fubm90IGNsZWFyKCk6IHNldHRpbmdzIGFyZSByZWFkb25seScpO1xuICAgIH1cbiAgICB0aGlzLnNldHRpbmdzID0ge307XG4gIH1cblxuICBwdWJsaWMgZ2V0IGVtcHR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldHRpbmdzKS5sZW5ndGggPT09IDA7XG4gIH1cblxuICBwdWJsaWMgZ2V0KHBhdGg6IHN0cmluZ1tdKTogYW55IHtcbiAgICByZXR1cm4gdXRpbC5kZWVwQ2xvbmUodXRpbC5kZWVwR2V0KHRoaXMuc2V0dGluZ3MsIHBhdGgpKTtcbiAgfVxuXG4gIHB1YmxpYyBzZXQocGF0aDogc3RyaW5nW10sIHZhbHVlOiBhbnkpOiBTZXR0aW5ncyB7XG4gICAgaWYgKHRoaXMucmVhZE9ubHkpIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYENhbid0IHNldCAke3BhdGh9OiBzZXR0aW5ncyBvYmplY3QgaXMgcmVhZG9ubHlgKTtcbiAgICB9XG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBkZWVwU2V0IGNhbid0IGhhbmRsZSB0aGlzIGNhc2VcbiAgICAgIHRoaXMuc2V0dGluZ3MgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXRpbC5kZWVwU2V0KHRoaXMuc2V0dGluZ3MsIHBhdGgsIHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwdWJsaWMgdW5zZXQocGF0aDogc3RyaW5nW10pIHtcbiAgICB0aGlzLnNldChwYXRoLCB1bmRlZmluZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9oaWJpdENvbnRleHRLZXkoa2V5OiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY29udGV4dCkgeyByZXR1cm47IH1cbiAgICBpZiAoa2V5IGluIHRoaXMuc2V0dGluZ3MuY29udGV4dCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYFRoZSAnY29udGV4dC4ke2tleX0nIGtleSB3YXMgZm91bmQgaW4gJHtmc19wYXRoLnJlc29sdmUoZmlsZU5hbWUpfSwgYnV0IGl0IGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQuIFBsZWFzZSByZW1vdmUgaXQuYCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB3YXJuQWJvdXRDb250ZXh0S2V5KHByZWZpeDogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKCF0aGlzLnNldHRpbmdzLmNvbnRleHQpIHsgcmV0dXJuOyB9XG4gICAgZm9yIChjb25zdCBjb250ZXh0S2V5IG9mIE9iamVjdC5rZXlzKHRoaXMuc2V0dGluZ3MuY29udGV4dCkpIHtcbiAgICAgIGlmIChjb250ZXh0S2V5LnN0YXJ0c1dpdGgocHJlZml4KSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgICAgICB3YXJuaW5nKGBBIHJlc2VydmVkIGNvbnRleHQga2V5ICgnY29udGV4dC4ke3ByZWZpeH0nKSBrZXkgd2FzIGZvdW5kIGluICR7ZnNfcGF0aC5yZXNvbHZlKGZpbGVOYW1lKX0sIGl0IG1pZ2h0IGNhdXNlIHN1cnByaXNpbmcgYmVoYXZpb3IgYW5kIHNob3VsZCBiZSByZW1vdmVkLmApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBleHBhbmRIb21lRGlyKHg6IHN0cmluZykge1xuICBpZiAoeC5zdGFydHNXaXRoKCd+JykpIHtcbiAgICByZXR1cm4gZnNfcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgeC5zbGljZSgxKSk7XG4gIH1cbiAgcmV0dXJuIHg7XG59XG5cbi8qKlxuICogUmV0dXJuIGFsbCBjb250ZXh0IHZhbHVlIHRoYXQgYXJlIG5vdCB0cmFuc2llbnQgY29udGV4dCB2YWx1ZXNcbiAqL1xuZnVuY3Rpb24gc3RyaXBUcmFuc2llbnRWYWx1ZXMob2JqOiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICBjb25zdCByZXQ6IGFueSA9IHt9O1xuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XG4gICAgaWYgKCFpc1RyYW5zaWVudFZhbHVlKHZhbHVlKSkge1xuICAgICAgcmV0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBSZXR1cm4gd2hldGhlciB0aGUgZ2l2ZW4gdmFsdWUgaXMgYSB0cmFuc2llbnQgY29udGV4dCB2YWx1ZVxuICpcbiAqIFZhbHVlcyB0aGF0IGFyZSBvYmplY3RzIHdpdGggYSBtYWdpYyBrZXkgc2V0IHRvIGEgdHJ1dGh5IHZhbHVlIGFyZSBjb25zaWRlcmVkIHRyYW5zaWVudC5cbiAqL1xuZnVuY3Rpb24gaXNUcmFuc2llbnRWYWx1ZSh2YWx1ZTogYW55KSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsICYmICh2YWx1ZSBhcyBhbnkpW1RSQU5TSUVOVF9DT05URVhUX0tFWV07XG59XG5cbmZ1bmN0aW9uIGV4cGVjdFN0cmluZ0xpc3QoeDogdW5rbm93bik6IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcbiAgaWYgKHggPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gIGlmICghQXJyYXkuaXNBcnJheSh4KSkge1xuICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYEV4cGVjdGVkIGFycmF5LCBnb3QgJyR7eH0nYCk7XG4gIH1cbiAgY29uc3Qgbm9uU3RyaW5ncyA9IHguZmlsdGVyKGUgPT4gdHlwZW9mIGUgIT09ICdzdHJpbmcnKTtcbiAgaWYgKG5vblN0cmluZ3MubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYEV4cGVjdGVkIGxpc3Qgb2Ygc3RyaW5ncywgZm91bmQgJHtub25TdHJpbmdzfWApO1xuICB9XG4gIHJldHVybiB4O1xufVxuIl19