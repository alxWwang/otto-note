"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionCheckTTL = exports.DISPLAY_VERSION = void 0;
exports.isDeveloperBuild = isDeveloperBuild;
exports.versionNumber = versionNumber;
exports.latestVersionIfHigher = latestVersionIfHigher;
exports.displayVersionMessage = displayVersionMessage;
const path = require("path");
const chalk = require("chalk");
const fs = require("fs-extra");
const semver = require("semver");
const directories_1 = require("./util/directories");
const npm_1 = require("./util/npm");
const logging_1 = require("../lib/logging");
const error_1 = require("./toolkit/error");
const console_formatters_1 = require("../lib/util/console-formatters");
const ONE_DAY_IN_SECONDS = 1 * 24 * 60 * 60;
const UPGRADE_DOCUMENTATION_LINKS = {
    1: 'https://docs.aws.amazon.com/cdk/v2/guide/migrating-v2.html',
};
exports.DISPLAY_VERSION = `${versionNumber()} (build ${commit()})`;
function isDeveloperBuild() {
    return versionNumber() === '0.0.0';
}
function versionNumber() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(path.join((0, directories_1.rootDir)(), 'package.json')).version.replace(/\+[0-9a-f]+$/, '');
}
function commit() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(path.join((0, directories_1.rootDir)(), 'build-info.json')).commit;
}
class VersionCheckTTL {
    static timestampFilePath() {
        // Using the same path from account-cache.ts
        return path.join((0, directories_1.cdkCacheDir)(), 'repo-version-ttl');
    }
    constructor(file, ttlSecs) {
        this.file = file || VersionCheckTTL.timestampFilePath();
        try {
            fs.mkdirsSync(path.dirname(this.file));
            fs.accessSync(path.dirname(this.file), fs.constants.W_OK);
        }
        catch {
            throw new error_1.ToolkitError(`Directory (${path.dirname(this.file)}) is not writable.`);
        }
        this.ttlSecs = ttlSecs || ONE_DAY_IN_SECONDS;
    }
    async hasExpired() {
        try {
            const lastCheckTime = (await fs.stat(this.file)).mtimeMs;
            const today = new Date().getTime();
            if ((today - lastCheckTime) / 1000 > this.ttlSecs) { // convert ms to sec
                return true;
            }
            return false;
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return true;
            }
            else {
                throw err;
            }
        }
    }
    async update(latestVersion) {
        if (!latestVersion) {
            latestVersion = '';
        }
        await fs.writeFile(this.file, latestVersion);
    }
}
exports.VersionCheckTTL = VersionCheckTTL;
// Export for unit testing only.
// Don't use directly, use displayVersionMessage() instead.
async function latestVersionIfHigher(currentVersion, cacheFile) {
    if (!(await cacheFile.hasExpired())) {
        return null;
    }
    const latestVersion = await (0, npm_1.getLatestVersionFromNpm)();
    const isNewer = semver.gt(latestVersion, currentVersion);
    await cacheFile.update(latestVersion);
    if (isNewer) {
        return latestVersion;
    }
    else {
        return null;
    }
}
function getMajorVersionUpgradeMessage(currentVersion) {
    const currentMajorVersion = semver.major(currentVersion);
    if (UPGRADE_DOCUMENTATION_LINKS[currentMajorVersion]) {
        return `Information about upgrading from version ${currentMajorVersion}.x to version ${currentMajorVersion + 1}.x is available here: ${UPGRADE_DOCUMENTATION_LINKS[currentMajorVersion]}`;
    }
}
function getVersionMessage(currentVersion, laterVersion) {
    return [
        `Newer version of CDK is available [${chalk.green(laterVersion)}]`,
        getMajorVersionUpgradeMessage(currentVersion),
        'Upgrade recommended (npm install -g aws-cdk)',
    ].filter(Boolean);
}
async function displayVersionMessage(currentVersion = versionNumber(), versionCheckCache) {
    if (!process.stdout.isTTY || process.env.CDK_DISABLE_VERSION_CHECK) {
        return;
    }
    try {
        const laterVersion = await latestVersionIfHigher(currentVersion, versionCheckCache ?? new VersionCheckTTL());
        if (laterVersion) {
            const bannerMsg = (0, console_formatters_1.formatAsBanner)(getVersionMessage(currentVersion, laterVersion));
            bannerMsg.forEach((e) => (0, logging_1.print)(e));
        }
    }
    catch (err) {
        (0, logging_1.debug)(`Could not run version check - ${err.message}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZlcnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBa0JBLDRDQUVDO0FBRUQsc0NBR0M7QUF5REQsc0RBY0M7QUFpQkQsc0RBY0M7QUEvSEQsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQiwrQkFBK0I7QUFDL0IsaUNBQWlDO0FBQ2pDLG9EQUEwRDtBQUMxRCxvQ0FBcUQ7QUFDckQsNENBQThDO0FBQzlDLDJDQUErQztBQUMvQyx1RUFBZ0U7QUFFaEUsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFFNUMsTUFBTSwyQkFBMkIsR0FBMkI7SUFDMUQsQ0FBQyxFQUFFLDREQUE0RDtDQUNoRSxDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsR0FBRyxhQUFhLEVBQUUsV0FBVyxNQUFNLEVBQUUsR0FBRyxDQUFDO0FBRXhFLFNBQWdCLGdCQUFnQjtJQUM5QixPQUFPLGFBQWEsRUFBRSxLQUFLLE9BQU8sQ0FBQztBQUNyQyxDQUFDO0FBRUQsU0FBZ0IsYUFBYTtJQUMzQixpRUFBaUU7SUFDakUsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFBLHFCQUFPLEdBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzNGLENBQUM7QUFFRCxTQUFTLE1BQU07SUFDYixpRUFBaUU7SUFDakUsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFBLHFCQUFPLEdBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ2pFLENBQUM7QUFFRCxNQUFhLGVBQWU7SUFDbkIsTUFBTSxDQUFDLGlCQUFpQjtRQUM3Qiw0Q0FBNEM7UUFDNUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUEseUJB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bGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgeyBjZGtDYWNoZURpciwgcm9vdERpciB9IGZyb20gJy4vdXRpbC9kaXJlY3Rvcmllcyc7XG5pbXBvcnQgeyBnZXRMYXRlc3RWZXJzaW9uRnJvbU5wbSB9IGZyb20gJy4vdXRpbC9ucG0nO1xuaW1wb3J0IHsgZGVidWcsIHByaW50IH0gZnJvbSAnLi4vbGliL2xvZ2dpbmcnO1xuaW1wb3J0IHsgVG9vbGtpdEVycm9yIH0gZnJvbSAnLi90b29sa2l0L2Vycm9yJztcbmltcG9ydCB7IGZvcm1hdEFzQmFubmVyIH0gZnJvbSAnLi4vbGliL3V0aWwvY29uc29sZS1mb3JtYXR0ZXJzJztcblxuY29uc3QgT05FX0RBWV9JTl9TRUNPTkRTID0gMSAqIDI0ICogNjAgKiA2MDtcblxuY29uc3QgVVBHUkFERV9ET0NVTUVOVEFUSU9OX0xJTktTOiBSZWNvcmQ8bnVtYmVyLCBzdHJpbmc+ID0ge1xuICAxOiAnaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Nkay92Mi9ndWlkZS9taWdyYXRpbmctdjIuaHRtbCcsXG59O1xuXG5leHBvcnQgY29uc3QgRElTUExBWV9WRVJTSU9OID0gYCR7dmVyc2lvbk51bWJlcigpfSAoYnVpbGQgJHtjb21taXQoKX0pYDtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzRGV2ZWxvcGVyQnVpbGQoKTogYm9vbGVhbiB7XG4gIHJldHVybiB2ZXJzaW9uTnVtYmVyKCkgPT09ICcwLjAuMCc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2ZXJzaW9uTnVtYmVyKCk6IHN0cmluZyB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzXG4gIHJldHVybiByZXF1aXJlKHBhdGguam9pbihyb290RGlyKCksICdwYWNrYWdlLmpzb24nKSkudmVyc2lvbi5yZXBsYWNlKC9cXCtbMC05YS1mXSskLywgJycpO1xufVxuXG5mdW5jdGlvbiBjb21taXQoKTogc3RyaW5nIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1yZXF1aXJlLWltcG9ydHNcbiAgcmV0dXJuIHJlcXVpcmUocGF0aC5qb2luKHJvb3REaXIoKSwgJ2J1aWxkLWluZm8uanNvbicpKS5jb21taXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBWZXJzaW9uQ2hlY2tUVEwge1xuICBwdWJsaWMgc3RhdGljIHRpbWVzdGFtcEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gICAgLy8gVXNpbmcgdGhlIHNhbWUgcGF0aCBmcm9tIGFjY291bnQtY2FjaGUudHNcbiAgICByZXR1cm4gcGF0aC5qb2luKGNka0NhY2hlRGlyKCksICdyZXBvLXZlcnNpb24tdHRsJyk7XG4gIH1cblxuICBwcml2YXRlIHJlYWRvbmx5IGZpbGU6IHN0cmluZztcblxuICAvLyBGaWxlIG1vZGlmeSB0aW1lcyBhcmUgYWNjdXJhdGUgb25seSB0byB0aGUgc2Vjb25kXG4gIHByaXZhdGUgcmVhZG9ubHkgdHRsU2VjczogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGZpbGU/OiBzdHJpbmcsIHR0bFNlY3M/OiBudW1iZXIpIHtcbiAgICB0aGlzLmZpbGUgPSBmaWxlIHx8IFZlcnNpb25DaGVja1RUTC50aW1lc3RhbXBGaWxlUGF0aCgpO1xuICAgIHRyeSB7XG4gICAgICBmcy5ta2RpcnNTeW5jKHBhdGguZGlybmFtZSh0aGlzLmZpbGUpKTtcbiAgICAgIGZzLmFjY2Vzc1N5bmMocGF0aC5kaXJuYW1lKHRoaXMuZmlsZSksIGZzLmNvbnN0YW50cy5XX09LKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYERpcmVjdG9yeSAoJHtwYXRoLmRpcm5hbWUodGhpcy5maWxlKX0pIGlzIG5vdCB3cml0YWJsZS5gKTtcbiAgICB9XG4gICAgdGhpcy50dGxTZWNzID0gdHRsU2VjcyB8fCBPTkVfREFZX0lOX1NFQ09ORFM7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgaGFzRXhwaXJlZCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbGFzdENoZWNrVGltZSA9IChhd2FpdCBmcy5zdGF0KHRoaXMuZmlsZSkpLm10aW1lTXM7XG4gICAgICBjb25zdCB0b2RheSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgICBpZiAoKHRvZGF5IC0gbGFzdENoZWNrVGltZSkgLyAxMDAwID4gdGhpcy50dGxTZWNzKSB7IC8vIGNvbnZlcnQgbXMgdG8gc2VjXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBpZiAoZXJyLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1cGRhdGUobGF0ZXN0VmVyc2lvbj86IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghbGF0ZXN0VmVyc2lvbikge1xuICAgICAgbGF0ZXN0VmVyc2lvbiA9ICcnO1xuICAgIH1cbiAgICBhd2FpdCBmcy53cml0ZUZpbGUodGhpcy5maWxlLCBsYXRlc3RWZXJzaW9uKTtcbiAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVuaXQgdGVzdGluZyBvbmx5LlxuLy8gRG9uJ3QgdXNlIGRpcmVjdGx5LCB1c2UgZGlzcGxheVZlcnNpb25NZXNzYWdlKCkgaW5zdGVhZC5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsYXRlc3RWZXJzaW9uSWZIaWdoZXIoY3VycmVudFZlcnNpb246IHN0cmluZywgY2FjaGVGaWxlOiBWZXJzaW9uQ2hlY2tUVEwpOiBQcm9taXNlPHN0cmluZ3xudWxsPiB7XG4gIGlmICghKGF3YWl0IGNhY2hlRmlsZS5oYXNFeHBpcmVkKCkpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBsYXRlc3RWZXJzaW9uID0gYXdhaXQgZ2V0TGF0ZXN0VmVyc2lvbkZyb21OcG0oKTtcbiAgY29uc3QgaXNOZXdlciA9IHNlbXZlci5ndChsYXRlc3RWZXJzaW9uLCBjdXJyZW50VmVyc2lvbik7XG4gIGF3YWl0IGNhY2hlRmlsZS51cGRhdGUobGF0ZXN0VmVyc2lvbik7XG5cbiAgaWYgKGlzTmV3ZXIpIHtcbiAgICByZXR1cm4gbGF0ZXN0VmVyc2lvbjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRNYWpvclZlcnNpb25VcGdyYWRlTWVzc2FnZShjdXJyZW50VmVyc2lvbjogc3RyaW5nKTogc3RyaW5nIHwgdm9pZCB7XG4gIGNvbnN0IGN1cnJlbnRNYWpvclZlcnNpb24gPSBzZW12ZXIubWFqb3IoY3VycmVudFZlcnNpb24pO1xuICBpZiAoVVBHUkFERV9ET0NVTUVOVEFUSU9OX0xJTktTW2N1cnJlbnRNYWpvclZlcnNpb25dKSB7XG4gICAgcmV0dXJuIGBJbmZvcm1hdGlvbiBhYm91dCB1cGdyYWRpbmcgZnJvbSB2ZXJzaW9uICR7Y3VycmVudE1ham9yVmVyc2lvbn0ueCB0byB2ZXJzaW9uICR7Y3VycmVudE1ham9yVmVyc2lvbiArIDF9LnggaXMgYXZhaWxhYmxlIGhlcmU6ICR7VVBHUkFERV9ET0NVTUVOVEFUSU9OX0xJTktTW2N1cnJlbnRNYWpvclZlcnNpb25dfWA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VmVyc2lvbk1lc3NhZ2UoY3VycmVudFZlcnNpb246IHN0cmluZywgbGF0ZXJWZXJzaW9uOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiBbXG4gICAgYE5ld2VyIHZlcnNpb24gb2YgQ0RLIGlzIGF2YWlsYWJsZSBbJHtjaGFsay5ncmVlbihsYXRlclZlcnNpb24gYXMgc3RyaW5nKX1dYCxcbiAgICBnZXRNYWpvclZlcnNpb25VcGdyYWRlTWVzc2FnZShjdXJyZW50VmVyc2lvbiksXG4gICAgJ1VwZ3JhZGUgcmVjb21tZW5kZWQgKG5wbSBpbnN0YWxsIC1nIGF3cy1jZGspJyxcbiAgXS5maWx0ZXIoQm9vbGVhbikgYXMgc3RyaW5nW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNwbGF5VmVyc2lvbk1lc3NhZ2UoY3VycmVudFZlcnNpb24gPSB2ZXJzaW9uTnVtYmVyKCksIHZlcnNpb25DaGVja0NhY2hlPzogVmVyc2lvbkNoZWNrVFRMKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghcHJvY2Vzcy5zdGRvdXQuaXNUVFkgfHwgcHJvY2Vzcy5lbnYuQ0RLX0RJU0FCTEVfVkVSU0lPTl9DSEVDSykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgbGF0ZXJWZXJzaW9uID0gYXdhaXQgbGF0ZXN0VmVyc2lvbklmSGlnaGVyKGN1cnJlbnRWZXJzaW9uLCB2ZXJzaW9uQ2hlY2tDYWNoZSA/PyBuZXcgVmVyc2lvbkNoZWNrVFRMKCkpO1xuICAgIGlmIChsYXRlclZlcnNpb24pIHtcbiAgICAgIGNvbnN0IGJhbm5lck1zZyA9IGZvcm1hdEFzQmFubmVyKGdldFZlcnNpb25NZXNzYWdlKGN1cnJlbnRWZXJzaW9uLCBsYXRlclZlcnNpb24pKTtcbiAgICAgIGJhbm5lck1zZy5mb3JFYWNoKChlKSA9PiBwcmludChlKSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgIGRlYnVnKGBDb3VsZCBub3QgcnVuIHZlcnNpb24gY2hlY2sgLSAke2Vyci5tZXNzYWdlfWApO1xuICB9XG59XG4iXX0=