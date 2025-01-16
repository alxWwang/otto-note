"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedDataSource = exports.WebsiteNoticeDataSource = exports.FilteredNotice = exports.Notices = exports.NoticesFilter = void 0;
const https = require("node:https");
const path = require("path");
const fs = require("fs-extra");
const semver = require("semver");
const awscli_compatible_1 = require("./api/aws-auth/awscli-compatible");
const logging_1 = require("./logging");
const error_1 = require("./toolkit/error");
const tree_1 = require("./tree");
const util_1 = require("./util");
const directories_1 = require("./util/directories");
const version_1 = require("./version");
const CACHE_FILE_PATH = path.join((0, directories_1.cdkCacheDir)(), 'notices.json');
class NoticesFilter {
    static filter(options) {
        return [
            ...this.findForCliVersion(options.data, options.cliVersion),
            ...this.findForFrameworkVersion(options.data, options.outDir),
            ...this.findForBootstrapVersion(options.data, options.bootstrappedEnvironments),
        ];
    }
    static findForCliVersion(data, cliVersion) {
        return (0, util_1.flatMap)(data, notice => {
            const affectedComponent = notice.components.find(component => component.name === 'cli');
            const affectedRange = affectedComponent?.version;
            if (affectedRange == null) {
                return [];
            }
            if (!semver.satisfies(cliVersion, affectedRange)) {
                return [];
            }
            return [new FilteredNotice(notice)];
        });
    }
    static findForFrameworkVersion(data, outDir) {
        const tree = (0, tree_1.loadTreeFromDir)(outDir);
        return (0, util_1.flatMap)(data, notice => {
            //  A match happens when:
            //
            //  1. The version of the node matches the version in the notice, interpreted
            //  as a semver range.
            //
            //  AND
            //
            //  2. The name in the notice is a prefix of the node name when the query ends in '.',
            //  or the two names are exactly the same, otherwise.
            const matched = (0, tree_1.some)(tree, node => {
                return this.resolveAliases(notice.components).some(component => compareNames(component.name, node.constructInfo?.fqn) &&
                    compareVersions(component.version, node.constructInfo?.version));
            });
            if (!matched) {
                return [];
            }
            return [new FilteredNotice(notice)];
            function compareNames(pattern, target) {
                if (target == null) {
                    return false;
                }
                return pattern.endsWith('.') ? target.startsWith(pattern) : pattern === target;
            }
            function compareVersions(pattern, target) {
                return semver.satisfies(target ?? '', pattern);
            }
        });
    }
    static findForBootstrapVersion(data, bootstrappedEnvironments) {
        return (0, util_1.flatMap)(data, notice => {
            const affectedComponent = notice.components.find(component => component.name === 'bootstrap');
            const affectedRange = affectedComponent?.version;
            if (affectedRange == null) {
                return [];
            }
            const affected = bootstrappedEnvironments.filter(i => {
                const semverBootstrapVersion = semver.coerce(i.bootstrapStackVersion);
                if (!semverBootstrapVersion) {
                    // we don't throw because notices should never crash the cli.
                    (0, logging_1.warning)(`While filtering notices, could not coerce bootstrap version '${i.bootstrapStackVersion}' into semver`);
                    return false;
                }
                return semver.satisfies(semverBootstrapVersion, affectedRange);
            });
            if (affected.length === 0) {
                return [];
            }
            const filtered = new FilteredNotice(notice);
            filtered.addDynamicValue('ENVIRONMENTS', affected.map(s => s.environment.name).join(','));
            return [filtered];
        });
    }
    static resolveAliases(components) {
        return (0, util_1.flatMap)(components, component => {
            if (component.name === 'framework') {
                return [{
                        name: '@aws-cdk/core.',
                        version: component.version,
                    }, {
                        name: 'aws-cdk-lib.',
                        version: component.version,
                    }];
            }
            else {
                return [component];
            }
        });
    }
}
exports.NoticesFilter = NoticesFilter;
/**
 * Provides access to notices the CLI can display.
 */
class Notices {
    /**
     * Create an instance. Note that this replaces the singleton.
     */
    static create(props) {
        this._instance = new Notices(props);
        return this._instance;
    }
    /**
     * Get the singleton instance. May return `undefined` if `create` has not been called.
     */
    static get() {
        return this._instance;
    }
    constructor(props) {
        this.data = new Set();
        // sets don't deduplicate interfaces, so we use a map.
        this.bootstrappedEnvironments = new Map();
        this.context = props.context;
        this.acknowledgedIssueNumbers = new Set(this.context.get('acknowledged-issue-numbers') ?? []);
        this.includeAcknowlegded = props.includeAcknowledged ?? false;
        this.output = props.output ?? 'cdk.out';
        this.shouldDisplay = props.shouldDisplay ?? true;
        this.httpOptions = props.httpOptions ?? {};
    }
    /**
     * Add a bootstrap information to filter on. Can have multiple values
     * in case of multi-environment deployments.
     */
    addBootstrappedEnvironment(bootstrapped) {
        const key = [
            bootstrapped.bootstrapStackVersion,
            bootstrapped.environment.account,
            bootstrapped.environment.region,
            bootstrapped.environment.name,
        ].join(':');
        this.bootstrappedEnvironments.set(key, bootstrapped);
    }
    /**
     * Refresh the list of notices this instance is aware of.
     * To make sure this never crashes the CLI process, all failures are caught and
     * slitently logged.
     *
     * If context is configured to not display notices, this will no-op.
     */
    async refresh(options = {}) {
        if (!this.shouldDisplay) {
            return;
        }
        try {
            const underlyingDataSource = options.dataSource ?? new WebsiteNoticeDataSource(this.httpOptions);
            const dataSource = new CachedDataSource(CACHE_FILE_PATH, underlyingDataSource, options.force ?? false);
            const notices = await dataSource.fetch();
            this.data = new Set(this.includeAcknowlegded ? notices : notices.filter(n => !this.acknowledgedIssueNumbers.has(n.issueNumber)));
        }
        catch (e) {
            (0, logging_1.debug)(`Could not refresh notices: ${e}`);
        }
    }
    /**
     * Display the relevant notices (unless context dictates we shouldn't).
     */
    display(options = {}) {
        if (!this.shouldDisplay) {
            return;
        }
        const filteredNotices = NoticesFilter.filter({
            data: Array.from(this.data),
            cliVersion: (0, version_1.versionNumber)(),
            outDir: this.output,
            bootstrappedEnvironments: Array.from(this.bootstrappedEnvironments.values()),
        });
        if (filteredNotices.length > 0) {
            (0, logging_1.print)('');
            (0, logging_1.print)('NOTICES         (What\'s this? https://github.com/aws/aws-cdk/wiki/CLI-Notices)');
            (0, logging_1.print)('');
            for (const filtered of filteredNotices) {
                const formatted = filtered.format();
                switch (filtered.notice.severity) {
                    case 'warning':
                        (0, logging_1.warning)(formatted);
                        break;
                    case 'error':
                        (0, logging_1.error)(formatted);
                        break;
                    default:
                        (0, logging_1.print)(formatted);
                }
                (0, logging_1.print)('');
            }
            (0, logging_1.print)(`If you don’t want to see a notice anymore, use "cdk acknowledge <id>". For example, "cdk acknowledge ${filteredNotices[0].notice.issueNumber}".`);
        }
        if (options.showTotal ?? false) {
            (0, logging_1.print)('');
            (0, logging_1.print)(`There are ${filteredNotices.length} unacknowledged notice(s).`);
        }
    }
}
exports.Notices = Notices;
/**
 * Notice after passing the filter. A filter can augment a notice with
 * dynamic values as it has access to the dynamic matching data.
 */
class FilteredNotice {
    constructor(notice) {
        this.notice = notice;
        this.dynamicValues = {};
    }
    addDynamicValue(key, value) {
        this.dynamicValues[`{resolve:${key}}`] = value;
    }
    format() {
        const componentsValue = this.notice.components.map(c => `${c.name}: ${c.version}`).join(', ');
        return this.resolveDynamicValues([
            `${this.notice.issueNumber}\t${this.notice.title}`,
            this.formatOverview(),
            `\tAffected versions: ${componentsValue}`,
            `\tMore information at: https://github.com/aws/aws-cdk/issues/${this.notice.issueNumber}`,
        ].join('\n\n') + '\n');
    }
    formatOverview() {
        const wrap = (s) => s.replace(/(?![^\n]{1,60}$)([^\n]{1,60})\s/g, '$1\n');
        const heading = 'Overview: ';
        const separator = `\n\t${' '.repeat(heading.length)}`;
        const content = wrap(this.notice.overview)
            .split('\n')
            .join(separator);
        return '\t' + heading + content;
    }
    resolveDynamicValues(input) {
        const pattern = new RegExp(Object.keys(this.dynamicValues).join('|'), 'g');
        return input.replace(pattern, (matched) => this.dynamicValues[matched] ?? matched);
    }
}
exports.FilteredNotice = FilteredNotice;
class WebsiteNoticeDataSource {
    constructor(options = {}) {
        this.options = options;
    }
    fetch() {
        const timeout = 3000;
        return new Promise((resolve, reject) => {
            let req;
            let timer = setTimeout(() => {
                if (req) {
                    req.destroy(new error_1.ToolkitError('Request timed out'));
                }
            }, timeout);
            timer.unref();
            const options = {
                agent: awscli_compatible_1.AwsCliCompatible.proxyAgent(this.options),
            };
            try {
                req = https.get('https://cli.cdk.dev-tools.aws.dev/notices.json', options, res => {
                    if (res.statusCode === 200) {
                        res.setEncoding('utf8');
                        let rawData = '';
                        res.on('data', (chunk) => {
                            rawData += chunk;
                        });
                        res.on('end', () => {
                            try {
                                const data = JSON.parse(rawData).notices;
                                if (!data) {
                                    throw new error_1.ToolkitError("'notices' key is missing");
                                }
                                (0, logging_1.debug)('Notices refreshed');
                                resolve(data ?? []);
                            }
                            catch (e) {
                                reject(new error_1.ToolkitError(`Failed to parse notices: ${e.message}`));
                            }
                        });
                        res.on('error', e => {
                            reject(new error_1.ToolkitError(`Failed to fetch notices: ${e.message}`));
                        });
                    }
                    else {
                        reject(new error_1.ToolkitError(`Failed to fetch notices. Status code: ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
            }
            catch (e) {
                reject(new error_1.ToolkitError(`HTTPS 'get' call threw an error: ${e.message}`));
            }
        });
    }
}
exports.WebsiteNoticeDataSource = WebsiteNoticeDataSource;
const TIME_TO_LIVE_SUCCESS = 60 * 60 * 1000; // 1 hour
const TIME_TO_LIVE_ERROR = 1 * 60 * 1000; // 1 minute
class CachedDataSource {
    constructor(fileName, dataSource, skipCache) {
        this.fileName = fileName;
        this.dataSource = dataSource;
        this.skipCache = skipCache;
    }
    async fetch() {
        const cachedData = await this.load();
        const data = cachedData.notices;
        const expiration = cachedData.expiration ?? 0;
        if (Date.now() > expiration || this.skipCache) {
            const freshData = await this.fetchInner();
            await this.save(freshData);
            return freshData.notices;
        }
        else {
            (0, logging_1.debug)(`Reading cached notices from ${this.fileName}`);
            return data;
        }
    }
    async fetchInner() {
        try {
            return {
                expiration: Date.now() + TIME_TO_LIVE_SUCCESS,
                notices: await this.dataSource.fetch(),
            };
        }
        catch (e) {
            (0, logging_1.debug)(`Could not refresh notices: ${e}`);
            return {
                expiration: Date.now() + TIME_TO_LIVE_ERROR,
                notices: [],
            };
        }
    }
    async load() {
        const defaultValue = {
            expiration: 0,
            notices: [],
        };
        try {
            return fs.existsSync(this.fileName)
                ? await fs.readJSON(this.fileName)
                : defaultValue;
        }
        catch (e) {
            (0, logging_1.debug)(`Failed to load notices from cache: ${e}`);
            return defaultValue;
        }
    }
    async save(cached) {
        try {
            await fs.writeJSON(this.fileName, cached);
        }
        catch (e) {
            (0, logging_1.debug)(`Failed to store notices in the cache: ${e}`);
        }
    }
}
exports.CachedDataSource = CachedDataSource;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5vdGljZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsb0NBQW9DO0FBQ3BDLDZCQUE2QjtBQUU3QiwrQkFBK0I7QUFDL0IsaUNBQWlDO0FBRWpDLHdFQUFvRTtBQUNwRSx1Q0FBeUQ7QUFFekQsMkNBQStDO0FBQy9DLGlDQUErQztBQUMvQyxpQ0FBaUM7QUFDakMsb0RBQWlEO0FBQ2pELHVDQUEwQztBQUUxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUEseUJBQVcsR0FBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBb0VqRSxNQUFhLGFBQWE7SUFDakIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFtQztRQUN0RCxPQUFPO1lBQ0wsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQzNELEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQztZQUM3RCxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQztTQUNoRixDQUFDO0lBQ0osQ0FBQztJQUVPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFjLEVBQUUsVUFBa0I7UUFDakUsT0FBTyxJQUFBLGNBQU8sRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDNUIsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUM7WUFDeEYsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLEVBQUUsT0FBTyxDQUFDO1lBRWpELElBQUksYUFBYSxJQUFJLElBQUksRUFBRSxDQUFD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T0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNYLElBQUEsZUFBSyxFQUFDLHNDQUFzQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELE9BQU8sWUFBWSxDQUFDO1FBQ3RCLENBQUM7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFxQjtRQUN0QyxJQUFJLENBQUM7WUFDSCxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNYLElBQUEsZUFBSyxFQUFDLHlDQUF5QyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUE1REQsNENBNERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xpZW50UmVxdWVzdCB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IHsgUmVxdWVzdE9wdGlvbnMgfSBmcm9tICdodHRwcyc7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdub2RlOmh0dHBzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdHlwZSB7IEVudmlyb25tZW50IH0gZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHsgU2RrSHR0cE9wdGlvbnMgfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQgeyBBd3NDbGlDb21wYXRpYmxlIH0gZnJvbSAnLi9hcGkvYXdzLWF1dGgvYXdzY2xpLWNvbXBhdGlibGUnO1xuaW1wb3J0IHsgZGVidWcsIHByaW50LCB3YXJuaW5nLCBlcnJvciB9IGZyb20gJy4vbG9nZ2luZyc7XG5pbXBvcnQgeyBDb250ZXh0IH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5pbXBvcnQgeyBUb29sa2l0RXJyb3IgfSBmcm9tICcuL3Rvb2xraXQvZXJyb3InO1xuaW1wb3J0IHsgbG9hZFRyZWVGcm9tRGlyLCBzb21lIH0gZnJvbSAnLi90cmVlJztcbmltcG9ydCB7IGZsYXRNYXAgfSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHsgY2RrQ2FjaGVEaXIgfSBmcm9tICcuL3V0aWwvZGlyZWN0b3JpZXMnO1xuaW1wb3J0IHsgdmVyc2lvbk51bWJlciB9IGZyb20gJy4vdmVyc2lvbic7XG5cbmNvbnN0IENBQ0hFX0ZJTEVfUEFUSCA9IHBhdGguam9pbihjZGtDYWNoZURpcigpLCAnbm90aWNlcy5qc29uJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWNlc1Byb3BzIHtcbiAgLyoqXG4gICAqIENESyBjb250ZXh0XG4gICAqL1xuICByZWFkb25seSBjb250ZXh0OiBDb250ZXh0O1xuXG4gIC8qKlxuICAgKiBJbmNsdWRlIG5vdGljZXMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBhY2tub3dsZWRnZWQuXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICByZWFkb25seSBpbmNsdWRlQWNrbm93bGVkZ2VkPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogR2xvYmFsIENMSSBvcHRpb24gZm9yIG91dHB1dCBkaXJlY3RvcnkgZm9yIHN5bnRoZXNpemVkIGNsb3VkIGFzc2VtYmx5XG4gICAqXG4gICAqIEBkZWZhdWx0ICdjZGsub3V0J1xuICAgKi9cbiAgcmVhZG9ubHkgb3V0cHV0Pzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBHbG9iYWwgQ0xJIG9wdGlvbiBmb3Igd2hldGhlciB3ZSBzaG93IG5vdGljZXNcbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgcmVhZG9ubHkgc2hvdWxkRGlzcGxheT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE9wdGlvbnMgZm9yIHRoZSBIVFRQIHJlcXVlc3RcbiAgICovXG4gIHJlYWRvbmx5IGh0dHBPcHRpb25zPzogU2RrSHR0cE9wdGlvbnM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWNlc1ByaW50T3B0aW9ucyB7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gYXBwZW5kIHRoZSB0b3RhbCBudW1iZXIgb2YgdW5hY2tub3dsZWRnZWQgbm90aWNlcyB0byB0aGUgZGlzcGxheS5cbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IHNob3dUb3RhbD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWNlc1JlZnJlc2hPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZm9yY2UgYSBjYWNoZSByZWZyZXNoIHJlZ2FyZGxlc3Mgb2YgZXhwaXJhdGlvbiB0aW1lLlxuICAgKlxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgcmVhZG9ubHkgZm9yY2U/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEYXRhIHNvdXJjZSBmb3IgZmV0Y2ggbm90aWNlcyBmcm9tLlxuICAgKlxuICAgKiBAZGVmYXVsdCAtIFdlYnNpdGVOb3RpY2VEYXRhU291cmNlXG4gICAqL1xuICByZWFkb25seSBkYXRhU291cmNlPzogTm90aWNlRGF0YVNvdXJjZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOb3RpY2VzRmlsdGVyRmlsdGVyT3B0aW9ucyB7XG4gIHJlYWRvbmx5IGRhdGE6IE5vdGljZVtdO1xuICByZWFkb25seSBjbGlWZXJzaW9uOiBzdHJpbmc7XG4gIHJlYWRvbmx5IG91dERpcjogc3RyaW5nO1xuICByZWFkb25seSBib290c3RyYXBwZWRFbnZpcm9ubWVudHM6IEJvb3RzdHJhcHBlZEVudmlyb25tZW50W107XG59XG5cbmV4cG9ydCBjbGFzcyBOb3RpY2VzRmlsdGVyIHtcbiAgcHVibGljIHN0YXRpYyBmaWx0ZXIob3B0aW9uczogTm90aWNlc0ZpbHRlckZpbHRlck9wdGlvbnMpOiBGaWx0ZXJlZE5vdGljZVtdIHtcbiAgICByZXR1cm4gW1xuICAgICAgLi4udGhpcy5maW5kRm9yQ2xpVmVyc2lvbihvcHRpb25zLmRhdGEsIG9wdGlvbnMuY2xpVmVyc2lvbiksXG4gICAgICAuLi50aGlzLmZpbmRGb3JGcmFtZXdvcmtWZXJzaW9uKG9wdGlvbnMuZGF0YSwgb3B0aW9ucy5vdXREaXIpLFxuICAgICAgLi4udGhpcy5maW5kRm9yQm9vdHN0cmFwVmVyc2lvbihvcHRpb25zLmRhdGEsIG9wdGlvbnMuYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzKSxcbiAgICBdO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZmluZEZvckNsaVZlcnNpb24oZGF0YTogTm90aWNlW10sIGNsaVZlcnNpb246IHN0cmluZyk6IEZpbHRlcmVkTm90aWNlW10ge1xuICAgIHJldHVybiBmbGF0TWFwKGRhdGEsIG5vdGljZSA9PiB7XG4gICAgICBjb25zdCBhZmZlY3RlZENvbXBvbmVudCA9IG5vdGljZS5jb21wb25lbnRzLmZpbmQoY29tcG9uZW50ID0+IGNvbXBvbmVudC5uYW1lID09PSAnY2xpJyk7XG4gICAgICBjb25zdCBhZmZlY3RlZFJhbmdlID0gYWZmZWN0ZWRDb21wb25lbnQ/LnZlcnNpb247XG5cbiAgICAgIGlmIChhZmZlY3RlZFJhbmdlID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXNlbXZlci5zYXRpc2ZpZXMoY2xpVmVyc2lvbiwgYWZmZWN0ZWRSYW5nZSkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW25ldyBGaWx0ZXJlZE5vdGljZShub3RpY2UpXTtcbiAgICB9KTtcblxuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZmluZEZvckZyYW1ld29ya1ZlcnNpb24oZGF0YTogTm90aWNlW10sIG91dERpcjogc3RyaW5nKTogRmlsdGVyZWROb3RpY2VbXSB7XG4gICAgY29uc3QgdHJlZSA9IGxvYWRUcmVlRnJvbURpcihvdXREaXIpO1xuICAgIHJldHVybiBmbGF0TWFwKGRhdGEsIG5vdGljZSA9PiB7XG5cbiAgICAgIC8vICBBIG1hdGNoIGhhcHBlbnMgd2hlbjpcbiAgICAgIC8vXG4gICAgICAvLyAgMS4gVGhlIHZlcnNpb24gb2YgdGhlIG5vZGUgbWF0Y2hlcyB0aGUgdmVyc2lvbiBpbiB0aGUgbm90aWNlLCBpbnRlcnByZXRlZFxuICAgICAgLy8gIGFzIGEgc2VtdmVyIHJhbmdlLlxuICAgICAgLy9cbiAgICAgIC8vICBBTkRcbiAgICAgIC8vXG4gICAgICAvLyAgMi4gVGhlIG5hbWUgaW4gdGhlIG5vdGljZSBpcyBhIHByZWZpeCBvZiB0aGUgbm9kZSBuYW1lIHdoZW4gdGhlIHF1ZXJ5IGVuZHMgaW4gJy4nLFxuICAgICAgLy8gIG9yIHRoZSB0d28gbmFtZXMgYXJlIGV4YWN0bHkgdGhlIHNhbWUsIG90aGVyd2lzZS5cblxuICAgICAgY29uc3QgbWF0Y2hlZCA9IHNvbWUodHJlZSwgbm9kZSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVBbGlhc2VzKG5vdGljZS5jb21wb25lbnRzKS5zb21lKGNvbXBvbmVudCA9PlxuICAgICAgICAgIGNvbXBhcmVOYW1lcyhjb21wb25lbnQubmFtZSwgbm9kZS5jb25zdHJ1Y3RJbmZvPy5mcW4pICYmXG4gICAgICAgICAgY29tcGFyZVZlcnNpb25zKGNvbXBvbmVudC52ZXJzaW9uLCBub2RlLmNvbnN0cnVjdEluZm8/LnZlcnNpb24pKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIW1hdGNoZWQpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW25ldyBGaWx0ZXJlZE5vdGljZShub3RpY2UpXTtcblxuICAgICAgZnVuY3Rpb24gY29tcGFyZU5hbWVzKHBhdHRlcm46IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PSBudWxsKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICByZXR1cm4gcGF0dGVybi5lbmRzV2l0aCgnLicpID8gdGFyZ2V0LnN0YXJ0c1dpdGgocGF0dGVybikgOiBwYXR0ZXJuID09PSB0YXJnZXQ7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNvbXBhcmVWZXJzaW9ucyhwYXR0ZXJuOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nIHwgdW5kZWZpbmVkKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBzZW12ZXIuc2F0aXNmaWVzKHRhcmdldCA/PyAnJywgcGF0dGVybik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBmaW5kRm9yQm9vdHN0cmFwVmVyc2lvbihkYXRhOiBOb3RpY2VbXSwgYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzOiBCb290c3RyYXBwZWRFbnZpcm9ubWVudFtdKTogRmlsdGVyZWROb3RpY2VbXSB7XG4gICAgcmV0dXJuIGZsYXRNYXAoZGF0YSwgbm90aWNlID0+IHtcbiAgICAgIGNvbnN0IGFmZmVjdGVkQ29tcG9uZW50ID0gbm90aWNlLmNvbXBvbmVudHMuZmluZChjb21wb25lbnQgPT4gY29tcG9uZW50Lm5hbWUgPT09ICdib290c3RyYXAnKTtcbiAgICAgIGNvbnN0IGFmZmVjdGVkUmFuZ2UgPSBhZmZlY3RlZENvbXBvbmVudD8udmVyc2lvbjtcblxuICAgICAgaWYgKGFmZmVjdGVkUmFuZ2UgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFmZmVjdGVkID0gYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzLmZpbHRlcihpID0+IHtcblxuICAgICAgICBjb25zdCBzZW12ZXJCb290c3RyYXBWZXJzaW9uID0gc2VtdmVyLmNvZXJjZShpLmJvb3RzdHJhcFN0YWNrVmVyc2lvbik7XG4gICAgICAgIGlmICghc2VtdmVyQm9vdHN0cmFwVmVyc2lvbikge1xuICAgICAgICAgIC8vIHdlIGRvbid0IHRocm93IGJlY2F1c2Ugbm90aWNlcyBzaG91bGQgbmV2ZXIgY3Jhc2ggdGhlIGNsaS5cbiAgICAgICAgICB3YXJuaW5nKGBXaGlsZSBmaWx0ZXJpbmcgbm90aWNlcywgY291bGQgbm90IGNvZXJjZSBib290c3RyYXAgdmVyc2lvbiAnJHtpLmJvb3RzdHJhcFN0YWNrVmVyc2lvbn0nIGludG8gc2VtdmVyYCk7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlbXZlci5zYXRpc2ZpZXMoc2VtdmVyQm9vdHN0cmFwVmVyc2lvbiwgYWZmZWN0ZWRSYW5nZSk7XG5cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoYWZmZWN0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlsdGVyZWQgPSBuZXcgRmlsdGVyZWROb3RpY2Uobm90aWNlKTtcbiAgICAgIGZpbHRlcmVkLmFkZER5bmFtaWNWYWx1ZSgnRU5WSVJPTk1FTlRTJywgYWZmZWN0ZWQubWFwKHMgPT4gcy5lbnZpcm9ubWVudC5uYW1lKS5qb2luKCcsJykpO1xuXG4gICAgICByZXR1cm4gW2ZpbHRlcmVkXTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIHJlc29sdmVBbGlhc2VzKGNvbXBvbmVudHM6IENvbXBvbmVudFtdKTogQ29tcG9uZW50W10ge1xuICAgIHJldHVybiBmbGF0TWFwKGNvbXBvbmVudHMsIGNvbXBvbmVudCA9PiB7XG4gICAgICBpZiAoY29tcG9uZW50Lm5hbWUgPT09ICdmcmFtZXdvcmsnKSB7XG4gICAgICAgIHJldHVybiBbe1xuICAgICAgICAgIG5hbWU6ICdAYXdzLWNkay9jb3JlLicsXG4gICAgICAgICAgdmVyc2lvbjogY29tcG9uZW50LnZlcnNpb24sXG4gICAgICAgIH0sIHtcbiAgICAgICAgICBuYW1lOiAnYXdzLWNkay1saWIuJyxcbiAgICAgICAgICB2ZXJzaW9uOiBjb21wb25lbnQudmVyc2lvbixcbiAgICAgICAgfV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW2NvbXBvbmVudF07XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIGJvb3RzdHJhcHBlZCBlbnZpcm9ubWVudC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCb290c3RyYXBwZWRFbnZpcm9ubWVudCB7XG4gIHJlYWRvbmx5IGJvb3RzdHJhcFN0YWNrVmVyc2lvbjogbnVtYmVyO1xuICByZWFkb25seSBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQ7XG59XG5cbi8qKlxuICogUHJvdmlkZXMgYWNjZXNzIHRvIG5vdGljZXMgdGhlIENMSSBjYW4gZGlzcGxheS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5vdGljZXMge1xuICAvKipcbiAgICogQ3JlYXRlIGFuIGluc3RhbmNlLiBOb3RlIHRoYXQgdGhpcyByZXBsYWNlcyB0aGUgc2luZ2xldG9uLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBjcmVhdGUocHJvcHM6IE5vdGljZXNQcm9wcyk6IE5vdGljZXMge1xuICAgIHRoaXMuX2luc3RhbmNlID0gbmV3IE5vdGljZXMocHJvcHMpO1xuICAgIHJldHVybiB0aGlzLl9pbnN0YW5jZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNpbmdsZXRvbiBpbnN0YW5jZS4gTWF5IHJldHVybiBgdW5kZWZpbmVkYCBpZiBgY3JlYXRlYCBoYXMgbm90IGJlZW4gY2FsbGVkLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBnZXQoKTogTm90aWNlcyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2luc3RhbmNlO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgX2luc3RhbmNlOiBOb3RpY2VzIHwgdW5kZWZpbmVkO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgY29udGV4dDogQ29udGV4dDtcbiAgcHJpdmF0ZSByZWFkb25seSBvdXRwdXQ6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSBzaG91bGREaXNwbGF5OiBib29sZWFuO1xuICBwcml2YXRlIHJlYWRvbmx5IGFja25vd2xlZGdlZElzc3VlTnVtYmVyczogU2V0PE51bWJlcj47XG4gIHByaXZhdGUgcmVhZG9ubHkgaW5jbHVkZUFja25vd2xlZ2RlZDogYm9vbGVhbjtcbiAgcHJpdmF0ZSByZWFkb25seSBodHRwT3B0aW9uczogU2RrSHR0cE9wdGlvbnM7XG5cbiAgcHJpdmF0ZSBkYXRhOiBTZXQ8Tm90aWNlPiA9IG5ldyBTZXQoKTtcblxuICAvLyBzZXRzIGRvbid0IGRlZHVwbGljYXRlIGludGVyZmFjZXMsIHNvIHdlIHVzZSBhIG1hcC5cbiAgcHJpdmF0ZSByZWFkb25seSBib290c3RyYXBwZWRFbnZpcm9ubWVudHM6IE1hcDxzdHJpbmcsIEJvb3RzdHJhcHBlZEVudmlyb25tZW50PiA9IG5ldyBNYXAoKTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHByb3BzOiBOb3RpY2VzUHJvcHMpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBwcm9wcy5jb250ZXh0O1xuICAgIHRoaXMuYWNrbm93bGVkZ2VkSXNzdWVOdW1iZXJzID0gbmV3IFNldCh0aGlzLmNvbnRleHQuZ2V0KCdhY2tub3dsZWRnZWQtaXNzdWUtbnVtYmVycycpID8/IFtdKTtcbiAgICB0aGlzLmluY2x1ZGVBY2tub3dsZWdkZWQgPSBwcm9wcy5pbmNsdWRlQWNrbm93bGVkZ2VkID8/IGZhbHNlO1xuICAgIHRoaXMub3V0cHV0ID0gcHJvcHMub3V0cHV0ID8/ICdjZGsub3V0JztcbiAgICB0aGlzLnNob3VsZERpc3BsYXkgPSBwcm9wcy5zaG91bGREaXNwbGF5ID8/IHRydWU7XG4gICAgdGhpcy5odHRwT3B0aW9ucyA9IHByb3BzLmh0dHBPcHRpb25zID8/IHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIGJvb3RzdHJhcCBpbmZvcm1hdGlvbiB0byBmaWx0ZXIgb24uIENhbiBoYXZlIG11bHRpcGxlIHZhbHVlc1xuICAgKiBpbiBjYXNlIG9mIG11bHRpLWVudmlyb25tZW50IGRlcGxveW1lbnRzLlxuICAgKi9cbiAgcHVibGljIGFkZEJvb3RzdHJhcHBlZEVudmlyb25tZW50KGJvb3RzdHJhcHBlZDogQm9vdHN0cmFwcGVkRW52aXJvbm1lbnQpIHtcbiAgICBjb25zdCBrZXkgPSBbXG4gICAgICBib290c3RyYXBwZWQuYm9vdHN0cmFwU3RhY2tWZXJzaW9uLFxuICAgICAgYm9vdHN0cmFwcGVkLmVudmlyb25tZW50LmFjY291bnQsXG4gICAgICBib290c3RyYXBwZWQuZW52aXJvbm1lbnQucmVnaW9uLFxuICAgICAgYm9vdHN0cmFwcGVkLmVudmlyb25tZW50Lm5hbWUsXG4gICAgXS5qb2luKCc6Jyk7XG4gICAgdGhpcy5ib290c3RyYXBwZWRFbnZpcm9ubWVudHMuc2V0KGtleSwgYm9vdHN0cmFwcGVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZyZXNoIHRoZSBsaXN0IG9mIG5vdGljZXMgdGhpcyBpbnN0YW5jZSBpcyBhd2FyZSBvZi5cbiAgICogVG8gbWFrZSBzdXJlIHRoaXMgbmV2ZXIgY3Jhc2hlcyB0aGUgQ0xJIHByb2Nlc3MsIGFsbCBmYWlsdXJlcyBhcmUgY2F1Z2h0IGFuZFxuICAgKiBzbGl0ZW50bHkgbG9nZ2VkLlxuICAgKlxuICAgKiBJZiBjb250ZXh0IGlzIGNvbmZpZ3VyZWQgdG8gbm90IGRpc3BsYXkgbm90aWNlcywgdGhpcyB3aWxsIG5vLW9wLlxuICAgKi9cbiAgcHVibGljIGFzeW5jIHJlZnJlc2gob3B0aW9uczogTm90aWNlc1JlZnJlc2hPcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuc2hvdWxkRGlzcGxheSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB1bmRlcmx5aW5nRGF0YVNvdXJjZSA9IG9wdGlvbnMuZGF0YVNvdXJjZSA/PyBuZXcgV2Vic2l0ZU5vdGljZURhdGFTb3VyY2UodGhpcy5odHRwT3B0aW9ucyk7XG4gICAgICBjb25zdCBkYXRhU291cmNlID0gbmV3IENhY2hlZERhdGFTb3VyY2UoQ0FDSEVfRklMRV9QQVRILCB1bmRlcmx5aW5nRGF0YVNvdXJjZSwgb3B0aW9ucy5mb3JjZSA/PyBmYWxzZSk7XG4gICAgICBjb25zdCBub3RpY2VzID0gYXdhaXQgZGF0YVNvdXJjZS5mZXRjaCgpO1xuICAgICAgdGhpcy5kYXRhID0gbmV3IFNldCh0aGlzLmluY2x1ZGVBY2tub3dsZWdkZWQgPyBub3RpY2VzIDogbm90aWNlcy5maWx0ZXIobiA9PiAhdGhpcy5hY2tub3dsZWRnZWRJc3N1ZU51bWJlcnMuaGFzKG4uaXNzdWVOdW1iZXIpKSk7XG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICBkZWJ1ZyhgQ291bGQgbm90IHJlZnJlc2ggbm90aWNlczogJHtlfWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNwbGF5IHRoZSByZWxldmFudCBub3RpY2VzICh1bmxlc3MgY29udGV4dCBkaWN0YXRlcyB3ZSBzaG91bGRuJ3QpLlxuICAgKi9cbiAgcHVibGljIGRpc3BsYXkob3B0aW9uczogTm90aWNlc1ByaW50T3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCF0aGlzLnNob3VsZERpc3BsYXkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBmaWx0ZXJlZE5vdGljZXMgPSBOb3RpY2VzRmlsdGVyLmZpbHRlcih7XG4gICAgICBkYXRhOiBBcnJheS5mcm9tKHRoaXMuZGF0YSksXG4gICAgICBjbGlWZXJzaW9uOiB2ZXJzaW9uTnVtYmVyKCksXG4gICAgICBvdXREaXI6IHRoaXMub3V0cHV0LFxuICAgICAgYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzOiBBcnJheS5mcm9tKHRoaXMuYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzLnZhbHVlcygpKSxcbiAgICB9KTtcblxuICAgIGlmIChmaWx0ZXJlZE5vdGljZXMubGVuZ3RoID4gMCkge1xuICAgICAgcHJpbnQoJycpO1xuICAgICAgcHJpbnQoJ05PVElDRVMgICAgICAgICAoV2hhdFxcJ3MgdGhpcz8gaHR0cHM6Ly9naXRodWIuY29tL2F3cy9hd3MtY2RrL3dpa2kvQ0xJLU5vdGljZXMpJyk7XG4gICAgICBwcmludCgnJyk7XG4gICAgICBmb3IgKGNvbnN0IGZpbHRlcmVkIG9mIGZpbHRlcmVkTm90aWNlcykge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWQgPSBmaWx0ZXJlZC5mb3JtYXQoKTtcbiAgICAgICAgc3dpdGNoIChmaWx0ZXJlZC5ub3RpY2Uuc2V2ZXJpdHkpIHtcbiAgICAgICAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgICAgICAgIHdhcm5pbmcoZm9ybWF0dGVkKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgIGVycm9yKGZvcm1hdHRlZCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcHJpbnQoZm9ybWF0dGVkKTtcbiAgICAgICAgfVxuICAgICAgICBwcmludCgnJyk7XG4gICAgICB9XG4gICAgICBwcmludChgSWYgeW91IGRvbuKAmXQgd2FudCB0byBzZWUgYSBub3RpY2UgYW55bW9yZSwgdXNlIFwiY2RrIGFja25vd2xlZGdlIDxpZD5cIi4gRm9yIGV4YW1wbGUsIFwiY2RrIGFja25vd2xlZGdlICR7ZmlsdGVyZWROb3RpY2VzWzBdLm5vdGljZS5pc3N1ZU51bWJlcn1cIi5gKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5zaG93VG90YWwgPz8gZmFsc2UpIHtcbiAgICAgIHByaW50KCcnKTtcbiAgICAgIHByaW50KGBUaGVyZSBhcmUgJHtmaWx0ZXJlZE5vdGljZXMubGVuZ3RofSB1bmFja25vd2xlZGdlZCBub3RpY2UocykuYCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9uZW50IHtcbiAgbmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWNlIHtcbiAgdGl0bGU6IHN0cmluZztcbiAgaXNzdWVOdW1iZXI6IG51bWJlcjtcbiAgb3ZlcnZpZXc6IHN0cmluZztcbiAgY29tcG9uZW50czogQ29tcG9uZW50W107XG4gIHNjaGVtYVZlcnNpb246IHN0cmluZztcbiAgc2V2ZXJpdHk/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTm90aWNlIGFmdGVyIHBhc3NpbmcgdGhlIGZpbHRlci4gQSBmaWx0ZXIgY2FuIGF1Z21lbnQgYSBub3RpY2Ugd2l0aFxuICogZHluYW1pYyB2YWx1ZXMgYXMgaXQgaGFzIGFjY2VzcyB0byB0aGUgZHluYW1pYyBtYXRjaGluZyBkYXRhLlxuICovXG5leHBvcnQgY2xhc3MgRmlsdGVyZWROb3RpY2Uge1xuICBwcml2YXRlIHJlYWRvbmx5IGR5bmFtaWNWYWx1ZXM6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcblxuICBwdWJsaWMgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IG5vdGljZTogTm90aWNlKSB7fVxuXG4gIHB1YmxpYyBhZGREeW5hbWljVmFsdWUoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcbiAgICB0aGlzLmR5bmFtaWNWYWx1ZXNbYHtyZXNvbHZlOiR7a2V5fX1gXSA9IHZhbHVlO1xuICB9XG5cbiAgcHVibGljIGZvcm1hdCgpOiBzdHJpbmcge1xuXG4gICAgY29uc3QgY29tcG9uZW50c1ZhbHVlID0gdGhpcy5ub3RpY2UuY29tcG9uZW50cy5tYXAoYyA9PiBgJHtjLm5hbWV9OiAke2MudmVyc2lvbn1gKS5qb2luKCcsICcpO1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVEeW5hbWljVmFsdWVzKFtcbiAgICAgIGAke3RoaXMubm90aWNlLmlzc3VlTnVtYmVyfVxcdCR7dGhpcy5ub3RpY2UudGl0bGV9YCxcbiAgICAgIHRoaXMuZm9ybWF0T3ZlcnZpZXcoKSxcbiAgICAgIGBcXHRBZmZlY3RlZCB2ZXJzaW9uczogJHtjb21wb25lbnRzVmFsdWV9YCxcbiAgICAgIGBcXHRNb3JlIGluZm9ybWF0aW9uIGF0OiBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzLyR7dGhpcy5ub3RpY2UuaXNzdWVOdW1iZXJ9YCxcbiAgICBdLmpvaW4oJ1xcblxcbicpICsgJ1xcbicpO1xuICB9XG5cbiAgcHJpdmF0ZSBmb3JtYXRPdmVydmlldygpIHtcbiAgICBjb25zdCB3cmFwID0gKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC8oPyFbXlxcbl17MSw2MH0kKShbXlxcbl17MSw2MH0pXFxzL2csICckMVxcbicpO1xuXG4gICAgY29uc3QgaGVhZGluZyA9ICdPdmVydmlldzogJztcbiAgICBjb25zdCBzZXBhcmF0b3IgPSBgXFxuXFx0JHsnICcucmVwZWF0KGhlYWRpbmcubGVuZ3RoKX1gO1xuICAgIGNvbnN0IGNvbnRlbnQgPSB3cmFwKHRoaXMubm90aWNlLm92ZXJ2aWV3KVxuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLmpvaW4oc2VwYXJhdG9yKTtcblxuICAgIHJldHVybiAnXFx0JyArIGhlYWRpbmcgKyBjb250ZW50O1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlRHluYW1pY1ZhbHVlcyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChPYmplY3Qua2V5cyh0aGlzLmR5bmFtaWNWYWx1ZXMpLmpvaW4oJ3wnKSwgJ2cnKTtcbiAgICByZXR1cm4gaW5wdXQucmVwbGFjZShwYXR0ZXJuLCAobWF0Y2hlZCkgPT4gdGhpcy5keW5hbWljVmFsdWVzW21hdGNoZWRdID8/IG1hdGNoZWQpO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWNlRGF0YVNvdXJjZSB7XG4gIGZldGNoKCk6IFByb21pc2U8Tm90aWNlW10+O1xufVxuXG5leHBvcnQgY2xhc3MgV2Vic2l0ZU5vdGljZURhdGFTb3VyY2UgaW1wbGVtZW50cyBOb3RpY2VEYXRhU291cmNlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBTZGtIdHRwT3B0aW9ucztcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBTZGtIdHRwT3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIGZldGNoKCk6IFByb21pc2U8Tm90aWNlW10+IHtcbiAgICBjb25zdCB0aW1lb3V0ID0gMzAwMDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgbGV0IHJlcTogQ2xpZW50UmVxdWVzdCB8IHVuZGVmaW5lZDtcblxuICAgICAgbGV0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmIChyZXEpIHtcbiAgICAgICAgICByZXEuZGVzdHJveShuZXcgVG9vbGtpdEVycm9yKCdSZXF1ZXN0IHRpbWVkIG91dCcpKTtcbiAgICAgICAgfVxuICAgICAgfSwgdGltZW91dCk7XG5cbiAgICAgIHRpbWVyLnVucmVmKCk7XG5cbiAgICAgIGNvbnN0IG9wdGlvbnM6IFJlcXVlc3RPcHRpb25zID0ge1xuICAgICAgICBhZ2VudDogQXdzQ2xpQ29tcGF0aWJsZS5wcm94eUFnZW50KHRoaXMub3B0aW9ucyksXG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICByZXEgPSBodHRwcy5nZXQoJ2h0dHBzOi8vY2xpLmNkay5kZXYtdG9vbHMuYXdzLmRldi9ub3RpY2VzLmpzb24nLFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgcmVzID0+IHtcbiAgICAgICAgICAgIGlmIChyZXMuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgIHJlcy5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgICAgICAgICAgICBsZXQgcmF3RGF0YSA9ICcnO1xuICAgICAgICAgICAgICByZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgICAgICByYXdEYXRhICs9IGNodW5rO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhd0RhdGEpLm5vdGljZXMgYXMgTm90aWNlW107XG4gICAgICAgICAgICAgICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihcIidub3RpY2VzJyBrZXkgaXMgbWlzc2luZ1wiKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGRlYnVnKCdOb3RpY2VzIHJlZnJlc2hlZCcpO1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhID8/IFtdKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgVG9vbGtpdEVycm9yKGBGYWlsZWQgdG8gcGFyc2Ugbm90aWNlczogJHtlLm1lc3NhZ2V9YCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJlcy5vbignZXJyb3InLCBlID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IFRvb2xraXRFcnJvcihgRmFpbGVkIHRvIGZldGNoIG5vdGljZXM6ICR7ZS5tZXNzYWdlfWApKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZWplY3QobmV3IFRvb2xraXRFcnJvcihgRmFpbGVkIHRvIGZldGNoIG5vdGljZXMuIFN0YXR1cyBjb2RlOiAke3Jlcy5zdGF0dXNDb2RlfWApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUb29sa2l0RXJyb3IoYEhUVFBTICdnZXQnIGNhbGwgdGhyZXcgYW4gZXJyb3I6ICR7ZS5tZXNzYWdlfWApKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgQ2FjaGVkTm90aWNlcyB7XG4gIGV4cGlyYXRpb246IG51bWJlcjtcbiAgbm90aWNlczogTm90aWNlW107XG59XG5cbmNvbnN0IFRJTUVfVE9fTElWRV9TVUNDRVNTID0gNjAgKiA2MCAqIDEwMDA7IC8vIDEgaG91clxuY29uc3QgVElNRV9UT19MSVZFX0VSUk9SID0gMSAqIDYwICogMTAwMDsgLy8gMSBtaW51dGVcblxuZXhwb3J0IGNsYXNzIENhY2hlZERhdGFTb3VyY2UgaW1wbGVtZW50cyBOb3RpY2VEYXRhU291cmNlIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWxlTmFtZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZGF0YVNvdXJjZTogTm90aWNlRGF0YVNvdXJjZSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNraXBDYWNoZT86IGJvb2xlYW4pIHtcbiAgfVxuXG4gIGFzeW5jIGZldGNoKCk6IFByb21pc2U8Tm90aWNlW10+IHtcbiAgICBjb25zdCBjYWNoZWREYXRhID0gYXdhaXQgdGhpcy5sb2FkKCk7XG4gICAgY29uc3QgZGF0YSA9IGNhY2hlZERhdGEubm90aWNlcztcbiAgICBjb25zdCBleHBpcmF0aW9uID0gY2FjaGVkRGF0YS5leHBpcmF0aW9uID8/IDA7XG5cbiAgICBpZiAoRGF0ZS5ub3coKSA+IGV4cGlyYXRpb24gfHwgdGhpcy5za2lwQ2FjaGUpIHtcbiAgICAgIGNvbnN0IGZyZXNoRGF0YSA9IGF3YWl0IHRoaXMuZmV0Y2hJbm5lcigpO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlKGZyZXNoRGF0YSk7XG4gICAgICByZXR1cm4gZnJlc2hEYXRhLm5vdGljZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnKGBSZWFkaW5nIGNhY2hlZCBub3RpY2VzIGZyb20gJHt0aGlzLmZpbGVOYW1lfWApO1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaElubmVyKCk6IFByb21pc2U8Q2FjaGVkTm90aWNlcz4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBleHBpcmF0aW9uOiBEYXRlLm5vdygpICsgVElNRV9UT19MSVZFX1NVQ0NFU1MsXG4gICAgICAgIG5vdGljZXM6IGF3YWl0IHRoaXMuZGF0YVNvdXJjZS5mZXRjaCgpLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBkZWJ1ZyhgQ291bGQgbm90IHJlZnJlc2ggbm90aWNlczogJHtlfWApO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXhwaXJhdGlvbjogRGF0ZS5ub3coKSArIFRJTUVfVE9fTElWRV9FUlJPUixcbiAgICAgICAgbm90aWNlczogW10sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZCgpOiBQcm9taXNlPENhY2hlZE5vdGljZXM+IHtcbiAgICBjb25zdCBkZWZhdWx0VmFsdWUgPSB7XG4gICAgICBleHBpcmF0aW9uOiAwLFxuICAgICAgbm90aWNlczogW10sXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZnMuZXhpc3RzU3luYyh0aGlzLmZpbGVOYW1lKVxuICAgICAgICA/IGF3YWl0IGZzLnJlYWRKU09OKHRoaXMuZmlsZU5hbWUpIGFzIENhY2hlZE5vdGljZXNcbiAgICAgICAgOiBkZWZhdWx0VmFsdWU7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZGVidWcoYEZhaWxlZCB0byBsb2FkIG5vdGljZXMgZnJvbSBjYWNoZTogJHtlfWApO1xuICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmUoY2FjaGVkOiBDYWNoZWROb3RpY2VzKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLndyaXRlSlNPTih0aGlzLmZpbGVOYW1lLCBjYWNoZWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGRlYnVnKGBGYWlsZWQgdG8gc3RvcmUgbm90aWNlcyBpbiB0aGUgY2FjaGU6ICR7ZX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==