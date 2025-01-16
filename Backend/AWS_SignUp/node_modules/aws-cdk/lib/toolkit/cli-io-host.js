"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.styleMap = exports.CliIoHost = void 0;
const chalk = require("chalk");
/**
 * A simple IO host for the CLI that writes messages to the console.
 */
class CliIoHost {
    constructor(options) {
        this.pretty_messages = options.useTTY ?? process.stdout.isTTY ?? false;
        this.ci = options.ci ?? false;
    }
    /**
     * Notifies the host of a message.
     * The caller waits until the notification completes.
     */
    async notify(msg) {
        const output = this.formatMessage(msg);
        const stream = this.getStream(msg.level, msg.forceStdout ?? false);
        return new Promise((resolve, reject) => {
            stream.write(output, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Determines which output stream to use based on log level and configuration.
     */
    getStream(level, forceStdout) {
        // For legacy purposes all log streams are written to stderr by default, unless
        // specified otherwise, by passing `forceStdout`, which is used by the `data()` logging function, or
        // if the CDK is running in a CI environment. This is because some CI environments will immediately
        // fail if stderr is written to. In these cases, we detect if we are in a CI environment and
        // write all messages to stdout instead.
        if (forceStdout) {
            return process.stdout;
        }
        if (level == 'error')
            return process.stderr;
        return this.ci ? process.stdout : process.stderr;
    }
    /**
     * Formats a message for console output with optional color support
     */
    formatMessage(msg) {
        // apply provided style or a default style if we're in TTY mode
        let message_text = this.pretty_messages
            ? exports.styleMap[msg.level](msg.message)
            : msg.message;
        // prepend timestamp if IoMessageLevel is DEBUG or TRACE. Postpend a newline.
        return ((msg.level === 'debug' || msg.level === 'trace')
            ? `[${this.formatTime(msg.time)}] ${message_text}`
            : message_text) + '\n';
    }
    /**
     * Formats date to HH:MM:SS
     */
    formatTime(d) {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
}
exports.CliIoHost = CliIoHost;
exports.styleMap = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.white,
    debug: chalk.gray,
    trace: chalk.gray,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWlvLWhvc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktaW8taG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrQkFBK0I7QUErRC9COztHQUVHO0FBQ0gsTUFBYSxTQUFTO0lBSXBCLFlBQVksT0FBeUI7UUFDbkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztRQUN2RSxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQWM7UUFDekIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUV2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUVuRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQzNCLElBQUksR0FBRyxFQUFFLENBQUM7b0JBQ1IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNkLENBQUM7cUJBQU0sQ0FBQztvQkFDTixPQUFPLEVBQUUsQ0FBQztnQkFDWixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNLLFNBQVMsQ0FBQyxLQUFxQixFQUFFLFdBQW9CO1FBQzNELCtFQUErRTtRQUMvRSxvR0FBb0c7UUFDcEcsbUdBQW1HO1FBQ25HLDRGQUE0RjtRQUM1Rix3Q0FBd0M7UUFDeEMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNoQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDeEIsQ0FBQztRQUNELElBQUksS0FBSyxJQUFJLE9BQU87WUFBRSxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDNUMsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBQ25ELENBQUM7SUFFRDs7T0FFRztJQUNLLGFBQWEsQ0FBQyxHQUFjO1FBQ2xDLCtEQUErRDtRQUMvRCxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsZUFBZTtZQUNyQyxDQUFDLENBQUMsZ0JBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztZQUNsQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztRQUVoQiw2RUFBNkU7UUFDN0UsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxPQUFPLElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxPQUFPLENBQUM7WUFDdEQsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssWUFBWSxFQUFFO1lBQ2xELENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDM0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ssVUFBVSxDQUFDLENBQU87UUFDeEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFTLEVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQzlFLENBQUM7Q0FDRjtBQW5FRCw4QkFtRUM7QUFFWSxRQUFBLFFBQVEsR0FBb0Q7SUFDdkUsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHO0lBQ2hCLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTTtJQUNsQixJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUs7SUFDakIsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJO0lBQ2pCLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSTtDQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG4vKipcbiAqIEJhc2ljIG1lc3NhZ2Ugc3RydWN0dXJlIGZvciB0b29sa2l0IG5vdGlmaWNhdGlvbnMuXG4gKiBNZXNzYWdlcyBhcmUgZW1pdHRlZCBieSB0aGUgdG9vbGtpdCBhbmQgaGFuZGxlZCBieSB0aGUgSW9Ib3N0LlxuICovXG5pbnRlcmZhY2UgSW9NZXNzYWdlIHtcbiAgLyoqXG4gICAqIFRoZSB0aW1lIHRoZSBtZXNzYWdlIHdhcyBlbWl0dGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgdGltZTogRGF0ZTtcblxuICAvKipcbiAgICogVGhlIGxvZyBsZXZlbCBvZiB0aGUgbWVzc2FnZS5cbiAgICovXG4gIHJlYWRvbmx5IGxldmVsOiBJb01lc3NhZ2VMZXZlbDtcblxuICAvKipcbiAgICogVGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgbWVzc2FnZS5cbiAgICovXG4gIHJlYWRvbmx5IGFjdGlvbjogSW9BY3Rpb247XG5cbiAgLyoqXG4gICAqIEEgc2hvcnQgY29kZSB1bmlxdWVseSBpZGVudGlmeWluZyBtZXNzYWdlIHR5cGUuXG4gICAqL1xuICByZWFkb25seSBjb2RlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBtZXNzYWdlIHRleHQuXG4gICAqL1xuICByZWFkb25seSBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElmIHRydWUsIHRoZSBtZXNzYWdlIHdpbGwgYmUgd3JpdHRlbiB0byBzdGRvdXRcbiAgICogcmVnYXJkbGVzcyBvZiBhbnkgb3RoZXIgcGFyYW1ldGVycy5cbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGZvcmNlU3Rkb3V0PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgSW9NZXNzYWdlTGV2ZWwgPSAnZXJyb3InIHwgJ3dhcm4nIHwgJ2luZm8nIHwgJ2RlYnVnJyB8ICd0cmFjZSc7XG5cbmV4cG9ydCB0eXBlIElvQWN0aW9uID0gJ3N5bnRoJyB8ICdsaXN0JyB8ICdkZXBsb3knIHwgJ2Rlc3Ryb3knO1xuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHRoZSBDTEkgSU8gaG9zdC5cbiAqL1xuaW50ZXJmYWNlIENsaUlvSG9zdE9wdGlvbnMge1xuICAvKipcbiAgICogSWYgdHJ1ZSwgdGhlIGhvc3Qgd2lsbCB1c2UgVFRZIGZlYXR1cmVzIGxpa2UgY29sb3IuXG4gICAqL1xuICB1c2VUVFk/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBGbGFnIHJlcHJlc2VudGluZyB3aGV0aGVyIHRoZSBjdXJyZW50IHByb2Nlc3MgaXMgcnVubmluZyBpbiBhIENJIGVudmlyb25tZW50LlxuICAgKiBJZiB0cnVlLCB0aGUgaG9zdCB3aWxsIHdyaXRlIGFsbCBtZXNzYWdlcyB0byBzdGRvdXQsIHVubGVzcyBsb2cgbGV2ZWwgaXMgJ2Vycm9yJy5cbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGNpPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBBIHNpbXBsZSBJTyBob3N0IGZvciB0aGUgQ0xJIHRoYXQgd3JpdGVzIG1lc3NhZ2VzIHRvIHRoZSBjb25zb2xlLlxuICovXG5leHBvcnQgY2xhc3MgQ2xpSW9Ib3N0IHtcbiAgcHJpdmF0ZSByZWFkb25seSBwcmV0dHlfbWVzc2FnZXM6IGJvb2xlYW47XG4gIHByaXZhdGUgcmVhZG9ubHkgY2k6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogQ2xpSW9Ib3N0T3B0aW9ucykge1xuICAgIHRoaXMucHJldHR5X21lc3NhZ2VzID0gb3B0aW9ucy51c2VUVFkgPz8gcHJvY2Vzcy5zdGRvdXQuaXNUVFkgPz8gZmFsc2U7XG4gICAgdGhpcy5jaSA9IG9wdGlvbnMuY2kgPz8gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogTm90aWZpZXMgdGhlIGhvc3Qgb2YgYSBtZXNzYWdlLlxuICAgKiBUaGUgY2FsbGVyIHdhaXRzIHVudGlsIHRoZSBub3RpZmljYXRpb24gY29tcGxldGVzLlxuICAgKi9cbiAgYXN5bmMgbm90aWZ5KG1zZzogSW9NZXNzYWdlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgb3V0cHV0ID0gdGhpcy5mb3JtYXRNZXNzYWdlKG1zZyk7XG5cbiAgICBjb25zdCBzdHJlYW0gPSB0aGlzLmdldFN0cmVhbShtc2cubGV2ZWwsIG1zZy5mb3JjZVN0ZG91dCA/PyBmYWxzZSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgc3RyZWFtLndyaXRlKG91dHB1dCwgKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoaWNoIG91dHB1dCBzdHJlYW0gdG8gdXNlIGJhc2VkIG9uIGxvZyBsZXZlbCBhbmQgY29uZmlndXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0U3RyZWFtKGxldmVsOiBJb01lc3NhZ2VMZXZlbCwgZm9yY2VTdGRvdXQ6IGJvb2xlYW4pIHtcbiAgICAvLyBGb3IgbGVnYWN5IHB1cnBvc2VzIGFsbCBsb2cgc3RyZWFtcyBhcmUgd3JpdHRlbiB0byBzdGRlcnIgYnkgZGVmYXVsdCwgdW5sZXNzXG4gICAgLy8gc3BlY2lmaWVkIG90aGVyd2lzZSwgYnkgcGFzc2luZyBgZm9yY2VTdGRvdXRgLCB3aGljaCBpcyB1c2VkIGJ5IHRoZSBgZGF0YSgpYCBsb2dnaW5nIGZ1bmN0aW9uLCBvclxuICAgIC8vIGlmIHRoZSBDREsgaXMgcnVubmluZyBpbiBhIENJIGVudmlyb25tZW50LiBUaGlzIGlzIGJlY2F1c2Ugc29tZSBDSSBlbnZpcm9ubWVudHMgd2lsbCBpbW1lZGlhdGVseVxuICAgIC8vIGZhaWwgaWYgc3RkZXJyIGlzIHdyaXR0ZW4gdG8uIEluIHRoZXNlIGNhc2VzLCB3ZSBkZXRlY3QgaWYgd2UgYXJlIGluIGEgQ0kgZW52aXJvbm1lbnQgYW5kXG4gICAgLy8gd3JpdGUgYWxsIG1lc3NhZ2VzIHRvIHN0ZG91dCBpbnN0ZWFkLlxuICAgIGlmIChmb3JjZVN0ZG91dCkge1xuICAgICAgcmV0dXJuIHByb2Nlc3Muc3Rkb3V0O1xuICAgIH1cbiAgICBpZiAobGV2ZWwgPT0gJ2Vycm9yJykgcmV0dXJuIHByb2Nlc3Muc3RkZXJyO1xuICAgIHJldHVybiB0aGlzLmNpID8gcHJvY2Vzcy5zdGRvdXQgOiBwcm9jZXNzLnN0ZGVycjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXRzIGEgbWVzc2FnZSBmb3IgY29uc29sZSBvdXRwdXQgd2l0aCBvcHRpb25hbCBjb2xvciBzdXBwb3J0XG4gICAqL1xuICBwcml2YXRlIGZvcm1hdE1lc3NhZ2UobXNnOiBJb01lc3NhZ2UpOiBzdHJpbmcge1xuICAgIC8vIGFwcGx5IHByb3ZpZGVkIHN0eWxlIG9yIGEgZGVmYXVsdCBzdHlsZSBpZiB3ZSdyZSBpbiBUVFkgbW9kZVxuICAgIGxldCBtZXNzYWdlX3RleHQgPSB0aGlzLnByZXR0eV9tZXNzYWdlc1xuICAgICAgPyBzdHlsZU1hcFttc2cubGV2ZWxdKG1zZy5tZXNzYWdlKVxuICAgICAgOiBtc2cubWVzc2FnZTtcblxuICAgIC8vIHByZXBlbmQgdGltZXN0YW1wIGlmIElvTWVzc2FnZUxldmVsIGlzIERFQlVHIG9yIFRSQUNFLiBQb3N0cGVuZCBhIG5ld2xpbmUuXG4gICAgcmV0dXJuICgobXNnLmxldmVsID09PSAnZGVidWcnIHx8IG1zZy5sZXZlbCA9PT0gJ3RyYWNlJylcbiAgICAgID8gYFske3RoaXMuZm9ybWF0VGltZShtc2cudGltZSl9XSAke21lc3NhZ2VfdGV4dH1gXG4gICAgICA6IG1lc3NhZ2VfdGV4dCkgKyAnXFxuJztcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXRzIGRhdGUgdG8gSEg6TU06U1NcbiAgICovXG4gIHByaXZhdGUgZm9ybWF0VGltZShkOiBEYXRlKTogc3RyaW5nIHtcbiAgICBjb25zdCBwYWQgPSAobjogbnVtYmVyKTogc3RyaW5nID0+IG4udG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgIHJldHVybiBgJHtwYWQoZC5nZXRIb3VycygpKX06JHtwYWQoZC5nZXRNaW51dGVzKCkpfToke3BhZChkLmdldFNlY29uZHMoKSl9YDtcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgc3R5bGVNYXA6IFJlY29yZDxJb01lc3NhZ2VMZXZlbCwgKHN0cjogc3RyaW5nKSA9PiBzdHJpbmc+ID0ge1xuICBlcnJvcjogY2hhbGsucmVkLFxuICB3YXJuOiBjaGFsay55ZWxsb3csXG4gIGluZm86IGNoYWxrLndoaXRlLFxuICBkZWJ1ZzogY2hhbGsuZ3JheSxcbiAgdHJhY2U6IGNoYWxrLmdyYXksXG59O1xuIl19