"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToCliArgs = convertToCliArgs;
// @ts-ignore TS6133
function convertToCliArgs(args) {
    const globalOptions = {
        app: args.app,
        build: args.build,
        context: args.context,
        plugin: args.plugin,
        trace: args.trace,
        strict: args.strict,
        lookups: args.lookups,
        ignoreErrors: args.ignoreErrors,
        json: args.json,
        verbose: args.verbose,
        debug: args.debug,
        profile: args.profile,
        proxy: args.proxy,
        caBundlePath: args.caBundlePath,
        ec2creds: args.ec2creds,
        versionReporting: args.versionReporting,
        pathMetadata: args.pathMetadata,
        assetMetadata: args.assetMetadata,
        roleArn: args.roleArn,
        staging: args.staging,
        output: args.output,
        notices: args.notices,
        noColor: args.noColor,
        ci: args.ci,
        unstable: args.unstable,
    };
    let commandOptions;
    switch (args._[0]) {
        case 'list':
            commandOptions = {
                long: args.long,
                showDependencies: args.showDependencies,
                STACKS: args.STACKS,
            };
            break;
        case 'synthesize':
            commandOptions = {
                exclusively: args.exclusively,
                validation: args.validation,
                quiet: args.quiet,
                STACKS: args.STACKS,
            };
            break;
        case 'bootstrap':
            commandOptions = {
                bootstrapBucketName: args.bootstrapBucketName,
                bootstrapKmsKeyId: args.bootstrapKmsKeyId,
                examplePermissionsBoundary: args.examplePermissionsBoundary,
                customPermissionsBoundary: args.customPermissionsBoundary,
                bootstrapCustomerKey: args.bootstrapCustomerKey,
                qualifier: args.qualifier,
                publicAccessBlockConfiguration: args.publicAccessBlockConfiguration,
                tags: args.tags,
                execute: args.execute,
                trust: args.trust,
                trustForLookup: args.trustForLookup,
                cloudformationExecutionPolicies: args.cloudformationExecutionPolicies,
                force: args.force,
                terminationProtection: args.terminationProtection,
                showTemplate: args.showTemplate,
                toolkitStackName: args.toolkitStackName,
                template: args.template,
                previousParameters: args.previousParameters,
                ENVIRONMENTS: args.ENVIRONMENTS,
            };
            break;
        case 'gc':
            commandOptions = {
                action: args.action,
                type: args.type,
                rollbackBufferDays: args.rollbackBufferDays,
                createdBufferDays: args.createdBufferDays,
                confirm: args.confirm,
                bootstrapStackName: args.bootstrapStackName,
                ENVIRONMENTS: args.ENVIRONMENTS,
            };
            break;
        case 'deploy':
            commandOptions = {
                all: args.all,
                buildExclude: args.buildExclude,
                exclusively: args.exclusively,
                requireApproval: args.requireApproval,
                notificationArns: args.notificationArns,
                tags: args.tags,
                execute: args.execute,
                changeSetName: args.changeSetName,
                method: args.method,
                importExistingResources: args.importExistingResources,
                force: args.force,
                parameters: args.parameters,
                outputsFile: args.outputsFile,
                previousParameters: args.previousParameters,
                toolkitStackName: args.toolkitStackName,
                progress: args.progress,
                rollback: args.rollback,
                hotswap: args.hotswap,
                hotswapFallback: args.hotswapFallback,
                watch: args.watch,
                logs: args.logs,
                concurrency: args.concurrency,
                assetParallelism: args.assetParallelism,
                assetPrebuild: args.assetPrebuild,
                ignoreNoStacks: args.ignoreNoStacks,
                STACKS: args.STACKS,
            };
            break;
        case 'rollback':
            commandOptions = {
                all: args.all,
                toolkitStackName: args.toolkitStackName,
                force: args.force,
                validateBootstrapVersion: args.validateBootstrapVersion,
                orphan: args.orphan,
                STACKS: args.STACKS,
            };
            break;
        case 'import':
            commandOptions = {
                execute: args.execute,
                changeSetName: args.changeSetName,
                toolkitStackName: args.toolkitStackName,
                rollback: args.rollback,
                force: args.force,
                recordResourceMapping: args.recordResourceMapping,
                resourceMapping: args.resourceMapping,
                STACK: args.STACK,
            };
            break;
        case 'watch':
            commandOptions = {
                buildExclude: args.buildExclude,
                exclusively: args.exclusively,
                changeSetName: args.changeSetName,
                force: args.force,
                toolkitStackName: args.toolkitStackName,
                progress: args.progress,
                rollback: args.rollback,
                hotswap: args.hotswap,
                hotswapFallback: args.hotswapFallback,
                logs: args.logs,
                concurrency: args.concurrency,
                STACKS: args.STACKS,
            };
            break;
        case 'destroy':
            commandOptions = {
                all: args.all,
                exclusively: args.exclusively,
                force: args.force,
                STACKS: args.STACKS,
            };
            break;
        case 'diff':
            commandOptions = {
                exclusively: args.exclusively,
                contextLines: args.contextLines,
                template: args.template,
                strict: args.strict,
                securityOnly: args.securityOnly,
                fail: args.fail,
                processed: args.processed,
                quiet: args.quiet,
                changeSet: args.changeSet,
                STACKS: args.STACKS,
            };
            break;
        case 'metadata':
            commandOptions = {
                STACK: args.STACK,
            };
            break;
        case 'acknowledge':
            commandOptions = {
                ID: args.ID,
            };
            break;
        case 'notices':
            commandOptions = {
                unacknowledged: args.unacknowledged,
            };
            break;
        case 'init':
            commandOptions = {
                language: args.language,
                list: args.list,
                generateOnly: args.generateOnly,
                TEMPLATE: args.TEMPLATE,
            };
            break;
        case 'migrate':
            commandOptions = {
                stackName: args.stackName,
                language: args.language,
                account: args.account,
                region: args.region,
                fromPath: args.fromPath,
                fromStack: args.fromStack,
                outputPath: args.outputPath,
                fromScan: args.fromScan,
                filter: args.filter,
                compress: args.compress,
            };
            break;
        case 'context':
            commandOptions = {
                reset: args.reset,
                force: args.force,
                clear: args.clear,
            };
            break;
        case 'docs':
            commandOptions = {
                browser: args.browser,
            };
            break;
        case 'doctor':
            commandOptions = {};
            break;
    }
    const cliArguments = {
        _: args._[0],
        globalOptions,
        [args._[0]]: commandOptions,
    };
    return cliArguments;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydC10by1jbGktYXJncy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnZlcnQtdG8tY2xpLWFyZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFTQSw0Q0FzUEM7QUF2UEQsb0JBQW9CO0FBQ3BCLFNBQWdCLGdCQUFnQixDQUFDLElBQVM7SUFDeEMsTUFBTSxhQUFhLEdBQWtCO1FBQ25DLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztRQUNiLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztRQUNqQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87UUFDckIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1FBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztRQUNqQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07UUFDbkIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1FBQ3JCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtRQUMvQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87UUFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1FBQ2pCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztRQUNyQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7UUFDakIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1FBQy9CLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtRQUN2QixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1FBQ3ZDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtRQUMvQixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7UUFDakMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1FBQ3JCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztRQUNyQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07UUFDbkIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1FBQ3JCLE9BQU8sRUFBRSxJ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QUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ3ZCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO2dCQUMzQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ3ZCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2FBQ3hCLENBQUM7WUFDRixNQUFNO1FBRVIsS0FBSyxTQUFTO1lBQ1osY0FBYyxHQUFHO2dCQUNmLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7YUFDbEIsQ0FBQztZQUNGLE1BQU07UUFFUixLQUFLLE1BQU07WUFDVCxjQUFjLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2FBQ3RCLENBQUM7WUFDRixNQUFNO1FBRVIsS0FBSyxRQUFRO1lBQ1gsY0FBYyxHQUFHLEVBQUUsQ0FBQztZQUNwQixNQUFNO0lBQ1YsQ0FBQztJQUNELE1BQU0sWUFBWSxHQUFpQjtRQUNqQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWixhQUFhO1FBQ2IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYztLQUM1QixDQUFDO0lBRUYsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEdFTkVSQVRFRCBGUk9NIHBhY2thZ2VzL2F3cy1jZGsvbGliL2NvbmZpZy50cy5cbi8vIERvIG5vdCBlZGl0IGJ5IGhhbmQ7IGFsbCBjaGFuZ2VzIHdpbGwgYmUgb3ZlcndyaXR0ZW4gYXQgYnVpbGQgdGltZSBmcm9tIHRoZSBjb25maWcgZmlsZS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8qIGVzbGludC1kaXNhYmxlIEBzdHlsaXN0aWMvbWF4LWxlbiAqL1xuaW1wb3J0IHsgQ2xpQXJndW1lbnRzLCBHbG9iYWxPcHRpb25zIH0gZnJvbSAnLi9jbGktYXJndW1lbnRzJztcbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICcuL3NldHRpbmdzJztcblxuLy8gQHRzLWlnbm9yZSBUUzYxMzNcbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0VG9DbGlBcmdzKGFyZ3M6IGFueSk6IENsaUFyZ3VtZW50cyB7XG4gIGNvbnN0IGdsb2JhbE9wdGlvbnM6IEdsb2JhbE9wdGlvbnMgPSB7XG4gICAgYXBwOiBhcmdzLmFwcCxcbiAgICBidWlsZDogYXJncy5idWlsZCxcbiAgICBjb250ZXh0OiBhcmdzLmNvbnRleHQsXG4gICAgcGx1Z2luOiBhcmdzLnBsdWdpbixcbiAgICB0cmFjZTogYXJncy50cmFjZSxcbiAgICBzdHJpY3Q6IGFyZ3Muc3RyaWN0LFxuICAgIGxvb2t1cHM6IGFyZ3MubG9va3VwcyxcbiAgICBpZ25vcmVFcnJvcnM6IGFyZ3MuaWdub3JlRXJyb3JzLFxuICAgIGpzb246IGFyZ3MuanNvbixcbiAgICB2ZXJib3NlOiBhcmdzLnZlcmJvc2UsXG4gICAgZGVidWc6IGFyZ3MuZGVidWcsXG4gICAgcHJvZmlsZTogYXJncy5wcm9maWxlLFxuICAgIHByb3h5OiBhcmdzLnByb3h5LFxuICAgIGNhQnVuZGxlUGF0aDogYXJncy5jYUJ1bmRsZVBhdGgsXG4gICAgZWMyY3JlZHM6IGFyZ3MuZWMyY3JlZHMsXG4gICAgdmVyc2lvblJlcG9ydGluZzogYXJncy52ZXJzaW9uUmVwb3J0aW5nLFxuICAgIHBhdGhNZXRhZGF0YTogYXJncy5wYXRoTWV0YWRhdGEsXG4gICAgYXNzZXRNZXRhZGF0YTogYXJncy5hc3NldE1ldGFkYXRhLFxuICAgIHJvbGVBcm46IGFyZ3Mucm9sZUFybixcbiAgICBzdGFnaW5nOiBhcmdzLnN0YWdpbmcsXG4gICAgb3V0cHV0OiBhcmdzLm91dHB1dCxcbiAgICBub3RpY2VzOiBhcmdzLm5vdGljZXMsXG4gICAgbm9Db2xvcjogYXJncy5ub0NvbG9yLFxuICAgIGNpOiBhcmdzLmNpLFxuICAgIHVuc3RhYmxlOiBhcmdzLnVuc3RhYmxlLFxuICB9O1xuICBsZXQgY29tbWFuZE9wdGlvbnM7XG4gIHN3aXRjaCAoYXJncy5fWzBdIGFzIENvbW1hbmQpIHtcbiAgICBjYXNlICdsaXN0JzpcbiAgICAgIGNvbW1hbmRPcHRpb25zID0ge1xuICAgICAgICBsb25nOiBhcmdzLmxvbmcsXG4gICAgICAgIHNob3dEZXBlbmRlbmNpZXM6IGFyZ3Muc2hvd0RlcGVuZGVuY2llcyxcbiAgICAgICAgU1RBQ0tTOiBhcmdzLlNUQUNLUyxcbiAgICAgIH07XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3N5bnRoZXNpemUnOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7XG4gICAgICAgIGV4Y2x1c2l2ZWx5OiBhcmdzLmV4Y2x1c2l2ZWx5LFxuICAgICAgICB2YWxpZGF0aW9uOiBhcmdzLnZhbGlkYXRpb24sXG4gICAgICAgIHF1aWV0OiBhcmdzLnF1aWV0LFxuICAgICAgICBTVEFDS1M6IGFyZ3MuU1RBQ0tTLFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnYm9vdHN0cmFwJzpcbiAgICAgIGNvbW1hbmRPcHRpb25zID0ge1xuICAgICAgICBib290c3RyYXBCdWNrZXROYW1lOiBhcmdzLmJvb3RzdHJhcEJ1Y2tldE5hbWUsXG4gICAgICAgIGJvb3RzdHJhcEttc0tleUlkOiBhcmdzLmJvb3RzdHJhcEttc0tleUlkLFxuICAgICAgICBleGFtcGxlUGVybWlzc2lvbnNCb3VuZGFyeTogYXJncy5leGFtcGxlUGVybWlzc2lvbnNCb3VuZGFyeSxcbiAgICAgICAgY3VzdG9tUGVybWlzc2lvbnNCb3VuZGFyeTogYXJncy5jdXN0b21QZXJtaXNzaW9uc0JvdW5kYXJ5LFxuICAgICAgICBib290c3RyYXBDdXN0b21lcktleTogYXJncy5ib290c3RyYXBDdXN0b21lcktleSxcbiAgICAgICAgcXVhbGlmaWVyOiBhcmdzLnF1YWxpZmllcixcbiAgICAgICAgcHVibGljQWNjZXNzQmxvY2tDb25maWd1cmF0aW9uOiBhcmdzLnB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbixcbiAgICAgICAgdGFnczogYXJncy50YWdzLFxuICAgICAgICBleGVjdXRlOiBhcmdzLmV4ZWN1dGUsXG4gICAgICAgIHRydXN0OiBhcmdzLnRydXN0LFxuICAgICAgICB0cnVzdEZvckxvb2t1cDogYXJncy50cnVzdEZvckxvb2t1cCxcbiAgICAgICAgY2xvdWRmb3JtYXRpb25FeGVjdXRpb25Qb2xpY2llczogYXJncy5jbG91ZGZvcm1hdGlvbkV4ZWN1dGlvblBvbGljaWVzLFxuICAgICAgICBmb3JjZTogYXJncy5mb3JjZSxcbiAgICAgICAgdGVybWluYXRpb25Qcm90ZWN0aW9uOiBhcmdzLnRlcm1pbmF0aW9uUHJvdGVjdGlvbixcbiAgICAgICAgc2hvd1RlbXBsYXRlOiBhcmdzLnNob3dUZW1wbGF0ZSxcbiAgICAgICAgdG9vbGtpdFN0YWNrTmFtZTogYXJncy50b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICB0ZW1wbGF0ZTogYXJncy50ZW1wbGF0ZSxcbiAgICAgICAgcHJldmlvdXNQYXJhbWV0ZXJzOiBhcmdzLnByZXZpb3VzUGFyYW1ldGVycyxcbiAgICAgICAgRU5WSVJPTk1FTlRTOiBhcmdzLkVOVklST05NRU5UUyxcbiAgICAgIH07XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2djJzpcbiAgICAgIGNvbW1hbmRPcHRpb25zID0ge1xuICAgICAgICBhY3Rpb246IGFyZ3MuYWN0aW9uLFxuICAgICAgICB0eXBlOiBhcmdzLnR5cGUsXG4gICAgICAgIHJvbGxiYWNrQnVmZmVyRGF5czogYXJncy5yb2xsYmFja0J1ZmZlckRheXMsXG4gICAgICAgIGNyZWF0ZWRCdWZmZXJEYXlzOiBhcmdzLmNyZWF0ZWRCdWZmZXJEYXlzLFxuICAgICAgICBjb25maXJtOiBhcmdzLmNvbmZpcm0sXG4gICAgICAgIGJvb3RzdHJhcFN0YWNrTmFtZTogYXJncy5ib290c3RyYXBTdGFja05hbWUsXG4gICAgICAgIEVOVklST05NRU5UUzogYXJncy5FTlZJUk9OTUVOVFMsXG4gICAgICB9O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdkZXBsb3knOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7XG4gICAgICAgIGFsbDogYXJncy5hbGwsXG4gICAgICAgIGJ1aWxkRXhjbHVkZTogYXJncy5idWlsZEV4Y2x1ZGUsXG4gICAgICAgIGV4Y2x1c2l2ZWx5OiBhcmdzLmV4Y2x1c2l2ZWx5LFxuICAgICAgICByZXF1aXJlQXBwcm92YWw6IGFyZ3MucmVxdWlyZUFwcHJvdmFsLFxuICAgICAgICBub3RpZmljYXRpb25Bcm5zOiBhcmdzLm5vdGlmaWNhdGlvbkFybnMsXG4gICAgICAgIHRhZ3M6IGFyZ3MudGFncyxcbiAgICAgICAgZXhlY3V0ZTogYXJncy5leGVjdXRlLFxuICAgICAgICBjaGFuZ2VTZXROYW1lOiBhcmdzLmNoYW5nZVNldE5hbWUsXG4gICAgICAgIG1ldGhvZDogYXJncy5tZXRob2QsXG4gICAgICAgIGltcG9ydEV4aXN0aW5nUmVzb3VyY2VzOiBhcmdzLmltcG9ydEV4aXN0aW5nUmVzb3VyY2VzLFxuICAgICAgICBmb3JjZTogYXJncy5mb3JjZSxcbiAgICAgICAgcGFyYW1ldGVyczogYXJncy5wYXJhbWV0ZXJzLFxuICAgICAgICBvdXRwdXRzRmlsZTogYXJncy5vdXRwdXRzRmlsZSxcbiAgICAgICAgcHJldmlvdXNQYXJhbWV0ZXJzOiBhcmdzLnByZXZpb3VzUGFyYW1ldGVycyxcbiAgICAgICAgdG9vbGtpdFN0YWNrTmFtZTogYXJncy50b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICBwcm9ncmVzczogYXJncy5wcm9ncmVzcyxcbiAgICAgICAgcm9sbGJhY2s6IGFyZ3Mucm9sbGJhY2ssXG4gICAgICAgIGhvdHN3YXA6IGFyZ3MuaG90c3dhcCxcbiAgICAgICAgaG90c3dhcEZhbGxiYWNrOiBhcmdzLmhvdHN3YXBGYWxsYmFjayxcbiAgICAgICAgd2F0Y2g6IGFyZ3Mud2F0Y2gsXG4gICAgICAgIGxvZ3M6IGFyZ3MubG9ncyxcbiAgICAgICAgY29uY3VycmVuY3k6IGFyZ3MuY29uY3VycmVuY3ksXG4gICAgICAgIGFzc2V0UGFyYWxsZWxpc206IGFyZ3MuYXNzZXRQYXJhbGxlbGlzbSxcbiAgICAgICAgYXNzZXRQcmVidWlsZDogYXJncy5hc3NldFByZWJ1aWxkLFxuICAgICAgICBpZ25vcmVOb1N0YWNrczogYXJncy5pZ25vcmVOb1N0YWNrcyxcbiAgICAgICAgU1RBQ0tTOiBhcmdzLlNUQUNLUyxcbiAgICAgIH07XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3JvbGxiYWNrJzpcbiAgICAgIGNvbW1hbmRPcHRpb25zID0ge1xuICAgICAgICBhbGw6IGFyZ3MuYWxsLFxuICAgICAgICB0b29sa2l0U3RhY2tOYW1lOiBhcmdzLnRvb2xraXRTdGFja05hbWUsXG4gICAgICAgIGZvcmNlOiBhcmdzLmZvcmNlLFxuICAgICAgICB2YWxpZGF0ZUJvb3RzdHJhcFZlcnNpb246IGFyZ3MudmFsaWRhdGVCb290c3RyYXBWZXJzaW9uLFxuICAgICAgICBvcnBoYW46IGFyZ3Mub3JwaGFuLFxuICAgICAgICBTVEFDS1M6IGFyZ3MuU1RBQ0tTLFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnaW1wb3J0JzpcbiAgICAgIGNvbW1hbmRPcHRpb25zID0ge1xuICAgICAgICBleGVjdXRlOiBhcmdzLmV4ZWN1dGUsXG4gICAgICAgIGNoYW5nZVNldE5hbWU6IGFyZ3MuY2hhbmdlU2V0TmFtZSxcbiAgICAgICAgdG9vbGtpdFN0YWNrTmFtZTogYXJncy50b29sa2l0U3RhY2tOYW1lLFxuICAgICAgICByb2xsYmFjazogYXJncy5yb2xsYmFjayxcbiAgICAgICAgZm9yY2U6IGFyZ3MuZm9yY2UsXG4gICAgICAgIHJlY29yZFJlc291cmNlTWFwcGluZzogYXJncy5yZWNvcmRSZXNvdXJjZU1hcHBpbmcsXG4gICAgICAgIHJlc291cmNlTWFwcGluZzogYXJncy5yZXNvdXJjZU1hcHBpbmcsXG4gICAgICAgIFNUQUNLOiBhcmdzLlNUQUNLLFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnd2F0Y2gnOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7XG4gICAgICAgIGJ1aWxkRXhjbHVkZTogYXJncy5idWlsZEV4Y2x1ZGUsXG4gICAgICAgIGV4Y2x1c2l2ZWx5OiBhcmdzLmV4Y2x1c2l2ZWx5LFxuICAgICAgICBjaGFuZ2VTZXROYW1lOiBhcmdzLmNoYW5nZVNldE5hbWUsXG4gICAgICAgIGZvcmNlOiBhcmdzLmZvcmNlLFxuICAgICAgICB0b29sa2l0U3RhY2tOYW1lOiBhcmdzLnRvb2xraXRTdGFja05hbWUsXG4gICAgICAgIHByb2dyZXNzOiBhcmdzLnByb2dyZXNzLFxuICAgICAgICByb2xsYmFjazogYXJncy5yb2xsYmFjayxcbiAgICAgICAgaG90c3dhcDogYXJncy5ob3Rzd2FwLFxuICAgICAgICBob3Rzd2FwRmFsbGJhY2s6IGFyZ3MuaG90c3dhcEZhbGxiYWNrLFxuICAgICAgICBsb2dzOiBhcmdzLmxvZ3MsXG4gICAgICAgIGNvbmN1cnJlbmN5OiBhcmdzLmNvbmN1cnJlbmN5LFxuICAgICAgICBTVEFDS1M6IGFyZ3MuU1RBQ0tTLFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnZGVzdHJveSc6XG4gICAgICBjb21tYW5kT3B0aW9ucyA9IHtcbiAgICAgICAgYWxsOiBhcmdzLmFsbCxcbiAgICAgICAgZXhjbHVzaXZlbHk6IGFyZ3MuZXhjbHVzaXZlbHksXG4gICAgICAgIGZvcmNlOiBhcmdzLmZvcmNlLFxuICAgICAgICBTVEFDS1M6IGFyZ3MuU1RBQ0tTLFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnZGlmZic6XG4gICAgICBjb21tYW5kT3B0aW9ucyA9IHtcbiAgICAgICAgZXhjbHVzaXZlbHk6IGFyZ3MuZXhjbHVzaXZlbHksXG4gICAgICAgIGNvbnRleHRMaW5lczogYXJncy5jb250ZXh0TGluZXMsXG4gICAgICAgIHRlbXBsYXRlOiBhcmdzLnRlbXBsYXRlLFxuICAgICAgICBzdHJpY3Q6IGFyZ3Muc3RyaWN0LFxuICAgICAgICBzZWN1cml0eU9ubHk6IGFyZ3Muc2VjdXJpdHlPbmx5LFxuICAgICAgICBmYWlsOiBhcmdzLmZhaWwsXG4gICAgICAgIHByb2Nlc3NlZDogYXJncy5wcm9jZXNzZWQsXG4gICAgICAgIHF1aWV0OiBhcmdzLnF1aWV0LFxuICAgICAgICBjaGFuZ2VTZXQ6IGFyZ3MuY2hhbmdlU2V0LFxuICAgICAgICBTVEFDS1M6IGFyZ3MuU1RBQ0tTLFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnbWV0YWRhdGEnOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7XG4gICAgICAgIFNUQUNLOiBhcmdzLlNUQUNLLFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnYWNrbm93bGVkZ2UnOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7XG4gICAgICAgIElEOiBhcmdzLklELFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnbm90aWNlcyc6XG4gICAgICBjb21tYW5kT3B0aW9ucyA9IHtcbiAgICAgICAgdW5hY2tub3dsZWRnZWQ6IGFyZ3MudW5hY2tub3dsZWRnZWQsXG4gICAgICB9O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdpbml0JzpcbiAgICAgIGNvbW1hbmRPcHRpb25zID0ge1xuICAgICAgICBsYW5ndWFnZTogYXJncy5sYW5ndWFnZSxcbiAgICAgICAgbGlzdDogYXJncy5saXN0LFxuICAgICAgICBnZW5lcmF0ZU9ubHk6IGFyZ3MuZ2VuZXJhdGVPbmx5LFxuICAgICAgICBURU1QTEFURTogYXJncy5URU1QTEFURSxcbiAgICAgIH07XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ21pZ3JhdGUnOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7XG4gICAgICAgIHN0YWNrTmFtZTogYXJncy5zdGFja05hbWUsXG4gICAgICAgIGxhbmd1YWdlOiBhcmdzLmxhbmd1YWdlLFxuICAgICAgICBhY2NvdW50OiBhcmdzLmFjY291bnQsXG4gICAgICAgIHJlZ2lvbjogYXJncy5yZWdpb24sXG4gICAgICAgIGZyb21QYXRoOiBhcmdzLmZyb21QYXRoLFxuICAgICAgICBmcm9tU3RhY2s6IGFyZ3MuZnJvbVN0YWNrLFxuICAgICAgICBvdXRwdXRQYXRoOiBhcmdzLm91dHB1dFBhdGgsXG4gICAgICAgIGZyb21TY2FuOiBhcmdzLmZyb21TY2FuLFxuICAgICAgICBmaWx0ZXI6IGFyZ3MuZmlsdGVyLFxuICAgICAgICBjb21wcmVzczogYXJncy5jb21wcmVzcyxcbiAgICAgIH07XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2NvbnRleHQnOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7XG4gICAgICAgIHJlc2V0OiBhcmdzLnJlc2V0LFxuICAgICAgICBmb3JjZTogYXJncy5mb3JjZSxcbiAgICAgICAgY2xlYXI6IGFyZ3MuY2xlYXIsXG4gICAgICB9O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdkb2NzJzpcbiAgICAgIGNvbW1hbmRPcHRpb25zID0ge1xuICAgICAgICBicm93c2VyOiBhcmdzLmJyb3dzZXIsXG4gICAgICB9O1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdkb2N0b3InOlxuICAgICAgY29tbWFuZE9wdGlvbnMgPSB7fTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIGNvbnN0IGNsaUFyZ3VtZW50czogQ2xpQXJndW1lbnRzID0ge1xuICAgIF86IGFyZ3MuX1swXSxcbiAgICBnbG9iYWxPcHRpb25zLFxuICAgIFthcmdzLl9bMF1dOiBjb21tYW5kT3B0aW9ucyxcbiAgfTtcblxuICByZXR1cm4gY2xpQXJndW1lbnRzO1xufVxuIl19