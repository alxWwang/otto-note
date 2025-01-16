import * as cxapi from '@aws-cdk/cx-api';
import type { SDK } from '../aws-auth';
export declare class CloudWatchLogEventMonitor {
    /**
     * Determines which events not to display
     */
    private startTime;
    /**
     * Map of environment (account:region) to LogGroupsAccessSettings
     */
    private readonly envsLogGroupsAccessSettings;
    private active;
    constructor(startTime?: Date);
    /**
     * resume reading/printing events
     */
    activate(): void;
    /**
     * deactivates the monitor so no new events are read
     * use case for this is when we are in the middle of performing a deployment
     * and don't want to interweave all the logs together with the CFN
     * deployment logs
     *
     * Also resets the start time to be when the new deployment was triggered
     * and clears the list of tracked log groups
     */
    deactivate(): void;
    /**
     * Adds CloudWatch log groups to read log events from.
     * Since we could be watching multiple stacks that deploy to
     * multiple environments (account+region), we need to store a list of log groups
     * per env along with the SDK object that has access to read from
     * that environment.
     */
    addLogGroups(env: cxapi.Environment, sdk: SDK, logGroupNames: string[]): void;
    private scheduleNextTick;
    private tick;
    /**
     * Reads all new log events from a set of CloudWatch Log Groups
     * in parallel
     */
    private readNewEvents;
    /**
     * Print out a cloudwatch event
     */
    private print;
    /**
     * Reads all new log events from a CloudWatch Log Group
     * starting at either the time the hotswap was triggered or
     * when the last event was read on the previous tick
     */
    private readEventsFromLogGroup;
}
