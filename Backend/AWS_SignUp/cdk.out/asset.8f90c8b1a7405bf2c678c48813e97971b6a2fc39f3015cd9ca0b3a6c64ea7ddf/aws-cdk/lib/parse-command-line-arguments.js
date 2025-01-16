"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommandLineArguments = parseCommandLineArguments;
const helpers = require("./util/yargs-helpers");
// @ts-ignore TS6133
function parseCommandLineArguments(args) {
    return yargs
        .env('CDK')
        .usage('Usage: cdk -a <cdk-app> COMMAND')
        .option('app', {
        default: undefined,
        type: 'string',
        alias: 'a',
        desc: 'REQUIRED WHEN RUNNING APP: command-line for executing your app or a cloud assembly directory (e.g. "node bin/my-app.js"). Can also be specified in cdk.json or ~/.cdk.json',
        requiresArg: true,
    })
        .option('build', {
        default: undefined,
        type: 'string',
        desc: 'Command-line for a pre-synth build',
    })
        .option('context', {
        default: [],
        type: 'array',
        alias: 'c',
        desc: 'Add contextual string parameter (KEY=VALUE)',
        nargs: 1,
        requiresArg: true,
    })
        .option('plugin', {
        default: [],
        type: 'array',
        alias: 'p',
        desc: 'Name or path of a node package that extend the CDK features. Can be specified multiple times',
        nargs: 1,
        requiresArg: true,
    })
        .option('trace', {
        default: undefined,
        type: 'boolean',
        desc: 'Print trace for stack warnings',
    })
        .option('strict', {
        default: undefined,
        type: 'boolean',
        desc: 'Do not construct stacks with warnings',
    })
        .option('lookups', {
        default: true,
        type: 'boolean',
        desc: 'Perform context lookups (synthesis fails if this is disabled and context lookups need to be performed)',
    })
        .option('ignore-errors', {
        default: false,
        type: 'boolean',
        desc: 'Ignores synthesis errors, which will likely produce an invalid output',
    })
        .option('json', {
        default: false,
        type: 'boolean',
        alias: 'j',
        desc: 'Use JSON output instead of YAML when templates are printed to STDOUT',
    })
        .option('verbose', {
        default: false,
        type: 'boolean',
        alias: 'v',
        desc: 'Show debug logs (specify multiple times to increase verbosity)',
        count: true,
    })
        .option('debug', {
        default: false,
        type: 'boolean',
        desc: 'Debug the CDK app. Log additional information during synthesis, such as creation stack traces of tokens (sets CDK_DEBUG, will slow down synthesis)',
    })
        .option('profile', {
        default: undefined,
        type: 'string',
        desc: 'Use the indicated AWS profile as the default environment',
        requiresArg: true,
    })
        .option('proxy', {
        default: undefined,
        type: 'string',
        desc: 'Use the indicated proxy. Will read from HTTPS_PROXY environment variable if not specified',
        requiresArg: true,
    })
        .option('ca-bundle-path', {
        default: undefined,
        type: 'string',
        desc: 'Path to CA certificate to use when validating HTTPS requests. Will read from AWS_CA_BUNDLE environment variable if not specified',
        requiresArg: true,
    })
        .option('ec2creds', {
        default: undefined,
        type: 'boolean',
        alias: 'i',
        desc: 'Force trying to fetch EC2 instance credentials. Default: guess EC2 instance status',
    })
        .option('version-reporting', {
        default: undefined,
        type: 'boolean',
        desc: 'Include the "AWS::CDK::Metadata" resource in synthesized templates (enabled by default)',
    })
        .option('path-metadata', {
        default: undefined,
        type: 'boolean',
        desc: 'Include "aws:cdk:path" CloudFormation metadata for each resource (enabled by default)',
    })
        .option('asset-metadata', {
        default: undefined,
        type: 'boolean',
        desc: 'Include "aws:asset:*" CloudFormation metadata for resources that uses assets (enabled by default)',
    })
        .option('role-arn', {
        default: undefined,
        type: 'string',
        alias: 'r',
        desc: 'ARN of Role to use when invoking CloudFormation',
        requiresArg: true,
    })
        .option('staging', {
        default: true,
        type: 'boolean',
        desc: 'Copy assets to the output directory (use --no-staging to disable the copy of assets which allows local debugging via the SAM CLI to reference the original source files)',
    })
        .option('output', {
        default: undefined,
        type: 'string',
        alias: 'o',
        desc: 'Emits the synthesized cloud assembly into a directory (default: cdk.out)',
        requiresArg: true,
    })
        .option('notices', {
        default: undefined,
        type: 'boolean',
        desc: 'Show relevant notices',
    })
        .option('no-color', {
        default: false,
        type: 'boolean',
        desc: 'Removes colors and other style from console output',
    })
        .option('ci', {
        default: helpers.isCI(),
        type: 'boolean',
        desc: 'Force CI detection. If CI=true then logs will be sent to stdout instead of stderr',
    })
        .option('unstable', {
        default: [],
        type: 'array',
        desc: 'Opt in to unstable features. The flag indicates that the scope and API of a feature might still change. Otherwise the feature is generally production ready and fully supported. Can be specified multiple times.',
        nargs: 1,
        requiresArg: true,
    })
        .command(['list [STACKS..]', 'ls [STACKS..]'], 'Lists all stacks in the app', (yargs) => yargs
        .option('long', {
        default: false,
        type: 'boolean',
        alias: 'l',
        desc: 'Display environment information for each stack',
    })
        .option('show-dependencies', {
        default: false,
        type: 'boolean',
        alias: 'd',
        desc: 'Display stack dependency information for each stack',
    }))
        .command(['synthesize [STACKS..]', 'synth [STACKS..]'], 'Synthesizes and prints the CloudFormation template for this stack', (yargs) => yargs
        .option('exclusively', {
        default: undefined,
        type: 'boolean',
        alias: 'e',
        desc: "Only synthesize requested stacks, don't include dependencies",
    })
        .option('validation', {
        default: true,
        type: 'boolean',
        desc: 'After synthesis, validate stacks with the "validateOnSynth" attribute set (can also be controlled with CDK_VALIDATION)',
    })
        .option('quiet', {
        default: false,
        type: 'boolean',
        alias: 'q',
        desc: 'Do not output CloudFormation Template to stdout',
    }))
        .command('bootstrap [ENVIRONMENTS..]', 'Deploys the CDK toolkit stack into an AWS environment', (yargs) => yargs
        .option('bootstrap-bucket-name', {
        default: undefined,
        type: 'string',
        alias: ['b', 'toolkit-bucket-name'],
        desc: 'The name of the CDK toolkit bucket; bucket will be created and must not exist',
    })
        .option('bootstrap-kms-key-id', {
        default: undefined,
        type: 'string',
        desc: 'AWS KMS master key ID used for the SSE-KMS encryption',
        conflicts: 'bootstrap-customer-key',
    })
        .option('example-permissions-boundary', {
        default: undefined,
        type: 'boolean',
        alias: 'epb',
        desc: 'Use the example permissions boundary.',
        conflicts: 'custom-permissions-boundary',
    })
        .option('custom-permissions-boundary', {
        default: undefined,
        type: 'string',
        alias: 'cpb',
        desc: 'Use the permissions boundary specified by name.',
        conflicts: 'example-permissions-boundary',
    })
        .option('bootstrap-customer-key', {
        default: undefined,
        type: 'boolean',
        desc: 'Create a Customer Master Key (CMK) for the bootstrap bucket (you will be charged but can customize permissions, modern bootstrapping only)',
        conflicts: 'bootstrap-kms-key-id',
    })
        .option('qualifier', {
        default: undefined,
        type: 'string',
        desc: 'String which must be unique for each bootstrap stack. You must configure it on your CDK app if you change this from the default.',
    })
        .option('public-access-block-configuration', {
        default: undefined,
        type: 'boolean',
        desc: 'Block public access configuration on CDK toolkit bucket (enabled by default) ',
    })
        .option('tags', {
        default: [],
        type: 'array',
        alias: 't',
        desc: 'Tags to add for the stack (KEY=VALUE)',
        nargs: 1,
        requiresArg: true,
    })
        .option('execute', {
        default: true,
        type: 'boolean',
        desc: 'Whether to execute ChangeSet (--no-execute will NOT execute the ChangeSet)',
    })
        .option('trust', {
        default: [],
        type: 'array',
        desc: 'The AWS account IDs that should be trusted to perform deployments into this environment (may be repeated, modern bootstrapping only)',
        nargs: 1,
        requiresArg: true,
    })
        .option('trust-for-lookup', {
        default: [],
        type: 'array',
        desc: 'The AWS account IDs that should be trusted to look up values in this environment (may be repeated, modern bootstrapping only)',
        nargs: 1,
        requiresArg: true,
    })
        .option('cloudformation-execution-policies', {
        default: [],
        type: 'array',
        desc: 'The Managed Policy ARNs that should be attached to the role performing deployments into this environment (may be repeated, modern bootstrapping only)',
        nargs: 1,
        requiresArg: true,
    })
        .option('force', {
        default: false,
        alias: 'f',
        type: 'boolean',
        desc: 'Always bootstrap even if it would downgrade template version',
    })
        .option('termination-protection', {
        default: undefined,
        type: 'boolean',
        desc: 'Toggle CloudFormation termination protection on the bootstrap stacks',
    })
        .option('show-template', {
        default: false,
        type: 'boolean',
        desc: "Instead of actual bootstrapping, print the current CLI's bootstrapping template to stdout for customization",
    })
        .option('toolkit-stack-name', {
        default: undefined,
        type: 'string',
        desc: 'The name of the CDK toolkit stack to create',
        requiresArg: true,
    })
        .option('template', {
        default: undefined,
        type: 'string',
        requiresArg: true,
        desc: 'Use the template from the given file instead of the built-in one (use --show-template to obtain an example)',
    })
        .option('previous-parameters', {
        default: true,
        type: 'boolean',
        desc: 'Use previous values for existing parameters (you must specify all parameters on every deployment if this is disabled)',
    }))
        .command('gc [ENVIRONMENTS..]', 'Garbage collect assets. Options detailed here: https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk/README.md#cdk-gc', (yargs) => yargs
        .option('action', {
        default: 'full',
        type: 'string',
        desc: 'The action (or sub-action) you want to perform. Valid entires are "print", "tag", "delete-tagged", "full".',
    })
        .option('type', {
        default: 'all',
        type: 'string',
        desc: 'Specify either ecr, s3, or all',
    })
        .option('rollback-buffer-days', {
        default: 0,
        type: 'number',
        desc: 'Delete assets that have been marked as isolated for this many days',
    })
        .option('created-buffer-days', {
        default: 1,
        type: 'number',
        desc: 'Never delete assets younger than this (in days)',
    })
        .option('confirm', {
        default: true,
        type: 'boolean',
        desc: 'Confirm via manual prompt before deletion',
    })
        .option('bootstrap-stack-name', {
        default: undefined,
        type: 'string',
        desc: 'The name of the CDK toolkit stack, if different from the default "CDKToolkit"',
        requiresArg: true,
    }))
        .command('deploy [STACKS..]', 'Deploys the stack(s) named STACKS into your AWS account', (yargs) => yargs
        .option('all', {
        default: false,
        type: 'boolean',
        desc: 'Deploy all available stacks',
    })
        .option('build-exclude', {
        default: [],
        type: 'array',
        alias: 'E',
        desc: 'Do not rebuild asset with the given ID. Can be specified multiple times',
        nargs: 1,
        requiresArg: true,
    })
        .option('exclusively', {
        default: undefined,
        type: 'boolean',
        alias: 'e',
        desc: "Only deploy requested stacks, don't include dependencies",
    })
        .option('require-approval', {
        default: undefined,
        type: 'string',
        choices: ['never', 'any-change', 'broadening'],
        desc: 'What security-sensitive changes need manual approval',
    })
        .option('notification-arns', {
        type: 'array',
        desc: "ARNs of SNS topics that CloudFormation will notify with stack related events. These will be added to ARNs specified with the 'notificationArns' stack property.",
        nargs: 1,
        requiresArg: true,
    })
        .option('tags', {
        default: [],
        type: 'array',
        alias: 't',
        desc: 'Tags to add to the stack (KEY=VALUE), overrides tags from Cloud Assembly (deprecated)',
        nargs: 1,
        requiresArg: true,
    })
        .option('execute', {
        default: undefined,
        type: 'boolean',
        desc: 'Whether to execute ChangeSet (--no-execute will NOT execute the ChangeSet) (deprecated)',
        deprecated: true,
    })
        .option('change-set-name', {
        default: undefined,
        type: 'string',
        desc: 'Name of the CloudFormation change set to create (only if method is not direct)',
    })
        .option('method', {
        default: undefined,
        alias: 'm',
        type: 'string',
        choices: ['direct', 'change-set', 'prepare-change-set'],
        requiresArg: true,
        desc: 'How to perform the deployment. Direct is a bit faster but lacks progress information',
    })
        .option('import-existing-resources', {
        default: false,
        type: 'boolean',
        desc: 'Indicates if the stack set imports resources that already exist.',
    })
        .option('force', {
        default: false,
        alias: 'f',
        type: 'boolean',
        desc: 'Always deploy stack even if templates are identical',
    })
        .option('parameters', {
        default: {},
        type: 'array',
        desc: 'Additional parameters passed to CloudFormation at deploy time (STACK:KEY=VALUE)',
        nargs: 1,
        requiresArg: true,
    })
        .option('outputs-file', {
        default: undefined,
        type: 'string',
        alias: 'O',
        desc: 'Path to file where stack outputs will be written as JSON',
        requiresArg: true,
    })
        .option('previous-parameters', {
        default: true,
        type: 'boolean',
        desc: 'Use previous values for existing parameters (you must specify all parameters on every deployment if this is disabled)',
    })
        .option('toolkit-stack-name', {
        default: undefined,
        type: 'string',
        desc: 'The name of the existing CDK toolkit stack (only used for app using legacy synthesis)',
        requiresArg: true,
    })
        .option('progress', {
        default: undefined,
        type: 'string',
        choices: ['bar', 'events'],
        desc: 'Display mode for stack activity events',
    })
        .option('rollback', {
        default: undefined,
        type: 'boolean',
        desc: "Rollback stack to stable state on failure. Defaults to 'true', iterate more rapidly with --no-rollback or -R. Note: do **not** disable this flag for deployments with resource replacements, as that will always fail",
    })
        .option('R', { type: 'boolean', hidden: true })
        .middleware(helpers.yargsNegativeAlias('R', 'rollback'), true)
        .option('hotswap', {
        default: undefined,
        type: 'boolean',
        desc: "Attempts to perform a 'hotswap' deployment, but does not fall back to a full deployment if that is not possible. Instead, changes to any non-hotswappable properties are ignored.Do not use this in production environments",
    })
        .option('hotswap-fallback', {
        default: undefined,
        type: 'boolean',
        desc: "Attempts to perform a 'hotswap' deployment, which skips CloudFormation and updates the resources directly, and falls back to a full deployment if that is not possible. Do not use this in production environments",
    })
        .option('watch', {
        default: undefined,
        type: 'boolean',
        desc: 'Continuously observe the project files, and deploy the given stack(s) automatically when changes are detected. Implies --hotswap by default',
    })
        .option('logs', {
        default: true,
        type: 'boolean',
        desc: "Show CloudWatch log events from all resources in the selected Stacks in the terminal. 'true' by default, use --no-logs to turn off. Only in effect if specified alongside the '--watch' option",
    })
        .option('concurrency', {
        default: 1,
        type: 'number',
        desc: 'Maximum number of simultaneous deployments (dependency permitting) to execute.',
        requiresArg: true,
    })
        .option('asset-parallelism', {
        default: undefined,
        type: 'boolean',
        desc: 'Whether to build/publish assets in parallel',
    })
        .option('asset-prebuild', {
        default: true,
        type: 'boolean',
        desc: 'Whether to build all assets before deploying the first stack (useful for failing Docker builds)',
    })
        .option('ignore-no-stacks', {
        default: false,
        type: 'boolean',
        desc: 'Whether to deploy if the app contains no stacks',
    }))
        .command('rollback [STACKS..]', 'Rolls back the stack(s) named STACKS to their last stable state', (yargs) => yargs
        .option('all', {
        default: false,
        type: 'boolean',
        desc: 'Roll back all available stacks',
    })
        .option('toolkit-stack-name', {
        default: undefined,
        type: 'string',
        desc: 'The name of the CDK toolkit stack the environment is bootstrapped with',
        requiresArg: true,
    })
        .option('force', {
        default: undefined,
        alias: 'f',
        type: 'boolean',
        desc: 'Orphan all resources for which the rollback operation fails.',
    })
        .option('validate-bootstrap-version', {
        default: undefined,
        type: 'boolean',
        desc: "Whether to validate the bootstrap stack version. Defaults to 'true', disable with --no-validate-bootstrap-version.",
    })
        .option('orphan', {
        default: [],
        type: 'array',
        desc: 'Orphan the given resources, identified by their logical ID (can be specified multiple times)',
        nargs: 1,
        requiresArg: true,
    }))
        .command('import [STACK]', 'Import existing resource(s) into the given STACK', (yargs) => yargs
        .option('execute', {
        default: true,
        type: 'boolean',
        desc: 'Whether to execute ChangeSet (--no-execute will NOT execute the ChangeSet)',
    })
        .option('change-set-name', {
        default: undefined,
        type: 'string',
        desc: 'Name of the CloudFormation change set to create',
    })
        .option('toolkit-stack-name', {
        default: undefined,
        type: 'string',
        desc: 'The name of the CDK toolkit stack to create',
        requiresArg: true,
    })
        .option('rollback', {
        default: undefined,
        type: 'boolean',
        desc: "Rollback stack to stable state on failure. Defaults to 'true', iterate more rapidly with --no-rollback or -R. Note: do **not** disable this flag for deployments with resource replacements, as that will always fail",
    })
        .option('force', {
        default: undefined,
        alias: 'f',
        type: 'boolean',
        desc: "Do not abort if the template diff includes updates or deletes. This is probably safe but we're not sure, let us know how it goes.",
    })
        .option('record-resource-mapping', {
        default: undefined,
        type: 'string',
        alias: 'r',
        requiresArg: true,
        desc: 'If specified, CDK will generate a mapping of existing physical resources to CDK resources to be imported as. The mapping will be written in the given file path. No actual import operation will be performed',
    })
        .option('resource-mapping', {
        default: undefined,
        type: 'string',
        alias: 'm',
        requiresArg: true,
        desc: 'If specified, CDK will use the given file to map physical resources to CDK resources for import, instead of interactively asking the user. Can be run from scripts',
    }))
        .command('watch [STACKS..]', "Shortcut for 'deploy --watch'", (yargs) => yargs
        .option('build-exclude', {
        default: [],
        type: 'array',
        alias: 'E',
        desc: 'Do not rebuild asset with the given ID. Can be specified multiple times',
        nargs: 1,
        requiresArg: true,
    })
        .option('exclusively', {
        default: undefined,
        type: 'boolean',
        alias: 'e',
        desc: "Only deploy requested stacks, don't include dependencies",
    })
        .option('change-set-name', {
        default: undefined,
        type: 'string',
        desc: 'Name of the CloudFormation change set to create',
    })
        .option('force', {
        default: false,
        alias: 'f',
        type: 'boolean',
        desc: 'Always deploy stack even if templates are identical',
    })
        .option('toolkit-stack-name', {
        default: undefined,
        type: 'string',
        desc: 'The name of the existing CDK toolkit stack (only used for app using legacy synthesis)',
        requiresArg: true,
    })
        .option('progress', {
        default: undefined,
        type: 'string',
        choices: ['bar', 'events'],
        desc: 'Display mode for stack activity events',
    })
        .option('rollback', {
        default: undefined,
        type: 'boolean',
        desc: "Rollback stack to stable state on failure. Defaults to 'true', iterate more rapidly with --no-rollback or -R. Note: do **not** disable this flag for deployments with resource replacements, as that will always fail",
    })
        .option('R', { type: 'boolean', hidden: true })
        .middleware(helpers.yargsNegativeAlias('R', 'rollback'), true)
        .option('hotswap', {
        default: undefined,
        type: 'boolean',
        desc: "Attempts to perform a 'hotswap' deployment, but does not fall back to a full deployment if that is not possible. Instead, changes to any non-hotswappable properties are ignored.'true' by default, use --no-hotswap to turn off",
    })
        .option('hotswap-fallback', {
        default: undefined,
        type: 'boolean',
        desc: "Attempts to perform a 'hotswap' deployment, which skips CloudFormation and updates the resources directly, and falls back to a full deployment if that is not possible.",
    })
        .option('logs', {
        default: true,
        type: 'boolean',
        desc: "Show CloudWatch log events from all resources in the selected Stacks in the terminal. 'true' by default, use --no-logs to turn off",
    })
        .option('concurrency', {
        default: 1,
        type: 'number',
        desc: 'Maximum number of simultaneous deployments (dependency permitting) to execute.',
        requiresArg: true,
    }))
        .command('destroy [STACKS..]', 'Destroy the stack(s) named STACKS', (yargs) => yargs
        .option('all', {
        default: false,
        type: 'boolean',
        desc: 'Destroy all available stacks',
    })
        .option('exclusively', {
        default: undefined,
        type: 'boolean',
        alias: 'e',
        desc: "Only destroy requested stacks, don't include dependees",
    })
        .option('force', {
        default: undefined,
        type: 'boolean',
        alias: 'f',
        desc: 'Do not ask for confirmation before destroying the stacks',
    }))
        .command('diff [STACKS..]', 'Compares the specified stack with the deployed stack or a local template file, and returns with status 1 if any difference is found', (yargs) => yargs
        .option('exclusively', {
        default: undefined,
        type: 'boolean',
        alias: 'e',
        desc: "Only diff requested stacks, don't include dependencies",
    })
        .option('context-lines', {
        default: 3,
        type: 'number',
        desc: 'Number of context lines to include in arbitrary JSON diff rendering',
        requiresArg: true,
    })
        .option('template', {
        default: undefined,
        type: 'string',
        desc: 'The path to the CloudFormation template to compare with',
        requiresArg: true,
    })
        .option('strict', {
        default: false,
        type: 'boolean',
        desc: 'Do not filter out AWS::CDK::Metadata resources, mangled non-ASCII characters, or the CheckBootstrapVersionRule',
    })
        .option('security-only', {
        default: false,
        type: 'boolean',
        desc: 'Only diff for broadened security changes',
    })
        .option('fail', {
        default: undefined,
        type: 'boolean',
        desc: 'Fail with exit code 1 in case of diff',
    })
        .option('processed', {
        default: false,
        type: 'boolean',
        desc: 'Whether to compare against the template with Transforms already processed',
    })
        .option('quiet', {
        default: false,
        type: 'boolean',
        alias: 'q',
        desc: 'Do not print stack name and default message when there is no diff to stdout',
    })
        .option('change-set', {
        default: true,
        type: 'boolean',
        alias: 'changeset',
        desc: 'Whether to create a changeset to analyze resource replacements. In this mode, diff will use the deploy role instead of the lookup role.',
    }))
        .command('metadata [STACK]', 'Returns all metadata associated with this stack')
        .command(['acknowledge [ID]', 'ack [ID]'], 'Acknowledge a notice so that it does not show up anymore')
        .command('notices', 'Returns a list of relevant notices', (yargs) => yargs.option('unacknowledged', {
        default: false,
        type: 'boolean',
        alias: 'u',
        desc: 'Returns a list of unacknowledged notices',
    }))
        .command('init [TEMPLATE]', 'Create a new, empty CDK project from a template.', (yargs) => yargs
        .option('language', {
        default: undefined,
        type: 'string',
        alias: 'l',
        desc: 'The language to be used for the new project (default can be configured in ~/.cdk.json)',
        choices: ['csharp', 'fsharp', 'go', 'java', 'javascript', 'python', 'typescript'],
    })
        .option('list', {
        default: undefined,
        type: 'boolean',
        desc: 'List the available templates',
    })
        .option('generate-only', {
        default: false,
        type: 'boolean',
        desc: 'If true, only generates project files, without executing additional operations such as setting up a git repo, installing dependencies or compiling the project',
    }))
        .command('migrate', 'Migrate existing AWS resources into a CDK app', (yargs) => yargs
        .option('stack-name', {
        default: undefined,
        type: 'string',
        alias: 'n',
        desc: 'The name assigned to the stack created in the new project. The name of the app will be based off this name as well.',
        requiresArg: true,
    })
        .option('language', {
        default: 'typescript',
        type: 'string',
        alias: 'l',
        desc: 'The language to be used for the new project',
        choices: ['typescript', 'go', 'java', 'python', 'csharp'],
    })
        .option('account', {
        default: undefined,
        type: 'string',
        desc: 'The account to retrieve the CloudFormation stack template from',
    })
        .option('region', {
        default: undefined,
        type: 'string',
        desc: 'The region to retrieve the CloudFormation stack template from',
    })
        .option('from-path', {
        default: undefined,
        type: 'string',
        desc: 'The path to the CloudFormation template to migrate. Use this for locally stored templates',
    })
        .option('from-stack', {
        default: undefined,
        type: 'boolean',
        desc: 'Use this flag to retrieve the template for an existing CloudFormation stack',
    })
        .option('output-path', {
        default: undefined,
        type: 'string',
        desc: 'The output path for the migrated CDK app',
    })
        .option('from-scan', {
        default: undefined,
        type: 'string',
        desc: 'Determines if a new scan should be created, or the last successful existing scan should be used \n options are "new" or "most-recent"',
    })
        .option('filter', {
        default: [],
        type: 'array',
        desc: 'Filters the resource scan based on the provided criteria in the following format: "key1=value1,key2=value2"\n This field can be passed multiple times for OR style filtering: \n filtering options: \n resource-identifier: A key-value pair that identifies the target resource. i.e. {"ClusterName", "myCluster"}\n resource-type-prefix: A string that represents a type-name prefix. i.e. "AWS::DynamoDB::"\n tag-key: a string that matches resources with at least one tag with the provided key. i.e. "myTagKey"\n tag-value: a string that matches resources with at least one tag with the provided value. i.e. "myTagValue"',
        nargs: 1,
        requiresArg: true,
    })
        .option('compress', {
        default: undefined,
        type: 'boolean',
        desc: 'Use this flag to zip the generated CDK app',
    }))
        .command('context', 'Manage cached context values', (yargs) => yargs
        .option('reset', {
        default: undefined,
        alias: 'e',
        desc: 'The context key (or its index) to reset',
        type: 'string',
        requiresArg: true,
    })
        .option('force', {
        default: false,
        alias: 'f',
        desc: 'Ignore missing key error',
        type: 'boolean',
    })
        .option('clear', {
        default: false,
        desc: 'Clear all context',
        type: 'boolean',
    }))
        .command(['docs', 'doc'], 'Opens the reference documentation in a browser', (yargs) => yargs.option('browser', {
        default: helpers.browserForPlatform(),
        alias: 'b',
        desc: 'the command to use to open the browser, using %u as a placeholder for the path of the file to open',
        type: 'string',
    }))
        .command('doctor', 'Check your set-up for potential problems')
        .version(helpers.cliVersion())
        .demandCommand(1, '')
        .recommendCommands()
        .help()
        .alias('h', 'help')
        .epilogue('If your app has a single stack, there is no need to specify the stack name\n\nIf one of cdk.json or ~/.cdk.json exists, options specified there will be used as defaults. Settings in cdk.json take precedence.')
        .parse(args);
} // eslint-disable-next-line @typescript-eslint/no-require-imports
const yargs = require('yargs');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtY29tbWFuZC1saW5lLWFyZ3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcnNlLWNvbW1hbmQtbGluZS1hcmd1bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFTQSw4REFpMEJDO0FBcDBCRCxnREFBZ0Q7QUFFaEQsb0JBQW9CO0FBQ3BCLFNBQWdCLHlCQUF5QixDQUFDLElBQW1CO0lBQzNELE9BQU8sS0FBSztTQUNULEdBQUcsQ0FBQyxLQUFLLENBQUM7U0FDVixLQUFLLENBQUMsaUNBQWlDLENBQUM7U0FDeEMsTUFBTSxDQUFDLEtBQUssRUFBRTtRQUNiLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLElBQUksRUFBRSxRQUFRO1FBQ2QsS0FBSyxFQUFFLEdBQUc7UUFDVixJQUFJLEVBQUUsNEtBQTRLO1FBQ2xMLFdBQVcsRUFBRSxJQUFJO0tBQ2xCLENBQUM7U0FDRCxNQUFNLENBQUMsT0FBTyxFQUFFO1FBQ2YsT0FBTyxFQUFFLFNBQVM7UUFDbEIsSUFBSSxFQUFFLFFBQVE7UUFDZCxJQUFJLEVBQUUsb0NBQW9DO0tBQzNDLENBQUM7U0FDRCxNQUFNLENBQUMsU0FBUyxFQUFFO1FBQ2pCLE9BQU8sRUFBRSxFQUFFO1FBQ1gsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSw2Q0FBNkM7UUFDbkQsS0FBSyxFQUFFLENBQUM7UUFDUixXQUFXLEVBQUUsSUFBSTtLQUNsQixDQUFDO1NBQ0QsTUFBTSxDQUFDLFFBQVEsRUFBRTtRQUNoQixPQUFPLEVBQUUsRUFBRTtRQUNYLElBQUksRUFBRSxPQUFPO1FBQ2IsS0FBSyxFQUFFLEdBQUc7UUFDVixJQUFJLEVBQUUsOEZBQThGO1FBQ3BHLEtBQUssRUFBRSxDQUFDO1FBQ1IsV0FBVyxFQUFFLElBQUk7S0FDbEIsQ0FBQztTQUNELE1BQU0sQ0FBQyxPQUFPLEVBQUU7UUFDZixPQUFPLEVBQUUsU0FBUztRQUNsQixJQUFJLEVBQUUs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QUNoQyxJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDO1NBQ0QsTUFBTSxDQUFDLE9BQU8sRUFBRTtRQUNmLE9BQU8sRUFBRSxLQUFLO1FBQ2QsSUFBSSxFQUFFLG1CQUFtQjtRQUN6QixJQUFJLEVBQUUsU0FBUztLQUNoQixDQUFDLENBQ0w7U0FDQSxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsZ0RBQWdELEVBQUUsQ0FBQyxLQUFXLEVBQUUsRUFBRSxDQUMxRixLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRTtRQUN0QixPQUFPLEVBQUUsT0FBTyxDQUFDLGtCQUFrQixFQUFFO1FBQ3JDLEtBQUssRUFBRSxHQUFHO1FBQ1YsSUFBSSxFQUFFLG9HQUFvRztRQUMxRyxJQUFJLEVBQUUsUUFBUTtLQUNmLENBQUMsQ0FDSDtTQUNBLE9BQU8sQ0FBQyxRQUFRLEVBQUUsMENBQTBDLENBQUM7U0FDN0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUM3QixhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNwQixpQkFBaUIsRUFBRTtTQUNuQixJQUFJLEVBQUU7U0FDTixLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQztTQUNsQixRQUFRLENBQ1AsaU5BQWlOLENBQ2xOO1NBQ0EsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxpRUFBaUU7QUFDbkUsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gR0VORVJBVEVEIEZST00gcGFja2FnZXMvYXdzLWNkay9saWIvY29uZmlnLnRzLlxuLy8gRG8gbm90IGVkaXQgYnkgaGFuZDsgYWxsIGNoYW5nZXMgd2lsbCBiZSBvdmVyd3JpdHRlbiBhdCBidWlsZCB0aW1lIGZyb20gdGhlIGNvbmZpZyBmaWxlLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLyogZXNsaW50LWRpc2FibGUgQHN0eWxpc3RpYy9tYXgtbGVuICovXG5pbXBvcnQgeyBBcmd2IH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0ICogYXMgaGVscGVycyBmcm9tICcuL3V0aWwveWFyZ3MtaGVscGVycyc7XG5cbi8vIEB0cy1pZ25vcmUgVFM2MTMzXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDb21tYW5kTGluZUFyZ3VtZW50cyhhcmdzOiBBcnJheTxzdHJpbmc+KTogYW55IHtcbiAgcmV0dXJuIHlhcmdzXG4gICAgLmVudignQ0RLJylcbiAgICAudXNhZ2UoJ1VzYWdlOiBjZGsgLWEgPGNkay1hcHA+IENPTU1BTkQnKVxuICAgIC5vcHRpb24oJ2FwcCcsIHtcbiAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgYWxpYXM6ICdhJyxcbiAgICAgIGRlc2M6ICdSRVFVSVJFRCBXSEVOIFJVTk5JTkcgQVBQOiBjb21tYW5kLWxpbmUgZm9yIGV4ZWN1dGluZyB5b3VyIGFwcCBvciBhIGNsb3VkIGFzc2VtYmx5IGRpcmVjdG9yeSAoZS5nLiBcIm5vZGUgYmluL215LWFwcC5qc1wiKS4gQ2FuIGFsc28gYmUgc3BlY2lmaWVkIGluIGNkay5qc29uIG9yIH4vLmNkay5qc29uJyxcbiAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgIH0pXG4gICAgLm9wdGlvbignYnVpbGQnLCB7XG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlc2M6ICdDb21tYW5kLWxpbmUgZm9yIGEgcHJlLXN5bnRoIGJ1aWxkJyxcbiAgICB9KVxuICAgIC5vcHRpb24oJ2NvbnRleHQnLCB7XG4gICAgICBkZWZhdWx0OiBbXSxcbiAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICBhbGlhczogJ2MnLFxuICAgICAgZGVzYzogJ0FkZCBjb250ZXh0dWFsIHN0cmluZyBwYXJhbWV0ZXIgKEtFWT1WQUxVRSknLFxuICAgICAgbmFyZ3M6IDEsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3BsdWdpbicsIHtcbiAgICAgIGRlZmF1bHQ6IFtdLFxuICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgIGFsaWFzOiAncCcsXG4gICAgICBkZXNjOiAnTmFtZSBvciBwYXRoIG9mIGEgbm9kZSBwYWNrYWdlIHRoYXQgZXh0ZW5kIHRoZSBDREsgZmVhdHVyZXMuIENhbiBiZSBzcGVjaWZpZWQgbXVsdGlwbGUgdGltZXMnLFxuICAgICAgbmFyZ3M6IDEsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3RyYWNlJywge1xuICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVzYzogJ1ByaW50IHRyYWNlIGZvciBzdGFjayB3YXJuaW5ncycsXG4gICAgfSlcbiAgICAub3B0aW9uKCdzdHJpY3QnLCB7XG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZXNjOiAnRG8gbm90IGNvbnN0cnVjdCBzdGFja3Mgd2l0aCB3YXJuaW5ncycsXG4gICAgfSlcbiAgICAub3B0aW9uKCdsb29rdXBzJywge1xuICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlc2M6ICdQZXJmb3JtIGNvbnRleHQgbG9va3VwcyAoc3ludGhlc2lzIGZhaWxzIGlmIHRoaXMgaXMgZGlzYWJsZWQgYW5kIGNvbnRleHQgbG9va3VwcyBuZWVkIHRvIGJlIHBlcmZvcm1lZCknLFxuICAgIH0pXG4gICAgLm9wdGlvbignaWdub3JlLWVycm9ycycsIHtcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVzYzogJ0lnbm9yZXMgc3ludGhlc2lzIGVycm9ycywgd2hpY2ggd2lsbCBsaWtlbHkgcHJvZHVjZSBhbiBpbnZhbGlkIG91dHB1dCcsXG4gICAgfSlcbiAgICAub3B0aW9uKCdqc29uJywge1xuICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBhbGlhczogJ2onLFxuICAgICAgZGVzYzogJ1VzZSBKU09OIG91dHB1dCBpbnN0ZWFkIG9mIFlBTUwgd2hlbiB0ZW1wbGF0ZXMgYXJlIHByaW50ZWQgdG8gU1RET1VUJyxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3ZlcmJvc2UnLCB7XG4gICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGFsaWFzOiAndicsXG4gICAgICBkZXNjOiAnU2hvdyBkZWJ1ZyBsb2dzIChzcGVjaWZ5IG11bHRpcGxlIHRpbWVzIHRvIGluY3JlYXNlIHZlcmJvc2l0eSknLFxuICAgICAgY291bnQ6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCdkZWJ1ZycsIHtcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVzYzogJ0RlYnVnIHRoZSBDREsgYXBwLiBMb2cgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBkdXJpbmcgc3ludGhlc2lzLCBzdWNoIGFzIGNyZWF0aW9uIHN0YWNrIHRyYWNlcyBvZiB0b2tlbnMgKHNldHMgQ0RLX0RFQlVHLCB3aWxsIHNsb3cgZG93biBzeW50aGVzaXMpJyxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3Byb2ZpbGUnLCB7XG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlc2M6ICdVc2UgdGhlIGluZGljYXRlZCBBV1MgcHJvZmlsZSBhcyB0aGUgZGVmYXVsdCBlbnZpcm9ubWVudCcsXG4gICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3Byb3h5Jywge1xuICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZXNjOiAnVXNlIHRoZSBpbmRpY2F0ZWQgcHJveHkuIFdpbGwgcmVhZCBmcm9tIEhUVFBTX1BST1hZIGVudmlyb25tZW50IHZhcmlhYmxlIGlmIG5vdCBzcGVjaWZpZWQnLFxuICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCdjYS1idW5kbGUtcGF0aCcsIHtcbiAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgZGVzYzogJ1BhdGggdG8gQ0EgY2VydGlmaWNhdGUgdG8gdXNlIHdoZW4gdmFsaWRhdGluZyBIVFRQUyByZXF1ZXN0cy4gV2lsbCByZWFkIGZyb20gQVdTX0NBX0JVTkRMRSBlbnZpcm9ubWVudCB2YXJpYWJsZSBpZiBub3Qgc3BlY2lmaWVkJyxcbiAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgIH0pXG4gICAgLm9wdGlvbignZWMyY3JlZHMnLCB7XG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBhbGlhczogJ2knLFxuICAgICAgZGVzYzogJ0ZvcmNlIHRyeWluZyB0byBmZXRjaCBFQzIgaW5zdGFuY2UgY3JlZGVudGlhbHMuIERlZmF1bHQ6IGd1ZXNzIEVDMiBpbnN0YW5jZSBzdGF0dXMnLFxuICAgIH0pXG4gICAgLm9wdGlvbigndmVyc2lvbi1yZXBvcnRpbmcnLCB7XG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZXNjOiAnSW5jbHVkZSB0aGUgXCJBV1M6OkNESzo6TWV0YWRhdGFcIiByZXNvdXJjZSBpbiBzeW50aGVzaXplZCB0ZW1wbGF0ZXMgKGVuYWJsZWQgYnkgZGVmYXVsdCknLFxuICAgIH0pXG4gICAgLm9wdGlvbigncGF0aC1tZXRhZGF0YScsIHtcbiAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlc2M6ICdJbmNsdWRlIFwiYXdzOmNkazpwYXRoXCIgQ2xvdWRGb3JtYXRpb24gbWV0YWRhdGEgZm9yIGVhY2ggcmVzb3VyY2UgKGVuYWJsZWQgYnkgZGVmYXVsdCknLFxuICAgIH0pXG4gICAgLm9wdGlvbignYXNzZXQtbWV0YWRhdGEnLCB7XG4gICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZXNjOiAnSW5jbHVkZSBcImF3czphc3NldDoqXCIgQ2xvdWRGb3JtYXRpb24gbWV0YWRhdGEgZm9yIHJlc291cmNlcyB0aGF0IHVzZXMgYXNzZXRzIChlbmFibGVkIGJ5IGRlZmF1bHQpJyxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3JvbGUtYXJuJywge1xuICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBhbGlhczogJ3InLFxuICAgICAgZGVzYzogJ0FSTiBvZiBSb2xlIHRvIHVzZSB3aGVuIGludm9raW5nIENsb3VkRm9ybWF0aW9uJyxcbiAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgIH0pXG4gICAgLm9wdGlvbignc3RhZ2luZycsIHtcbiAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZXNjOiAnQ29weSBhc3NldHMgdG8gdGhlIG91dHB1dCBkaXJlY3RvcnkgKHVzZSAtLW5vLXN0YWdpbmcgdG8gZGlzYWJsZSB0aGUgY29weSBvZiBhc3NldHMgd2hpY2ggYWxsb3dzIGxvY2FsIGRlYnVnZ2luZyB2aWEgdGhlIFNBTSBDTEkgdG8gcmVmZXJlbmNlIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZXMpJyxcbiAgICB9KVxuICAgIC5vcHRpb24oJ291dHB1dCcsIHtcbiAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgYWxpYXM6ICdvJyxcbiAgICAgIGRlc2M6ICdFbWl0cyB0aGUgc3ludGhlc2l6ZWQgY2xvdWQgYXNzZW1ibHkgaW50byBhIGRpcmVjdG9yeSAoZGVmYXVsdDogY2RrLm91dCknLFxuICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCdub3RpY2VzJywge1xuICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVzYzogJ1Nob3cgcmVsZXZhbnQgbm90aWNlcycsXG4gICAgfSlcbiAgICAub3B0aW9uKCduby1jb2xvcicsIHtcbiAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgZGVzYzogJ1JlbW92ZXMgY29sb3JzIGFuZCBvdGhlciBzdHlsZSBmcm9tIGNvbnNvbGUgb3V0cHV0JyxcbiAgICB9KVxuICAgIC5vcHRpb24oJ2NpJywge1xuICAgICAgZGVmYXVsdDogaGVscGVycy5pc0NJKCksXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZXNjOiAnRm9yY2UgQ0kgZGV0ZWN0aW9uLiBJZiBDST10cnVlIHRoZW4gbG9ncyB3aWxsIGJlIHNlbnQgdG8gc3Rkb3V0IGluc3RlYWQgb2Ygc3RkZXJyJyxcbiAgICB9KVxuICAgIC5vcHRpb24oJ3Vuc3RhYmxlJywge1xuICAgICAgZGVmYXVsdDogW10sXG4gICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgZGVzYzogJ09wdCBpbiB0byB1bnN0YWJsZSBmZWF0dXJlcy4gVGhlIGZsYWcgaW5kaWNhdGVzIHRoYXQgdGhlIHNjb3BlIGFuZCBBUEkgb2YgYSBmZWF0dXJlIG1pZ2h0IHN0aWxsIGNoYW5nZS4gT3RoZXJ3aXNlIHRoZSBmZWF0dXJlIGlzIGdlbmVyYWxseSBwcm9kdWN0aW9uIHJlYWR5IGFuZCBmdWxseSBzdXBwb3J0ZWQuIENhbiBiZSBzcGVjaWZpZWQgbXVsdGlwbGUgdGltZXMuJyxcbiAgICAgIG5hcmdzOiAxLFxuICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgfSlcbiAgICAuY29tbWFuZChbJ2xpc3QgW1NUQUNLUy4uXScsICdscyBbU1RBQ0tTLi5dJ10sICdMaXN0cyBhbGwgc3RhY2tzIGluIHRoZSBhcHAnLCAoeWFyZ3M6IEFyZ3YpID0+XG4gICAgICB5YXJnc1xuICAgICAgICAub3B0aW9uKCdsb25nJywge1xuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBhbGlhczogJ2wnLFxuICAgICAgICAgIGRlc2M6ICdEaXNwbGF5IGVudmlyb25tZW50IGluZm9ybWF0aW9uIGZvciBlYWNoIHN0YWNrJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignc2hvdy1kZXBlbmRlbmNpZXMnLCB7XG4gICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGFsaWFzOiAnZCcsXG4gICAgICAgICAgZGVzYzogJ0Rpc3BsYXkgc3RhY2sgZGVwZW5kZW5jeSBpbmZvcm1hdGlvbiBmb3IgZWFjaCBzdGFjaycsXG4gICAgICAgIH0pLFxuICAgIClcbiAgICAuY29tbWFuZChbJ3N5bnRoZXNpemUgW1NUQUNLUy4uXScsICdzeW50aCBbU1RBQ0tTLi5dJ10sICdTeW50aGVzaXplcyBhbmQgcHJpbnRzIHRoZSBDbG91ZEZvcm1hdGlvbiB0ZW1wbGF0ZSBmb3IgdGhpcyBzdGFjaycsICh5YXJnczogQXJndikgPT5cbiAgICAgIHlhcmdzXG4gICAgICAgIC5vcHRpb24oJ2V4Y2x1c2l2ZWx5Jywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgYWxpYXM6ICdlJyxcbiAgICAgICAgICBkZXNjOiBcIk9ubHkgc3ludGhlc2l6ZSByZXF1ZXN0ZWQgc3RhY2tzLCBkb24ndCBpbmNsdWRlIGRlcGVuZGVuY2llc1wiLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCd2YWxpZGF0aW9uJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdBZnRlciBzeW50aGVzaXMsIHZhbGlkYXRlIHN0YWNrcyB3aXRoIHRoZSBcInZhbGlkYXRlT25TeW50aFwiIGF0dHJpYnV0ZSBzZXQgKGNhbiBhbHNvIGJlIGNvbnRyb2xsZWQgd2l0aCBDREtfVkFMSURBVElPTiknLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdxdWlldCcsIHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgYWxpYXM6ICdxJyxcbiAgICAgICAgICBkZXNjOiAnRG8gbm90IG91dHB1dCBDbG91ZEZvcm1hdGlvbiBUZW1wbGF0ZSB0byBzdGRvdXQnLFxuICAgICAgICB9KSxcbiAgICApXG4gICAgLmNvbW1hbmQoJ2Jvb3RzdHJhcCBbRU5WSVJPTk1FTlRTLi5dJywgJ0RlcGxveXMgdGhlIENESyB0b29sa2l0IHN0YWNrIGludG8gYW4gQVdTIGVudmlyb25tZW50JywgKHlhcmdzOiBBcmd2KSA9PlxuICAgICAgeWFyZ3NcbiAgICAgICAgLm9wdGlvbignYm9vdHN0cmFwLWJ1Y2tldC1uYW1lJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBhbGlhczogWydiJywgJ3Rvb2xraXQtYnVja2V0LW5hbWUnXSxcbiAgICAgICAgICBkZXNjOiAnVGhlIG5hbWUgb2YgdGhlIENESyB0b29sa2l0IGJ1Y2tldDsgYnVja2V0IHdpbGwgYmUgY3JlYXRlZCBhbmQgbXVzdCBub3QgZXhpc3QnLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdib290c3RyYXAta21zLWtleS1pZCcsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVzYzogJ0FXUyBLTVMgbWFzdGVyIGtleSBJRCB1c2VkIGZvciB0aGUgU1NFLUtNUyBlbmNyeXB0aW9uJyxcbiAgICAgICAgICBjb25mbGljdHM6ICdib290c3RyYXAtY3VzdG9tZXIta2V5JyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignZXhhbXBsZS1wZXJtaXNzaW9ucy1ib3VuZGFyeScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGFsaWFzOiAnZXBiJyxcbiAgICAgICAgICBkZXNjOiAnVXNlIHRoZSBleGFtcGxlIHBlcm1pc3Npb25zIGJvdW5kYXJ5LicsXG4gICAgICAgICAgY29uZmxpY3RzOiAnY3VzdG9tLXBlcm1pc3Npb25zLWJvdW5kYXJ5JyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignY3VzdG9tLXBlcm1pc3Npb25zLWJvdW5kYXJ5Jywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBhbGlhczogJ2NwYicsXG4gICAgICAgICAgZGVzYzogJ1VzZSB0aGUgcGVybWlzc2lvbnMgYm91bmRhcnkgc3BlY2lmaWVkIGJ5IG5hbWUuJyxcbiAgICAgICAgICBjb25mbGljdHM6ICdleGFtcGxlLXBlcm1pc3Npb25zLWJvdW5kYXJ5JyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignYm9vdHN0cmFwLWN1c3RvbWVyLWtleScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdDcmVhdGUgYSBDdXN0b21lciBNYXN0ZXIgS2V5IChDTUspIGZvciB0aGUgYm9vdHN0cmFwIGJ1Y2tldCAoeW91IHdpbGwgYmUgY2hhcmdlZCBidXQgY2FuIGN1c3RvbWl6ZSBwZXJtaXNzaW9ucywgbW9kZXJuIGJvb3RzdHJhcHBpbmcgb25seSknLFxuICAgICAgICAgIGNvbmZsaWN0czogJ2Jvb3RzdHJhcC1rbXMta2V5LWlkJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigncXVhbGlmaWVyJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZXNjOiAnU3RyaW5nIHdoaWNoIG11c3QgYmUgdW5pcXVlIGZvciBlYWNoIGJvb3RzdHJhcCBzdGFjay4gWW91IG11c3QgY29uZmlndXJlIGl0IG9uIHlvdXIgQ0RLIGFwcCBpZiB5b3UgY2hhbmdlIHRoaXMgZnJvbSB0aGUgZGVmYXVsdC4nLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdwdWJsaWMtYWNjZXNzLWJsb2NrLWNvbmZpZ3VyYXRpb24nLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjOiAnQmxvY2sgcHVibGljIGFjY2VzcyBjb25maWd1cmF0aW9uIG9uIENESyB0b29sa2l0IGJ1Y2tldCAoZW5hYmxlZCBieSBkZWZhdWx0KSAnLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCd0YWdzJywge1xuICAgICAgICAgIGRlZmF1bHQ6IFtdLFxuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgYWxpYXM6ICd0JyxcbiAgICAgICAgICBkZXNjOiAnVGFncyB0byBhZGQgZm9yIHRoZSBzdGFjayAoS0VZPVZBTFVFKScsXG4gICAgICAgICAgbmFyZ3M6IDEsXG4gICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2V4ZWN1dGUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1doZXRoZXIgdG8gZXhlY3V0ZSBDaGFuZ2VTZXQgKC0tbm8tZXhlY3V0ZSB3aWxsIE5PVCBleGVjdXRlIHRoZSBDaGFuZ2VTZXQpJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigndHJ1c3QnLCB7XG4gICAgICAgICAgZGVmYXVsdDogW10sXG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBkZXNjOiAnVGhlIEFXUyBhY2NvdW50IElEcyB0aGF0IHNob3VsZCBiZSB0cnVzdGVkIHRvIHBlcmZvcm0gZGVwbG95bWVudHMgaW50byB0aGlzIGVudmlyb25tZW50IChtYXkgYmUgcmVwZWF0ZWQsIG1vZGVybiBib290c3RyYXBwaW5nIG9ubHkpJyxcbiAgICAgICAgICBuYXJnczogMSxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigndHJ1c3QtZm9yLWxvb2t1cCcsIHtcbiAgICAgICAgICBkZWZhdWx0OiBbXSxcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGRlc2M6ICdUaGUgQVdTIGFjY291bnQgSURzIHRoYXQgc2hvdWxkIGJlIHRydXN0ZWQgdG8gbG9vayB1cCB2YWx1ZXMgaW4gdGhpcyBlbnZpcm9ubWVudCAobWF5IGJlIHJlcGVhdGVkLCBtb2Rlcm4gYm9vdHN0cmFwcGluZyBvbmx5KScsXG4gICAgICAgICAgbmFyZ3M6IDEsXG4gICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2Nsb3VkZm9ybWF0aW9uLWV4ZWN1dGlvbi1wb2xpY2llcycsIHtcbiAgICAgICAgICBkZWZhdWx0OiBbXSxcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGRlc2M6ICdUaGUgTWFuYWdlZCBQb2xpY3kgQVJOcyB0aGF0IHNob3VsZCBiZSBhdHRhY2hlZCB0byB0aGUgcm9sZSBwZXJmb3JtaW5nIGRlcGxveW1lbnRzIGludG8gdGhpcyBlbnZpcm9ubWVudCAobWF5IGJlIHJlcGVhdGVkLCBtb2Rlcm4gYm9vdHN0cmFwcGluZyBvbmx5KScsXG4gICAgICAgICAgbmFyZ3M6IDEsXG4gICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIGFsaWFzOiAnZicsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdBbHdheXMgYm9vdHN0cmFwIGV2ZW4gaWYgaXQgd291bGQgZG93bmdyYWRlIHRlbXBsYXRlIHZlcnNpb24nLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCd0ZXJtaW5hdGlvbi1wcm90ZWN0aW9uJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1RvZ2dsZSBDbG91ZEZvcm1hdGlvbiB0ZXJtaW5hdGlvbiBwcm90ZWN0aW9uIG9uIHRoZSBib290c3RyYXAgc3RhY2tzJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignc2hvdy10ZW1wbGF0ZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogXCJJbnN0ZWFkIG9mIGFjdHVhbCBib290c3RyYXBwaW5nLCBwcmludCB0aGUgY3VycmVudCBDTEkncyBib290c3RyYXBwaW5nIHRlbXBsYXRlIHRvIHN0ZG91dCBmb3IgY3VzdG9taXphdGlvblwiLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCd0b29sa2l0LXN0YWNrLW5hbWUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlc2M6ICdUaGUgbmFtZSBvZiB0aGUgQ0RLIHRvb2xraXQgc3RhY2sgdG8gY3JlYXRlJyxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigndGVtcGxhdGUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICAgIGRlc2M6ICdVc2UgdGhlIHRlbXBsYXRlIGZyb20gdGhlIGdpdmVuIGZpbGUgaW5zdGVhZCBvZiB0aGUgYnVpbHQtaW4gb25lICh1c2UgLS1zaG93LXRlbXBsYXRlIHRvIG9idGFpbiBhbiBleGFtcGxlKScsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3ByZXZpb3VzLXBhcmFtZXRlcnMnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1VzZSBwcmV2aW91cyB2YWx1ZXMgZm9yIGV4aXN0aW5nIHBhcmFtZXRlcnMgKHlvdSBtdXN0IHNwZWNpZnkgYWxsIHBhcmFtZXRlcnMgb24gZXZlcnkgZGVwbG95bWVudCBpZiB0aGlzIGlzIGRpc2FibGVkKScsXG4gICAgICAgIH0pLFxuICAgIClcbiAgICAuY29tbWFuZChcbiAgICAgICdnYyBbRU5WSVJPTk1FTlRTLi5dJyxcbiAgICAgICdHYXJiYWdlIGNvbGxlY3QgYXNzZXRzLiBPcHRpb25zIGRldGFpbGVkIGhlcmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9ibG9iL21haW4vcGFja2FnZXMvYXdzLWNkay9SRUFETUUubWQjY2RrLWdjJyxcbiAgICAgICh5YXJnczogQXJndikgPT5cbiAgICAgICAgeWFyZ3NcbiAgICAgICAgICAub3B0aW9uKCdhY3Rpb24nLCB7XG4gICAgICAgICAgICBkZWZhdWx0OiAnZnVsbCcsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGRlc2M6ICdUaGUgYWN0aW9uIChvciBzdWItYWN0aW9uKSB5b3Ugd2FudCB0byBwZXJmb3JtLiBWYWxpZCBlbnRpcmVzIGFyZSBcInByaW50XCIsIFwidGFnXCIsIFwiZGVsZXRlLXRhZ2dlZFwiLCBcImZ1bGxcIi4nLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbigndHlwZScsIHtcbiAgICAgICAgICAgIGRlZmF1bHQ6ICdhbGwnLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBkZXNjOiAnU3BlY2lmeSBlaXRoZXIgZWNyLCBzMywgb3IgYWxsJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3JvbGxiYWNrLWJ1ZmZlci1kYXlzJywge1xuICAgICAgICAgICAgZGVmYXVsdDogMCxcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgZGVzYzogJ0RlbGV0ZSBhc3NldHMgdGhhdCBoYXZlIGJlZW4gbWFya2VkIGFzIGlzb2xhdGVkIGZvciB0aGlzIG1hbnkgZGF5cycsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdjcmVhdGVkLWJ1ZmZlci1kYXlzJywge1xuICAgICAgICAgICAgZGVmYXVsdDogMSxcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgZGVzYzogJ05ldmVyIGRlbGV0ZSBhc3NldHMgeW91bmdlciB0aGFuIHRoaXMgKGluIGRheXMpJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2NvbmZpcm0nLCB7XG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVzYzogJ0NvbmZpcm0gdmlhIG1hbnVhbCBwcm9tcHQgYmVmb3JlIGRlbGV0aW9uJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2Jvb3RzdHJhcC1zdGFjay1uYW1lJywge1xuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICBkZXNjOiAnVGhlIG5hbWUgb2YgdGhlIENESyB0b29sa2l0IHN0YWNrLCBpZiBkaWZmZXJlbnQgZnJvbSB0aGUgZGVmYXVsdCBcIkNES1Rvb2xraXRcIicsXG4gICAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgICB9KSxcbiAgICApXG4gICAgLmNvbW1hbmQoJ2RlcGxveSBbU1RBQ0tTLi5dJywgJ0RlcGxveXMgdGhlIHN0YWNrKHMpIG5hbWVkIFNUQUNLUyBpbnRvIHlvdXIgQVdTIGFjY291bnQnLCAoeWFyZ3M6IEFyZ3YpID0+XG4gICAgICB5YXJnc1xuICAgICAgICAub3B0aW9uKCdhbGwnLCB7XG4gICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdEZXBsb3kgYWxsIGF2YWlsYWJsZSBzdGFja3MnLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdidWlsZC1leGNsdWRlJywge1xuICAgICAgICAgIGRlZmF1bHQ6IFtdLFxuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgYWxpYXM6ICdFJyxcbiAgICAgICAgICBkZXNjOiAnRG8gbm90IHJlYnVpbGQgYXNzZXQgd2l0aCB0aGUgZ2l2ZW4gSUQuIENhbiBiZSBzcGVjaWZpZWQgbXVsdGlwbGUgdGltZXMnLFxuICAgICAgICAgIG5hcmdzOiAxLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdleGNsdXNpdmVseScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGFsaWFzOiAnZScsXG4gICAgICAgICAgZGVzYzogXCJPbmx5IGRlcGxveSByZXF1ZXN0ZWQgc3RhY2tzLCBkb24ndCBpbmNsdWRlIGRlcGVuZGVuY2llc1wiLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdyZXF1aXJlLWFwcHJvdmFsJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBjaG9pY2VzOiBbJ25ldmVyJywgJ2FueS1jaGFuZ2UnLCAnYnJvYWRlbmluZyddLFxuICAgICAgICAgIGRlc2M6ICdXaGF0IHNlY3VyaXR5LXNlbnNpdGl2ZSBjaGFuZ2VzIG5lZWQgbWFudWFsIGFwcHJvdmFsJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignbm90aWZpY2F0aW9uLWFybnMnLCB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICBkZXNjOiBcIkFSTnMgb2YgU05TIHRvcGljcyB0aGF0IENsb3VkRm9ybWF0aW9uIHdpbGwgbm90aWZ5IHdpdGggc3RhY2sgcmVsYXRlZCBldmVudHMuIFRoZXNlIHdpbGwgYmUgYWRkZWQgdG8gQVJOcyBzcGVjaWZpZWQgd2l0aCB0aGUgJ25vdGlmaWNhdGlvbkFybnMnIHN0YWNrIHByb3BlcnR5LlwiLFxuICAgICAgICAgIG5hcmdzOiAxLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCd0YWdzJywge1xuICAgICAgICAgIGRlZmF1bHQ6IFtdLFxuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgYWxpYXM6ICd0JyxcbiAgICAgICAgICBkZXNjOiAnVGFncyB0byBhZGQgdG8gdGhlIHN0YWNrIChLRVk9VkFMVUUpLCBvdmVycmlkZXMgdGFncyBmcm9tIENsb3VkIEFzc2VtYmx5IChkZXByZWNhdGVkKScsXG4gICAgICAgICAgbmFyZ3M6IDEsXG4gICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2V4ZWN1dGUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjOiAnV2hldGhlciB0byBleGVjdXRlIENoYW5nZVNldCAoLS1uby1leGVjdXRlIHdpbGwgTk9UIGV4ZWN1dGUgdGhlIENoYW5nZVNldCkgKGRlcHJlY2F0ZWQpJyxcbiAgICAgICAgICBkZXByZWNhdGVkOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdjaGFuZ2Utc2V0LW5hbWUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlc2M6ICdOYW1lIG9mIHRoZSBDbG91ZEZvcm1hdGlvbiBjaGFuZ2Ugc2V0IHRvIGNyZWF0ZSAob25seSBpZiBtZXRob2QgaXMgbm90IGRpcmVjdCknLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdtZXRob2QnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIGFsaWFzOiAnbScsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgY2hvaWNlczogWydkaXJlY3QnLCAnY2hhbmdlLXNldCcsICdwcmVwYXJlLWNoYW5nZS1zZXQnXSxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgICBkZXNjOiAnSG93IHRvIHBlcmZvcm0gdGhlIGRlcGxveW1lbnQuIERpcmVjdCBpcyBhIGJpdCBmYXN0ZXIgYnV0IGxhY2tzIHByb2dyZXNzIGluZm9ybWF0aW9uJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignaW1wb3J0LWV4aXN0aW5nLXJlc291cmNlcycsIHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ0luZGljYXRlcyBpZiB0aGUgc3RhY2sgc2V0IGltcG9ydHMgcmVzb3VyY2VzIHRoYXQgYWxyZWFkeSBleGlzdC4nLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdmb3JjZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICBhbGlhczogJ2YnLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjOiAnQWx3YXlzIGRlcGxveSBzdGFjayBldmVuIGlmIHRlbXBsYXRlcyBhcmUgaWRlbnRpY2FsJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigncGFyYW1ldGVycycsIHtcbiAgICAgICAgICBkZWZhdWx0OiB7fSxcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGRlc2M6ICdBZGRpdGlvbmFsIHBhcmFtZXRlcnMgcGFzc2VkIHRvIENsb3VkRm9ybWF0aW9uIGF0IGRlcGxveSB0aW1lIChTVEFDSzpLRVk9VkFMVUUpJyxcbiAgICAgICAgICBuYXJnczogMSxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignb3V0cHV0cy1maWxlJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBhbGlhczogJ08nLFxuICAgICAgICAgIGRlc2M6ICdQYXRoIHRvIGZpbGUgd2hlcmUgc3RhY2sgb3V0cHV0cyB3aWxsIGJlIHdyaXR0ZW4gYXMgSlNPTicsXG4gICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3ByZXZpb3VzLXBhcmFtZXRlcnMnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1VzZSBwcmV2aW91cyB2YWx1ZXMgZm9yIGV4aXN0aW5nIHBhcmFtZXRlcnMgKHlvdSBtdXN0IHNwZWNpZnkgYWxsIHBhcmFtZXRlcnMgb24gZXZlcnkgZGVwbG95bWVudCBpZiB0aGlzIGlzIGRpc2FibGVkKScsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3Rvb2xraXQtc3RhY2stbmFtZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVzYzogJ1RoZSBuYW1lIG9mIHRoZSBleGlzdGluZyBDREsgdG9vbGtpdCBzdGFjayAob25seSB1c2VkIGZvciBhcHAgdXNpbmcgbGVnYWN5IHN5bnRoZXNpcyknLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdwcm9ncmVzcycsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgY2hvaWNlczogWydiYXInLCAnZXZlbnRzJ10sXG4gICAgICAgICAgZGVzYzogJ0Rpc3BsYXkgbW9kZSBmb3Igc3RhY2sgYWN0aXZpdHkgZXZlbnRzJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigncm9sbGJhY2snLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjOiBcIlJvbGxiYWNrIHN0YWNrIHRvIHN0YWJsZSBzdGF0ZSBvbiBmYWlsdXJlLiBEZWZhdWx0cyB0byAndHJ1ZScsIGl0ZXJhdGUgbW9yZSByYXBpZGx5IHdpdGggLS1uby1yb2xsYmFjayBvciAtUi4gTm90ZTogZG8gKipub3QqKiBkaXNhYmxlIHRoaXMgZmxhZyBmb3IgZGVwbG95bWVudHMgd2l0aCByZXNvdXJjZSByZXBsYWNlbWVudHMsIGFzIHRoYXQgd2lsbCBhbHdheXMgZmFpbFwiLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdSJywgeyB0eXBlOiAnYm9vbGVhbicsIGhpZGRlbjogdHJ1ZSB9KVxuICAgICAgICAubWlkZGxld2FyZShoZWxwZXJzLnlhcmdzTmVnYXRpdmVBbGlhcygnUicsICdyb2xsYmFjaycpLCB0cnVlKVxuICAgICAgICAub3B0aW9uKCdob3Rzd2FwJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogXCJBdHRlbXB0cyB0byBwZXJmb3JtIGEgJ2hvdHN3YXAnIGRlcGxveW1lbnQsIGJ1dCBkb2VzIG5vdCBmYWxsIGJhY2sgdG8gYSBmdWxsIGRlcGxveW1lbnQgaWYgdGhhdCBpcyBub3QgcG9zc2libGUuIEluc3RlYWQsIGNoYW5nZXMgdG8gYW55IG5vbi1ob3Rzd2FwcGFibGUgcHJvcGVydGllcyBhcmUgaWdub3JlZC5EbyBub3QgdXNlIHRoaXMgaW4gcHJvZHVjdGlvbiBlbnZpcm9ubWVudHNcIixcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignaG90c3dhcC1mYWxsYmFjaycsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6IFwiQXR0ZW1wdHMgdG8gcGVyZm9ybSBhICdob3Rzd2FwJyBkZXBsb3ltZW50LCB3aGljaCBza2lwcyBDbG91ZEZvcm1hdGlvbiBhbmQgdXBkYXRlcyB0aGUgcmVzb3VyY2VzIGRpcmVjdGx5LCBhbmQgZmFsbHMgYmFjayB0byBhIGZ1bGwgZGVwbG95bWVudCBpZiB0aGF0IGlzIG5vdCBwb3NzaWJsZS4gRG8gbm90IHVzZSB0aGlzIGluIHByb2R1Y3Rpb24gZW52aXJvbm1lbnRzXCIsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3dhdGNoJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ0NvbnRpbnVvdXNseSBvYnNlcnZlIHRoZSBwcm9qZWN0IGZpbGVzLCBhbmQgZGVwbG95IHRoZSBnaXZlbiBzdGFjayhzKSBhdXRvbWF0aWNhbGx5IHdoZW4gY2hhbmdlcyBhcmUgZGV0ZWN0ZWQuIEltcGxpZXMgLS1ob3Rzd2FwIGJ5IGRlZmF1bHQnLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdsb2dzJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6IFwiU2hvdyBDbG91ZFdhdGNoIGxvZyBldmVudHMgZnJvbSBhbGwgcmVzb3VyY2VzIGluIHRoZSBzZWxlY3RlZCBTdGFja3MgaW4gdGhlIHRlcm1pbmFsLiAndHJ1ZScgYnkgZGVmYXVsdCwgdXNlIC0tbm8tbG9ncyB0byB0dXJuIG9mZi4gT25seSBpbiBlZmZlY3QgaWYgc3BlY2lmaWVkIGFsb25nc2lkZSB0aGUgJy0td2F0Y2gnIG9wdGlvblwiLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdjb25jdXJyZW5jeScsIHtcbiAgICAgICAgICBkZWZhdWx0OiAxLFxuICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgIGRlc2M6ICdNYXhpbXVtIG51bWJlciBvZiBzaW11bHRhbmVvdXMgZGVwbG95bWVudHMgKGRlcGVuZGVuY3kgcGVybWl0dGluZykgdG8gZXhlY3V0ZS4nLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdhc3NldC1wYXJhbGxlbGlzbScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdXaGV0aGVyIHRvIGJ1aWxkL3B1Ymxpc2ggYXNzZXRzIGluIHBhcmFsbGVsJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignYXNzZXQtcHJlYnVpbGQnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1doZXRoZXIgdG8gYnVpbGQgYWxsIGFzc2V0cyBiZWZvcmUgZGVwbG95aW5nIHRoZSBmaXJzdCBzdGFjayAodXNlZnVsIGZvciBmYWlsaW5nIERvY2tlciBidWlsZHMpJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignaWdub3JlLW5vLXN0YWNrcycsIHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1doZXRoZXIgdG8gZGVwbG95IGlmIHRoZSBhcHAgY29udGFpbnMgbm8gc3RhY2tzJyxcbiAgICAgICAgfSksXG4gICAgKVxuICAgIC5jb21tYW5kKCdyb2xsYmFjayBbU1RBQ0tTLi5dJywgJ1JvbGxzIGJhY2sgdGhlIHN0YWNrKHMpIG5hbWVkIFNUQUNLUyB0byB0aGVpciBsYXN0IHN0YWJsZSBzdGF0ZScsICh5YXJnczogQXJndikgPT5cbiAgICAgIHlhcmdzXG4gICAgICAgIC5vcHRpb24oJ2FsbCcsIHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1JvbGwgYmFjayBhbGwgYXZhaWxhYmxlIHN0YWNrcycsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3Rvb2xraXQtc3RhY2stbmFtZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVzYzogJ1RoZSBuYW1lIG9mIHRoZSBDREsgdG9vbGtpdCBzdGFjayB0aGUgZW52aXJvbm1lbnQgaXMgYm9vdHN0cmFwcGVkIHdpdGgnLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdmb3JjZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgYWxpYXM6ICdmJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ09ycGhhbiBhbGwgcmVzb3VyY2VzIGZvciB3aGljaCB0aGUgcm9sbGJhY2sgb3BlcmF0aW9uIGZhaWxzLicsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3ZhbGlkYXRlLWJvb3RzdHJhcC12ZXJzaW9uJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogXCJXaGV0aGVyIHRvIHZhbGlkYXRlIHRoZSBib290c3RyYXAgc3RhY2sgdmVyc2lvbi4gRGVmYXVsdHMgdG8gJ3RydWUnLCBkaXNhYmxlIHdpdGggLS1uby12YWxpZGF0ZS1ib290c3RyYXAtdmVyc2lvbi5cIixcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignb3JwaGFuJywge1xuICAgICAgICAgIGRlZmF1bHQ6IFtdLFxuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgZGVzYzogJ09ycGhhbiB0aGUgZ2l2ZW4gcmVzb3VyY2VzLCBpZGVudGlmaWVkIGJ5IHRoZWlyIGxvZ2ljYWwgSUQgKGNhbiBiZSBzcGVjaWZpZWQgbXVsdGlwbGUgdGltZXMpJyxcbiAgICAgICAgICBuYXJnczogMSxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgKVxuICAgIC5jb21tYW5kKCdpbXBvcnQgW1NUQUNLXScsICdJbXBvcnQgZXhpc3RpbmcgcmVzb3VyY2UocykgaW50byB0aGUgZ2l2ZW4gU1RBQ0snLCAoeWFyZ3M6IEFyZ3YpID0+XG4gICAgICB5YXJnc1xuICAgICAgICAub3B0aW9uKCdleGVjdXRlJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdXaGV0aGVyIHRvIGV4ZWN1dGUgQ2hhbmdlU2V0ICgtLW5vLWV4ZWN1dGUgd2lsbCBOT1QgZXhlY3V0ZSB0aGUgQ2hhbmdlU2V0KScsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2NoYW5nZS1zZXQtbmFtZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVzYzogJ05hbWUgb2YgdGhlIENsb3VkRm9ybWF0aW9uIGNoYW5nZSBzZXQgdG8gY3JlYXRlJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigndG9vbGtpdC1zdGFjay1uYW1lJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZXNjOiAnVGhlIG5hbWUgb2YgdGhlIENESyB0b29sa2l0IHN0YWNrIHRvIGNyZWF0ZScsXG4gICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3JvbGxiYWNrJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogXCJSb2xsYmFjayBzdGFjayB0byBzdGFibGUgc3RhdGUgb24gZmFpbHVyZS4gRGVmYXVsdHMgdG8gJ3RydWUnLCBpdGVyYXRlIG1vcmUgcmFwaWRseSB3aXRoIC0tbm8tcm9sbGJhY2sgb3IgLVIuIE5vdGU6IGRvICoqbm90KiogZGlzYWJsZSB0aGlzIGZsYWcgZm9yIGRlcGxveW1lbnRzIHdpdGggcmVzb3VyY2UgcmVwbGFjZW1lbnRzLCBhcyB0aGF0IHdpbGwgYWx3YXlzIGZhaWxcIixcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignZm9yY2UnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIGFsaWFzOiAnZicsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6IFwiRG8gbm90IGFib3J0IGlmIHRoZSB0ZW1wbGF0ZSBkaWZmIGluY2x1ZGVzIHVwZGF0ZXMgb3IgZGVsZXRlcy4gVGhpcyBpcyBwcm9iYWJseSBzYWZlIGJ1dCB3ZSdyZSBub3Qgc3VyZSwgbGV0IHVzIGtub3cgaG93IGl0IGdvZXMuXCIsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3JlY29yZC1yZXNvdXJjZS1tYXBwaW5nJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBhbGlhczogJ3InLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICAgIGRlc2M6ICdJZiBzcGVjaWZpZWQsIENESyB3aWxsIGdlbmVyYXRlIGEgbWFwcGluZyBvZiBleGlzdGluZyBwaHlzaWNhbCByZXNvdXJjZXMgdG8gQ0RLIHJlc291cmNlcyB0byBiZSBpbXBvcnRlZCBhcy4gVGhlIG1hcHBpbmcgd2lsbCBiZSB3cml0dGVuIGluIHRoZSBnaXZlbiBmaWxlIHBhdGguIE5vIGFjdHVhbCBpbXBvcnQgb3BlcmF0aW9uIHdpbGwgYmUgcGVyZm9ybWVkJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigncmVzb3VyY2UtbWFwcGluZycsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgYWxpYXM6ICdtJyxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgICBkZXNjOiAnSWYgc3BlY2lmaWVkLCBDREsgd2lsbCB1c2UgdGhlIGdpdmVuIGZpbGUgdG8gbWFwIHBoeXNpY2FsIHJlc291cmNlcyB0byBDREsgcmVzb3VyY2VzIGZvciBpbXBvcnQsIGluc3RlYWQgb2YgaW50ZXJhY3RpdmVseSBhc2tpbmcgdGhlIHVzZXIuIENhbiBiZSBydW4gZnJvbSBzY3JpcHRzJyxcbiAgICAgICAgfSksXG4gICAgKVxuICAgIC5jb21tYW5kKCd3YXRjaCBbU1RBQ0tTLi5dJywgXCJTaG9ydGN1dCBmb3IgJ2RlcGxveSAtLXdhdGNoJ1wiLCAoeWFyZ3M6IEFyZ3YpID0+XG4gICAgICB5YXJnc1xuICAgICAgICAub3B0aW9uKCdidWlsZC1leGNsdWRlJywge1xuICAgICAgICAgIGRlZmF1bHQ6IFtdLFxuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgYWxpYXM6ICdFJyxcbiAgICAgICAgICBkZXNjOiAnRG8gbm90IHJlYnVpbGQgYXNzZXQgd2l0aCB0aGUgZ2l2ZW4gSUQuIENhbiBiZSBzcGVjaWZpZWQgbXVsdGlwbGUgdGltZXMnLFxuICAgICAgICAgIG5hcmdzOiAxLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdleGNsdXNpdmVseScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGFsaWFzOiAnZScsXG4gICAgICAgICAgZGVzYzogXCJPbmx5IGRlcGxveSByZXF1ZXN0ZWQgc3RhY2tzLCBkb24ndCBpbmNsdWRlIGRlcGVuZGVuY2llc1wiLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdjaGFuZ2Utc2V0LW5hbWUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlc2M6ICdOYW1lIG9mIHRoZSBDbG91ZEZvcm1hdGlvbiBjaGFuZ2Ugc2V0IHRvIGNyZWF0ZScsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2ZvcmNlJywge1xuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIGFsaWFzOiAnZicsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdBbHdheXMgZGVwbG95IHN0YWNrIGV2ZW4gaWYgdGVtcGxhdGVzIGFyZSBpZGVudGljYWwnLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCd0b29sa2l0LXN0YWNrLW5hbWUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlc2M6ICdUaGUgbmFtZSBvZiB0aGUgZXhpc3RpbmcgQ0RLIHRvb2xraXQgc3RhY2sgKG9ubHkgdXNlZCBmb3IgYXBwIHVzaW5nIGxlZ2FjeSBzeW50aGVzaXMpJyxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbigncHJvZ3Jlc3MnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGNob2ljZXM6IFsnYmFyJywgJ2V2ZW50cyddLFxuICAgICAgICAgIGRlc2M6ICdEaXNwbGF5IG1vZGUgZm9yIHN0YWNrIGFjdGl2aXR5IGV2ZW50cycsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ3JvbGxiYWNrJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogXCJSb2xsYmFjayBzdGFjayB0byBzdGFibGUgc3RhdGUgb24gZmFpbHVyZS4gRGVmYXVsdHMgdG8gJ3RydWUnLCBpdGVyYXRlIG1vcmUgcmFwaWRseSB3aXRoIC0tbm8tcm9sbGJhY2sgb3IgLVIuIE5vdGU6IGRvICoqbm90KiogZGlzYWJsZSB0aGlzIGZsYWcgZm9yIGRlcGxveW1lbnRzIHdpdGggcmVzb3VyY2UgcmVwbGFjZW1lbnRzLCBhcyB0aGF0IHdpbGwgYWx3YXlzIGZhaWxcIixcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignUicsIHsgdHlwZTogJ2Jvb2xlYW4nLCBoaWRkZW46IHRydWUgfSlcbiAgICAgICAgLm1pZGRsZXdhcmUoaGVscGVycy55YXJnc05lZ2F0aXZlQWxpYXMoJ1InLCAncm9sbGJhY2snKSwgdHJ1ZSlcbiAgICAgICAgLm9wdGlvbignaG90c3dhcCcsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6IFwiQXR0ZW1wdHMgdG8gcGVyZm9ybSBhICdob3Rzd2FwJyBkZXBsb3ltZW50LCBidXQgZG9lcyBub3QgZmFsbCBiYWNrIHRvIGEgZnVsbCBkZXBsb3ltZW50IGlmIHRoYXQgaXMgbm90IHBvc3NpYmxlLiBJbnN0ZWFkLCBjaGFuZ2VzIHRvIGFueSBub24taG90c3dhcHBhYmxlIHByb3BlcnRpZXMgYXJlIGlnbm9yZWQuJ3RydWUnIGJ5IGRlZmF1bHQsIHVzZSAtLW5vLWhvdHN3YXAgdG8gdHVybiBvZmZcIixcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignaG90c3dhcC1mYWxsYmFjaycsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6IFwiQXR0ZW1wdHMgdG8gcGVyZm9ybSBhICdob3Rzd2FwJyBkZXBsb3ltZW50LCB3aGljaCBza2lwcyBDbG91ZEZvcm1hdGlvbiBhbmQgdXBkYXRlcyB0aGUgcmVzb3VyY2VzIGRpcmVjdGx5LCBhbmQgZmFsbHMgYmFjayB0byBhIGZ1bGwgZGVwbG95bWVudCBpZiB0aGF0IGlzIG5vdCBwb3NzaWJsZS5cIixcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignbG9ncycsIHtcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjOiBcIlNob3cgQ2xvdWRXYXRjaCBsb2cgZXZlbnRzIGZyb20gYWxsIHJlc291cmNlcyBpbiB0aGUgc2VsZWN0ZWQgU3RhY2tzIGluIHRoZSB0ZXJtaW5hbC4gJ3RydWUnIGJ5IGRlZmF1bHQsIHVzZSAtLW5vLWxvZ3MgdG8gdHVybiBvZmZcIixcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignY29uY3VycmVuY3knLCB7XG4gICAgICAgICAgZGVmYXVsdDogMSxcbiAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICBkZXNjOiAnTWF4aW11bSBudW1iZXIgb2Ygc2ltdWx0YW5lb3VzIGRlcGxveW1lbnRzIChkZXBlbmRlbmN5IHBlcm1pdHRpbmcpIHRvIGV4ZWN1dGUuJyxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSksXG4gICAgKVxuICAgIC5jb21tYW5kKCdkZXN0cm95IFtTVEFDS1MuLl0nLCAnRGVzdHJveSB0aGUgc3RhY2socykgbmFtZWQgU1RBQ0tTJywgKHlhcmdzOiBBcmd2KSA9PlxuICAgICAgeWFyZ3NcbiAgICAgICAgLm9wdGlvbignYWxsJywge1xuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjOiAnRGVzdHJveSBhbGwgYXZhaWxhYmxlIHN0YWNrcycsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2V4Y2x1c2l2ZWx5Jywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgYWxpYXM6ICdlJyxcbiAgICAgICAgICBkZXNjOiBcIk9ubHkgZGVzdHJveSByZXF1ZXN0ZWQgc3RhY2tzLCBkb24ndCBpbmNsdWRlIGRlcGVuZGVlc1wiLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdmb3JjZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGFsaWFzOiAnZicsXG4gICAgICAgICAgZGVzYzogJ0RvIG5vdCBhc2sgZm9yIGNvbmZpcm1hdGlvbiBiZWZvcmUgZGVzdHJveWluZyB0aGUgc3RhY2tzJyxcbiAgICAgICAgfSksXG4gICAgKVxuICAgIC5jb21tYW5kKFxuICAgICAgJ2RpZmYgW1NUQUNLUy4uXScsXG4gICAgICAnQ29tcGFyZXMgdGhlIHNwZWNpZmllZCBzdGFjayB3aXRoIHRoZSBkZXBsb3llZCBzdGFjayBvciBhIGxvY2FsIHRlbXBsYXRlIGZpbGUsIGFuZCByZXR1cm5zIHdpdGggc3RhdHVzIDEgaWYgYW55IGRpZmZlcmVuY2UgaXMgZm91bmQnLFxuICAgICAgKHlhcmdzOiBBcmd2KSA9PlxuICAgICAgICB5YXJnc1xuICAgICAgICAgIC5vcHRpb24oJ2V4Y2x1c2l2ZWx5Jywge1xuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgYWxpYXM6ICdlJyxcbiAgICAgICAgICAgIGRlc2M6IFwiT25seSBkaWZmIHJlcXVlc3RlZCBzdGFja3MsIGRvbid0IGluY2x1ZGUgZGVwZW5kZW5jaWVzXCIsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdjb250ZXh0LWxpbmVzJywge1xuICAgICAgICAgICAgZGVmYXVsdDogMyxcbiAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgZGVzYzogJ051bWJlciBvZiBjb250ZXh0IGxpbmVzIHRvIGluY2x1ZGUgaW4gYXJiaXRyYXJ5IEpTT04gZGlmZiByZW5kZXJpbmcnLFxuICAgICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCd0ZW1wbGF0ZScsIHtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgZGVzYzogJ1RoZSBwYXRoIHRvIHRoZSBDbG91ZEZvcm1hdGlvbiB0ZW1wbGF0ZSB0byBjb21wYXJlIHdpdGgnLFxuICAgICAgICAgICAgcmVxdWlyZXNBcmc6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdzdHJpY3QnLCB7XG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlc2M6ICdEbyBub3QgZmlsdGVyIG91dCBBV1M6OkNESzo6TWV0YWRhdGEgcmVzb3VyY2VzLCBtYW5nbGVkIG5vbi1BU0NJSSBjaGFyYWN0ZXJzLCBvciB0aGUgQ2hlY2tCb290c3RyYXBWZXJzaW9uUnVsZScsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdzZWN1cml0eS1vbmx5Jywge1xuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZXNjOiAnT25seSBkaWZmIGZvciBicm9hZGVuZWQgc2VjdXJpdHkgY2hhbmdlcycsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmYWlsJywge1xuICAgICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVzYzogJ0ZhaWwgd2l0aCBleGl0IGNvZGUgMSBpbiBjYXNlIG9mIGRpZmYnLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbigncHJvY2Vzc2VkJywge1xuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZXNjOiAnV2hldGhlciB0byBjb21wYXJlIGFnYWluc3QgdGhlIHRlbXBsYXRlIHdpdGggVHJhbnNmb3JtcyBhbHJlYWR5IHByb2Nlc3NlZCcsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdxdWlldCcsIHtcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgYWxpYXM6ICdxJyxcbiAgICAgICAgICAgIGRlc2M6ICdEbyBub3QgcHJpbnQgc3RhY2sgbmFtZSBhbmQgZGVmYXVsdCBtZXNzYWdlIHdoZW4gdGhlcmUgaXMgbm8gZGlmZiB0byBzdGRvdXQnLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignY2hhbmdlLXNldCcsIHtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBhbGlhczogJ2NoYW5nZXNldCcsXG4gICAgICAgICAgICBkZXNjOiAnV2hldGhlciB0byBjcmVhdGUgYSBjaGFuZ2VzZXQgdG8gYW5hbHl6ZSByZXNvdXJjZSByZXBsYWNlbWVudHMuIEluIHRoaXMgbW9kZSwgZGlmZiB3aWxsIHVzZSB0aGUgZGVwbG95IHJvbGUgaW5zdGVhZCBvZiB0aGUgbG9va3VwIHJvbGUuJyxcbiAgICAgICAgICB9KSxcbiAgICApXG4gICAgLmNvbW1hbmQoJ21ldGFkYXRhIFtTVEFDS10nLCAnUmV0dXJucyBhbGwgbWV0YWRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc3RhY2snKVxuICAgIC5jb21tYW5kKFsnYWNrbm93bGVkZ2UgW0lEXScsICdhY2sgW0lEXSddLCAnQWNrbm93bGVkZ2UgYSBub3RpY2Ugc28gdGhhdCBpdCBkb2VzIG5vdCBzaG93IHVwIGFueW1vcmUnKVxuICAgIC5jb21tYW5kKCdub3RpY2VzJywgJ1JldHVybnMgYSBsaXN0IG9mIHJlbGV2YW50IG5vdGljZXMnLCAoeWFyZ3M6IEFyZ3YpID0+XG4gICAgICB5YXJncy5vcHRpb24oJ3VuYWNrbm93bGVkZ2VkJywge1xuICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICBhbGlhczogJ3UnLFxuICAgICAgICBkZXNjOiAnUmV0dXJucyBhIGxpc3Qgb2YgdW5hY2tub3dsZWRnZWQgbm90aWNlcycsXG4gICAgICB9KSxcbiAgICApXG4gICAgLmNvbW1hbmQoJ2luaXQgW1RFTVBMQVRFXScsICdDcmVhdGUgYSBuZXcsIGVtcHR5IENESyBwcm9qZWN0IGZyb20gYSB0ZW1wbGF0ZS4nLCAoeWFyZ3M6IEFyZ3YpID0+XG4gICAgICB5YXJnc1xuICAgICAgICAub3B0aW9uKCdsYW5ndWFnZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgYWxpYXM6ICdsJyxcbiAgICAgICAgICBkZXNjOiAnVGhlIGxhbmd1YWdlIHRvIGJlIHVzZWQgZm9yIHRoZSBuZXcgcHJvamVjdCAoZGVmYXVsdCBjYW4gYmUgY29uZmlndXJlZCBpbiB+Ly5jZGsuanNvbiknLFxuICAgICAgICAgIGNob2ljZXM6IFsnY3NoYXJwJywgJ2ZzaGFycCcsICdnbycsICdqYXZhJywgJ2phdmFzY3JpcHQnLCAncHl0aG9uJywgJ3R5cGVzY3JpcHQnXSxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignbGlzdCcsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIGRlc2M6ICdMaXN0IHRoZSBhdmFpbGFibGUgdGVtcGxhdGVzJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignZ2VuZXJhdGUtb25seScsIHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ0lmIHRydWUsIG9ubHkgZ2VuZXJhdGVzIHByb2plY3QgZmlsZXMsIHdpdGhvdXQgZXhlY3V0aW5nIGFkZGl0aW9uYWwgb3BlcmF0aW9ucyBzdWNoIGFzIHNldHRpbmcgdXAgYSBnaXQgcmVwbywgaW5zdGFsbGluZyBkZXBlbmRlbmNpZXMgb3IgY29tcGlsaW5nIHRoZSBwcm9qZWN0JyxcbiAgICAgICAgfSksXG4gICAgKVxuICAgIC5jb21tYW5kKCdtaWdyYXRlJywgJ01pZ3JhdGUgZXhpc3RpbmcgQVdTIHJlc291cmNlcyBpbnRvIGEgQ0RLIGFwcCcsICh5YXJnczogQXJndikgPT5cbiAgICAgIHlhcmdzXG4gICAgICAgIC5vcHRpb24oJ3N0YWNrLW5hbWUnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGFsaWFzOiAnbicsXG4gICAgICAgICAgZGVzYzogJ1RoZSBuYW1lIGFzc2lnbmVkIHRvIHRoZSBzdGFjayBjcmVhdGVkIGluIHRoZSBuZXcgcHJvamVjdC4gVGhlIG5hbWUgb2YgdGhlIGFwcCB3aWxsIGJlIGJhc2VkIG9mZiB0aGlzIG5hbWUgYXMgd2VsbC4nLFxuICAgICAgICAgIHJlcXVpcmVzQXJnOiB0cnVlLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdsYW5ndWFnZScsIHtcbiAgICAgICAgICBkZWZhdWx0OiAndHlwZXNjcmlwdCcsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgYWxpYXM6ICdsJyxcbiAgICAgICAgICBkZXNjOiAnVGhlIGxhbmd1YWdlIHRvIGJlIHVzZWQgZm9yIHRoZSBuZXcgcHJvamVjdCcsXG4gICAgICAgICAgY2hvaWNlczogWyd0eXBlc2NyaXB0JywgJ2dvJywgJ2phdmEnLCAncHl0aG9uJywgJ2NzaGFycCddLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdhY2NvdW50Jywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZXNjOiAnVGhlIGFjY291bnQgdG8gcmV0cmlldmUgdGhlIENsb3VkRm9ybWF0aW9uIHN0YWNrIHRlbXBsYXRlIGZyb20nLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdyZWdpb24nLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIGRlc2M6ICdUaGUgcmVnaW9uIHRvIHJldHJpZXZlIHRoZSBDbG91ZEZvcm1hdGlvbiBzdGFjayB0ZW1wbGF0ZSBmcm9tJyxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignZnJvbS1wYXRoJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZXNjOiAnVGhlIHBhdGggdG8gdGhlIENsb3VkRm9ybWF0aW9uIHRlbXBsYXRlIHRvIG1pZ3JhdGUuIFVzZSB0aGlzIGZvciBsb2NhbGx5IHN0b3JlZCB0ZW1wbGF0ZXMnLFxuICAgICAgICB9KVxuICAgICAgICAub3B0aW9uKCdmcm9tLXN0YWNrJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgZGVzYzogJ1VzZSB0aGlzIGZsYWcgdG8gcmV0cmlldmUgdGhlIHRlbXBsYXRlIGZvciBhbiBleGlzdGluZyBDbG91ZEZvcm1hdGlvbiBzdGFjaycsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ291dHB1dC1wYXRoJywge1xuICAgICAgICAgIGRlZmF1bHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICBkZXNjOiAnVGhlIG91dHB1dCBwYXRoIGZvciB0aGUgbWlncmF0ZWQgQ0RLIGFwcCcsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2Zyb20tc2NhbicsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgZGVzYzogJ0RldGVybWluZXMgaWYgYSBuZXcgc2NhbiBzaG91bGQgYmUgY3JlYXRlZCwgb3IgdGhlIGxhc3Qgc3VjY2Vzc2Z1bCBleGlzdGluZyBzY2FuIHNob3VsZCBiZSB1c2VkIFxcbiBvcHRpb25zIGFyZSBcIm5ld1wiIG9yIFwibW9zdC1yZWNlbnRcIicsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2ZpbHRlcicsIHtcbiAgICAgICAgICBkZWZhdWx0OiBbXSxcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIGRlc2M6ICdGaWx0ZXJzIHRoZSByZXNvdXJjZSBzY2FuIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBjcml0ZXJpYSBpbiB0aGUgZm9sbG93aW5nIGZvcm1hdDogXCJrZXkxPXZhbHVlMSxrZXkyPXZhbHVlMlwiXFxuIFRoaXMgZmllbGQgY2FuIGJlIHBhc3NlZCBtdWx0aXBsZSB0aW1lcyBmb3IgT1Igc3R5bGUgZmlsdGVyaW5nOiBcXG4gZmlsdGVyaW5nIG9wdGlvbnM6IFxcbiByZXNvdXJjZS1pZGVudGlmaWVyOiBBIGtleS12YWx1ZSBwYWlyIHRoYXQgaWRlbnRpZmllcyB0aGUgdGFyZ2V0IHJlc291cmNlLiBpLmUuIHtcIkNsdXN0ZXJOYW1lXCIsIFwibXlDbHVzdGVyXCJ9XFxuIHJlc291cmNlLXR5cGUtcHJlZml4OiBBIHN0cmluZyB0aGF0IHJlcHJlc2VudHMgYSB0eXBlLW5hbWUgcHJlZml4LiBpLmUuIFwiQVdTOjpEeW5hbW9EQjo6XCJcXG4gdGFnLWtleTogYSBzdHJpbmcgdGhhdCBtYXRjaGVzIHJlc291cmNlcyB3aXRoIGF0IGxlYXN0IG9uZSB0YWcgd2l0aCB0aGUgcHJvdmlkZWQga2V5LiBpLmUuIFwibXlUYWdLZXlcIlxcbiB0YWctdmFsdWU6IGEgc3RyaW5nIHRoYXQgbWF0Y2hlcyByZXNvdXJjZXMgd2l0aCBhdCBsZWFzdCBvbmUgdGFnIHdpdGggdGhlIHByb3ZpZGVkIHZhbHVlLiBpLmUuIFwibXlUYWdWYWx1ZVwiJyxcbiAgICAgICAgICBuYXJnczogMSxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignY29tcHJlc3MnLCB7XG4gICAgICAgICAgZGVmYXVsdDogdW5kZWZpbmVkLFxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICBkZXNjOiAnVXNlIHRoaXMgZmxhZyB0byB6aXAgdGhlIGdlbmVyYXRlZCBDREsgYXBwJyxcbiAgICAgICAgfSksXG4gICAgKVxuICAgIC5jb21tYW5kKCdjb250ZXh0JywgJ01hbmFnZSBjYWNoZWQgY29udGV4dCB2YWx1ZXMnLCAoeWFyZ3M6IEFyZ3YpID0+XG4gICAgICB5YXJnc1xuICAgICAgICAub3B0aW9uKCdyZXNldCcsIHtcbiAgICAgICAgICBkZWZhdWx0OiB1bmRlZmluZWQsXG4gICAgICAgICAgYWxpYXM6ICdlJyxcbiAgICAgICAgICBkZXNjOiAnVGhlIGNvbnRleHQga2V5IChvciBpdHMgaW5kZXgpIHRvIHJlc2V0JyxcbiAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICByZXF1aXJlc0FyZzogdHJ1ZSxcbiAgICAgICAgfSlcbiAgICAgICAgLm9wdGlvbignZm9yY2UnLCB7XG4gICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgYWxpYXM6ICdmJyxcbiAgICAgICAgICBkZXNjOiAnSWdub3JlIG1pc3Npbmcga2V5IGVycm9yJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIH0pXG4gICAgICAgIC5vcHRpb24oJ2NsZWFyJywge1xuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIGRlc2M6ICdDbGVhciBhbGwgY29udGV4dCcsXG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICB9KSxcbiAgICApXG4gICAgLmNvbW1hbmQoWydkb2NzJywgJ2RvYyddLCAnT3BlbnMgdGhlIHJlZmVyZW5jZSBkb2N1bWVudGF0aW9uIGluIGEgYnJvd3NlcicsICh5YXJnczogQXJndikgPT5cbiAgICAgIHlhcmdzLm9wdGlvbignYnJvd3NlcicsIHtcbiAgICAgICAgZGVmYXVsdDogaGVscGVycy5icm93c2VyRm9yUGxhdGZvcm0oKSxcbiAgICAgICAgYWxpYXM6ICdiJyxcbiAgICAgICAgZGVzYzogJ3RoZSBjb21tYW5kIHRvIHVzZSB0byBvcGVuIHRoZSBicm93c2VyLCB1c2luZyAldSBhcyBhIHBsYWNlaG9sZGVyIGZvciB0aGUgcGF0aCBvZiB0aGUgZmlsZSB0byBvcGVuJyxcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICB9KSxcbiAgICApXG4gICAgLmNvbW1hbmQoJ2RvY3RvcicsICdDaGVjayB5b3VyIHNldC11cCBmb3IgcG90ZW50aWFsIHByb2JsZW1zJylcbiAgICAudmVyc2lvbihoZWxwZXJzLmNsaVZlcnNpb24oKSlcbiAgICAuZGVtYW5kQ29tbWFuZCgxLCAnJylcbiAgICAucmVjb21tZW5kQ29tbWFuZHMoKVxuICAgIC5oZWxwKClcbiAgICAuYWxpYXMoJ2gnLCAnaGVscCcpXG4gICAgLmVwaWxvZ3VlKFxuICAgICAgJ0lmIHlvdXIgYXBwIGhhcyBhIHNpbmdsZSBzdGFjaywgdGhlcmUgaXMgbm8gbmVlZCB0byBzcGVjaWZ5IHRoZSBzdGFjayBuYW1lXFxuXFxuSWYgb25lIG9mIGNkay5qc29uIG9yIH4vLmNkay5qc29uIGV4aXN0cywgb3B0aW9ucyBzcGVjaWZpZWQgdGhlcmUgd2lsbCBiZSB1c2VkIGFzIGRlZmF1bHRzLiBTZXR0aW5ncyBpbiBjZGsuanNvbiB0YWtlIHByZWNlZGVuY2UuJyxcbiAgICApXG4gICAgLnBhcnNlKGFyZ3MpO1xufSAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXJlcXVpcmUtaW1wb3J0c1xuY29uc3QgeWFyZ3MgPSByZXF1aXJlKCd5YXJncycpO1xuIl19