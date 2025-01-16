"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cxapiAssemblyWithForcedVersion = cxapiAssemblyWithForcedVersion;
exports.cliAssemblyWithForcedVersion = cliAssemblyWithForcedVersion;
exports.rewriteManifestVersion = rewriteManifestVersion;
const fs = require("fs");
const cxapi = require("@aws-cdk/cx-api");
const cloud_assembly_1 = require("../../lib/api/cxapp/cloud-assembly");
/**
 * The cloud-assembly-schema in the new monorepo will use its own package version as the schema version, which is always `0.0.0` when tests are running.
 *
 * If we want to test the CLI's behavior when presented with specific schema versions, we will have to
 * mutate `manifest.json` on disk after writing it, and write the schema version that we want to test for in there.
 *
 * After we raise the schema version in the file on disk from `0.0.0` to
 * `30.0.0`, `cx-api` will refuse to load `manifest.json` back, because the
 * version is higher than its own package version ("Maximum schema version
 * supported is 0.x.x, but found 30.0.0"), so we have to turn on `skipVersionCheck`.
 */
function cxapiAssemblyWithForcedVersion(asm, version) {
    rewriteManifestVersion(asm.directory, version);
    return new cxapi.CloudAssembly(asm.directory, { skipVersionCheck: true });
}
/**
 * The CLI has its own CloudAssembly class which wraps the cxapi CloudAssembly class
 */
function cliAssemblyWithForcedVersion(asm, version) {
    rewriteManifestVersion(asm.directory, version);
    return new cloud_assembly_1.CloudAssembly(new cxapi.CloudAssembly(asm.directory, { skipVersionCheck: true }));
}
function rewriteManifestVersion(directory, version) {
    const manifestFile = `${directory}/manifest.json`;
    const contents = JSON.parse(fs.readFileSync(`${directory}/manifest.json`, 'utf-8'));
    contents.version = version;
    fs.writeFileSync(manifestFile, JSON.stringify(contents, undefined, 2));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZW1ibHktdmVyc2lvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhc3NlbWJseS12ZXJzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWVBLHdFQUdDO0FBS0Qsb0VBR0M7QUFFRCx3REFLQztBQWpDRCx5QkFBeUI7QUFDekIseUNBQXlDO0FBQ3pDLHVFQUFtRTtBQUVuRTs7Ozs7Ozs7OztHQVVHO0FBQ0gsU0FBZ0IsOEJBQThCLENBQUMsR0FBd0IsRUFBRSxPQUFlO0lBQ3RGLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0MsT0FBTyxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDNUUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsNEJBQTRCLENBQUMsR0FBa0IsRUFBRSxPQUFlO0lBQzlFLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0MsT0FBTyxJQUFJLDhCQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDL0YsQ0FBQztBQUVELFNBQWdCLHNCQUFzQixDQUFDLFNBQWlCLEVBQUUsT0FBZTtJQUN2RSxNQUFNLFlBQVksR0FBRyxHQUFHLFNBQVMsZ0JBQWdCLENBQUM7SUFDbEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsU0FBUyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLFFBQVEsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQzNCLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBjeGFwaSBmcm9tICdAYXdzLWNkay9jeC1hcGknO1xuaW1wb3J0IHsgQ2xvdWRBc3NlbWJseSB9IGZyb20gJy4uLy4uL2xpYi9hcGkvY3hhcHAvY2xvdWQtYXNzZW1ibHknO1xuXG4vKipcbiAqIFRoZSBjbG91ZC1hc3NlbWJseS1zY2hlbWEgaW4gdGhlIG5ldyBtb25vcmVwbyB3aWxsIHVzZSBpdHMgb3duIHBhY2thZ2UgdmVyc2lvbiBhcyB0aGUgc2NoZW1hIHZlcnNpb24sIHdoaWNoIGlzIGFsd2F5cyBgMC4wLjBgIHdoZW4gdGVzdHMgYXJlIHJ1bm5pbmcuXG4gKlxuICogSWYgd2Ugd2FudCB0byB0ZXN0IHRoZSBDTEkncyBiZWhhdmlvciB3aGVuIHByZXNlbnRlZCB3aXRoIHNwZWNpZmljIHNjaGVtYSB2ZXJzaW9ucywgd2Ugd2lsbCBoYXZlIHRvXG4gKiBtdXRhdGUgYG1hbmlmZXN0Lmpzb25gIG9uIGRpc2sgYWZ0ZXIgd3JpdGluZyBpdCwgYW5kIHdyaXRlIHRoZSBzY2hlbWEgdmVyc2lvbiB0aGF0IHdlIHdhbnQgdG8gdGVzdCBmb3IgaW4gdGhlcmUuXG4gKlxuICogQWZ0ZXIgd2UgcmFpc2UgdGhlIHNjaGVtYSB2ZXJzaW9uIGluIHRoZSBmaWxlIG9uIGRpc2sgZnJvbSBgMC4wLjBgIHRvXG4gKiBgMzAuMC4wYCwgYGN4LWFwaWAgd2lsbCByZWZ1c2UgdG8gbG9hZCBgbWFuaWZlc3QuanNvbmAgYmFjaywgYmVjYXVzZSB0aGVcbiAqIHZlcnNpb24gaXMgaGlnaGVyIHRoYW4gaXRzIG93biBwYWNrYWdlIHZlcnNpb24gKFwiTWF4aW11bSBzY2hlbWEgdmVyc2lvblxuICogc3VwcG9ydGVkIGlzIDAueC54LCBidXQgZm91bmQgMzAuMC4wXCIpLCBzbyB3ZSBoYXZlIHRvIHR1cm4gb24gYHNraXBWZXJzaW9uQ2hlY2tgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3hhcGlBc3NlbWJseVdpdGhGb3JjZWRWZXJzaW9uKGFzbTogY3hhcGkuQ2xvdWRBc3NlbWJseSwgdmVyc2lvbjogc3RyaW5nKSB7XG4gIHJld3JpdGVNYW5pZmVzdFZlcnNpb24oYXNtLmRpcmVjdG9yeSwgdmVyc2lvbik7XG4gIHJldHVybiBuZXcgY3hhcGkuQ2xvdWRBc3NlbWJseShhc20uZGlyZWN0b3J5LCB7IHNraXBWZXJzaW9uQ2hlY2s6IHRydWUgfSk7XG59XG5cbi8qKlxuICogVGhlIENMSSBoYXMgaXRzIG93biBDbG91ZEFzc2VtYmx5IGNsYXNzIHdoaWNoIHdyYXBzIHRoZSBjeGFwaSBDbG91ZEFzc2VtYmx5IGNsYXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGlBc3NlbWJseVdpdGhGb3JjZWRWZXJzaW9uKGFzbTogQ2xvdWRBc3NlbWJseSwgdmVyc2lvbjogc3RyaW5nKSB7XG4gIHJld3JpdGVNYW5pZmVzdFZlcnNpb24oYXNtLmRpcmVjdG9yeSwgdmVyc2lvbik7XG4gIHJldHVybiBuZXcgQ2xvdWRBc3NlbWJseShuZXcgY3hhcGkuQ2xvdWRBc3NlbWJseShhc20uZGlyZWN0b3J5LCB7IHNraXBWZXJzaW9uQ2hlY2s6IHRydWUgfSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZU1hbmlmZXN0VmVyc2lvbihkaXJlY3Rvcnk6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nKSB7XG4gIGNvbnN0IG1hbmlmZXN0RmlsZSA9IGAke2RpcmVjdG9yeX0vbWFuaWZlc3QuanNvbmA7XG4gIGNvbnN0IGNvbnRlbnRzID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoYCR7ZGlyZWN0b3J5fS9tYW5pZmVzdC5qc29uYCwgJ3V0Zi04JykpO1xuICBjb250ZW50cy52ZXJzaW9uID0gdmVyc2lvbjtcbiAgZnMud3JpdGVGaWxlU3luYyhtYW5pZmVzdEZpbGUsIEpTT04uc3RyaW5naWZ5KGNvbnRlbnRzLCB1bmRlZmluZWQsIDIpKTtcbn1cbiJdfQ==