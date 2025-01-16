"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const cdk_build_tools_1 = require("@aws-cdk/cdk-build-tools");
const cxapi = require("@aws-cdk/cx-api");
const client_sts_1 = require("@aws-sdk/client-sts");
const promptly = require("promptly");
const uuid = require("uuid");
const fake_sts_1 = require("./fake-sts");
const aws_auth_1 = require("../../lib/api/aws-auth");
const awscli_compatible_1 = require("../../lib/api/aws-auth/awscli-compatible");
const user_agent_1 = require("../../lib/api/aws-auth/user-agent");
const plugin_1 = require("../../lib/api/plugin");
const mode_1 = require("../../lib/api/plugin/mode");
const logging = require("../../lib/logging");
const util_1 = require("../util");
const mock_sdk_1 = require("../util/mock-sdk");
let mockFetchMetadataToken = jest.fn();
let mockRequest = jest.fn();
jest.mock('@aws-sdk/ec2-metadata-service', () => {
    return {
        MetadataService: jest.fn().mockImplementation(() => {
            return {
                fetchMetadataToken: mockFetchMetadataToken,
                request: mockRequest,
            };
        }),
    };
});
let uid;
let pluginQueried;
beforeEach(() => {
    // Cache busters!
    // We prefix everything with UUIDs because:
    //
    // - We have a cache from account# -> credentials
    // - We have a cache from access key -> account
    uid = `(${uuid.v4()})`;
    pluginQueried = false;
    logging.setLogLevel(logging.LogLevel.TRACE);
    plugin_1.PluginHost.instance.credentialProviderSources.splice(0);
    plugin_1.PluginHost.instance.credentialProviderSources.push({
        isAvailable() {
            return Promise.resolve(true);
        },
        canProvideCredentials(account) {
            return Promise.resolve(account === uniq('99999'));
        },
        getProvider() {
            pluginQueried = true;
            return Promise.resolve({
                accessKeyId: `${uid}plugin_key`,
                secretAccessKey: 'plugin_secret',
                sessionToken: 'plugin_token',
            });
        },
        name: 'test plugin',
    });
    // Make sure these point to nonexistant files to start, if we don't call
    // prepare() then we don't accidentally want to fall back to system config.
    process.env.AWS_CONFIG_FILE = '/dev/null';
    process.env.AWS_SHARED_CREDENTIALS_FILE = '/dev/null';
    jest.clearAllMocks();
    (0, mock_sdk_1.restoreSdkMocksToDefault)();
});
afterEach(() => {
    cdk_build_tools_1.bockfs.restore();
    jest.restoreAllMocks();
});
function uniq(account) {
    return `${uid}${account}`;
}
function env(account) {
    return cxapi.EnvironmentUtils.make(account, 'def');
}
describe('with intercepted network calls', () => {
    // Most tests will use intercepted network calls, except one test that tests
    // that the right HTTP `Agent` is used.
    let fakeSts;
    beforeEach(() => {
        fakeSts = new fake_sts_1.FakeSts();
        fakeSts.begin();
        // Make sure the KeyID returned by the plugin is recognized
        fakeSts.registerUser(uniq('99999'), uniq('plugin_key'));
        mockRequest = jest.fn().mockResolvedValue(JSON.stringify({ region: undefined }));
    });
    afterEach(() => {
        fakeSts.restore();
    });
    // Set of tests where the CDK will not trigger assume-role
    // (the INI file might still do assume-role)
    describe('when CDK does not AssumeRole', () => {
        test('uses default credentials by default', async () => {
            // WHEN
            const account = uniq('11111');
            mock_sdk_1.mockSTSClient.on(client_sts_1.GetCallerIdentityCommand).resolves({
                Account: account,
                Arn: 'arn:aws-here',
            });
            prepareCreds({
                credentials: {
                    default: { aws_access_key_id: 'access', $account: '11111', $fakeStsOptions: { partition: 'aws-here' } },
                },
                config: {
                    default: { region: 'eu-bla-5' },
                },
            });
            const provider = await providerFromProfile(undefined);
            // THEN
            expect(provider.defaultRegion).toEqual('eu-bla-5');
            await expect(provider.defaultAccount()).resolves.toEqual({ accountId: account, partition: 'aws-here' });
            // Ask for a different region
            const sdk = (await provider.forEnvironment({ ...env(account), region: 'rgn' }, mode_1.Mode.ForReading)).sdk;
            expect((await sdkConfig(sdk).credentials()).accessKeyId).toEqual(uniq('access'));
            expect(sdk.currentRegion).toEqual('rgn');
        });
        test('throws if no credentials could be found', async () => {
            const account = uniq('11111');
            const provider = await providerFromProfile(undefined);
            await expect(exerciseCredentials(provider, { ...env(account), region: 'rgn' }))
                .rejects
                .toThrow(/Need to perform AWS calls for account .*, but no credentials have been configured, and none of these plugins found any/);
        });
        test('no base credentials partition if token is expired', async () => {
            const account = uniq('11111');
            const error = new Error('Expired Token');
            error.name = 'ExpiredToken';
            const identityProvider = () => Promise.reject(error);
            const provider = new aws_auth_1.SdkProvider(identityProvider, 'rgn');
            const creds = await provider.baseCredentialsPartition({ ...env(account), region: 'rgn' }, mode_1.Mode.ForReading);
            expect(creds).toBeUndefined();
        });
        test('throws if profile credentials are not for the right account', async () => {
            // WHEN
            jest.spyOn(awscli_compatible_1.AwsCliCompatible, 'region').mockResolvedValue('us-east-123');
            prepareCreds({
                fakeSts,
                config: {
                    'profile boo': { aws_access_key_id: 'access', $account: '11111' },
                },
            });
            const provider = await providerFromProfile('boo');
            await expect(exerciseCredentials(provider, env(uniq('some_account_#')))).rejects.toThrow('Need to perform AWS calls');
        });
        test('use profile acct/region if agnostic env requested', async () => {
            // WHEN
            prepareCreds({
                fakeSts,
                credentials: {
                    default: { aws_access_key_id: 'access', $account: '11111' },
                },
                config: {
                    default: { region: 'eu-bla-5' },
                },
            });
            const provider = await providerFromProfile(undefined);
            // THEN
            const sdk = (await provider.forEnvironment(cxapi.EnvironmentUtils.make(cxapi.UNKNOWN_ACCOUNT, cxapi.UNKNOWN_REGION), mode_1.Mode.ForReading)).sdk;
            expect((await sdkConfig(sdk).credentials()).accessKeyId).toEqual(uniq('access'));
            expect((await sdk.currentAccount()).accountId).toEqual(uniq('11111'));
            expect(sdk.currentRegion).toEqual('eu-bla-5');
        });
        test('passing profile skips EnvironmentCredentials', async () => {
            // GIVEN
            const calls = jest.spyOn(console, 'debug');
            prepareCreds({
                fakeSts,
                credentials: {
                    foo: { aws_access_key_id: 'access', $account: '11111' },
                },
            });
            const provider = await providerFromProfile('foo');
            await provider.defaultAccount();
            // Only credential-provider-ini is used.
            expect(calls).toHaveBeenCalledTimes(2);
            expect(calls.mock.calls[0]).toEqual(['@aws-sdk/credential-provider-ini - fromIni']);
            expect(calls.mock.calls[1]).toEqual(['@aws-sdk/credential-provider-ini - resolveStaticCredentials']);
        });
        test('supports profile spread over config_file and credentials_file', async () => {
            // WHEN
            prepareCreds({
                fakeSts,
                credentials: {
                    foo: { aws_access_key_id: 'fooccess', $account: '22222' },
                },
                config: {
                    'default': { region: 'eu-bla-5' },
                    'profile foo': { region: 'eu-west-1' },
                },
            });
            const provider = await providerFromProfile('foo');
            // THEN
            expect(provider.defaultRegion).toEqual('eu-west-1');
            await expect(provider.defaultAccount()).resolves.toEqual({ accountId: uniq('22222'), partition: 'aws' });
            const sdk = (await provider.forEnvironment(env(uniq('22222')), mode_1.Mode.ForReading)).sdk;
            expect((await sdkConfig(sdk).credentials()).accessKeyId).toEqual(uniq('fooccess'));
        });
        test('supports profile only in config_file', async () => {
            // WHEN
            prepareCreds({
                fakeSts,
                config: {
                    'default': { region: 'eu-bla-5' },
                    'profile foo': { aws_access_key_id: 'fooccess', $account: '22222' },
                },
            });
            const provider = await providerFromProfile('foo');
            // THEN
            expect(provider.defaultRegion).toEqual('eu-bla-5'); // Fall back to default config
            await expect(provider.defaultAccount()).resolves.toEqual({ accountId: uniq('22222'), partition: 'aws' });
            const sdk = (await provider.forEnvironment(env(uniq('22222')), mode_1.Mode.ForReading)).sdk;
            expect((await sdkConfig(sdk).credentials()).accessKeyId).toEqual(uniq('fooccess'));
        });
        test('can assume-role configured in config', async () => {
            // GIVEN
            jest.spyOn(console, 'debug');
            prepareCreds({
                fakeSts,
                credentials: {
                    assumer: { aws_access_key_id: 'assumer', $account: '11111' },
                },
                config: {
                    'default': { region: 'eu-bla-5' },
                    'profile assumer': { region: 'us-east-2' },
                    'profile assumable': {
                        role_arn: 'arn:aws:iam::66666:role/Assumable',
                        source_profile: 'assumer',
                        $account: '66666',
                        $fakeStsOptions: { allowedAccounts: ['11111'] },
                    },
                },
            });
            const provider = await providerFromProfile('assumable');
            // WHEN
            const sdk = (await provider.forEnvironment(env(uniq('66666')), mode_1.Mode.ForReading)).sdk;
            // THEN
            expect((await sdk.currentAccount()).accountId).toEqual(uniq('66666'));
        });
        test('can assume role even if [default] profile is missing', async () => {
            // GIVEN
            prepareCreds({
                fakeSts,
                credentials: {
                    assumer: { aws_access_key_id: 'assumer', $account: '22222' },
                    assumable: {
                        role_arn: 'arn:aws:iam::12356789012:role/Assumable',
                        source_profile: 'assumer',
                        $account: '22222',
                    },
                },
                config: {
                    'profile assumable': { region: 'eu-bla-5' },
                },
            });
            // WHEN
            const provider = await providerFromProfile('assumable');
            // THEN
            expect((await provider.defaultAccount())?.accountId).toEqual(uniq('22222'));
        });
        const providersForMfa = [
            (() => providerFromProfile('mfa-role')),
            (async () => {
                // The profile is not passed explicitly. Should be picked from the environment variable
                process.env.AWS_PROFILE = 'mfa-role';
                // Awaiting to make sure the environment variable is only deleted after it's used
                const provider = await aws_auth_1.SdkProvider.withAwsCliCompatibleDefaults({ logger: console });
                delete process.env.AWS_PROFILE;
                return Promise.resolve(provider);
            }),
        ];
        test.each(providersForMfa)('mfa_serial in profile will ask user for token', async (metaProvider) => {
            // GIVEN
            const mockPrompt = jest.spyOn(promptly, 'prompt').mockResolvedValue('1234');
            prepareCreds({
                fakeSts,
                credentials: {
                    assumer: { aws_access_key_id: 'assumer', $account: '66666' },
                },
                config: {
                    'default': { region: 'eu-bla-5' },
                    'profile assumer': { region: 'us-east-2' },
                    'profile mfa-role': {
                        role_arn: 'arn:aws:iam::66666:role/Assumable',
                        source_profile: 'assumer',
                        mfa_serial: 'arn:aws:iam::account:mfa/user',
                        $account: '66666',
                    },
                },
            });
            const provider = await metaProvider();
            // THEN
            const sdk = (await provider.forEnvironment(env(uniq('66666')), mode_1.Mode.ForReading)).sdk;
            expect((await sdk.currentAccount()).accountId).toEqual(uniq('66666'));
            expect(mock_sdk_1.mockSTSClient).toHaveReceivedCommandWith(client_sts_1.AssumeRoleCommand, {
                RoleArn: 'arn:aws:iam::66666:role/Assumable',
                SerialNumber: 'arn:aws:iam::account:mfa/user',
                TokenCode: '1234',
                RoleSessionName: expect.anything(),
            });
            // Make sure the MFA mock was called during this test, only once
            // (Credentials need to remain cached)
            expect(mockPrompt).toHaveBeenCalledTimes(1);
        });
    });
    // For DefaultSynthesis we will do an assume-role after having gotten base credentials
    describe('when CDK AssumeRoles', () => {
        beforeEach(() => {
            // All these tests share that 'arn:aws:role' is a role into account 88888 which can be assumed from 11111
            fakeSts.registerRole(uniq('88888'), 'arn:aws:role', { allowedAccounts: [uniq('11111')] });
        });
        test('error we get from assuming a role is useful', async () => {
            // GIVEN
            prepareCreds({
                fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo' },
                },
            });
            mock_sdk_1.mockSTSClient.on(client_sts_1.AssumeRoleCommand).rejectsOnce('doesnotexist.role.arn');
            const provider = await providerFromProfile(undefined);
            // WHEN
            const promise = exerciseCredentials(provider, env(uniq('88888')), mode_1.Mode.ForReading, {
                assumeRoleArn: 'doesnotexist.role.arn',
            });
            // THEN - error message contains both a helpful hint and the underlying AssumeRole message
            await expect(promise).rejects.toThrow('(re)-bootstrap the environment');
            await expect(promise).rejects.toThrow('doesnotexist.role.arn');
        });
        test('assuming a role sanitizes the username into the session name', async () => {
            // GIVEN
            prepareCreds({
                // fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo', $account: '11111' },
                },
            });
            await (0, util_1.withMocked)(os, 'userInfo', async (userInfo) => {
                userInfo.mockReturnValue({ username: 'skål', uid: 1, gid: 1, homedir: '/here', shell: '/bin/sh' });
                // WHEN
                const provider = await providerFromProfile(undefined);
                const sdk = (await provider.forEnvironment(env(uniq('88888')), mode_1.Mode.ForReading, { assumeRoleArn: 'arn:aws:role' })).sdk;
                await sdk.currentAccount();
                // THEN
                expect(mock_sdk_1.mockSTSClient).toHaveReceivedCommandWith(client_sts_1.AssumeRoleCommand, {
                    RoleArn: 'arn:aws:role',
                    RoleSessionName: 'aws-cdk-sk@l',
                });
            });
        });
        test('session tags can be passed when assuming a role', async () => {
            // GIVEN
            prepareCreds({
                fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo', $account: '11111' },
                },
            });
            await (0, util_1.withMocked)(os, 'userInfo', async (userInfo) => {
                userInfo.mockReturnValue({ username: 'skål', uid: 1, gid: 1, homedir: '/here', shell: '/bin/sh' });
                // WHEN
                const provider = await providerFromProfile(undefined);
                const sdk = (await provider.forEnvironment(env(uniq('88888')), mode_1.Mode.ForReading, {
                    assumeRoleArn: 'arn:aws:role',
                    assumeRoleExternalId: 'bruh',
                    assumeRoleAdditionalOptions: {
                        Tags: [{ Key: 'Department', Value: 'Engineering' }],
                    },
                })).sdk;
                await sdk.currentAccount();
                // THEN
                expect(mock_sdk_1.mockSTSClient).toHaveReceivedCommandWith(client_sts_1.AssumeRoleCommand, {
                    Tags: [{ Key: 'Department', Value: 'Engineering' }],
                    TransitiveTagKeys: ['Department'],
                    RoleArn: 'arn:aws:role',
                    ExternalId: 'bruh',
                    RoleSessionName: 'aws-cdk-sk@l',
                });
            });
        });
        test('assuming a role does not fail when OS username cannot be read', async () => {
            // GIVEN
            prepareCreds({
                // fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo', $account: '11111' },
                },
            });
            await (0, util_1.withMocked)(os, 'userInfo', async (userInfo) => {
                userInfo.mockImplementation(() => {
                    // SystemError thrown as documented: https://nodejs.org/docs/latest-v16.x/api/os.html#osuserinfooptions
                    throw new Error('SystemError on Linux: uv_os_get_passwd returned ENOENT. See #19401 issue.');
                });
                // WHEN
                const provider = await providerFromProfile(undefined);
                await exerciseCredentials(provider, env(uniq('88888')), mode_1.Mode.ForReading, { assumeRoleArn: 'arn:aws:role' });
                // THEN
                expect(mock_sdk_1.mockSTSClient).toHaveReceivedCommandWith(client_sts_1.AssumeRoleCommand, {
                    RoleArn: 'arn:aws:role',
                    RoleSessionName: 'aws-cdk-noname',
                });
            });
        });
        test('even if current credentials are for the wrong account, we will still use them to AssumeRole', async () => {
            // GIVEN
            prepareCreds({
                // fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo', $account: '11111' },
                },
            });
            const provider = await providerFromProfile(undefined);
            // WHEN
            const sdk = (await provider.forEnvironment(env(uniq('88888')), mode_1.Mode.ForReading, { assumeRoleArn: 'arn:aws:role' })).sdk;
            // THEN
            expect((await sdk.currentAccount()).accountId).toEqual(uniq('88888'));
        });
        test('if AssumeRole fails but current credentials are for the right account, we will still use them', async () => {
            // GIVEN
            prepareCreds({
                // fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo', $account: '88888' },
                },
            });
            const provider = await providerFromProfile(undefined);
            // WHEN - assumeRole fails because the role can only be assumed from account 11111
            const sdk = (await provider.forEnvironment(env(uniq('88888')), mode_1.Mode.ForReading, { assumeRoleArn: 'arn:aws:role' })).sdk;
            // THEN
            expect((await sdk.currentAccount()).accountId).toEqual(uniq('88888'));
        });
        test('if AssumeRole fails because of ExpiredToken, then fail completely', async () => {
            // GIVEN
            prepareCreds({
                // fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo', $account: '88888' },
                },
            });
            const error = new Error('Too late');
            error.name = 'ExpiredToken';
            mock_sdk_1.mockSTSClient.on(client_sts_1.AssumeRoleCommand).rejectsOnce(error);
            const provider = await providerFromProfile(undefined);
            // WHEN - assumeRole fails with a specific error
            await expect(exerciseCredentials(provider, env(uniq('88888')), mode_1.Mode.ForReading, { assumeRoleArn: '<FAIL:ExpiredToken>' }))
                .rejects.toThrow(error);
        });
    });
    describe('Plugins', () => {
        test('does not use plugins if current credentials are for expected account', async () => {
            prepareCreds({
                fakeSts,
                config: {
                    default: { aws_access_key_id: 'foo', $account: '11111' },
                },
            });
            const provider = await providerFromProfile(undefined);
            await exerciseCredentials(provider, env(uniq('11111')));
            expect(pluginQueried).toEqual(false);
        });
        test('uses plugin for account 99999', async () => {
            const provider = await providerFromProfile(undefined);
            await exerciseCredentials(provider, env(uniq('99999')));
            expect(pluginQueried).toEqual(true);
        });
        test('can assume role with credentials from plugin', async () => {
            fakeSts.registerRole(uniq('99999'), 'arn:aws:iam::99999:role/Assumable');
            const provider = await providerFromProfile(undefined);
            await exerciseCredentials(provider, env(uniq('99999')), mode_1.Mode.ForReading, {
                assumeRoleArn: 'arn:aws:iam::99999:role/Assumable',
            });
            expect(pluginQueried).toEqual(true);
            expect(mock_sdk_1.mockSTSClient).toHaveReceivedCommandWith(client_sts_1.AssumeRoleCommand, {
                RoleArn: 'arn:aws:iam::99999:role/Assumable',
                RoleSessionName: expect.anything(),
            });
        });
        test('even if AssumeRole fails but current credentials are from a plugin, we will still use them', async () => {
            const provider = await providerFromProfile(undefined);
            const sdk = (await provider.forEnvironment(env(uniq('99999')), mode_1.Mode.ForReading, { assumeRoleArn: 'does:not:exist' })).sdk;
            // THEN
            expect((await sdk.currentAccount()).accountId).toEqual(uniq('99999'));
        });
        test('plugins are still queried even if current credentials are expired (or otherwise invalid)', async () => {
            // GIVEN
            // WHEN
            const account = uniq('11111');
            mock_sdk_1.mockSTSClient.on(client_sts_1.GetCallerIdentityCommand).resolves({
                Account: account,
                Arn: 'arn:aws-here',
            });
            prepareCreds({
                credentials: {
                    default: { aws_access_key_id: `${uid}akid`, $account: '11111', $fakeStsOptions: { partition: 'aws-here' } },
                },
                config: {
                    default: { region: 'eu-bla-5' },
                },
            });
            process.env.AWS_ACCESS_KEY_ID = `${uid}akid`;
            process.env.AWS_SECRET_ACCESS_KEY = 'sekrit';
            const provider = await providerFromProfile(undefined);
            // WHEN
            await exerciseCredentials(provider, env(uniq('99999')));
            // THEN
            expect(pluginQueried).toEqual(true);
        });
    });
    describe('support for credential_source', () => {
        test('can assume role with ecs credentials', async () => {
            // GIVEN
            const calls = jest.spyOn(console, 'debug');
            prepareCreds({
                config: {
                    'profile ecs': {
                        role_arn: 'arn:aws:iam::12356789012:role/Assumable',
                        credential_source: 'EcsContainer',
                        $account: '22222',
                    },
                },
            });
            // WHEN
            const provider = await providerFromProfile('ecs');
            await provider.defaultAccount();
            // THEN
            expect(calls.mock.calls).toContainEqual([
                '@aws-sdk/credential-provider-ini - finding credential resolver using profile=[ecs]',
            ]);
            expect(calls.mock.calls).toContainEqual(['@aws-sdk/credential-provider-ini - credential_source is EcsContainer']);
        });
        test('can assume role with ec2 credentials', async () => {
            // GIVEN
            const calls = jest.spyOn(console, 'debug');
            prepareCreds({
                config: {
                    'profile ecs': {
                        role_arn: 'arn:aws:iam::12356789012:role/Assumable',
                        credential_source: 'Ec2InstanceMetadata',
                        $account: '22222',
                    },
                },
            });
            // WHEN
            const provider = await providerFromProfile('ecs');
            await provider.defaultAccount();
            // THEN
            expect(calls.mock.calls).toContainEqual([
                '@aws-sdk/credential-provider-ini - finding credential resolver using profile=[ecs]',
            ]);
            expect(calls.mock.calls).toContainEqual([
                '@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata',
            ]);
        });
        test('can assume role with env credentials', async () => {
            // GIVEN
            const calls = jest.spyOn(console, 'debug');
            prepareCreds({
                config: {
                    'profile ecs': {
                        role_arn: 'arn:aws:iam::12356789012:role/Assumable',
                        credential_source: 'Environment',
                        $account: '22222',
                    },
                },
            });
            // WHEN
            const provider = await providerFromProfile('ecs');
            await provider.defaultAccount();
            // THEN
            expect(calls.mock.calls).toContainEqual([
                '@aws-sdk/credential-provider-ini - finding credential resolver using profile=[ecs]',
            ]);
            expect(calls.mock.calls).toContainEqual(['@aws-sdk/credential-provider-ini - credential_source is Environment']);
        });
        test('assume fails with unsupported credential_source', async () => {
            // GIVEN
            prepareCreds({
                config: {
                    'profile ecs': {
                        role_arn: 'arn:aws:iam::12356789012:role/Assumable',
                        credential_source: 'unsupported',
                        $account: '22222',
                    },
                },
            });
            const provider = await providerFromProfile('ecs');
            // WHEN
            const account = await provider.defaultAccount();
            // THEN
            expect(account?.accountId).toEqual(undefined);
        });
    });
    test('defaultAccount returns undefined if STS call fails', async () => {
        // GIVEN
        mock_sdk_1.mockSTSClient.on(client_sts_1.AssumeRoleCommand).rejectsOnce('Oops, bad sekrit');
        // WHEN
        const provider = await providerFromProfile(undefined);
        // THEN
        await expect(provider.defaultAccount()).resolves.toBe(undefined);
    });
    test('defaultAccount returns undefined, event if STS call fails with ExpiredToken', async () => {
        // GIVEN
        const error = new Error('Too late');
        error.name = 'ExpiredToken';
        mock_sdk_1.mockSTSClient.on(client_sts_1.AssumeRoleCommand).rejectsOnce(error);
        // WHEN
        const provider = await providerFromProfile(undefined);
        // THEN
        await expect(provider.defaultAccount()).resolves.toBe(undefined);
    });
});
test('default useragent is reasonable', () => {
    expect((0, user_agent_1.defaultCliUserAgent)()).toContain('aws-cdk/');
});
/**
 * Use object hackery to get the credentials out of the SDK object
 */
function sdkConfig(sdk) {
    return sdk.config;
}
/**
 * Fixture for SDK auth for this test suite
 *
 * Has knowledge of the cache buster, will write proper fake config files and
 * register users and roles in FakeSts at the same time.
 */
function prepareCreds(options) {
    function convertSections(sections) {
        const ret = [];
        for (const [profile, user] of Object.entries(sections ?? {})) {
            ret.push(`[${profile}]`);
            if (isProfileRole(user)) {
                ret.push(`role_arn=${user.role_arn}`);
                if ('source_profile' in user) {
                    ret.push(`source_profile=${user.source_profile}`);
                }
                if ('credential_source' in user) {
                    ret.push(`credential_source=${user.credential_source}`);
                }
                if (user.mfa_serial) {
                    ret.push(`mfa_serial=${user.mfa_serial}`);
                }
                options.fakeSts?.registerRole(uniq(user.$account ?? '00000'), user.role_arn, {
                    ...user.$fakeStsOptions,
                    allowedAccounts: user.$fakeStsOptions?.allowedAccounts?.map(uniq),
                });
            }
            else {
                if (user.aws_access_key_id) {
                    ret.push(`aws_access_key_id=${uniq(user.aws_access_key_id)}`);
                    ret.push('aws_secret_access_key=secret');
                    options.fakeSts?.registerUser(uniq(user.$account ?? '00000'), uniq(user.aws_access_key_id), user.$fakeStsOptions);
                }
            }
            if (user.region) {
                ret.push(`region=${user.region}`);
            }
        }
        return ret.join('\n');
    }
    (0, cdk_build_tools_1.bockfs)({
        '/home/me/.bxt/credentials': convertSections(options.credentials),
        '/home/me/.bxt/config': convertSections(options.config),
    });
    // Set environment variables that we want
    process.env.AWS_CONFIG_FILE = cdk_build_tools_1.bockfs.path('/home/me/.bxt/config');
    process.env.AWS_SHARED_CREDENTIALS_FILE = cdk_build_tools_1.bockfs.path('/home/me/.bxt/credentials');
}
function isProfileRole(x) {
    return 'role_arn' in x;
}
async function providerFromProfile(profile) {
    return aws_auth_1.SdkProvider.withAwsCliCompatibleDefaults({ profile, logger: console });
}
async function exerciseCredentials(provider, e, mode = mode_1.Mode.ForReading, options) {
    const sdk = await provider.forEnvironment(e, mode, options);
    await sdk.sdk.currentAccount();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2RrLXByb3ZpZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZGstcHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHlCQUF5QjtBQUN6Qiw4REFBa0Q7QUFDbEQseUNBQXlDO0FBQ3pDLG9EQUFrRjtBQUNsRixxQ0FBcUM7QUFDckMsNkJBQTZCO0FBQzdCLHlDQUErRTtBQUMvRSxxREFBb0c7QUFDcEcsZ0ZBQTRFO0FBQzVFLGtFQUF3RTtBQUN4RSxpREFBa0Q7QUFDbEQsb0RBQWlEO0FBQ2pELDZDQUE2QztBQUM3QyxrQ0FBcUM7QUFDckMsK0NBQTJFO0FBRTNFLElBQUksc0JBQXNCLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQ3ZDLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUU1QixJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUM5QyxPQUFPO1FBQ0wsZUFBZSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUU7WUFDakQsT0FBTztnQkFDTCxrQkFBa0IsRUFBRSxzQkFBc0I7Z0JBQzFDLE9BQU8sRUFBRSxXQUFXO2FBQ3JCLENBQUM7UUFDSixDQUFDLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLEdBQVcsQ0FBQztBQUNoQixJQUFJLGFBQXNCLENBQUM7QUFFM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLGlCQUFpQjtJQUNqQiwyQ0FBMkM7SUFDM0MsRUFBRTtJQUNGLGlEQUFpRDtJQUNqRCwrQ0FBK0M7SUFDL0MsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUM7SUFDdkIsYUFBYSxHQUFHLEtBQUssQ0FBQztJQUV0QixPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxD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LGNBQWMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzVELE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHsgYm9ja2ZzIH0gZnJvbSAnQGF3cy1jZGsvY2RrLWJ1aWxkLXRvb2xzJztcbmltcG9ydCAqIGFzIGN4YXBpIGZyb20gJ0Bhd3MtY2RrL2N4LWFwaSc7XG5pbXBvcnQgeyBBc3N1bWVSb2xlQ29tbWFuZCwgR2V0Q2FsbGVySWRlbnRpdHlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXN0cyc7XG5pbXBvcnQgKiBhcyBwcm9tcHRseSBmcm9tICdwcm9tcHRseSc7XG5pbXBvcnQgKiBhcyB1dWlkIGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgRmFrZVN0cywgUmVnaXN0ZXJSb2xlT3B0aW9ucywgUmVnaXN0ZXJVc2VyT3B0aW9ucyB9IGZyb20gJy4vZmFrZS1zdHMnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbk9wdGlvbnMsIENyZWRlbnRpYWxzT3B0aW9ucywgU0RLLCBTZGtQcm92aWRlciB9IGZyb20gJy4uLy4uL2xpYi9hcGkvYXdzLWF1dGgnO1xuaW1wb3J0IHsgQXdzQ2xpQ29tcGF0aWJsZSB9IGZyb20gJy4uLy4uL2xpYi9hcGkvYXdzLWF1dGgvYXdzY2xpLWNvbXBhdGlibGUnO1xuaW1wb3J0IHsgZGVmYXVsdENsaVVzZXJBZ2VudCB9IGZyb20gJy4uLy4uL2xpYi9hcGkvYXdzLWF1dGgvdXNlci1hZ2VudCc7XG5pbXBvcnQgeyBQbHVnaW5Ib3N0IH0gZnJvbSAnLi4vLi4vbGliL2FwaS9wbHVnaW4nO1xuaW1wb3J0IHsgTW9kZSB9IGZyb20gJy4uLy4uL2xpYi9hcGkvcGx1Z2luL21vZGUnO1xuaW1wb3J0ICogYXMgbG9nZ2luZyBmcm9tICcuLi8uLi9saWIvbG9nZ2luZyc7XG5pbXBvcnQgeyB3aXRoTW9ja2VkIH0gZnJvbSAnLi4vdXRpbCc7XG5pbXBvcnQgeyBtb2NrU1RTQ2xpZW50LCByZXN0b3JlU2RrTW9ja3NUb0RlZmF1bHQgfSBmcm9tICcuLi91dGlsL21vY2stc2RrJztcblxubGV0IG1vY2tGZXRjaE1ldGFkYXRhVG9rZW4gPSBqZXN0LmZuKCk7XG5sZXQgbW9ja1JlcXVlc3QgPSBqZXN0LmZuKCk7XG5cbmplc3QubW9jaygnQGF3cy1zZGsvZWMyLW1ldGFkYXRhLXNlcnZpY2UnLCAoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgTWV0YWRhdGFTZXJ2aWNlOiBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZldGNoTWV0YWRhdGFUb2tlbjogbW9ja0ZldGNoTWV0YWRhdGFUb2tlbixcbiAgICAgICAgcmVxdWVzdDogbW9ja1JlcXVlc3QsXG4gICAgICB9O1xuICAgIH0pLFxuICB9O1xufSk7XG5cbmxldCB1aWQ6IHN0cmluZztcbmxldCBwbHVnaW5RdWVyaWVkOiBib29sZWFuO1xuXG5iZWZvcmVFYWNoKCgpID0+IHtcbiAgLy8gQ2FjaGUgYnVzdGVycyFcbiAgLy8gV2UgcHJlZml4IGV2ZXJ5dGhpbmcgd2l0aCBVVUlEcyBiZWNhdXNlOlxuICAvL1xuICAvLyAtIFdlIGhhdmUgYSBjYWNoZSBmcm9tIGFjY291bnQjIC0+IGNyZWRlbnRpYWxzXG4gIC8vIC0gV2UgaGF2ZSBhIGNhY2hlIGZyb20gYWNjZXNzIGtleSAtPiBhY2NvdW50XG4gIHVpZCA9IGAoJHt1dWlkLnY0KCl9KWA7XG4gIHBsdWdpblF1ZXJpZWQgPSBmYWxzZTtcblxuICBsb2dnaW5nLnNldExvZ0xldmVsKGxvZ2dpbmcuTG9nTGV2ZWwuVFJBQ0UpO1xuXG4gIFBsdWdpbkhvc3QuaW5zdGFuY2UuY3JlZGVudGlhbFByb3ZpZGVyU291cmNlcy5zcGxpY2UoMCk7XG4gIFBsdWdpbkhvc3QuaW5zdGFuY2UuY3JlZGVudGlhbFByb3ZpZGVyU291cmNlcy5wdXNoKHtcbiAgICBpc0F2YWlsYWJsZSgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG4gICAgfSxcbiAgICBjYW5Qcm92aWRlQ3JlZGVudGlhbHMoYWNjb3VudCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShhY2NvdW50ID09PSB1bmlxKCc5OTk5OScpKTtcbiAgICB9LFxuICAgIGdldFByb3ZpZGVyKCkge1xuICAgICAgcGx1Z2luUXVlcmllZCA9IHRydWU7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgYWNjZXNzS2V5SWQ6IGAke3VpZH1wbHVnaW5fa2V5YCxcbiAgICAgICAgc2VjcmV0QWNjZXNzS2V5OiAncGx1Z2luX3NlY3JldCcsXG4gICAgICAgIHNlc3Npb25Ub2tlbjogJ3BsdWdpbl90b2tlbicsXG4gICAgICB9KTtcbiAgICB9LFxuICAgIG5hbWU6ICd0ZXN0IHBsdWdpbicsXG4gIH0pO1xuXG4gIC8vIE1ha2Ugc3VyZSB0aGVzZSBwb2ludCB0byBub25leGlzdGFudCBmaWxlcyB0byBzdGFydCwgaWYgd2UgZG9uJ3QgY2FsbFxuICAvLyBwcmVwYXJlKCkgdGhlbiB3ZSBkb24ndCBhY2NpZGVudGFsbHkgd2FudCB0byBmYWxsIGJhY2sgdG8gc3lzdGVtIGNvbmZpZy5cbiAgcHJvY2Vzcy5lbnYuQVdTX0NPTkZJR19GSUxFID0gJy9kZXYvbnVsbCc7XG4gIHByb2Nlc3MuZW52LkFXU19TSEFSRURfQ1JFREVOVElBTFNfRklMRSA9ICcvZGV2L251bGwnO1xuXG4gIGplc3QuY2xlYXJBbGxNb2NrcygpO1xuICByZXN0b3JlU2RrTW9ja3NUb0RlZmF1bHQoKTtcbn0pO1xuXG5hZnRlckVhY2goKCkgPT4ge1xuICBib2NrZnMucmVzdG9yZSgpO1xuICBqZXN0LnJlc3RvcmVBbGxNb2NrcygpO1xufSk7XG5cbmZ1bmN0aW9uIHVuaXEoYWNjb3VudDogc3RyaW5nKSB7XG4gIHJldHVybiBgJHt1aWR9JHthY2NvdW50fWA7XG59XG5cbmZ1bmN0aW9uIGVudihhY2NvdW50OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGN4YXBpLkVudmlyb25tZW50VXRpbHMubWFrZShhY2NvdW50LCAnZGVmJyk7XG59XG5cbmRlc2NyaWJlKCd3aXRoIGludGVyY2VwdGVkIG5ldHdvcmsgY2FsbHMnLCAoKSA9PiB7XG4gIC8vIE1vc3QgdGVzdHMgd2lsbCB1c2UgaW50ZXJjZXB0ZWQgbmV0d29yayBjYWxscywgZXhjZXB0IG9uZSB0ZXN0IHRoYXQgdGVzdHNcbiAgLy8gdGhhdCB0aGUgcmlnaHQgSFRUUCBgQWdlbnRgIGlzIHVzZWQuXG5cbiAgbGV0IGZha2VTdHM6IEZha2VTdHM7XG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGZha2VTdHMgPSBuZXcgRmFrZVN0cygpO1xuICAgIGZha2VTdHMuYmVnaW4oKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB0aGUgS2V5SUQgcmV0dXJuZWQgYnkgdGhlIHBsdWdpbiBpcyByZWNvZ25pemVkXG4gICAgZmFrZVN0cy5yZWdpc3RlclVzZXIodW5pcSgnOTk5OTknKSwgdW5pcSgncGx1Z2luX2tleScpKTtcbiAgICBtb2NrUmVxdWVzdCA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZShKU09OLnN0cmluZ2lmeSh7IHJlZ2lvbjogdW5kZWZpbmVkIH0pKTtcbiAgfSk7XG5cbiAgYWZ0ZXJFYWNoKCgpID0+IHtcbiAgICBmYWtlU3RzLnJlc3RvcmUoKTtcbiAgfSk7XG5cbiAgLy8gU2V0IG9mIHRlc3RzIHdoZXJlIHRoZSBDREsgd2lsbCBub3QgdHJpZ2dlciBhc3N1bWUtcm9sZVxuICAvLyAodGhlIElOSSBmaWxlIG1pZ2h0IHN0aWxsIGRvIGFzc3VtZS1yb2xlKVxuICBkZXNjcmliZSgnd2hlbiBDREsgZG9lcyBub3QgQXNzdW1lUm9sZScsICgpID0+IHtcbiAgICB0ZXN0KCd1c2VzIGRlZmF1bHQgY3JlZGVudGlhbHMgYnkgZGVmYXVsdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IGFjY291bnQgPSB1bmlxKCcxMTExMScpO1xuICAgICAgbW9ja1NUU0NsaWVudC5vbihHZXRDYWxsZXJJZGVudGl0eUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgQWNjb3VudDogYWNjb3VudCxcbiAgICAgICAgQXJuOiAnYXJuOmF3cy1oZXJlJyxcbiAgICAgIH0pO1xuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBkZWZhdWx0OiB7IGF3c19hY2Nlc3Nfa2V5X2lkOiAnYWNjZXNzJywgJGFjY291bnQ6ICcxMTExMScsICRmYWtlU3RzT3B0aW9uczogeyBwYXJ0aXRpb246ICdhd3MtaGVyZScgfSB9LFxuICAgICAgICB9LFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICBkZWZhdWx0OiB7IHJlZ2lvbjogJ2V1LWJsYS01JyB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHByb3ZpZGVyRnJvbVByb2ZpbGUodW5kZWZpbmVkKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHByb3ZpZGVyLmRlZmF1bHRSZWdpb24pLnRvRXF1YWwoJ2V1LWJsYS01Jyk7XG4gICAgICBhd2FpdCBleHBlY3QocHJvdmlkZXIuZGVmYXVsdEFjY291bnQoKSkucmVzb2x2ZXMudG9FcXVhbCh7IGFjY291bnRJZDogYWNjb3VudCwgcGFydGl0aW9uOiAnYXdzLWhlcmUnIH0pO1xuXG4gICAgICAvLyBBc2sgZm9yIGEgZGlmZmVyZW50IHJlZ2lvblxuICAgICAgY29uc3Qgc2RrID0gKGF3YWl0IHByb3ZpZGVyLmZvckVudmlyb25tZW50KHsgLi4uZW52KGFjY291bnQpLCByZWdpb246ICdyZ24nIH0sIE1vZGUuRm9yUmVhZGluZykpLnNkaztcbiAgICAgIGV4cGVjdCgoYXdhaXQgc2RrQ29uZmlnKHNkaykuY3JlZGVudGlhbHMoKSkuYWNjZXNzS2V5SWQpLnRvRXF1YWwodW5pcSgnYWNjZXNzJykpO1xuICAgICAgZXhwZWN0KHNkay5jdXJyZW50UmVnaW9uKS50b0VxdWFsKCdyZ24nKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Rocm93cyBpZiBubyBjcmVkZW50aWFscyBjb3VsZCBiZSBmb3VuZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGFjY291bnQgPSB1bmlxKCcxMTExMScpO1xuICAgICAgY29uc3QgcHJvdmlkZXIgPSBhd2FpdCBwcm92aWRlckZyb21Qcm9maWxlKHVuZGVmaW5lZCk7XG4gICAgICBhd2FpdCBleHBlY3QoZXhlcmNpc2VDcmVkZW50aWFscyhwcm92aWRlciwgeyAuLi5lbnYoYWNjb3VudCksIHJlZ2lvbjogJ3JnbicgfSkpXG4gICAgICAgIC5yZWplY3RzXG4gICAgICAgIC50b1Rocm93KC9OZWVkIHRvIHBlcmZvcm0gQVdTIGNhbGxzIGZvciBhY2NvdW50IC4qLCBidXQgbm8gY3JlZGVudGlhbHMgaGF2ZSBiZWVuIGNvbmZpZ3VyZWQsIGFuZCBub25lIG9mIHRoZXNlIHBsdWdpbnMgZm91bmQgYW55Lyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdubyBiYXNlIGNyZWRlbnRpYWxzIHBhcnRpdGlvbiBpZiB0b2tlbiBpcyBleHBpcmVkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgYWNjb3VudCA9IHVuaXEoJzExMTExJyk7XG4gICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcignRXhwaXJlZCBUb2tlbicpO1xuICAgICAgZXJyb3IubmFtZSA9ICdFeHBpcmVkVG9rZW4nO1xuICAgICAgY29uc3QgaWRlbnRpdHlQcm92aWRlciA9ICgpID0+IFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFNka1Byb3ZpZGVyKGlkZW50aXR5UHJvdmlkZXIsICdyZ24nKTtcbiAgICAgIGNvbnN0IGNyZWRzID0gYXdhaXQgcHJvdmlkZXIuYmFzZUNyZWRlbnRpYWxzUGFydGl0aW9uKHsgLi4uZW52KGFjY291bnQpLCByZWdpb246ICdyZ24nIH0sIE1vZGUuRm9yUmVhZGluZyk7XG5cbiAgICAgIGV4cGVjdChjcmVkcykudG9CZVVuZGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndGhyb3dzIGlmIHByb2ZpbGUgY3JlZGVudGlhbHMgYXJlIG5vdCBmb3IgdGhlIHJpZ2h0IGFjY291bnQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBXSEVOXG4gICAgICBqZXN0LnNweU9uKEF3c0NsaUNvbXBhdGlibGUsICdyZWdpb24nKS5tb2NrUmVzb2x2ZWRWYWx1ZSgndXMtZWFzdC0xMjMnKTtcbiAgICAgIHByZXBhcmVDcmVkcyh7XG4gICAgICAgIGZha2VTdHMsXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICdwcm9maWxlIGJvbyc6IHsgYXdzX2FjY2Vzc19rZXlfaWQ6ICdhY2Nlc3MnLCAkYWNjb3VudDogJzExMTExJyB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHByb3ZpZGVyRnJvbVByb2ZpbGUoJ2JvbycpO1xuXG4gICAgICBhd2FpdCBleHBlY3QoZXhlcmNpc2VDcmVkZW50aWFscyhwcm92aWRlciwgZW52KHVuaXEoJ3NvbWVfYWNjb3VudF8jJykpKSkucmVqZWN0cy50b1Rocm93KFxuICAgICAgICAnTmVlZCB0byBwZXJmb3JtIEFXUyBjYWxscycsXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgndXNlIHByb2ZpbGUgYWNjdC9yZWdpb24gaWYgYWdub3N0aWMgZW52IHJlcXVlc3RlZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIFdIRU5cbiAgICAgIHByZXBhcmVDcmVkcyh7XG4gICAgICAgIGZha2VTdHMsXG4gICAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgICAgZGVmYXVsdDogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2FjY2VzcycsICRhY2NvdW50OiAnMTExMTEnIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgIGRlZmF1bHQ6IHsgcmVnaW9uOiAnZXUtYmxhLTUnIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBjb25zdCBzZGsgPSAoXG4gICAgICAgIGF3YWl0IHByb3ZpZGVyLmZvckVudmlyb25tZW50KFxuICAgICAgICAgIGN4YXBpLkVudmlyb25tZW50VXRpbHMubWFrZShjeGFwaS5VTktOT1dOX0FDQ09VTlQsIGN4YXBpLlVOS05PV05fUkVHSU9OKSxcbiAgICAgICAgICBNb2RlLkZvclJlYWRpbmcsXG4gICAgICAgIClcbiAgICAgICkuc2RrO1xuICAgICAgZXhwZWN0KChhd2FpdCBzZGtDb25maWcoc2RrKS5jcmVkZW50aWFscygpKS5hY2Nlc3NLZXlJZCkudG9FcXVhbCh1bmlxKCdhY2Nlc3MnKSk7XG4gICAgICBleHBlY3QoKGF3YWl0IHNkay5jdXJyZW50QWNjb3VudCgpKS5hY2NvdW50SWQpLnRvRXF1YWwodW5pcSgnMTExMTEnKSk7XG4gICAgICBleHBlY3Qoc2RrLmN1cnJlbnRSZWdpb24pLnRvRXF1YWwoJ2V1LWJsYS01Jyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdwYXNzaW5nIHByb2ZpbGUgc2tpcHMgRW52aXJvbm1lbnRDcmVkZW50aWFscycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBjYWxscyA9IGplc3Quc3B5T24oY29uc29sZSwgJ2RlYnVnJyk7XG4gICAgICBwcmVwYXJlQ3JlZHMoe1xuICAgICAgICBmYWtlU3RzLFxuICAgICAgICBjcmVkZW50aWFsczoge1xuICAgICAgICAgIGZvbzogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2FjY2VzcycsICRhY2NvdW50OiAnMTExMTEnIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSgnZm9vJyk7XG4gICAgICBhd2FpdCBwcm92aWRlci5kZWZhdWx0QWNjb3VudCgpO1xuICAgICAgLy8gT25seSBjcmVkZW50aWFsLXByb3ZpZGVyLWluaSBpcyB1c2VkLlxuICAgICAgZXhwZWN0KGNhbGxzKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMik7XG4gICAgICBleHBlY3QoY2FsbHMubW9jay5jYWxsc1swXSkudG9FcXVhbChbJ0Bhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItaW5pIC0gZnJvbUluaSddKTtcbiAgICAgIGV4cGVjdChjYWxscy5tb2NrLmNhbGxzWzFdKS50b0VxdWFsKFsnQGF3cy1zZGsvY3JlZGVudGlhbC1wcm92aWRlci1pbmkgLSByZXNvbHZlU3RhdGljQ3JlZGVudGlhbHMnXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzdXBwb3J0cyBwcm9maWxlIHNwcmVhZCBvdmVyIGNvbmZpZ19maWxlIGFuZCBjcmVkZW50aWFsc19maWxlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gV0hFTlxuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgZmFrZVN0cyxcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBmb286IHsgYXdzX2FjY2Vzc19rZXlfaWQ6ICdmb29jY2VzcycsICRhY2NvdW50OiAnMjIyMjInIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICdkZWZhdWx0JzogeyByZWdpb246ICdldS1ibGEtNScgfSxcbiAgICAgICAgICAncHJvZmlsZSBmb28nOiB7IHJlZ2lvbjogJ2V1LXdlc3QtMScgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcHJvdmlkZXIgPSBhd2FpdCBwcm92aWRlckZyb21Qcm9maWxlKCdmb28nKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHByb3ZpZGVyLmRlZmF1bHRSZWdpb24pLnRvRXF1YWwoJ2V1LXdlc3QtMScpO1xuICAgICAgYXdhaXQgZXhwZWN0KHByb3ZpZGVyLmRlZmF1bHRBY2NvdW50KCkpLnJlc29sdmVzLnRvRXF1YWwoeyBhY2NvdW50SWQ6IHVuaXEoJzIyMjIyJyksIHBhcnRpdGlvbjogJ2F3cycgfSk7XG5cbiAgICAgIGNvbnN0IHNkayA9IChhd2FpdCBwcm92aWRlci5mb3JFbnZpcm9ubWVudChlbnYodW5pcSgnMjIyMjInKSksIE1vZGUuRm9yUmVhZGluZykpLnNkaztcbiAgICAgIGV4cGVjdCgoYXdhaXQgc2RrQ29uZmlnKHNkaykuY3JlZGVudGlhbHMoKSkuYWNjZXNzS2V5SWQpLnRvRXF1YWwodW5pcSgnZm9vY2Nlc3MnKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzdXBwb3J0cyBwcm9maWxlIG9ubHkgaW4gY29uZmlnX2ZpbGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBXSEVOXG4gICAgICBwcmVwYXJlQ3JlZHMoe1xuICAgICAgICBmYWtlU3RzLFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAnZGVmYXVsdCc6IHsgcmVnaW9uOiAnZXUtYmxhLTUnIH0sXG4gICAgICAgICAgJ3Byb2ZpbGUgZm9vJzogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2Zvb2NjZXNzJywgJGFjY291bnQ6ICcyMjIyMicgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcHJvdmlkZXIgPSBhd2FpdCBwcm92aWRlckZyb21Qcm9maWxlKCdmb28nKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KHByb3ZpZGVyLmRlZmF1bHRSZWdpb24pLnRvRXF1YWwoJ2V1LWJsYS01Jyk7IC8vIEZhbGwgYmFjayB0byBkZWZhdWx0IGNvbmZpZ1xuICAgICAgYXdhaXQgZXhwZWN0KHByb3ZpZGVyLmRlZmF1bHRBY2NvdW50KCkpLnJlc29sdmVzLnRvRXF1YWwoeyBhY2NvdW50SWQ6IHVuaXEoJzIyMjIyJyksIHBhcnRpdGlvbjogJ2F3cycgfSk7XG5cbiAgICAgIGNvbnN0IHNkayA9IChhd2FpdCBwcm92aWRlci5mb3JFbnZpcm9ubWVudChlbnYodW5pcSgnMjIyMjInKSksIE1vZGUuRm9yUmVhZGluZykpLnNkaztcbiAgICAgIGV4cGVjdCgoYXdhaXQgc2RrQ29uZmlnKHNkaykuY3JlZGVudGlhbHMoKSkuYWNjZXNzS2V5SWQpLnRvRXF1YWwodW5pcSgnZm9vY2Nlc3MnKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjYW4gYXNzdW1lLXJvbGUgY29uZmlndXJlZCBpbiBjb25maWcnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgamVzdC5zcHlPbihjb25zb2xlLCAnZGVidWcnKTtcbiAgICAgIHByZXBhcmVDcmVkcyh7XG4gICAgICAgIGZha2VTdHMsXG4gICAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgICAgYXNzdW1lcjogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2Fzc3VtZXInLCAkYWNjb3VudDogJzExMTExJyB9LFxuICAgICAgICB9LFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAnZGVmYXVsdCc6IHsgcmVnaW9uOiAnZXUtYmxhLTUnIH0sXG4gICAgICAgICAgJ3Byb2ZpbGUgYXNzdW1lcic6IHsgcmVnaW9uOiAndXMtZWFzdC0yJyB9LFxuICAgICAgICAgICdwcm9maWxlIGFzc3VtYWJsZSc6IHtcbiAgICAgICAgICAgIHJvbGVfYXJuOiAnYXJuOmF3czppYW06OjY2NjY2OnJvbGUvQXNzdW1hYmxlJyxcbiAgICAgICAgICAgIHNvdXJjZV9wcm9maWxlOiAnYXNzdW1lcicsXG4gICAgICAgICAgICAkYWNjb3VudDogJzY2NjY2JyxcbiAgICAgICAgICAgICRmYWtlU3RzT3B0aW9uczogeyBhbGxvd2VkQWNjb3VudHM6IFsnMTExMTEnXSB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSgnYXNzdW1hYmxlJyk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHNkayA9IChhd2FpdCBwcm92aWRlci5mb3JFbnZpcm9ubWVudChlbnYodW5pcSgnNjY2NjYnKSksIE1vZGUuRm9yUmVhZGluZykpLnNkaztcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KChhd2FpdCBzZGsuY3VycmVudEFjY291bnQoKSkuYWNjb3VudElkKS50b0VxdWFsKHVuaXEoJzY2NjY2JykpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY2FuIGFzc3VtZSByb2xlIGV2ZW4gaWYgW2RlZmF1bHRdIHByb2ZpbGUgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIEdJVkVOXG4gICAgICBwcmVwYXJlQ3JlZHMoe1xuICAgICAgICBmYWtlU3RzLFxuICAgICAgICBjcmVkZW50aWFsczoge1xuICAgICAgICAgIGFzc3VtZXI6IHsgYXdzX2FjY2Vzc19rZXlfaWQ6ICdhc3N1bWVyJywgJGFjY291bnQ6ICcyMjIyMicgfSxcbiAgICAgICAgICBhc3N1bWFibGU6IHtcbiAgICAgICAgICAgIHJvbGVfYXJuOiAnYXJuOmF3czppYW06OjEyMzU2Nzg5MDEyOnJvbGUvQXNzdW1hYmxlJyxcbiAgICAgICAgICAgIHNvdXJjZV9wcm9maWxlOiAnYXNzdW1lcicsXG4gICAgICAgICAgICAkYWNjb3VudDogJzIyMjIyJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAncHJvZmlsZSBhc3N1bWFibGUnOiB7IHJlZ2lvbjogJ2V1LWJsYS01JyB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSgnYXNzdW1hYmxlJyk7XG5cbiAgICAgIC8vIFRIRU5cbiAgICAgIGV4cGVjdCgoYXdhaXQgcHJvdmlkZXIuZGVmYXVsdEFjY291bnQoKSk/LmFjY291bnRJZCkudG9FcXVhbCh1bmlxKCcyMjIyMicpKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHByb3ZpZGVyc0Zvck1mYSA9IFtcbiAgICAgICgoKSA9PiBwcm92aWRlckZyb21Qcm9maWxlKCdtZmEtcm9sZScpKSxcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIC8vIFRoZSBwcm9maWxlIGlzIG5vdCBwYXNzZWQgZXhwbGljaXRseS4gU2hvdWxkIGJlIHBpY2tlZCBmcm9tIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZVxuICAgICAgICBwcm9jZXNzLmVudi5BV1NfUFJPRklMRSA9ICdtZmEtcm9sZSc7XG4gICAgICAgIC8vIEF3YWl0aW5nIHRvIG1ha2Ugc3VyZSB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgb25seSBkZWxldGVkIGFmdGVyIGl0J3MgdXNlZFxuICAgICAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IFNka1Byb3ZpZGVyLndpdGhBd3NDbGlDb21wYXRpYmxlRGVmYXVsdHMoeyBsb2dnZXI6IGNvbnNvbGUgfSk7XG4gICAgICAgIGRlbGV0ZSBwcm9jZXNzLmVudi5BV1NfUFJPRklMRTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShwcm92aWRlcik7XG4gICAgICB9KSxcbiAgICBdO1xuXG4gICAgdGVzdC5lYWNoKHByb3ZpZGVyc0Zvck1mYSkoJ21mYV9zZXJpYWwgaW4gcHJvZmlsZSB3aWxsIGFzayB1c2VyIGZvciB0b2tlbicsIGFzeW5jIChtZXRhUHJvdmlkZXI6ICgpID0+IFByb21pc2U8U2RrUHJvdmlkZXI+KSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgY29uc3QgbW9ja1Byb21wdCA9IGplc3Quc3B5T24ocHJvbXB0bHksICdwcm9tcHQnKS5tb2NrUmVzb2x2ZWRWYWx1ZSgnMTIzNCcpO1xuXG4gICAgICBwcmVwYXJlQ3JlZHMoe1xuICAgICAgICBmYWtlU3RzLFxuICAgICAgICBjcmVkZW50aWFsczoge1xuICAgICAgICAgIGFzc3VtZXI6IHsgYXdzX2FjY2Vzc19rZXlfaWQ6ICdhc3N1bWVyJywgJGFjY291bnQ6ICc2NjY2NicgfSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgJ2RlZmF1bHQnOiB7IHJlZ2lvbjogJ2V1LWJsYS01JyB9LFxuICAgICAgICAgICdwcm9maWxlIGFzc3VtZXInOiB7IHJlZ2lvbjogJ3VzLWVhc3QtMicgfSxcbiAgICAgICAgICAncHJvZmlsZSBtZmEtcm9sZSc6IHtcbiAgICAgICAgICAgIHJvbGVfYXJuOiAnYXJuOmF3czppYW06OjY2NjY2OnJvbGUvQXNzdW1hYmxlJyxcbiAgICAgICAgICAgIHNvdXJjZV9wcm9maWxlOiAnYXNzdW1lcicsXG4gICAgICAgICAgICBtZmFfc2VyaWFsOiAnYXJuOmF3czppYW06OmFjY291bnQ6bWZhL3VzZXInLFxuICAgICAgICAgICAgJGFjY291bnQ6ICc2NjY2NicsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IG1ldGFQcm92aWRlcigpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBjb25zdCBzZGsgPSAoYXdhaXQgcHJvdmlkZXIuZm9yRW52aXJvbm1lbnQoZW52KHVuaXEoJzY2NjY2JykpLCBNb2RlLkZvclJlYWRpbmcpKS5zZGs7XG4gICAgICBleHBlY3QoKGF3YWl0IHNkay5jdXJyZW50QWNjb3VudCgpKS5hY2NvdW50SWQpLnRvRXF1YWwodW5pcSgnNjY2NjYnKSk7XG4gICAgICBleHBlY3QobW9ja1NUU0NsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kV2l0aChBc3N1bWVSb2xlQ29tbWFuZCwge1xuICAgICAgICBSb2xlQXJuOiAnYXJuOmF3czppYW06OjY2NjY2OnJvbGUvQXNzdW1hYmxlJyxcbiAgICAgICAgU2VyaWFsTnVtYmVyOiAnYXJuOmF3czppYW06OmFjY291bnQ6bWZhL3VzZXInLFxuICAgICAgICBUb2tlbkNvZGU6ICcxMjM0JyxcbiAgICAgICAgUm9sZVNlc3Npb25OYW1lOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBNYWtlIHN1cmUgdGhlIE1GQSBtb2NrIHdhcyBjYWxsZWQgZHVyaW5nIHRoaXMgdGVzdCwgb25seSBvbmNlXG4gICAgICAvLyAoQ3JlZGVudGlhbHMgbmVlZCB0byByZW1haW4gY2FjaGVkKVxuICAgICAgZXhwZWN0KG1vY2tQcm9tcHQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gRm9yIERlZmF1bHRTeW50aGVzaXMgd2Ugd2lsbCBkbyBhbiBhc3N1bWUtcm9sZSBhZnRlciBoYXZpbmcgZ290dGVuIGJhc2UgY3JlZGVudGlhbHNcbiAgZGVzY3JpYmUoJ3doZW4gQ0RLIEFzc3VtZVJvbGVzJywgKCkgPT4ge1xuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgLy8gQWxsIHRoZXNlIHRlc3RzIHNoYXJlIHRoYXQgJ2Fybjphd3M6cm9sZScgaXMgYSByb2xlIGludG8gYWNjb3VudCA4ODg4OCB3aGljaCBjYW4gYmUgYXNzdW1lZCBmcm9tIDExMTExXG4gICAgICBmYWtlU3RzLnJlZ2lzdGVyUm9sZSh1bmlxKCc4ODg4OCcpLCAnYXJuOmF3czpyb2xlJywgeyBhbGxvd2VkQWNjb3VudHM6IFt1bmlxKCcxMTExMScpXSB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2Vycm9yIHdlIGdldCBmcm9tIGFzc3VtaW5nIGEgcm9sZSBpcyB1c2VmdWwnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgZmFrZVN0cyxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgZGVmYXVsdDogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2ZvbycgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgbW9ja1NUU0NsaWVudC5vbihBc3N1bWVSb2xlQ29tbWFuZCkucmVqZWN0c09uY2UoJ2RvZXNub3RleGlzdC5yb2xlLmFybicpO1xuICAgICAgY29uc3QgcHJvdmlkZXIgPSBhd2FpdCBwcm92aWRlckZyb21Qcm9maWxlKHVuZGVmaW5lZCk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHByb21pc2UgPSBleGVyY2lzZUNyZWRlbnRpYWxzKHByb3ZpZGVyLCBlbnYodW5pcSgnODg4ODgnKSksIE1vZGUuRm9yUmVhZGluZywge1xuICAgICAgICBhc3N1bWVSb2xlQXJuOiAnZG9lc25vdGV4aXN0LnJvbGUuYXJuJyxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBUSEVOIC0gZXJyb3IgbWVzc2FnZSBjb250YWlucyBib3RoIGEgaGVscGZ1bCBoaW50IGFuZCB0aGUgdW5kZXJseWluZyBBc3N1bWVSb2xlIG1lc3NhZ2VcbiAgICAgIGF3YWl0IGV4cGVjdChwcm9taXNlKS5yZWplY3RzLnRvVGhyb3coJyhyZSktYm9vdHN0cmFwIHRoZSBlbnZpcm9ubWVudCcpO1xuICAgICAgYXdhaXQgZXhwZWN0KHByb21pc2UpLnJlamVjdHMudG9UaHJvdygnZG9lc25vdGV4aXN0LnJvbGUuYXJuJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhc3N1bWluZyBhIHJvbGUgc2FuaXRpemVzIHRoZSB1c2VybmFtZSBpbnRvIHRoZSBzZXNzaW9uIG5hbWUnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgLy8gZmFrZVN0cyxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgZGVmYXVsdDogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2ZvbycsICRhY2NvdW50OiAnMTExMTEnIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgd2l0aE1vY2tlZChvcywgJ3VzZXJJbmZvJywgYXN5bmMgKHVzZXJJbmZvKSA9PiB7XG4gICAgICAgIHVzZXJJbmZvLm1vY2tSZXR1cm5WYWx1ZSh7IHVzZXJuYW1lOiAnc2vDpWwnLCB1aWQ6IDEsIGdpZDogMSwgaG9tZWRpcjogJy9oZXJlJywgc2hlbGw6ICcvYmluL3NoJyB9KTtcblxuICAgICAgICAvLyBXSEVOXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgICAgIGNvbnN0IHNkayA9IChcbiAgICAgICAgICBhd2FpdCBwcm92aWRlci5mb3JFbnZpcm9ubWVudChlbnYodW5pcSgnODg4ODgnKSksIE1vZGUuRm9yUmVhZGluZywgeyBhc3N1bWVSb2xlQXJuOiAnYXJuOmF3czpyb2xlJyB9KVxuICAgICAgICApLnNkayBhcyBTREs7XG4gICAgICAgIGF3YWl0IHNkay5jdXJyZW50QWNjb3VudCgpO1xuXG4gICAgICAgIC8vIFRIRU5cbiAgICAgICAgZXhwZWN0KG1vY2tTVFNDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZFdpdGgoQXNzdW1lUm9sZUNvbW1hbmQsIHtcbiAgICAgICAgICBSb2xlQXJuOiAnYXJuOmF3czpyb2xlJyxcbiAgICAgICAgICBSb2xlU2Vzc2lvbk5hbWU6ICdhd3MtY2RrLXNrQGwnLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2Vzc2lvbiB0YWdzIGNhbiBiZSBwYXNzZWQgd2hlbiBhc3N1bWluZyBhIHJvbGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgZmFrZVN0cyxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgZGVmYXVsdDogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2ZvbycsICRhY2NvdW50OiAnMTExMTEnIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgd2l0aE1vY2tlZChvcywgJ3VzZXJJbmZvJywgYXN5bmMgKHVzZXJJbmZvKSA9PiB7XG4gICAgICAgIHVzZXJJbmZvLm1vY2tSZXR1cm5WYWx1ZSh7IHVzZXJuYW1lOiAnc2vDpWwnLCB1aWQ6IDEsIGdpZDogMSwgaG9tZWRpcjogJy9oZXJlJywgc2hlbGw6ICcvYmluL3NoJyB9KTtcblxuICAgICAgICAvLyBXSEVOXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgICAgIGNvbnN0IHNkayA9IChcbiAgICAgICAgICBhd2FpdCBwcm92aWRlci5mb3JFbnZpcm9ubWVudChlbnYodW5pcSgnODg4ODgnKSksIE1vZGUuRm9yUmVhZGluZywge1xuICAgICAgICAgICAgYXNzdW1lUm9sZUFybjogJ2Fybjphd3M6cm9sZScsXG4gICAgICAgICAgICBhc3N1bWVSb2xlRXh0ZXJuYWxJZDogJ2JydWgnLFxuICAgICAgICAgICAgYXNzdW1lUm9sZUFkZGl0aW9uYWxPcHRpb25zOiB7XG4gICAgICAgICAgICAgIFRhZ3M6IFt7IEtleTogJ0RlcGFydG1lbnQnLCBWYWx1ZTogJ0VuZ2luZWVyaW5nJyB9XSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSlcbiAgICAgICAgKS5zZGsgYXMgU0RLO1xuICAgICAgICBhd2FpdCBzZGsuY3VycmVudEFjY291bnQoKTtcblxuICAgICAgICAvLyBUSEVOXG4gICAgICAgIGV4cGVjdChtb2NrU1RTQ2xpZW50KS50b0hhdmVSZWNlaXZlZENvbW1hbmRXaXRoKEFzc3VtZVJvbGVDb21tYW5kLCB7XG4gICAgICAgICAgVGFnczogW3sgS2V5OiAnRGVwYXJ0bWVudCcsIFZhbHVlOiAnRW5naW5lZXJpbmcnIH1dLFxuICAgICAgICAgIFRyYW5zaXRpdmVUYWdLZXlzOiBbJ0RlcGFydG1lbnQnXSxcbiAgICAgICAgICBSb2xlQXJuOiAnYXJuOmF3czpyb2xlJyxcbiAgICAgICAgICBFeHRlcm5hbElkOiAnYnJ1aCcsXG4gICAgICAgICAgUm9sZVNlc3Npb25OYW1lOiAnYXdzLWNkay1za0BsJyxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2Fzc3VtaW5nIGEgcm9sZSBkb2VzIG5vdCBmYWlsIHdoZW4gT1MgdXNlcm5hbWUgY2Fubm90IGJlIHJlYWQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgLy8gZmFrZVN0cyxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgZGVmYXVsdDogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2ZvbycsICRhY2NvdW50OiAnMTExMTEnIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgd2l0aE1vY2tlZChvcywgJ3VzZXJJbmZvJywgYXN5bmMgKHVzZXJJbmZvKSA9PiB7XG4gICAgICAgIHVzZXJJbmZvLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7XG4gICAgICAgICAgLy8gU3lzdGVtRXJyb3IgdGhyb3duIGFzIGRvY3VtZW50ZWQ6IGh0dHBzOi8vbm9kZWpzLm9yZy9kb2NzL2xhdGVzdC12MTYueC9hcGkvb3MuaHRtbCNvc3VzZXJpbmZvb3B0aW9uc1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3lzdGVtRXJyb3Igb24gTGludXg6IHV2X29zX2dldF9wYXNzd2QgcmV0dXJuZWQgRU5PRU5ULiBTZWUgIzE5NDAxIGlzc3VlLicpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXSEVOXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgICAgIGF3YWl0IGV4ZXJjaXNlQ3JlZGVudGlhbHMocHJvdmlkZXIsIGVudih1bmlxKCc4ODg4OCcpKSwgTW9kZS5Gb3JSZWFkaW5nLCB7IGFzc3VtZVJvbGVBcm46ICdhcm46YXdzOnJvbGUnIH0pO1xuXG4gICAgICAgIC8vIFRIRU5cbiAgICAgICAgZXhwZWN0KG1vY2tTVFNDbGllbnQpLnRvSGF2ZVJlY2VpdmVkQ29tbWFuZFdpdGgoQXNzdW1lUm9sZUNvbW1hbmQsIHtcbiAgICAgICAgICBSb2xlQXJuOiAnYXJuOmF3czpyb2xlJyxcbiAgICAgICAgICBSb2xlU2Vzc2lvbk5hbWU6ICdhd3MtY2RrLW5vbmFtZScsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdldmVuIGlmIGN1cnJlbnQgY3JlZGVudGlhbHMgYXJlIGZvciB0aGUgd3JvbmcgYWNjb3VudCwgd2Ugd2lsbCBzdGlsbCB1c2UgdGhlbSB0byBBc3N1bWVSb2xlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gR0lWRU5cbiAgICAgIHByZXBhcmVDcmVkcyh7XG4gICAgICAgIC8vIGZha2VTdHMsXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgIGRlZmF1bHQ6IHsgYXdzX2FjY2Vzc19rZXlfaWQ6ICdmb28nLCAkYWNjb3VudDogJzExMTExJyB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHByb3ZpZGVyRnJvbVByb2ZpbGUodW5kZWZpbmVkKTtcblxuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3Qgc2RrID0gKFxuICAgICAgICBhd2FpdCBwcm92aWRlci5mb3JFbnZpcm9ubWVudChlbnYodW5pcSgnODg4ODgnKSksIE1vZGUuRm9yUmVhZGluZywgeyBhc3N1bWVSb2xlQXJuOiAnYXJuOmF3czpyb2xlJyB9KVxuICAgICAgKS5zZGsgYXMgU0RLO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QoKGF3YWl0IHNkay5jdXJyZW50QWNjb3VudCgpKS5hY2NvdW50SWQpLnRvRXF1YWwodW5pcSgnODg4ODgnKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdpZiBBc3N1bWVSb2xlIGZhaWxzIGJ1dCBjdXJyZW50IGNyZWRlbnRpYWxzIGFyZSBmb3IgdGhlIHJpZ2h0IGFjY291bnQsIHdlIHdpbGwgc3RpbGwgdXNlIHRoZW0nLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgLy8gZmFrZVN0cyxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgZGVmYXVsdDogeyBhd3NfYWNjZXNzX2tleV9pZDogJ2ZvbycsICRhY2NvdW50OiAnODg4ODgnIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgICAvLyBXSEVOIC0gYXNzdW1lUm9sZSBmYWlscyBiZWNhdXNlIHRoZSByb2xlIGNhbiBvbmx5IGJlIGFzc3VtZWQgZnJvbSBhY2NvdW50IDExMTExXG4gICAgICBjb25zdCBzZGsgPSAoXG4gICAgICAgIGF3YWl0IHByb3ZpZGVyLmZvckVudmlyb25tZW50KGVudih1bmlxKCc4ODg4OCcpKSwgTW9kZS5Gb3JSZWFkaW5nLCB7IGFzc3VtZVJvbGVBcm46ICdhcm46YXdzOnJvbGUnIH0pXG4gICAgICApLnNkayBhcyBTREs7XG5cbiAgICAgIC8vIFRIRU5cbiAgICAgIGV4cGVjdCgoYXdhaXQgc2RrLmN1cnJlbnRBY2NvdW50KCkpLmFjY291bnRJZCkudG9FcXVhbCh1bmlxKCc4ODg4OCcpKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2lmIEFzc3VtZVJvbGUgZmFpbHMgYmVjYXVzZSBvZiBFeHBpcmVkVG9rZW4sIHRoZW4gZmFpbCBjb21wbGV0ZWx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gR0lWRU5cbiAgICAgIHByZXBhcmVDcmVkcyh7XG4gICAgICAgIC8vIGZha2VTdHMsXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgIGRlZmF1bHQ6IHsgYXdzX2FjY2Vzc19rZXlfaWQ6ICdmb28nLCAkYWNjb3VudDogJzg4ODg4JyB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcignVG9vIGxhdGUnKTtcbiAgICAgIGVycm9yLm5hbWUgPSAnRXhwaXJlZFRva2VuJztcbiAgICAgIG1vY2tTVFNDbGllbnQub24oQXNzdW1lUm9sZUNvbW1hbmQpLnJlamVjdHNPbmNlKGVycm9yKTtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgICAvLyBXSEVOIC0gYXNzdW1lUm9sZSBmYWlscyB3aXRoIGEgc3BlY2lmaWMgZXJyb3JcbiAgICAgIGF3YWl0IGV4cGVjdChleGVyY2lzZUNyZWRlbnRpYWxzKHByb3ZpZGVyLCBlbnYodW5pcSgnODg4ODgnKSksIE1vZGUuRm9yUmVhZGluZywgeyBhc3N1bWVSb2xlQXJuOiAnPEZBSUw6RXhwaXJlZFRva2VuPicgfSkpXG4gICAgICAgIC5yZWplY3RzLnRvVGhyb3coZXJyb3IpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUGx1Z2lucycsICgpID0+IHtcbiAgICB0ZXN0KCdkb2VzIG5vdCB1c2UgcGx1Z2lucyBpZiBjdXJyZW50IGNyZWRlbnRpYWxzIGFyZSBmb3IgZXhwZWN0ZWQgYWNjb3VudCcsIGFzeW5jICgpID0+IHtcbiAgICAgIHByZXBhcmVDcmVkcyh7XG4gICAgICAgIGZha2VTdHMsXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgIGRlZmF1bHQ6IHsgYXdzX2FjY2Vzc19rZXlfaWQ6ICdmb28nLCAkYWNjb3VudDogJzExMTExJyB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHByb3ZpZGVyRnJvbVByb2ZpbGUodW5kZWZpbmVkKTtcbiAgICAgIGF3YWl0IGV4ZXJjaXNlQ3JlZGVudGlhbHMocHJvdmlkZXIsIGVudih1bmlxKCcxMTExMScpKSk7XG4gICAgICBleHBlY3QocGx1Z2luUXVlcmllZCkudG9FcXVhbChmYWxzZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCd1c2VzIHBsdWdpbiBmb3IgYWNjb3VudCA5OTk5OScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuICAgICAgYXdhaXQgZXhlcmNpc2VDcmVkZW50aWFscyhwcm92aWRlciwgZW52KHVuaXEoJzk5OTk5JykpKTtcbiAgICAgIGV4cGVjdChwbHVnaW5RdWVyaWVkKS50b0VxdWFsKHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY2FuIGFzc3VtZSByb2xlIHdpdGggY3JlZGVudGlhbHMgZnJvbSBwbHVnaW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICBmYWtlU3RzLnJlZ2lzdGVyUm9sZSh1bmlxKCc5OTk5OScpLCAnYXJuOmF3czppYW06Ojk5OTk5OnJvbGUvQXNzdW1hYmxlJyk7XG5cbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuICAgICAgYXdhaXQgZXhlcmNpc2VDcmVkZW50aWFscyhwcm92aWRlciwgZW52KHVuaXEoJzk5OTk5JykpLCBNb2RlLkZvclJlYWRpbmcsIHtcbiAgICAgICAgYXNzdW1lUm9sZUFybjogJ2Fybjphd3M6aWFtOjo5OTk5OTpyb2xlL0Fzc3VtYWJsZScsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHBsdWdpblF1ZXJpZWQpLnRvRXF1YWwodHJ1ZSk7XG4gICAgICBleHBlY3QobW9ja1NUU0NsaWVudCkudG9IYXZlUmVjZWl2ZWRDb21tYW5kV2l0aChBc3N1bWVSb2xlQ29tbWFuZCwge1xuICAgICAgICBSb2xlQXJuOiAnYXJuOmF3czppYW06Ojk5OTk5OnJvbGUvQXNzdW1hYmxlJyxcbiAgICAgICAgUm9sZVNlc3Npb25OYW1lOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXZlbiBpZiBBc3N1bWVSb2xlIGZhaWxzIGJ1dCBjdXJyZW50IGNyZWRlbnRpYWxzIGFyZSBmcm9tIGEgcGx1Z2luLCB3ZSB3aWxsIHN0aWxsIHVzZSB0aGVtJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcHJvdmlkZXIgPSBhd2FpdCBwcm92aWRlckZyb21Qcm9maWxlKHVuZGVmaW5lZCk7XG4gICAgICBjb25zdCBzZGsgPSAoXG4gICAgICAgIGF3YWl0IHByb3ZpZGVyLmZvckVudmlyb25tZW50KGVudih1bmlxKCc5OTk5OScpKSwgTW9kZS5Gb3JSZWFkaW5nLCB7IGFzc3VtZVJvbGVBcm46ICdkb2VzOm5vdDpleGlzdCcgfSlcbiAgICAgICkuc2RrO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QoKGF3YWl0IHNkay5jdXJyZW50QWNjb3VudCgpKS5hY2NvdW50SWQpLnRvRXF1YWwodW5pcSgnOTk5OTknKSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdwbHVnaW5zIGFyZSBzdGlsbCBxdWVyaWVkIGV2ZW4gaWYgY3VycmVudCBjcmVkZW50aWFscyBhcmUgZXhwaXJlZCAob3Igb3RoZXJ3aXNlIGludmFsaWQpJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gR0lWRU5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IGFjY291bnQgPSB1bmlxKCcxMTExMScpO1xuICAgICAgbW9ja1NUU0NsaWVudC5vbihHZXRDYWxsZXJJZGVudGl0eUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgQWNjb3VudDogYWNjb3VudCxcbiAgICAgICAgQXJuOiAnYXJuOmF3cy1oZXJlJyxcbiAgICAgIH0pO1xuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgY3JlZGVudGlhbHM6IHtcbiAgICAgICAgICBkZWZhdWx0OiB7IGF3c19hY2Nlc3Nfa2V5X2lkOiBgJHt1aWR9YWtpZGAsICRhY2NvdW50OiAnMTExMTEnLCAkZmFrZVN0c09wdGlvbnM6IHsgcGFydGl0aW9uOiAnYXdzLWhlcmUnIH0gfSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgZGVmYXVsdDogeyByZWdpb246ICdldS1ibGEtNScgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgcHJvY2Vzcy5lbnYuQVdTX0FDQ0VTU19LRVlfSUQgPSBgJHt1aWR9YWtpZGA7XG4gICAgICBwcm9jZXNzLmVudi5BV1NfU0VDUkVUX0FDQ0VTU19LRVkgPSAnc2Vrcml0JztcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgICAvLyBXSEVOXG4gICAgICBhd2FpdCBleGVyY2lzZUNyZWRlbnRpYWxzKHByb3ZpZGVyLCBlbnYodW5pcSgnOTk5OTknKSkpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QocGx1Z2luUXVlcmllZCkudG9FcXVhbCh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3N1cHBvcnQgZm9yIGNyZWRlbnRpYWxfc291cmNlJywgKCkgPT4ge1xuICAgIHRlc3QoJ2NhbiBhc3N1bWUgcm9sZSB3aXRoIGVjcyBjcmVkZW50aWFscycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBjYWxscyA9IGplc3Quc3B5T24oY29uc29sZSwgJ2RlYnVnJyk7XG4gICAgICBwcmVwYXJlQ3JlZHMoe1xuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAncHJvZmlsZSBlY3MnOiB7XG4gICAgICAgICAgICByb2xlX2FybjogJ2Fybjphd3M6aWFtOjoxMjM1Njc4OTAxMjpyb2xlL0Fzc3VtYWJsZScsXG4gICAgICAgICAgICBjcmVkZW50aWFsX3NvdXJjZTogJ0Vjc0NvbnRhaW5lcicsXG4gICAgICAgICAgICAkYWNjb3VudDogJzIyMjIyJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSgnZWNzJyk7XG4gICAgICBhd2FpdCBwcm92aWRlci5kZWZhdWx0QWNjb3VudCgpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QoY2FsbHMubW9jay5jYWxscykudG9Db250YWluRXF1YWwoW1xuICAgICAgICAnQGF3cy1zZGsvY3JlZGVudGlhbC1wcm92aWRlci1pbmkgLSBmaW5kaW5nIGNyZWRlbnRpYWwgcmVzb2x2ZXIgdXNpbmcgcHJvZmlsZT1bZWNzXScsXG4gICAgICBdKTtcbiAgICAgIGV4cGVjdChjYWxscy5tb2NrLmNhbGxzKS50b0NvbnRhaW5FcXVhbChbJ0Bhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItaW5pIC0gY3JlZGVudGlhbF9zb3VyY2UgaXMgRWNzQ29udGFpbmVyJ10pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnY2FuIGFzc3VtZSByb2xlIHdpdGggZWMyIGNyZWRlbnRpYWxzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gR0lWRU5cbiAgICAgIGNvbnN0IGNhbGxzID0gamVzdC5zcHlPbihjb25zb2xlLCAnZGVidWcnKTtcbiAgICAgIHByZXBhcmVDcmVkcyh7XG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICdwcm9maWxlIGVjcyc6IHtcbiAgICAgICAgICAgIHJvbGVfYXJuOiAnYXJuOmF3czppYW06OjEyMzU2Nzg5MDEyOnJvbGUvQXNzdW1hYmxlJyxcbiAgICAgICAgICAgIGNyZWRlbnRpYWxfc291cmNlOiAnRWMySW5zdGFuY2VNZXRhZGF0YScsXG4gICAgICAgICAgICAkYWNjb3VudDogJzIyMjIyJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSgnZWNzJyk7XG4gICAgICBhd2FpdCBwcm92aWRlci5kZWZhdWx0QWNjb3VudCgpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QoY2FsbHMubW9jay5jYWxscykudG9Db250YWluRXF1YWwoW1xuICAgICAgICAnQGF3cy1zZGsvY3JlZGVudGlhbC1wcm92aWRlci1pbmkgLSBmaW5kaW5nIGNyZWRlbnRpYWwgcmVzb2x2ZXIgdXNpbmcgcHJvZmlsZT1bZWNzXScsXG4gICAgICBdKTtcbiAgICAgIGV4cGVjdChjYWxscy5tb2NrLmNhbGxzKS50b0NvbnRhaW5FcXVhbChbXG4gICAgICAgICdAYXdzLXNkay9jcmVkZW50aWFsLXByb3ZpZGVyLWluaSAtIGNyZWRlbnRpYWxfc291cmNlIGlzIEVjMkluc3RhbmNlTWV0YWRhdGEnLFxuICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjYW4gYXNzdW1lIHJvbGUgd2l0aCBlbnYgY3JlZGVudGlhbHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBHSVZFTlxuICAgICAgY29uc3QgY2FsbHMgPSBqZXN0LnNweU9uKGNvbnNvbGUsICdkZWJ1ZycpO1xuICAgICAgcHJlcGFyZUNyZWRzKHtcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgJ3Byb2ZpbGUgZWNzJzoge1xuICAgICAgICAgICAgcm9sZV9hcm46ICdhcm46YXdzOmlhbTo6MTIzNTY3ODkwMTI6cm9sZS9Bc3N1bWFibGUnLFxuICAgICAgICAgICAgY3JlZGVudGlhbF9zb3VyY2U6ICdFbnZpcm9ubWVudCcsXG4gICAgICAgICAgICAkYWNjb3VudDogJzIyMjIyJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSgnZWNzJyk7XG4gICAgICBhd2FpdCBwcm92aWRlci5kZWZhdWx0QWNjb3VudCgpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QoY2FsbHMubW9jay5jYWxscykudG9Db250YWluRXF1YWwoW1xuICAgICAgICAnQGF3cy1zZGsvY3JlZGVudGlhbC1wcm92aWRlci1pbmkgLSBmaW5kaW5nIGNyZWRlbnRpYWwgcmVzb2x2ZXIgdXNpbmcgcHJvZmlsZT1bZWNzXScsXG4gICAgICBdKTtcbiAgICAgIGV4cGVjdChjYWxscy5tb2NrLmNhbGxzKS50b0NvbnRhaW5FcXVhbChbJ0Bhd3Mtc2RrL2NyZWRlbnRpYWwtcHJvdmlkZXItaW5pIC0gY3JlZGVudGlhbF9zb3VyY2UgaXMgRW52aXJvbm1lbnQnXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdhc3N1bWUgZmFpbHMgd2l0aCB1bnN1cHBvcnRlZCBjcmVkZW50aWFsX3NvdXJjZScsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIEdJVkVOXG4gICAgICBwcmVwYXJlQ3JlZHMoe1xuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAncHJvZmlsZSBlY3MnOiB7XG4gICAgICAgICAgICByb2xlX2FybjogJ2Fybjphd3M6aWFtOjoxMjM1Njc4OTAxMjpyb2xlL0Fzc3VtYWJsZScsXG4gICAgICAgICAgICBjcmVkZW50aWFsX3NvdXJjZTogJ3Vuc3VwcG9ydGVkJyxcbiAgICAgICAgICAgICRhY2NvdW50OiAnMjIyMjInLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSgnZWNzJyk7XG5cbiAgICAgIC8vIFdIRU5cbiAgICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCBwcm92aWRlci5kZWZhdWx0QWNjb3VudCgpO1xuXG4gICAgICAvLyBUSEVOXG4gICAgICBleHBlY3QoYWNjb3VudD8uYWNjb3VudElkKS50b0VxdWFsKHVuZGVmaW5lZCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHRlc3QoJ2RlZmF1bHRBY2NvdW50IHJldHVybnMgdW5kZWZpbmVkIGlmIFNUUyBjYWxsIGZhaWxzJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIEdJVkVOXG4gICAgbW9ja1NUU0NsaWVudC5vbihBc3N1bWVSb2xlQ29tbWFuZCkucmVqZWN0c09uY2UoJ09vcHMsIGJhZCBzZWtyaXQnKTtcblxuICAgIC8vIFdIRU5cbiAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHByb3ZpZGVyRnJvbVByb2ZpbGUodW5kZWZpbmVkKTtcblxuICAgIC8vIFRIRU5cbiAgICBhd2FpdCBleHBlY3QocHJvdmlkZXIuZGVmYXVsdEFjY291bnQoKSkucmVzb2x2ZXMudG9CZSh1bmRlZmluZWQpO1xuICB9KTtcblxuICB0ZXN0KCdkZWZhdWx0QWNjb3VudCByZXR1cm5zIHVuZGVmaW5lZCwgZXZlbnQgaWYgU1RTIGNhbGwgZmFpbHMgd2l0aCBFeHBpcmVkVG9rZW4nLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gR0lWRU5cbiAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcignVG9vIGxhdGUnKTtcbiAgICBlcnJvci5uYW1lID0gJ0V4cGlyZWRUb2tlbic7XG4gICAgbW9ja1NUU0NsaWVudC5vbihBc3N1bWVSb2xlQ29tbWFuZCkucmVqZWN0c09uY2UoZXJyb3IpO1xuXG4gICAgLy8gV0hFTlxuICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcHJvdmlkZXJGcm9tUHJvZmlsZSh1bmRlZmluZWQpO1xuXG4gICAgLy8gVEhFTlxuICAgIGF3YWl0IGV4cGVjdChwcm92aWRlci5kZWZhdWx0QWNjb3VudCgpKS5yZXNvbHZlcy50b0JlKHVuZGVmaW5lZCk7XG4gIH0pO1xufSk7XG5cbnRlc3QoJ2RlZmF1bHQgdXNlcmFnZW50IGlzIHJlYXNvbmFibGUnLCAoKSA9PiB7XG4gIGV4cGVjdChkZWZhdWx0Q2xpVXNlckFnZW50KCkpLnRvQ29udGFpbignYXdzLWNkay8nKTtcbn0pO1xuXG4vKipcbiAqIFVzZSBvYmplY3QgaGFja2VyeSB0byBnZXQgdGhlIGNyZWRlbnRpYWxzIG91dCBvZiB0aGUgU0RLIG9iamVjdFxuICovXG5mdW5jdGlvbiBzZGtDb25maWcoc2RrOiBTREspOiBDb25maWd1cmF0aW9uT3B0aW9ucyB7XG4gIHJldHVybiAoc2RrIGFzIGFueSkuY29uZmlnO1xufVxuXG4vKipcbiAqIEZpeHR1cmUgZm9yIFNESyBhdXRoIGZvciB0aGlzIHRlc3Qgc3VpdGVcbiAqXG4gKiBIYXMga25vd2xlZGdlIG9mIHRoZSBjYWNoZSBidXN0ZXIsIHdpbGwgd3JpdGUgcHJvcGVyIGZha2UgY29uZmlnIGZpbGVzIGFuZFxuICogcmVnaXN0ZXIgdXNlcnMgYW5kIHJvbGVzIGluIEZha2VTdHMgYXQgdGhlIHNhbWUgdGltZS5cbiAqL1xuZnVuY3Rpb24gcHJlcGFyZUNyZWRzKG9wdGlvbnM6IFByZXBhcmVDcmVkc09wdGlvbnMpIHtcbiAgZnVuY3Rpb24gY29udmVydFNlY3Rpb25zKHNlY3Rpb25zPzogUmVjb3JkPHN0cmluZywgUHJvZmlsZVVzZXIgfCBQcm9maWxlUm9sZT4pIHtcbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtwcm9maWxlLCB1c2VyXSBvZiBPYmplY3QuZW50cmllcyhzZWN0aW9ucyA/PyB7fSkpIHtcbiAgICAgIHJldC5wdXNoKGBbJHtwcm9maWxlfV1gKTtcblxuICAgICAgaWYgKGlzUHJvZmlsZVJvbGUodXNlcikpIHtcbiAgICAgICAgcmV0LnB1c2goYHJvbGVfYXJuPSR7dXNlci5yb2xlX2Fybn1gKTtcbiAgICAgICAgaWYgKCdzb3VyY2VfcHJvZmlsZScgaW4gdXNlcikge1xuICAgICAgICAgIHJldC5wdXNoKGBzb3VyY2VfcHJvZmlsZT0ke3VzZXIuc291cmNlX3Byb2ZpbGV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCdjcmVkZW50aWFsX3NvdXJjZScgaW4gdXNlcikge1xuICAgICAgICAgIHJldC5wdXNoKGBjcmVkZW50aWFsX3NvdXJjZT0ke3VzZXIuY3JlZGVudGlhbF9zb3VyY2V9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVzZXIubWZhX3NlcmlhbCkge1xuICAgICAgICAgIHJldC5wdXNoKGBtZmFfc2VyaWFsPSR7dXNlci5tZmFfc2VyaWFsfWApO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMuZmFrZVN0cz8ucmVnaXN0ZXJSb2xlKHVuaXEodXNlci4kYWNjb3VudCA/PyAnMDAwMDAnKSwgdXNlci5yb2xlX2Fybiwge1xuICAgICAgICAgIC4uLnVzZXIuJGZha2VTdHNPcHRpb25zLFxuICAgICAgICAgIGFsbG93ZWRBY2NvdW50czogdXNlci4kZmFrZVN0c09wdGlvbnM/LmFsbG93ZWRBY2NvdW50cz8ubWFwKHVuaXEpLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh1c2VyLmF3c19hY2Nlc3Nfa2V5X2lkKSB7XG4gICAgICAgICAgcmV0LnB1c2goYGF3c19hY2Nlc3Nfa2V5X2lkPSR7dW5pcSh1c2VyLmF3c19hY2Nlc3Nfa2V5X2lkKX1gKTtcbiAgICAgICAgICByZXQucHVzaCgnYXdzX3NlY3JldF9hY2Nlc3Nfa2V5PXNlY3JldCcpO1xuICAgICAgICAgIG9wdGlvbnMuZmFrZVN0cz8ucmVnaXN0ZXJVc2VyKFxuICAgICAgICAgICAgdW5pcSh1c2VyLiRhY2NvdW50ID8/ICcwMDAwMCcpLFxuICAgICAgICAgICAgdW5pcSh1c2VyLmF3c19hY2Nlc3Nfa2V5X2lkKSxcbiAgICAgICAgICAgIHVzZXIuJGZha2VTdHNPcHRpb25zLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHVzZXIucmVnaW9uKSB7XG4gICAgICAgIHJldC5wdXNoKGByZWdpb249JHt1c2VyLnJlZ2lvbn1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIGJvY2tmcyh7XG4gICAgJy9ob21lL21lLy5ieHQvY3JlZGVudGlhbHMnOiBjb252ZXJ0U2VjdGlvbnMob3B0aW9ucy5jcmVkZW50aWFscyksXG4gICAgJy9ob21lL21lLy5ieHQvY29uZmlnJzogY29udmVydFNlY3Rpb25zKG9wdGlvbnMuY29uZmlnKSxcbiAgfSk7XG5cbiAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyB0aGF0IHdlIHdhbnRcbiAgcHJvY2Vzcy5lbnYuQVdTX0NPTkZJR19GSUxFID0gYm9ja2ZzLnBhdGgoJy9ob21lL21lLy5ieHQvY29uZmlnJyk7XG4gIHByb2Nlc3MuZW52LkFXU19TSEFSRURfQ1JFREVOVElBTFNfRklMRSA9IGJvY2tmcy5wYXRoKCcvaG9tZS9tZS8uYnh0L2NyZWRlbnRpYWxzJyk7XG59XG5cbmludGVyZmFjZSBQcmVwYXJlQ3JlZHNPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdyaXRlIHRoZSBhd3MvY3JlZGVudGlhbHMgZmlsZVxuICAgKi9cbiAgcmVhZG9ubHkgY3JlZGVudGlhbHM/OiBSZWNvcmQ8c3RyaW5nLCBQcm9maWxlVXNlciB8IFByb2ZpbGVSb2xlPjtcblxuICAvKipcbiAgICogV3JpdGUgdGhlIGF3cy9jb25maWcgZmlsZVxuICAgKi9cbiAgcmVhZG9ubHkgY29uZmlnPzogUmVjb3JkPHN0cmluZywgUHJvZmlsZVVzZXIgfCBQcm9maWxlUm9sZT47XG5cbiAgLyoqXG4gICAqIElmIGdpdmVuLCBhZGQgdXNlcnMgdG8gRmFrZVNUU1xuICAgKi9cbiAgcmVhZG9ubHkgZmFrZVN0cz86IEZha2VTdHM7XG59XG5cbmludGVyZmFjZSBQcm9maWxlVXNlciB7XG4gIHJlYWRvbmx5IGF3c19hY2Nlc3Nfa2V5X2lkPzogc3RyaW5nO1xuICByZWFkb25seSAkYWNjb3VudD86IHN0cmluZztcbiAgcmVhZG9ubHkgcmVnaW9uPzogc3RyaW5nO1xuICByZWFkb25seSAkZmFrZVN0c09wdGlvbnM/OiBSZWdpc3RlclVzZXJPcHRpb25zO1xufVxuXG50eXBlIFByb2ZpbGVSb2xlID0ge1xuICByZWFkb25seSByb2xlX2Fybjogc3RyaW5nO1xuICByZWFkb25seSBtZmFfc2VyaWFsPzogc3RyaW5nO1xuICByZWFkb25seSAkYWNjb3VudDogc3RyaW5nO1xuICByZWFkb25seSByZWdpb24/OiBzdHJpbmc7XG4gIHJlYWRvbmx5ICRmYWtlU3RzT3B0aW9ucz86IFJlZ2lzdGVyUm9sZU9wdGlvbnM7XG59ICYgKHsgcmVhZG9ubHkgc291cmNlX3Byb2ZpbGU6IHN0cmluZyB9IHwgeyByZWFkb25seSBjcmVkZW50aWFsX3NvdXJjZTogc3RyaW5nIH0pO1xuXG5mdW5jdGlvbiBpc1Byb2ZpbGVSb2xlKHg6IFByb2ZpbGVVc2VyIHwgUHJvZmlsZVJvbGUpOiB4IGlzIFByb2ZpbGVSb2xlIHtcbiAgcmV0dXJuICdyb2xlX2FybicgaW4geDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvdmlkZXJGcm9tUHJvZmlsZShwcm9maWxlOiBzdHJpbmcgfCB1bmRlZmluZWQpIHtcbiAgcmV0dXJuIFNka1Byb3ZpZGVyLndpdGhBd3NDbGlDb21wYXRpYmxlRGVmYXVsdHMoeyBwcm9maWxlLCBsb2dnZXI6IGNvbnNvbGUgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV4ZXJjaXNlQ3JlZGVudGlhbHMocHJvdmlkZXI6IFNka1Byb3ZpZGVyLCBlOiBjeGFwaS5FbnZpcm9ubWVudCwgbW9kZTogTW9kZSA9IE1vZGUuRm9yUmVhZGluZyxcbiAgb3B0aW9ucz86IENyZWRlbnRpYWxzT3B0aW9ucykge1xuICBjb25zdCBzZGsgPSBhd2FpdCBwcm92aWRlci5mb3JFbnZpcm9ubWVudChlLCBtb2RlLCBvcHRpb25zKTtcbiAgYXdhaXQgc2RrLnNkay5jdXJyZW50QWNjb3VudCgpO1xufVxuIl19