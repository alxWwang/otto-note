/**
 * Basic message structure for toolkit notifications.
 * Messages are emitted by the toolkit and handled by the IoHost.
 */
interface IoMessage {
    /**
     * The time the message was emitted.
     */
    readonly time: Date;
    /**
     * The log level of the message.
     */
    readonly level: IoMessageLevel;
    /**
     * The action that triggered the message.
     */
    readonly action: IoAction;
    /**
     * A short code uniquely identifying message type.
     */
    readonly code: string;
    /**
     * The message text.
     */
    readonly message: string;
    /**
     * If true, the message will be written to stdout
     * regardless of any other parameters.
     *
     * @default false
     */
    readonly forceStdout?: boolean;
}
export type IoMessageLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
export type IoAction = 'synth' | 'list' | 'deploy' | 'destroy';
/**
 * Options for the CLI IO host.
 */
interface CliIoHostOptions {
    /**
     * If true, the host will use TTY features like color.
     */
    useTTY?: boolean;
    /**
     * Flag representing whether the current process is running in a CI environment.
     * If true, the host will write all messages to stdout, unless log level is 'error'.
     *
     * @default false
     */
    ci?: boolean;
}
/**
 * A simple IO host for the CLI that writes messages to the console.
 */
export declare class CliIoHost {
    private readonly pretty_messages;
    private readonly ci;
    constructor(options: CliIoHostOptions);
    /**
     * Notifies the host of a message.
     * The caller waits until the notification completes.
     */
    notify(msg: IoMessage): Promise<void>;
    /**
     * Determines which output stream to use based on log level and configuration.
     */
    private getStream;
    /**
     * Formats a message for console output with optional color support
     */
    private formatMessage;
    /**
     * Formats date to HH:MM:SS
     */
    private formatTime;
}
export declare const styleMap: Record<IoMessageLevel, (str: string) => string>;
export {};
