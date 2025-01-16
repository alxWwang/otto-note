"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackCollection = exports.CloudAssembly = exports.ExtendedStackSelection = exports.DefaultSelection = void 0;
const cxapi = require("@aws-cdk/cx-api");
const chalk = require("chalk");
const minimatch_1 = require("minimatch");
const semver = require("semver");
const logging_1 = require("../../logging");
const error_1 = require("../../toolkit/error");
const util_1 = require("../../util");
var DefaultSelection;
(function (DefaultSelection) {
    /**
     * Returns an empty selection in case there are no selectors.
     */
    DefaultSelection["None"] = "none";
    /**
     * If the app includes a single stack, returns it. Otherwise throws an exception.
     * This behavior is used by "deploy".
     */
    DefaultSelection["OnlySingle"] = "single";
    /**
     * Returns all stacks in the main (top level) assembly only.
     */
    DefaultSelection["MainAssembly"] = "main";
    /**
     * If no selectors are provided, returns all stacks in the app,
     * including stacks inside nested assemblies.
     */
    DefaultSelection["AllStacks"] = "all";
})(DefaultSelection || (exports.DefaultSelection = DefaultSelection = {}));
/**
 * When selecting stacks, what other stacks to include because of dependencies
 */
var ExtendedStackSelection;
(function (ExtendedStackSelection) {
    /**
     * Don't select any extra stacks
     */
    ExtendedStackSelection[ExtendedStackSelection["None"] = 0] = "None";
    /**
     * Include stacks that this stack depends on
     */
    ExtendedStackSelection[ExtendedStackSelection["Upstream"] = 1] = "Upstream";
    /**
     * Include stacks that depend on this stack
     */
    ExtendedStackSelection[ExtendedStackSelection["Downstream"] = 2] = "Downstream";
})(ExtendedStackSelection || (exports.ExtendedStackSelection = ExtendedStackSelection = {}));
/**
 * A single Cloud Assembly and the operations we do on it to deploy the artifacts inside
 */
class CloudAssembly {
    constructor(assembly) {
        this.assembly = assembly;
        this.directory = assembly.directory;
    }
    async selectStacks(selector, options) {
        const asm = this.assembly;
        const topLevelStacks = asm.stacks;
        const stacks = semver.major(asm.version) < 10 ? asm.stacks : asm.stacksRecursively;
        const allTopLevel = selector.allTopLevel ?? false;
        const patterns = sanitizePatterns(selector.patterns);
        if (stacks.length === 0) {
            if (options.ignoreNoStacks) {
                return new StackCollection(this, []);
            }
            throw new error_1.ToolkitError('This app contains no stacks');
        }
        if (allTopLevel) {
            return this.selectTopLevelStacks(stacks, topLevelStacks, options.extend);
        }
        else if (patterns.length > 0) {
            return this.selectMatchingStacks(stacks, patterns, options.extend);
        }
        else {
            return this.selectDefaultStacks(stacks, topLevelStacks, options.defaultBehavior);
        }
    }
    selectTopLevelStacks(stacks, topLevelStacks, extend = ExtendedStackSelection.None) {
        if (topLevelStacks.length > 0) {
            return this.extendStacks(topLevelStacks, stacks, extend);
        }
        else {
            throw new error_1.ToolkitError('No stack found in the main cloud assembly. Use "list" to print manifest');
        }
    }
    selectMatchingStacks(stacks, patterns, extend = ExtendedStackSelection.None) {
        const matchingPattern = (pattern) => (stack) => (0, minimatch_1.minimatch)(stack.hierarchicalId, pattern);
        const matchedStacks = (0, util_1.flatten)(patterns.map(pattern => stacks.filter(matchingPattern(pattern))));
        return this.extendStacks(matchedStacks, stacks, extend);
    }
    selectDefaultStacks(stacks, topLevelStacks, defaultSelection) {
        switch (defaultSelection) {
            case DefaultSelection.MainAssembly:
                return new StackCollection(this, topLevelStacks);
            case DefaultSelection.AllStacks:
                return new StackCollection(this, stacks);
            case DefaultSelection.None:
                return new StackCollection(this, []);
            case DefaultSelection.OnlySingle:
                if (topLevelStacks.length === 1) {
                    return new StackCollection(this, topLevelStacks);
                }
                else {
                    throw new error_1.ToolkitError('Since this app includes more than a single stack, specify which stacks to use (wildcards are supported) or specify `--all`\n' +
                        `Stacks: ${stacks.map(x => x.hierarchicalId).join(' · ')}`);
                }
            default:
                throw new error_1.ToolkitError(`invalid default behavior: ${defaultSelection}`);
        }
    }
    extendStacks(matched, all, extend = ExtendedStackSelection.None) {
        const allStacks = new Map();
        for (const stack of all) {
            allStacks.set(stack.hierarchicalId, stack);
        }
        const index = indexByHierarchicalId(matched);
        switch (extend) {
            case ExtendedStackSelection.Downstream:
                includeDownstreamStacks(index, allStacks);
                break;
            case ExtendedStackSelection.Upstream:
                includeUpstreamStacks(index, allStacks);
                break;
        }
        // Filter original array because it is in the right order
        const selectedList = all.filter(s => index.has(s.hierarchicalId));
        return new StackCollection(this, selectedList);
    }
    /**
     * Select a single stack by its ID
     */
    stackById(stackId) {
        return new StackCollection(this, [this.assembly.getStackArtifact(stackId)]);
    }
}
exports.CloudAssembly = CloudAssembly;
/**
 * A collection of stacks and related artifacts
 *
 * In practice, not all artifacts in the CloudAssembly are created equal;
 * stacks can be selected independently, but other artifacts such as asset
 * bundles cannot.
 */
class StackCollection {
    constructor(assembly, stackArtifacts) {
        this.assembly = assembly;
        this.stackArtifacts = stackArtifacts;
    }
    get stackCount() {
        return this.stackArtifacts.length;
    }
    get firstStack() {
        if (this.stackCount < 1) {
            throw new error_1.ToolkitError('StackCollection contains no stack artifacts (trying to access the first one)');
        }
        return this.stackArtifacts[0];
    }
    get stackIds() {
        return this.stackArtifacts.map(s => s.id);
    }
    reversed() {
        const arts = [...this.stackArtifacts];
        arts.reverse();
        return new StackCollection(this.assembly, arts);
    }
    filter(predicate) {
        return new StackCollection(this.assembly, this.stackArtifacts.filter(predicate));
    }
    concat(other) {
        return new StackCollection(this.assembly, this.stackArtifacts.concat(other.stackArtifacts));
    }
    /**
     * Extracts 'aws:cdk:warning|info|error' metadata entries from the stack synthesis
     */
    processMetadataMessages(options = {}) {
        let warnings = false;
        let errors = false;
        for (const stack of this.stackArtifacts) {
            for (const message of stack.messages) {
                switch (message.level) {
                    case cxapi.SynthesisMessageLevel.WARNING:
                        warnings = true;
                        printMessage(logging_1.warning, 'Warning', message.id, message.entry);
                        break;
                    case cxapi.SynthesisMessageLevel.ERROR:
                        errors = true;
                        printMessage(logging_1.error, 'Error', message.id, message.entry);
                        break;
                    case cxapi.SynthesisMessageLevel.INFO:
                        printMessage(logging_1.print, 'Info', message.id, message.entry);
                        break;
                }
            }
        }
        if (errors && !options.ignoreErrors) {
            throw new error_1.ToolkitError('Found errors');
        }
        if (options.strict && warnings) {
            throw new error_1.ToolkitError('Found warnings (--strict mode)');
        }
        function printMessage(logFn, prefix, id, entry) {
            logFn(`[${prefix} at ${id}] ${entry.data}`);
            if (options.verbose && entry.trace) {
                logFn(`  ${entry.trace.join('\n  ')}`);
            }
        }
    }
}
exports.StackCollection = StackCollection;
function indexByHierarchicalId(stacks) {
    const result = new Map();
    for (const stack of stacks) {
        result.set(stack.hierarchicalId, stack);
    }
    return result;
}
/**
 * Calculate the transitive closure of stack dependents.
 *
 * Modifies `selectedStacks` in-place.
 */
function includeDownstreamStacks(selectedStacks, allStacks) {
    const added = new Array();
    let madeProgress;
    do {
        madeProgress = false;
        for (const [id, stack] of allStacks) {
            // Select this stack if it's not selected yet AND it depends on a stack that's in the selected set
            if (!selectedStacks.has(id) && (stack.dependencies || []).some(dep => selectedStacks.has(dep.id))) {
                selectedStacks.set(id, stack);
                added.push(id);
                madeProgress = true;
            }
        }
    } while (madeProgress);
    if (added.length > 0) {
        (0, logging_1.print)('Including depending stacks: %s', chalk.bold(added.join(', ')));
    }
}
/**
 * Calculate the transitive closure of stack dependencies.
 *
 * Modifies `selectedStacks` in-place.
 */
function includeUpstreamStacks(selectedStacks, allStacks) {
    const added = new Array();
    let madeProgress = true;
    while (madeProgress) {
        madeProgress = false;
        for (const stack of selectedStacks.values()) {
            // Select an additional stack if it's not selected yet and a dependency of a selected stack (and exists, obviously)
            for (const dependencyId of stack.dependencies.map(x => x.manifest.displayName ?? x.id)) {
                if (!selectedStacks.has(dependencyId) && allStacks.has(dependencyId)) {
                    added.push(dependencyId);
                    selectedStacks.set(dependencyId, allStacks.get(dependencyId));
                    madeProgress = true;
                }
            }
        }
    }
    if (added.length > 0) {
        (0, logging_1.print)('Including dependency stacks: %s', chalk.bold(added.join(', ')));
    }
}
function sanitizePatterns(patterns) {
    let sanitized = patterns.filter(s => s != null); // filter null/undefined
    sanitized = [...new Set(sanitized)]; // make them unique
    return sanitized;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWQtYXNzZW1ibHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbG91ZC1hc3NlbWJseS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5Q0FBeUM7QUFDekMsK0JBQStCO0FBQy9CLHlDQUFzQztBQUN0QyxpQ0FBaUM7QUFDakMsMkNBQXNEO0FBQ3RELCtDQUFtRDtBQUNuRCxxQ0FBcUM7QUFFckMsSUFBWSxnQkFzQlg7QUF0QkQsV0FBWSxnQkFBZ0I7SUFDMUI7O09BRUc7SUFDSCxpQ0FBYSxDQUFBO0lBRWI7OztPQUdHO0lBQ0gseUNBQXFCLENBQUE7SUFFckI7O09BRUc7SUFDSCx5Q0FBcUIsQ0FBQTtJQUVyQjs7O09BR0c7SUFDSCxxQ0FBaUIsQ0FBQTtBQUNuQixDQUFDLEVBdEJXLGdCQUFnQixnQ0FBaEIsZ0JBQWdCLFFBc0IzQjtBQXNCRDs7R0FFRztBQUNILElBQVksc0JBZVg7QUFmRCxXQUFZLHNCQUFzQjtJQUNoQzs7T0FFRztJQUNILG1FQUFJLENBQUE7SUFFSjs7T0FFRztJQUNILDJFQUFRLENBQUE7SUFFUjs7T0FFRztJQUNILCtFQUFVLENBQUE7QUFDWixDQUFDLEVBZlcsc0JBQXNCLHNDQUF0QixzQkFBc0IsUUFlakM7QUFrQkQ7O0dBRUc7QUFDSCxNQUFhLGFBQWE7SUFNeEIsWUFBNEIsUUFBNkI7UUFBN0IsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUFDdkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO0lBQ3RDLENBQUM7SUFFTSxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQXVCLEVBQUUsT0FBNEI7UUFDN0UsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUMxQixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxD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Q0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN2RixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQ3JFLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQ3pCLGNBQWMsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFFLENBQUMsQ0FBQztvQkFDL0QsWUFBWSxHQUFHLElBQUksQ0FBQztnQkFDdEIsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNyQixJQUFBLGVBQUssRUFBQyxpQ0FBaUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFrQjtJQUMxQyxJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsd0JBQXdCO0lBQ3pFLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtJQUN4RCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY3hhcGkgZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCAqIGFzIGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IG1pbmltYXRjaCB9IGZyb20gJ21pbmltYXRjaCc7XG5pbXBvcnQgKiBhcyBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7IGVycm9yLCBwcmludCwgd2FybmluZyB9IGZyb20gJy4uLy4uL2xvZ2dpbmcnO1xuaW1wb3J0IHsgVG9vbGtpdEVycm9yIH0gZnJvbSAnLi4vLi4vdG9vbGtpdC9lcnJvcic7XG5pbXBvcnQgeyBmbGF0dGVuIH0gZnJvbSAnLi4vLi4vdXRpbCc7XG5cbmV4cG9ydCBlbnVtIERlZmF1bHRTZWxlY3Rpb24ge1xuICAvKipcbiAgICogUmV0dXJucyBhbiBlbXB0eSBzZWxlY3Rpb24gaW4gY2FzZSB0aGVyZSBhcmUgbm8gc2VsZWN0b3JzLlxuICAgKi9cbiAgTm9uZSA9ICdub25lJyxcblxuICAvKipcbiAgICogSWYgdGhlIGFwcCBpbmNsdWRlcyBhIHNpbmdsZSBzdGFjaywgcmV0dXJucyBpdC4gT3RoZXJ3aXNlIHRocm93cyBhbiBleGNlcHRpb24uXG4gICAqIFRoaXMgYmVoYXZpb3IgaXMgdXNlZCBieSBcImRlcGxveVwiLlxuICAgKi9cbiAgT25seVNpbmdsZSA9ICdzaW5nbGUnLFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFsbCBzdGFja3MgaW4gdGhlIG1haW4gKHRvcCBsZXZlbCkgYXNzZW1ibHkgb25seS5cbiAgICovXG4gIE1haW5Bc3NlbWJseSA9ICdtYWluJyxcblxuICAvKipcbiAgICogSWYgbm8gc2VsZWN0b3JzIGFyZSBwcm92aWRlZCwgcmV0dXJucyBhbGwgc3RhY2tzIGluIHRoZSBhcHAsXG4gICAqIGluY2x1ZGluZyBzdGFja3MgaW5zaWRlIG5lc3RlZCBhc3NlbWJsaWVzLlxuICAgKi9cbiAgQWxsU3RhY2tzID0gJ2FsbCcsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0U3RhY2tzT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBFeHRlbmQgdGhlIHNlbGVjdGlvbiB0byB1cHN0cmVhZC9kb3duc3RyZWFtIHN0YWNrc1xuICAgKiBAZGVmYXVsdCBFeHRlbmRlZFN0YWNrU2VsZWN0aW9uLk5vbmUgb25seSBzZWxlY3QgdGhlIHNwZWNpZmllZCBzdGFja3MuXG4gICAqL1xuICBleHRlbmQ/OiBFeHRlbmRlZFN0YWNrU2VsZWN0aW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgYmVoYXZpb3IgaWYgbm8gc2VsZWN0b3JzIGFyZSBwcm92aWRlZC5cbiAgICovXG4gIGRlZmF1bHRCZWhhdmlvcjogRGVmYXVsdFNlbGVjdGlvbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBkZXBsb3kgaWYgdGhlIGFwcCBjb250YWlucyBubyBzdGFja3MuXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBpZ25vcmVOb1N0YWNrcz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogV2hlbiBzZWxlY3Rpbmcgc3RhY2tzLCB3aGF0IG90aGVyIHN0YWNrcyB0byBpbmNsdWRlIGJlY2F1c2Ugb2YgZGVwZW5kZW5jaWVzXG4gKi9cbmV4cG9ydCBlbnVtIEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24ge1xuICAvKipcbiAgICogRG9uJ3Qgc2VsZWN0IGFueSBleHRyYSBzdGFja3NcbiAgICovXG4gIE5vbmUsXG5cbiAgLyoqXG4gICAqIEluY2x1ZGUgc3RhY2tzIHRoYXQgdGhpcyBzdGFjayBkZXBlbmRzIG9uXG4gICAqL1xuICBVcHN0cmVhbSxcblxuICAvKipcbiAgICogSW5jbHVkZSBzdGFja3MgdGhhdCBkZXBlbmQgb24gdGhpcyBzdGFja1xuICAgKi9cbiAgRG93bnN0cmVhbSxcbn1cblxuLyoqXG4gKiBBIHNwZWNpZmljYXRpb24gb2Ygd2hpY2ggc3RhY2tzIHNob3VsZCBiZSBzZWxlY3RlZFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0YWNrU2VsZWN0b3Ige1xuICAvKipcbiAgICogV2hldGhlciBhbGwgc3RhY2tzIGF0IHRoZSB0b3AgbGV2ZWwgYXNzZW1ibHkgc2hvdWxkXG4gICAqIGJlIHNlbGVjdGVkIGFuZCBub3RoaW5nIGVsc2VcbiAgICovXG4gIGFsbFRvcExldmVsPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBsaXN0IG9mIHBhdHRlcm5zIHRvIG1hdGNoIHRoZSBzdGFjayBoaWVyYXJjaGljYWwgaWRzXG4gICAqL1xuICBwYXR0ZXJuczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQSBzaW5nbGUgQ2xvdWQgQXNzZW1ibHkgYW5kIHRoZSBvcGVyYXRpb25zIHdlIGRvIG9uIGl0IHRvIGRlcGxveSB0aGUgYXJ0aWZhY3RzIGluc2lkZVxuICovXG5leHBvcnQgY2xhc3MgQ2xvdWRBc3NlbWJseSB7XG4gIC8qKlxuICAgKiBUaGUgZGlyZWN0b3J5IHRoaXMgQ2xvdWRBc3NlbWJseSB3YXMgcmVhZCBmcm9tXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZGlyZWN0b3J5OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGFzc2VtYmx5OiBjeGFwaS5DbG91ZEFzc2VtYmx5KSB7XG4gICAgdGhpcy5kaXJlY3RvcnkgPSBhc3NlbWJseS5kaXJlY3Rvcnk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2VsZWN0U3RhY2tzKHNlbGVjdG9yOiBTdGFja1NlbGVjdG9yLCBvcHRpb25zOiBTZWxlY3RTdGFja3NPcHRpb25zKTogUHJvbWlzZTxTdGFja0NvbGxlY3Rpb24+IHtcbiAgICBjb25zdCBhc20gPSB0aGlzLmFzc2VtYmx5O1xuICAgIGNvbnN0IHRvcExldmVsU3RhY2tzID0gYXNtLnN0YWNrcztcbiAgICBjb25zdCBzdGFja3MgPSBzZW12ZXIubWFqb3IoYXNtLnZlcnNpb24pIDwgMTAgPyBhc20uc3RhY2tzIDogYXNtLnN0YWNrc1JlY3Vyc2l2ZWx5O1xuICAgIGNvbnN0IGFsbFRvcExldmVsID0gc2VsZWN0b3IuYWxsVG9wTGV2ZWwgPz8gZmFsc2U7XG4gICAgY29uc3QgcGF0dGVybnMgPSBzYW5pdGl6ZVBhdHRlcm5zKHNlbGVjdG9yLnBhdHRlcm5zKTtcblxuICAgIGlmIChzdGFja3MubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAob3B0aW9ucy5pZ25vcmVOb1N0YWNrcykge1xuICAgICAgICByZXR1cm4gbmV3IFN0YWNrQ29sbGVjdGlvbih0aGlzLCBbXSk7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdUaGlzIGFwcCBjb250YWlucyBubyBzdGFja3MnKTtcbiAgICB9XG5cbiAgICBpZiAoYWxsVG9wTGV2ZWwpIHtcbiAgICAgIHJldHVybiB0aGlzLnNlbGVjdFRvcExldmVsU3RhY2tzKHN0YWNrcywgdG9wTGV2ZWxTdGFja3MsIG9wdGlvbnMuZXh0ZW5kKTtcbiAgICB9IGVsc2UgaWYgKHBhdHRlcm5zLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB0aGlzLnNlbGVjdE1hdGNoaW5nU3RhY2tzKHN0YWNrcywgcGF0dGVybnMsIG9wdGlvbnMuZXh0ZW5kKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0RGVmYXVsdFN0YWNrcyhzdGFja3MsIHRvcExldmVsU3RhY2tzLCBvcHRpb25zLmRlZmF1bHRCZWhhdmlvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzZWxlY3RUb3BMZXZlbFN0YWNrcyhcbiAgICBzdGFja3M6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdFtdLFxuICAgIHRvcExldmVsU3RhY2tzOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3RbXSxcbiAgICBleHRlbmQ6IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24gPSBFeHRlbmRlZFN0YWNrU2VsZWN0aW9uLk5vbmUsXG4gICk6IFN0YWNrQ29sbGVjdGlvbiB7XG4gICAgaWYgKHRvcExldmVsU3RhY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB0aGlzLmV4dGVuZFN0YWNrcyh0b3BMZXZlbFN0YWNrcywgc3RhY2tzLCBleHRlbmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdObyBzdGFjayBmb3VuZCBpbiB0aGUgbWFpbiBjbG91ZCBhc3NlbWJseS4gVXNlIFwibGlzdFwiIHRvIHByaW50IG1hbmlmZXN0Jyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzZWxlY3RNYXRjaGluZ1N0YWNrcyhcbiAgICBzdGFja3M6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdFtdLFxuICAgIHBhdHRlcm5zOiBzdHJpbmdbXSxcbiAgICBleHRlbmQ6IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24gPSBFeHRlbmRlZFN0YWNrU2VsZWN0aW9uLk5vbmUsXG4gICk6IFN0YWNrQ29sbGVjdGlvbiB7XG5cbiAgICBjb25zdCBtYXRjaGluZ1BhdHRlcm4gPSAocGF0dGVybjogc3RyaW5nKSA9PiAoc3RhY2s6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdCkgPT4gbWluaW1hdGNoKHN0YWNrLmhpZXJhcmNoaWNhbElkLCBwYXR0ZXJuKTtcbiAgICBjb25zdCBtYXRjaGVkU3RhY2tzID0gZmxhdHRlbihwYXR0ZXJucy5tYXAocGF0dGVybiA9PiBzdGFja3MuZmlsdGVyKG1hdGNoaW5nUGF0dGVybihwYXR0ZXJuKSkpKTtcblxuICAgIHJldHVybiB0aGlzLmV4dGVuZFN0YWNrcyhtYXRjaGVkU3RhY2tzLCBzdGFja3MsIGV4dGVuZCk7XG4gIH1cblxuICBwcml2YXRlIHNlbGVjdERlZmF1bHRTdGFja3MoXG4gICAgc3RhY2tzOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3RbXSxcbiAgICB0b3BMZXZlbFN0YWNrczogY3hhcGkuQ2xvdWRGb3JtYXRpb25TdGFja0FydGlmYWN0W10sXG4gICAgZGVmYXVsdFNlbGVjdGlvbjogRGVmYXVsdFNlbGVjdGlvbixcbiAgKSB7XG4gICAgc3dpdGNoIChkZWZhdWx0U2VsZWN0aW9uKSB7XG4gICAgICBjYXNlIERlZmF1bHRTZWxlY3Rpb24uTWFpbkFzc2VtYmx5OlxuICAgICAgICByZXR1cm4gbmV3IFN0YWNrQ29sbGVjdGlvbih0aGlzLCB0b3BMZXZlbFN0YWNrcyk7XG4gICAgICBjYXNlIERlZmF1bHRTZWxlY3Rpb24uQWxsU3RhY2tzOlxuICAgICAgICByZXR1cm4gbmV3IFN0YWNrQ29sbGVjdGlvbih0aGlzLCBzdGFja3MpO1xuICAgICAgY2FzZSBEZWZhdWx0U2VsZWN0aW9uLk5vbmU6XG4gICAgICAgIHJldHVybiBuZXcgU3RhY2tDb2xsZWN0aW9uKHRoaXMsIFtdKTtcbiAgICAgIGNhc2UgRGVmYXVsdFNlbGVjdGlvbi5Pbmx5U2luZ2xlOlxuICAgICAgICBpZiAodG9wTGV2ZWxTdGFja3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBTdGFja0NvbGxlY3Rpb24odGhpcywgdG9wTGV2ZWxTdGFja3MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoJ1NpbmNlIHRoaXMgYXBwIGluY2x1ZGVzIG1vcmUgdGhhbiBhIHNpbmdsZSBzdGFjaywgc3BlY2lmeSB3aGljaCBzdGFja3MgdG8gdXNlICh3aWxkY2FyZHMgYXJlIHN1cHBvcnRlZCkgb3Igc3BlY2lmeSBgLS1hbGxgXFxuJyArXG4gICAgICAgICAgYFN0YWNrczogJHtzdGFja3MubWFwKHggPT4geC5oaWVyYXJjaGljYWxJZCkuam9pbignIMK3ICcpfWApO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBpbnZhbGlkIGRlZmF1bHQgYmVoYXZpb3I6ICR7ZGVmYXVsdFNlbGVjdGlvbn1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dGVuZFN0YWNrcyhcbiAgICBtYXRjaGVkOiBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3RbXSxcbiAgICBhbGw6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdFtdLFxuICAgIGV4dGVuZDogRXh0ZW5kZWRTdGFja1NlbGVjdGlvbiA9IEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24uTm9uZSxcbiAgKSB7XG4gICAgY29uc3QgYWxsU3RhY2tzID0gbmV3IE1hcDxzdHJpbmcsIGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdD4oKTtcbiAgICBmb3IgKGNvbnN0IHN0YWNrIG9mIGFsbCkge1xuICAgICAgYWxsU3RhY2tzLnNldChzdGFjay5oaWVyYXJjaGljYWxJZCwgc3RhY2spO1xuICAgIH1cblxuICAgIGNvbnN0IGluZGV4ID0gaW5kZXhCeUhpZXJhcmNoaWNhbElkKG1hdGNoZWQpO1xuXG4gICAgc3dpdGNoIChleHRlbmQpIHtcbiAgICAgIGNhc2UgRXh0ZW5kZWRTdGFja1NlbGVjdGlvbi5Eb3duc3RyZWFtOlxuICAgICAgICBpbmNsdWRlRG93bnN0cmVhbVN0YWNrcyhpbmRleCwgYWxsU3RhY2tzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIEV4dGVuZGVkU3RhY2tTZWxlY3Rpb24uVXBzdHJlYW06XG4gICAgICAgIGluY2x1ZGVVcHN0cmVhbVN0YWNrcyhpbmRleCwgYWxsU3RhY2tzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gRmlsdGVyIG9yaWdpbmFsIGFycmF5IGJlY2F1c2UgaXQgaXMgaW4gdGhlIHJpZ2h0IG9yZGVyXG4gICAgY29uc3Qgc2VsZWN0ZWRMaXN0ID0gYWxsLmZpbHRlcihzID0+IGluZGV4LmhhcyhzLmhpZXJhcmNoaWNhbElkKSk7XG5cbiAgICByZXR1cm4gbmV3IFN0YWNrQ29sbGVjdGlvbih0aGlzLCBzZWxlY3RlZExpc3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbGVjdCBhIHNpbmdsZSBzdGFjayBieSBpdHMgSURcbiAgICovXG4gIHB1YmxpYyBzdGFja0J5SWQoc3RhY2tJZDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBTdGFja0NvbGxlY3Rpb24odGhpcywgW3RoaXMuYXNzZW1ibHkuZ2V0U3RhY2tBcnRpZmFjdChzdGFja0lkKV0pO1xuICB9XG59XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHN0YWNrcyBhbmQgcmVsYXRlZCBhcnRpZmFjdHNcbiAqXG4gKiBJbiBwcmFjdGljZSwgbm90IGFsbCBhcnRpZmFjdHMgaW4gdGhlIENsb3VkQXNzZW1ibHkgYXJlIGNyZWF0ZWQgZXF1YWw7XG4gKiBzdGFja3MgY2FuIGJlIHNlbGVjdGVkIGluZGVwZW5kZW50bHksIGJ1dCBvdGhlciBhcnRpZmFjdHMgc3VjaCBhcyBhc3NldFxuICogYnVuZGxlcyBjYW5ub3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBTdGFja0NvbGxlY3Rpb24ge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgYXNzZW1ibHk6IENsb3VkQXNzZW1ibHksIHB1YmxpYyByZWFkb25seSBzdGFja0FydGlmYWN0czogY3hhcGkuQ2xvdWRGb3JtYXRpb25TdGFja0FydGlmYWN0W10pIHtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgc3RhY2tDb3VudCgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGFja0FydGlmYWN0cy5sZW5ndGg7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGZpcnN0U3RhY2soKSB7XG4gICAgaWYgKHRoaXMuc3RhY2tDb3VudCA8IDEpIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoJ1N0YWNrQ29sbGVjdGlvbiBjb250YWlucyBubyBzdGFjayBhcnRpZmFjdHMgKHRyeWluZyB0byBhY2Nlc3MgdGhlIGZpcnN0IG9uZSknKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhY2tBcnRpZmFjdHNbMF07XG4gIH1cblxuICBwdWJsaWMgZ2V0IHN0YWNrSWRzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5zdGFja0FydGlmYWN0cy5tYXAocyA9PiBzLmlkKTtcbiAgfVxuXG4gIHB1YmxpYyByZXZlcnNlZCgpIHtcbiAgICBjb25zdCBhcnRzID0gWy4uLnRoaXMuc3RhY2tBcnRpZmFjdHNdO1xuICAgIGFydHMucmV2ZXJzZSgpO1xuICAgIHJldHVybiBuZXcgU3RhY2tDb2xsZWN0aW9uKHRoaXMuYXNzZW1ibHksIGFydHMpO1xuICB9XG5cbiAgcHVibGljIGZpbHRlcihwcmVkaWNhdGU6IChhcnQ6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdCkgPT4gYm9vbGVhbik6IFN0YWNrQ29sbGVjdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBTdGFja0NvbGxlY3Rpb24odGhpcy5hc3NlbWJseSwgdGhpcy5zdGFja0FydGlmYWN0cy5maWx0ZXIocHJlZGljYXRlKSk7XG4gIH1cblxuICBwdWJsaWMgY29uY2F0KG90aGVyOiBTdGFja0NvbGxlY3Rpb24pOiBTdGFja0NvbGxlY3Rpb24ge1xuICAgIHJldHVybiBuZXcgU3RhY2tDb2xsZWN0aW9uKHRoaXMuYXNzZW1ibHksIHRoaXMuc3RhY2tBcnRpZmFjdHMuY29uY2F0KG90aGVyLnN0YWNrQXJ0aWZhY3RzKSk7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgJ2F3czpjZGs6d2FybmluZ3xpbmZvfGVycm9yJyBtZXRhZGF0YSBlbnRyaWVzIGZyb20gdGhlIHN0YWNrIHN5bnRoZXNpc1xuICAgKi9cbiAgcHVibGljIHByb2Nlc3NNZXRhZGF0YU1lc3NhZ2VzKG9wdGlvbnM6IE1ldGFkYXRhTWVzc2FnZU9wdGlvbnMgPSB7fSkge1xuICAgIGxldCB3YXJuaW5ncyA9IGZhbHNlO1xuICAgIGxldCBlcnJvcnMgPSBmYWxzZTtcblxuICAgIGZvciAoY29uc3Qgc3RhY2sgb2YgdGhpcy5zdGFja0FydGlmYWN0cykge1xuICAgICAgZm9yIChjb25zdCBtZXNzYWdlIG9mIHN0YWNrLm1lc3NhZ2VzKSB7XG4gICAgICAgIHN3aXRjaCAobWVzc2FnZS5sZXZlbCkge1xuICAgICAgICAgIGNhc2UgY3hhcGkuU3ludGhlc2lzTWVzc2FnZUxldmVsLldBUk5JTkc6XG4gICAgICAgICAgICB3YXJuaW5ncyA9IHRydWU7XG4gICAgICAgICAgICBwcmludE1lc3NhZ2Uod2FybmluZywgJ1dhcm5pbmcnLCBtZXNzYWdlLmlkLCBtZXNzYWdlLmVudHJ5KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgY3hhcGkuU3ludGhlc2lzTWVzc2FnZUxldmVsLkVSUk9SOlxuICAgICAgICAgICAgZXJyb3JzID0gdHJ1ZTtcbiAgICAgICAgICAgIHByaW50TWVzc2FnZShlcnJvciwgJ0Vycm9yJywgbWVzc2FnZS5pZCwgbWVzc2FnZS5lbnRyeSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIGN4YXBpLlN5bnRoZXNpc01lc3NhZ2VMZXZlbC5JTkZPOlxuICAgICAgICAgICAgcHJpbnRNZXNzYWdlKHByaW50LCAnSW5mbycsIG1lc3NhZ2UuaWQsIG1lc3NhZ2UuZW50cnkpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZXJyb3JzICYmICFvcHRpb25zLmlnbm9yZUVycm9ycykge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcignRm91bmQgZXJyb3JzJyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuc3RyaWN0ICYmIHdhcm5pbmdzKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdGb3VuZCB3YXJuaW5ncyAoLS1zdHJpY3QgbW9kZSknKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmludE1lc3NhZ2UobG9nRm46IChzOiBzdHJpbmcpID0+IHZvaWQsIHByZWZpeDogc3RyaW5nLCBpZDogc3RyaW5nLCBlbnRyeTogY3hhcGkuTWV0YWRhdGFFbnRyeSkge1xuICAgICAgbG9nRm4oYFske3ByZWZpeH0gYXQgJHtpZH1dICR7ZW50cnkuZGF0YX1gKTtcblxuICAgICAgaWYgKG9wdGlvbnMudmVyYm9zZSAmJiBlbnRyeS50cmFjZSkge1xuICAgICAgICBsb2dGbihgICAke2VudHJ5LnRyYWNlLmpvaW4oJ1xcbiAgJyl9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFNZXNzYWdlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGJlIHZlcmJvc2VcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHZlcmJvc2U/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEb24ndCBzdG9wIG9uIGVycm9yIG1ldGFkYXRhXG4gICAqXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBpZ25vcmVFcnJvcnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUcmVhdCB3YXJuaW5ncyBpbiBtZXRhZGF0YSBhcyBlcnJvcnNcbiAgICpcbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHN0cmljdD86IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIGluZGV4QnlIaWVyYXJjaGljYWxJZChzdGFja3M6IGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdFtdKTogTWFwPHN0cmluZywgY3hhcGkuQ2xvdWRGb3JtYXRpb25TdGFja0FydGlmYWN0PiB7XG4gIGNvbnN0IHJlc3VsdCA9IG5ldyBNYXA8c3RyaW5nLCBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3Q+KCk7XG5cbiAgZm9yIChjb25zdCBzdGFjayBvZiBzdGFja3MpIHtcbiAgICByZXN1bHQuc2V0KHN0YWNrLmhpZXJhcmNoaWNhbElkLCBzdGFjayk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSB0aGUgdHJhbnNpdGl2ZSBjbG9zdXJlIG9mIHN0YWNrIGRlcGVuZGVudHMuXG4gKlxuICogTW9kaWZpZXMgYHNlbGVjdGVkU3RhY2tzYCBpbi1wbGFjZS5cbiAqL1xuZnVuY3Rpb24gaW5jbHVkZURvd25zdHJlYW1TdGFja3MoXG4gIHNlbGVjdGVkU3RhY2tzOiBNYXA8c3RyaW5nLCBjeGFwaS5DbG91ZEZvcm1hdGlvblN0YWNrQXJ0aWZhY3Q+LFxuICBhbGxTdGFja3M6IE1hcDxzdHJpbmcsIGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdD4pIHtcbiAgY29uc3QgYWRkZWQgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuXG4gIGxldCBtYWRlUHJvZ3Jlc3M7XG4gIGRvIHtcbiAgICBtYWRlUHJvZ3Jlc3MgPSBmYWxzZTtcblxuICAgIGZvciAoY29uc3QgW2lkLCBzdGFja10gb2YgYWxsU3RhY2tzKSB7XG4gICAgICAvLyBTZWxlY3QgdGhpcyBzdGFjayBpZiBpdCdzIG5vdCBzZWxlY3RlZCB5ZXQgQU5EIGl0IGRlcGVuZHMgb24gYSBzdGFjayB0aGF0J3MgaW4gdGhlIHNlbGVjdGVkIHNldFxuICAgICAgaWYgKCFzZWxlY3RlZFN0YWNrcy5oYXMoaWQpICYmIChzdGFjay5kZXBlbmRlbmNpZXMgfHwgW10pLnNvbWUoZGVwID0+IHNlbGVjdGVkU3RhY2tzLmhhcyhkZXAuaWQpKSkge1xuICAgICAgICBzZWxlY3RlZFN0YWNrcy5zZXQoaWQsIHN0YWNrKTtcbiAgICAgICAgYWRkZWQucHVzaChpZCk7XG4gICAgICAgIG1hZGVQcm9ncmVzcyA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9IHdoaWxlIChtYWRlUHJvZ3Jlc3MpO1xuXG4gIGlmIChhZGRlZC5sZW5ndGggPiAwKSB7XG4gICAgcHJpbnQoJ0luY2x1ZGluZyBkZXBlbmRpbmcgc3RhY2tzOiAlcycsIGNoYWxrLmJvbGQoYWRkZWQuam9pbignLCAnKSkpO1xuICB9XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlIHRoZSB0cmFuc2l0aXZlIGNsb3N1cmUgb2Ygc3RhY2sgZGVwZW5kZW5jaWVzLlxuICpcbiAqIE1vZGlmaWVzIGBzZWxlY3RlZFN0YWNrc2AgaW4tcGxhY2UuXG4gKi9cbmZ1bmN0aW9uIGluY2x1ZGVVcHN0cmVhbVN0YWNrcyhcbiAgc2VsZWN0ZWRTdGFja3M6IE1hcDxzdHJpbmcsIGN4YXBpLkNsb3VkRm9ybWF0aW9uU3RhY2tBcnRpZmFjdD4sXG4gIGFsbFN0YWNrczogTWFwPHN0cmluZywgY3hhcGkuQ2xvdWRGb3JtYXRpb25TdGFja0FydGlmYWN0Pikge1xuICBjb25zdCBhZGRlZCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG4gIGxldCBtYWRlUHJvZ3Jlc3MgPSB0cnVlO1xuICB3aGlsZSAobWFkZVByb2dyZXNzKSB7XG4gICAgbWFkZVByb2dyZXNzID0gZmFsc2U7XG5cbiAgICBmb3IgKGNvbnN0IHN0YWNrIG9mIHNlbGVjdGVkU3RhY2tzLnZhbHVlcygpKSB7XG4gICAgICAvLyBTZWxlY3QgYW4gYWRkaXRpb25hbCBzdGFjayBpZiBpdCdzIG5vdCBzZWxlY3RlZCB5ZXQgYW5kIGEgZGVwZW5kZW5jeSBvZiBhIHNlbGVjdGVkIHN0YWNrIChhbmQgZXhpc3RzLCBvYnZpb3VzbHkpXG4gICAgICBmb3IgKGNvbnN0IGRlcGVuZGVuY3lJZCBvZiBzdGFjay5kZXBlbmRlbmNpZXMubWFwKHggPT4geC5tYW5pZmVzdC5kaXNwbGF5TmFtZSA/PyB4LmlkKSkge1xuICAgICAgICBpZiAoIXNlbGVjdGVkU3RhY2tzLmhhcyhkZXBlbmRlbmN5SWQpICYmIGFsbFN0YWNrcy5oYXMoZGVwZW5kZW5jeUlkKSkge1xuICAgICAgICAgIGFkZGVkLnB1c2goZGVwZW5kZW5jeUlkKTtcbiAgICAgICAgICBzZWxlY3RlZFN0YWNrcy5zZXQoZGVwZW5kZW5jeUlkLCBhbGxTdGFja3MuZ2V0KGRlcGVuZGVuY3lJZCkhKTtcbiAgICAgICAgICBtYWRlUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGFkZGVkLmxlbmd0aCA+IDApIHtcbiAgICBwcmludCgnSW5jbHVkaW5nIGRlcGVuZGVuY3kgc3RhY2tzOiAlcycsIGNoYWxrLmJvbGQoYWRkZWQuam9pbignLCAnKSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNhbml0aXplUGF0dGVybnMocGF0dGVybnM6IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuICBsZXQgc2FuaXRpemVkID0gcGF0dGVybnMuZmlsdGVyKHMgPT4gcyAhPSBudWxsKTsgLy8gZmlsdGVyIG51bGwvdW5kZWZpbmVkXG4gIHNhbml0aXplZCA9IFsuLi5uZXcgU2V0KHNhbml0aXplZCldOyAvLyBtYWtlIHRoZW0gdW5pcXVlXG4gIHJldHVybiBzYW5pdGl6ZWQ7XG59XG4iXX0=