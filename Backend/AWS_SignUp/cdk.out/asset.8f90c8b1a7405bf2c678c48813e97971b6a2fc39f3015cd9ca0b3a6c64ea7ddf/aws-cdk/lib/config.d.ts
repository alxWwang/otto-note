import { CliHelpers, type CliConfig } from '@aws-cdk/cli-args-gen';
export declare const YARGS_HELPERS: CliHelpers;
/**
 * Source of truth for all CDK CLI commands. `cli-args-gen` translates this into the `yargs` definition
 * in `lib/parse-command-line-arguments.ts`.
 */
export declare function makeConfig(): Promise<CliConfig>;
