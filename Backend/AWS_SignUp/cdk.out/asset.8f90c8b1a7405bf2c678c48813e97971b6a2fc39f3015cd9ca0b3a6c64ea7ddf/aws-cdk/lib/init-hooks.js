"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeBuiltinHooks = invokeBuiltinHooks;
const path = require("path");
const os_1 = require("./os");
const error_1 = require("./toolkit/error");
/**
 * Invoke hooks for the given init template
 *
 * Sometimes templates need more complex logic than just replacing tokens. A 'hook' can be
 * used to do additional processing other than copying files.
 *
 * Hooks used to be defined externally to the CLI, by running arbitrarily
 * substituted shell scripts in the target directory.
 *
 * In practice, they're all TypeScript files and all the same, and the dynamism
 * that the original solution allowed wasn't used at all. Worse, since the CLI
 * is now bundled the hooks can't even reuse code from the CLI libraries at all
 * anymore, so all shared code would have to be copy/pasted.
 *
 * Bundle hooks as built-ins into the CLI, so they get bundled and can take advantage
 * of all shared code.
 */
async function invokeBuiltinHooks(target, context) {
    switch (target.language) {
        case 'csharp':
            if (['app', 'sample-app'].includes(target.templateName)) {
                return dotnetAddProject(target.targetDirectory, context);
            }
            break;
        case 'fsharp':
            if (['app', 'sample-app'].includes(target.templateName)) {
                return dotnetAddProject(target.targetDirectory, context, 'fsproj');
            }
            break;
        case 'python':
            // We can't call this file 'requirements.template.txt' because Dependabot needs to be able to find it.
            // Therefore, keep the in-repo name but still substitute placeholders.
            await context.substitutePlaceholdersIn('requirements.txt');
            break;
        case 'java':
            // We can't call this file 'pom.template.xml'... for the same reason as Python above.
            await context.substitutePlaceholdersIn('pom.xml');
            break;
        case 'javascript':
        case 'typescript':
            // See above, but for 'package.json'.
            await context.substitutePlaceholdersIn('package.json');
    }
}
async function dotnetAddProject(targetDirectory, context, ext = 'csproj') {
    const pname = context.placeholder('name.PascalCased');
    const slnPath = path.join(targetDirectory, 'src', `${pname}.sln`);
    const csprojPath = path.join(targetDirectory, 'src', pname, `${pname}.${ext}`);
    try {
        await (0, os_1.shell)(['dotnet', 'sln', slnPath, 'add', csprojPath]);
    }
    catch (e) {
        throw new error_1.ToolkitError(`Could not add project ${pname}.${ext} to solution ${pname}.sln. ${e.message}`);
    }
}
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC1ob29rcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXQtaG9va3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFnREEsZ0RBK0JDO0FBL0VELDZCQUE2QjtBQUM3Qiw2QkFBNkI7QUFDN0IsMkNBQStDO0FBNkIvQzs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNJLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxNQUFrQixFQUFFLE9BQW9CO0lBQy9FLFFBQVEsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLEtBQUssUUFBUTtZQUNYLElBQUksQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDM0QsQ0FBQztZQUNELE1BQU07UUFFUixLQUFLLFFBQVE7WUFDWCxJQUFJLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDeEQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNyRSxDQUFDO1lBQ0QsTUFBTTtRQUVSLEtBQUssUUFBUTtZQUNYLHNHQUFzRztZQUN0RyxzRUFBc0U7WUFDdEUsTUFBTSxPQUFPLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUMzRCxNQUFNO1FBRVIsS0FBSyxNQUFNO1lBQ1QscUZBQXFGO1lBQ3JGLE1BQU0sT0FBTyxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2xELE1BQU07UUFFUixLQUFLLFlBQVksQ0FBQztRQUNsQixLQUFLLFlBQVk7WUFDZixxQ0FBcUM7WUFDckMsTUFBTSxPQUFPLENBQUMsd0JBQXdCLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFM0QsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsZUFBdUIsRUFBRSxPQUFvQixFQUFFLEdBQUcsR0FBRyxRQUFRO0lBQzNGLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUN0RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLE1BQU0sQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMvRSxJQUFJLENBQUM7UUFDSCxNQUFNLElBQUEsVUFBSyxFQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUFDLE9BQU8sQ0FBTSxFQUFFLENBQUM7UUFDaEIsTUFBTSxJQUFJLG9CQUFZLENBQUMseUJBQXlCLEtBQUssSUFBSSxHQUFHLGdCQUFnQixLQUFLLFNBQVMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDekcsQ0FBQztBQUNILENBQUM7QUFBQSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHNoZWxsIH0gZnJvbSAnLi9vcyc7XG5pbXBvcnQgeyBUb29sa2l0RXJyb3IgfSBmcm9tICcuL3Rvb2xraXQvZXJyb3InO1xuXG5leHBvcnQgdHlwZSBTdWJzdGl0dXRlUGxhY2Vob2xkZXJzID0gKC4uLmZpbGVOYW1lczogc3RyaW5nW10pID0+IFByb21pc2U8dm9pZD47XG5cbi8qKlxuICogSGVscGVycyBwYXNzZWQgdG8gaG9vayBmdW5jdGlvbnNcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rQ29udGV4dCB7XG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZXBsYWNlIHBsYWNlaG9sZGVycyBvbiBhcmJpdHJhcnkgZmlsZXNcbiAgICpcbiAgICogVGhpcyBtYWtlcyB0b2tlbiBzdWJzdGl0dXRpb24gYXZhaWxhYmxlIHRvIG5vbi1gLnRlbXBsYXRlYCBmaWxlcy5cbiAgICovXG4gIHJlYWRvbmx5IHN1YnN0aXR1dGVQbGFjZWhvbGRlcnNJbjogU3Vic3RpdHV0ZVBsYWNlaG9sZGVycztcblxuICAvKipcbiAgICogUmV0dXJuIGEgc2luZ2xlIHBsYWNlaG9sZGVyXG4gICAqL1xuICBwbGFjZWhvbGRlcihuYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIEludm9rZUhvb2sgPSAodGFyZ2V0RGlyZWN0b3J5OiBzdHJpbmcsIGNvbnRleHQ6IEhvb2tDb250ZXh0KSA9PiBQcm9taXNlPHZvaWQ+O1xuXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tUYXJnZXQge1xuICByZWFkb25seSB0YXJnZXREaXJlY3Rvcnk6IHN0cmluZztcbiAgcmVhZG9ubHkgdGVtcGxhdGVOYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGxhbmd1YWdlOiBzdHJpbmc7XG59XG5cbi8qKlxuICogSW52b2tlIGhvb2tzIGZvciB0aGUgZ2l2ZW4gaW5pdCB0ZW1wbGF0ZVxuICpcbiAqIFNvbWV0aW1lcyB0ZW1wbGF0ZXMgbmVlZCBtb3JlIGNvbXBsZXggbG9naWMgdGhhbiBqdXN0IHJlcGxhY2luZyB0b2tlbnMuIEEgJ2hvb2snIGNhbiBiZVxuICogdXNlZCB0byBkbyBhZGRpdGlvbmFsIHByb2Nlc3Npbmcgb3RoZXIgdGhhbiBjb3B5aW5nIGZpbGVzLlxuICpcbiAqIEhvb2tzIHVzZWQgdG8gYmUgZGVmaW5lZCBleHRlcm5hbGx5IHRvIHRoZSBDTEksIGJ5IHJ1bm5pbmcgYXJiaXRyYXJpbHlcbiAqIHN1YnN0aXR1dGVkIHNoZWxsIHNjcmlwdHMgaW4gdGhlIHRhcmdldCBkaXJlY3RvcnkuXG4gKlxuICogSW4gcHJhY3RpY2UsIHRoZXkncmUgYWxsIFR5cGVTY3JpcHQgZmlsZXMgYW5kIGFsbCB0aGUgc2FtZSwgYW5kIHRoZSBkeW5hbWlzbVxuICogdGhhdCB0aGUgb3JpZ2luYWwgc29sdXRpb24gYWxsb3dlZCB3YXNuJ3QgdXNlZCBhdCBhbGwuIFdvcnNlLCBzaW5jZSB0aGUgQ0xJXG4gKiBpcyBub3cgYnVuZGxlZCB0aGUgaG9va3MgY2FuJ3QgZXZlbiByZXVzZSBjb2RlIGZyb20gdGhlIENMSSBsaWJyYXJpZXMgYXQgYWxsXG4gKiBhbnltb3JlLCBzbyBhbGwgc2hhcmVkIGNvZGUgd291bGQgaGF2ZSB0byBiZSBjb3B5L3Bhc3RlZC5cbiAqXG4gKiBCdW5kbGUgaG9va3MgYXMgYnVpbHQtaW5zIGludG8gdGhlIENMSSwgc28gdGhleSBnZXQgYnVuZGxlZCBhbmQgY2FuIHRha2UgYWR2YW50YWdlXG4gKiBvZiBhbGwgc2hhcmVkIGNvZGUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnZva2VCdWlsdGluSG9va3ModGFyZ2V0OiBIb29rVGFyZ2V0LCBjb250ZXh0OiBIb29rQ29udGV4dCkge1xuICBzd2l0Y2ggKHRhcmdldC5sYW5ndWFnZSkge1xuICAgIGNhc2UgJ2NzaGFycCc6XG4gICAgICBpZiAoWydhcHAnLCAnc2FtcGxlLWFwcCddLmluY2x1ZGVzKHRhcmdldC50ZW1wbGF0ZU5hbWUpKSB7XG4gICAgICAgIHJldHVybiBkb3RuZXRBZGRQcm9qZWN0KHRhcmdldC50YXJnZXREaXJlY3RvcnksIGNvbnRleHQpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdmc2hhcnAnOlxuICAgICAgaWYgKFsnYXBwJywgJ3NhbXBsZS1hcHAnXS5pbmNsdWRlcyh0YXJnZXQudGVtcGxhdGVOYW1lKSkge1xuICAgICAgICByZXR1cm4gZG90bmV0QWRkUHJvamVjdCh0YXJnZXQudGFyZ2V0RGlyZWN0b3J5LCBjb250ZXh0LCAnZnNwcm9qJyk7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3B5dGhvbic6XG4gICAgICAvLyBXZSBjYW4ndCBjYWxsIHRoaXMgZmlsZSAncmVxdWlyZW1lbnRzLnRlbXBsYXRlLnR4dCcgYmVjYXVzZSBEZXBlbmRhYm90IG5lZWRzIHRvIGJlIGFibGUgdG8gZmluZCBpdC5cbiAgICAgIC8vIFRoZXJlZm9yZSwga2VlcCB0aGUgaW4tcmVwbyBuYW1lIGJ1dCBzdGlsbCBzdWJzdGl0dXRlIHBsYWNlaG9sZGVycy5cbiAgICAgIGF3YWl0IGNvbnRleHQuc3Vic3RpdHV0ZVBsYWNlaG9sZGVyc0luKCdyZXF1aXJlbWVudHMudHh0Jyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2phdmEnOlxuICAgICAgLy8gV2UgY2FuJ3QgY2FsbCB0aGlzIGZpbGUgJ3BvbS50ZW1wbGF0ZS54bWwnLi4uIGZvciB0aGUgc2FtZSByZWFzb24gYXMgUHl0aG9uIGFib3ZlLlxuICAgICAgYXdhaXQgY29udGV4dC5zdWJzdGl0dXRlUGxhY2Vob2xkZXJzSW4oJ3BvbS54bWwnKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnamF2YXNjcmlwdCc6XG4gICAgY2FzZSAndHlwZXNjcmlwdCc6XG4gICAgICAvLyBTZWUgYWJvdmUsIGJ1dCBmb3IgJ3BhY2thZ2UuanNvbicuXG4gICAgICBhd2FpdCBjb250ZXh0LnN1YnN0aXR1dGVQbGFjZWhvbGRlcnNJbigncGFja2FnZS5qc29uJyk7XG5cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBkb3RuZXRBZGRQcm9qZWN0KHRhcmdldERpcmVjdG9yeTogc3RyaW5nLCBjb250ZXh0OiBIb29rQ29udGV4dCwgZXh0ID0gJ2NzcHJvaicpIHtcbiAgY29uc3QgcG5hbWUgPSBjb250ZXh0LnBsYWNlaG9sZGVyKCduYW1lLlBhc2NhbENhc2VkJyk7XG4gIGNvbnN0IHNsblBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyZWN0b3J5LCAnc3JjJywgYCR7cG5hbWV9LnNsbmApO1xuICBjb25zdCBjc3Byb2pQYXRoID0gcGF0aC5qb2luKHRhcmdldERpcmVjdG9yeSwgJ3NyYycsIHBuYW1lLCBgJHtwbmFtZX0uJHtleHR9YCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgc2hlbGwoWydkb3RuZXQnLCAnc2xuJywgc2xuUGF0aCwgJ2FkZCcsIGNzcHJvalBhdGhdKTtcbiAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihgQ291bGQgbm90IGFkZCBwcm9qZWN0ICR7cG5hbWV9LiR7ZXh0fSB0byBzb2x1dGlvbiAke3BuYW1lfS5zbG4uICR7ZS5tZXNzYWdlfWApO1xuICB9XG59O1xuIl19