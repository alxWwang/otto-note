"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitTemplate = void 0;
exports.cliInit = cliInit;
exports.availableInitTemplates = availableInitTemplates;
exports.availableInitLanguages = availableInitLanguages;
exports.printAvailableTemplates = printAvailableTemplates;
exports.currentlyRecommendedAwsCdkLibFlags = currentlyRecommendedAwsCdkLibFlags;
const childProcess = require("child_process");
const path = require("path");
const chalk = require("chalk");
const fs = require("fs-extra");
const init_hooks_1 = require("./init-hooks");
const logging_1 = require("./logging");
const error_1 = require("./toolkit/error");
const directories_1 = require("./util/directories");
const version_range_1 = require("./util/version-range");
/* eslint-disable @typescript-eslint/no-var-requires */ // Packages don't have @types module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const camelCase = require('camelcase');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const decamelize = require('decamelize');
/**
 * Initialize a CDK package in the current directory
 */
async function cliInit(options) {
    const canUseNetwork = options.canUseNetwork ?? true;
    const generateOnly = options.generateOnly ?? false;
    const workDir = options.workDir ?? process.cwd();
    if (!options.type && !options.language) {
        await printAvailableTemplates();
        return;
    }
    const type = options.type || 'default'; // "default" is the default type (and maps to "app")
    const template = (await availableInitTemplates()).find((t) => t.hasName(type));
    if (!template) {
        await printAvailableTemplates(options.language);
        throw new error_1.ToolkitError(`Unknown init template: ${type}`);
    }
    if (!options.language && template.languages.length === 1) {
        const language = template.languages[0];
        (0, logging_1.warning)(`No --language was provided, but '${type}' supports only '${language}', so defaulting to --language=${language}`);
    }
    if (!options.language) {
        (0, logging_1.print)(`Available languages for ${chalk.green(type)}: ${template.languages.map((l) => chalk.blue(l)).join(', ')}`);
        throw new error_1.ToolkitError('No language was selected');
    }
    await initializeProject(template, options.language, canUseNetwork, generateOnly, workDir, options.stackName, options.migrate);
}
/**
 * Returns the name of the Python executable for this OS
 */
function pythonExecutable() {
    let python = 'python3';
    if (process.platform === 'win32') {
        python = 'python';
    }
    return python;
}
const INFO_DOT_JSON = 'info.json';
class InitTemplate {
    static async fromName(templatesDir, name) {
        const basePath = path.join(templatesDir, name);
        const languages = await listDirectory(basePath);
        const info = await fs.readJson(path.join(basePath, INFO_DOT_JSON));
        return new InitTemplate(basePath, name, languages, info);
    }
    constructor(basePath, name, languages, info) {
        this.basePath = basePath;
        this.name = name;
        this.languages = languages;
        this.aliases = new Set();
        this.description = info.description;
        for (const alias of info.aliases || []) {
            this.aliases.add(alias);
        }
    }
    /**
     * @param name the name that is being checked
     * @returns ``true`` if ``name`` is the name of this template or an alias of it.
     */
    hasName(name) {
        return name === this.name || this.aliases.has(name);
    }
    /**
     * Creates a new instance of this ``InitTemplate`` for a given language to a specified folder.
     *
     * @param language    the language to instantiate this template with
     * @param targetDirectory the directory where the template is to be instantiated into
     */
    async install(language, targetDirectory, stackName) {
        if (this.languages.indexOf(language) === -1) {
            (0, logging_1.error)(`The ${chalk.blue(language)} language is not supported for ${chalk.green(this.name)} ` +
                `(it supports: ${this.languages.map((l) => chalk.blue(l)).join(', ')})`);
            throw new error_1.ToolkitError(`Unsupported language: ${language}`);
        }
        const projectInfo = {
            name: decamelize(path.basename(path.resolve(targetDirectory))),
            stackName,
            versions: await loadInitVersions(),
        };
        const sourceDirectory = path.join(this.basePath, language);
        await this.installFiles(sourceDirectory, targetDirectory, language, projectInfo);
        await this.applyFutureFlags(targetDirectory);
        await (0, init_hooks_1.invokeBuiltinHooks)({ targetDirectory, language, templateName: this.name }, {
            substitutePlaceholdersIn: async (...fileNames) => {
                for (const fileName of fileNames) {
                    const fullPath = path.join(targetDirectory, fileName);
                    const template = await fs.readFile(fullPath, { encoding: 'utf-8' });
                    await fs.writeFile(fullPath, this.expand(template, language, projectInfo));
                }
            },
            placeholder: (ph) => this.expand(`%${ph}%`, language, projectInfo),
        });
    }
    async installFiles(sourceDirectory, targetDirectory, language, project) {
        for (const file of await fs.readdir(sourceDirectory)) {
            const fromFile = path.join(sourceDirectory, file);
            const toFile = path.join(targetDirectory, this.expand(file, language, project));
            if ((await fs.stat(fromFile)).isDirectory()) {
                await fs.mkdir(toFile);
                await this.installFiles(fromFile, toFile, language, project);
                continue;
            }
            else if (file.match(/^.*\.template\.[^.]+$/)) {
                await this.installProcessed(fromFile, toFile.replace(/\.template(\.[^.]+)$/, '$1'), language, project);
                continue;
            }
            else if (file.match(/^.*\.hook\.(d.)?[^.]+$/)) {
                // Ignore
                continue;
            }
            else {
                await fs.copy(fromFile, toFile);
            }
        }
    }
    async installProcessed(templatePath, toFile, language, project) {
        const template = await fs.readFile(templatePath, { encoding: 'utf-8' });
        await fs.writeFile(toFile, this.expand(template, language, project));
    }
    expand(template, language, project) {
        const cdkVersion = project.versions['aws-cdk-lib'];
        let constructsVersion = project.versions.constructs;
        switch (language) {
            case 'java':
            case 'csharp':
            case 'fsharp':
                constructsVersion = (0, version_range_1.rangeFromSemver)(constructsVersion, 'bracket');
                break;
            case 'python':
                constructsVersion = (0, version_range_1.rangeFromSemver)(constructsVersion, 'pep');
                break;
        }
        return template
            .replace(/%name%/g, project.name)
            .replace(/%stackname%/, project.stackName ?? '%name.PascalCased%Stack')
            .replace(/%PascalNameSpace%/, project.stackName ? camelCase(project.stackName + 'Stack', { pascalCase: true }) : '%name.PascalCased%')
            .replace(/%PascalStackProps%/, project.stackName ? camelCase(project.stackName, { pascalCase: true }) + 'StackProps' : 'StackProps')
            .replace(/%name\.camelCased%/g, camelCase(project.name))
            .replace(/%name\.PascalCased%/g, camelCase(project.name, { pascalCase: true }))
            .replace(/%cdk-version%/g, cdkVersion)
            .replace(/%constructs-version%/g, constructsVersion)
            .replace(/%cdk-home%/g, (0, directories_1.cdkHomeDir)())
            .replace(/%name\.PythonModule%/g, project.name.replace(/-/g, '_'))
            .replace(/%python-executable%/g, pythonExecutable())
            .replace(/%name\.StackName%/g, project.name.replace(/[^A-Za-z0-9-]/g, '-'));
    }
    /**
     * Adds context variables to `cdk.json` in the generated project directory to
     * enable future behavior for new projects.
     */
    async applyFutureFlags(projectDir) {
        const cdkJson = path.join(projectDir, 'cdk.json');
        if (!(await fs.pathExists(cdkJson))) {
            return;
        }
        const config = await fs.readJson(cdkJson);
        config.context = {
            ...config.context,
            ...await currentlyRecommendedAwsCdkLibFlags(),
        };
        await fs.writeJson(cdkJson, config, { spaces: 2 });
    }
    async addMigrateContext(projectDir) {
        const cdkJson = path.join(projectDir, 'cdk.json');
        if (!(await fs.pathExists(cdkJson))) {
            return;
        }
        const config = await fs.readJson(cdkJson);
        config.context = {
            ...config.context,
            'cdk-migrate': true,
        };
        await fs.writeJson(cdkJson, config, { spaces: 2 });
    }
}
exports.InitTemplate = InitTemplate;
async function availableInitTemplates() {
    return new Promise(async (resolve) => {
        try {
            const templatesDir = path.join((0, directories_1.rootDir)(), 'lib', 'init-templates');
            const templateNames = await listDirectory(templatesDir);
            const templates = new Array();
            for (const templateName of templateNames) {
                templates.push(await InitTemplate.fromName(templatesDir, templateName));
            }
            resolve(templates);
        }
        catch {
            resolve([]);
        }
    });
}
async function availableInitLanguages() {
    return new Promise(async (resolve) => {
        const templates = await availableInitTemplates();
        const result = new Set();
        for (const template of templates) {
            for (const language of template.languages) {
                result.add(language);
            }
        }
        resolve([...result]);
    });
}
/**
 * @param dirPath is the directory to be listed.
 * @returns the list of file or directory names contained in ``dirPath``, excluding any dot-file, and sorted.
 */
async function listDirectory(dirPath) {
    return ((await fs.readdir(dirPath))
        .filter((p) => !p.startsWith('.'))
        .filter((p) => !(p === 'LICENSE'))
        // if, for some reason, the temp folder for the hook doesn't get deleted we don't want to display it in this list
        .filter((p) => !(p === INFO_DOT_JSON))
        .sort());
}
async function printAvailableTemplates(language) {
    (0, logging_1.print)('Available templates:');
    for (const template of await availableInitTemplates()) {
        if (language && template.languages.indexOf(language) === -1) {
            continue;
        }
        (0, logging_1.print)(`* ${chalk.green(template.name)}: ${template.description}`);
        const languageArg = language
            ? chalk.bold(language)
            : template.languages.length > 1
                ? `[${template.languages.map((t) => chalk.bold(t)).join('|')}]`
                : chalk.bold(template.languages[0]);
        (0, logging_1.print)(`   └─ ${chalk.blue(`cdk init ${chalk.bold(template.name)} --language=${languageArg}`)}`);
    }
}
async function initializeProject(template, language, canUseNetwork, generateOnly, workDir, stackName, migrate) {
    await assertIsEmptyDirectory(workDir);
    (0, logging_1.print)(`Applying project template ${chalk.green(template.name)} for ${chalk.blue(language)}`);
    await template.install(language, workDir, stackName);
    if (migrate) {
        await template.addMigrateContext(workDir);
    }
    if (await fs.pathExists(`${workDir}/README.md`)) {
        const readme = await fs.readFile(`${workDir}/README.md`, { encoding: 'utf-8' });
        (0, logging_1.print)(chalk.green(readme));
    }
    if (!generateOnly) {
        await initializeGitRepository(workDir);
        await postInstall(language, canUseNetwork, workDir);
    }
    (0, logging_1.print)('✅ All done!');
}
async function assertIsEmptyDirectory(workDir) {
    const files = await fs.readdir(workDir);
    if (files.filter((f) => !f.startsWith('.')).length !== 0) {
        throw new error_1.ToolkitError('`cdk init` cannot be run in a non-empty directory!');
    }
}
async function initializeGitRepository(workDir) {
    if (await isInGitRepository(workDir)) {
        return;
    }
    (0, logging_1.print)('Initializing a new git repository...');
    try {
        await execute('git', ['init'], { cwd: workDir });
        await execute('git', ['add', '.'], { cwd: workDir });
        await execute('git', ['commit', '--message="Initial commit"', '--no-gpg-sign'], { cwd: workDir });
    }
    catch {
        (0, logging_1.warning)('Unable to initialize git repository for your project.');
    }
}
async function postInstall(language, canUseNetwork, workDir) {
    switch (language) {
        case 'javascript':
            return postInstallJavascript(canUseNetwork, workDir);
        case 'typescript':
            return postInstallTypescript(canUseNetwork, workDir);
        case 'java':
            return postInstallJava(canUseNetwork, workDir);
        case 'python':
            return postInstallPython(workDir);
    }
}
async function postInstallJavascript(canUseNetwork, cwd) {
    return postInstallTypescript(canUseNetwork, cwd);
}
async function postInstallTypescript(canUseNetwork, cwd) {
    const command = 'npm';
    if (!canUseNetwork) {
        (0, logging_1.warning)(`Please run '${command} install'!`);
        return;
    }
    (0, logging_1.print)(`Executing ${chalk.green(`${command} install`)}...`);
    try {
        await execute(command, ['install'], { cwd });
    }
    catch (e) {
        (0, logging_1.warning)(`${command} install failed: ` + e.message);
    }
}
async function postInstallJava(canUseNetwork, cwd) {
    const mvnPackageWarning = "Please run 'mvn package'!";
    if (!canUseNetwork) {
        (0, logging_1.warning)(mvnPackageWarning);
        return;
    }
    (0, logging_1.print)("Executing 'mvn package'");
    try {
        await execute('mvn', ['package'], { cwd });
    }
    catch {
        (0, logging_1.warning)('Unable to package compiled code as JAR');
        (0, logging_1.warning)(mvnPackageWarning);
    }
}
async function postInstallPython(cwd) {
    const python = pythonExecutable();
    (0, logging_1.warning)(`Please run '${python} -m venv .venv'!`);
    (0, logging_1.print)(`Executing ${chalk.green('Creating virtualenv...')}`);
    try {
        await execute(python, ['-m venv', '.venv'], { cwd });
    }
    catch {
        (0, logging_1.warning)('Unable to create virtualenv automatically');
        (0, logging_1.warning)(`Please run '${python} -m venv .venv'!`);
    }
}
/**
 * @param dir a directory to be checked
 * @returns true if ``dir`` is within a git repository.
 */
async function isInGitRepository(dir) {
    while (true) {
        if (await fs.pathExists(path.join(dir, '.git'))) {
            return true;
        }
        if (isRoot(dir)) {
            return false;
        }
        dir = path.dirname(dir);
    }
}
/**
 * @param dir a directory to be checked.
 * @returns true if ``dir`` is the root of a filesystem.
 */
function isRoot(dir) {
    return path.dirname(dir) === dir;
}
/**
 * Executes `command`. STDERR is emitted in real-time.
 *
 * If command exits with non-zero exit code, an exceprion is thrown and includes
 * the contents of STDOUT.
 *
 * @returns STDOUT (if successful).
 */
async function execute(cmd, args, { cwd }) {
    const child = childProcess.spawn(cmd, args, {
        cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'inherit'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    return new Promise((ok, fail) => {
        child.once('error', (err) => fail(err));
        child.once('exit', (status) => {
            if (status === 0) {
                return ok(stdout);
            }
            else {
                process.stderr.write(stdout);
                return fail(new error_1.ToolkitError(`${cmd} exited with status ${status}`));
            }
        });
    });
}
/**
 * Return the 'aws-cdk-lib' version we will init
 *
 * This has been built into the CLI at build time.
 */
async function loadInitVersions() {
    const recommendedFlagsFile = path.join(__dirname, './init-templates/.init-version.json');
    const contents = JSON.parse(await fs.readFile(recommendedFlagsFile, { encoding: 'utf-8' }));
    const ret = {
        'aws-cdk-lib': contents['aws-cdk-lib'],
        'constructs': contents.constructs,
    };
    for (const [key, value] of Object.entries(ret)) {
        /* istanbul ignore next */
        if (!value) {
            throw new Error(`Missing init version from ${recommendedFlagsFile}: ${key}`);
        }
    }
    return ret;
}
/**
 * Return the currently recommended flags for `aws-cdk-lib`.
 *
 * These have been built into the CLI at build time.
 */
async function currentlyRecommendedAwsCdkLibFlags() {
    const recommendedFlagsFile = path.join(__dirname, './init-templates/.recommended-feature-flags.json');
    return JSON.parse(await fs.readFile(recommendedFlagsFile, { encoding: 'utf-8' }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBNkJBLDBCQW9DQztBQTRMRCx3REFjQztBQUNELHdEQVdDO0FBaUJELDBEQWNDO0FBc01ELGdGQUdDO0FBL2ZELDhDQUE4QztBQUM5Qyw2QkFBNkI7QUFDN0IsK0JBQStCO0FBQy9CLCtCQUErQjtBQUMvQiw2Q0FBa0Q7QUFDbEQsdUNBQWtEO0FBQ2xELDJDQUErQztBQUMvQyxvREFBeUQ7QUFDekQsd0RBQXVEO0FBRXZELHVEQUF1RCxDQUFDLG9DQUFvQztBQUM1RixpRUFBaUU7QUFDakUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3ZDLGlFQUFpRTtBQUNqRSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFZekM7O0dBRUc7QUFDSSxLQUFLLFVBQVUsT0FBTyxDQUFDLE9BQXVCO0lBQ25ELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDO0lBQ3BELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDO0lBQ25ELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2pELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sdUJBQXVCLEVBQUUsQ0FBQztRQUNoQyxPQUFPO0lBQ1QsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLENBQUMsb0RBQW9EO0lBRTVGLE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMs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QUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQU9EOzs7O0dBSUc7QUFDSCxLQUFLLFVBQVUsZ0JBQWdCO0lBQzdCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUscUNBQXFDLENBQUMsQ0FBQztJQUN6RixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFNUYsTUFBTSxHQUFHLEdBQUc7UUFDVixhQUFhLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQztRQUN0QyxZQUFZLEVBQUUsUUFBUSxDQUFDLFVBQVU7S0FDbEMsQ0FBQztJQUNGLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDL0MsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLG9CQUFvQixLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDL0UsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRDs7OztHQUlHO0FBQ0ksS0FBSyxVQUFVLGtDQUFrQztJQUN0RCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGtEQUFrRCxDQUFDLENBQUM7SUFDdEcsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDcEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNoaWxkUHJvY2VzcyBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBpbnZva2VCdWlsdGluSG9va3MgfSBmcm9tICcuL2luaXQtaG9va3MnO1xuaW1wb3J0IHsgZXJyb3IsIHByaW50LCB3YXJuaW5nIH0gZnJvbSAnLi9sb2dnaW5nJztcbmltcG9ydCB7IFRvb2xraXRFcnJvciB9IGZyb20gJy4vdG9vbGtpdC9lcnJvcic7XG5pbXBvcnQgeyBjZGtIb21lRGlyLCByb290RGlyIH0gZnJvbSAnLi91dGlsL2RpcmVjdG9yaWVzJztcbmltcG9ydCB7IHJhbmdlRnJvbVNlbXZlciB9IGZyb20gJy4vdXRpbC92ZXJzaW9uLXJhbmdlJztcblxuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXZhci1yZXF1aXJlcyAqLyAvLyBQYWNrYWdlcyBkb24ndCBoYXZlIEB0eXBlcyBtb2R1bGVcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzXG5jb25zdCBjYW1lbENhc2UgPSByZXF1aXJlKCdjYW1lbGNhc2UnKTtcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzXG5jb25zdCBkZWNhbWVsaXplID0gcmVxdWlyZSgnZGVjYW1lbGl6ZScpO1xuXG5leHBvcnQgaW50ZXJmYWNlIENsaUluaXRPcHRpb25zIHtcbiAgcmVhZG9ubHkgdHlwZT86IHN0cmluZztcbiAgcmVhZG9ubHkgbGFuZ3VhZ2U/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IGNhblVzZU5ldHdvcms/OiBib29sZWFuO1xuICByZWFkb25seSBnZW5lcmF0ZU9ubHk/OiBib29sZWFuO1xuICByZWFkb25seSB3b3JrRGlyPzogc3RyaW5nO1xuICByZWFkb25seSBzdGFja05hbWU/OiBzdHJpbmc7XG4gIHJlYWRvbmx5IG1pZ3JhdGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEluaXRpYWxpemUgYSBDREsgcGFja2FnZSBpbiB0aGUgY3VycmVudCBkaXJlY3RvcnlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsaUluaXQob3B0aW9uczogQ2xpSW5pdE9wdGlvbnMpIHtcbiAgY29uc3QgY2FuVXNlTmV0d29yayA9IG9wdGlvbnMuY2FuVXNlTmV0d29yayA/PyB0cnVlO1xuICBjb25zdCBnZW5lcmF0ZU9ubHkgPSBvcHRpb25zLmdlbmVyYXRlT25seSA/PyBmYWxzZTtcbiAgY29uc3Qgd29ya0RpciA9IG9wdGlvbnMud29ya0RpciA/PyBwcm9jZXNzLmN3ZCgpO1xuICBpZiAoIW9wdGlvbnMudHlwZSAmJiAhb3B0aW9ucy5sYW5ndWFnZSkge1xuICAgIGF3YWl0IHByaW50QXZhaWxhYmxlVGVtcGxhdGVzKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgdHlwZSA9IG9wdGlvbnMudHlwZSB8fCAnZGVmYXVsdCc7IC8vIFwiZGVmYXVsdFwiIGlzIHRoZSBkZWZhdWx0IHR5cGUgKGFuZCBtYXBzIHRvIFwiYXBwXCIpXG5cbiAgY29uc3QgdGVtcGxhdGUgPSAoYXdhaXQgYXZhaWxhYmxlSW5pdFRlbXBsYXRlcygpKS5maW5kKCh0KSA9PiB0Lmhhc05hbWUodHlwZSEpKTtcbiAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgIGF3YWl0IHByaW50QXZhaWxhYmxlVGVtcGxhdGVzKG9wdGlvbnMubGFuZ3VhZ2UpO1xuICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoYFVua25vd24gaW5pdCB0ZW1wbGF0ZTogJHt0eXBlfWApO1xuICB9XG4gIGlmICghb3B0aW9ucy5sYW5ndWFnZSAmJiB0ZW1wbGF0ZS5sYW5ndWFnZXMubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgbGFuZ3VhZ2UgPSB0ZW1wbGF0ZS5sYW5ndWFnZXNbMF07XG4gICAgd2FybmluZyhcbiAgICAgIGBObyAtLWxhbmd1YWdlIHdhcyBwcm92aWRlZCwgYnV0ICcke3R5cGV9JyBzdXBwb3J0cyBvbmx5ICcke2xhbmd1YWdlfScsIHNvIGRlZmF1bHRpbmcgdG8gLS1sYW5ndWFnZT0ke2xhbmd1YWdlfWAsXG4gICAgKTtcbiAgfVxuICBpZiAoIW9wdGlvbnMubGFuZ3VhZ2UpIHtcbiAgICBwcmludChgQXZhaWxhYmxlIGxhbmd1YWdlcyBmb3IgJHtjaGFsay5ncmVlbih0eXBlKX06ICR7dGVtcGxhdGUubGFuZ3VhZ2VzLm1hcCgobCkgPT4gY2hhbGsuYmx1ZShsKSkuam9pbignLCAnKX1gKTtcbiAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdObyBsYW5ndWFnZSB3YXMgc2VsZWN0ZWQnKTtcbiAgfVxuXG4gIGF3YWl0IGluaXRpYWxpemVQcm9qZWN0KFxuICAgIHRlbXBsYXRlLFxuICAgIG9wdGlvbnMubGFuZ3VhZ2UsXG4gICAgY2FuVXNlTmV0d29yayxcbiAgICBnZW5lcmF0ZU9ubHksXG4gICAgd29ya0RpcixcbiAgICBvcHRpb25zLnN0YWNrTmFtZSxcbiAgICBvcHRpb25zLm1pZ3JhdGUsXG4gICk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgUHl0aG9uIGV4ZWN1dGFibGUgZm9yIHRoaXMgT1NcbiAqL1xuZnVuY3Rpb24gcHl0aG9uRXhlY3V0YWJsZSgpIHtcbiAgbGV0IHB5dGhvbiA9ICdweXRob24zJztcbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICBweXRob24gPSAncHl0aG9uJztcbiAgfVxuICByZXR1cm4gcHl0aG9uO1xufVxuY29uc3QgSU5GT19ET1RfSlNPTiA9ICdpbmZvLmpzb24nO1xuXG5leHBvcnQgY2xhc3MgSW5pdFRlbXBsYXRlIHtcbiAgcHVibGljIHN0YXRpYyBhc3luYyBmcm9tTmFtZSh0ZW1wbGF0ZXNEaXI6IHN0cmluZywgbmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgYmFzZVBhdGggPSBwYXRoLmpvaW4odGVtcGxhdGVzRGlyLCBuYW1lKTtcbiAgICBjb25zdCBsYW5ndWFnZXMgPSBhd2FpdCBsaXN0RGlyZWN0b3J5KGJhc2VQYXRoKTtcbiAgICBjb25zdCBpbmZvID0gYXdhaXQgZnMucmVhZEpzb24ocGF0aC5qb2luKGJhc2VQYXRoLCBJTkZPX0RPVF9KU09OKSk7XG4gICAgcmV0dXJuIG5ldyBJbml0VGVtcGxhdGUoYmFzZVBhdGgsIG5hbWUsIGxhbmd1YWdlcywgaW5mbyk7XG4gIH1cblxuICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb246IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IGFsaWFzZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGJhc2VQYXRoOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgbGFuZ3VhZ2VzOiBzdHJpbmdbXSxcbiAgICBpbmZvOiBhbnksXG4gICkge1xuICAgIHRoaXMuZGVzY3JpcHRpb24gPSBpbmZvLmRlc2NyaXB0aW9uO1xuICAgIGZvciAoY29uc3QgYWxpYXMgb2YgaW5mby5hbGlhc2VzIHx8IFtdKSB7XG4gICAgICB0aGlzLmFsaWFzZXMuYWRkKGFsaWFzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIG5hbWUgdGhlIG5hbWUgdGhhdCBpcyBiZWluZyBjaGVja2VkXG4gICAqIEByZXR1cm5zIGBgdHJ1ZWBgIGlmIGBgbmFtZWBgIGlzIHRoZSBuYW1lIG9mIHRoaXMgdGVtcGxhdGUgb3IgYW4gYWxpYXMgb2YgaXQuXG4gICAqL1xuICBwdWJsaWMgaGFzTmFtZShuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gbmFtZSA9PT0gdGhpcy5uYW1lIHx8IHRoaXMuYWxpYXNlcy5oYXMobmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiB0aGlzIGBgSW5pdFRlbXBsYXRlYGAgZm9yIGEgZ2l2ZW4gbGFuZ3VhZ2UgdG8gYSBzcGVjaWZpZWQgZm9sZGVyLlxuICAgKlxuICAgKiBAcGFyYW0gbGFuZ3VhZ2UgICAgdGhlIGxhbmd1YWdlIHRvIGluc3RhbnRpYXRlIHRoaXMgdGVtcGxhdGUgd2l0aFxuICAgKiBAcGFyYW0gdGFyZ2V0RGlyZWN0b3J5IHRoZSBkaXJlY3Rvcnkgd2hlcmUgdGhlIHRlbXBsYXRlIGlzIHRvIGJlIGluc3RhbnRpYXRlZCBpbnRvXG4gICAqL1xuICBwdWJsaWMgYXN5bmMgaW5zdGFsbChsYW5ndWFnZTogc3RyaW5nLCB0YXJnZXREaXJlY3Rvcnk6IHN0cmluZywgc3RhY2tOYW1lPzogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMubGFuZ3VhZ2VzLmluZGV4T2YobGFuZ3VhZ2UpID09PSAtMSkge1xuICAgICAgZXJyb3IoXG4gICAgICAgIGBUaGUgJHtjaGFsay5ibHVlKGxhbmd1YWdlKX0gbGFuZ3VhZ2UgaXMgbm90IHN1cHBvcnRlZCBmb3IgJHtjaGFsay5ncmVlbih0aGlzLm5hbWUpfSBgICtcbiAgICAgICAgICBgKGl0IHN1cHBvcnRzOiAke3RoaXMubGFuZ3VhZ2VzLm1hcCgobCkgPT4gY2hhbGsuYmx1ZShsKSkuam9pbignLCAnKX0pYCxcbiAgICAgICk7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKGBVbnN1cHBvcnRlZCBsYW5ndWFnZTogJHtsYW5ndWFnZX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0SW5mbzogUHJvamVjdEluZm8gPSB7XG4gICAgICBuYW1lOiBkZWNhbWVsaXplKHBhdGguYmFzZW5hbWUocGF0aC5yZXNvbHZlKHRhcmdldERpcmVjdG9yeSkpKSxcbiAgICAgIHN0YWNrTmFtZSxcbiAgICAgIHZlcnNpb25zOiBhd2FpdCBsb2FkSW5pdFZlcnNpb25zKCksXG4gICAgfTtcblxuICAgIGNvbnN0IHNvdXJjZURpcmVjdG9yeSA9IHBhdGguam9pbih0aGlzLmJhc2VQYXRoLCBsYW5ndWFnZSk7XG5cbiAgICBhd2FpdCB0aGlzLmluc3RhbGxGaWxlcyhzb3VyY2VEaXJlY3RvcnksIHRhcmdldERpcmVjdG9yeSwgbGFuZ3VhZ2UsIHByb2plY3RJbmZvKTtcbiAgICBhd2FpdCB0aGlzLmFwcGx5RnV0dXJlRmxhZ3ModGFyZ2V0RGlyZWN0b3J5KTtcbiAgICBhd2FpdCBpbnZva2VCdWlsdGluSG9va3MoXG4gICAgICB7IHRhcmdldERpcmVjdG9yeSwgbGFuZ3VhZ2UsIHRlbXBsYXRlTmFtZTogdGhpcy5uYW1lIH0sXG4gICAgICB7XG4gICAgICAgIHN1YnN0aXR1dGVQbGFjZWhvbGRlcnNJbjogYXN5bmMgKC4uLmZpbGVOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIGZpbGVOYW1lcykge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyZWN0b3J5LCBmaWxlTmFtZSk7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGF3YWl0IGZzLnJlYWRGaWxlKGZ1bGxQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pO1xuICAgICAgICAgICAgYXdhaXQgZnMud3JpdGVGaWxlKGZ1bGxQYXRoLCB0aGlzLmV4cGFuZCh0ZW1wbGF0ZSwgbGFuZ3VhZ2UsIHByb2plY3RJbmZvKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwbGFjZWhvbGRlcjogKHBoOiBzdHJpbmcpID0+IHRoaXMuZXhwYW5kKGAlJHtwaH0lYCwgbGFuZ3VhZ2UsIHByb2plY3RJbmZvKSxcbiAgICAgIH0sXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW5zdGFsbEZpbGVzKHNvdXJjZURpcmVjdG9yeTogc3RyaW5nLCB0YXJnZXREaXJlY3Rvcnk6IHN0cmluZywgbGFuZ3VhZ2U6IHN0cmluZywgcHJvamVjdDogUHJvamVjdEluZm8pIHtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYXdhaXQgZnMucmVhZGRpcihzb3VyY2VEaXJlY3RvcnkpKSB7XG4gICAgICBjb25zdCBmcm9tRmlsZSA9IHBhdGguam9pbihzb3VyY2VEaXJlY3RvcnksIGZpbGUpO1xuICAgICAgY29uc3QgdG9GaWxlID0gcGF0aC5qb2luKHRhcmdldERpcmVjdG9yeSwgdGhpcy5leHBhbmQoZmlsZSwgbGFuZ3VhZ2UsIHByb2plY3QpKTtcbiAgICAgIGlmICgoYXdhaXQgZnMuc3RhdChmcm9tRmlsZSkpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIodG9GaWxlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5pbnN0YWxsRmlsZXMoZnJvbUZpbGUsIHRvRmlsZSwgbGFuZ3VhZ2UsIHByb2plY3QpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoZmlsZS5tYXRjaCgvXi4qXFwudGVtcGxhdGVcXC5bXi5dKyQvKSkge1xuICAgICAgICBhd2FpdCB0aGlzLmluc3RhbGxQcm9jZXNzZWQoZnJvbUZpbGUsIHRvRmlsZS5yZXBsYWNlKC9cXC50ZW1wbGF0ZShcXC5bXi5dKykkLywgJyQxJyksIGxhbmd1YWdlLCBwcm9qZWN0KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKGZpbGUubWF0Y2goL14uKlxcLmhvb2tcXC4oZC4pP1teLl0rJC8pKSB7XG4gICAgICAgIC8vIElnbm9yZVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLmNvcHkoZnJvbUZpbGUsIHRvRmlsZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBpbnN0YWxsUHJvY2Vzc2VkKHRlbXBsYXRlUGF0aDogc3RyaW5nLCB0b0ZpbGU6IHN0cmluZywgbGFuZ3VhZ2U6IHN0cmluZywgcHJvamVjdDogUHJvamVjdEluZm8pIHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGF3YWl0IGZzLnJlYWRGaWxlKHRlbXBsYXRlUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KTtcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUodG9GaWxlLCB0aGlzLmV4cGFuZCh0ZW1wbGF0ZSwgbGFuZ3VhZ2UsIHByb2plY3QpKTtcbiAgfVxuXG4gIHByaXZhdGUgZXhwYW5kKHRlbXBsYXRlOiBzdHJpbmcsIGxhbmd1YWdlOiBzdHJpbmcsIHByb2plY3Q6IFByb2plY3RJbmZvKSB7XG4gICAgY29uc3QgY2RrVmVyc2lvbiA9IHByb2plY3QudmVyc2lvbnNbJ2F3cy1jZGstbGliJ107XG4gICAgbGV0IGNvbnN0cnVjdHNWZXJzaW9uID0gcHJvamVjdC52ZXJzaW9ucy5jb25zdHJ1Y3RzO1xuXG4gICAgc3dpdGNoIChsYW5ndWFnZSkge1xuICAgICAgY2FzZSAnamF2YSc6XG4gICAgICBjYXNlICdjc2hhcnAnOlxuICAgICAgY2FzZSAnZnNoYXJwJzpcbiAgICAgICAgY29uc3RydWN0c1ZlcnNpb24gPSByYW5nZUZyb21TZW12ZXIoY29uc3RydWN0c1ZlcnNpb24sICdicmFja2V0Jyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAncHl0aG9uJzpcbiAgICAgICAgY29uc3RydWN0c1ZlcnNpb24gPSByYW5nZUZyb21TZW12ZXIoY29uc3RydWN0c1ZlcnNpb24sICdwZXAnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZVxuICAgICAgLnJlcGxhY2UoLyVuYW1lJS9nLCBwcm9qZWN0Lm5hbWUpXG4gICAgICAucmVwbGFjZSgvJXN0YWNrbmFtZSUvLCBwcm9qZWN0LnN0YWNrTmFtZSA/PyAnJW5hbWUuUGFzY2FsQ2FzZWQlU3RhY2snKVxuICAgICAgLnJlcGxhY2UoXG4gICAgICAgIC8lUGFzY2FsTmFtZVNwYWNlJS8sXG4gICAgICAgIHByb2plY3Quc3RhY2tOYW1lID8gY2FtZWxDYXNlKHByb2plY3Quc3RhY2tOYW1lICsgJ1N0YWNrJywgeyBwYXNjYWxDYXNlOiB0cnVlIH0pIDogJyVuYW1lLlBhc2NhbENhc2VkJScsXG4gICAgICApXG4gICAgICAucmVwbGFjZShcbiAgICAgICAgLyVQYXNjYWxTdGFja1Byb3BzJS8sXG4gICAgICAgIHByb2plY3Quc3RhY2tOYW1lID8gY2FtZWxDYXNlKHByb2plY3Quc3RhY2tOYW1lLCB7IHBhc2NhbENhc2U6IHRydWUgfSkgKyAnU3RhY2tQcm9wcycgOiAnU3RhY2tQcm9wcycsXG4gICAgICApXG4gICAgICAucmVwbGFjZSgvJW5hbWVcXC5jYW1lbENhc2VkJS9nLCBjYW1lbENhc2UocHJvamVjdC5uYW1lKSlcbiAgICAgIC5yZXBsYWNlKC8lbmFtZVxcLlBhc2NhbENhc2VkJS9nLCBjYW1lbENhc2UocHJvamVjdC5uYW1lLCB7IHBhc2NhbENhc2U6IHRydWUgfSkpXG4gICAgICAucmVwbGFjZSgvJWNkay12ZXJzaW9uJS9nLCBjZGtWZXJzaW9uKVxuICAgICAgLnJlcGxhY2UoLyVjb25zdHJ1Y3RzLXZlcnNpb24lL2csIGNvbnN0cnVjdHNWZXJzaW9uKVxuICAgICAgLnJlcGxhY2UoLyVjZGstaG9tZSUvZywgY2RrSG9tZURpcigpKVxuICAgICAgLnJlcGxhY2UoLyVuYW1lXFwuUHl0aG9uTW9kdWxlJS9nLCBwcm9qZWN0Lm5hbWUucmVwbGFjZSgvLS9nLCAnXycpKVxuICAgICAgLnJlcGxhY2UoLyVweXRob24tZXhlY3V0YWJsZSUvZywgcHl0aG9uRXhlY3V0YWJsZSgpKVxuICAgICAgLnJlcGxhY2UoLyVuYW1lXFwuU3RhY2tOYW1lJS9nLCBwcm9qZWN0Lm5hbWUucmVwbGFjZSgvW15BLVphLXowLTktXS9nLCAnLScpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGNvbnRleHQgdmFyaWFibGVzIHRvIGBjZGsuanNvbmAgaW4gdGhlIGdlbmVyYXRlZCBwcm9qZWN0IGRpcmVjdG9yeSB0b1xuICAgKiBlbmFibGUgZnV0dXJlIGJlaGF2aW9yIGZvciBuZXcgcHJvamVjdHMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGFwcGx5RnV0dXJlRmxhZ3MocHJvamVjdERpcjogc3RyaW5nKSB7XG4gICAgY29uc3QgY2RrSnNvbiA9IHBhdGguam9pbihwcm9qZWN0RGlyLCAnY2RrLmpzb24nKTtcbiAgICBpZiAoIShhd2FpdCBmcy5wYXRoRXhpc3RzKGNka0pzb24pKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IGZzLnJlYWRKc29uKGNka0pzb24pO1xuICAgIGNvbmZpZy5jb250ZXh0ID0ge1xuICAgICAgLi4uY29uZmlnLmNvbnRleHQsXG4gICAgICAuLi5hd2FpdCBjdXJyZW50bHlSZWNvbW1lbmRlZEF3c0Nka0xpYkZsYWdzKCksXG4gICAgfTtcblxuICAgIGF3YWl0IGZzLndyaXRlSnNvbihjZGtKc29uLCBjb25maWcsIHsgc3BhY2VzOiAyIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIGFkZE1pZ3JhdGVDb250ZXh0KHByb2plY3REaXI6IHN0cmluZykge1xuICAgIGNvbnN0IGNka0pzb24gPSBwYXRoLmpvaW4ocHJvamVjdERpciwgJ2Nkay5qc29uJyk7XG4gICAgaWYgKCEoYXdhaXQgZnMucGF0aEV4aXN0cyhjZGtKc29uKSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCBmcy5yZWFkSnNvbihjZGtKc29uKTtcbiAgICBjb25maWcuY29udGV4dCA9IHtcbiAgICAgIC4uLmNvbmZpZy5jb250ZXh0LFxuICAgICAgJ2Nkay1taWdyYXRlJzogdHJ1ZSxcbiAgICB9O1xuXG4gICAgYXdhaXQgZnMud3JpdGVKc29uKGNka0pzb24sIGNvbmZpZywgeyBzcGFjZXM6IDIgfSk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIFByb2plY3RJbmZvIHtcbiAgLyoqIFRoZSB2YWx1ZSB1c2VkIGZvciAlbmFtZSUgKi9cbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBzdGFja05hbWU/OiBzdHJpbmc7XG5cbiAgcmVhZG9ubHkgdmVyc2lvbnM6IFZlcnNpb25zO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXZhaWxhYmxlSW5pdFRlbXBsYXRlcygpOiBQcm9taXNlPEluaXRUZW1wbGF0ZVtdPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZXNEaXIgPSBwYXRoLmpvaW4ocm9vdERpcigpLCAnbGliJywgJ2luaXQtdGVtcGxhdGVzJyk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZU5hbWVzID0gYXdhaXQgbGlzdERpcmVjdG9yeSh0ZW1wbGF0ZXNEaXIpO1xuICAgICAgY29uc3QgdGVtcGxhdGVzID0gbmV3IEFycmF5PEluaXRUZW1wbGF0ZT4oKTtcbiAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVOYW1lIG9mIHRlbXBsYXRlTmFtZXMpIHtcbiAgICAgICAgdGVtcGxhdGVzLnB1c2goYXdhaXQgSW5pdFRlbXBsYXRlLmZyb21OYW1lKHRlbXBsYXRlc0RpciwgdGVtcGxhdGVOYW1lKSk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHRlbXBsYXRlcyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXNvbHZlKFtdKTtcbiAgICB9XG4gIH0pO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGF2YWlsYWJsZUluaXRMYW5ndWFnZXMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCB0ZW1wbGF0ZXMgPSBhd2FpdCBhdmFpbGFibGVJbml0VGVtcGxhdGVzKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB0ZW1wbGF0ZSBvZiB0ZW1wbGF0ZXMpIHtcbiAgICAgIGZvciAoY29uc3QgbGFuZ3VhZ2Ugb2YgdGVtcGxhdGUubGFuZ3VhZ2VzKSB7XG4gICAgICAgIHJlc3VsdC5hZGQobGFuZ3VhZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXNvbHZlKFsuLi5yZXN1bHRdKTtcbiAgfSk7XG59XG5cbi8qKlxuICogQHBhcmFtIGRpclBhdGggaXMgdGhlIGRpcmVjdG9yeSB0byBiZSBsaXN0ZWQuXG4gKiBAcmV0dXJucyB0aGUgbGlzdCBvZiBmaWxlIG9yIGRpcmVjdG9yeSBuYW1lcyBjb250YWluZWQgaW4gYGBkaXJQYXRoYGAsIGV4Y2x1ZGluZyBhbnkgZG90LWZpbGUsIGFuZCBzb3J0ZWQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGxpc3REaXJlY3RvcnkoZGlyUGF0aDogc3RyaW5nKSB7XG4gIHJldHVybiAoXG4gICAgKGF3YWl0IGZzLnJlYWRkaXIoZGlyUGF0aCkpXG4gICAgICAuZmlsdGVyKChwKSA9PiAhcC5zdGFydHNXaXRoKCcuJykpXG4gICAgICAuZmlsdGVyKChwKSA9PiAhKHAgPT09ICdMSUNFTlNFJykpXG4gICAgICAvLyBpZiwgZm9yIHNvbWUgcmVhc29uLCB0aGUgdGVtcCBmb2xkZXIgZm9yIHRoZSBob29rIGRvZXNuJ3QgZ2V0IGRlbGV0ZWQgd2UgZG9uJ3Qgd2FudCB0byBkaXNwbGF5IGl0IGluIHRoaXMgbGlzdFxuICAgICAgLmZpbHRlcigocCkgPT4gIShwID09PSBJTkZPX0RPVF9KU09OKSlcbiAgICAgIC5zb3J0KClcbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByaW50QXZhaWxhYmxlVGVtcGxhdGVzKGxhbmd1YWdlPzogc3RyaW5nKSB7XG4gIHByaW50KCdBdmFpbGFibGUgdGVtcGxhdGVzOicpO1xuICBmb3IgKGNvbnN0IHRlbXBsYXRlIG9mIGF3YWl0IGF2YWlsYWJsZUluaXRUZW1wbGF0ZXMoKSkge1xuICAgIGlmIChsYW5ndWFnZSAmJiB0ZW1wbGF0ZS5sYW5ndWFnZXMuaW5kZXhPZihsYW5ndWFnZSkgPT09IC0xKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcHJpbnQoYCogJHtjaGFsay5ncmVlbih0ZW1wbGF0ZS5uYW1lKX06ICR7dGVtcGxhdGUuZGVzY3JpcHRpb259YCk7XG4gICAgY29uc3QgbGFuZ3VhZ2VBcmcgPSBsYW5ndWFnZVxuICAgICAgPyBjaGFsay5ib2xkKGxhbmd1YWdlKVxuICAgICAgOiB0ZW1wbGF0ZS5sYW5ndWFnZXMubGVuZ3RoID4gMVxuICAgICAgICA/IGBbJHt0ZW1wbGF0ZS5sYW5ndWFnZXMubWFwKCh0KSA9PiBjaGFsay5ib2xkKHQpKS5qb2luKCd8Jyl9XWBcbiAgICAgICAgOiBjaGFsay5ib2xkKHRlbXBsYXRlLmxhbmd1YWdlc1swXSk7XG4gICAgcHJpbnQoYCAgIOKUlOKUgCAke2NoYWxrLmJsdWUoYGNkayBpbml0ICR7Y2hhbGsuYm9sZCh0ZW1wbGF0ZS5uYW1lKX0gLS1sYW5ndWFnZT0ke2xhbmd1YWdlQXJnfWApfWApO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRpYWxpemVQcm9qZWN0KFxuICB0ZW1wbGF0ZTogSW5pdFRlbXBsYXRlLFxuICBsYW5ndWFnZTogc3RyaW5nLFxuICBjYW5Vc2VOZXR3b3JrOiBib29sZWFuLFxuICBnZW5lcmF0ZU9ubHk6IGJvb2xlYW4sXG4gIHdvcmtEaXI6IHN0cmluZyxcbiAgc3RhY2tOYW1lPzogc3RyaW5nLFxuICBtaWdyYXRlPzogYm9vbGVhbixcbikge1xuICBhd2FpdCBhc3NlcnRJc0VtcHR5RGlyZWN0b3J5KHdvcmtEaXIpO1xuICBwcmludChgQXBwbHlpbmcgcHJvamVjdCB0ZW1wbGF0ZSAke2NoYWxrLmdyZWVuKHRlbXBsYXRlLm5hbWUpfSBmb3IgJHtjaGFsay5ibHVlKGxhbmd1YWdlKX1gKTtcbiAgYXdhaXQgdGVtcGxhdGUuaW5zdGFsbChsYW5ndWFnZSwgd29ya0Rpciwgc3RhY2tOYW1lKTtcbiAgaWYgKG1pZ3JhdGUpIHtcbiAgICBhd2FpdCB0ZW1wbGF0ZS5hZGRNaWdyYXRlQ29udGV4dCh3b3JrRGlyKTtcbiAgfVxuICBpZiAoYXdhaXQgZnMucGF0aEV4aXN0cyhgJHt3b3JrRGlyfS9SRUFETUUubWRgKSkge1xuICAgIGNvbnN0IHJlYWRtZSA9IGF3YWl0IGZzLnJlYWRGaWxlKGAke3dvcmtEaXJ9L1JFQURNRS5tZGAsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSk7XG4gICAgcHJpbnQoY2hhbGsuZ3JlZW4ocmVhZG1lKSk7XG4gIH1cblxuICBpZiAoIWdlbmVyYXRlT25seSkge1xuICAgIGF3YWl0IGluaXRpYWxpemVHaXRSZXBvc2l0b3J5KHdvcmtEaXIpO1xuICAgIGF3YWl0IHBvc3RJbnN0YWxsKGxhbmd1YWdlLCBjYW5Vc2VOZXR3b3JrLCB3b3JrRGlyKTtcbiAgfVxuXG4gIHByaW50KCfinIUgQWxsIGRvbmUhJyk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFzc2VydElzRW1wdHlEaXJlY3Rvcnkod29ya0Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IGZpbGVzID0gYXdhaXQgZnMucmVhZGRpcih3b3JrRGlyKTtcbiAgaWYgKGZpbGVzLmZpbHRlcigoZikgPT4gIWYuc3RhcnRzV2l0aCgnLicpKS5sZW5ndGggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdgY2RrIGluaXRgIGNhbm5vdCBiZSBydW4gaW4gYSBub24tZW1wdHkgZGlyZWN0b3J5IScpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRpYWxpemVHaXRSZXBvc2l0b3J5KHdvcmtEaXI6IHN0cmluZykge1xuICBpZiAoYXdhaXQgaXNJbkdpdFJlcG9zaXRvcnkod29ya0RpcikpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcHJpbnQoJ0luaXRpYWxpemluZyBhIG5ldyBnaXQgcmVwb3NpdG9yeS4uLicpO1xuICB0cnkge1xuICAgIGF3YWl0IGV4ZWN1dGUoJ2dpdCcsIFsnaW5pdCddLCB7IGN3ZDogd29ya0RpciB9KTtcbiAgICBhd2FpdCBleGVjdXRlKCdnaXQnLCBbJ2FkZCcsICcuJ10sIHsgY3dkOiB3b3JrRGlyIH0pO1xuICAgIGF3YWl0IGV4ZWN1dGUoJ2dpdCcsIFsnY29tbWl0JywgJy0tbWVzc2FnZT1cIkluaXRpYWwgY29tbWl0XCInLCAnLS1uby1ncGctc2lnbiddLCB7IGN3ZDogd29ya0RpciB9KTtcbiAgfSBjYXRjaCB7XG4gICAgd2FybmluZygnVW5hYmxlIHRvIGluaXRpYWxpemUgZ2l0IHJlcG9zaXRvcnkgZm9yIHlvdXIgcHJvamVjdC4nKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwb3N0SW5zdGFsbChsYW5ndWFnZTogc3RyaW5nLCBjYW5Vc2VOZXR3b3JrOiBib29sZWFuLCB3b3JrRGlyOiBzdHJpbmcpIHtcbiAgc3dpdGNoIChsYW5ndWFnZSkge1xuICAgIGNhc2UgJ2phdmFzY3JpcHQnOlxuICAgICAgcmV0dXJuIHBvc3RJbnN0YWxsSmF2YXNjcmlwdChjYW5Vc2VOZXR3b3JrLCB3b3JrRGlyKTtcbiAgICBjYXNlICd0eXBlc2NyaXB0JzpcbiAgICAgIHJldHVybiBwb3N0SW5zdGFsbFR5cGVzY3JpcHQoY2FuVXNlTmV0d29yaywgd29ya0Rpcik7XG4gICAgY2FzZSAnamF2YSc6XG4gICAgICByZXR1cm4gcG9zdEluc3RhbGxKYXZhKGNhblVzZU5ldHdvcmssIHdvcmtEaXIpO1xuICAgIGNhc2UgJ3B5dGhvbic6XG4gICAgICByZXR1cm4gcG9zdEluc3RhbGxQeXRob24od29ya0Rpcik7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcG9zdEluc3RhbGxKYXZhc2NyaXB0KGNhblVzZU5ldHdvcms6IGJvb2xlYW4sIGN3ZDogc3RyaW5nKSB7XG4gIHJldHVybiBwb3N0SW5zdGFsbFR5cGVzY3JpcHQoY2FuVXNlTmV0d29yaywgY3dkKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcG9zdEluc3RhbGxUeXBlc2NyaXB0KGNhblVzZU5ldHdvcms6IGJvb2xlYW4sIGN3ZDogc3RyaW5nKSB7XG4gIGNvbnN0IGNvbW1hbmQgPSAnbnBtJztcblxuICBpZiAoIWNhblVzZU5ldHdvcmspIHtcbiAgICB3YXJuaW5nKGBQbGVhc2UgcnVuICcke2NvbW1hbmR9IGluc3RhbGwnIWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHByaW50KGBFeGVjdXRpbmcgJHtjaGFsay5ncmVlbihgJHtjb21tYW5kfSBpbnN0YWxsYCl9Li4uYCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY3V0ZShjb21tYW5kLCBbJ2luc3RhbGwnXSwgeyBjd2QgfSk7XG4gIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgIHdhcm5pbmcoYCR7Y29tbWFuZH0gaW5zdGFsbCBmYWlsZWQ6IGAgKyBlLm1lc3NhZ2UpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHBvc3RJbnN0YWxsSmF2YShjYW5Vc2VOZXR3b3JrOiBib29sZWFuLCBjd2Q6IHN0cmluZykge1xuICBjb25zdCBtdm5QYWNrYWdlV2FybmluZyA9IFwiUGxlYXNlIHJ1biAnbXZuIHBhY2thZ2UnIVwiO1xuICBpZiAoIWNhblVzZU5ldHdvcmspIHtcbiAgICB3YXJuaW5nKG12blBhY2thZ2VXYXJuaW5nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBwcmludChcIkV4ZWN1dGluZyAnbXZuIHBhY2thZ2UnXCIpO1xuICB0cnkge1xuICAgIGF3YWl0IGV4ZWN1dGUoJ212bicsIFsncGFja2FnZSddLCB7IGN3ZCB9KTtcbiAgfSBjYXRjaCB7XG4gICAgd2FybmluZygnVW5hYmxlIHRvIHBhY2thZ2UgY29tcGlsZWQgY29kZSBhcyBKQVInKTtcbiAgICB3YXJuaW5nKG12blBhY2thZ2VXYXJuaW5nKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwb3N0SW5zdGFsbFB5dGhvbihjd2Q6IHN0cmluZykge1xuICBjb25zdCBweXRob24gPSBweXRob25FeGVjdXRhYmxlKCk7XG4gIHdhcm5pbmcoYFBsZWFzZSBydW4gJyR7cHl0aG9ufSAtbSB2ZW52IC52ZW52JyFgKTtcbiAgcHJpbnQoYEV4ZWN1dGluZyAke2NoYWxrLmdyZWVuKCdDcmVhdGluZyB2aXJ0dWFsZW52Li4uJyl9YCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY3V0ZShweXRob24sIFsnLW0gdmVudicsICcudmVudiddLCB7IGN3ZCB9KTtcbiAgfSBjYXRjaCB7XG4gICAgd2FybmluZygnVW5hYmxlIHRvIGNyZWF0ZSB2aXJ0dWFsZW52IGF1dG9tYXRpY2FsbHknKTtcbiAgICB3YXJuaW5nKGBQbGVhc2UgcnVuICcke3B5dGhvbn0gLW0gdmVudiAudmVudichYCk7XG4gIH1cbn1cblxuLyoqXG4gKiBAcGFyYW0gZGlyIGEgZGlyZWN0b3J5IHRvIGJlIGNoZWNrZWRcbiAqIEByZXR1cm5zIHRydWUgaWYgYGBkaXJgYCBpcyB3aXRoaW4gYSBnaXQgcmVwb3NpdG9yeS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gaXNJbkdpdFJlcG9zaXRvcnkoZGlyOiBzdHJpbmcpIHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBpZiAoYXdhaXQgZnMucGF0aEV4aXN0cyhwYXRoLmpvaW4oZGlyLCAnLmdpdCcpKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc1Jvb3QoZGlyKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBkaXIgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgfVxufVxuXG4vKipcbiAqIEBwYXJhbSBkaXIgYSBkaXJlY3RvcnkgdG8gYmUgY2hlY2tlZC5cbiAqIEByZXR1cm5zIHRydWUgaWYgYGBkaXJgYCBpcyB0aGUgcm9vdCBvZiBhIGZpbGVzeXN0ZW0uXG4gKi9cbmZ1bmN0aW9uIGlzUm9vdChkaXI6IHN0cmluZykge1xuICByZXR1cm4gcGF0aC5kaXJuYW1lKGRpcikgPT09IGRpcjtcbn1cblxuLyoqXG4gKiBFeGVjdXRlcyBgY29tbWFuZGAuIFNUREVSUiBpcyBlbWl0dGVkIGluIHJlYWwtdGltZS5cbiAqXG4gKiBJZiBjb21tYW5kIGV4aXRzIHdpdGggbm9uLXplcm8gZXhpdCBjb2RlLCBhbiBleGNlcHJpb24gaXMgdGhyb3duIGFuZCBpbmNsdWRlc1xuICogdGhlIGNvbnRlbnRzIG9mIFNURE9VVC5cbiAqXG4gKiBAcmV0dXJucyBTVERPVVQgKGlmIHN1Y2Nlc3NmdWwpLlxuICovXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlKGNtZDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSwgeyBjd2QgfTogeyBjd2Q6IHN0cmluZyB9KSB7XG4gIGNvbnN0IGNoaWxkID0gY2hpbGRQcm9jZXNzLnNwYXduKGNtZCwgYXJncywge1xuICAgIGN3ZCxcbiAgICBzaGVsbDogdHJ1ZSxcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdpbmhlcml0J10sXG4gIH0pO1xuICBsZXQgc3Rkb3V0ID0gJyc7XG4gIGNoaWxkLnN0ZG91dC5vbignZGF0YScsIChjaHVuaykgPT4gKHN0ZG91dCArPSBjaHVuay50b1N0cmluZygpKSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChvaywgZmFpbCkgPT4ge1xuICAgIGNoaWxkLm9uY2UoJ2Vycm9yJywgKGVycikgPT4gZmFpbChlcnIpKTtcbiAgICBjaGlsZC5vbmNlKCdleGl0JywgKHN0YXR1cykgPT4ge1xuICAgICAgaWYgKHN0YXR1cyA9PT0gMCkge1xuICAgICAgICByZXR1cm4gb2soc3Rkb3V0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKHN0ZG91dCk7XG4gICAgICAgIHJldHVybiBmYWlsKG5ldyBUb29sa2l0RXJyb3IoYCR7Y21kfSBleGl0ZWQgd2l0aCBzdGF0dXMgJHtzdGF0dXN9YCkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuaW50ZXJmYWNlIFZlcnNpb25zIHtcbiAgWydhd3MtY2RrLWxpYiddOiBzdHJpbmc7XG4gIGNvbnN0cnVjdHM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlICdhd3MtY2RrLWxpYicgdmVyc2lvbiB3ZSB3aWxsIGluaXRcbiAqXG4gKiBUaGlzIGhhcyBiZWVuIGJ1aWx0IGludG8gdGhlIENMSSBhdCBidWlsZCB0aW1lLlxuICovXG5hc3luYyBmdW5jdGlvbiBsb2FkSW5pdFZlcnNpb25zKCk6IFByb21pc2U8VmVyc2lvbnM+IHtcbiAgY29uc3QgcmVjb21tZW5kZWRGbGFnc0ZpbGUgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi9pbml0LXRlbXBsYXRlcy8uaW5pdC12ZXJzaW9uLmpzb24nKTtcbiAgY29uc3QgY29udGVudHMgPSBKU09OLnBhcnNlKGF3YWl0IGZzLnJlYWRGaWxlKHJlY29tbWVuZGVkRmxhZ3NGaWxlLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pKTtcblxuICBjb25zdCByZXQgPSB7XG4gICAgJ2F3cy1jZGstbGliJzogY29udGVudHNbJ2F3cy1jZGstbGliJ10sXG4gICAgJ2NvbnN0cnVjdHMnOiBjb250ZW50cy5jb25zdHJ1Y3RzLFxuICB9O1xuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhyZXQpKSB7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgaW5pdCB2ZXJzaW9uIGZyb20gJHtyZWNvbW1lbmRlZEZsYWdzRmlsZX06ICR7a2V5fWApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBjdXJyZW50bHkgcmVjb21tZW5kZWQgZmxhZ3MgZm9yIGBhd3MtY2RrLWxpYmAuXG4gKlxuICogVGhlc2UgaGF2ZSBiZWVuIGJ1aWx0IGludG8gdGhlIENMSSBhdCBidWlsZCB0aW1lLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3VycmVudGx5UmVjb21tZW5kZWRBd3NDZGtMaWJGbGFncygpIHtcbiAgY29uc3QgcmVjb21tZW5kZWRGbGFnc0ZpbGUgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi9pbml0LXRlbXBsYXRlcy8ucmVjb21tZW5kZWQtZmVhdHVyZS1mbGFncy5qc29uJyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGF3YWl0IGZzLnJlYWRGaWxlKHJlY29tbWVuZGVkRmxhZ3NGaWxlLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pKTtcbn1cbiJdfQ==