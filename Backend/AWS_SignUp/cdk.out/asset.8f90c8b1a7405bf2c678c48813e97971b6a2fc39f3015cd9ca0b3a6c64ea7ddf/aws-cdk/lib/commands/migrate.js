"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FromScan = exports.CfnTemplateGeneratorProvider = exports.FilterType = exports.ScanStatus = exports.TemplateSourceOptions = exports.MIGRATE_SUPPORTED_LANGUAGES = void 0;
exports.generateCdkApp = generateCdkApp;
exports.generateStack = generateStack;
exports.readFromPath = readFromPath;
exports.readFromStack = readFromStack;
exports.generateTemplate = generateTemplate;
exports.chunks = chunks;
exports.setEnvironment = setEnvironment;
exports.parseSourceOptions = parseSourceOptions;
exports.scanProgressBar = scanProgressBar;
exports.printBar = printBar;
exports.printDots = printDots;
exports.rewriteLine = rewriteLine;
exports.displayTimeDiff = displayTimeDiff;
exports.writeMigrateJsonFile = writeMigrateJsonFile;
exports.getMigrateScanType = getMigrateScanType;
exports.isThereAWarning = isThereAWarning;
exports.buildGenertedTemplateOutput = buildGenertedTemplateOutput;
exports.buildCfnClient = buildCfnClient;
exports.appendWarningsToReadme = appendWarningsToReadme;
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const cx_api_1 = require("@aws-cdk/cx-api");
const cdk_from_cfn = require("cdk-from-cfn");
const chalk = require("chalk");
const init_1 = require("../../lib/init");
const logging_1 = require("../../lib/logging");
const cloudformation_1 = require("../api/util/cloudformation");
const archive_1 = require("../util/archive");
const camelCase = require('camelcase');
const decamelize = require('decamelize');
/** The list of languages supported by the built-in noctilucent binary. */
exports.MIGRATE_SUPPORTED_LANGUAGES = cdk_from_cfn.supported_languages();
/**
 * Generates a CDK app from a yaml or json template.
 *
 * @param stackName The name to assign to the stack in the generated app
 * @param stack The yaml or json template for the stack
 * @param language The language to generate the CDK app in
 * @param outputPath The path at which to generate the CDK app
 */
async function generateCdkApp(stackName, stack, language, outputPath, compress) {
    const resolvedOutputPath = path.join(outputPath ?? process.cwd(), stackName);
    const formattedStackName = decamelize(stackName);
    try {
        fs.rmSync(resolvedOutputPath, { recursive: true, force: true });
        fs.mkdirSync(resolvedOutputPath, { recursive: true });
        const generateOnly = compress;
        await (0, init_1.cliInit)({
            type: 'app',
            language,
            canUseNetwork: true,
            generateOnly,
            workDir: resolvedOutputPath,
            stackName,
            migrate: true,
        });
        let stackFileName;
        switch (language) {
            case 'typescript':
                stackFileName = `${resolvedOutputPath}/lib/${formattedStackName}-stack.ts`;
                break;
            case 'java':
                stackFileName = `${resolvedOutputPath}/src/main/java/com/myorg/${camelCase(formattedStackName, { pascalCase: true })}Stack.java`;
                break;
            case 'python':
                stackFileName = `${resolvedOutputPath}/${formattedStackName.replace(/-/g, '_')}/${formattedStackName.replace(/-/g, '_')}_stack.py`;
                break;
            case 'csharp':
                stackFileName = `${resolvedOutputPath}/src/${camelCase(formattedStackName, { pascalCase: true })}/${camelCase(formattedStackName, { pascalCase: true })}Stack.cs`;
                break;
            case 'go':
                stackFileName = `${resolvedOutputPath}/${formattedStackName}.go`;
                break;
            default:
                throw new Error(`${language} is not supported by CDK Migrate. Please choose from: ${exports.MIGRATE_SUPPORTED_LANGUAGES.join(', ')}`);
        }
        fs.writeFileSync(stackFileName, stack);
        if (compress) {
            await (0, archive_1.zipDirectory)(resolvedOutputPath, `${resolvedOutputPath}.zip`);
            fs.rmSync(resolvedOutputPath, { recursive: true, force: true });
        }
    }
    catch (error) {
        fs.rmSync(resolvedOutputPath, { recursive: true, force: true });
        throw error;
    }
}
/**
 * Generates a CDK stack file.
 * @param template The template to translate into a CDK stack
 * @param stackName The name to assign to the stack
 * @param language The language to generate the stack in
 * @returns A string representation of a CDK stack file
 */
function generateStack(template, stackName, language) {
    const formattedStackName = `${camelCase(decamelize(stackName), { pascalCase: true })}Stack`;
    try {
        return cdk_from_cfn.transmute(template, language, formattedStackName);
    }
    catch (e) {
        throw new Error(`${formattedStackName} could not be generated because ${e.message}`);
    }
}
/**
 * Reads and returns a stack template from a local path.
 *
 * @param inputPath The location of the template
 * @returns A string representation of the template if present, otherwise undefined
 */
function readFromPath(inputPath) {
    let readFile;
    try {
        readFile = fs.readFileSync(inputPath, 'utf8');
    }
    catch (e) {
        throw new Error(`'${inputPath}' is not a valid path.`);
    }
    if (readFile == '') {
        throw new Error(`Cloudformation template filepath: '${inputPath}' is an empty file.`);
    }
    return readFile;
}
/**
 * Reads and returns a stack template from a deployed CloudFormation stack.
 *
 * @param stackName The name of the stack
 * @param sdkProvider The sdk provider for making CloudFormation calls
 * @param environment The account and region where the stack is deployed
 * @returns A string representation of the template if present, otherwise undefined
 */
async function readFromStack(stackName, sdkProvider, environment) {
    const cloudFormation = (await sdkProvider.forEnvironment(environment, 0)).sdk.cloudFormation();
    const stack = await cloudformation_1.CloudFormationStack.lookup(cloudFormation, stackName, true);
    if (stack.stackStatus.isDeploySuccess || stack.stackStatus.isRollbackSuccess) {
        return JSON.stringify(await stack.template());
    }
    else {
        throw new Error(`Stack '${stackName}' in account ${environment.account} and region ${environment.region} has a status of '${stack.stackStatus.name}' due to '${stack.stackStatus.reason}'. The stack cannot be migrated until it is in a healthy state.`);
    }
}
/**
 * Takes in a stack name and account and region and returns a generated cloudformation template using the cloudformation
 * template generator.
 *
 * @param GenerateTemplateOptions An object containing the stack name, filters, sdkProvider, environment, and newScan flag
 * @returns a generated cloudformation template
 */
async function generateTemplate(options) {
    const cfn = new CfnTemplateGeneratorProvider(await buildCfnClient(options.sdkProvider, options.environment));
    const scanId = await findLastSuccessfulScan(cfn, options);
    // if a customer accidentally ctrl-c's out of the command and runs it again, this will continue the progress bar where it left off
    const curScan = await cfn.describeResourceScan(scanId);
    if (curScan.Status == ScanStatus.IN_PROGRESS) {
        (0, logging_1.print)('Resource scan in progress. Please wait, this can take 10 minutes or longer.');
        await scanProgressBar(scanId, cfn);
    }
    displayTimeDiff(new Date(), new Date(curScan.StartTime));
    let resources = await cfn.listResourceScanResources(scanId, options.filters);
    (0, logging_1.print)('finding related resources.');
    let relatedResources = await cfn.getResourceScanRelatedResources(scanId, resources);
    (0, logging_1.print)(`Found ${relatedResources.length} resources.`);
    (0, logging_1.print)('Generating CFN template from scanned resources.');
    const templateArn = (await cfn.createGeneratedTemplate(options.stackName, relatedResources)).GeneratedTemplateId;
    let generatedTemplate = await cfn.describeGeneratedTemplate(templateArn);
    (0, logging_1.print)('Please wait, template creation in progress. This may take a couple minutes.');
    while (generatedTemplate.Status !== ScanStatus.COMPLETE && generatedTemplate.Status !== ScanStatus.FAILED) {
        await printDots(`[${generatedTemplate.Status}] Template Creation in Progress`, 400);
        generatedTemplate = await cfn.describeGeneratedTemplate(templateArn);
    }
    (0, logging_1.print)('');
    (0, logging_1.print)('Template successfully generated!');
    return buildGenertedTemplateOutput(generatedTemplate, (await cfn.getGeneratedTemplate(templateArn)).TemplateBody, templateArn);
}
async function findLastSuccessfulScan(cfn, options) {
    let resourceScanSummaries = [];
    const clientRequestToken = `cdk-migrate-${options.environment.account}-${options.environment.region}`;
    if (options.fromScan === FromScan.NEW) {
        (0, logging_1.print)(`Starting new scan for account ${options.environment.account} in region ${options.environment.region}`);
        try {
            await cfn.startResourceScan(clientRequestToken);
            resourceScanSummaries = (await cfn.listResourceScans()).ResourceScanSummaries;
        }
        catch (e) {
            // continuing here because if the scan fails on a new-scan it is very likely because there is either already a scan in progress
            // or the customer hit a rate limit. In either case we want to continue with the most recent scan.
            // If this happens to fail for a credential error then that will be caught immediately after anyway.
            (0, logging_1.print)(`Scan failed to start due to error '${e.message}', defaulting to latest scan.`);
        }
    }
    else {
        resourceScanSummaries = (await cfn.listResourceScans()).ResourceScanSummaries;
        await cfn.checkForResourceScan(resourceScanSummaries, options, clientRequestToken);
    }
    // get the latest scan, which we know will exist
    resourceScanSummaries = (await cfn.listResourceScans()).ResourceScanSummaries;
    let scanId = resourceScanSummaries[0].ResourceScanId;
    // find the most recent scan that isn't in a failed state in case we didn't start a new one
    for (const summary of resourceScanSummaries) {
        if (summary.Status !== ScanStatus.FAILED) {
            scanId = summary.ResourceScanId;
            break;
        }
    }
    return scanId;
}
/**
 * Takes a string of filters in the format of key1=value1,key2=value2 and returns a map of the filters.
 *
 * @param filters a string of filters in the format of key1=value1,key2=value2
 * @returns a map of the filters
 */
function parseFilters(filters) {
    if (!filters) {
        return {
            'resource-identifier': undefined,
            'resource-type-prefix': undefined,
            'tag-key': undefined,
            'tag-value': undefined,
        };
    }
    const filterShorthands = {
        'identifier': FilterType.RESOURCE_IDENTIFIER,
        'id': FilterType.RESOURCE_IDENTIFIER,
        'type': FilterType.RESOURCE_TYPE_PREFIX,
        'type-prefix': FilterType.RESOURCE_TYPE_PREFIX,
    };
    const filterList = filters.split(',');
    let filterMap = {
        [FilterType.RESOURCE_IDENTIFIER]: undefined,
        [FilterType.RESOURCE_TYPE_PREFIX]: undefined,
        [FilterType.TAG_KEY]: undefined,
        [FilterType.TAG_VALUE]: undefined,
    };
    for (const fil of filterList) {
        const filter = fil.split('=');
        let filterKey = filter[0];
        const filterValue = filter[1];
        // if the key is a shorthand, replace it with the full name
        if (filterKey in filterShorthands) {
            filterKey = filterShorthands[filterKey];
        }
        if (Object.values(FilterType).includes(filterKey)) {
            filterMap[filterKey] = filterValue;
        }
        else {
            throw new Error(`Invalid filter: ${filterKey}`);
        }
    }
    return filterMap;
}
/**
 * Takes a list of any type and breaks it up into chunks of a specified size.
 *
 * @param list The list to break up
 * @param chunkSize The size of each chunk
 * @returns A list of lists of the specified size
 */
function chunks(list, chunkSize) {
    const chunkedList = [];
    for (let i = 0; i < list.length; i += chunkSize) {
        chunkedList.push(list.slice(i, i + chunkSize));
    }
    return chunkedList;
}
/**
 * Sets the account and region for making CloudFormation calls.
 * @param account The account to use
 * @param region The region to use
 * @returns The environment object
 */
function setEnvironment(account, region) {
    return {
        account: account ?? cx_api_1.UNKNOWN_ACCOUNT,
        region: region ?? cx_api_1.UNKNOWN_REGION,
        name: 'cdk-migrate-env',
    };
}
/**
 * Enum for the source options for the template
 */
var TemplateSourceOptions;
(function (TemplateSourceOptions) {
    TemplateSourceOptions["PATH"] = "path";
    TemplateSourceOptions["STACK"] = "stack";
    TemplateSourceOptions["SCAN"] = "scan";
})(TemplateSourceOptions || (exports.TemplateSourceOptions = TemplateSourceOptions = {}));
/**
 * Enum for the status of a resource scan
 */
var ScanStatus;
(function (ScanStatus) {
    ScanStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ScanStatus["COMPLETE"] = "COMPLETE";
    ScanStatus["FAILED"] = "FAILED";
})(ScanStatus || (exports.ScanStatus = ScanStatus = {}));
var FilterType;
(function (FilterType) {
    FilterType["RESOURCE_IDENTIFIER"] = "resource-identifier";
    FilterType["RESOURCE_TYPE_PREFIX"] = "resource-type-prefix";
    FilterType["TAG_KEY"] = "tag-key";
    FilterType["TAG_VALUE"] = "tag-value";
})(FilterType || (exports.FilterType = FilterType = {}));
/**
 * Validates that exactly one source option has been provided.
 * @param fromPath The content of the flag `--from-path`
 * @param fromStack the content of the flag `--from-stack`
 */
function parseSourceOptions(fromPath, fromStack, stackName) {
    if (fromPath && fromStack) {
        throw new Error('Only one of `--from-path` or `--from-stack` may be provided.');
    }
    if (!stackName) {
        throw new Error('`--stack-name` is a required field.');
    }
    if (!fromPath && !fromStack) {
        return { source: TemplateSourceOptions.SCAN };
    }
    if (fromPath) {
        return { source: TemplateSourceOptions.PATH, templatePath: fromPath };
    }
    return { source: TemplateSourceOptions.STACK, stackName: stackName };
}
/**
 * Takes a set of resources and removes any with the managedbystack flag set to true.
 *
 * @param resourceList the list of resources provided by the list scanned resources calls
 * @returns a list of resources not managed by cfn stacks
 */
function excludeManaged(resourceList) {
    return resourceList
        .filter((r) => !r.ManagedByStack)
        .map((r) => ({
        ResourceType: r.ResourceType,
        ResourceIdentifier: r.ResourceIdentifier,
    }));
}
/**
 * Transforms a list of resources into a list of resource identifiers by removing the ManagedByStack flag.
 * Setting the value of the field to undefined effectively removes it from the object.
 *
 * @param resourceList the list of resources provided by the list scanned resources calls
 * @returns a list of ScannedResourceIdentifier[]
 */
function resourceIdentifiers(resourceList) {
    const identifiers = [];
    resourceList.forEach((r) => {
        const identifier = {
            ResourceType: r.ResourceType,
            ResourceIdentifier: r.ResourceIdentifier,
        };
        identifiers.push(identifier);
    });
    return identifiers;
}
/**
 * Takes a scan id and maintains a progress bar to display the progress of a scan to the user.
 *
 * @param scanId A string representing the scan id
 * @param cloudFormation The CloudFormation sdk client to use
 */
async function scanProgressBar(scanId, cfn) {
    let curProgress = 0.5;
    // we know it's in progress initially since we wouldn't have gotten here if it wasn't
    let curScan = {
        Status: ScanStatus.IN_PROGRESS,
        $metadata: {},
    };
    while (curScan.Status == ScanStatus.IN_PROGRESS) {
        curScan = await cfn.describeResourceScan(scanId);
        curProgress = curScan.PercentageCompleted ?? curProgress;
        printBar(30, curProgress);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    (0, logging_1.print)('');
    (0, logging_1.print)('✅ Scan Complete!');
}
/**
 * Prints a progress bar to the console. To be used in a while loop to show progress of a long running task.
 * The progress bar deletes the current line on the console and rewrites it with the progress amount.
 *
 * @param width The width of the progress bar
 * @param progress The current progress to display as a percentage of 100
 */
function printBar(width, progress) {
    if (!process.env.MIGRATE_INTEG_TEST) {
        const FULL_BLOCK = '█';
        const PARTIAL_BLOCK = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
        const fraction = Math.min(progress / 100, 1);
        const innerWidth = Math.max(1, width - 2);
        const chars = innerWidth * fraction;
        const remainder = chars - Math.floor(chars);
        const fullChars = FULL_BLOCK.repeat(Math.floor(chars));
        const partialChar = PARTIAL_BLOCK[Math.floor(remainder * PARTIAL_BLOCK.length)];
        const filler = '·'.repeat(innerWidth - Math.floor(chars) - (partialChar ? 1 : 0));
        const color = chalk.green;
        rewriteLine('[' + color(fullChars + partialChar) + filler + `] (${progress}%)`);
    }
}
/**
 * Prints a message to the console with a series periods appended to it. To be used in a while loop to show progress of a long running task.
 * The message deletes the current line and rewrites it several times to display 1-3 periods to show the user that the task is still running.
 *
 * @param message The message to display
 * @param timeoutx4 The amount of time to wait before printing the next period
 */
async function printDots(message, timeoutx4) {
    if (!process.env.MIGRATE_INTEG_TEST) {
        rewriteLine(message + ' .');
        await new Promise((resolve) => setTimeout(resolve, timeoutx4));
        rewriteLine(message + ' ..');
        await new Promise((resolve) => setTimeout(resolve, timeoutx4));
        rewriteLine(message + ' ...');
        await new Promise((resolve) => setTimeout(resolve, timeoutx4));
        rewriteLine(message);
        await new Promise((resolve) => setTimeout(resolve, timeoutx4));
    }
}
/**
 * Rewrites the current line on the console and writes a new message to it.
 * This is a helper funciton for printDots and printBar.
 *
 * @param message The message to display
 */
function rewriteLine(message) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(message);
}
/**
 * Prints the time difference between two dates in days, hours, and minutes.
 *
 * @param time1 The first date to compare
 * @param time2 The second date to compare
 */
function displayTimeDiff(time1, time2) {
    const diff = Math.abs(time1.getTime() - time2.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    (0, logging_1.print)(`Using the latest successful scan which is ${days} days, ${hours} hours, and ${minutes} minutes old.`);
}
/**
 * Writes a migrate.json file to the output directory.
 *
 * @param outputPath The path to write the migrate.json file to
 * @param stackName The name of the stack
 * @param generatedOutput The output of the template generator
 */
function writeMigrateJsonFile(outputPath, stackName, migrateJson) {
    const outputToJson = {
        '//': 'This file is generated by cdk migrate. It will be automatically deleted after the first successful deployment of this app to the environment of the original resources.',
        'Source': migrateJson.source,
        'Resources': migrateJson.resources,
    };
    fs.writeFileSync(`${path.join(outputPath ?? process.cwd(), stackName)}/migrate.json`, JSON.stringify(outputToJson, null, 2));
}
/**
 * Takes a string representing the from-scan flag and returns a FromScan enum value.
 *
 * @param scanType A string representing the from-scan flag
 * @returns A FromScan enum value
 */
function getMigrateScanType(scanType) {
    switch (scanType) {
        case 'new':
            return FromScan.NEW;
        case 'most-recent':
            return FromScan.MOST_RECENT;
        case '':
            return FromScan.DEFAULT;
        case undefined:
            return FromScan.DEFAULT;
        default:
            throw new Error(`Unknown scan type: ${scanType}`);
    }
}
/**
 * Takes a generatedTemplateOutput objct and returns a boolean representing whether there are any warnings on any rescources.
 *
 * @param generatedTemplateOutput A GenerateTemplateOutput object
 * @returns A boolean representing whether there are any warnings on any rescources
 */
function isThereAWarning(generatedTemplateOutput) {
    if (generatedTemplateOutput.resources) {
        for (const resource of generatedTemplateOutput.resources) {
            if (resource.Warnings && resource.Warnings.length > 0) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Builds the GenerateTemplateOutput object from the DescribeGeneratedTemplateOutput and the template body.
 *
 * @param generatedTemplateSummary The output of the describe generated template call
 * @param templateBody The body of the generated template
 * @returns A GenerateTemplateOutput object
 */
function buildGenertedTemplateOutput(generatedTemplateSummary, templateBody, source) {
    const resources = generatedTemplateSummary.Resources;
    const migrateJson = {
        templateBody: templateBody,
        source: source,
        resources: generatedTemplateSummary.Resources.map((r) => ({
            ResourceType: r.ResourceType,
            LogicalResourceId: r.LogicalResourceId,
            ResourceIdentifier: r.ResourceIdentifier,
        })),
    };
    const templateId = generatedTemplateSummary.GeneratedTemplateId;
    return {
        migrateJson: migrateJson,
        resources: resources,
        templateId: templateId,
    };
}
/**
 * Builds a CloudFormation sdk client for making requests with the CFN template generator.
 *
 * @param sdkProvider The sdk provider for making CloudFormation calls
 * @param environment The account and region where the stack is deployed
 * @returns A CloudFormation sdk client
 */
async function buildCfnClient(sdkProvider, environment) {
    const sdk = (await sdkProvider.forEnvironment(environment, 0)).sdk;
    sdk.appendCustomUserAgent('cdk-migrate');
    return sdk.cloudFormation();
}
/**
 * Appends a list of warnings to a readme file.
 *
 * @param filepath The path to the readme file
 * @param resources A list of resources to append warnings for
 */
function appendWarningsToReadme(filepath, resources) {
    const readme = fs.readFileSync(filepath, 'utf8');
    const lines = readme.split('\n');
    const index = lines.findIndex((line) => line.trim() === 'Enjoy!');
    let linesToAdd = ['\n## Warnings'];
    linesToAdd.push('### Write-only properties');
    linesToAdd.push("Write-only properties are resource property values that can be written to but can't be read by AWS CloudFormation or CDK Migrate. For more information, see [IaC generator and write-only properties](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/generate-IaC-write-only-properties.html).");
    linesToAdd.push('\n');
    linesToAdd.push('Write-only properties discovered during migration are organized here by resource ID and categorized by write-only property type. Resolve write-only properties by providing property values in your CDK app. For guidance, see [Resolve write-only properties](https://docs.aws.amazon.com/cdk/v2/guide/migrate.html#migrate-resources-writeonly).');
    for (const resource of resources) {
        if (resource.Warnings && resource.Warnings.length > 0) {
            linesToAdd.push(`### ${resource.LogicalResourceId}`);
            for (const warning of resource.Warnings) {
                linesToAdd.push(`- **${warning.Type}**: `);
                for (const property of warning.Properties) {
                    linesToAdd.push(`  - ${property.PropertyPath}: ${property.Description}`);
                }
            }
        }
    }
    lines.splice(index, 0, ...linesToAdd);
    fs.writeFileSync(filepath, lines.join('\n'));
}
/**
 * takes a list of resources and returns a list of unique resources based on the resource type and logical resource id.
 *
 * @param resources A list of resources to deduplicate
 * @returns A list of unique resources
 */
function deduplicateResources(resources) {
    let uniqueResources = {};
    for (const resource of resources) {
        const key = Object.keys(resource.ResourceIdentifier)[0];
        // Creating our unique identifier using the resource type, the key, and the value of the resource identifier
        // The resource identifier is a combination of a key value pair defined by a resource's schema, and the resource type of the resource.
        const uniqueIdentifer = `${resource.ResourceType}:${key}:${resource.ResourceIdentifier[key]}`;
        uniqueResources[uniqueIdentifer] = resource;
    }
    return Object.values(uniqueResources);
}
/**
 * Class for making CloudFormation template generator calls
 */
class CfnTemplateGeneratorProvider {
    constructor(cfn) {
        this.cfn = cfn;
    }
    async checkForResourceScan(resourceScanSummaries, options, clientRequestToken) {
        if (!resourceScanSummaries || resourceScanSummaries.length === 0) {
            if (options.fromScan === FromScan.MOST_RECENT) {
                throw new Error('No scans found. Please either start a new scan with the `--from-scan` new or do not specify a `--from-scan` option.');
            }
            else {
                (0, logging_1.print)('No scans found. Initiating a new resource scan.');
                await this.startResourceScan(clientRequestToken);
            }
        }
    }
    /**
     * Retrieves a tokenized list of resources and their associated scan. If a token is present the function
     * will loop through all pages and combine them into a single list of ScannedRelatedResources
     *
     * @param scanId scan id for the to list resources for
     * @param resources A list of resources to find related resources for
     */
    async getResourceScanRelatedResources(scanId, resources) {
        let relatedResourceList = resources;
        // break the list of resources into chunks of 100 to avoid hitting the 100 resource limit
        for (const chunk of chunks(resources, 100)) {
            // get the first page of related resources
            const res = await this.cfn.listResourceScanRelatedResources({
                ResourceScanId: scanId,
                Resources: chunk,
            });
            // add the first page to the list
            relatedResourceList.push(...(res.RelatedResources ?? []));
            let nextToken = res.NextToken;
            // if there are more pages, cycle through them and add them to the list before moving on to the next chunk
            while (nextToken) {
                const nextRelatedResources = await this.cfn.listResourceScanRelatedResources({
                    ResourceScanId: scanId,
                    Resources: resourceIdentifiers(resources),
                    NextToken: nextToken,
                });
                nextToken = nextRelatedResources.NextToken;
                relatedResourceList.push(...(nextRelatedResources.RelatedResources ?? []));
            }
        }
        relatedResourceList = deduplicateResources(relatedResourceList);
        // prune the managedbystack flag off of them again.
        return process.env.MIGRATE_INTEG_TEST
            ? resourceIdentifiers(relatedResourceList)
            : resourceIdentifiers(excludeManaged(relatedResourceList));
    }
    /**
     * Kicks off a scan of a customers account, returning the scan id. A scan can take
     * 10 minutes or longer to complete. However this will return a scan id as soon as
     * the scan has begun.
     *
     * @returns A string representing the scan id
     */
    async startResourceScan(requestToken) {
        return (await this.cfn.startResourceScan({
            ClientRequestToken: requestToken,
        })).ResourceScanId;
    }
    /**
     * Gets the most recent scans a customer has completed
     *
     * @returns a list of resource scan summaries
     */
    async listResourceScans() {
        return this.cfn.listResourceScans();
    }
    /**
     * Retrieves a tokenized list of resources from a resource scan. If a token is present, this function
     * will loop through all pages and combine them into a single list of ScannedResource[].
     * Additionally will apply any filters provided by the customer.
     *
     * @param scanId scan id for the to list resources for
     * @param filters a string of filters in the format of key1=value1,key2=value2
     * @returns a combined list of all resources from the scan
     */
    async listResourceScanResources(scanId, filters = []) {
        let resourceList = [];
        let resourceScanInputs;
        if (filters.length > 0) {
            (0, logging_1.print)('Applying filters to resource scan.');
            for (const filter of filters) {
                const filterList = parseFilters(filter);
                resourceScanInputs = {
                    ResourceScanId: scanId,
                    ResourceIdentifier: filterList[FilterType.RESOURCE_IDENTIFIER],
                    ResourceTypePrefix: filterList[FilterType.RESOURCE_TYPE_PREFIX],
                    TagKey: filterList[FilterType.TAG_KEY],
                    TagValue: filterList[FilterType.TAG_VALUE],
                };
                const resources = await this.cfn.listResourceScanResources(resourceScanInputs);
                resourceList = resourceList.concat(resources.Resources ?? []);
                let nextToken = resources.NextToken;
                // cycle through the pages adding all resources to the list until we run out of pages
                while (nextToken) {
                    resourceScanInputs.NextToken = nextToken;
                    const nextResources = await this.cfn.listResourceScanResources(resourceScanInputs);
                    nextToken = nextResources.NextToken;
                    resourceList = resourceList.concat(nextResources.Resources ?? []);
                }
            }
        }
        else {
            (0, logging_1.print)('No filters provided. Retrieving all resources from scan.');
            resourceScanInputs = {
                ResourceScanId: scanId,
            };
            const resources = await this.cfn.listResourceScanResources(resourceScanInputs);
            resourceList = resourceList.concat(resources.Resources ?? []);
            let nextToken = resources.NextToken;
            // cycle through the pages adding all resources to the list until we run out of pages
            while (nextToken) {
                resourceScanInputs.NextToken = nextToken;
                const nextResources = await this.cfn.listResourceScanResources(resourceScanInputs);
                nextToken = nextResources.NextToken;
                resourceList = resourceList.concat(nextResources.Resources ?? []);
            }
        }
        if (resourceList.length === 0) {
            throw new Error(`No resources found with filters ${filters.join(' ')}. Please try again with different filters.`);
        }
        resourceList = deduplicateResources(resourceList);
        return process.env.MIGRATE_INTEG_TEST
            ? resourceIdentifiers(resourceList)
            : resourceIdentifiers(excludeManaged(resourceList));
    }
    /**
     * Retrieves information about a resource scan.
     *
     * @param scanId scan id for the to list resources for
     * @returns information about the scan
     */
    async describeResourceScan(scanId) {
        return this.cfn.describeResourceScan({
            ResourceScanId: scanId,
        });
    }
    /**
     * Describes the current status of the template being generated.
     *
     * @param templateId A string representing the template id
     * @returns DescribeGeneratedTemplateOutput an object containing the template status and results
     */
    async describeGeneratedTemplate(templateId) {
        const generatedTemplate = await this.cfn.describeGeneratedTemplate({
            GeneratedTemplateName: templateId,
        });
        if (generatedTemplate.Status == ScanStatus.FAILED) {
            throw new Error(generatedTemplate.StatusReason);
        }
        return generatedTemplate;
    }
    /**
     * Retrieves a completed generated cloudformation template from the template generator.
     *
     * @param templateId A string representing the template id
     * @param cloudFormation The CloudFormation sdk client to use
     * @returns DescribeGeneratedTemplateOutput an object containing the template status and body
     */
    async getGeneratedTemplate(templateId) {
        return this.cfn.getGeneratedTemplate({
            GeneratedTemplateName: templateId,
        });
    }
    /**
     * Kicks off a template generation for a set of resources.
     *
     * @param stackName The name of the stack
     * @param resources A list of resources to generate the template from
     * @returns CreateGeneratedTemplateOutput an object containing the template arn to query on later
     */
    async createGeneratedTemplate(stackName, resources) {
        const createTemplateOutput = await this.cfn.createGeneratedTemplate({
            Resources: resources,
            GeneratedTemplateName: stackName,
        });
        if (createTemplateOutput.GeneratedTemplateId === undefined) {
            throw new Error('CreateGeneratedTemplate failed to return an Arn.');
        }
        return createTemplateOutput;
    }
    /**
     * Deletes a generated template from the template generator.
     *
     * @param templateArn The arn of the template to delete
     * @returns A promise that resolves when the template has been deleted
     */
    async deleteGeneratedTemplate(templateArn) {
        await this.cfn.deleteGeneratedTemplate({
            GeneratedTemplateName: templateArn,
        });
    }
}
exports.CfnTemplateGeneratorProvider = CfnTemplateGeneratorProvider;
/**
 * The possible ways to choose a scan to generate a CDK application from
 */
var FromScan;
(function (FromScan) {
    /**
     * Initiate a new resource scan to build the CDK application from.
     */
    FromScan[FromScan["NEW"] = 0] = "NEW";
    /**
     * Use the last successful scan to build the CDK application from. Will fail if no scan is found.
     */
    FromScan[FromScan["MOST_RECENT"] = 1] = "MOST_RECENT";
    /**
     * Starts a scan if none exists, otherwise uses the most recent successful scan to build the CDK application from.
     */
    FromScan[FromScan["DEFAULT"] = 2] = "DEFAULT";
})(FromScan || (exports.FromScan = FromScan = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1pZ3JhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBc0NBLHdDQXVEQztBQVNELHNDQU9DO0FBUUQsb0NBV0M7QUFVRCxzQ0FlQztBQVNELDRDQXNDQztBQWdHRCx3QkFNQztBQVFELHdDQU1DO0FBd0NELGdEQWNDO0FBMENELDBDQWVDO0FBU0QsNEJBaUJDO0FBU0QsOEJBY0M7QUFRRCxrQ0FJQztBQVFELDBDQVFDO0FBU0Qsb0RBY0M7QUFRRCxnREFhQztBQVFELDBDQVNDO0FBU0Qsa0VBcUJDO0FBU0Qsd0NBSUM7QUFRRCx3REEwQkM7QUFsb0JELDBEQUEwRDtBQUMxRCx1REFBdUQ7QUFDdkQseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUU3Qiw0Q0FBK0U7QUFhL0UsNkNBQTZDO0FBQzdDLCtCQUErQjtBQUMvQix5Q0FBeUM7QUFDekMsK0NBQTBDO0FBRTFDLCtEQUFpRTtBQUNqRSw2Q0FBK0M7QUFDL0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN6QywwRUFBMEU7QUFDN0QsUUFBQSwyQkFBMkIsR0FBc0IsWUFBWSxDQUFDLG1CQUFtQixFQUFFLENBQUM7QUFFakc7Ozs7Ozs7R0FPRztBQUNJLEtBQUssVUFBVSxjQUFjLENBQ2xDLFNBQWlCLEVBQ2pCLEtBQWEsRUFDYixRQUFnQixFQUNoQixVQUFtQixFQUNuQixRQUFrQjtJQUVsQixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM3RSxNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVqRCxJQUFJLENBQUM7UUFDSCxFQUFFLENBQUMsTUFBTSxDQUFDLGtCQUFr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dC9uby1yZXF1aXJlLWltcG9ydHMgKi9cbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby12YXItcmVxdWlyZXMgKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdHlwZSB7IEZvclJlYWRpbmcgfSBmcm9tICdAYXdzLWNkay9jbGktcGx1Z2luLWNvbnRyYWN0JztcbmltcG9ydCB7IEVudmlyb25tZW50LCBVTktOT1dOX0FDQ09VTlQsIFVOS05PV05fUkVHSU9OIH0gZnJvbSAnQGF3cy1jZGsvY3gtYXBpJztcbmltcG9ydCB0eXBlIHtcbiAgRGVzY3JpYmVHZW5lcmF0ZWRUZW1wbGF0ZUNvbW1hbmRPdXRwdXQsXG4gIERlc2NyaWJlUmVzb3VyY2VTY2FuQ29tbWFuZE91dHB1dCxcbiAgR2V0R2VuZXJhdGVkVGVtcGxhdGVDb21tYW5kT3V0cHV0LFxuICBMaXN0UmVzb3VyY2VTY2FuUmVzb3VyY2VzQ29tbWFuZElucHV0LFxuICBSZXNvdXJjZURlZmluaXRpb24sXG4gIFJlc291cmNlRGV0YWlsLFxuICBSZXNvdXJjZUlkZW50aWZpZXJTdW1tYXJ5LFxuICBSZXNvdXJjZVNjYW5TdW1tYXJ5LFxuICBTY2FubmVkUmVzb3VyY2UsXG4gIFNjYW5uZWRSZXNvdXJjZUlkZW50aWZpZXIsXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZGZvcm1hdGlvbic7XG5pbXBvcnQgKiBhcyBjZGtfZnJvbV9jZm4gZnJvbSAnY2RrLWZyb20tY2ZuJztcbmltcG9ydCAqIGFzIGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IGNsaUluaXQgfSBmcm9tICcuLi8uLi9saWIvaW5pdCc7XG5pbXBvcnQgeyBwcmludCB9IGZyb20gJy4uLy4uL2xpYi9sb2dnaW5nJztcbmltcG9ydCB0eXBlIHsgSUNsb3VkRm9ybWF0aW9uQ2xpZW50LCBTZGtQcm92aWRlciB9IGZyb20gJy4uL2FwaS9hd3MtYXV0aCc7XG5pbXBvcnQgeyBDbG91ZEZvcm1hdGlvblN0YWNrIH0gZnJvbSAnLi4vYXBpL3V0aWwvY2xvdWRmb3JtYXRpb24nO1xuaW1wb3J0IHsgemlwRGlyZWN0b3J5IH0gZnJvbSAnLi4vdXRpbC9hcmNoaXZlJztcbmNvbnN0IGNhbWVsQ2FzZSA9IHJlcXVpcmUoJ2NhbWVsY2FzZScpO1xuY29uc3QgZGVjYW1lbGl6ZSA9IHJlcXVpcmUoJ2RlY2FtZWxpemUnKTtcbi8qKiBUaGUgbGlzdCBvZiBsYW5ndWFnZXMgc3VwcG9ydGVkIGJ5IHRoZSBidWlsdC1pbiBub2N0aWx1Y2VudCBiaW5hcnkuICovXG5leHBvcnQgY29uc3QgTUlHUkFURV9TVVBQT1JURURfTEFOR1VBR0VTOiByZWFkb25seSBzdHJpbmdbXSA9IGNka19mcm9tX2Nmbi5zdXBwb3J0ZWRfbGFuZ3VhZ2VzKCk7XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgQ0RLIGFwcCBmcm9tIGEgeWFtbCBvciBqc29uIHRlbXBsYXRlLlxuICpcbiAqIEBwYXJhbSBzdGFja05hbWUgVGhlIG5hbWUgdG8gYXNzaWduIHRvIHRoZSBzdGFjayBpbiB0aGUgZ2VuZXJhdGVkIGFwcFxuICogQHBhcmFtIHN0YWNrIFRoZSB5YW1sIG9yIGpzb24gdGVtcGxhdGUgZm9yIHRoZSBzdGFja1xuICogQHBhcmFtIGxhbmd1YWdlIFRoZSBsYW5ndWFnZSB0byBnZW5lcmF0ZSB0aGUgQ0RLIGFwcCBpblxuICogQHBhcmFtIG91dHB1dFBhdGggVGhlIHBhdGggYXQgd2hpY2ggdG8gZ2VuZXJhdGUgdGhlIENESyBhcHBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlQ2RrQXBwKFxuICBzdGFja05hbWU6IHN0cmluZyxcbiAgc3RhY2s6IHN0cmluZyxcbiAgbGFuZ3VhZ2U6IHN0cmluZyxcbiAgb3V0cHV0UGF0aD86IHN0cmluZyxcbiAgY29tcHJlc3M/OiBib29sZWFuLFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHJlc29sdmVkT3V0cHV0UGF0aCA9IHBhdGguam9pbihvdXRwdXRQYXRoID8/IHByb2Nlc3MuY3dkKCksIHN0YWNrTmFtZSk7XG4gIGNvbnN0IGZvcm1hdHRlZFN0YWNrTmFtZSA9IGRlY2FtZWxpemUoc3RhY2tOYW1lKTtcblxuICB0cnkge1xuICAgIGZzLnJtU3luYyhyZXNvbHZlZE91dHB1dFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICBmcy5ta2RpclN5bmMocmVzb2x2ZWRPdXRwdXRQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBjb25zdCBnZW5lcmF0ZU9ubHkgPSBjb21wcmVzcztcbiAgICBhd2FpdCBjbGlJbml0KHtcbiAgICAgIHR5cGU6ICdhcHAnLFxuICAgICAgbGFuZ3VhZ2UsXG4gICAgICBjYW5Vc2VOZXR3b3JrOiB0cnVlLFxuICAgICAgZ2VuZXJhdGVPbmx5LFxuICAgICAgd29ya0RpcjogcmVzb2x2ZWRPdXRwdXRQYXRoLFxuICAgICAgc3RhY2tOYW1lLFxuICAgICAgbWlncmF0ZTogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGxldCBzdGFja0ZpbGVOYW1lOiBzdHJpbmc7XG4gICAgc3dpdGNoIChsYW5ndWFnZSkge1xuICAgICAgY2FzZSAndHlwZXNjcmlwdCc6XG4gICAgICAgIHN0YWNrRmlsZU5hbWUgPSBgJHtyZXNvbHZlZE91dHB1dFBhdGh9L2xpYi8ke2Zvcm1hdHRlZFN0YWNrTmFtZX0tc3RhY2sudHNgO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2phdmEnOlxuICAgICAgICBzdGFja0ZpbGVOYW1lID0gYCR7cmVzb2x2ZWRPdXRwdXRQYXRofS9zcmMvbWFpbi9qYXZhL2NvbS9teW9yZy8ke2NhbWVsQ2FzZShmb3JtYXR0ZWRTdGFja05hbWUsIHsgcGFzY2FsQ2FzZTogdHJ1ZSB9KX1TdGFjay5qYXZhYDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdweXRob24nOlxuICAgICAgICBzdGFja0ZpbGVOYW1lID0gYCR7cmVzb2x2ZWRPdXRwdXRQYXRofS8ke2Zvcm1hdHRlZFN0YWNrTmFtZS5yZXBsYWNlKC8tL2csICdfJyl9LyR7Zm9ybWF0dGVkU3RhY2tOYW1lLnJlcGxhY2UoLy0vZywgJ18nKX1fc3RhY2sucHlgO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2NzaGFycCc6XG4gICAgICAgIHN0YWNrRmlsZU5hbWUgPSBgJHtyZXNvbHZlZE91dHB1dFBhdGh9L3NyYy8ke2NhbWVsQ2FzZShmb3JtYXR0ZWRTdGFja05hbWUsIHsgcGFzY2FsQ2FzZTogdHJ1ZSB9KX0vJHtjYW1lbENhc2UoZm9ybWF0dGVkU3RhY2tOYW1lLCB7IHBhc2NhbENhc2U6IHRydWUgfSl9U3RhY2suY3NgO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2dvJzpcbiAgICAgICAgc3RhY2tGaWxlTmFtZSA9IGAke3Jlc29sdmVkT3V0cHV0UGF0aH0vJHtmb3JtYXR0ZWRTdGFja05hbWV9LmdvYDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYCR7bGFuZ3VhZ2V9IGlzIG5vdCBzdXBwb3J0ZWQgYnkgQ0RLIE1pZ3JhdGUuIFBsZWFzZSBjaG9vc2UgZnJvbTogJHtNSUdSQVRFX1NVUFBPUlRFRF9MQU5HVUFHRVMuam9pbignLCAnKX1gLFxuICAgICAgICApO1xuICAgIH1cbiAgICBmcy53cml0ZUZpbGVTeW5jKHN0YWNrRmlsZU5hbWUsIHN0YWNrKTtcbiAgICBpZiAoY29tcHJlc3MpIHtcbiAgICAgIGF3YWl0IHppcERpcmVjdG9yeShyZXNvbHZlZE91dHB1dFBhdGgsIGAke3Jlc29sdmVkT3V0cHV0UGF0aH0uemlwYCk7XG4gICAgICBmcy5ybVN5bmMocmVzb2x2ZWRPdXRwdXRQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGZzLnJtU3luYyhyZXNvbHZlZE91dHB1dFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBhIENESyBzdGFjayBmaWxlLlxuICogQHBhcmFtIHRlbXBsYXRlIFRoZSB0ZW1wbGF0ZSB0byB0cmFuc2xhdGUgaW50byBhIENESyBzdGFja1xuICogQHBhcmFtIHN0YWNrTmFtZSBUaGUgbmFtZSB0byBhc3NpZ24gdG8gdGhlIHN0YWNrXG4gKiBAcGFyYW0gbGFuZ3VhZ2UgVGhlIGxhbmd1YWdlIHRvIGdlbmVyYXRlIHRoZSBzdGFjayBpblxuICogQHJldHVybnMgQSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBDREsgc3RhY2sgZmlsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVTdGFjayh0ZW1wbGF0ZTogc3RyaW5nLCBzdGFja05hbWU6IHN0cmluZywgbGFuZ3VhZ2U6IHN0cmluZykge1xuICBjb25zdCBmb3JtYXR0ZWRTdGFja05hbWUgPSBgJHtjYW1lbENhc2UoZGVjYW1lbGl6ZShzdGFja05hbWUpLCB7IHBhc2NhbENhc2U6IHRydWUgfSl9U3RhY2tgO1xuICB0cnkge1xuICAgIHJldHVybiBjZGtfZnJvbV9jZm4udHJhbnNtdXRlKHRlbXBsYXRlLCBsYW5ndWFnZSwgZm9ybWF0dGVkU3RhY2tOYW1lKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtmb3JtYXR0ZWRTdGFja05hbWV9IGNvdWxkIG5vdCBiZSBnZW5lcmF0ZWQgYmVjYXVzZSAkeyhlIGFzIEVycm9yKS5tZXNzYWdlfWApO1xuICB9XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHJldHVybnMgYSBzdGFjayB0ZW1wbGF0ZSBmcm9tIGEgbG9jYWwgcGF0aC5cbiAqXG4gKiBAcGFyYW0gaW5wdXRQYXRoIFRoZSBsb2NhdGlvbiBvZiB0aGUgdGVtcGxhdGVcbiAqIEByZXR1cm5zIEEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0ZW1wbGF0ZSBpZiBwcmVzZW50LCBvdGhlcndpc2UgdW5kZWZpbmVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkRnJvbVBhdGgoaW5wdXRQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcmVhZEZpbGU6IHN0cmluZztcbiAgdHJ5IHtcbiAgICByZWFkRmlsZSA9IGZzLnJlYWRGaWxlU3luYyhpbnB1dFBhdGgsICd1dGY4Jyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCcke2lucHV0UGF0aH0nIGlzIG5vdCBhIHZhbGlkIHBhdGguYCk7XG4gIH1cbiAgaWYgKHJlYWRGaWxlID09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDbG91ZGZvcm1hdGlvbiB0ZW1wbGF0ZSBmaWxlcGF0aDogJyR7aW5wdXRQYXRofScgaXMgYW4gZW1wdHkgZmlsZS5gKTtcbiAgfVxuICByZXR1cm4gcmVhZEZpbGU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHJldHVybnMgYSBzdGFjayB0ZW1wbGF0ZSBmcm9tIGEgZGVwbG95ZWQgQ2xvdWRGb3JtYXRpb24gc3RhY2suXG4gKlxuICogQHBhcmFtIHN0YWNrTmFtZSBUaGUgbmFtZSBvZiB0aGUgc3RhY2tcbiAqIEBwYXJhbSBzZGtQcm92aWRlciBUaGUgc2RrIHByb3ZpZGVyIGZvciBtYWtpbmcgQ2xvdWRGb3JtYXRpb24gY2FsbHNcbiAqIEBwYXJhbSBlbnZpcm9ubWVudCBUaGUgYWNjb3VudCBhbmQgcmVnaW9uIHdoZXJlIHRoZSBzdGFjayBpcyBkZXBsb3llZFxuICogQHJldHVybnMgQSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRlbXBsYXRlIGlmIHByZXNlbnQsIG90aGVyd2lzZSB1bmRlZmluZWRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRGcm9tU3RhY2soXG4gIHN0YWNrTmFtZTogc3RyaW5nLFxuICBzZGtQcm92aWRlcjogU2RrUHJvdmlkZXIsXG4gIGVudmlyb25tZW50OiBFbnZpcm9ubWVudCxcbik6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gIGNvbnN0IGNsb3VkRm9ybWF0aW9uID0gKGF3YWl0IHNka1Byb3ZpZGVyLmZvckVudmlyb25tZW50KGVudmlyb25tZW50LCAwIHNhdGlzZmllcyBGb3JSZWFkaW5nKSkuc2RrLmNsb3VkRm9ybWF0aW9uKCk7XG5cbiAgY29uc3Qgc3RhY2sgPSBhd2FpdCBDbG91ZEZvcm1hdGlvblN0YWNrLmxvb2t1cChjbG91ZEZvcm1hdGlvbiwgc3RhY2tOYW1lLCB0cnVlKTtcbiAgaWYgKHN0YWNrLnN0YWNrU3RhdHVzLmlzRGVwbG95U3VjY2VzcyB8fCBzdGFjay5zdGFja1N0YXR1cy5pc1JvbGxiYWNrU3VjY2Vzcykge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhd2FpdCBzdGFjay50ZW1wbGF0ZSgpKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgU3RhY2sgJyR7c3RhY2tOYW1lfScgaW4gYWNjb3VudCAke2Vudmlyb25tZW50LmFjY291bnR9IGFuZCByZWdpb24gJHtlbnZpcm9ubWVudC5yZWdpb259IGhhcyBhIHN0YXR1cyBvZiAnJHtzdGFjay5zdGFja1N0YXR1cy5uYW1lfScgZHVlIHRvICcke3N0YWNrLnN0YWNrU3RhdHVzLnJlYXNvbn0nLiBUaGUgc3RhY2sgY2Fubm90IGJlIG1pZ3JhdGVkIHVudGlsIGl0IGlzIGluIGEgaGVhbHRoeSBzdGF0ZS5gLFxuICAgICk7XG4gIH1cbn1cblxuLyoqXG4gKiBUYWtlcyBpbiBhIHN0YWNrIG5hbWUgYW5kIGFjY291bnQgYW5kIHJlZ2lvbiBhbmQgcmV0dXJucyBhIGdlbmVyYXRlZCBjbG91ZGZvcm1hdGlvbiB0ZW1wbGF0ZSB1c2luZyB0aGUgY2xvdWRmb3JtYXRpb25cbiAqIHRlbXBsYXRlIGdlbmVyYXRvci5cbiAqXG4gKiBAcGFyYW0gR2VuZXJhdGVUZW1wbGF0ZU9wdGlvbnMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHN0YWNrIG5hbWUsIGZpbHRlcnMsIHNka1Byb3ZpZGVyLCBlbnZpcm9ubWVudCwgYW5kIG5ld1NjYW4gZmxhZ1xuICogQHJldHVybnMgYSBnZW5lcmF0ZWQgY2xvdWRmb3JtYXRpb24gdGVtcGxhdGVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlVGVtcGxhdGUob3B0aW9uczogR2VuZXJhdGVUZW1wbGF0ZU9wdGlvbnMpOiBQcm9taXNlPEdlbmVyYXRlVGVtcGxhdGVPdXRwdXQ+IHtcbiAgY29uc3QgY2ZuID0gbmV3IENmblRlbXBsYXRlR2VuZXJhdG9yUHJvdmlkZXIoYXdhaXQgYnVpbGRDZm5DbGllbnQob3B0aW9ucy5zZGtQcm92aWRlciwgb3B0aW9ucy5lbnZpcm9ubWVudCkpO1xuXG4gIGNvbnN0IHNjYW5JZCA9IGF3YWl0IGZpbmRMYXN0U3VjY2Vzc2Z1bFNjYW4oY2ZuLCBvcHRpb25zKTtcblxuICAvLyBpZiBhIGN1c3RvbWVyIGFjY2lkZW50YWxseSBjdHJsLWMncyBvdXQgb2YgdGhlIGNvbW1hbmQgYW5kIHJ1bnMgaXQgYWdhaW4sIHRoaXMgd2lsbCBjb250aW51ZSB0aGUgcHJvZ3Jlc3MgYmFyIHdoZXJlIGl0IGxlZnQgb2ZmXG4gIGNvbnN0IGN1clNjYW4gPSBhd2FpdCBjZm4uZGVzY3JpYmVSZXNvdXJjZVNjYW4oc2NhbklkKTtcbiAgaWYgKGN1clNjYW4uU3RhdHVzID09IFNjYW5TdGF0dXMuSU5fUFJPR1JFU1MpIHtcbiAgICBwcmludCgnUmVzb3VyY2Ugc2NhbiBpbiBwcm9ncmVzcy4gUGxlYXNlIHdhaXQsIHRoaXMgY2FuIHRha2UgMTAgbWludXRlcyBvciBsb25nZXIuJyk7XG4gICAgYXdhaXQgc2NhblByb2dyZXNzQmFyKHNjYW5JZCwgY2ZuKTtcbiAgfVxuXG4gIGRpc3BsYXlUaW1lRGlmZihuZXcgRGF0ZSgpLCBuZXcgRGF0ZShjdXJTY2FuLlN0YXJ0VGltZSEpKTtcblxuICBsZXQgcmVzb3VyY2VzOiBTY2FubmVkUmVzb3VyY2VbXSA9IGF3YWl0IGNmbi5saXN0UmVzb3VyY2VTY2FuUmVzb3VyY2VzKHNjYW5JZCEsIG9wdGlvbnMuZmlsdGVycyk7XG5cbiAgcHJpbnQoJ2ZpbmRpbmcgcmVsYXRlZCByZXNvdXJjZXMuJyk7XG4gIGxldCByZWxhdGVkUmVzb3VyY2VzID0gYXdhaXQgY2ZuLmdldFJlc291cmNlU2NhblJlbGF0ZWRSZXNvdXJjZXMoc2NhbklkISwgcmVzb3VyY2VzKTtcblxuICBwcmludChgRm91bmQgJHtyZWxhdGVkUmVzb3VyY2VzLmxlbmd0aH0gcmVzb3VyY2VzLmApO1xuXG4gIHByaW50KCdHZW5lcmF0aW5nIENGTiB0ZW1wbGF0ZSBmcm9tIHNjYW5uZWQgcmVzb3VyY2VzLicpO1xuICBjb25zdCB0ZW1wbGF0ZUFybiA9IChhd2FpdCBjZm4uY3JlYXRlR2VuZXJhdGVkVGVtcGxhdGUob3B0aW9ucy5zdGFja05hbWUsIHJlbGF0ZWRSZXNvdXJjZXMpKS5HZW5lcmF0ZWRUZW1wbGF0ZUlkITtcblxuICBsZXQgZ2VuZXJhdGVkVGVtcGxhdGUgPSBhd2FpdCBjZm4uZGVzY3JpYmVHZW5lcmF0ZWRUZW1wbGF0ZSh0ZW1wbGF0ZUFybik7XG5cbiAgcHJpbnQoJ1BsZWFzZSB3YWl0LCB0ZW1wbGF0ZSBjcmVhdGlvbiBpbiBwcm9ncmVzcy4gVGhpcyBtYXkgdGFrZSBhIGNvdXBsZSBtaW51dGVzLicpO1xuICB3aGlsZSAoZ2VuZXJhdGVkVGVtcGxhdGUuU3RhdHVzICE9PSBTY2FuU3RhdHVzLkNPTVBMRVRFICYmIGdlbmVyYXRlZFRlbXBsYXRlLlN0YXR1cyAhPT0gU2NhblN0YXR1cy5GQUlMRUQpIHtcbiAgICBhd2FpdCBwcmludERvdHMoYFske2dlbmVyYXRlZFRlbXBsYXRlLlN0YXR1c31dIFRlbXBsYXRlIENyZWF0aW9uIGluIFByb2dyZXNzYCwgNDAwKTtcbiAgICBnZW5lcmF0ZWRUZW1wbGF0ZSA9IGF3YWl0IGNmbi5kZXNjcmliZUdlbmVyYXRlZFRlbXBsYXRlKHRlbXBsYXRlQXJuKTtcbiAgfVxuICBwcmludCgnJyk7XG4gIHByaW50KCdUZW1wbGF0ZSBzdWNjZXNzZnVsbHkgZ2VuZXJhdGVkIScpO1xuICByZXR1cm4gYnVpbGRHZW5lcnRlZFRlbXBsYXRlT3V0cHV0KFxuICAgIGdlbmVyYXRlZFRlbXBsYXRlLFxuICAgIChhd2FpdCBjZm4uZ2V0R2VuZXJhdGVkVGVtcGxhdGUodGVtcGxhdGVBcm4pKS5UZW1wbGF0ZUJvZHkhLFxuICAgIHRlbXBsYXRlQXJuLFxuICApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmaW5kTGFzdFN1Y2Nlc3NmdWxTY2FuKFxuICBjZm46IENmblRlbXBsYXRlR2VuZXJhdG9yUHJvdmlkZXIsXG4gIG9wdGlvbnM6IEdlbmVyYXRlVGVtcGxhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgbGV0IHJlc291cmNlU2NhblN1bW1hcmllczogUmVzb3VyY2VTY2FuU3VtbWFyeVtdIHwgdW5kZWZpbmVkID0gW107XG4gIGNvbnN0IGNsaWVudFJlcXVlc3RUb2tlbiA9IGBjZGstbWlncmF0ZS0ke29wdGlvbnMuZW52aXJvbm1lbnQuYWNjb3VudH0tJHtvcHRpb25zLmVudmlyb25tZW50LnJlZ2lvbn1gO1xuICBpZiAob3B0aW9ucy5mcm9tU2NhbiA9PT0gRnJvbVNjYW4uTkVXKSB7XG4gICAgcHJpbnQoYFN0YXJ0aW5nIG5ldyBzY2FuIGZvciBhY2NvdW50ICR7b3B0aW9ucy5lbnZpcm9ubWVudC5hY2NvdW50fSBpbiByZWdpb24gJHtvcHRpb25zLmVudmlyb25tZW50LnJlZ2lvbn1gKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgY2ZuLnN0YXJ0UmVzb3VyY2VTY2FuKGNsaWVudFJlcXVlc3RUb2tlbik7XG4gICAgICByZXNvdXJjZVNjYW5TdW1tYXJpZXMgPSAoYXdhaXQgY2ZuLmxpc3RSZXNvdXJjZVNjYW5zKCkpLlJlc291cmNlU2NhblN1bW1hcmllcztcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBjb250aW51aW5nIGhlcmUgYmVjYXVzZSBpZiB0aGUgc2NhbiBmYWlscyBvbiBhIG5ldy1zY2FuIGl0IGlzIHZlcnkgbGlrZWx5IGJlY2F1c2UgdGhlcmUgaXMgZWl0aGVyIGFscmVhZHkgYSBzY2FuIGluIHByb2dyZXNzXG4gICAgICAvLyBvciB0aGUgY3VzdG9tZXIgaGl0IGEgcmF0ZSBsaW1pdC4gSW4gZWl0aGVyIGNhc2Ugd2Ugd2FudCB0byBjb250aW51ZSB3aXRoIHRoZSBtb3N0IHJlY2VudCBzY2FuLlxuICAgICAgLy8gSWYgdGhpcyBoYXBwZW5zIHRvIGZhaWwgZm9yIGEgY3JlZGVudGlhbCBlcnJvciB0aGVuIHRoYXQgd2lsbCBiZSBjYXVnaHQgaW1tZWRpYXRlbHkgYWZ0ZXIgYW55d2F5LlxuICAgICAgcHJpbnQoYFNjYW4gZmFpbGVkIHRvIHN0YXJ0IGR1ZSB0byBlcnJvciAnJHsoZSBhcyBFcnJvcikubWVzc2FnZX0nLCBkZWZhdWx0aW5nIHRvIGxhdGVzdCBzY2FuLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXNvdXJjZVNjYW5TdW1tYXJpZXMgPSAoYXdhaXQgY2ZuLmxpc3RSZXNvdXJjZVNjYW5zKCkpLlJlc291cmNlU2NhblN1bW1hcmllcztcbiAgICBhd2FpdCBjZm4uY2hlY2tGb3JSZXNvdXJjZVNjYW4ocmVzb3VyY2VTY2FuU3VtbWFyaWVzLCBvcHRpb25zLCBjbGllbnRSZXF1ZXN0VG9rZW4pO1xuICB9XG4gIC8vIGdldCB0aGUgbGF0ZXN0IHNjYW4sIHdoaWNoIHdlIGtub3cgd2lsbCBleGlzdFxuICByZXNvdXJjZVNjYW5TdW1tYXJpZXMgPSAoYXdhaXQgY2ZuLmxpc3RSZXNvdXJjZVNjYW5zKCkpLlJlc291cmNlU2NhblN1bW1hcmllcztcbiAgbGV0IHNjYW5JZDogc3RyaW5nIHwgdW5kZWZpbmVkID0gcmVzb3VyY2VTY2FuU3VtbWFyaWVzIVswXS5SZXNvdXJjZVNjYW5JZDtcblxuICAvLyBmaW5kIHRoZSBtb3N0IHJlY2VudCBzY2FuIHRoYXQgaXNuJ3QgaW4gYSBmYWlsZWQgc3RhdGUgaW4gY2FzZSB3ZSBkaWRuJ3Qgc3RhcnQgYSBuZXcgb25lXG4gIGZvciAoY29uc3Qgc3VtbWFyeSBvZiByZXNvdXJjZVNjYW5TdW1tYXJpZXMhKSB7XG4gICAgaWYgKHN1bW1hcnkuU3RhdHVzICE9PSBTY2FuU3RhdHVzLkZBSUxFRCkge1xuICAgICAgc2NhbklkID0gc3VtbWFyeS5SZXNvdXJjZVNjYW5JZCE7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2NhbklkITtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHN0cmluZyBvZiBmaWx0ZXJzIGluIHRoZSBmb3JtYXQgb2Yga2V5MT12YWx1ZTEsa2V5Mj12YWx1ZTIgYW5kIHJldHVybnMgYSBtYXAgb2YgdGhlIGZpbHRlcnMuXG4gKlxuICogQHBhcmFtIGZpbHRlcnMgYSBzdHJpbmcgb2YgZmlsdGVycyBpbiB0aGUgZm9ybWF0IG9mIGtleTE9dmFsdWUxLGtleTI9dmFsdWUyXG4gKiBAcmV0dXJucyBhIG1hcCBvZiB0aGUgZmlsdGVyc1xuICovXG5mdW5jdGlvbiBwYXJzZUZpbHRlcnMoZmlsdGVyczogc3RyaW5nKToge1xuICBba2V5IGluIEZpbHRlclR5cGVdOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59IHtcbiAgaWYgKCFmaWx0ZXJzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdyZXNvdXJjZS1pZGVudGlmaWVyJzogdW5kZWZpbmVkLFxuICAgICAgJ3Jlc291cmNlLXR5cGUtcHJlZml4JzogdW5kZWZpbmVkLFxuICAgICAgJ3RhZy1rZXknOiB1bmRlZmluZWQsXG4gICAgICAndGFnLXZhbHVlJzogdW5kZWZpbmVkLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBmaWx0ZXJTaG9ydGhhbmRzOiB7IFtrZXk6IHN0cmluZ106IEZpbHRlclR5cGUgfSA9IHtcbiAgICAnaWRlbnRpZmllcic6IEZpbHRlclR5cGUuUkVTT1VSQ0VfSURFTlRJRklFUixcbiAgICAnaWQnOiBGaWx0ZXJUeXBlLlJFU09VUkNFX0lERU5USUZJRVIsXG4gICAgJ3R5cGUnOiBGaWx0ZXJUeXBlLlJFU09VUkNFX1RZUEVfUFJFRklYLFxuICAgICd0eXBlLXByZWZpeCc6IEZpbHRlclR5cGUuUkVTT1VSQ0VfVFlQRV9QUkVGSVgsXG4gIH07XG5cbiAgY29uc3QgZmlsdGVyTGlzdCA9IGZpbHRlcnMuc3BsaXQoJywnKTtcblxuICBsZXQgZmlsdGVyTWFwOiB7IFtrZXkgaW4gRmlsdGVyVHlwZV06IHN0cmluZyB8IHVuZGVmaW5lZCB9ID0ge1xuICAgIFtGaWx0ZXJUeXBlLlJFU09VUkNFX0lERU5USUZJRVJdOiB1bmRlZmluZWQsXG4gICAgW0ZpbHRlclR5cGUuUkVTT1VSQ0VfVFlQRV9QUkVGSVhdOiB1bmRlZmluZWQsXG4gICAgW0ZpbHRlclR5cGUuVEFHX0tFWV06IHVuZGVmaW5lZCxcbiAgICBbRmlsdGVyVHlwZS5UQUdfVkFMVUVdOiB1bmRlZmluZWQsXG4gIH07XG5cbiAgZm9yIChjb25zdCBmaWwgb2YgZmlsdGVyTGlzdCkge1xuICAgIGNvbnN0IGZpbHRlciA9IGZpbC5zcGxpdCgnPScpO1xuICAgIGxldCBmaWx0ZXJLZXkgPSBmaWx0ZXJbMF07XG4gICAgY29uc3QgZmlsdGVyVmFsdWUgPSBmaWx0ZXJbMV07XG4gICAgLy8gaWYgdGhlIGtleSBpcyBhIHNob3J0aGFuZCwgcmVwbGFjZSBpdCB3aXRoIHRoZSBmdWxsIG5hbWVcbiAgICBpZiAoZmlsdGVyS2V5IGluIGZpbHRlclNob3J0aGFuZHMpIHtcbiAgICAgIGZpbHRlcktleSA9IGZpbHRlclNob3J0aGFuZHNbZmlsdGVyS2V5XTtcbiAgICB9XG4gICAgaWYgKE9iamVjdC52YWx1ZXMoRmlsdGVyVHlwZSkuaW5jbHVkZXMoZmlsdGVyS2V5IGFzIGFueSkpIHtcbiAgICAgIGZpbHRlck1hcFtmaWx0ZXJLZXkgYXMga2V5b2YgdHlwZW9mIGZpbHRlck1hcF0gPSBmaWx0ZXJWYWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGZpbHRlcjogJHtmaWx0ZXJLZXl9YCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBmaWx0ZXJNYXA7XG59XG5cbi8qKlxuICogVGFrZXMgYSBsaXN0IG9mIGFueSB0eXBlIGFuZCBicmVha3MgaXQgdXAgaW50byBjaHVua3Mgb2YgYSBzcGVjaWZpZWQgc2l6ZS5cbiAqXG4gKiBAcGFyYW0gbGlzdCBUaGUgbGlzdCB0byBicmVhayB1cFxuICogQHBhcmFtIGNodW5rU2l6ZSBUaGUgc2l6ZSBvZiBlYWNoIGNodW5rXG4gKiBAcmV0dXJucyBBIGxpc3Qgb2YgbGlzdHMgb2YgdGhlIHNwZWNpZmllZCBzaXplXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjaHVua3MobGlzdDogYW55W10sIGNodW5rU2l6ZTogbnVtYmVyKTogYW55W11bXSB7XG4gIGNvbnN0IGNodW5rZWRMaXN0OiBhbnlbXVtdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkgKz0gY2h1bmtTaXplKSB7XG4gICAgY2h1bmtlZExpc3QucHVzaChsaXN0LnNsaWNlKGksIGkgKyBjaHVua1NpemUpKTtcbiAgfVxuICByZXR1cm4gY2h1bmtlZExpc3Q7XG59XG5cbi8qKlxuICogU2V0cyB0aGUgYWNjb3VudCBhbmQgcmVnaW9uIGZvciBtYWtpbmcgQ2xvdWRGb3JtYXRpb24gY2FsbHMuXG4gKiBAcGFyYW0gYWNjb3VudCBUaGUgYWNjb3VudCB0byB1c2VcbiAqIEBwYXJhbSByZWdpb24gVGhlIHJlZ2lvbiB0byB1c2VcbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBvYmplY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldEVudmlyb25tZW50KGFjY291bnQ/OiBzdHJpbmcsIHJlZ2lvbj86IHN0cmluZyk6IEVudmlyb25tZW50IHtcbiAgcmV0dXJuIHtcbiAgICBhY2NvdW50OiBhY2NvdW50ID8/IFVOS05PV05fQUNDT1VOVCxcbiAgICByZWdpb246IHJlZ2lvbiA/PyBVTktOT1dOX1JFR0lPTixcbiAgICBuYW1lOiAnY2RrLW1pZ3JhdGUtZW52JyxcbiAgfTtcbn1cblxuLyoqXG4gKiBFbnVtIGZvciB0aGUgc291cmNlIG9wdGlvbnMgZm9yIHRoZSB0ZW1wbGF0ZVxuICovXG5leHBvcnQgZW51bSBUZW1wbGF0ZVNvdXJjZU9wdGlvbnMge1xuICBQQVRIID0gJ3BhdGgnLFxuICBTVEFDSyA9ICdzdGFjaycsXG4gIFNDQU4gPSAnc2NhbicsXG59XG5cbi8qKlxuICogQW4gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgc291cmNlIG9mIGEgdGVtcGxhdGUuXG4gKi9cbnR5cGUgVGVtcGxhdGVTb3VyY2UgPVxuICB8IHsgc291cmNlOiBUZW1wbGF0ZVNvdXJjZU9wdGlvbnMuU0NBTiB9XG4gIHwgeyBzb3VyY2U6IFRlbXBsYXRlU291cmNlT3B0aW9ucy5QQVRIOyB0ZW1wbGF0ZVBhdGg6IHN0cmluZyB9XG4gIHwgeyBzb3VyY2U6IFRlbXBsYXRlU291cmNlT3B0aW9ucy5TVEFDSzsgc3RhY2tOYW1lOiBzdHJpbmcgfTtcblxuLyoqXG4gKiBFbnVtIGZvciB0aGUgc3RhdHVzIG9mIGEgcmVzb3VyY2Ugc2NhblxuICovXG5leHBvcnQgZW51bSBTY2FuU3RhdHVzIHtcbiAgSU5fUFJPR1JFU1MgPSAnSU5fUFJPR1JFU1MnLFxuICBDT01QTEVURSA9ICdDT01QTEVURScsXG4gIEZBSUxFRCA9ICdGQUlMRUQnLFxufVxuXG5leHBvcnQgZW51bSBGaWx0ZXJUeXBlIHtcbiAgUkVTT1VSQ0VfSURFTlRJRklFUiA9ICdyZXNvdXJjZS1pZGVudGlmaWVyJyxcbiAgUkVTT1VSQ0VfVFlQRV9QUkVGSVggPSAncmVzb3VyY2UtdHlwZS1wcmVmaXgnLFxuICBUQUdfS0VZID0gJ3RhZy1rZXknLFxuICBUQUdfVkFMVUUgPSAndGFnLXZhbHVlJyxcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBleGFjdGx5IG9uZSBzb3VyY2Ugb3B0aW9uIGhhcyBiZWVuIHByb3ZpZGVkLlxuICogQHBhcmFtIGZyb21QYXRoIFRoZSBjb250ZW50IG9mIHRoZSBmbGFnIGAtLWZyb20tcGF0aGBcbiAqIEBwYXJhbSBmcm9tU3RhY2sgdGhlIGNvbnRlbnQgb2YgdGhlIGZsYWcgYC0tZnJvbS1zdGFja2BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU291cmNlT3B0aW9ucyhmcm9tUGF0aD86IHN0cmluZywgZnJvbVN0YWNrPzogYm9vbGVhbiwgc3RhY2tOYW1lPzogc3RyaW5nKTogVGVtcGxhdGVTb3VyY2Uge1xuICBpZiAoZnJvbVBhdGggJiYgZnJvbVN0YWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdPbmx5IG9uZSBvZiBgLS1mcm9tLXBhdGhgIG9yIGAtLWZyb20tc3RhY2tgIG1heSBiZSBwcm92aWRlZC4nKTtcbiAgfVxuICBpZiAoIXN0YWNrTmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignYC0tc3RhY2stbmFtZWAgaXMgYSByZXF1aXJlZCBmaWVsZC4nKTtcbiAgfVxuICBpZiAoIWZyb21QYXRoICYmICFmcm9tU3RhY2spIHtcbiAgICByZXR1cm4geyBzb3VyY2U6IFRlbXBsYXRlU291cmNlT3B0aW9ucy5TQ0FOIH07XG4gIH1cbiAgaWYgKGZyb21QYXRoKSB7XG4gICAgcmV0dXJuIHsgc291cmNlOiBUZW1wbGF0ZVNvdXJjZU9wdGlvbnMuUEFUSCwgdGVtcGxhdGVQYXRoOiBmcm9tUGF0aCB9O1xuICB9XG4gIHJldHVybiB7IHNvdXJjZTogVGVtcGxhdGVTb3VyY2VPcHRpb25zLlNUQUNLLCBzdGFja05hbWU6IHN0YWNrTmFtZSEgfTtcbn1cblxuLyoqXG4gKiBUYWtlcyBhIHNldCBvZiByZXNvdXJjZXMgYW5kIHJlbW92ZXMgYW55IHdpdGggdGhlIG1hbmFnZWRieXN0YWNrIGZsYWcgc2V0IHRvIHRydWUuXG4gKlxuICogQHBhcmFtIHJlc291cmNlTGlzdCB0aGUgbGlzdCBvZiByZXNvdXJjZXMgcHJvdmlkZWQgYnkgdGhlIGxpc3Qgc2Nhbm5lZCByZXNvdXJjZXMgY2FsbHNcbiAqIEByZXR1cm5zIGEgbGlzdCBvZiByZXNvdXJjZXMgbm90IG1hbmFnZWQgYnkgY2ZuIHN0YWNrc1xuICovXG5mdW5jdGlvbiBleGNsdWRlTWFuYWdlZChyZXNvdXJjZUxpc3Q6IFNjYW5uZWRSZXNvdXJjZVtdKTogU2Nhbm5lZFJlc291cmNlSWRlbnRpZmllcltdIHtcbiAgcmV0dXJuIHJlc291cmNlTGlzdFxuICAgIC5maWx0ZXIoKHIpID0+ICFyLk1hbmFnZWRCeVN0YWNrKVxuICAgIC5tYXAoKHIpID0+ICh7XG4gICAgICBSZXNvdXJjZVR5cGU6IHIuUmVzb3VyY2VUeXBlISxcbiAgICAgIFJlc291cmNlSWRlbnRpZmllcjogci5SZXNvdXJjZUlkZW50aWZpZXIhLFxuICAgIH0pKTtcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm1zIGEgbGlzdCBvZiByZXNvdXJjZXMgaW50byBhIGxpc3Qgb2YgcmVzb3VyY2UgaWRlbnRpZmllcnMgYnkgcmVtb3ZpbmcgdGhlIE1hbmFnZWRCeVN0YWNrIGZsYWcuXG4gKiBTZXR0aW5nIHRoZSB2YWx1ZSBvZiB0aGUgZmllbGQgdG8gdW5kZWZpbmVkIGVmZmVjdGl2ZWx5IHJlbW92ZXMgaXQgZnJvbSB0aGUgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSByZXNvdXJjZUxpc3QgdGhlIGxpc3Qgb2YgcmVzb3VyY2VzIHByb3ZpZGVkIGJ5IHRoZSBsaXN0IHNjYW5uZWQgcmVzb3VyY2VzIGNhbGxzXG4gKiBAcmV0dXJucyBhIGxpc3Qgb2YgU2Nhbm5lZFJlc291cmNlSWRlbnRpZmllcltdXG4gKi9cbmZ1bmN0aW9uIHJlc291cmNlSWRlbnRpZmllcnMocmVzb3VyY2VMaXN0OiBTY2FubmVkUmVzb3VyY2VbXSk6IFNjYW5uZWRSZXNvdXJjZUlkZW50aWZpZXJbXSB7XG4gIGNvbnN0IGlkZW50aWZpZXJzOiBTY2FubmVkUmVzb3VyY2VJZGVudGlmaWVyW10gPSBbXTtcbiAgcmVzb3VyY2VMaXN0LmZvckVhY2goKHIpID0+IHtcbiAgICBjb25zdCBpZGVudGlmaWVyOiBTY2FubmVkUmVzb3VyY2VJZGVudGlmaWVyID0ge1xuICAgICAgUmVzb3VyY2VUeXBlOiByLlJlc291cmNlVHlwZSEsXG4gICAgICBSZXNvdXJjZUlkZW50aWZpZXI6IHIuUmVzb3VyY2VJZGVudGlmaWVyISxcbiAgICB9O1xuICAgIGlkZW50aWZpZXJzLnB1c2goaWRlbnRpZmllcik7XG4gIH0pO1xuICByZXR1cm4gaWRlbnRpZmllcnM7XG59XG5cbi8qKlxuICogVGFrZXMgYSBzY2FuIGlkIGFuZCBtYWludGFpbnMgYSBwcm9ncmVzcyBiYXIgdG8gZGlzcGxheSB0aGUgcHJvZ3Jlc3Mgb2YgYSBzY2FuIHRvIHRoZSB1c2VyLlxuICpcbiAqIEBwYXJhbSBzY2FuSWQgQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBzY2FuIGlkXG4gKiBAcGFyYW0gY2xvdWRGb3JtYXRpb24gVGhlIENsb3VkRm9ybWF0aW9uIHNkayBjbGllbnQgdG8gdXNlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzY2FuUHJvZ3Jlc3NCYXIoc2NhbklkOiBzdHJpbmcsIGNmbjogQ2ZuVGVtcGxhdGVHZW5lcmF0b3JQcm92aWRlcikge1xuICBsZXQgY3VyUHJvZ3Jlc3MgPSAwLjU7XG4gIC8vIHdlIGtub3cgaXQncyBpbiBwcm9ncmVzcyBpbml0aWFsbHkgc2luY2Ugd2Ugd291bGRuJ3QgaGF2ZSBnb3R0ZW4gaGVyZSBpZiBpdCB3YXNuJ3RcbiAgbGV0IGN1clNjYW46IERlc2NyaWJlUmVzb3VyY2VTY2FuQ29tbWFuZE91dHB1dCA9IHtcbiAgICBTdGF0dXM6IFNjYW5TdGF0dXMuSU5fUFJPR1JFU1MsXG4gICAgJG1ldGFkYXRhOiB7fSxcbiAgfTtcbiAgd2hpbGUgKGN1clNjYW4uU3RhdHVzID09IFNjYW5TdGF0dXMuSU5fUFJPR1JFU1MpIHtcbiAgICBjdXJTY2FuID0gYXdhaXQgY2ZuLmRlc2NyaWJlUmVzb3VyY2VTY2FuKHNjYW5JZCk7XG4gICAgY3VyUHJvZ3Jlc3MgPSBjdXJTY2FuLlBlcmNlbnRhZ2VDb21wbGV0ZWQgPz8gY3VyUHJvZ3Jlc3M7XG4gICAgcHJpbnRCYXIoMzAsIGN1clByb2dyZXNzKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDAwKSk7XG4gIH1cbiAgcHJpbnQoJycpO1xuICBwcmludCgn4pyFIFNjYW4gQ29tcGxldGUhJyk7XG59XG5cbi8qKlxuICogUHJpbnRzIGEgcHJvZ3Jlc3MgYmFyIHRvIHRoZSBjb25zb2xlLiBUbyBiZSB1c2VkIGluIGEgd2hpbGUgbG9vcCB0byBzaG93IHByb2dyZXNzIG9mIGEgbG9uZyBydW5uaW5nIHRhc2suXG4gKiBUaGUgcHJvZ3Jlc3MgYmFyIGRlbGV0ZXMgdGhlIGN1cnJlbnQgbGluZSBvbiB0aGUgY29uc29sZSBhbmQgcmV3cml0ZXMgaXQgd2l0aCB0aGUgcHJvZ3Jlc3MgYW1vdW50LlxuICpcbiAqIEBwYXJhbSB3aWR0aCBUaGUgd2lkdGggb2YgdGhlIHByb2dyZXNzIGJhclxuICogQHBhcmFtIHByb2dyZXNzIFRoZSBjdXJyZW50IHByb2dyZXNzIHRvIGRpc3BsYXkgYXMgYSBwZXJjZW50YWdlIG9mIDEwMFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRCYXIod2lkdGg6IG51bWJlciwgcHJvZ3Jlc3M6IG51bWJlcikge1xuICBpZiAoIXByb2Nlc3MuZW52Lk1JR1JBVEVfSU5URUdfVEVTVCkge1xuICAgIGNvbnN0IEZVTExfQkxPQ0sgPSAn4paIJztcbiAgICBjb25zdCBQQVJUSUFMX0JMT0NLID0gWycnLCAn4paPJywgJ+KWjicsICfilo0nLCAn4paMJywgJ+KWiycsICfiloonLCAn4paJJ107XG4gICAgY29uc3QgZnJhY3Rpb24gPSBNYXRoLm1pbihwcm9ncmVzcyAvIDEwMCwgMSk7XG4gICAgY29uc3QgaW5uZXJXaWR0aCA9IE1hdGgubWF4KDEsIHdpZHRoIC0gMik7XG4gICAgY29uc3QgY2hhcnMgPSBpbm5lcldpZHRoICogZnJhY3Rpb247XG4gICAgY29uc3QgcmVtYWluZGVyID0gY2hhcnMgLSBNYXRoLmZsb29yKGNoYXJzKTtcblxuICAgIGNvbnN0IGZ1bGxDaGFycyA9IEZVTExfQkxPQ0sucmVwZWF0KE1hdGguZmxvb3IoY2hhcnMpKTtcbiAgICBjb25zdCBwYXJ0aWFsQ2hhciA9IFBBUlRJQUxfQkxPQ0tbTWF0aC5mbG9vcihyZW1haW5kZXIgKiBQQVJUSUFMX0JMT0NLLmxlbmd0aCldO1xuICAgIGNvbnN0IGZpbGxlciA9ICfCtycucmVwZWF0KGlubmVyV2lkdGggLSBNYXRoLmZsb29yKGNoYXJzKSAtIChwYXJ0aWFsQ2hhciA/IDEgOiAwKSk7XG5cbiAgICBjb25zdCBjb2xvciA9IGNoYWxrLmdyZWVuO1xuXG4gICAgcmV3cml0ZUxpbmUoJ1snICsgY29sb3IoZnVsbENoYXJzICsgcGFydGlhbENoYXIpICsgZmlsbGVyICsgYF0gKCR7cHJvZ3Jlc3N9JSlgKTtcbiAgfVxufVxuXG4vKipcbiAqIFByaW50cyBhIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgd2l0aCBhIHNlcmllcyBwZXJpb2RzIGFwcGVuZGVkIHRvIGl0LiBUbyBiZSB1c2VkIGluIGEgd2hpbGUgbG9vcCB0byBzaG93IHByb2dyZXNzIG9mIGEgbG9uZyBydW5uaW5nIHRhc2suXG4gKiBUaGUgbWVzc2FnZSBkZWxldGVzIHRoZSBjdXJyZW50IGxpbmUgYW5kIHJld3JpdGVzIGl0IHNldmVyYWwgdGltZXMgdG8gZGlzcGxheSAxLTMgcGVyaW9kcyB0byBzaG93IHRoZSB1c2VyIHRoYXQgdGhlIHRhc2sgaXMgc3RpbGwgcnVubmluZy5cbiAqXG4gKiBAcGFyYW0gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBkaXNwbGF5XG4gKiBAcGFyYW0gdGltZW91dHg0IFRoZSBhbW91bnQgb2YgdGltZSB0byB3YWl0IGJlZm9yZSBwcmludGluZyB0aGUgbmV4dCBwZXJpb2RcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByaW50RG90cyhtZXNzYWdlOiBzdHJpbmcsIHRpbWVvdXR4NDogbnVtYmVyKSB7XG4gIGlmICghcHJvY2Vzcy5lbnYuTUlHUkFURV9JTlRFR19URVNUKSB7XG4gICAgcmV3cml0ZUxpbmUobWVzc2FnZSArICcgLicpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHRpbWVvdXR4NCkpO1xuXG4gICAgcmV3cml0ZUxpbmUobWVzc2FnZSArICcgLi4nKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCB0aW1lb3V0eDQpKTtcblxuICAgIHJld3JpdGVMaW5lKG1lc3NhZ2UgKyAnIC4uLicpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHRpbWVvdXR4NCkpO1xuXG4gICAgcmV3cml0ZUxpbmUobWVzc2FnZSk7XG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgdGltZW91dHg0KSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXdyaXRlcyB0aGUgY3VycmVudCBsaW5lIG9uIHRoZSBjb25zb2xlIGFuZCB3cml0ZXMgYSBuZXcgbWVzc2FnZSB0byBpdC5cbiAqIFRoaXMgaXMgYSBoZWxwZXIgZnVuY2l0b24gZm9yIHByaW50RG90cyBhbmQgcHJpbnRCYXIuXG4gKlxuICogQHBhcmFtIG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gZGlzcGxheVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmV3cml0ZUxpbmUobWVzc2FnZTogc3RyaW5nKSB7XG4gIHByb2Nlc3Muc3Rkb3V0LmNsZWFyTGluZSgwKTtcbiAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7XG4gIHByb2Nlc3Muc3Rkb3V0LndyaXRlKG1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIFByaW50cyB0aGUgdGltZSBkaWZmZXJlbmNlIGJldHdlZW4gdHdvIGRhdGVzIGluIGRheXMsIGhvdXJzLCBhbmQgbWludXRlcy5cbiAqXG4gKiBAcGFyYW0gdGltZTEgVGhlIGZpcnN0IGRhdGUgdG8gY29tcGFyZVxuICogQHBhcmFtIHRpbWUyIFRoZSBzZWNvbmQgZGF0ZSB0byBjb21wYXJlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNwbGF5VGltZURpZmYodGltZTE6IERhdGUsIHRpbWUyOiBEYXRlKTogdm9pZCB7XG4gIGNvbnN0IGRpZmYgPSBNYXRoLmFicyh0aW1lMS5nZXRUaW1lKCkgLSB0aW1lMi5nZXRUaW1lKCkpO1xuXG4gIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKGRpZmYgLyAoMTAwMCAqIDYwICogNjAgKiAyNCkpO1xuICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoKGRpZmYgJSAoMTAwMCAqIDYwICogNjAgKiAyNCkpIC8gKDEwMDAgKiA2MCAqIDYwKSk7XG4gIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKChkaWZmICUgKDEwMDAgKiA2MCAqIDYwKSkgLyAoMTAwMCAqIDYwKSk7XG5cbiAgcHJpbnQoYFVzaW5nIHRoZSBsYXRlc3Qgc3VjY2Vzc2Z1bCBzY2FuIHdoaWNoIGlzICR7ZGF5c30gZGF5cywgJHtob3Vyc30gaG91cnMsIGFuZCAke21pbnV0ZXN9IG1pbnV0ZXMgb2xkLmApO1xufVxuXG4vKipcbiAqIFdyaXRlcyBhIG1pZ3JhdGUuanNvbiBmaWxlIHRvIHRoZSBvdXRwdXQgZGlyZWN0b3J5LlxuICpcbiAqIEBwYXJhbSBvdXRwdXRQYXRoIFRoZSBwYXRoIHRvIHdyaXRlIHRoZSBtaWdyYXRlLmpzb24gZmlsZSB0b1xuICogQHBhcmFtIHN0YWNrTmFtZSBUaGUgbmFtZSBvZiB0aGUgc3RhY2tcbiAqIEBwYXJhbSBnZW5lcmF0ZWRPdXRwdXQgVGhlIG91dHB1dCBvZiB0aGUgdGVtcGxhdGUgZ2VuZXJhdG9yXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZU1pZ3JhdGVKc29uRmlsZShcbiAgb3V0cHV0UGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBzdGFja05hbWU6IHN0cmluZyxcbiAgbWlncmF0ZUpzb246IE1pZ3JhdGVKc29uRm9ybWF0LFxuKSB7XG4gIGNvbnN0IG91dHB1dFRvSnNvbiA9IHtcbiAgICAnLy8nOiAnVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCBieSBjZGsgbWlncmF0ZS4gSXQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGRlbGV0ZWQgYWZ0ZXIgdGhlIGZpcnN0IHN1Y2Nlc3NmdWwgZGVwbG95bWVudCBvZiB0aGlzIGFwcCB0byB0aGUgZW52aXJvbm1lbnQgb2YgdGhlIG9yaWdpbmFsIHJlc291cmNlcy4nLFxuICAgICdTb3VyY2UnOiBtaWdyYXRlSnNvbi5zb3VyY2UsXG4gICAgJ1Jlc291cmNlcyc6IG1pZ3JhdGVKc29uLnJlc291cmNlcyxcbiAgfTtcbiAgZnMud3JpdGVGaWxlU3luYyhcbiAgICBgJHtwYXRoLmpvaW4ob3V0cHV0UGF0aCA/PyBwcm9jZXNzLmN3ZCgpLCBzdGFja05hbWUpfS9taWdyYXRlLmpzb25gLFxuICAgIEpTT04uc3RyaW5naWZ5KG91dHB1dFRvSnNvbiwgbnVsbCwgMiksXG4gICk7XG59XG5cbi8qKlxuICogVGFrZXMgYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBmcm9tLXNjYW4gZmxhZyBhbmQgcmV0dXJucyBhIEZyb21TY2FuIGVudW0gdmFsdWUuXG4gKlxuICogQHBhcmFtIHNjYW5UeXBlIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZnJvbS1zY2FuIGZsYWdcbiAqIEByZXR1cm5zIEEgRnJvbVNjYW4gZW51bSB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWlncmF0ZVNjYW5UeXBlKHNjYW5UeXBlOiBzdHJpbmcpIHtcbiAgc3dpdGNoIChzY2FuVHlwZSkge1xuICAgIGNhc2UgJ25ldyc6XG4gICAgICByZXR1cm4gRnJvbVNjYW4uTkVXO1xuICAgIGNhc2UgJ21vc3QtcmVjZW50JzpcbiAgICAgIHJldHVybiBGcm9tU2Nhbi5NT1NUX1JFQ0VOVDtcbiAgICBjYXNlICcnOlxuICAgICAgcmV0dXJuIEZyb21TY2FuLkRFRkFVTFQ7XG4gICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICByZXR1cm4gRnJvbVNjYW4uREVGQVVMVDtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHNjYW4gdHlwZTogJHtzY2FuVHlwZX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIFRha2VzIGEgZ2VuZXJhdGVkVGVtcGxhdGVPdXRwdXQgb2JqY3QgYW5kIHJldHVybnMgYSBib29sZWFuIHJlcHJlc2VudGluZyB3aGV0aGVyIHRoZXJlIGFyZSBhbnkgd2FybmluZ3Mgb24gYW55IHJlc2NvdXJjZXMuXG4gKlxuICogQHBhcmFtIGdlbmVyYXRlZFRlbXBsYXRlT3V0cHV0IEEgR2VuZXJhdGVUZW1wbGF0ZU91dHB1dCBvYmplY3RcbiAqIEByZXR1cm5zIEEgYm9vbGVhbiByZXByZXNlbnRpbmcgd2hldGhlciB0aGVyZSBhcmUgYW55IHdhcm5pbmdzIG9uIGFueSByZXNjb3VyY2VzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1RoZXJlQVdhcm5pbmcoZ2VuZXJhdGVkVGVtcGxhdGVPdXRwdXQ6IEdlbmVyYXRlVGVtcGxhdGVPdXRwdXQpIHtcbiAgaWYgKGdlbmVyYXRlZFRlbXBsYXRlT3V0cHV0LnJlc291cmNlcykge1xuICAgIGZvciAoY29uc3QgcmVzb3VyY2Ugb2YgZ2VuZXJhdGVkVGVtcGxhdGVPdXRwdXQucmVzb3VyY2VzKSB7XG4gICAgICBpZiAocmVzb3VyY2UuV2FybmluZ3MgJiYgcmVzb3VyY2UuV2FybmluZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgR2VuZXJhdGVUZW1wbGF0ZU91dHB1dCBvYmplY3QgZnJvbSB0aGUgRGVzY3JpYmVHZW5lcmF0ZWRUZW1wbGF0ZU91dHB1dCBhbmQgdGhlIHRlbXBsYXRlIGJvZHkuXG4gKlxuICogQHBhcmFtIGdlbmVyYXRlZFRlbXBsYXRlU3VtbWFyeSBUaGUgb3V0cHV0IG9mIHRoZSBkZXNjcmliZSBnZW5lcmF0ZWQgdGVtcGxhdGUgY2FsbFxuICogQHBhcmFtIHRlbXBsYXRlQm9keSBUaGUgYm9keSBvZiB0aGUgZ2VuZXJhdGVkIHRlbXBsYXRlXG4gKiBAcmV0dXJucyBBIEdlbmVyYXRlVGVtcGxhdGVPdXRwdXQgb2JqZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEdlbmVydGVkVGVtcGxhdGVPdXRwdXQoXG4gIGdlbmVyYXRlZFRlbXBsYXRlU3VtbWFyeTogRGVzY3JpYmVHZW5lcmF0ZWRUZW1wbGF0ZUNvbW1hbmRPdXRwdXQsXG4gIHRlbXBsYXRlQm9keTogc3RyaW5nLFxuICBzb3VyY2U6IHN0cmluZyxcbik6IEdlbmVyYXRlVGVtcGxhdGVPdXRwdXQge1xuICBjb25zdCByZXNvdXJjZXM6IFJlc291cmNlRGV0YWlsW10gfCB1bmRlZmluZWQgPSBnZW5lcmF0ZWRUZW1wbGF0ZVN1bW1hcnkuUmVzb3VyY2VzO1xuICBjb25zdCBtaWdyYXRlSnNvbjogTWlncmF0ZUpzb25Gb3JtYXQgPSB7XG4gICAgdGVtcGxhdGVCb2R5OiB0ZW1wbGF0ZUJvZHksXG4gICAgc291cmNlOiBzb3VyY2UsXG4gICAgcmVzb3VyY2VzOiBnZW5lcmF0ZWRUZW1wbGF0ZVN1bW1hcnkuUmVzb3VyY2VzIS5tYXAoKHIpID0+ICh7XG4gICAgICBSZXNvdXJjZVR5cGU6IHIuUmVzb3VyY2VUeXBlISxcbiAgICAgIExvZ2ljYWxSZXNvdXJjZUlkOiByLkxvZ2ljYWxSZXNvdXJjZUlkISxcbiAgICAgIFJlc291cmNlSWRlbnRpZmllcjogci5SZXNvdXJjZUlkZW50aWZpZXIhLFxuICAgIH0pKSxcbiAgfTtcbiAgY29uc3QgdGVtcGxhdGVJZCA9IGdlbmVyYXRlZFRlbXBsYXRlU3VtbWFyeS5HZW5lcmF0ZWRUZW1wbGF0ZUlkITtcbiAgcmV0dXJuIHtcbiAgICBtaWdyYXRlSnNvbjogbWlncmF0ZUpzb24sXG4gICAgcmVzb3VyY2VzOiByZXNvdXJjZXMsXG4gICAgdGVtcGxhdGVJZDogdGVtcGxhdGVJZCxcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSBDbG91ZEZvcm1hdGlvbiBzZGsgY2xpZW50IGZvciBtYWtpbmcgcmVxdWVzdHMgd2l0aCB0aGUgQ0ZOIHRlbXBsYXRlIGdlbmVyYXRvci5cbiAqXG4gKiBAcGFyYW0gc2RrUHJvdmlkZXIgVGhlIHNkayBwcm92aWRlciBmb3IgbWFraW5nIENsb3VkRm9ybWF0aW9uIGNhbGxzXG4gKiBAcGFyYW0gZW52aXJvbm1lbnQgVGhlIGFjY291bnQgYW5kIHJlZ2lvbiB3aGVyZSB0aGUgc3RhY2sgaXMgZGVwbG95ZWRcbiAqIEByZXR1cm5zIEEgQ2xvdWRGb3JtYXRpb24gc2RrIGNsaWVudFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVpbGRDZm5DbGllbnQoc2RrUHJvdmlkZXI6IFNka1Byb3ZpZGVyLCBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQpIHtcbiAgY29uc3Qgc2RrID0gKGF3YWl0IHNka1Byb3ZpZGVyLmZvckVudmlyb25tZW50KGVudmlyb25tZW50LCAwIHNhdGlzZmllcyBGb3JSZWFkaW5nKSkuc2RrO1xuICBzZGsuYXBwZW5kQ3VzdG9tVXNlckFnZW50KCdjZGstbWlncmF0ZScpO1xuICByZXR1cm4gc2RrLmNsb3VkRm9ybWF0aW9uKCk7XG59XG5cbi8qKlxuICogQXBwZW5kcyBhIGxpc3Qgb2Ygd2FybmluZ3MgdG8gYSByZWFkbWUgZmlsZS5cbiAqXG4gKiBAcGFyYW0gZmlsZXBhdGggVGhlIHBhdGggdG8gdGhlIHJlYWRtZSBmaWxlXG4gKiBAcGFyYW0gcmVzb3VyY2VzIEEgbGlzdCBvZiByZXNvdXJjZXMgdG8gYXBwZW5kIHdhcm5pbmdzIGZvclxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kV2FybmluZ3NUb1JlYWRtZShmaWxlcGF0aDogc3RyaW5nLCByZXNvdXJjZXM6IFJlc291cmNlRGV0YWlsW10pIHtcbiAgY29uc3QgcmVhZG1lID0gZnMucmVhZEZpbGVTeW5jKGZpbGVwYXRoLCAndXRmOCcpO1xuICBjb25zdCBsaW5lcyA9IHJlYWRtZS5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IGluZGV4ID0gbGluZXMuZmluZEluZGV4KChsaW5lKSA9PiBsaW5lLnRyaW0oKSA9PT0gJ0Vuam95IScpO1xuICBsZXQgbGluZXNUb0FkZCA9IFsnXFxuIyMgV2FybmluZ3MnXTtcbiAgbGluZXNUb0FkZC5wdXNoKCcjIyMgV3JpdGUtb25seSBwcm9wZXJ0aWVzJyk7XG4gIGxpbmVzVG9BZGQucHVzaChcbiAgICBcIldyaXRlLW9ubHkgcHJvcGVydGllcyBhcmUgcmVzb3VyY2UgcHJvcGVydHkgdmFsdWVzIHRoYXQgY2FuIGJlIHdyaXR0ZW4gdG8gYnV0IGNhbid0IGJlIHJlYWQgYnkgQVdTIENsb3VkRm9ybWF0aW9uIG9yIENESyBNaWdyYXRlLiBGb3IgbW9yZSBpbmZvcm1hdGlvbiwgc2VlIFtJYUMgZ2VuZXJhdG9yIGFuZCB3cml0ZS1vbmx5IHByb3BlcnRpZXNdKGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NDbG91ZEZvcm1hdGlvbi9sYXRlc3QvVXNlckd1aWRlL2dlbmVyYXRlLUlhQy13cml0ZS1vbmx5LXByb3BlcnRpZXMuaHRtbCkuXCIsXG4gICk7XG4gIGxpbmVzVG9BZGQucHVzaCgnXFxuJyk7XG4gIGxpbmVzVG9BZGQucHVzaChcbiAgICAnV3JpdGUtb25seSBwcm9wZXJ0aWVzIGRpc2NvdmVyZWQgZHVyaW5nIG1pZ3JhdGlvbiBhcmUgb3JnYW5pemVkIGhlcmUgYnkgcmVzb3VyY2UgSUQgYW5kIGNhdGVnb3JpemVkIGJ5IHdyaXRlLW9ubHkgcHJvcGVydHkgdHlwZS4gUmVzb2x2ZSB3cml0ZS1vbmx5IHByb3BlcnRpZXMgYnkgcHJvdmlkaW5nIHByb3BlcnR5IHZhbHVlcyBpbiB5b3VyIENESyBhcHAuIEZvciBndWlkYW5jZSwgc2VlIFtSZXNvbHZlIHdyaXRlLW9ubHkgcHJvcGVydGllc10oaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Nkay92Mi9ndWlkZS9taWdyYXRlLmh0bWwjbWlncmF0ZS1yZXNvdXJjZXMtd3JpdGVvbmx5KS4nLFxuICApO1xuICBmb3IgKGNvbnN0IHJlc291cmNlIG9mIHJlc291cmNlcykge1xuICAgIGlmIChyZXNvdXJjZS5XYXJuaW5ncyAmJiByZXNvdXJjZS5XYXJuaW5ncy5sZW5ndGggPiAwKSB7XG4gICAgICBsaW5lc1RvQWRkLnB1c2goYCMjIyAke3Jlc291cmNlLkxvZ2ljYWxSZXNvdXJjZUlkfWApO1xuICAgICAgZm9yIChjb25zdCB3YXJuaW5nIG9mIHJlc291cmNlLldhcm5pbmdzKSB7XG4gICAgICAgIGxpbmVzVG9BZGQucHVzaChgLSAqKiR7d2FybmluZy5UeXBlfSoqOiBgKTtcbiAgICAgICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiB3YXJuaW5nLlByb3BlcnRpZXMhKSB7XG4gICAgICAgICAgbGluZXNUb0FkZC5wdXNoKGAgIC0gJHtwcm9wZXJ0eS5Qcm9wZXJ0eVBhdGh9OiAke3Byb3BlcnR5LkRlc2NyaXB0aW9ufWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGxpbmVzLnNwbGljZShpbmRleCwgMCwgLi4ubGluZXNUb0FkZCk7XG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZXBhdGgsIGxpbmVzLmpvaW4oJ1xcbicpKTtcbn1cblxuLyoqXG4gKiB0YWtlcyBhIGxpc3Qgb2YgcmVzb3VyY2VzIGFuZCByZXR1cm5zIGEgbGlzdCBvZiB1bmlxdWUgcmVzb3VyY2VzIGJhc2VkIG9uIHRoZSByZXNvdXJjZSB0eXBlIGFuZCBsb2dpY2FsIHJlc291cmNlIGlkLlxuICpcbiAqIEBwYXJhbSByZXNvdXJjZXMgQSBsaXN0IG9mIHJlc291cmNlcyB0byBkZWR1cGxpY2F0ZVxuICogQHJldHVybnMgQSBsaXN0IG9mIHVuaXF1ZSByZXNvdXJjZXNcbiAqL1xuZnVuY3Rpb24gZGVkdXBsaWNhdGVSZXNvdXJjZXMocmVzb3VyY2VzOiBSZXNvdXJjZURldGFpbFtdKSB7XG4gIGxldCB1bmlxdWVSZXNvdXJjZXM6IHsgW2tleTogc3RyaW5nXTogUmVzb3VyY2VEZXRhaWwgfSA9IHt9O1xuXG4gIGZvciAoY29uc3QgcmVzb3VyY2Ugb2YgcmVzb3VyY2VzKSB7XG4gICAgY29uc3Qga2V5ID0gT2JqZWN0LmtleXMocmVzb3VyY2UuUmVzb3VyY2VJZGVudGlmaWVyISlbMF07XG5cbiAgICAvLyBDcmVhdGluZyBvdXIgdW5pcXVlIGlkZW50aWZpZXIgdXNpbmcgdGhlIHJlc291cmNlIHR5cGUsIHRoZSBrZXksIGFuZCB0aGUgdmFsdWUgb2YgdGhlIHJlc291cmNlIGlkZW50aWZpZXJcbiAgICAvLyBUaGUgcmVzb3VyY2UgaWRlbnRpZmllciBpcyBhIGNvbWJpbmF0aW9uIG9mIGEga2V5IHZhbHVlIHBhaXIgZGVmaW5lZCBieSBhIHJlc291cmNlJ3Mgc2NoZW1hLCBhbmQgdGhlIHJlc291cmNlIHR5cGUgb2YgdGhlIHJlc291cmNlLlxuICAgIGNvbnN0IHVuaXF1ZUlkZW50aWZlciA9IGAke3Jlc291cmNlLlJlc291cmNlVHlwZX06JHtrZXl9OiR7cmVzb3VyY2UuUmVzb3VyY2VJZGVudGlmaWVyIVtrZXldfWA7XG4gICAgdW5pcXVlUmVzb3VyY2VzW3VuaXF1ZUlkZW50aWZlcl0gPSByZXNvdXJjZTtcbiAgfVxuXG4gIHJldHVybiBPYmplY3QudmFsdWVzKHVuaXF1ZVJlc291cmNlcyk7XG59XG5cbi8qKlxuICogQ2xhc3MgZm9yIG1ha2luZyBDbG91ZEZvcm1hdGlvbiB0ZW1wbGF0ZSBnZW5lcmF0b3IgY2FsbHNcbiAqL1xuZXhwb3J0IGNsYXNzIENmblRlbXBsYXRlR2VuZXJhdG9yUHJvdmlkZXIge1xuICBwcml2YXRlIGNmbjogSUNsb3VkRm9ybWF0aW9uQ2xpZW50O1xuICBjb25zdHJ1Y3RvcihjZm46IElDbG91ZEZvcm1hdGlvbkNsaWVudCkge1xuICAgIHRoaXMuY2ZuID0gY2ZuO1xuICB9XG5cbiAgYXN5bmMgY2hlY2tGb3JSZXNvdXJjZVNjYW4oXG4gICAgcmVzb3VyY2VTY2FuU3VtbWFyaWVzOiBSZXNvdXJjZVNjYW5TdW1tYXJ5W10gfCB1bmRlZmluZWQsXG4gICAgb3B0aW9uczogR2VuZXJhdGVUZW1wbGF0ZU9wdGlvbnMsXG4gICAgY2xpZW50UmVxdWVzdFRva2VuOiBzdHJpbmcsXG4gICkge1xuICAgIGlmICghcmVzb3VyY2VTY2FuU3VtbWFyaWVzIHx8IHJlc291cmNlU2NhblN1bW1hcmllcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmIChvcHRpb25zLmZyb21TY2FuID09PSBGcm9tU2Nhbi5NT1NUX1JFQ0VOVCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ05vIHNjYW5zIGZvdW5kLiBQbGVhc2UgZWl0aGVyIHN0YXJ0IGEgbmV3IHNjYW4gd2l0aCB0aGUgYC0tZnJvbS1zY2FuYCBuZXcgb3IgZG8gbm90IHNwZWNpZnkgYSBgLS1mcm9tLXNjYW5gIG9wdGlvbi4nLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJpbnQoJ05vIHNjYW5zIGZvdW5kLiBJbml0aWF0aW5nIGEgbmV3IHJlc291cmNlIHNjYW4uJyk7XG4gICAgICAgIGF3YWl0IHRoaXMuc3RhcnRSZXNvdXJjZVNjYW4oY2xpZW50UmVxdWVzdFRva2VuKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgdG9rZW5pemVkIGxpc3Qgb2YgcmVzb3VyY2VzIGFuZCB0aGVpciBhc3NvY2lhdGVkIHNjYW4uIElmIGEgdG9rZW4gaXMgcHJlc2VudCB0aGUgZnVuY3Rpb25cbiAgICogd2lsbCBsb29wIHRocm91Z2ggYWxsIHBhZ2VzIGFuZCBjb21iaW5lIHRoZW0gaW50byBhIHNpbmdsZSBsaXN0IG9mIFNjYW5uZWRSZWxhdGVkUmVzb3VyY2VzXG4gICAqXG4gICAqIEBwYXJhbSBzY2FuSWQgc2NhbiBpZCBmb3IgdGhlIHRvIGxpc3QgcmVzb3VyY2VzIGZvclxuICAgKiBAcGFyYW0gcmVzb3VyY2VzIEEgbGlzdCBvZiByZXNvdXJjZXMgdG8gZmluZCByZWxhdGVkIHJlc291cmNlcyBmb3JcbiAgICovXG4gIGFzeW5jIGdldFJlc291cmNlU2NhblJlbGF0ZWRSZXNvdXJjZXMoXG4gICAgc2NhbklkOiBzdHJpbmcsXG4gICAgcmVzb3VyY2VzOiBTY2FubmVkUmVzb3VyY2VbXSxcbiAgKTogUHJvbWlzZTxTY2FubmVkUmVzb3VyY2VJZGVudGlmaWVyW10+IHtcbiAgICBsZXQgcmVsYXRlZFJlc291cmNlTGlzdCA9IHJlc291cmNlcztcblxuICAgIC8vIGJyZWFrIHRoZSBsaXN0IG9mIHJlc291cmNlcyBpbnRvIGNodW5rcyBvZiAxMDAgdG8gYXZvaWQgaGl0dGluZyB0aGUgMTAwIHJlc291cmNlIGxpbWl0XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MocmVzb3VyY2VzLCAxMDApKSB7XG4gICAgICAvLyBnZXQgdGhlIGZpcnN0IHBhZ2Ugb2YgcmVsYXRlZCByZXNvdXJjZXNcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMuY2ZuLmxpc3RSZXNvdXJjZVNjYW5SZWxhdGVkUmVzb3VyY2VzKHtcbiAgICAgICAgUmVzb3VyY2VTY2FuSWQ6IHNjYW5JZCxcbiAgICAgICAgUmVzb3VyY2VzOiBjaHVuayxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBhZGQgdGhlIGZpcnN0IHBhZ2UgdG8gdGhlIGxpc3RcbiAgICAgIHJlbGF0ZWRSZXNvdXJjZUxpc3QucHVzaCguLi4ocmVzLlJlbGF0ZWRSZXNvdXJjZXMgPz8gW10pKTtcbiAgICAgIGxldCBuZXh0VG9rZW4gPSByZXMuTmV4dFRva2VuO1xuXG4gICAgICAvLyBpZiB0aGVyZSBhcmUgbW9yZSBwYWdlcywgY3ljbGUgdGhyb3VnaCB0aGVtIGFuZCBhZGQgdGhlbSB0byB0aGUgbGlzdCBiZWZvcmUgbW92aW5nIG9uIHRvIHRoZSBuZXh0IGNodW5rXG4gICAgICB3aGlsZSAobmV4dFRva2VuKSB7XG4gICAgICAgIGNvbnN0IG5leHRSZWxhdGVkUmVzb3VyY2VzID0gYXdhaXQgdGhpcy5jZm4ubGlzdFJlc291cmNlU2NhblJlbGF0ZWRSZXNvdXJjZXMoe1xuICAgICAgICAgIFJlc291cmNlU2NhbklkOiBzY2FuSWQsXG4gICAgICAgICAgUmVzb3VyY2VzOiByZXNvdXJjZUlkZW50aWZpZXJzKHJlc291cmNlcyksXG4gICAgICAgICAgTmV4dFRva2VuOiBuZXh0VG9rZW4sXG4gICAgICAgIH0pO1xuICAgICAgICBuZXh0VG9rZW4gPSBuZXh0UmVsYXRlZFJlc291cmNlcy5OZXh0VG9rZW47XG4gICAgICAgIHJlbGF0ZWRSZXNvdXJjZUxpc3QucHVzaCguLi4obmV4dFJlbGF0ZWRSZXNvdXJjZXMuUmVsYXRlZFJlc291cmNlcyA/PyBbXSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlbGF0ZWRSZXNvdXJjZUxpc3QgPSBkZWR1cGxpY2F0ZVJlc291cmNlcyhyZWxhdGVkUmVzb3VyY2VMaXN0KTtcblxuICAgIC8vIHBydW5lIHRoZSBtYW5hZ2VkYnlzdGFjayBmbGFnIG9mZiBvZiB0aGVtIGFnYWluLlxuICAgIHJldHVybiBwcm9jZXNzLmVudi5NSUdSQVRFX0lOVEVHX1RFU1RcbiAgICAgID8gcmVzb3VyY2VJZGVudGlmaWVycyhyZWxhdGVkUmVzb3VyY2VMaXN0KVxuICAgICAgOiByZXNvdXJjZUlkZW50aWZpZXJzKGV4Y2x1ZGVNYW5hZ2VkKHJlbGF0ZWRSZXNvdXJjZUxpc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLaWNrcyBvZmYgYSBzY2FuIG9mIGEgY3VzdG9tZXJzIGFjY291bnQsIHJldHVybmluZyB0aGUgc2NhbiBpZC4gQSBzY2FuIGNhbiB0YWtlXG4gICAqIDEwIG1pbnV0ZXMgb3IgbG9uZ2VyIHRvIGNvbXBsZXRlLiBIb3dldmVyIHRoaXMgd2lsbCByZXR1cm4gYSBzY2FuIGlkIGFzIHNvb24gYXNcbiAgICogdGhlIHNjYW4gaGFzIGJlZ3VuLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIHNjYW4gaWRcbiAgICovXG4gIGFzeW5jIHN0YXJ0UmVzb3VyY2VTY2FuKHJlcXVlc3RUb2tlbjogc3RyaW5nKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIGF3YWl0IHRoaXMuY2ZuLnN0YXJ0UmVzb3VyY2VTY2FuKHtcbiAgICAgICAgQ2xpZW50UmVxdWVzdFRva2VuOiByZXF1ZXN0VG9rZW4sXG4gICAgICB9KVxuICAgICkuUmVzb3VyY2VTY2FuSWQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbW9zdCByZWNlbnQgc2NhbnMgYSBjdXN0b21lciBoYXMgY29tcGxldGVkXG4gICAqXG4gICAqIEByZXR1cm5zIGEgbGlzdCBvZiByZXNvdXJjZSBzY2FuIHN1bW1hcmllc1xuICAgKi9cbiAgYXN5bmMgbGlzdFJlc291cmNlU2NhbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2ZuLmxpc3RSZXNvdXJjZVNjYW5zKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgdG9rZW5pemVkIGxpc3Qgb2YgcmVzb3VyY2VzIGZyb20gYSByZXNvdXJjZSBzY2FuLiBJZiBhIHRva2VuIGlzIHByZXNlbnQsIHRoaXMgZnVuY3Rpb25cbiAgICogd2lsbCBsb29wIHRocm91Z2ggYWxsIHBhZ2VzIGFuZCBjb21iaW5lIHRoZW0gaW50byBhIHNpbmdsZSBsaXN0IG9mIFNjYW5uZWRSZXNvdXJjZVtdLlxuICAgKiBBZGRpdGlvbmFsbHkgd2lsbCBhcHBseSBhbnkgZmlsdGVycyBwcm92aWRlZCBieSB0aGUgY3VzdG9tZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzY2FuSWQgc2NhbiBpZCBmb3IgdGhlIHRvIGxpc3QgcmVzb3VyY2VzIGZvclxuICAgKiBAcGFyYW0gZmlsdGVycyBhIHN0cmluZyBvZiBmaWx0ZXJzIGluIHRoZSBmb3JtYXQgb2Yga2V5MT12YWx1ZTEsa2V5Mj12YWx1ZTJcbiAgICogQHJldHVybnMgYSBjb21iaW5lZCBsaXN0IG9mIGFsbCByZXNvdXJjZXMgZnJvbSB0aGUgc2NhblxuICAgKi9cbiAgYXN5bmMgbGlzdFJlc291cmNlU2NhblJlc291cmNlcyhzY2FuSWQ6IHN0cmluZywgZmlsdGVyczogc3RyaW5nW10gPSBbXSk6IFByb21pc2U8U2Nhbm5lZFJlc291cmNlSWRlbnRpZmllcltdPiB7XG4gICAgbGV0IHJlc291cmNlTGlzdDogU2Nhbm5lZFJlc291cmNlW10gPSBbXTtcbiAgICBsZXQgcmVzb3VyY2VTY2FuSW5wdXRzOiBMaXN0UmVzb3VyY2VTY2FuUmVzb3VyY2VzQ29tbWFuZElucHV0O1xuXG4gICAgaWYgKGZpbHRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgcHJpbnQoJ0FwcGx5aW5nIGZpbHRlcnMgdG8gcmVzb3VyY2Ugc2Nhbi4nKTtcbiAgICAgIGZvciAoY29uc3QgZmlsdGVyIG9mIGZpbHRlcnMpIHtcbiAgICAgICAgY29uc3QgZmlsdGVyTGlzdCA9IHBhcnNlRmlsdGVycyhmaWx0ZXIpO1xuICAgICAgICByZXNvdXJjZVNjYW5JbnB1dHMgPSB7XG4gICAgICAgICAgUmVzb3VyY2VTY2FuSWQ6IHNjYW5JZCxcbiAgICAgICAgICBSZXNvdXJjZUlkZW50aWZpZXI6IGZpbHRlckxpc3RbRmlsdGVyVHlwZS5SRVNPVVJDRV9JREVOVElGSUVSXSxcbiAgICAgICAgICBSZXNvdXJjZVR5cGVQcmVmaXg6IGZpbHRlckxpc3RbRmlsdGVyVHlwZS5SRVNPVVJDRV9UWVBFX1BSRUZJWF0sXG4gICAgICAgICAgVGFnS2V5OiBmaWx0ZXJMaXN0W0ZpbHRlclR5cGUuVEFHX0tFWV0sXG4gICAgICAgICAgVGFnVmFsdWU6IGZpbHRlckxpc3RbRmlsdGVyVHlwZS5UQUdfVkFMVUVdLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCByZXNvdXJjZXMgPSBhd2FpdCB0aGlzLmNmbi5saXN0UmVzb3VyY2VTY2FuUmVzb3VyY2VzKHJlc291cmNlU2NhbklucHV0cyk7XG4gICAgICAgIHJlc291cmNlTGlzdCA9IHJlc291cmNlTGlzdC5jb25jYXQocmVzb3VyY2VzLlJlc291cmNlcyA/PyBbXSk7XG4gICAgICAgIGxldCBuZXh0VG9rZW4gPSByZXNvdXJjZXMuTmV4dFRva2VuO1xuXG4gICAgICAgIC8vIGN5Y2xlIHRocm91Z2ggdGhlIHBhZ2VzIGFkZGluZyBhbGwgcmVzb3VyY2VzIHRvIHRoZSBsaXN0IHVudGlsIHdlIHJ1biBvdXQgb2YgcGFnZXNcbiAgICAgICAgd2hpbGUgKG5leHRUb2tlbikge1xuICAgICAgICAgIHJlc291cmNlU2NhbklucHV0cy5OZXh0VG9rZW4gPSBuZXh0VG9rZW47XG4gICAgICAgICAgY29uc3QgbmV4dFJlc291cmNlcyA9IGF3YWl0IHRoaXMuY2ZuLmxpc3RSZXNvdXJjZVNjYW5SZXNvdXJjZXMocmVzb3VyY2VTY2FuSW5wdXRzKTtcbiAgICAgICAgICBuZXh0VG9rZW4gPSBuZXh0UmVzb3VyY2VzLk5leHRUb2tlbjtcbiAgICAgICAgICByZXNvdXJjZUxpc3QgPSByZXNvdXJjZUxpc3QhLmNvbmNhdChuZXh0UmVzb3VyY2VzLlJlc291cmNlcyA/PyBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcHJpbnQoJ05vIGZpbHRlcnMgcHJvdmlkZWQuIFJldHJpZXZpbmcgYWxsIHJlc291cmNlcyBmcm9tIHNjYW4uJyk7XG4gICAgICByZXNvdXJjZVNjYW5JbnB1dHMgPSB7XG4gICAgICAgIFJlc291cmNlU2NhbklkOiBzY2FuSWQsXG4gICAgICB9O1xuICAgICAgY29uc3QgcmVzb3VyY2VzID0gYXdhaXQgdGhpcy5jZm4ubGlzdFJlc291cmNlU2NhblJlc291cmNlcyhyZXNvdXJjZVNjYW5JbnB1dHMpO1xuICAgICAgcmVzb3VyY2VMaXN0ID0gcmVzb3VyY2VMaXN0IS5jb25jYXQocmVzb3VyY2VzLlJlc291cmNlcyA/PyBbXSk7XG4gICAgICBsZXQgbmV4dFRva2VuID0gcmVzb3VyY2VzLk5leHRUb2tlbjtcblxuICAgICAgLy8gY3ljbGUgdGhyb3VnaCB0aGUgcGFnZXMgYWRkaW5nIGFsbCByZXNvdXJjZXMgdG8gdGhlIGxpc3QgdW50aWwgd2UgcnVuIG91dCBvZiBwYWdlc1xuICAgICAgd2hpbGUgKG5leHRUb2tlbikge1xuICAgICAgICByZXNvdXJjZVNjYW5JbnB1dHMuTmV4dFRva2VuID0gbmV4dFRva2VuO1xuICAgICAgICBjb25zdCBuZXh0UmVzb3VyY2VzID0gYXdhaXQgdGhpcy5jZm4ubGlzdFJlc291cmNlU2NhblJlc291cmNlcyhyZXNvdXJjZVNjYW5JbnB1dHMpO1xuICAgICAgICBuZXh0VG9rZW4gPSBuZXh0UmVzb3VyY2VzLk5leHRUb2tlbjtcbiAgICAgICAgcmVzb3VyY2VMaXN0ID0gcmVzb3VyY2VMaXN0IS5jb25jYXQobmV4dFJlc291cmNlcy5SZXNvdXJjZXMgPz8gW10pO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVzb3VyY2VMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyByZXNvdXJjZXMgZm91bmQgd2l0aCBmaWx0ZXJzICR7ZmlsdGVycy5qb2luKCcgJyl9LiBQbGVhc2UgdHJ5IGFnYWluIHdpdGggZGlmZmVyZW50IGZpbHRlcnMuYCk7XG4gICAgfVxuICAgIHJlc291cmNlTGlzdCA9IGRlZHVwbGljYXRlUmVzb3VyY2VzKHJlc291cmNlTGlzdCk7XG5cbiAgICByZXR1cm4gcHJvY2Vzcy5lbnYuTUlHUkFURV9JTlRFR19URVNUXG4gICAgICA/IHJlc291cmNlSWRlbnRpZmllcnMocmVzb3VyY2VMaXN0KVxuICAgICAgOiByZXNvdXJjZUlkZW50aWZpZXJzKGV4Y2x1ZGVNYW5hZ2VkKHJlc291cmNlTGlzdCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBpbmZvcm1hdGlvbiBhYm91dCBhIHJlc291cmNlIHNjYW4uXG4gICAqXG4gICAqIEBwYXJhbSBzY2FuSWQgc2NhbiBpZCBmb3IgdGhlIHRvIGxpc3QgcmVzb3VyY2VzIGZvclxuICAgKiBAcmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc2NhblxuICAgKi9cbiAgYXN5bmMgZGVzY3JpYmVSZXNvdXJjZVNjYW4oc2NhbklkOiBzdHJpbmcpOiBQcm9taXNlPERlc2NyaWJlUmVzb3VyY2VTY2FuQ29tbWFuZE91dHB1dD4ge1xuICAgIHJldHVybiB0aGlzLmNmbi5kZXNjcmliZVJlc291cmNlU2Nhbih7XG4gICAgICBSZXNvdXJjZVNjYW5JZDogc2NhbklkLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc2NyaWJlcyB0aGUgY3VycmVudCBzdGF0dXMgb2YgdGhlIHRlbXBsYXRlIGJlaW5nIGdlbmVyYXRlZC5cbiAgICpcbiAgICogQHBhcmFtIHRlbXBsYXRlSWQgQSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSB0ZW1wbGF0ZSBpZFxuICAgKiBAcmV0dXJucyBEZXNjcmliZUdlbmVyYXRlZFRlbXBsYXRlT3V0cHV0IGFuIG9iamVjdCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSBzdGF0dXMgYW5kIHJlc3VsdHNcbiAgICovXG4gIGFzeW5jIGRlc2NyaWJlR2VuZXJhdGVkVGVtcGxhdGUodGVtcGxhdGVJZDogc3RyaW5nKTogUHJvbWlzZTxEZXNjcmliZUdlbmVyYXRlZFRlbXBsYXRlQ29tbWFuZE91dHB1dD4ge1xuICAgIGNvbnN0IGdlbmVyYXRlZFRlbXBsYXRlID0gYXdhaXQgdGhpcy5jZm4uZGVzY3JpYmVHZW5lcmF0ZWRUZW1wbGF0ZSh7XG4gICAgICBHZW5lcmF0ZWRUZW1wbGF0ZU5hbWU6IHRlbXBsYXRlSWQsXG4gICAgfSk7XG5cbiAgICBpZiAoZ2VuZXJhdGVkVGVtcGxhdGUuU3RhdHVzID09IFNjYW5TdGF0dXMuRkFJTEVEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZ2VuZXJhdGVkVGVtcGxhdGUuU3RhdHVzUmVhc29uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZ2VuZXJhdGVkVGVtcGxhdGU7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgY29tcGxldGVkIGdlbmVyYXRlZCBjbG91ZGZvcm1hdGlvbiB0ZW1wbGF0ZSBmcm9tIHRoZSB0ZW1wbGF0ZSBnZW5lcmF0b3IuXG4gICAqXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUlkIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgdGVtcGxhdGUgaWRcbiAgICogQHBhcmFtIGNsb3VkRm9ybWF0aW9uIFRoZSBDbG91ZEZvcm1hdGlvbiBzZGsgY2xpZW50IHRvIHVzZVxuICAgKiBAcmV0dXJucyBEZXNjcmliZUdlbmVyYXRlZFRlbXBsYXRlT3V0cHV0IGFuIG9iamVjdCBjb250YWluaW5nIHRoZSB0ZW1wbGF0ZSBzdGF0dXMgYW5kIGJvZHlcbiAgICovXG4gIGFzeW5jIGdldEdlbmVyYXRlZFRlbXBsYXRlKHRlbXBsYXRlSWQ6IHN0cmluZyk6IFByb21pc2U8R2V0R2VuZXJhdGVkVGVtcGxhdGVDb21tYW5kT3V0cHV0PiB7XG4gICAgcmV0dXJuIHRoaXMuY2ZuLmdldEdlbmVyYXRlZFRlbXBsYXRlKHtcbiAgICAgIEdlbmVyYXRlZFRlbXBsYXRlTmFtZTogdGVtcGxhdGVJZCxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBLaWNrcyBvZmYgYSB0ZW1wbGF0ZSBnZW5lcmF0aW9uIGZvciBhIHNldCBvZiByZXNvdXJjZXMuXG4gICAqXG4gICAqIEBwYXJhbSBzdGFja05hbWUgVGhlIG5hbWUgb2YgdGhlIHN0YWNrXG4gICAqIEBwYXJhbSByZXNvdXJjZXMgQSBsaXN0IG9mIHJlc291cmNlcyB0byBnZW5lcmF0ZSB0aGUgdGVtcGxhdGUgZnJvbVxuICAgKiBAcmV0dXJucyBDcmVhdGVHZW5lcmF0ZWRUZW1wbGF0ZU91dHB1dCBhbiBvYmplY3QgY29udGFpbmluZyB0aGUgdGVtcGxhdGUgYXJuIHRvIHF1ZXJ5IG9uIGxhdGVyXG4gICAqL1xuICBhc3luYyBjcmVhdGVHZW5lcmF0ZWRUZW1wbGF0ZShzdGFja05hbWU6IHN0cmluZywgcmVzb3VyY2VzOiBSZXNvdXJjZURlZmluaXRpb25bXSkge1xuICAgIGNvbnN0IGNyZWF0ZVRlbXBsYXRlT3V0cHV0ID0gYXdhaXQgdGhpcy5jZm4uY3JlYXRlR2VuZXJhdGVkVGVtcGxhdGUoe1xuICAgICAgUmVzb3VyY2VzOiByZXNvdXJjZXMsXG4gICAgICBHZW5lcmF0ZWRUZW1wbGF0ZU5hbWU6IHN0YWNrTmFtZSxcbiAgICB9KTtcblxuICAgIGlmIChjcmVhdGVUZW1wbGF0ZU91dHB1dC5HZW5lcmF0ZWRUZW1wbGF0ZUlkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ3JlYXRlR2VuZXJhdGVkVGVtcGxhdGUgZmFpbGVkIHRvIHJldHVybiBhbiBBcm4uJyk7XG4gICAgfVxuICAgIHJldHVybiBjcmVhdGVUZW1wbGF0ZU91dHB1dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgZ2VuZXJhdGVkIHRlbXBsYXRlIGZyb20gdGhlIHRlbXBsYXRlIGdlbmVyYXRvci5cbiAgICpcbiAgICogQHBhcmFtIHRlbXBsYXRlQXJuIFRoZSBhcm4gb2YgdGhlIHRlbXBsYXRlIHRvIGRlbGV0ZVxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSB0ZW1wbGF0ZSBoYXMgYmVlbiBkZWxldGVkXG4gICAqL1xuICBhc3luYyBkZWxldGVHZW5lcmF0ZWRUZW1wbGF0ZSh0ZW1wbGF0ZUFybjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5jZm4uZGVsZXRlR2VuZXJhdGVkVGVtcGxhdGUoe1xuICAgICAgR2VuZXJhdGVkVGVtcGxhdGVOYW1lOiB0ZW1wbGF0ZUFybixcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFRoZSBwb3NzaWJsZSB3YXlzIHRvIGNob29zZSBhIHNjYW4gdG8gZ2VuZXJhdGUgYSBDREsgYXBwbGljYXRpb24gZnJvbVxuICovXG5leHBvcnQgZW51bSBGcm9tU2NhbiB7XG4gIC8qKlxuICAgKiBJbml0aWF0ZSBhIG5ldyByZXNvdXJjZSBzY2FuIHRvIGJ1aWxkIHRoZSBDREsgYXBwbGljYXRpb24gZnJvbS5cbiAgICovXG4gIE5FVyxcblxuICAvKipcbiAgICogVXNlIHRoZSBsYXN0IHN1Y2Nlc3NmdWwgc2NhbiB0byBidWlsZCB0aGUgQ0RLIGFwcGxpY2F0aW9uIGZyb20uIFdpbGwgZmFpbCBpZiBubyBzY2FuIGlzIGZvdW5kLlxuICAgKi9cbiAgTU9TVF9SRUNFTlQsXG5cbiAgLyoqXG4gICAqIFN0YXJ0cyBhIHNjYW4gaWYgbm9uZSBleGlzdHMsIG90aGVyd2lzZSB1c2VzIHRoZSBtb3N0IHJlY2VudCBzdWNjZXNzZnVsIHNjYW4gdG8gYnVpbGQgdGhlIENESyBhcHBsaWNhdGlvbiBmcm9tLlxuICAgKi9cbiAgREVGQVVMVCxcbn1cblxuLyoqXG4gKiBJbnRlcmZhY2UgZm9yIHRoZSBvcHRpb25zIG9iamVjdCBwYXNzZWQgdG8gdGhlIGdlbmVyYXRlVGVtcGxhdGUgZnVuY3Rpb25cbiAqXG4gKiBAcGFyYW0gc3RhY2tOYW1lIFRoZSBuYW1lIG9mIHRoZSBzdGFja1xuICogQHBhcmFtIGZpbHRlcnMgQSBsaXN0IG9mIGZpbHRlcnMgdG8gYXBwbHkgdG8gdGhlIHNjYW5cbiAqIEBwYXJhbSBmcm9tU2NhbiBBbiBlbnVtIHZhbHVlIHNwZWNpZnlpbmcgd2hldGhlciBhIG5ldyBzY2FuIHNob3VsZCBiZSBzdGFydGVkIG9yIHRoZSBtb3N0IHJlY2VudCBzdWNjZXNzZnVsIHNjYW4gc2hvdWxkIGJlIHVzZWRcbiAqIEBwYXJhbSBzZGtQcm92aWRlciBUaGUgc2RrIHByb3ZpZGVyIGZvciBtYWtpbmcgQ2xvdWRGb3JtYXRpb24gY2FsbHNcbiAqIEBwYXJhbSBlbnZpcm9ubWVudCBUaGUgYWNjb3VudCBhbmQgcmVnaW9uIHdoZXJlIHRoZSBzdGFjayBpcyBkZXBsb3llZFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlVGVtcGxhdGVPcHRpb25zIHtcbiAgc3RhY2tOYW1lOiBzdHJpbmc7XG4gIGZpbHRlcnM/OiBzdHJpbmdbXTtcbiAgZnJvbVNjYW4/OiBGcm9tU2NhbjtcbiAgc2RrUHJvdmlkZXI6IFNka1Byb3ZpZGVyO1xuICBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQ7XG59XG5cbi8qKlxuICogSW50ZXJmYWNlIGZvciB0aGUgb3V0cHV0IG9mIHRoZSBnZW5lcmF0ZVRlbXBsYXRlIGZ1bmN0aW9uXG4gKlxuICogQHBhcmFtIG1pZ3JhdGVKc29uIFRoZSBnZW5lcmF0ZWQgTWlncmF0ZS5qc29uIGZpbGVcbiAqIEBwYXJhbSByZXNvdXJjZXMgVGhlIGdlbmVyYXRlZCB0ZW1wbGF0ZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlVGVtcGxhdGVPdXRwdXQge1xuICBtaWdyYXRlSnNvbjogTWlncmF0ZUpzb25Gb3JtYXQ7XG4gIHJlc291cmNlcz86IFJlc291cmNlRGV0YWlsW107XG4gIHRlbXBsYXRlSWQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogSW50ZXJmYWNlIGRlZmluaW5nIHRoZSBmb3JtYXQgb2YgdGhlIGdlbmVyYXRlZCBNaWdyYXRlLmpzb24gZmlsZVxuICpcbiAqIEBwYXJhbSBUZW1wbGF0ZUJvZHkgVGhlIGdlbmVyYXRlZCB0ZW1wbGF0ZVxuICogQHBhcmFtIFNvdXJjZSBUaGUgc291cmNlIG9mIHRoZSB0ZW1wbGF0ZVxuICogQHBhcmFtIFJlc291cmNlcyBBIGxpc3Qgb2YgcmVzb3VyY2VzIHRoYXQgd2VyZSB1c2VkIHRvIGdlbmVyYXRlIHRoZSB0ZW1wbGF0ZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1pZ3JhdGVKc29uRm9ybWF0IHtcbiAgdGVtcGxhdGVCb2R5OiBzdHJpbmc7XG4gIHNvdXJjZTogc3RyaW5nO1xuICByZXNvdXJjZXM/OiBHZW5lcmF0ZWRSZXNvdXJjZUltcG9ydElkZW50aWZpZXJbXTtcbn1cblxuLyoqXG4gKiBJbnRlcmZhY2UgcmVwcmVzZW50aW5nIHRoZSBmb3JtYXQgb2YgYSByZXNvdXJjZSBpZGVudGlmaWVyIHJlcXVpcmVkIGZvciByZXNvdXJjZSBpbXBvcnRcbiAqXG4gKiBAcGFyYW0gUmVzb3VyY2VUeXBlIFRoZSB0eXBlIG9mIHJlc291cmNlXG4gKiBAcGFyYW0gTG9naWNhbFJlc291cmNlSWQgVGhlIGxvZ2ljYWwgaWQgb2YgdGhlIHJlc291cmNlXG4gKiBAcGFyYW0gUmVzb3VyY2VJZGVudGlmaWVyIFRoZSByZXNvdXJjZSBpZGVudGlmaWVyIG9mIHRoZSByZXNvdXJjZVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlZFJlc291cmNlSW1wb3J0SWRlbnRpZmllciB7XG4gIC8vIGNkayBkZXBsb3kgZXhwZWN0cyB0aGUgbWlncmF0ZS5qc29uIHJlc291cmNlIGlkZW50aWZpZXJzIHRvIGJlIFBhc2NhbENhc2UsIG5vdCBjYW1lbENhc2UuXG4gIFJlc291cmNlVHlwZTogc3RyaW5nO1xuICBMb2dpY2FsUmVzb3VyY2VJZDogc3RyaW5nO1xuICBSZXNvdXJjZUlkZW50aWZpZXI6IFJlc291cmNlSWRlbnRpZmllclN1bW1hcnk7XG59XG4iXX0=