"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aliases = exports.describe = exports.command = void 0;
exports.docs = docs;
const childProcess = require("child_process");
const chalk = require("chalk");
const logging_1 = require("../../lib/logging");
exports.command = 'docs';
exports.describe = 'Opens the reference documentation in a browser';
exports.aliases = ['doc'];
async function docs(options) {
    const url = 'https://docs.aws.amazon.com/cdk/api/v2/';
    (0, logging_1.print)(chalk.green(url));
    const browserCommand = (options.browser).replace(/%u/g, url);
    (0, logging_1.debug)(`Opening documentation ${chalk.green(browserCommand)}`);
    return new Promise((resolve, _reject) => {
        childProcess.exec(browserCommand, (err, stdout, stderr) => {
            if (err) {
                (0, logging_1.debug)(`An error occurred when trying to open a browser: ${err.stack || err.message}`);
                return resolve(0);
            }
            if (stdout) {
                (0, logging_1.debug)(stdout);
            }
            if (stderr) {
                (0, logging_1.warning)(stderr);
            }
            resolve(0);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRvY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBa0JBLG9CQWdCQztBQWxDRCw4Q0FBOEM7QUFDOUMsK0JBQStCO0FBQy9CLCtDQUEwRDtBQUU3QyxRQUFBLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFDakIsUUFBQSxRQUFRLEdBQUcsZ0RBQWdELENBQUM7QUFDNUQsUUFBQSxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQVl4QixLQUFLLFVBQVUsSUFBSSxDQUFDLE9BQW9CO0lBQzdDLE1BQU0sR0FBRyxHQUFHLHlDQUF5QyxDQUFDO0lBQ3RELElBQUEsZUFBSyxFQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN4QixNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzdELElBQUEsZUFBSyxFQUFDLHlCQUF5QixLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5RCxPQUFPLElBQUksT0FBTyxDQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzlDLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN4RCxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUNSLElBQUEsZUFBSyxFQUFDLG9EQUFvRCxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RixPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixDQUFDO1lBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFBQyxJQUFBLGVBQUssRUFBQyxNQUFNLENBQUMsQ0FBQztZQUFDLENBQUM7WUFDOUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFBQyxJQUFBLGlCQUFPLEVBQUMsTUFBTSxDQUFDLENBQUM7WUFBQyxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hpbGRQcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgZGVidWcsIHByaW50LCB3YXJuaW5nIH0gZnJvbSAnLi4vLi4vbGliL2xvZ2dpbmcnO1xuXG5leHBvcnQgY29uc3QgY29tbWFuZCA9ICdkb2NzJztcbmV4cG9ydCBjb25zdCBkZXNjcmliZSA9ICdPcGVucyB0aGUgcmVmZXJlbmNlIGRvY3VtZW50YXRpb24gaW4gYSBicm93c2VyJztcbmV4cG9ydCBjb25zdCBhbGlhc2VzID0gWydkb2MnXTtcblxuLyoqXG4gKiBPcHRpb25zIGZvciB0aGUgZG9jcyBjb21tYW5kXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9jc09wdGlvbnMge1xuICAvKipcbiAgICogVGhlIGNvbW1hbmQgdG8gdXNlIHRvIG9wZW4gdGhlIGJyb3dzZXJcbiAgICovXG4gIGJyb3dzZXI6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvY3Mob3B0aW9uczogRG9jc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB1cmwgPSAnaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Nkay9hcGkvdjIvJztcbiAgcHJpbnQoY2hhbGsuZ3JlZW4odXJsKSk7XG4gIGNvbnN0IGJyb3dzZXJDb21tYW5kID0gKG9wdGlvbnMuYnJvd3NlcikucmVwbGFjZSgvJXUvZywgdXJsKTtcbiAgZGVidWcoYE9wZW5pbmcgZG9jdW1lbnRhdGlvbiAke2NoYWxrLmdyZWVuKGJyb3dzZXJDb21tYW5kKX1gKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPG51bWJlcj4oKHJlc29sdmUsIF9yZWplY3QpID0+IHtcbiAgICBjaGlsZFByb2Nlc3MuZXhlYyhicm93c2VyQ29tbWFuZCwgKGVyciwgc3Rkb3V0LCBzdGRlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgZGVidWcoYEFuIGVycm9yIG9jY3VycmVkIHdoZW4gdHJ5aW5nIHRvIG9wZW4gYSBicm93c2VyOiAke2Vyci5zdGFjayB8fCBlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgcmV0dXJuIHJlc29sdmUoMCk7XG4gICAgICB9XG4gICAgICBpZiAoc3Rkb3V0KSB7IGRlYnVnKHN0ZG91dCk7IH1cbiAgICAgIGlmIChzdGRlcnIpIHsgd2FybmluZyhzdGRlcnIpOyB9XG4gICAgICByZXNvbHZlKDApO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==