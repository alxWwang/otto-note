"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const convert_to_cli_args_1 = require("../lib/convert-to-cli-args");
const parse_command_line_arguments_1 = require("../lib/parse-command-line-arguments");
test('yargs object can be converted to cli arguments', async () => {
    const input = await (0, parse_command_line_arguments_1.parseCommandLineArguments)(['deploy', '-R', '-v', '--ci']);
    const result = (0, convert_to_cli_args_1.convertToCliArgs)(input);
    expect(result).toEqual({
        _: 'deploy',
        globalOptions: {
            app: undefined,
            assetMetadata: undefined,
            build: undefined,
            caBundlePath: undefined,
            context: [],
            ignoreErrors: false,
            noColor: false,
            pathMetadata: undefined,
            plugin: [],
            profile: undefined,
            proxy: undefined,
            roleArn: undefined,
            staging: true,
            strict: undefined,
            verbose: 1,
            versionReporting: undefined,
            ci: true,
            debug: false,
            ec2creds: undefined,
            json: false,
            lookups: true,
            trace: undefined,
            unstable: [],
            notices: undefined,
            output: undefined,
        },
        deploy: {
            STACKS: undefined,
            all: false,
            assetParallelism: undefined,
            assetPrebuild: true,
            buildExclude: [],
            changeSetName: undefined,
            concurrency: 1,
            execute: undefined,
            exclusively: undefined,
            force: false,
            hotswap: undefined,
            hotswapFallback: undefined,
            ignoreNoStacks: false,
            importExistingResources: false,
            logs: true,
            method: undefined,
            notificationArns: undefined,
            outputsFile: undefined,
            parameters: [{}],
            previousParameters: true,
            progress: undefined,
            requireApproval: undefined,
            rollback: false,
            tags: [],
            toolkitStackName: undefined,
            watch: undefined,
        },
    });
});
test('positional argument is correctly passed through -- variadic', async () => {
    const input = await (0, parse_command_line_arguments_1.parseCommandLineArguments)(['deploy', 'stack1', 'stack2', '-R', '-v', '--ci']);
    const result = (0, convert_to_cli_args_1.convertToCliArgs)(input);
    expect(result).toEqual({
        _: 'deploy',
        deploy: expect.objectContaining({
            STACKS: ['stack1', 'stack2'],
        }),
        globalOptions: expect.anything(),
    });
});
test('positional argument is correctly passed through -- single', async () => {
    const input = await (0, parse_command_line_arguments_1.parseCommandLineArguments)(['acknowledge', 'id1', '-v', '--ci']);
    const result = (0, convert_to_cli_args_1.convertToCliArgs)(input);
    expect(result).toEqual({
        _: 'acknowledge',
        acknowledge: expect.objectContaining({
            ID: 'id1',
        }),
        globalOptions: expect.anything(),
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWFyZ3VtZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLWFyZ3VtZW50cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsb0VBQThEO0FBQzlELHNGQUFnRjtBQUVoRixJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDaEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFBLHdEQUF5QixFQUFDLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUU5RSxNQUFNLE1BQU0sR0FBRyxJQUFBLHNDQUFnQixFQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDckIsQ0FBQyxFQUFFLFFBQVE7UUFDWCxhQUFhLEVBQUU7WUFDYixHQUFHLEVBQUUsU0FBUztZQUNkLGFBQWEsRUFBRSxTQUFTO1lBQ3hCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLE9BQU8sRUFBRSxFQUFFO1lBQ1gsWUFBWSxFQUFFLEtBQUs7WUFDbkIsT0FBTyxFQUFFLEtBQUs7WUFDZCxZQUFZLEVBQUUsU0FBUztZQUN2QixNQUFNLEVBQUUsRUFBRTtZQUNWLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsTUFBTSxFQUFFLFNBQVM7WUFDakIsT0FBTyxFQUFFLENBQUM7WUFDVixnQkFBZ0IsRUFBRSxTQUFTO1lBQzNCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsS0FBSyxFQUFFLEtBQUs7WUFDWixRQUFRLEVBQUUsU0FBUztZQUNuQixJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxFQUFFLFNBQVM7WUFDaEIsUUFBUSxFQUFFLEVBQUU7WUFDWixPQUFPLEVBQUUsU0FBUztZQUNsQixNQUFNLEVBQUUsU0FBUztTQUNsQjtRQUNELE1BQU0sRUFBRTtZQUNOLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLEdBQUcsRUFBRSxLQUFLO1lBQ1YsZ0JBQWdCLEVBQUUsU0FBUztZQUMzQixhQUFhLEVBQUUsSUFBSTtZQUNuQixZQUFZLEVBQUUsRUFBRTtZQUNoQixhQUFhLEVBQUUsU0FBUztZQUN4QixXQUFXLEVBQUUsQ0FBQztZQUNkLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLEtBQUssRUFBRSxLQUFLO1lBQ1osT0FBTyxFQUFFLFNBQVM7WUFDbEIsZUFBZSxFQUFFLFNBQVM7WUFDMUIsY0FBYyxFQUFFLEtBQUs7WUFDckIsdUJBQXVCLEVBQUUsS0FBSztZQUM5QixJQUFJLEVBQUUsSUFBSTtZQUNWLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLGdCQUFnQixFQUFFLFNBQVM7WUFDM0IsV0FBVyxFQUFFLFNBQVM7WUFDdEIsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ2hCLGtCQUFrQixFQUFFLElBQUk7WUFDeEIsUUFBUSxFQUFFLFNBQVM7WUFDbkIsZUFBZSxFQUFFLFNBQVM7WUFDMUIsUUFBUSxFQUFFLEtBQUs7WUFDZixJQUFJLEVBQUUsRUFBRTtZQUNSLGdCQUFnQixFQUFFLFNBQVM7WUFDM0IsS0FBSyxFQUFFLFNBQVM7U0FDakI7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyw2REFBNkQsRUFBRSxLQUFLLElBQUksRUFBRTtJQUM3RSxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUEsd0RBQXlCLEVBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFFbEcsTUFBTSxNQUFNLEdBQUcsSUFBQSxzQ0FBZ0IsRUFBQyxLQUFLLENBQUMsQ0FBQztJQUV2QyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3JCLENBQUMsRUFBRSxRQUFRO1FBQ1gsTUFBTSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztZQUM5QixNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO1NBQzdCLENBQUM7UUFDRixhQUFhLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRTtLQUNqQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQywyREFBMkQsRUFBRSxLQUFLLElBQUksRUFBRTtJQUMzRSxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUEsd0RBQXlCLEVBQUMsQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRXBGLE1BQU0sTUFBTSxHQUFHLElBQUEsc0NBQWdCLEVBQUMsS0FBSyxDQUFDLENBQUM7SUFFdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUNyQixDQUFDLEVBQUUsYUFBYTtRQUNoQixXQUFXLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1lBQ25DLEVBQUUsRUFBRSxLQUFLO1NBQ1YsQ0FBQztRQUNGLGFBQWEsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFO0tBQ2pDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29udmVydFRvQ2xpQXJncyB9IGZyb20gJy4uL2xpYi9jb252ZXJ0LXRvLWNsaS1hcmdzJztcbmltcG9ydCB7IHBhcnNlQ29tbWFuZExpbmVBcmd1bWVudHMgfSBmcm9tICcuLi9saWIvcGFyc2UtY29tbWFuZC1saW5lLWFyZ3VtZW50cyc7XG5cbnRlc3QoJ3lhcmdzIG9iamVjdCBjYW4gYmUgY29udmVydGVkIHRvIGNsaSBhcmd1bWVudHMnLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IGlucHV0ID0gYXdhaXQgcGFyc2VDb21tYW5kTGluZUFyZ3VtZW50cyhbJ2RlcGxveScsICctUicsICctdicsICctLWNpJ10pO1xuXG4gIGNvbnN0IHJlc3VsdCA9IGNvbnZlcnRUb0NsaUFyZ3MoaW5wdXQpO1xuXG4gIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xuICAgIF86ICdkZXBsb3knLFxuICAgIGdsb2JhbE9wdGlvbnM6IHtcbiAgICAgIGFwcDogdW5kZWZpbmVkLFxuICAgICAgYXNzZXRNZXRhZGF0YTogdW5kZWZpbmVkLFxuICAgICAgYnVpbGQ6IHVuZGVmaW5lZCxcbiAgICAgIGNhQnVuZGxlUGF0aDogdW5kZWZpbmVkLFxuICAgICAgY29udGV4dDogW10sXG4gICAgICBpZ25vcmVFcnJvcnM6IGZhbHNlLFxuICAgICAgbm9Db2xvcjogZmFsc2UsXG4gICAgICBwYXRoTWV0YWRhdGE6IHVuZGVmaW5lZCxcbiAgICAgIHBsdWdpbjogW10sXG4gICAgICBwcm9maWxlOiB1bmRlZmluZWQsXG4gICAgICBwcm94eTogdW5kZWZpbmVkLFxuICAgICAgcm9sZUFybjogdW5kZWZpbmVkLFxuICAgICAgc3RhZ2luZzogdHJ1ZSxcbiAgICAgIHN0cmljdDogdW5kZWZpbmVkLFxuICAgICAgdmVyYm9zZTogMSxcbiAgICAgIHZlcnNpb25SZXBvcnRpbmc6IHVuZGVmaW5lZCxcbiAgICAgIGNpOiB0cnVlLFxuICAgICAgZGVidWc6IGZhbHNlLFxuICAgICAgZWMyY3JlZHM6IHVuZGVmaW5lZCxcbiAgICAgIGpzb246IGZhbHNlLFxuICAgICAgbG9va3VwczogdHJ1ZSxcbiAgICAgIHRyYWNlOiB1bmRlZmluZWQsXG4gICAgICB1bnN0YWJsZTogW10sXG4gICAgICBub3RpY2VzOiB1bmRlZmluZWQsXG4gICAgICBvdXRwdXQ6IHVuZGVmaW5lZCxcbiAgICB9LFxuICAgIGRlcGxveToge1xuICAgICAgU1RBQ0tTOiB1bmRlZmluZWQsXG4gICAgICBhbGw6IGZhbHNlLFxuICAgICAgYXNzZXRQYXJhbGxlbGlzbTogdW5kZWZpbmVkLFxuICAgICAgYXNzZXRQcmVidWlsZDogdHJ1ZSxcbiAgICAgIGJ1aWxkRXhjbHVkZTogW10sXG4gICAgICBjaGFuZ2VTZXROYW1lOiB1bmRlZmluZWQsXG4gICAgICBjb25jdXJyZW5jeTogMSxcbiAgICAgIGV4ZWN1dGU6IHVuZGVmaW5lZCxcbiAgICAgIGV4Y2x1c2l2ZWx5OiB1bmRlZmluZWQsXG4gICAgICBmb3JjZTogZmFsc2UsXG4gICAgICBob3Rzd2FwOiB1bmRlZmluZWQsXG4gICAgICBob3Rzd2FwRmFsbGJhY2s6IHVuZGVmaW5lZCxcbiAgICAgIGlnbm9yZU5vU3RhY2tzOiBmYWxzZSxcbiAgICAgIGltcG9ydEV4aXN0aW5nUmVzb3VyY2VzOiBmYWxzZSxcbiAgICAgIGxvZ3M6IHRydWUsXG4gICAgICBtZXRob2Q6IHVuZGVmaW5lZCxcbiAgICAgIG5vdGlmaWNhdGlvbkFybnM6IHVuZGVmaW5lZCxcbiAgICAgIG91dHB1dHNGaWxlOiB1bmRlZmluZWQsXG4gICAgICBwYXJhbWV0ZXJzOiBbe31dLFxuICAgICAgcHJldmlvdXNQYXJhbWV0ZXJzOiB0cnVlLFxuICAgICAgcHJvZ3Jlc3M6IHVuZGVmaW5lZCxcbiAgICAgIHJlcXVpcmVBcHByb3ZhbDogdW5kZWZpbmVkLFxuICAgICAgcm9sbGJhY2s6IGZhbHNlLFxuICAgICAgdGFnczogW10sXG4gICAgICB0b29sa2l0U3RhY2tOYW1lOiB1bmRlZmluZWQsXG4gICAgICB3YXRjaDogdW5kZWZpbmVkLFxuICAgIH0sXG4gIH0pO1xufSk7XG5cbnRlc3QoJ3Bvc2l0aW9uYWwgYXJndW1lbnQgaXMgY29ycmVjdGx5IHBhc3NlZCB0aHJvdWdoIC0tIHZhcmlhZGljJywgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBpbnB1dCA9IGF3YWl0IHBhcnNlQ29tbWFuZExpbmVBcmd1bWVudHMoWydkZXBsb3knLCAnc3RhY2sxJywgJ3N0YWNrMicsICctUicsICctdicsICctLWNpJ10pO1xuXG4gIGNvbnN0IHJlc3VsdCA9IGNvbnZlcnRUb0NsaUFyZ3MoaW5wdXQpO1xuXG4gIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xuICAgIF86ICdkZXBsb3knLFxuICAgIGRlcGxveTogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgU1RBQ0tTOiBbJ3N0YWNrMScsICdzdGFjazInXSxcbiAgICB9KSxcbiAgICBnbG9iYWxPcHRpb25zOiBleHBlY3QuYW55dGhpbmcoKSxcbiAgfSk7XG59KTtcblxudGVzdCgncG9zaXRpb25hbCBhcmd1bWVudCBpcyBjb3JyZWN0bHkgcGFzc2VkIHRocm91Z2ggLS0gc2luZ2xlJywgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBpbnB1dCA9IGF3YWl0IHBhcnNlQ29tbWFuZExpbmVBcmd1bWVudHMoWydhY2tub3dsZWRnZScsICdpZDEnLCAnLXYnLCAnLS1jaSddKTtcblxuICBjb25zdCByZXN1bHQgPSBjb252ZXJ0VG9DbGlBcmdzKGlucHV0KTtcblxuICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHtcbiAgICBfOiAnYWNrbm93bGVkZ2UnLFxuICAgIGFja25vd2xlZGdlOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBJRDogJ2lkMScsXG4gICAgfSksXG4gICAgZ2xvYmFsT3B0aW9uczogZXhwZWN0LmFueXRoaW5nKCksXG4gIH0pO1xufSk7XG4iXX0=