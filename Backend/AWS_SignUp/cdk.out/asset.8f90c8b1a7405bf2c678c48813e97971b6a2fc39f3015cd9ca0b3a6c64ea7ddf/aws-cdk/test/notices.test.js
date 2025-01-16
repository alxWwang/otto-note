"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/order */
const https = require("https");
const os = require("os");
const path = require("path");
const fs = require("fs-extra");
const nock = require("nock");
const logging = require("../lib/logging");
const notices_1 = require("../lib/notices");
const version = require("../lib/version");
const settings_1 = require("../lib/settings");
const BASIC_BOOTSTRAP_NOTICE = {
    title: 'Exccessive permissions on file asset publishing role',
    issueNumber: 16600,
    overview: 'FilePublishingRoleDefaultPolicy has too many permissions',
    components: [{
            name: 'bootstrap',
            version: '<25',
        }],
    schemaVersion: '1',
};
const BOOTSTRAP_NOTICE_V10 = {
    title: 'Bootstrap version 10 is no good',
    issueNumber: 16600,
    overview: 'overview',
    components: [{
            name: 'bootstrap',
            version: '=10',
        }],
    schemaVersion: '1',
};
const BOOTSTRAP_NOTICE_V11 = {
    title: 'Bootstrap version 11 is no good',
    issueNumber: 16600,
    overview: 'overview',
    components: [{
            name: 'bootstrap',
            version: '=11',
        }],
    schemaVersion: '1',
};
const BASIC_DYNAMIC_NOTICE = {
    title: 'Toggling off auto_delete_objects for Bucket empties the bucket',
    issueNumber: 16603,
    overview: '{resolve:DYNAMIC1} this is a notice with dynamic values {resolve:DYNAMIC2}',
    components: [{
            name: 'cli',
            version: '<=1.126.0',
        }],
    schemaVersion: '1',
};
const BASIC_NOTICE = {
    title: 'Toggling off auto_delete_objects for Bucket empties the bucket',
    issueNumber: 16603,
    overview: 'If a stack is deployed with an S3 bucket with auto_delete_objects=True, and then re-deployed with auto_delete_objects=False, all the objects in the bucket will be deleted.',
    components: [{
            name: 'cli',
            version: '<=1.126.0',
        }],
    schemaVersion: '1',
};
const BASIC_WARNING_NOTICE = {
    title: 'Toggling off auto_delete_objects for Bucket empties the bucket',
    issueNumber: 16603,
    overview: 'If a stack is deployed with an S3 bucket with auto_delete_objects=True, and then re-deployed with auto_delete_objects=False, all the objects in the bucket will be deleted.',
    components: [{
            name: 'cli',
            version: '<=1.126.0',
        }],
    schemaVersion: '1',
    severity: 'warning',
};
const BASIC_ERROR_NOTICE = {
    title: 'Toggling off auto_delete_objects for Bucket empties the bucket',
    issueNumber: 16603,
    overview: 'If a stack is deployed with an S3 bucket with auto_delete_objects=True, and then re-deployed with auto_delete_objects=False, all the objects in the bucket will be deleted.',
    components: [{
            name: 'cli',
            version: '<=1.126.0',
        }],
    schemaVersion: '1',
    severity: 'error',
};
const MULTIPLE_AFFECTED_VERSIONS_NOTICE = {
    title: 'Error when building EKS cluster with monocdk import',
    issueNumber: 17061,
    overview: 'When using monocdk/aws-eks to build a stack containing an EKS cluster, error is thrown about missing lambda-layer-node-proxy-agent/layer/package.json.',
    components: [{
            name: 'cli',
            version: '<1.130.0 >=1.126.0',
        }],
    schemaVersion: '1',
};
const FRAMEWORK_2_1_0_AFFECTED_NOTICE = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: 'framework',
            version: '<= 2.1.0',
        }],
    schemaVersion: '1',
};
const NOTICE_FOR_APIGATEWAYV2 = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: '@aws-cdk/aws-apigatewayv2-alpha.',
            version: '<= 2.13.0-alpha.0',
        }],
    schemaVersion: '1',
};
const NOTICE_FOR_APIGATEWAY = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: '@aws-cdk/aws-apigateway',
            version: '<= 2.13.0-alpha.0',
        }],
    schemaVersion: '1',
};
const NOTICE_FOR_APIGATEWAYV2_CFN_STAGE = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: 'aws-cdk-lib.aws_apigatewayv2.CfnStage',
            version: '<= 2.13.0-alpha.0',
        }],
    schemaVersion: '1',
};
describe(notices_1.FilteredNotice, () => {
    describe('format', () => {
        test('resolves dynamic values', () => {
            const filteredNotice = new notices_1.FilteredNotice(BASIC_DYNAMIC_NOTICE);
            filteredNotice.addDynamicValue('DYNAMIC1', 'dynamic-value1');
            filteredNotice.addDynamicValue('DYNAMIC2', 'dynamic-value2');
            expect(filteredNotice.format()).toMatchInlineSnapshot(`
"16603	Toggling off auto_delete_objects for Bucket empties the bucket

	Overview: dynamic-value1 this is a notice with dynamic values
	          dynamic-value2

	Affected versions: cli: <=1.126.0

	More information at: https://github.com/aws/aws-cdk/issues/16603
"
`);
        });
        test('single version range', () => {
            expect(new notices_1.FilteredNotice(BASIC_NOTICE).format()).toMatchInlineSnapshot(`
"16603	Toggling off auto_delete_objects for Bucket empties the bucket

	Overview: If a stack is deployed with an S3 bucket with
	          auto_delete_objects=True, and then re-deployed with
	          auto_delete_objects=False, all the objects in the bucket
	          will be deleted.

	Affected versions: cli: <=1.126.0

	More information at: https://github.com/aws/aws-cdk/issues/16603
"
`);
        });
        test('multiple version ranges', () => {
            expect(new notices_1.FilteredNotice(MULTIPLE_AFFECTED_VERSIONS_NOTICE).format()).toMatchInlineSnapshot(`
"17061	Error when building EKS cluster with monocdk import

	Overview: When using monocdk/aws-eks to build a stack containing an
	          EKS cluster, error is thrown about missing
	          lambda-layer-node-proxy-agent/layer/package.json.

	Affected versions: cli: <1.130.0 >=1.126.0

	More information at: https://github.com/aws/aws-cdk/issues/17061
"
`);
        });
    });
});
describe(notices_1.NoticesFilter, () => {
    describe('filter', () => {
        test('cli', async () => {
            const notices = [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE];
            // doesn't matter for this test because our data only has CLI notices
            const outDir = path.join(__dirname, 'cloud-assembly-trees', 'built-with-2_12_0');
            expect(notices_1.NoticesFilter.filter({ data: notices, bootstrappedEnvironments: [], outDir, cliVersion: '1.0.0' }).map(f => f.notice)).toEqual([BASIC_NOTICE]);
            expect(notices_1.NoticesFilter.filter({ data: notices, bootstrappedEnvironments: [], outDir, cliVersion: '1.129.0' }).map(f => f.notice)).toEqual([MULTIPLE_AFFECTED_VERSIONS_NOTICE]);
            expect(notices_1.NoticesFilter.filter({ data: notices, bootstrappedEnvironments: [], outDir, cliVersion: '1.126.0' }).map(f => f.notice)).toEqual([BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE]);
            expect(notices_1.NoticesFilter.filter({ data: notices, bootstrappedEnvironments: [], outDir, cliVersion: '1.130.0' }).map(f => f.notice)).toEqual([]);
        });
        test('framework', () => {
            const notices = [FRAMEWORK_2_1_0_AFFECTED_NOTICE];
            // doesn't matter for this test because our data only has framework notices
            const cliVersion = '1.0.0';
            expect(notices_1.NoticesFilter.filter({ data: notices, cliVersion, bootstrappedEnvironments: [], outDir: path.join(__dirname, 'cloud-assembly-trees', 'built-with-2_12_0') }).map(f => f.notice)).toEqual([]);
            expect(notices_1.NoticesFilter.filter({ data: notices, cliVersion, bootstrappedEnvironments: [], outDir: path.join(__dirname, 'cloud-assembly-trees', 'built-with-1_144_0') }).map(f => f.notice)).toEqual([FRAMEWORK_2_1_0_AFFECTED_NOTICE]);
        });
        test('module', () => {
            // doesn't matter for this test because our data only has framework notices
            const cliVersion = '1.0.0';
            // module-level match
            expect(notices_1.NoticesFilter.filter({ data: [NOTICE_FOR_APIGATEWAYV2], cliVersion, bootstrappedEnvironments: [], outDir: path.join(__dirname, 'cloud-assembly-trees', 'experimental-module') }).map(f => f.notice)).toEqual([NOTICE_FOR_APIGATEWAYV2]);
            // no apigatewayv2 in the tree
            expect(notices_1.NoticesFilter.filter({ data: [NOTICE_FOR_APIGATEWAYV2], cliVersion, bootstrappedEnvironments: [], outDir: path.join(__dirname, 'cloud-assembly-trees', 'built-with-2_12_0') }).map(f => f.notice)).toEqual([]);
            // module name mismatch: apigateway != apigatewayv2
            expect(notices_1.NoticesFilter.filter({ data: [NOTICE_FOR_APIGATEWAY], cliVersion, bootstrappedEnvironments: [], outDir: path.join(__dirname, 'cloud-assembly-trees', 'experimental-module') }).map(f => f.notice)).toEqual([]);
            // construct-level match
            expect(notices_1.NoticesFilter.filter({ data: [NOTICE_FOR_APIGATEWAYV2_CFN_STAGE], cliVersion, bootstrappedEnvironments: [], outDir: path.join(__dirname, 'cloud-assembly-trees', 'experimental-module') }).map(f => f.notice)).toEqual([NOTICE_FOR_APIGATEWAYV2_CFN_STAGE]);
        });
        test('bootstrap', () => {
            // doesn't matter for this test because our data only has bootstrap notices
            const outDir = path.join(__dirname, 'cloud-assembly-trees', 'built-with-2_12_0');
            const cliVersion = '1.0.0';
            const bootstrappedEnvironments = [
                {
                    // affected
                    bootstrapStackVersion: 22,
                    environment: {
                        account: 'account',
                        region: 'region1',
                        name: 'env1',
                    },
                },
                {
                    // affected
                    bootstrapStackVersion: 21,
                    environment: {
                        account: 'account',
                        region: 'region2',
                        name: 'env2',
                    },
                },
                {
                    // not affected
                    bootstrapStackVersion: 28,
                    environment: {
                        account: 'account',
                        region: 'region3',
                        name: 'env3',
                    },
                },
            ];
            expect(notices_1.NoticesFilter.filter({
                data: [BASIC_BOOTSTRAP_NOTICE],
                cliVersion,
                outDir,
                bootstrappedEnvironments: bootstrappedEnvironments,
            }).map(f => f.notice)).toEqual([BASIC_BOOTSTRAP_NOTICE]);
        });
        test('ignores invalid bootstrap versions', () => {
            // doesn't matter for this test because our data only has bootstrap notices
            const outDir = path.join(__dirname, 'cloud-assembly-trees', 'built-with-2_12_0');
            const cliVersion = '1.0.0';
            expect(notices_1.NoticesFilter.filter({
                data: [BASIC_BOOTSTRAP_NOTICE],
                cliVersion,
                outDir,
                bootstrappedEnvironments: [{ bootstrapStackVersion: NaN, environment: { account: 'account', region: 'region', name: 'env' } }],
            }).map(f => f.notice)).toEqual([]);
        });
    });
});
describe(notices_1.WebsiteNoticeDataSource, () => {
    const dataSource = new notices_1.WebsiteNoticeDataSource();
    test('returns data when download succeeds', async () => {
        const result = await mockCall(200, {
            notices: [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE],
        });
        expect(result).toEqual([BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE]);
    });
    test('returns appropriate error when the server returns an unexpected status code', async () => {
        const result = mockCall(500, {
            notices: [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE],
        });
        await expect(result).rejects.toThrow(/500/);
    });
    test('returns appropriate error when the server returns an unexpected structure', async () => {
        const result = mockCall(200, {
            foo: [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE],
        });
        await expect(result).rejects.toThrow(/key is missing/);
    });
    test('returns appropriate error when the server returns invalid json', async () => {
        const result = mockCall(200, '-09aiskjkj838');
        await expect(result).rejects.toThrow(/Failed to parse/);
    });
    test('returns appropriate error when HTTPS call throws', async () => {
        const mockGet = jest.spyOn(https, 'get')
            .mockImplementation(() => { throw new Error('No connection'); });
        const result = dataSource.fetch();
        await expect(result).rejects.toThrow(/No connection/);
        mockGet.mockRestore();
    });
    test('returns appropriate error when the request has an error', async () => {
        nock('https://cli.cdk.dev-tools.aws.dev')
            .get('/notices.json')
            .replyWithError('DNS resolution failed');
        const result = dataSource.fetch();
        await expect(result).rejects.toThrow(/DNS resolution failed/);
    });
    test('returns appropriate error when the connection stays idle for too long', async () => {
        nock('https://cli.cdk.dev-tools.aws.dev')
            .get('/notices.json')
            .delayConnection(3500)
            .reply(200, {
            notices: [BASIC_NOTICE],
        });
        const result = dataSource.fetch();
        await expect(result).rejects.toThrow(/timed out/);
    });
    test('returns empty array when the request takes too long to finish', async () => {
        nock('https://cli.cdk.dev-tools.aws.dev')
            .get('/notices.json')
            .delayBody(3500)
            .reply(200, {
            notices: [BASIC_NOTICE],
        });
        const result = dataSource.fetch();
        await expect(result).rejects.toThrow(/timed out/);
    });
    function mockCall(statusCode, body) {
        nock('https://cli.cdk.dev-tools.aws.dev')
            .get('/notices.json')
            .reply(statusCode, body);
        return dataSource.fetch();
    }
});
describe(notices_1.CachedDataSource, () => {
    const fileName = path.join(os.tmpdir(), 'cache.json');
    const cachedData = [BASIC_NOTICE];
    const freshData = [MULTIPLE_AFFECTED_VERSIONS_NOTICE];
    beforeEach(() => {
        fs.writeFileSync(fileName, '');
    });
    test('retrieves data from the delegate cache when the file is empty', async () => {
        const dataSource = dataSourceWithDelegateReturning(freshData);
        const notices = await dataSource.fetch();
        expect(notices).toEqual(freshData);
    });
    test('retrieves data from the file when the data is still valid', async () => {
        fs.writeJsonSync(fileName, {
            notices: cachedData,
            expiration: Date.now() + 10000,
        });
        const dataSource = dataSourceWithDelegateReturning(freshData);
        const notices = await dataSource.fetch();
        expect(notices).toEqual(cachedData);
    });
    test('retrieves data from the delegate when the data is expired', async () => {
        fs.writeJsonSync(fileName, {
            notices: cachedData,
            expiration: 0,
        });
        const dataSource = dataSourceWithDelegateReturning(freshData);
        const notices = await dataSource.fetch();
        expect(notices).toEqual(freshData);
    });
    test('retrieves data from the delegate when the file cannot be read', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdk-test'));
        try {
            const debugSpy = jest.spyOn(logging, 'debug');
            const dataSource = dataSourceWithDelegateReturning(freshData, `${tmpDir}/does-not-exist.json`);
            const notices = await dataSource.fetch();
            expect(notices).toEqual(freshData);
            expect(debugSpy).not.toHaveBeenCalled();
            debugSpy.mockRestore();
        }
        finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
    test('retrieved data from the delegate when it is configured to ignore the cache', async () => {
        fs.writeJsonSync(fileName, {
            notices: cachedData,
            expiration: Date.now() + 10000,
        });
        const dataSource = dataSourceWithDelegateReturning(freshData, fileName, true);
        const notices = await dataSource.fetch();
        expect(notices).toEqual(freshData);
    });
    test('error in delegate gets turned into empty result by cached source', async () => {
        // GIVEN
        const delegate = {
            fetch: jest.fn().mockRejectedValue(new Error('fetching failed')),
        };
        const dataSource = new notices_1.CachedDataSource(fileName, delegate, true);
        // WHEN
        const notices = await dataSource.fetch();
        // THEN
        expect(notices).toEqual([]);
    });
    function dataSourceWithDelegateReturning(notices, file = fileName, ignoreCache = false) {
        const delegate = {
            fetch: jest.fn(),
        };
        delegate.fetch.mockResolvedValue(notices);
        return new notices_1.CachedDataSource(file, delegate, ignoreCache);
    }
});
describe(notices_1.Notices, () => {
    beforeEach(() => {
        // disable caching
        jest.spyOn(notices_1.CachedDataSource.prototype, 'save').mockImplementation((_) => Promise.resolve());
        jest.spyOn(notices_1.CachedDataSource.prototype, 'load').mockImplementation(() => Promise.resolve({ expiration: 0, notices: [] }));
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('addBootstrapVersion', () => {
        test('can add multiple values', async () => {
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            notices.addBootstrappedEnvironment({ bootstrapStackVersion: 10, environment: { account: 'account', region: 'region', name: 'env' } });
            notices.addBootstrappedEnvironment({ bootstrapStackVersion: 11, environment: { account: 'account', region: 'region', name: 'env' } });
            await notices.refresh({
                dataSource: { fetch: async () => [BOOTSTRAP_NOTICE_V10, BOOTSTRAP_NOTICE_V11] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenCalledWith(new notices_1.FilteredNotice(BOOTSTRAP_NOTICE_V10).format());
            expect(print).toHaveBeenCalledWith(new notices_1.FilteredNotice(BOOTSTRAP_NOTICE_V11).format());
        });
        test('deduplicates', async () => {
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            notices.addBootstrappedEnvironment({ bootstrapStackVersion: 10, environment: { account: 'account', region: 'region', name: 'env' } });
            notices.addBootstrappedEnvironment({ bootstrapStackVersion: 10, environment: { account: 'account', region: 'region', name: 'env' } });
            // mock cli version number
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            notices.display();
            const filter = jest.spyOn(notices_1.NoticesFilter, 'filter');
            notices.display();
            expect(filter).toHaveBeenCalledTimes(1);
            expect(filter).toHaveBeenCalledWith({
                bootstrappedEnvironments: [{
                        bootstrapStackVersion: 10,
                        environment: {
                            account: 'account',
                            region: 'region',
                            name: 'env',
                        },
                    }],
                cliVersion: '1.0.0',
                data: [],
                outDir: 'cdk.out',
            });
        });
    });
    describe('refresh', () => {
        test('deduplicates notices', async () => {
            // within the affected version range of the notice
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE, BASIC_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenCalledWith(new notices_1.FilteredNotice(BASIC_NOTICE).format());
        });
        test('clears notices if empty', async () => {
            // within the affected version range of the notice
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: { fetch: async () => [] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display({ showTotal: true });
            expect(print).toHaveBeenNthCalledWith(1, '');
            expect(print).toHaveBeenNthCalledWith(2, 'There are 0 unacknowledged notice(s).');
            expect(print).toHaveBeenCalledTimes(2);
        });
        test('doesnt throw', async () => {
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: {
                    fetch: async () => {
                        throw new Error('Should not fail refresh');
                    },
                },
            });
        });
        test('does nothing when we shouldnt display', async () => {
            let refreshCalled = false;
            const notices = notices_1.Notices.create({ context: new settings_1.Context(), shouldDisplay: false });
            await notices.refresh({
                dataSource: {
                    fetch: async () => {
                        refreshCalled = true;
                        return Promise.resolve([]);
                    },
                },
            });
            expect(refreshCalled).toBeFalsy();
        });
        test('filters out acknowledged notices by default', async () => {
            // within the affected version range of both notices
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.126.0');
            const context = new settings_1.Context({ bag: new settings_1.Settings({ 'acknowledged-issue-numbers': [MULTIPLE_AFFECTED_VERSIONS_NOTICE.issueNumber] }) });
            const notices = notices_1.Notices.create({ context });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenNthCalledWith(4, new notices_1.FilteredNotice(BASIC_NOTICE).format());
            expect(print).toHaveBeenNthCalledWith(6, 'If you don’t want to see a notice anymore, use \"cdk acknowledge <id>\". For example, \"cdk acknowledge 16603\".');
        });
        test('preserves acknowledged notices if requested', async () => {
            // within the affected version range of both notices
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.126.0');
            const context = new settings_1.Context({ bag: new settings_1.Settings({ 'acknowledged-issue-numbers': [MULTIPLE_AFFECTED_VERSIONS_NOTICE.issueNumber] }) });
            const notices = notices_1.Notices.create({ context, includeAcknowledged: true });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenCalledWith(new notices_1.FilteredNotice(BASIC_NOTICE).format());
            expect(print).toHaveBeenCalledWith(new notices_1.FilteredNotice(MULTIPLE_AFFECTED_VERSIONS_NOTICE).format());
        });
    });
    describe('display', () => {
        test('notices envelop', async () => {
            // within the affected version range of the notice
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE, BASIC_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenNthCalledWith(2, 'NOTICES         (What\'s this? https://github.com/aws/aws-cdk/wiki/CLI-Notices)');
            expect(print).toHaveBeenNthCalledWith(6, 'If you don’t want to see a notice anymore, use \"cdk acknowledge <id>\". For example, \"cdk acknowledge 16603\".');
        });
        test('deduplicates notices', async () => {
            // within the affected version range of the notice
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE, BASIC_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenNthCalledWith(4, new notices_1.FilteredNotice(BASIC_NOTICE).format());
            expect(print).toHaveBeenNthCalledWith(6, 'If you don’t want to see a notice anymore, use \"cdk acknowledge <id>\". For example, \"cdk acknowledge 16603\".');
        });
        test('does nothing when we shouldnt display', async () => {
            const notices = notices_1.Notices.create({ context: new settings_1.Context(), shouldDisplay: false });
            await notices.refresh({ dataSource: { fetch: async () => [BASIC_NOTICE] } });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenCalledTimes(0);
        });
        test('nothing when there are no notices', async () => {
            const print = jest.spyOn(logging, 'print');
            notices_1.Notices.create({ context: new settings_1.Context() }).display();
            expect(print).toHaveBeenCalledTimes(0);
        });
        test('total count when show total is true', async () => {
            const print = jest.spyOn(logging, 'print');
            notices_1.Notices.create({ context: new settings_1.Context() }).display({ showTotal: true });
            expect(print).toHaveBeenNthCalledWith(2, 'There are 0 unacknowledged notice(s).');
        });
        test('warning', async () => {
            // within the affected version range of the notice
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_WARNING_NOTICE] },
            });
            const warning = jest.spyOn(logging, 'warning');
            notices.display();
            expect(warning).toHaveBeenNthCalledWith(1, new notices_1.FilteredNotice(BASIC_NOTICE).format());
            expect(warning).toHaveBeenCalledTimes(1);
        });
        test('error', async () => {
            // within the affected version range of the notice
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_ERROR_NOTICE] },
            });
            const error = jest.spyOn(logging, 'error');
            notices.display();
            expect(error).toHaveBeenNthCalledWith(1, new notices_1.FilteredNotice(BASIC_NOTICE).format());
            expect(error).toHaveBeenCalledTimes(1);
        });
        test('only relevant notices', async () => {
            // within the affected version range of the notice
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.0.0');
            const notices = notices_1.Notices.create({ context: new settings_1.Context() });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenNthCalledWith(4, new notices_1.FilteredNotice(BASIC_NOTICE).format());
        });
        test('only unacknowledged notices', async () => {
            // within the affected version range of both notices
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.126.0');
            const context = new settings_1.Context({ bag: new settings_1.Settings({ 'acknowledged-issue-numbers': [MULTIPLE_AFFECTED_VERSIONS_NOTICE.issueNumber] }) });
            const notices = notices_1.Notices.create({ context });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenNthCalledWith(4, new notices_1.FilteredNotice(BASIC_NOTICE).format());
        });
        test('can include acknowledged notices if requested', async () => {
            // within the affected version range of both notices
            jest.spyOn(version, 'versionNumber').mockImplementation(() => '1.126.0');
            const context = new settings_1.Context({ bag: new settings_1.Settings({ 'acknowledged-issue-numbers': [MULTIPLE_AFFECTED_VERSIONS_NOTICE.issueNumber] }) });
            const notices = notices_1.Notices.create({ context, includeAcknowledged: true });
            await notices.refresh({
                dataSource: { fetch: async () => [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE] },
            });
            const print = jest.spyOn(logging, 'print');
            notices.display();
            expect(print).toHaveBeenNthCalledWith(4, new notices_1.FilteredNotice(BASIC_NOTICE).format());
            expect(print).toHaveBeenNthCalledWith(6, new notices_1.FilteredNotice(MULTIPLE_AFFECTED_VERSIONS_NOTICE).format());
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibm90aWNlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaUNBQWlDO0FBQ2pDLCtCQUErQjtBQUMvQix5QkFBeUI7QUFDekIsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQiw2QkFBNkI7QUFDN0IsMENBQTBDO0FBQzFDLDRDQVF3QjtBQUN4QiwwQ0FBMEM7QUFDMUMsOENBQW9EO0FBRXBELE1BQU0sc0JBQXNCLEdBQUc7SUFDN0IsS0FBSyxFQUFFLHNEQUFzRDtJQUM3RCxXQUFXLEVBQUUsS0FBSztJQUNsQixRQUFRLEVBQUUsMERBQTBEO0lBQ3BFLFVBQVUsRUFBRSxDQUFDO1lBQ1gsSUFBSSxFQUFFLFdBQVc7WUFDakIsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO0lBQ0YsYUFBYSxFQUFFLEdBQUc7Q0FDbkIsQ0FBQztBQUVGLE1BQU0sb0JBQW9CLEdBQUc7SUFDM0IsS0FBSyxFQUFFLGlDQUFpQztJQUN4QyxXQUFXLEVBQUUsS0FBSztJQUNsQixRQUFRLEVBQUUsVUFBVTtJQUNwQixVQUFVLEVBQUUsQ0FBQztZQUNYLElBQUksRUFBRSxXQUFXO1lBQ2pCLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQztJQUNGLGFBQWEsRUFBRSxHQUFHO0NBQ25CLENBQUM7QUFFRixNQUFNLG9CQUFvQixHQUFHO0lBQzNCLEtBQUssRUFBRSxpQ0FBaUM7SUFDeEMsV0FBVyxFQUFFLEtBQUs7SUFDbEIsUUFBUSxFQUFFLFVBQVU7SUFDcEIsVUFBVSxFQUFFLENBQUM7WUFDWCxJQUFJLEVBQUUsV0FBVztZQUNqQixPQUFPLEVBQUUsS0FBSztTQUNmLENBQUM7SUFDRixhQUFhLEVBQUUsR0FBRztDQUNuQixDQUFDO0FBRUYsTUFBTSxvQkFBb0IsR0FBRztJQUMzQixLQUFLLEVBQUUsZ0VBQWdFO0lBQ3ZFLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLFFBQVEsRUFBRSw0RUFBNEU7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RixNQUFNLENBQUMsdUJBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUN0SixNQUFNLENBQUMsdUJBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDO1lBQzdLLE1BQU0sQ0FBQyx1QkFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUFDO1lBQzNMLE1BQU0sQ0FBQyx1QkFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUksQ0FBQyxDQUFDLENBQUM7UUFF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QVcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEksTUFBTSxPQUFPLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN2RSxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQ3BCLFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLGlDQUFpQyxDQUFDLEVBQUU7YUFDckYsQ0FBQyxDQUFDO1lBRUgsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFM0MsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEVBQUUsSUFBSSx3QkFBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDcEYsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsRUFBRSxJQUFJLHdCQUFjLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzNHLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIGltcG9ydC9vcmRlciAqL1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIG5vY2sgZnJvbSAnbm9jayc7XG5pbXBvcnQgKiBhcyBsb2dnaW5nIGZyb20gJy4uL2xpYi9sb2dnaW5nJztcbmltcG9ydCB7XG4gIENhY2hlZERhdGFTb3VyY2UsXG4gIE5vdGljZSxcbiAgTm90aWNlcyxcbiAgTm90aWNlc0ZpbHRlcixcbiAgRmlsdGVyZWROb3RpY2UsXG4gIFdlYnNpdGVOb3RpY2VEYXRhU291cmNlLFxuICBCb290c3RyYXBwZWRFbnZpcm9ubWVudCxcbn0gZnJvbSAnLi4vbGliL25vdGljZXMnO1xuaW1wb3J0ICogYXMgdmVyc2lvbiBmcm9tICcuLi9saWIvdmVyc2lvbic7XG5pbXBvcnQgeyBDb250ZXh0LCBTZXR0aW5ncyB9IGZyb20gJy4uL2xpYi9zZXR0aW5ncyc7XG5cbmNvbnN0IEJBU0lDX0JPT1RTVFJBUF9OT1RJQ0UgPSB7XG4gIHRpdGxlOiAnRXhjY2Vzc2l2ZSBwZXJtaXNzaW9ucyBvbiBmaWxlIGFzc2V0IHB1Ymxpc2hpbmcgcm9sZScsXG4gIGlzc3VlTnVtYmVyOiAxNjYwMCxcbiAgb3ZlcnZpZXc6ICdGaWxlUHVibGlzaGluZ1JvbGVEZWZhdWx0UG9saWN5IGhhcyB0b28gbWFueSBwZXJtaXNzaW9ucycsXG4gIGNvbXBvbmVudHM6IFt7XG4gICAgbmFtZTogJ2Jvb3RzdHJhcCcsXG4gICAgdmVyc2lvbjogJzwyNScsXG4gIH1dLFxuICBzY2hlbWFWZXJzaW9uOiAnMScsXG59O1xuXG5jb25zdCBCT09UU1RSQVBfTk9USUNFX1YxMCA9IHtcbiAgdGl0bGU6ICdCb290c3RyYXAgdmVyc2lvbiAxMCBpcyBubyBnb29kJyxcbiAgaXNzdWVOdW1iZXI6IDE2NjAwLFxuICBvdmVydmlldzogJ292ZXJ2aWV3JyxcbiAgY29tcG9uZW50czogW3tcbiAgICBuYW1lOiAnYm9vdHN0cmFwJyxcbiAgICB2ZXJzaW9uOiAnPTEwJyxcbiAgfV0sXG4gIHNjaGVtYVZlcnNpb246ICcxJyxcbn07XG5cbmNvbnN0IEJPT1RTVFJBUF9OT1RJQ0VfVjExID0ge1xuICB0aXRsZTogJ0Jvb3RzdHJhcCB2ZXJzaW9uIDExIGlzIG5vIGdvb2QnLFxuICBpc3N1ZU51bWJlcjogMTY2MDAsXG4gIG92ZXJ2aWV3OiAnb3ZlcnZpZXcnLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdib290c3RyYXAnLFxuICAgIHZlcnNpb246ICc9MTEnLFxuICB9XSxcbiAgc2NoZW1hVmVyc2lvbjogJzEnLFxufTtcblxuY29uc3QgQkFTSUNfRFlOQU1JQ19OT1RJQ0UgPSB7XG4gIHRpdGxlOiAnVG9nZ2xpbmcgb2ZmIGF1dG9fZGVsZXRlX29iamVjdHMgZm9yIEJ1Y2tldCBlbXB0aWVzIHRoZSBidWNrZXQnLFxuICBpc3N1ZU51bWJlcjogMTY2MDMsXG4gIG92ZXJ2aWV3OiAne3Jlc29sdmU6RFlOQU1JQzF9IHRoaXMgaXMgYSBub3RpY2Ugd2l0aCBkeW5hbWljIHZhbHVlcyB7cmVzb2x2ZTpEWU5BTUlDMn0nLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdjbGknLFxuICAgIHZlcnNpb246ICc8PTEuMTI2LjAnLFxuICB9XSxcbiAgc2NoZW1hVmVyc2lvbjogJzEnLFxufTtcblxuY29uc3QgQkFTSUNfTk9USUNFID0ge1xuICB0aXRsZTogJ1RvZ2dsaW5nIG9mZiBhdXRvX2RlbGV0ZV9vYmplY3RzIGZvciBCdWNrZXQgZW1wdGllcyB0aGUgYnVja2V0JyxcbiAgaXNzdWVOdW1iZXI6IDE2NjAzLFxuICBvdmVydmlldzogJ0lmIGEgc3RhY2sgaXMgZGVwbG95ZWQgd2l0aCBhbiBTMyBidWNrZXQgd2l0aCBhdXRvX2RlbGV0ZV9vYmplY3RzPVRydWUsIGFuZCB0aGVuIHJlLWRlcGxveWVkIHdpdGggYXV0b19kZWxldGVfb2JqZWN0cz1GYWxzZSwgYWxsIHRoZSBvYmplY3RzIGluIHRoZSBidWNrZXQgd2lsbCBiZSBkZWxldGVkLicsXG4gIGNvbXBvbmVudHM6IFt7XG4gICAgbmFtZTogJ2NsaScsXG4gICAgdmVyc2lvbjogJzw9MS4xMjYuMCcsXG4gIH1dLFxuICBzY2hlbWFWZXJzaW9uOiAnMScsXG59O1xuXG5jb25zdCBCQVNJQ19XQVJOSU5HX05PVElDRSA9IHtcbiAgdGl0bGU6ICdUb2dnbGluZyBvZmYgYXV0b19kZWxldGVfb2JqZWN0cyBmb3IgQnVja2V0IGVtcHRpZXMgdGhlIGJ1Y2tldCcsXG4gIGlzc3VlTnVtYmVyOiAxNjYwMyxcbiAgb3ZlcnZpZXc6ICdJZiBhIHN0YWNrIGlzIGRlcGxveWVkIHdpdGggYW4gUzMgYnVja2V0IHdpdGggYXV0b19kZWxldGVfb2JqZWN0cz1UcnVlLCBhbmQgdGhlbiByZS1kZXBsb3llZCB3aXRoIGF1dG9fZGVsZXRlX29iamVjdHM9RmFsc2UsIGFsbCB0aGUgb2JqZWN0cyBpbiB0aGUgYnVja2V0IHdpbGwgYmUgZGVsZXRlZC4nLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdjbGknLFxuICAgIHZlcnNpb246ICc8PTEuMTI2LjAnLFxuICB9XSxcbiAgc2NoZW1hVmVyc2lvbjogJzEnLFxuICBzZXZlcml0eTogJ3dhcm5pbmcnLFxufTtcblxuY29uc3QgQkFTSUNfRVJST1JfTk9USUNFID0ge1xuICB0aXRsZTogJ1RvZ2dsaW5nIG9mZiBhdXRvX2RlbGV0ZV9vYmplY3RzIGZvciBCdWNrZXQgZW1wdGllcyB0aGUgYnVja2V0JyxcbiAgaXNzdWVOdW1iZXI6IDE2NjAzLFxuICBvdmVydmlldzogJ0lmIGEgc3RhY2sgaXMgZGVwbG95ZWQgd2l0aCBhbiBTMyBidWNrZXQgd2l0aCBhdXRvX2RlbGV0ZV9vYmplY3RzPVRydWUsIGFuZCB0aGVuIHJlLWRlcGxveWVkIHdpdGggYXV0b19kZWxldGVfb2JqZWN0cz1GYWxzZSwgYWxsIHRoZSBvYmplY3RzIGluIHRoZSBidWNrZXQgd2lsbCBiZSBkZWxldGVkLicsXG4gIGNvbXBvbmVudHM6IFt7XG4gICAgbmFtZTogJ2NsaScsXG4gICAgdmVyc2lvbjogJzw9MS4xMjYuMCcsXG4gIH1dLFxuICBzY2hlbWFWZXJzaW9uOiAnMScsXG4gIHNldmVyaXR5OiAnZXJyb3InLFxufTtcblxuY29uc3QgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFID0ge1xuICB0aXRsZTogJ0Vycm9yIHdoZW4gYnVpbGRpbmcgRUtTIGNsdXN0ZXIgd2l0aCBtb25vY2RrIGltcG9ydCcsXG4gIGlzc3VlTnVtYmVyOiAxNzA2MSxcbiAgb3ZlcnZpZXc6ICdXaGVuIHVzaW5nIG1vbm9jZGsvYXdzLWVrcyB0byBidWlsZCBhIHN0YWNrIGNvbnRhaW5pbmcgYW4gRUtTIGNsdXN0ZXIsIGVycm9yIGlzIHRocm93biBhYm91dCBtaXNzaW5nIGxhbWJkYS1sYXllci1ub2RlLXByb3h5LWFnZW50L2xheWVyL3BhY2thZ2UuanNvbi4nLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdjbGknLFxuICAgIHZlcnNpb246ICc8MS4xMzAuMCA+PTEuMTI2LjAnLFxuICB9XSxcbiAgc2NoZW1hVmVyc2lvbjogJzEnLFxufTtcblxuY29uc3QgRlJBTUVXT1JLXzJfMV8wX0FGRkVDVEVEX05PVElDRSA9IHtcbiAgdGl0bGU6ICdSZWdyZXNzaW9uIG9uIG1vZHVsZSBmb29iYXInLFxuICBpc3N1ZU51bWJlcjogMTIzNCxcbiAgb3ZlcnZpZXc6ICdTb21lIGJ1ZyBkZXNjcmlwdGlvbicsXG4gIGNvbXBvbmVudHM6IFt7XG4gICAgbmFtZTogJ2ZyYW1ld29yaycsXG4gICAgdmVyc2lvbjogJzw9IDIuMS4wJyxcbiAgfV0sXG4gIHNjaGVtYVZlcnNpb246ICcxJyxcbn07XG5cbmNvbnN0IE5PVElDRV9GT1JfQVBJR0FURVdBWVYyID0ge1xuICB0aXRsZTogJ1JlZ3Jlc3Npb24gb24gbW9kdWxlIGZvb2JhcicsXG4gIGlzc3VlTnVtYmVyOiAxMjM0LFxuICBvdmVydmlldzogJ1NvbWUgYnVnIGRlc2NyaXB0aW9uJyxcbiAgY29tcG9uZW50czogW3tcbiAgICBuYW1lOiAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXl2Mi1hbHBoYS4nLFxuICAgIHZlcnNpb246ICc8PSAyLjEzLjAtYWxwaGEuMCcsXG4gIH1dLFxuICBzY2hlbWFWZXJzaW9uOiAnMScsXG59O1xuXG5jb25zdCBOT1RJQ0VfRk9SX0FQSUdBVEVXQVkgPSB7XG4gIHRpdGxlOiAnUmVncmVzc2lvbiBvbiBtb2R1bGUgZm9vYmFyJyxcbiAgaXNzdWVOdW1iZXI6IDEyMzQsXG4gIG92ZXJ2aWV3OiAnU29tZSBidWcgZGVzY3JpcHRpb24nLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScsXG4gICAgdmVyc2lvbjogJzw9IDIuMTMuMC1hbHBoYS4wJyxcbiAgfV0sXG4gIHNjaGVtYVZlcnNpb246ICcxJyxcbn07XG5cbmNvbnN0IE5PVElDRV9GT1JfQVBJR0FURVdBWVYyX0NGTl9TVEFHRSA9IHtcbiAgdGl0bGU6ICdSZWdyZXNzaW9uIG9uIG1vZHVsZSBmb29iYXInLFxuICBpc3N1ZU51bWJlcjogMTIzNCxcbiAgb3ZlcnZpZXc6ICdTb21lIGJ1ZyBkZXNjcmlwdGlvbicsXG4gIGNvbXBvbmVudHM6IFt7XG4gICAgbmFtZTogJ2F3cy1jZGstbGliLmF3c19hcGlnYXRld2F5djIuQ2ZuU3RhZ2UnLFxuICAgIHZlcnNpb246ICc8PSAyLjEzLjAtYWxwaGEuMCcsXG4gIH1dLFxuICBzY2hlbWFWZXJzaW9uOiAnMScsXG59O1xuXG5kZXNjcmliZShGaWx0ZXJlZE5vdGljZSwgKCkgPT4ge1xuICBkZXNjcmliZSgnZm9ybWF0JywgKCkgPT4ge1xuICAgIHRlc3QoJ3Jlc29sdmVzIGR5bmFtaWMgdmFsdWVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgZmlsdGVyZWROb3RpY2UgPSBuZXcgRmlsdGVyZWROb3RpY2UoQkFTSUNfRFlOQU1JQ19OT1RJQ0UpO1xuICAgICAgZmlsdGVyZWROb3RpY2UuYWRkRHluYW1pY1ZhbHVlKCdEWU5BTUlDMScsICdkeW5hbWljLXZhbHVlMScpO1xuICAgICAgZmlsdGVyZWROb3RpY2UuYWRkRHluYW1pY1ZhbHVlKCdEWU5BTUlDMicsICdkeW5hbWljLXZhbHVlMicpO1xuXG4gICAgICBleHBlY3QoZmlsdGVyZWROb3RpY2UuZm9ybWF0KCkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5cIjE2NjAzXHRUb2dnbGluZyBvZmYgYXV0b19kZWxldGVfb2JqZWN0cyBmb3IgQnVja2V0IGVtcHRpZXMgdGhlIGJ1Y2tldFxuXG5cdE92ZXJ2aWV3OiBkeW5hbWljLXZhbHVlMSB0aGlzIGlzIGEgbm90aWNlIHdpdGggZHluYW1pYyB2YWx1ZXNcblx0ICAgICAgICAgIGR5bmFtaWMtdmFsdWUyXG5cblx0QWZmZWN0ZWQgdmVyc2lvbnM6IGNsaTogPD0xLjEyNi4wXG5cblx0TW9yZSBpbmZvcm1hdGlvbiBhdDogaHR0cHM6Ly9naXRodWIuY29tL2F3cy9hd3MtY2RrL2lzc3Vlcy8xNjYwM1xuXCJcbmApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2luZ2xlIHZlcnNpb24gcmFuZ2UnLCAoKSA9PiB7XG4gICAgICBleHBlY3QobmV3IEZpbHRlcmVkTm90aWNlKEJBU0lDX05PVElDRSkuZm9ybWF0KCkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG5cIjE2NjAzXHRUb2dnbGluZyBvZmYgYXV0b19kZWxldGVfb2JqZWN0cyBmb3IgQnVja2V0IGVtcHRpZXMgdGhlIGJ1Y2tldFxuXG5cdE92ZXJ2aWV3OiBJZiBhIHN0YWNrIGlzIGRlcGxveWVkIHdpdGggYW4gUzMgYnVja2V0IHdpdGhcblx0ICAgICAgICAgIGF1dG9fZGVsZXRlX29iamVjdHM9VHJ1ZSwgYW5kIHRoZW4gcmUtZGVwbG95ZWQgd2l0aFxuXHQgICAgICAgICAgYXV0b19kZWxldGVfb2JqZWN0cz1GYWxzZSwgYWxsIHRoZSBvYmplY3RzIGluIHRoZSBidWNrZXRcblx0ICAgICAgICAgIHdpbGwgYmUgZGVsZXRlZC5cblxuXHRBZmZlY3RlZCB2ZXJzaW9uczogY2xpOiA8PTEuMTI2LjBcblxuXHRNb3JlIGluZm9ybWF0aW9uIGF0OiBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzLzE2NjAzXG5cIlxuYCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdtdWx0aXBsZSB2ZXJzaW9uIHJhbmdlcycsICgpID0+IHtcbiAgICAgIGV4cGVjdChuZXcgRmlsdGVyZWROb3RpY2UoTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFKS5mb3JtYXQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcblwiMTcwNjFcdEVycm9yIHdoZW4gYnVpbGRpbmcgRUtTIGNsdXN0ZXIgd2l0aCBtb25vY2RrIGltcG9ydFxuXG5cdE92ZXJ2aWV3OiBXaGVuIHVzaW5nIG1vbm9jZGsvYXdzLWVrcyB0byBidWlsZCBhIHN0YWNrIGNvbnRhaW5pbmcgYW5cblx0ICAgICAgICAgIEVLUyBjbHVzdGVyLCBlcnJvciBpcyB0aHJvd24gYWJvdXQgbWlzc2luZ1xuXHQgICAgICAgICAgbGFtYmRhLWxheWVyLW5vZGUtcHJveHktYWdlbnQvbGF5ZXIvcGFja2FnZS5qc29uLlxuXG5cdEFmZmVjdGVkIHZlcnNpb25zOiBjbGk6IDwxLjEzMC4wID49MS4xMjYuMFxuXG5cdE1vcmUgaW5mb3JtYXRpb24gYXQ6IGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMTcwNjFcblwiXG5gKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoTm90aWNlc0ZpbHRlciwgKCkgPT4ge1xuICBkZXNjcmliZSgnZmlsdGVyJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NsaScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdGljZXMgPSBbQkFTSUNfTk9USUNFLCBNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0VdO1xuXG4gICAgICAvLyBkb2Vzbid0IG1hdHRlciBmb3IgdGhpcyB0ZXN0IGJlY2F1c2Ugb3VyIGRhdGEgb25seSBoYXMgQ0xJIG5vdGljZXNcbiAgICAgIGNvbnN0IG91dERpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbG91ZC1hc3NlbWJseS10cmVlcycsICdidWlsdC13aXRoLTJfMTJfMCcpO1xuXG4gICAgICBleHBlY3QoTm90aWNlc0ZpbHRlci5maWx0ZXIoeyBkYXRhOiBub3RpY2VzLCBib290c3RyYXBwZWRFbnZpcm9ubWVudHM6IFtdLCBvdXREaXIsIGNsaVZlcnNpb246ICcxLjAuMCcgfSkubWFwKGYgPT4gZi5ub3RpY2UpKS50b0VxdWFsKFtCQVNJQ19OT1RJQ0VdKTtcbiAgICAgIGV4cGVjdChOb3RpY2VzRmlsdGVyLmZpbHRlcih7IGRhdGE6IG5vdGljZXMsIGJvb3RzdHJhcHBlZEVudmlyb25tZW50czogW10sIG91dERpciwgY2xpVmVyc2lvbjogJzEuMTI5LjAnIH0pLm1hcChmID0+IGYubm90aWNlKSkudG9FcXVhbChbTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFXSk7XG4gICAgICBleHBlY3QoTm90aWNlc0ZpbHRlci5maWx0ZXIoeyBkYXRhOiBub3RpY2VzLCBib290c3RyYXBwZWRFbnZpcm9ubWVudHM6IFtdLCBvdXREaXIsIGNsaVZlcnNpb246ICcxLjEyNi4wJyB9KS5tYXAoZiA9PiBmLm5vdGljZSkpLnRvRXF1YWwoW0JBU0lDX05PVElDRSwgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFXSk7XG4gICAgICBleHBlY3QoTm90aWNlc0ZpbHRlci5maWx0ZXIoeyBkYXRhOiBub3RpY2VzLCBib290c3RyYXBwZWRFbnZpcm9ubWVudHM6IFtdLCBvdXREaXIsIGNsaVZlcnNpb246ICcxLjEzMC4wJyB9KS5tYXAoZiA9PiBmLm5vdGljZSkpLnRvRXF1YWwoW10pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZnJhbWV3b3JrJywgKCkgPT4ge1xuICAgICAgY29uc3Qgbm90aWNlcyA9IFtGUkFNRVdPUktfMl8xXzBfQUZGRUNURURfTk9USUNFXTtcblxuICAgICAgLy8gZG9lc24ndCBtYXR0ZXIgZm9yIHRoaXMgdGVzdCBiZWNhdXNlIG91ciBkYXRhIG9ubHkgaGFzIGZyYW1ld29yayBub3RpY2VzXG4gICAgICBjb25zdCBjbGlWZXJzaW9uID0gJzEuMC4wJztcblxuICAgICAgZXhwZWN0KE5vdGljZXNGaWx0ZXIuZmlsdGVyKHsgZGF0YTogbm90aWNlcywgY2xpVmVyc2lvbiwgYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzOiBbXSwgb3V0RGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnY2xvdWQtYXNzZW1ibHktdHJlZXMnLCAnYnVpbHQtd2l0aC0yXzEyXzAnKSB9KS5tYXAoZiA9PiBmLm5vdGljZSkpLnRvRXF1YWwoW10pO1xuICAgICAgZXhwZWN0KE5vdGljZXNGaWx0ZXIuZmlsdGVyKHsgZGF0YTogbm90aWNlcywgY2xpVmVyc2lvbiwgYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzOiBbXSwgb3V0RGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnY2xvdWQtYXNzZW1ibHktdHJlZXMnLCAnYnVpbHQtd2l0aC0xXzE0NF8wJykgfSkubWFwKGYgPT4gZi5ub3RpY2UpKS50b0VxdWFsKFtGUkFNRVdPUktfMl8xXzBfQUZGRUNURURfTk9USUNFXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdtb2R1bGUnLCAoKSA9PiB7XG4gICAgICAvLyBkb2Vzbid0IG1hdHRlciBmb3IgdGhpcyB0ZXN0IGJlY2F1c2Ugb3VyIGRhdGEgb25seSBoYXMgZnJhbWV3b3JrIG5vdGljZXNcbiAgICAgIGNvbnN0IGNsaVZlcnNpb24gPSAnMS4wLjAnO1xuXG4gICAgICAvLyBtb2R1bGUtbGV2ZWwgbWF0Y2hcbiAgICAgIGV4cGVjdChOb3RpY2VzRmlsdGVyLmZpbHRlcih7IGRhdGE6IFtOT1RJQ0VfRk9SX0FQSUdBVEVXQVlWMl0sIGNsaVZlcnNpb24sIGJvb3RzdHJhcHBlZEVudmlyb25tZW50czogW10sIG91dERpcjogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2Nsb3VkLWFzc2VtYmx5LXRyZWVzJywgJ2V4cGVyaW1lbnRhbC1tb2R1bGUnKSB9KS5tYXAoZiA9PiBmLm5vdGljZSkpLnRvRXF1YWwoW05PVElDRV9GT1JfQVBJR0FURVdBWVYyXSk7XG5cbiAgICAgIC8vIG5vIGFwaWdhdGV3YXl2MiBpbiB0aGUgdHJlZVxuICAgICAgZXhwZWN0KE5vdGljZXNGaWx0ZXIuZmlsdGVyKHsgZGF0YTogW05PVElDRV9GT1JfQVBJR0FURVdBWVYyXSwgY2xpVmVyc2lvbiwgYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzOiBbXSwgb3V0RGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnY2xvdWQtYXNzZW1ibHktdHJlZXMnLCAnYnVpbHQtd2l0aC0yXzEyXzAnKSB9KS5tYXAoZiA9PiBmLm5vdGljZSkpLnRvRXF1YWwoW10pO1xuXG4gICAgICAvLyBtb2R1bGUgbmFtZSBtaXNtYXRjaDogYXBpZ2F0ZXdheSAhPSBhcGlnYXRld2F5djJcbiAgICAgIGV4cGVjdChOb3RpY2VzRmlsdGVyLmZpbHRlcih7IGRhdGE6IFtOT1RJQ0VfRk9SX0FQSUdBVEVXQVldLCBjbGlWZXJzaW9uLCBib290c3RyYXBwZWRFbnZpcm9ubWVudHM6IFtdLCBvdXREaXI6IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbG91ZC1hc3NlbWJseS10cmVlcycsICdleHBlcmltZW50YWwtbW9kdWxlJykgfSkubWFwKGYgPT4gZi5ub3RpY2UpKS50b0VxdWFsKFtdKTtcblxuICAgICAgLy8gY29uc3RydWN0LWxldmVsIG1hdGNoXG4gICAgICBleHBlY3QoTm90aWNlc0ZpbHRlci5maWx0ZXIoeyBkYXRhOiBbTk9USUNFX0ZPUl9BUElHQVRFV0FZVjJfQ0ZOX1NUQUdFXSwgY2xpVmVyc2lvbiwgYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzOiBbXSwgb3V0RGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnY2xvdWQtYXNzZW1ibHktdHJlZXMnLCAnZXhwZXJpbWVudGFsLW1vZHVsZScpIH0pLm1hcChmID0+IGYubm90aWNlKSkudG9FcXVhbChbTk9USUNFX0ZPUl9BUElHQVRFV0FZVjJfQ0ZOX1NUQUdFXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdib290c3RyYXAnLCAoKSA9PiB7XG4gICAgICAvLyBkb2Vzbid0IG1hdHRlciBmb3IgdGhpcyB0ZXN0IGJlY2F1c2Ugb3VyIGRhdGEgb25seSBoYXMgYm9vdHN0cmFwIG5vdGljZXNcbiAgICAgIGNvbnN0IG91dERpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbG91ZC1hc3NlbWJseS10cmVlcycsICdidWlsdC13aXRoLTJfMTJfMCcpO1xuICAgICAgY29uc3QgY2xpVmVyc2lvbiA9ICcxLjAuMCc7XG5cbiAgICAgIGNvbnN0IGJvb3RzdHJhcHBlZEVudmlyb25tZW50czogQm9vdHN0cmFwcGVkRW52aXJvbm1lbnRbXSA9IFtcbiAgICAgICAge1xuICAgICAgICAgIC8vIGFmZmVjdGVkXG4gICAgICAgICAgYm9vdHN0cmFwU3RhY2tWZXJzaW9uOiAyMixcbiAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgYWNjb3VudDogJ2FjY291bnQnLFxuICAgICAgICAgICAgcmVnaW9uOiAncmVnaW9uMScsXG4gICAgICAgICAgICBuYW1lOiAnZW52MScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIC8vIGFmZmVjdGVkXG4gICAgICAgICAgYm9vdHN0cmFwU3RhY2tWZXJzaW9uOiAyMSxcbiAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgYWNjb3VudDogJ2FjY291bnQnLFxuICAgICAgICAgICAgcmVnaW9uOiAncmVnaW9uMicsXG4gICAgICAgICAgICBuYW1lOiAnZW52MicsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIC8vIG5vdCBhZmZlY3RlZFxuICAgICAgICAgIGJvb3RzdHJhcFN0YWNrVmVyc2lvbjogMjgsXG4gICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgIGFjY291bnQ6ICdhY2NvdW50JyxcbiAgICAgICAgICAgIHJlZ2lvbjogJ3JlZ2lvbjMnLFxuICAgICAgICAgICAgbmFtZTogJ2VudjMnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdO1xuXG4gICAgICBleHBlY3QoTm90aWNlc0ZpbHRlci5maWx0ZXIoe1xuICAgICAgICBkYXRhOiBbQkFTSUNfQk9PVFNUUkFQX05PVElDRV0sXG4gICAgICAgIGNsaVZlcnNpb24sXG4gICAgICAgIG91dERpcixcbiAgICAgICAgYm9vdHN0cmFwcGVkRW52aXJvbm1lbnRzOiBib290c3RyYXBwZWRFbnZpcm9ubWVudHMsXG4gICAgICB9KS5tYXAoZiA9PiBmLm5vdGljZSkpLnRvRXF1YWwoW0JBU0lDX0JPT1RTVFJBUF9OT1RJQ0VdKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2lnbm9yZXMgaW52YWxpZCBib290c3RyYXAgdmVyc2lvbnMnLCAoKSA9PiB7XG4gICAgICAvLyBkb2Vzbid0IG1hdHRlciBmb3IgdGhpcyB0ZXN0IGJlY2F1c2Ugb3VyIGRhdGEgb25seSBoYXMgYm9vdHN0cmFwIG5vdGljZXNcbiAgICAgIGNvbnN0IG91dERpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbG91ZC1hc3NlbWJseS10cmVlcycsICdidWlsdC13aXRoLTJfMTJfMCcpO1xuICAgICAgY29uc3QgY2xpVmVyc2lvbiA9ICcxLjAuMCc7XG5cbiAgICAgIGV4cGVjdChOb3RpY2VzRmlsdGVyLmZpbHRlcih7XG4gICAgICAgIGRhdGE6IFtCQVNJQ19CT09UU1RSQVBfTk9USUNFXSxcbiAgICAgICAgY2xpVmVyc2lvbixcbiAgICAgICAgb3V0RGlyLFxuICAgICAgICBib290c3RyYXBwZWRFbnZpcm9ubWVudHM6IFt7IGJvb3RzdHJhcFN0YWNrVmVyc2lvbjogTmFOLCBlbnZpcm9ubWVudDogeyBhY2NvdW50OiAnYWNjb3VudCcsIHJlZ2lvbjogJ3JlZ2lvbicsIG5hbWU6ICdlbnYnIH0gfV0sXG4gICAgICB9KS5tYXAoZiA9PiBmLm5vdGljZSkpLnRvRXF1YWwoW10pO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZShXZWJzaXRlTm90aWNlRGF0YVNvdXJjZSwgKCkgPT4ge1xuICBjb25zdCBkYXRhU291cmNlID0gbmV3IFdlYnNpdGVOb3RpY2VEYXRhU291cmNlKCk7XG5cbiAgdGVzdCgncmV0dXJucyBkYXRhIHdoZW4gZG93bmxvYWQgc3VjY2VlZHMnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbW9ja0NhbGwoMjAwLCB7XG4gICAgICBub3RpY2VzOiBbQkFTSUNfTk9USUNFLCBNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0VdLFxuICAgIH0pO1xuXG4gICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChbQkFTSUNfTk9USUNFLCBNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0VdKTtcbiAgfSk7XG5cbiAgdGVzdCgncmV0dXJucyBhcHByb3ByaWF0ZSBlcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmV0dXJucyBhbiB1bmV4cGVjdGVkIHN0YXR1cyBjb2RlJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG1vY2tDYWxsKDUwMCwge1xuICAgICAgbm90aWNlczogW0JBU0lDX05PVElDRSwgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFXSxcbiAgICB9KTtcblxuICAgIGF3YWl0IGV4cGVjdChyZXN1bHQpLnJlamVjdHMudG9UaHJvdygvNTAwLyk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHVybnMgYXBwcm9wcmlhdGUgZXJyb3Igd2hlbiB0aGUgc2VydmVyIHJldHVybnMgYW4gdW5leHBlY3RlZCBzdHJ1Y3R1cmUnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gbW9ja0NhbGwoMjAwLCB7XG4gICAgICBmb286IFtCQVNJQ19OT1RJQ0UsIE1VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRV0sXG4gICAgfSk7XG5cbiAgICBhd2FpdCBleHBlY3QocmVzdWx0KS5yZWplY3RzLnRvVGhyb3coL2tleSBpcyBtaXNzaW5nLyk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHVybnMgYXBwcm9wcmlhdGUgZXJyb3Igd2hlbiB0aGUgc2VydmVyIHJldHVybnMgaW52YWxpZCBqc29uJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IG1vY2tDYWxsKDIwMCwgJy0wOWFpc2tqa2o4MzgnKTtcblxuICAgIGF3YWl0IGV4cGVjdChyZXN1bHQpLnJlamVjdHMudG9UaHJvdygvRmFpbGVkIHRvIHBhcnNlLyk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHVybnMgYXBwcm9wcmlhdGUgZXJyb3Igd2hlbiBIVFRQUyBjYWxsIHRocm93cycsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtb2NrR2V0ID0gamVzdC5zcHlPbihodHRwcywgJ2dldCcpXG4gICAgICAubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHsgdGhyb3cgbmV3IEVycm9yKCdObyBjb25uZWN0aW9uJyk7IH0pO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gZGF0YVNvdXJjZS5mZXRjaCgpO1xuXG4gICAgYXdhaXQgZXhwZWN0KHJlc3VsdCkucmVqZWN0cy50b1Rocm93KC9ObyBjb25uZWN0aW9uLyk7XG5cbiAgICBtb2NrR2V0Lm1vY2tSZXN0b3JlKCk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHVybnMgYXBwcm9wcmlhdGUgZXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBoYXMgYW4gZXJyb3InLCBhc3luYyAoKSA9PiB7XG4gICAgbm9jaygnaHR0cHM6Ly9jbGkuY2RrLmRldi10b29scy5hd3MuZGV2JylcbiAgICAgIC5nZXQoJy9ub3RpY2VzLmpzb24nKVxuICAgICAgLnJlcGx5V2l0aEVycm9yKCdETlMgcmVzb2x1dGlvbiBmYWlsZWQnKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgIGF3YWl0IGV4cGVjdChyZXN1bHQpLnJlamVjdHMudG9UaHJvdygvRE5TIHJlc29sdXRpb24gZmFpbGVkLyk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHVybnMgYXBwcm9wcmlhdGUgZXJyb3Igd2hlbiB0aGUgY29ubmVjdGlvbiBzdGF5cyBpZGxlIGZvciB0b28gbG9uZycsIGFzeW5jICgpID0+IHtcbiAgICBub2NrKCdodHRwczovL2NsaS5jZGsuZGV2LXRvb2xzLmF3cy5kZXYnKVxuICAgICAgLmdldCgnL25vdGljZXMuanNvbicpXG4gICAgICAuZGVsYXlDb25uZWN0aW9uKDM1MDApXG4gICAgICAucmVwbHkoMjAwLCB7XG4gICAgICAgIG5vdGljZXM6IFtCQVNJQ19OT1RJQ0VdLFxuICAgICAgfSk7XG5cbiAgICBjb25zdCByZXN1bHQgPSBkYXRhU291cmNlLmZldGNoKCk7XG5cbiAgICBhd2FpdCBleHBlY3QocmVzdWx0KS5yZWplY3RzLnRvVGhyb3coL3RpbWVkIG91dC8pO1xuICB9KTtcblxuICB0ZXN0KCdyZXR1cm5zIGVtcHR5IGFycmF5IHdoZW4gdGhlIHJlcXVlc3QgdGFrZXMgdG9vIGxvbmcgdG8gZmluaXNoJywgYXN5bmMgKCkgPT4ge1xuICAgIG5vY2soJ2h0dHBzOi8vY2xpLmNkay5kZXYtdG9vbHMuYXdzLmRldicpXG4gICAgICAuZ2V0KCcvbm90aWNlcy5qc29uJylcbiAgICAgIC5kZWxheUJvZHkoMzUwMClcbiAgICAgIC5yZXBseSgyMDAsIHtcbiAgICAgICAgbm90aWNlczogW0JBU0lDX05PVElDRV0sXG4gICAgICB9KTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgIGF3YWl0IGV4cGVjdChyZXN1bHQpLnJlamVjdHMudG9UaHJvdygvdGltZWQgb3V0Lyk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIG1vY2tDYWxsKHN0YXR1c0NvZGU6IG51bWJlciwgYm9keTogYW55KTogUHJvbWlzZTxOb3RpY2VbXT4ge1xuICAgIG5vY2soJ2h0dHBzOi8vY2xpLmNkay5kZXYtdG9vbHMuYXdzLmRldicpXG4gICAgICAuZ2V0KCcvbm90aWNlcy5qc29uJylcbiAgICAgIC5yZXBseShzdGF0dXNDb2RlLCBib2R5KTtcblxuICAgIHJldHVybiBkYXRhU291cmNlLmZldGNoKCk7XG4gIH1cbn0pO1xuXG5kZXNjcmliZShDYWNoZWREYXRhU291cmNlLCAoKSA9PiB7XG4gIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCAnY2FjaGUuanNvbicpO1xuICBjb25zdCBjYWNoZWREYXRhID0gW0JBU0lDX05PVElDRV07XG4gIGNvbnN0IGZyZXNoRGF0YSA9IFtNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0VdO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZU5hbWUsICcnKTtcbiAgfSk7XG5cbiAgdGVzdCgncmV0cmlldmVzIGRhdGEgZnJvbSB0aGUgZGVsZWdhdGUgY2FjaGUgd2hlbiB0aGUgZmlsZSBpcyBlbXB0eScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBkYXRhU291cmNlID0gZGF0YVNvdXJjZVdpdGhEZWxlZ2F0ZVJldHVybmluZyhmcmVzaERhdGEpO1xuXG4gICAgY29uc3Qgbm90aWNlcyA9IGF3YWl0IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgIGV4cGVjdChub3RpY2VzKS50b0VxdWFsKGZyZXNoRGF0YSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHJpZXZlcyBkYXRhIGZyb20gdGhlIGZpbGUgd2hlbiB0aGUgZGF0YSBpcyBzdGlsbCB2YWxpZCcsIGFzeW5jICgpID0+IHtcbiAgICBmcy53cml0ZUpzb25TeW5jKGZpbGVOYW1lLCB7XG4gICAgICBub3RpY2VzOiBjYWNoZWREYXRhLFxuICAgICAgZXhwaXJhdGlvbjogRGF0ZS5ub3coKSArIDEwMDAwLFxuICAgIH0pO1xuICAgIGNvbnN0IGRhdGFTb3VyY2UgPSBkYXRhU291cmNlV2l0aERlbGVnYXRlUmV0dXJuaW5nKGZyZXNoRGF0YSk7XG5cbiAgICBjb25zdCBub3RpY2VzID0gYXdhaXQgZGF0YVNvdXJjZS5mZXRjaCgpO1xuXG4gICAgZXhwZWN0KG5vdGljZXMpLnRvRXF1YWwoY2FjaGVkRGF0YSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHJpZXZlcyBkYXRhIGZyb20gdGhlIGRlbGVnYXRlIHdoZW4gdGhlIGRhdGEgaXMgZXhwaXJlZCcsIGFzeW5jICgpID0+IHtcbiAgICBmcy53cml0ZUpzb25TeW5jKGZpbGVOYW1lLCB7XG4gICAgICBub3RpY2VzOiBjYWNoZWREYXRhLFxuICAgICAgZXhwaXJhdGlvbjogMCxcbiAgICB9KTtcbiAgICBjb25zdCBkYXRhU291cmNlID0gZGF0YVNvdXJjZVdpdGhEZWxlZ2F0ZVJldHVybmluZyhmcmVzaERhdGEpO1xuXG4gICAgY29uc3Qgbm90aWNlcyA9IGF3YWl0IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgIGV4cGVjdChub3RpY2VzKS50b0VxdWFsKGZyZXNoRGF0YSk7XG4gIH0pO1xuXG4gIHRlc3QoJ3JldHJpZXZlcyBkYXRhIGZyb20gdGhlIGRlbGVnYXRlIHdoZW4gdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgdG1wRGlyID0gZnMubWtkdGVtcFN5bmMocGF0aC5qb2luKG9zLnRtcGRpcigpLCAnY2RrLXRlc3QnKSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRlYnVnU3B5ID0gamVzdC5zcHlPbihsb2dnaW5nLCAnZGVidWcnKTtcblxuICAgICAgY29uc3QgZGF0YVNvdXJjZSA9IGRhdGFTb3VyY2VXaXRoRGVsZWdhdGVSZXR1cm5pbmcoZnJlc2hEYXRhLCBgJHt0bXBEaXJ9L2RvZXMtbm90LWV4aXN0Lmpzb25gKTtcblxuICAgICAgY29uc3Qgbm90aWNlcyA9IGF3YWl0IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgICAgZXhwZWN0KG5vdGljZXMpLnRvRXF1YWwoZnJlc2hEYXRhKTtcbiAgICAgIGV4cGVjdChkZWJ1Z1NweSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcblxuICAgICAgZGVidWdTcHkubW9ja1Jlc3RvcmUoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgZnMucm1TeW5jKHRtcERpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgdGVzdCgncmV0cmlldmVkIGRhdGEgZnJvbSB0aGUgZGVsZWdhdGUgd2hlbiBpdCBpcyBjb25maWd1cmVkIHRvIGlnbm9yZSB0aGUgY2FjaGUnLCBhc3luYyAoKSA9PiB7XG4gICAgZnMud3JpdGVKc29uU3luYyhmaWxlTmFtZSwge1xuICAgICAgbm90aWNlczogY2FjaGVkRGF0YSxcbiAgICAgIGV4cGlyYXRpb246IERhdGUubm93KCkgKyAxMDAwMCxcbiAgICB9KTtcbiAgICBjb25zdCBkYXRhU291cmNlID0gZGF0YVNvdXJjZVdpdGhEZWxlZ2F0ZVJldHVybmluZyhmcmVzaERhdGEsIGZpbGVOYW1lLCB0cnVlKTtcblxuICAgIGNvbnN0IG5vdGljZXMgPSBhd2FpdCBkYXRhU291cmNlLmZldGNoKCk7XG5cbiAgICBleHBlY3Qobm90aWNlcykudG9FcXVhbChmcmVzaERhdGEpO1xuICB9KTtcblxuICB0ZXN0KCdlcnJvciBpbiBkZWxlZ2F0ZSBnZXRzIHR1cm5lZCBpbnRvIGVtcHR5IHJlc3VsdCBieSBjYWNoZWQgc291cmNlJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgY29uc3QgZGVsZWdhdGUgPSB7XG4gICAgICBmZXRjaDogamVzdC5mbigpLm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcignZmV0Y2hpbmcgZmFpbGVkJykpLFxuICAgIH07XG4gICAgY29uc3QgZGF0YVNvdXJjZSA9IG5ldyBDYWNoZWREYXRhU291cmNlKGZpbGVOYW1lLCBkZWxlZ2F0ZSwgdHJ1ZSk7XG5cbiAgICAvLyBXSEVOXG4gICAgY29uc3Qgbm90aWNlcyA9IGF3YWl0IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgIC8vIFRIRU5cbiAgICBleHBlY3Qobm90aWNlcykudG9FcXVhbChbXSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGRhdGFTb3VyY2VXaXRoRGVsZWdhdGVSZXR1cm5pbmcobm90aWNlczogTm90aWNlW10sIGZpbGU6IHN0cmluZyA9IGZpbGVOYW1lLCBpZ25vcmVDYWNoZTogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgY29uc3QgZGVsZWdhdGUgPSB7XG4gICAgICBmZXRjaDogamVzdC5mbigpLFxuICAgIH07XG5cbiAgICBkZWxlZ2F0ZS5mZXRjaC5tb2NrUmVzb2x2ZWRWYWx1ZShub3RpY2VzKTtcbiAgICByZXR1cm4gbmV3IENhY2hlZERhdGFTb3VyY2UoZmlsZSwgZGVsZWdhdGUsIGlnbm9yZUNhY2hlKTtcbiAgfVxufSk7XG5cbmRlc2NyaWJlKE5vdGljZXMsICgpID0+IHtcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgLy8gZGlzYWJsZSBjYWNoaW5nXG4gICAgamVzdC5zcHlPbihDYWNoZWREYXRhU291cmNlLnByb3RvdHlwZSBhcyBhbnksICdzYXZlJykubW9ja0ltcGxlbWVudGF0aW9uKChfOiBhbnkpID0+IFByb21pc2UucmVzb2x2ZSgpKTtcbiAgICBqZXN0LnNweU9uKENhY2hlZERhdGFTb3VyY2UucHJvdG90eXBlIGFzIGFueSwgJ2xvYWQnKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gUHJvbWlzZS5yZXNvbHZlKHsgZXhwaXJhdGlvbjogMCwgbm90aWNlczogW10gfSkpO1xuICB9KTtcblxuICBhZnRlckVhY2goKCkgPT4ge1xuICAgIGplc3QucmVzdG9yZUFsbE1vY2tzKCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdhZGRCb290c3RyYXBWZXJzaW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NhbiBhZGQgbXVsdGlwbGUgdmFsdWVzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgbm90aWNlcyA9IE5vdGljZXMuY3JlYXRlKHsgY29udGV4dDogbmV3IENvbnRleHQoKSB9KTtcbiAgICAgIG5vdGljZXMuYWRkQm9vdHN0cmFwcGVkRW52aXJvbm1lbnQoeyBib290c3RyYXBTdGFja1ZlcnNpb246IDEwLCBlbnZpcm9ubWVudDogeyBhY2NvdW50OiAnYWNjb3VudCcsIHJlZ2lvbjogJ3JlZ2lvbicsIG5hbWU6ICdlbnYnIH0gfSk7XG4gICAgICBub3RpY2VzLmFkZEJvb3RzdHJhcHBlZEVudmlyb25tZW50KHsgYm9vdHN0cmFwU3RhY2tWZXJzaW9uOiAxMSwgZW52aXJvbm1lbnQ6IHsgYWNjb3VudDogJ2FjY291bnQnLCByZWdpb246ICdyZWdpb24nLCBuYW1lOiAnZW52JyB9IH0pO1xuXG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goe1xuICAgICAgICBkYXRhU291cmNlOiB7IGZldGNoOiBhc3luYyAoKSA9PiBbQk9PVFNUUkFQX05PVElDRV9WMTAsIEJPT1RTVFJBUF9OT1RJQ0VfVjExXSB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHByaW50ID0gamVzdC5zcHlPbihsb2dnaW5nLCAncHJpbnQnKTtcblxuICAgICAgbm90aWNlcy5kaXNwbGF5KCk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKG5ldyBGaWx0ZXJlZE5vdGljZShCT09UU1RSQVBfTk9USUNFX1YxMCkuZm9ybWF0KCkpO1xuICAgICAgZXhwZWN0KHByaW50KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChuZXcgRmlsdGVyZWROb3RpY2UoQk9PVFNUUkFQX05PVElDRV9WMTEpLmZvcm1hdCgpKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2RlZHVwbGljYXRlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSk7XG4gICAgICBub3RpY2VzLmFkZEJvb3RzdHJhcHBlZEVudmlyb25tZW50KHsgYm9vdHN0cmFwU3RhY2tWZXJzaW9uOiAxMCwgZW52aXJvbm1lbnQ6IHsgYWNjb3VudDogJ2FjY291bnQnLCByZWdpb246ICdyZWdpb24nLCBuYW1lOiAnZW52JyB9IH0pO1xuICAgICAgbm90aWNlcy5hZGRCb290c3RyYXBwZWRFbnZpcm9ubWVudCh7IGJvb3RzdHJhcFN0YWNrVmVyc2lvbjogMTAsIGVudmlyb25tZW50OiB7IGFjY291bnQ6ICdhY2NvdW50JywgcmVnaW9uOiAncmVnaW9uJywgbmFtZTogJ2VudicgfSB9KTtcblxuICAgICAgLy8gbW9jayBjbGkgdmVyc2lvbiBudW1iZXJcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMC4wJyk7XG5cbiAgICAgIG5vdGljZXMuZGlzcGxheSgpO1xuXG4gICAgICBjb25zdCBmaWx0ZXIgPSBqZXN0LnNweU9uKE5vdGljZXNGaWx0ZXIsICdmaWx0ZXInKTtcbiAgICAgIG5vdGljZXMuZGlzcGxheSgpO1xuXG4gICAgICBleHBlY3QoZmlsdGVyKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XG4gICAgICBleHBlY3QoZmlsdGVyKS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XG4gICAgICAgIGJvb3RzdHJhcHBlZEVudmlyb25tZW50czogW3tcbiAgICAgICAgICBib290c3RyYXBTdGFja1ZlcnNpb246IDEwLFxuICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICBhY2NvdW50OiAnYWNjb3VudCcsXG4gICAgICAgICAgICByZWdpb246ICdyZWdpb24nLFxuICAgICAgICAgICAgbmFtZTogJ2VudicsXG4gICAgICAgICAgfSxcbiAgICAgICAgfV0sXG4gICAgICAgIGNsaVZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgIGRhdGE6IFtdLFxuICAgICAgICBvdXREaXI6ICdjZGsub3V0JyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgncmVmcmVzaCcsICgpID0+IHtcbiAgICB0ZXN0KCdkZWR1cGxpY2F0ZXMgbm90aWNlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIHdpdGhpbiB0aGUgYWZmZWN0ZWQgdmVyc2lvbiByYW5nZSBvZiB0aGUgbm90aWNlXG4gICAgICBqZXN0LnNweU9uKHZlcnNpb24sICd2ZXJzaW9uTnVtYmVyJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+ICcxLjAuMCcpO1xuXG4gICAgICBjb25zdCBub3RpY2VzID0gTm90aWNlcy5jcmVhdGUoeyBjb250ZXh0OiBuZXcgQ29udGV4dCgpIH0pO1xuICAgICAgYXdhaXQgbm90aWNlcy5yZWZyZXNoKHtcbiAgICAgICAgZGF0YVNvdXJjZTogeyBmZXRjaDogYXN5bmMgKCkgPT4gW0JBU0lDX05PVElDRSwgQkFTSUNfTk9USUNFXSB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHByaW50ID0gamVzdC5zcHlPbihsb2dnaW5nLCAncHJpbnQnKTtcblxuICAgICAgbm90aWNlcy5kaXNwbGF5KCk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKG5ldyBGaWx0ZXJlZE5vdGljZShCQVNJQ19OT1RJQ0UpLmZvcm1hdCgpKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NsZWFycyBub3RpY2VzIGlmIGVtcHR5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gd2l0aGluIHRoZSBhZmZlY3RlZCB2ZXJzaW9uIHJhbmdlIG9mIHRoZSBub3RpY2VcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMC4wJyk7XG5cbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSk7XG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goe1xuICAgICAgICBkYXRhU291cmNlOiB7IGZldGNoOiBhc3luYyAoKSA9PiBbXSB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHByaW50ID0gamVzdC5zcHlPbihsb2dnaW5nLCAncHJpbnQnKTtcblxuICAgICAgbm90aWNlcy5kaXNwbGF5KHsgc2hvd1RvdGFsOiB0cnVlIH0pO1xuICAgICAgZXhwZWN0KHByaW50KS50b0hhdmVCZWVuTnRoQ2FsbGVkV2l0aCgxLCAnJyk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDIsICdUaGVyZSBhcmUgMCB1bmFja25vd2xlZGdlZCBub3RpY2UocykuJyk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2RvZXNudCB0aHJvdycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSk7XG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goe1xuICAgICAgICBkYXRhU291cmNlOiB7XG4gICAgICAgICAgZmV0Y2g6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2hvdWxkIG5vdCBmYWlsIHJlZnJlc2gnKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdkb2VzIG5vdGhpbmcgd2hlbiB3ZSBzaG91bGRudCBkaXNwbGF5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgbGV0IHJlZnJlc2hDYWxsZWQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCksIHNob3VsZERpc3BsYXk6IGZhbHNlIH0pO1xuICAgICAgYXdhaXQgbm90aWNlcy5yZWZyZXNoKHtcbiAgICAgICAgZGF0YVNvdXJjZToge1xuICAgICAgICAgIGZldGNoOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICByZWZyZXNoQ2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHJlZnJlc2hDYWxsZWQpLnRvQmVGYWxzeSgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZmlsdGVycyBvdXQgYWNrbm93bGVkZ2VkIG5vdGljZXMgYnkgZGVmYXVsdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIHdpdGhpbiB0aGUgYWZmZWN0ZWQgdmVyc2lvbiByYW5nZSBvZiBib3RoIG5vdGljZXNcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMTI2LjAnKTtcblxuICAgICAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KHsgYmFnOiBuZXcgU2V0dGluZ3MoeyAnYWNrbm93bGVkZ2VkLWlzc3VlLW51bWJlcnMnOiBbTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFLmlzc3VlTnVtYmVyXSB9KSB9KTtcblxuICAgICAgY29uc3Qgbm90aWNlcyA9IE5vdGljZXMuY3JlYXRlKHsgY29udGV4dCB9KTtcbiAgICAgIGF3YWl0IG5vdGljZXMucmVmcmVzaCh7XG4gICAgICAgIGRhdGFTb3VyY2U6IHsgZmV0Y2g6IGFzeW5jICgpID0+IFtCQVNJQ19OT1RJQ0UsIE1VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRV0gfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwcmludCA9IGplc3Quc3B5T24obG9nZ2luZywgJ3ByaW50Jyk7XG5cbiAgICAgIG5vdGljZXMuZGlzcGxheSgpO1xuICAgICAgZXhwZWN0KHByaW50KS50b0hhdmVCZWVuTnRoQ2FsbGVkV2l0aCg0LCBuZXcgRmlsdGVyZWROb3RpY2UoQkFTSUNfTk9USUNFKS5mb3JtYXQoKSk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDYsICdJZiB5b3UgZG9u4oCZdCB3YW50IHRvIHNlZSBhIG5vdGljZSBhbnltb3JlLCB1c2UgXFxcImNkayBhY2tub3dsZWRnZSA8aWQ+XFxcIi4gRm9yIGV4YW1wbGUsIFxcXCJjZGsgYWNrbm93bGVkZ2UgMTY2MDNcXFwiLicpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncHJlc2VydmVzIGFja25vd2xlZGdlZCBub3RpY2VzIGlmIHJlcXVlc3RlZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIHdpdGhpbiB0aGUgYWZmZWN0ZWQgdmVyc2lvbiByYW5nZSBvZiBib3RoIG5vdGljZXNcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMTI2LjAnKTtcblxuICAgICAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KHsgYmFnOiBuZXcgU2V0dGluZ3MoeyAnYWNrbm93bGVkZ2VkLWlzc3VlLW51bWJlcnMnOiBbTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFLmlzc3VlTnVtYmVyXSB9KSB9KTtcblxuICAgICAgY29uc3Qgbm90aWNlcyA9IE5vdGljZXMuY3JlYXRlKHsgY29udGV4dCwgaW5jbHVkZUFja25vd2xlZGdlZDogdHJ1ZSB9KTtcbiAgICAgIGF3YWl0IG5vdGljZXMucmVmcmVzaCh7XG4gICAgICAgIGRhdGFTb3VyY2U6IHsgZmV0Y2g6IGFzeW5jICgpID0+IFtCQVNJQ19OT1RJQ0UsIE1VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRV0gfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwcmludCA9IGplc3Quc3B5T24obG9nZ2luZywgJ3ByaW50Jyk7XG5cbiAgICAgIG5vdGljZXMuZGlzcGxheSgpO1xuICAgICAgZXhwZWN0KHByaW50KS50b0hhdmVCZWVuQ2FsbGVkV2l0aChuZXcgRmlsdGVyZWROb3RpY2UoQkFTSUNfTk9USUNFKS5mb3JtYXQoKSk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKG5ldyBGaWx0ZXJlZE5vdGljZShNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0UpLmZvcm1hdCgpKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2Rpc3BsYXknLCAoKSA9PiB7XG4gICAgdGVzdCgnbm90aWNlcyBlbnZlbG9wJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gd2l0aGluIHRoZSBhZmZlY3RlZCB2ZXJzaW9uIHJhbmdlIG9mIHRoZSBub3RpY2VcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMC4wJyk7XG5cbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSk7XG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goe1xuICAgICAgICBkYXRhU291cmNlOiB7IGZldGNoOiBhc3luYyAoKSA9PiBbQkFTSUNfTk9USUNFLCBCQVNJQ19OT1RJQ0VdIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJpbnQgPSBqZXN0LnNweU9uKGxvZ2dpbmcsICdwcmludCcpO1xuXG4gICAgICBub3RpY2VzLmRpc3BsYXkoKTtcbiAgICAgIGV4cGVjdChwcmludCkudG9IYXZlQmVlbk50aENhbGxlZFdpdGgoMiwgJ05PVElDRVMgICAgICAgICAoV2hhdFxcJ3MgdGhpcz8gaHR0cHM6Ly9naXRodWIuY29tL2F3cy9hd3MtY2RrL3dpa2kvQ0xJLU5vdGljZXMpJyk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDYsICdJZiB5b3UgZG9u4oCZdCB3YW50IHRvIHNlZSBhIG5vdGljZSBhbnltb3JlLCB1c2UgXFxcImNkayBhY2tub3dsZWRnZSA8aWQ+XFxcIi4gRm9yIGV4YW1wbGUsIFxcXCJjZGsgYWNrbm93bGVkZ2UgMTY2MDNcXFwiLicpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZGVkdXBsaWNhdGVzIG5vdGljZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyB3aXRoaW4gdGhlIGFmZmVjdGVkIHZlcnNpb24gcmFuZ2Ugb2YgdGhlIG5vdGljZVxuICAgICAgamVzdC5zcHlPbih2ZXJzaW9uLCAndmVyc2lvbk51bWJlcicpLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiAnMS4wLjAnKTtcblxuICAgICAgY29uc3Qgbm90aWNlcyA9IE5vdGljZXMuY3JlYXRlKHsgY29udGV4dDogbmV3IENvbnRleHQoKSB9KTtcbiAgICAgIGF3YWl0IG5vdGljZXMucmVmcmVzaCh7XG4gICAgICAgIGRhdGFTb3VyY2U6IHsgZmV0Y2g6IGFzeW5jICgpID0+IFtCQVNJQ19OT1RJQ0UsIEJBU0lDX05PVElDRV0gfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwcmludCA9IGplc3Quc3B5T24obG9nZ2luZywgJ3ByaW50Jyk7XG5cbiAgICAgIG5vdGljZXMuZGlzcGxheSgpO1xuICAgICAgZXhwZWN0KHByaW50KS50b0hhdmVCZWVuTnRoQ2FsbGVkV2l0aCg0LCBuZXcgRmlsdGVyZWROb3RpY2UoQkFTSUNfTk9USUNFKS5mb3JtYXQoKSk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDYsICdJZiB5b3UgZG9u4oCZdCB3YW50IHRvIHNlZSBhIG5vdGljZSBhbnltb3JlLCB1c2UgXFxcImNkayBhY2tub3dsZWRnZSA8aWQ+XFxcIi4gRm9yIGV4YW1wbGUsIFxcXCJjZGsgYWNrbm93bGVkZ2UgMTY2MDNcXFwiLicpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZG9lcyBub3RoaW5nIHdoZW4gd2Ugc2hvdWxkbnQgZGlzcGxheScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCksIHNob3VsZERpc3BsYXk6IGZhbHNlIH0pO1xuICAgICAgYXdhaXQgbm90aWNlcy5yZWZyZXNoKHsgZGF0YVNvdXJjZTogeyBmZXRjaDogYXN5bmMgKCkgPT4gW0JBU0lDX05PVElDRV0gfSB9KTtcblxuICAgICAgY29uc3QgcHJpbnQgPSBqZXN0LnNweU9uKGxvZ2dpbmcsICdwcmludCcpO1xuXG4gICAgICBub3RpY2VzLmRpc3BsYXkoKTtcbiAgICAgIGV4cGVjdChwcmludCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnbm90aGluZyB3aGVuIHRoZXJlIGFyZSBubyBub3RpY2VzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcHJpbnQgPSBqZXN0LnNweU9uKGxvZ2dpbmcsICdwcmludCcpO1xuXG4gICAgICBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSkuZGlzcGxheSgpO1xuICAgICAgZXhwZWN0KHByaW50KS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd0b3RhbCBjb3VudCB3aGVuIHNob3cgdG90YWwgaXMgdHJ1ZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHByaW50ID0gamVzdC5zcHlPbihsb2dnaW5nLCAncHJpbnQnKTtcblxuICAgICAgTm90aWNlcy5jcmVhdGUoeyBjb250ZXh0OiBuZXcgQ29udGV4dCgpIH0pLmRpc3BsYXkoeyBzaG93VG90YWw6IHRydWUgfSk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDIsICdUaGVyZSBhcmUgMCB1bmFja25vd2xlZGdlZCBub3RpY2UocykuJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd3YXJuaW5nJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gd2l0aGluIHRoZSBhZmZlY3RlZCB2ZXJzaW9uIHJhbmdlIG9mIHRoZSBub3RpY2VcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMC4wJyk7XG5cbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSk7XG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goe1xuICAgICAgICBkYXRhU291cmNlOiB7IGZldGNoOiBhc3luYyAoKSA9PiBbQkFTSUNfV0FSTklOR19OT1RJQ0VdIH0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgd2FybmluZyA9IGplc3Quc3B5T24obG9nZ2luZywgJ3dhcm5pbmcnKTtcblxuICAgICAgbm90aWNlcy5kaXNwbGF5KCk7XG4gICAgICBleHBlY3Qod2FybmluZykudG9IYXZlQmVlbk50aENhbGxlZFdpdGgoMSwgbmV3IEZpbHRlcmVkTm90aWNlKEJBU0lDX05PVElDRSkuZm9ybWF0KCkpO1xuICAgICAgZXhwZWN0KHdhcm5pbmcpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2Vycm9yJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gd2l0aGluIHRoZSBhZmZlY3RlZCB2ZXJzaW9uIHJhbmdlIG9mIHRoZSBub3RpY2VcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMC4wJyk7XG5cbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSk7XG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goe1xuICAgICAgICBkYXRhU291cmNlOiB7IGZldGNoOiBhc3luYyAoKSA9PiBbQkFTSUNfRVJST1JfTk9USUNFXSB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGVycm9yID0gamVzdC5zcHlPbihsb2dnaW5nLCAnZXJyb3InKTtcblxuICAgICAgbm90aWNlcy5kaXNwbGF5KCk7XG4gICAgICBleHBlY3QoZXJyb3IpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDEsIG5ldyBGaWx0ZXJlZE5vdGljZShCQVNJQ19OT1RJQ0UpLmZvcm1hdCgpKTtcbiAgICAgIGV4cGVjdChlcnJvcikudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnb25seSByZWxldmFudCBub3RpY2VzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gd2l0aGluIHRoZSBhZmZlY3RlZCB2ZXJzaW9uIHJhbmdlIG9mIHRoZSBub3RpY2VcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMC4wJyk7XG5cbiAgICAgIGNvbnN0IG5vdGljZXMgPSBOb3RpY2VzLmNyZWF0ZSh7IGNvbnRleHQ6IG5ldyBDb250ZXh0KCkgfSk7XG4gICAgICBhd2FpdCBub3RpY2VzLnJlZnJlc2goe1xuICAgICAgICBkYXRhU291cmNlOiB7IGZldGNoOiBhc3luYyAoKSA9PiBbQkFTSUNfTk9USUNFXSB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHByaW50ID0gamVzdC5zcHlPbihsb2dnaW5nLCAncHJpbnQnKTtcblxuICAgICAgbm90aWNlcy5kaXNwbGF5KCk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDQsIG5ldyBGaWx0ZXJlZE5vdGljZShCQVNJQ19OT1RJQ0UpLmZvcm1hdCgpKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ29ubHkgdW5hY2tub3dsZWRnZWQgbm90aWNlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIHdpdGhpbiB0aGUgYWZmZWN0ZWQgdmVyc2lvbiByYW5nZSBvZiBib3RoIG5vdGljZXNcbiAgICAgIGplc3Quc3B5T24odmVyc2lvbiwgJ3ZlcnNpb25OdW1iZXInKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMTI2LjAnKTtcblxuICAgICAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KHsgYmFnOiBuZXcgU2V0dGluZ3MoeyAnYWNrbm93bGVkZ2VkLWlzc3VlLW51bWJlcnMnOiBbTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFLmlzc3VlTnVtYmVyXSB9KSB9KTtcblxuICAgICAgY29uc3Qgbm90aWNlcyA9IE5vdGljZXMuY3JlYXRlKHsgY29udGV4dCB9KTtcbiAgICAgIGF3YWl0IG5vdGljZXMucmVmcmVzaCh7XG4gICAgICAgIGRhdGFTb3VyY2U6IHsgZmV0Y2g6IGFzeW5jICgpID0+IFtCQVNJQ19OT1RJQ0UsIE1VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRV0gfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwcmludCA9IGplc3Quc3B5T24obG9nZ2luZywgJ3ByaW50Jyk7XG5cbiAgICAgIG5vdGljZXMuZGlzcGxheSgpO1xuICAgICAgZXhwZWN0KHByaW50KS50b0hhdmVCZWVuTnRoQ2FsbGVkV2l0aCg0LCBuZXcgRmlsdGVyZWROb3RpY2UoQkFTSUNfTk9USUNFKS5mb3JtYXQoKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjYW4gaW5jbHVkZSBhY2tub3dsZWRnZWQgbm90aWNlcyBpZiByZXF1ZXN0ZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyB3aXRoaW4gdGhlIGFmZmVjdGVkIHZlcnNpb24gcmFuZ2Ugb2YgYm90aCBub3RpY2VzXG4gICAgICBqZXN0LnNweU9uKHZlcnNpb24sICd2ZXJzaW9uTnVtYmVyJykubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+ICcxLjEyNi4wJyk7XG5cbiAgICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgQ29udGV4dCh7IGJhZzogbmV3IFNldHRpbmdzKHsgJ2Fja25vd2xlZGdlZC1pc3N1ZS1udW1iZXJzJzogW01VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRS5pc3N1ZU51bWJlcl0gfSkgfSk7XG4gICAgICBjb25zdCBub3RpY2VzID0gTm90aWNlcy5jcmVhdGUoeyBjb250ZXh0LCBpbmNsdWRlQWNrbm93bGVkZ2VkOiB0cnVlIH0pO1xuICAgICAgYXdhaXQgbm90aWNlcy5yZWZyZXNoKHtcbiAgICAgICAgZGF0YVNvdXJjZTogeyBmZXRjaDogYXN5bmMgKCkgPT4gW0JBU0lDX05PVElDRSwgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFXSB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHByaW50ID0gamVzdC5zcHlPbihsb2dnaW5nLCAncHJpbnQnKTtcblxuICAgICAgbm90aWNlcy5kaXNwbGF5KCk7XG4gICAgICBleHBlY3QocHJpbnQpLnRvSGF2ZUJlZW5OdGhDYWxsZWRXaXRoKDQsIG5ldyBGaWx0ZXJlZE5vdGljZShCQVNJQ19OT1RJQ0UpLmZvcm1hdCgpKTtcbiAgICAgIGV4cGVjdChwcmludCkudG9IYXZlQmVlbk50aENhbGxlZFdpdGgoNiwgbmV3IEZpbHRlcmVkTm90aWNlKE1VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRSkuZm9ybWF0KCkpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19