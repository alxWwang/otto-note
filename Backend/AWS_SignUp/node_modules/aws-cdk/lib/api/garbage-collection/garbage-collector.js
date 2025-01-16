"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GarbageCollector = exports.ObjectAsset = exports.ImageAsset = exports.ECR_ISOLATED_TAG = exports.S3_ISOLATED_TAG = void 0;
const chalk = require("chalk");
const promptly = require("promptly");
const logging_1 = require("../../logging");
const toolkit_info_1 = require("../toolkit-info");
const progress_printer_1 = require("./progress-printer");
const stack_refresh_1 = require("./stack-refresh");
const error_1 = require("../../toolkit/error");
const mode_1 = require("../plugin/mode");
// Must use a require() otherwise esbuild complains
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pLimit = require('p-limit');
exports.S3_ISOLATED_TAG = 'aws-cdk:isolated';
exports.ECR_ISOLATED_TAG = 'aws-cdk.isolated'; // ':' is not valid in ECR tags
const P_LIMIT = 50;
const DAY = 24 * 60 * 60 * 1000; // Number of milliseconds in a day
/**
 * An image asset that lives in the bootstrapped ECR Repository
 */
class ImageAsset {
    constructor(digest, size, tags, manifest) {
        this.digest = digest;
        this.size = size;
        this.tags = tags;
        this.manifest = manifest;
    }
    getTag(tag) {
        return this.tags.find(t => t.includes(tag));
    }
    hasTag(tag) {
        return this.tags.some(t => t.includes(tag));
    }
    hasIsolatedTag() {
        return this.hasTag(exports.ECR_ISOLATED_TAG);
    }
    getIsolatedTag() {
        return this.getTag(exports.ECR_ISOLATED_TAG);
    }
    isolatedTagBefore(date) {
        const dateIsolated = this.dateIsolated();
        if (!dateIsolated || dateIsolated == '') {
            return false;
        }
        return new Date(dateIsolated) < date;
    }
    buildImageTag(inc) {
        // isolatedTag will look like "X-aws-cdk.isolated-YYYYY"
        return `${inc}-${exports.ECR_ISOLATED_TAG}-${String(Date.now())}`;
    }
    dateIsolated() {
        // isolatedTag will look like "X-aws-cdk.isolated-YYYYY"
        return this.getIsolatedTag()?.split('-')[3];
    }
}
exports.ImageAsset = ImageAsset;
/**
 * An object asset that lives in the bootstrapped S3 Bucket
 */
class ObjectAsset {
    constructor(bucket, key, size) {
        this.bucket = bucket;
        this.key = key;
        this.size = size;
        this.cached_tags = undefined;
    }
    fileName() {
        return this.key.split('.')[0];
    }
    async allTags(s3) {
        if (this.cached_tags) {
            return this.cached_tags;
        }
        const response = await s3.getObjectTagging({ Bucket: this.bucket, Key: this.key });
        this.cached_tags = response.TagSet;
        return this.cached_tags;
    }
    getTag(tag) {
        if (!this.cached_tags) {
            throw new error_1.ToolkitError('Cannot call getTag before allTags');
        }
        return this.cached_tags.find((t) => t.Key === tag)?.Value;
    }
    hasTag(tag) {
        if (!this.cached_tags) {
            throw new error_1.ToolkitError('Cannot call hasTag before allTags');
        }
        return this.cached_tags.some((t) => t.Key === tag);
    }
    hasIsolatedTag() {
        return this.hasTag(exports.S3_ISOLATED_TAG);
    }
    isolatedTagBefore(date) {
        const tagValue = this.getTag(exports.S3_ISOLATED_TAG);
        if (!tagValue || tagValue == '') {
            return false;
        }
        return new Date(tagValue) < date;
    }
}
exports.ObjectAsset = ObjectAsset;
/**
 * A class to facilitate Garbage Collection of S3 and ECR assets
 */
class GarbageCollector {
    constructor(props) {
        this.props = props;
        this.garbageCollectS3Assets = ['s3', 'all'].includes(props.type);
        this.garbageCollectEcrAssets = ['ecr', 'all'].includes(props.type);
        (0, logging_1.debug)(`${this.garbageCollectS3Assets} ${this.garbageCollectEcrAssets}`);
        this.permissionToDelete = ['delete-tagged', 'full'].includes(props.action);
        this.permissionToTag = ['tag', 'full'].includes(props.action);
        this.confirm = props.confirm ?? true;
        this.bootstrapStackName = props.bootstrapStackName ?? toolkit_info_1.DEFAULT_TOOLKIT_STACK_NAME;
    }
    /**
     * Perform garbage collection on the resolved environment.
     */
    async garbageCollect() {
        // SDKs
        const sdk = (await this.props.sdkProvider.forEnvironment(this.props.resolvedEnvironment, mode_1.Mode.ForWriting)).sdk;
        const cfn = sdk.cloudFormation();
        const qualifier = await this.bootstrapQualifier(sdk, this.bootstrapStackName);
        const activeAssets = new stack_refresh_1.ActiveAssetCache();
        // Grab stack templates first
        await (0, stack_refresh_1.refreshStacks)(cfn, activeAssets, qualifier);
        // Start the background refresh
        const backgroundStackRefresh = new stack_refresh_1.BackgroundStackRefresh({
            cfn,
            activeAssets,
            qualifier,
        });
        backgroundStackRefresh.start();
        try {
            if (this.garbageCollectS3Assets) {
                await this.garbageCollectS3(sdk, activeAssets, backgroundStackRefresh);
            }
            if (this.garbageCollectEcrAssets) {
                await this.garbageCollectEcr(sdk, activeAssets, backgroundStackRefresh);
            }
        }
        catch (err) {
            throw new error_1.ToolkitError(err);
        }
        finally {
            backgroundStackRefresh.stop();
        }
    }
    /**
     * Perform garbage collection on ECR assets
     */
    async garbageCollectEcr(sdk, activeAssets, backgroundStackRefresh) {
        const ecr = sdk.ecr();
        const repo = await this.bootstrapRepositoryName(sdk, this.bootstrapStackName);
        const numImages = await this.numImagesInRepo(ecr, repo);
        const printer = new progress_printer_1.ProgressPrinter(numImages, 1000);
        (0, logging_1.debug)(`Found bootstrap repo ${repo} with ${numImages} images`);
        try {
            // const batches = 1;
            const batchSize = 1000;
            const currentTime = Date.now();
            const graceDays = this.props.rollbackBufferDays;
            (0, logging_1.debug)(`Parsing through ${numImages} images in batches`);
            for await (const batch of this.readRepoInBatches(ecr, repo, batchSize, currentTime)) {
                await backgroundStackRefresh.noOlderThan(600000); // 10 mins
                printer.start();
                const { included: isolated, excluded: notIsolated } = partition(batch, asset => !asset.tags.some(t => activeAssets.contains(t)));
                (0, logging_1.debug)(`${isolated.length} isolated images`);
                (0, logging_1.debug)(`${notIsolated.length} not isolated images`);
                (0, logging_1.debug)(`${batch.length} images total`);
                let deletables = isolated;
                let taggables = [];
                let untaggables = [];
                if (graceDays > 0) {
                    (0, logging_1.debug)('Filtering out images that are not old enough to delete');
                    // We delete images that are not referenced in ActiveAssets and have the Isolated Tag with a date
                    // earlier than the current time - grace period.
                    deletables = isolated.filter(img => img.isolatedTagBefore(new Date(currentTime - (graceDays * DAY))));
                    // We tag images that are not referenced in ActiveAssets and do not have the Isolated Tag.
                    taggables = isolated.filter(img => !img.hasIsolatedTag());
                    // We untag images that are referenced in ActiveAssets and currently have the Isolated Tag.
                    untaggables = notIsolated.filter(img => img.hasIsolatedTag());
                }
                (0, logging_1.debug)(`${deletables.length} deletable assets`);
                (0, logging_1.debug)(`${taggables.length} taggable assets`);
                (0, logging_1.debug)(`${untaggables.length} assets to untag`);
                if (this.permissionToDelete && deletables.length > 0) {
                    await this.confirmationPrompt(printer, deletables, 'image');
                    await this.parallelDeleteEcr(ecr, repo, deletables, printer);
                }
                if (this.permissionToTag && taggables.length > 0) {
                    await this.parallelTagEcr(ecr, repo, taggables, printer);
                }
                if (this.permissionToTag && untaggables.length > 0) {
                    await this.parallelUntagEcr(ecr, repo, untaggables);
                }
                printer.reportScannedAsset(batch.length);
            }
        }
        catch (err) {
            throw new error_1.ToolkitError(err);
        }
        finally {
            printer.stop();
        }
    }
    /**
     * Perform garbage collection on S3 assets
     */
    async garbageCollectS3(sdk, activeAssets, backgroundStackRefresh) {
        const s3 = sdk.s3();
        const bucket = await this.bootstrapBucketName(sdk, this.bootstrapStackName);
        const numObjects = await this.numObjectsInBucket(s3, bucket);
        const printer = new progress_printer_1.ProgressPrinter(numObjects, 1000);
        (0, logging_1.debug)(`Found bootstrap bucket ${bucket} with ${numObjects} objects`);
        try {
            const batchSize = 1000;
            const currentTime = Date.now();
            const graceDays = this.props.rollbackBufferDays;
            (0, logging_1.debug)(`Parsing through ${numObjects} objects in batches`);
            // Process objects in batches of 1000
            // This is the batch limit of s3.DeleteObject and we intend to optimize for the "worst case" scenario
            // where gc is run for the first time on a long-standing bucket where ~100% of objects are isolated.
            for await (const batch of this.readBucketInBatches(s3, bucket, batchSize, currentTime)) {
                await backgroundStackRefresh.noOlderThan(600000); // 10 mins
                printer.start();
                const { included: isolated, excluded: notIsolated } = partition(batch, asset => !activeAssets.contains(asset.fileName()));
                (0, logging_1.debug)(`${isolated.length} isolated assets`);
                (0, logging_1.debug)(`${notIsolated.length} not isolated assets`);
                (0, logging_1.debug)(`${batch.length} objects total`);
                let deletables = isolated;
                let taggables = [];
                let untaggables = [];
                if (graceDays > 0) {
                    (0, logging_1.debug)('Filtering out assets that are not old enough to delete');
                    await this.parallelReadAllTags(s3, batch);
                    // We delete objects that are not referenced in ActiveAssets and have the Isolated Tag with a date
                    // earlier than the current time - grace period.
                    deletables = isolated.filter(obj => obj.isolatedTagBefore(new Date(currentTime - (graceDays * DAY))));
                    // We tag objects that are not referenced in ActiveAssets and do not have the Isolated Tag.
                    taggables = isolated.filter(obj => !obj.hasIsolatedTag());
                    // We untag objects that are referenced in ActiveAssets and currently have the Isolated Tag.
                    untaggables = notIsolated.filter(obj => obj.hasIsolatedTag());
                }
                (0, logging_1.debug)(`${deletables.length} deletable assets`);
                (0, logging_1.debug)(`${taggables.length} taggable assets`);
                (0, logging_1.debug)(`${untaggables.length} assets to untag`);
                if (this.permissionToDelete && deletables.length > 0) {
                    await this.confirmationPrompt(printer, deletables, 'object');
                    await this.parallelDeleteS3(s3, bucket, deletables, printer);
                }
                if (this.permissionToTag && taggables.length > 0) {
                    await this.parallelTagS3(s3, bucket, taggables, currentTime, printer);
                }
                if (this.permissionToTag && untaggables.length > 0) {
                    await this.parallelUntagS3(s3, bucket, untaggables);
                }
                printer.reportScannedAsset(batch.length);
            }
        }
        catch (err) {
            throw new error_1.ToolkitError(err);
        }
        finally {
            printer.stop();
        }
    }
    async parallelReadAllTags(s3, objects) {
        const limit = pLimit(P_LIMIT);
        for (const obj of objects) {
            await limit(() => obj.allTags(s3));
        }
    }
    /**
     * Untag assets that were previously tagged, but now currently referenced.
     * Since this is treated as an implementation detail, we do not print the results in the printer.
     */
    async parallelUntagEcr(ecr, repo, untaggables) {
        const limit = pLimit(P_LIMIT);
        for (const img of untaggables) {
            const tag = img.getIsolatedTag();
            await limit(() => ecr.batchDeleteImage({
                repositoryName: repo,
                imageIds: [{
                        imageTag: tag,
                    }],
            }));
        }
        (0, logging_1.debug)(`Untagged ${untaggables.length} assets`);
    }
    /**
     * Untag assets that were previously tagged, but now currently referenced.
     * Since this is treated as an implementation detail, we do not print the results in the printer.
     */
    async parallelUntagS3(s3, bucket, untaggables) {
        const limit = pLimit(P_LIMIT);
        for (const obj of untaggables) {
            const tags = await obj.allTags(s3) ?? [];
            const updatedTags = tags.filter((tag) => tag.Key !== exports.S3_ISOLATED_TAG);
            await limit(() => s3.deleteObjectTagging({
                Bucket: bucket,
                Key: obj.key,
            }));
            await limit(() => s3.putObjectTagging({
                Bucket: bucket,
                Key: obj.key,
                Tagging: {
                    TagSet: updatedTags,
                },
            }));
        }
        (0, logging_1.debug)(`Untagged ${untaggables.length} assets`);
    }
    /**
     * Tag images in parallel using p-limit
     */
    async parallelTagEcr(ecr, repo, taggables, printer) {
        const limit = pLimit(P_LIMIT);
        for (let i = 0; i < taggables.length; i++) {
            const img = taggables[i];
            const tagEcr = async () => {
                try {
                    await ecr.putImage({
                        repositoryName: repo,
                        imageDigest: img.digest,
                        imageManifest: img.manifest,
                        imageTag: img.buildImageTag(i),
                    });
                }
                catch (error) {
                    // This is a false negative -- an isolated asset is untagged
                    // likely due to an imageTag collision. We can safely ignore,
                    // and the isolated asset will be tagged next time.
                    (0, logging_1.debug)(`Warning: unable to tag image ${JSON.stringify(img.tags)} with ${img.buildImageTag(i)} due to the following error: ${error}`);
                }
            };
            await limit(() => tagEcr());
        }
        printer.reportTaggedAsset(taggables);
        (0, logging_1.debug)(`Tagged ${taggables.length} assets`);
    }
    /**
     * Tag objects in parallel using p-limit. The putObjectTagging API does not
     * support batch tagging so we must handle the parallelism client-side.
     */
    async parallelTagS3(s3, bucket, taggables, date, printer) {
        const limit = pLimit(P_LIMIT);
        for (const obj of taggables) {
            await limit(() => s3.putObjectTagging({
                Bucket: bucket,
                Key: obj.key,
                Tagging: {
                    TagSet: [
                        {
                            Key: exports.S3_ISOLATED_TAG,
                            Value: String(date),
                        },
                    ],
                },
            }));
        }
        printer.reportTaggedAsset(taggables);
        (0, logging_1.debug)(`Tagged ${taggables.length} assets`);
    }
    /**
     * Delete images in parallel. The deleteImage API supports batches of 100.
     */
    async parallelDeleteEcr(ecr, repo, deletables, printer) {
        const batchSize = 100;
        const imagesToDelete = deletables.map(img => ({
            imageDigest: img.digest,
        }));
        try {
            const batches = [];
            for (let i = 0; i < imagesToDelete.length; i += batchSize) {
                batches.push(imagesToDelete.slice(i, i + batchSize));
            }
            // Delete images in batches
            for (const batch of batches) {
                await ecr.batchDeleteImage({
                    imageIds: batch,
                    repositoryName: repo,
                });
                const deletedCount = batch.length;
                (0, logging_1.debug)(`Deleted ${deletedCount} assets`);
                printer.reportDeletedAsset(deletables.slice(0, deletedCount));
            }
        }
        catch (err) {
            (0, logging_1.print)(chalk.red(`Error deleting images: ${err}`));
        }
    }
    /**
     * Delete objects in parallel. The deleteObjects API supports batches of 1000.
     */
    async parallelDeleteS3(s3, bucket, deletables, printer) {
        const batchSize = 1000;
        const objectsToDelete = deletables.map(asset => ({
            Key: asset.key,
        }));
        try {
            const batches = [];
            for (let i = 0; i < objectsToDelete.length; i += batchSize) {
                batches.push(objectsToDelete.slice(i, i + batchSize));
            }
            // Delete objects in batches
            for (const batch of batches) {
                await s3.deleteObjects({
                    Bucket: bucket,
                    Delete: {
                        Objects: batch,
                        Quiet: true,
                    },
                });
                const deletedCount = batch.length;
                (0, logging_1.debug)(`Deleted ${deletedCount} assets`);
                printer.reportDeletedAsset(deletables.slice(0, deletedCount));
            }
        }
        catch (err) {
            (0, logging_1.print)(chalk.red(`Error deleting objects: ${err}`));
        }
    }
    async bootstrapBucketName(sdk, bootstrapStackName) {
        const info = await toolkit_info_1.ToolkitInfo.lookup(this.props.resolvedEnvironment, sdk, bootstrapStackName);
        return info.bucketName;
    }
    async bootstrapRepositoryName(sdk, bootstrapStackName) {
        const info = await toolkit_info_1.ToolkitInfo.lookup(this.props.resolvedEnvironment, sdk, bootstrapStackName);
        return info.repositoryName;
    }
    async bootstrapQualifier(sdk, bootstrapStackName) {
        const info = await toolkit_info_1.ToolkitInfo.lookup(this.props.resolvedEnvironment, sdk, bootstrapStackName);
        return info.bootstrapStack.parameters.Qualifier;
    }
    async numObjectsInBucket(s3, bucket) {
        let totalCount = 0;
        let continuationToken;
        do {
            const response = await s3.listObjectsV2({
                Bucket: bucket,
                ContinuationToken: continuationToken,
            });
            totalCount += response.KeyCount ?? 0;
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
        return totalCount;
    }
    async numImagesInRepo(ecr, repo) {
        let totalCount = 0;
        let nextToken;
        do {
            const response = await ecr.listImages({
                repositoryName: repo,
                nextToken: nextToken,
            });
            totalCount += response.imageIds?.length ?? 0;
            nextToken = response.nextToken;
        } while (nextToken);
        return totalCount;
    }
    async *readRepoInBatches(ecr, repo, batchSize = 1000, currentTime) {
        let continuationToken;
        do {
            const batch = [];
            while (batch.length < batchSize) {
                const response = await ecr.listImages({
                    repositoryName: repo,
                    nextToken: continuationToken,
                });
                // No images in the repository
                if (!response.imageIds || response.imageIds.length === 0) {
                    break;
                }
                // map unique image digest to (possibly multiple) tags
                const images = imageMap(response.imageIds ?? []);
                const imageIds = Object.keys(images).map(key => ({
                    imageDigest: key,
                }));
                const describeImageInfo = await ecr.describeImages({
                    repositoryName: repo,
                    imageIds: imageIds,
                });
                const getImageInfo = await ecr.batchGetImage({
                    repositoryName: repo,
                    imageIds: imageIds,
                });
                const combinedImageInfo = describeImageInfo.imageDetails?.map(imageDetail => {
                    const matchingImage = getImageInfo.images?.find(img => img.imageId?.imageDigest === imageDetail.imageDigest);
                    return {
                        ...imageDetail,
                        manifest: matchingImage?.imageManifest,
                    };
                });
                for (const image of combinedImageInfo ?? []) {
                    const lastModified = image.imagePushedAt ?? new Date(currentTime);
                    // Store the image if it was pushed earlier than today - createdBufferDays
                    if (image.imageDigest && lastModified < new Date(currentTime - (this.props.createdBufferDays * DAY))) {
                        batch.push(new ImageAsset(image.imageDigest, image.imageSizeInBytes ?? 0, image.imageTags ?? [], image.manifest ?? ''));
                    }
                }
                continuationToken = response.nextToken;
                if (!continuationToken)
                    break; // No more images to fetch
            }
            if (batch.length > 0) {
                yield batch;
            }
        } while (continuationToken);
    }
    /**
     * Generator function that reads objects from the S3 Bucket in batches.
     */
    async *readBucketInBatches(s3, bucket, batchSize = 1000, currentTime) {
        let continuationToken;
        do {
            const batch = [];
            while (batch.length < batchSize) {
                const response = await s3.listObjectsV2({
                    Bucket: bucket,
                    ContinuationToken: continuationToken,
                });
                response.Contents?.forEach((obj) => {
                    const key = obj.Key ?? '';
                    const size = obj.Size ?? 0;
                    const lastModified = obj.LastModified ?? new Date(currentTime);
                    // Store the object if it has a Key and
                    // if it has not been modified since today - createdBufferDays
                    if (key && lastModified < new Date(currentTime - (this.props.createdBufferDays * DAY))) {
                        batch.push(new ObjectAsset(bucket, key, size));
                    }
                });
                continuationToken = response.NextContinuationToken;
                if (!continuationToken)
                    break; // No more objects to fetch
            }
            if (batch.length > 0) {
                yield batch;
            }
        } while (continuationToken);
    }
    async confirmationPrompt(printer, deletables, type) {
        const pluralize = (name, count) => {
            return count === 1 ? name : `${name}s`;
        };
        if (this.confirm) {
            const message = [
                `Found ${deletables.length} ${pluralize(type, deletables.length)} to delete based off of the following criteria:`,
                `- ${type}s have been isolated for > ${this.props.rollbackBufferDays} days`,
                `- ${type}s were created > ${this.props.createdBufferDays} days ago`,
                '',
                'Delete this batch (yes/no/delete-all)?',
            ].join('\n');
            printer.pause();
            const response = await promptly.prompt(message, { trim: true });
            // Anything other than yes/y/delete-all is treated as no
            if (!response || !['yes', 'y', 'delete-all'].includes(response.toLowerCase())) {
                throw new error_1.ToolkitError('Deletion aborted by user');
            }
            else if (response.toLowerCase() == 'delete-all') {
                this.confirm = false;
            }
        }
        printer.resume();
    }
}
exports.GarbageCollector = GarbageCollector;
function partition(xs, pred) {
    const result = {
        included: [],
        excluded: [],
    };
    for (const x of xs) {
        if (pred(x)) {
            result.included.push(x);
        }
        else {
            result.excluded.push(x);
        }
    }
    return result;
}
function imageMap(imageIds) {
    const images = {};
    for (const image of imageIds ?? []) {
        if (!image.imageDigest || !image.imageTag) {
            continue;
        }
        if (!images[image.imageDigest]) {
            images[image.imageDigest] = [];
        }
        images[image.imageDigest].push(image.imageTag);
    }
    return images;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FyYmFnZS1jb2xsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYXJiYWdlLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSwrQkFBK0I7QUFDL0IscUNBQXFDO0FBQ3JDLDJDQUE2QztBQUU3QyxrREFBMEU7QUFDMUUseURBQXFEO0FBQ3JELG1EQUEwRjtBQUMxRiwrQ0FBbUQ7QUFDbkQseUNBQXNDO0FBRXRDLG1EQUFtRDtBQUNuRCxpRUFBaUU7QUFDakUsTUFBTSxNQUFNLEdBQTZCLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUUvQyxRQUFBLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQztBQUNyQyxRQUFBLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDLENBQUMsK0JBQStCO0FBQ25GLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNuQixNQUFNLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxrQ0FBa0M7QUFJbkU7O0dBRUc7QUFDSCxNQUFhLFVBQVU7SUFDckIsWUFDa0IsTUFBYyxFQUNkLElBQVksRUFDWixJQUFjLEVBQ2QsUUFBZ0I7UUFIaEIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ2QsYUFBUSxHQUFSLFFBQVEsQ0FBUTtJQUMvQixDQUFDO0lBRUksTUFBTSxDQUFDLEdBQVc7UUFDeEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRU8sTUFBTSxDQUFDLEdBQVc7UUFDeEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMs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QUM7SUFFRixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ25CLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDWixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNOLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLFFBQTJCO0lBQzNDLE1BQU0sTUFBTSxHQUE2QixFQUFFLENBQUM7SUFDNUMsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFBQyxTQUFTO1FBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLENBQUM7UUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjeGFwaSBmcm9tICdAYXdzLWNkay9jeC1hcGknO1xuaW1wb3J0IHsgSW1hZ2VJZGVudGlmaWVyIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWVjcic7XG5pbXBvcnQgeyBUYWcgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xuaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcHJvbXB0bHkgZnJvbSAncHJvbXB0bHknO1xuaW1wb3J0IHsgZGVidWcsIHByaW50IH0gZnJvbSAnLi4vLi4vbG9nZ2luZyc7XG5pbXBvcnQgeyBJRUNSQ2xpZW50LCBJUzNDbGllbnQsIFNESywgU2RrUHJvdmlkZXIgfSBmcm9tICcuLi9hd3MtYXV0aCc7XG5pbXBvcnQgeyBERUZBVUxUX1RPT0xLSVRfU1RBQ0tfTkFNRSwgVG9vbGtpdEluZm8gfSBmcm9tICcuLi90b29sa2l0LWluZm8nO1xuaW1wb3J0IHsgUHJvZ3Jlc3NQcmludGVyIH0gZnJvbSAnLi9wcm9ncmVzcy1wcmludGVyJztcbmltcG9ydCB7IEFjdGl2ZUFzc2V0Q2FjaGUsIEJhY2tncm91bmRTdGFja1JlZnJlc2gsIHJlZnJlc2hTdGFja3MgfSBmcm9tICcuL3N0YWNrLXJlZnJlc2gnO1xuaW1wb3J0IHsgVG9vbGtpdEVycm9yIH0gZnJvbSAnLi4vLi4vdG9vbGtpdC9lcnJvcic7XG5pbXBvcnQgeyBNb2RlIH0gZnJvbSAnLi4vcGx1Z2luL21vZGUnO1xuXG4vLyBNdXN0IHVzZSBhIHJlcXVpcmUoKSBvdGhlcndpc2UgZXNidWlsZCBjb21wbGFpbnNcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tcmVxdWlyZS1pbXBvcnRzXG5jb25zdCBwTGltaXQ6IHR5cGVvZiBpbXBvcnQoJ3AtbGltaXQnKSA9IHJlcXVpcmUoJ3AtbGltaXQnKTtcblxuZXhwb3J0IGNvbnN0IFMzX0lTT0xBVEVEX1RBRyA9ICdhd3MtY2RrOmlzb2xhdGVkJztcbmV4cG9ydCBjb25zdCBFQ1JfSVNPTEFURURfVEFHID0gJ2F3cy1jZGsuaXNvbGF0ZWQnOyAvLyAnOicgaXMgbm90IHZhbGlkIGluIEVDUiB0YWdzXG5jb25zdCBQX0xJTUlUID0gNTA7XG5jb25zdCBEQVkgPSAyNCAqIDYwICogNjAgKiAxMDAwOyAvLyBOdW1iZXIgb2YgbWlsbGlzZWNvbmRzIGluIGEgZGF5XG5cbmV4cG9ydCB0eXBlIEdjQXNzZXQgPSBJbWFnZUFzc2V0IHwgT2JqZWN0QXNzZXQ7XG5cbi8qKlxuICogQW4gaW1hZ2UgYXNzZXQgdGhhdCBsaXZlcyBpbiB0aGUgYm9vdHN0cmFwcGVkIEVDUiBSZXBvc2l0b3J5XG4gKi9cbmV4cG9ydCBjbGFzcyBJbWFnZUFzc2V0IHtcbiAgcHVibGljIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBkaWdlc3Q6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc2l6ZTogbnVtYmVyLFxuICAgIHB1YmxpYyByZWFkb25seSB0YWdzOiBzdHJpbmdbXSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgbWFuaWZlc3Q6IHN0cmluZyxcbiAgKSB7fVxuXG4gIHByaXZhdGUgZ2V0VGFnKHRhZzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMudGFncy5maW5kKHQgPT4gdC5pbmNsdWRlcyh0YWcpKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzVGFnKHRhZzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMudGFncy5zb21lKHQgPT4gdC5pbmNsdWRlcyh0YWcpKTtcbiAgfVxuXG4gIHB1YmxpYyBoYXNJc29sYXRlZFRhZygpIHtcbiAgICByZXR1cm4gdGhpcy5oYXNUYWcoRUNSX0lTT0xBVEVEX1RBRyk7XG4gIH1cblxuICBwdWJsaWMgZ2V0SXNvbGF0ZWRUYWcoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0VGFnKEVDUl9JU09MQVRFRF9UQUcpO1xuICB9XG5cbiAgcHVibGljIGlzb2xhdGVkVGFnQmVmb3JlKGRhdGU6IERhdGUpIHtcbiAgICBjb25zdCBkYXRlSXNvbGF0ZWQgPSB0aGlzLmRhdGVJc29sYXRlZCgpO1xuICAgIGlmICghZGF0ZUlzb2xhdGVkIHx8IGRhdGVJc29sYXRlZCA9PSAnJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IERhdGUoZGF0ZUlzb2xhdGVkKSA8IGRhdGU7XG4gIH1cblxuICBwdWJsaWMgYnVpbGRJbWFnZVRhZyhpbmM6IG51bWJlcikge1xuICAgIC8vIGlzb2xhdGVkVGFnIHdpbGwgbG9vayBsaWtlIFwiWC1hd3MtY2RrLmlzb2xhdGVkLVlZWVlZXCJcbiAgICByZXR1cm4gYCR7aW5jfS0ke0VDUl9JU09MQVRFRF9UQUd9LSR7U3RyaW5nKERhdGUubm93KCkpfWA7XG4gIH1cblxuICBwdWJsaWMgZGF0ZUlzb2xhdGVkKCkge1xuICAgIC8vIGlzb2xhdGVkVGFnIHdpbGwgbG9vayBsaWtlIFwiWC1hd3MtY2RrLmlzb2xhdGVkLVlZWVlZXCJcbiAgICByZXR1cm4gdGhpcy5nZXRJc29sYXRlZFRhZygpPy5zcGxpdCgnLScpWzNdO1xuICB9XG59XG5cbi8qKlxuICogQW4gb2JqZWN0IGFzc2V0IHRoYXQgbGl2ZXMgaW4gdGhlIGJvb3RzdHJhcHBlZCBTMyBCdWNrZXRcbiAqL1xuZXhwb3J0IGNsYXNzIE9iamVjdEFzc2V0IHtcbiAgcHJpdmF0ZSBjYWNoZWRfdGFnczogVGFnW10gfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgYnVja2V0OiBzdHJpbmcsIHB1YmxpYyByZWFkb25seSBrZXk6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IHNpemU6IG51bWJlcikge31cblxuICBwdWJsaWMgZmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5rZXkuc3BsaXQoJy4nKVswXTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBhbGxUYWdzKHMzOiBJUzNDbGllbnQpIHtcbiAgICBpZiAodGhpcy5jYWNoZWRfdGFncykge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGVkX3RhZ3M7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzMy5nZXRPYmplY3RUYWdnaW5nKHsgQnVja2V0OiB0aGlzLmJ1Y2tldCwgS2V5OiB0aGlzLmtleSB9KTtcbiAgICB0aGlzLmNhY2hlZF90YWdzID0gcmVzcG9uc2UuVGFnU2V0O1xuICAgIHJldHVybiB0aGlzLmNhY2hlZF90YWdzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUYWcodGFnOiBzdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMuY2FjaGVkX3RhZ3MpIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoJ0Nhbm5vdCBjYWxsIGdldFRhZyBiZWZvcmUgYWxsVGFncycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jYWNoZWRfdGFncy5maW5kKCh0OiBhbnkpID0+IHQuS2V5ID09PSB0YWcpPy5WYWx1ZTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzVGFnKHRhZzogc3RyaW5nKSB7XG4gICAgaWYgKCF0aGlzLmNhY2hlZF90YWdzKSB7XG4gICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdDYW5ub3QgY2FsbCBoYXNUYWcgYmVmb3JlIGFsbFRhZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY2FjaGVkX3RhZ3Muc29tZSgodDogYW55KSA9PiB0LktleSA9PT0gdGFnKTtcbiAgfVxuXG4gIHB1YmxpYyBoYXNJc29sYXRlZFRhZygpIHtcbiAgICByZXR1cm4gdGhpcy5oYXNUYWcoUzNfSVNPTEFURURfVEFHKTtcbiAgfVxuXG4gIHB1YmxpYyBpc29sYXRlZFRhZ0JlZm9yZShkYXRlOiBEYXRlKSB7XG4gICAgY29uc3QgdGFnVmFsdWUgPSB0aGlzLmdldFRhZyhTM19JU09MQVRFRF9UQUcpO1xuICAgIGlmICghdGFnVmFsdWUgfHwgdGFnVmFsdWUgPT0gJycpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBEYXRlKHRhZ1ZhbHVlKSA8IGRhdGU7XG4gIH1cbn1cblxuLyoqXG4gKiBQcm9wcyBmb3IgdGhlIEdhcmJhZ2UgQ29sbGVjdG9yXG4gKi9cbmludGVyZmFjZSBHYXJiYWdlQ29sbGVjdG9yUHJvcHMge1xuICAvKipcbiAgICogVGhlIGFjdGlvbiB0byBwZXJmb3JtLiBTcGVjaWZ5IHRoaXMgaWYgeW91IHdhbnQgdG8gcGVyZm9ybSBhIHRydW5jYXRlZCBzZXRcbiAgICogb2YgYWN0aW9ucyBhdmFpbGFibGUuXG4gICAqL1xuICByZWFkb25seSBhY3Rpb246ICdwcmludCcgfCAndGFnJyB8ICdkZWxldGUtdGFnZ2VkJyB8ICdmdWxsJztcblxuICAvKipcbiAgICogVGhlIHR5cGUgb2YgYXNzZXQgdG8gZ2FyYmFnZSBjb2xsZWN0LlxuICAgKi9cbiAgcmVhZG9ubHkgdHlwZTogJ3MzJyB8ICdlY3InIHwgJ2FsbCc7XG5cbiAgLyoqXG4gICAqIFRoZSBkYXlzIGFuIGFzc2V0IG11c3QgYmUgaW4gaXNvbGF0aW9uIGJlZm9yZSBiZWluZyBhY3R1YWxseSBkZWxldGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgcm9sbGJhY2tCdWZmZXJEYXlzOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFJlZnVzZSBkZWxldGlvbiBvZiBhbnkgYXNzZXRzIHlvdW5nZXIgdGhhbiB0aGlzIG51bWJlciBvZiBkYXlzLlxuICAgKi9cbiAgcmVhZG9ubHkgY3JlYXRlZEJ1ZmZlckRheXM6IG51bWJlcjtcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IHRvIGRlcGxveSB0aGlzIHN0YWNrIGluXG4gICAqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBvbiB0aGUgc3RhY2sgYXJ0aWZhY3QgbWF5IGJlIHVucmVzb2x2ZWQsIHRoaXMgb25lXG4gICAqIG11c3QgYmUgcmVzb2x2ZWQuXG4gICAqL1xuICByZWFkb25seSByZXNvbHZlZEVudmlyb25tZW50OiBjeGFwaS5FbnZpcm9ubWVudDtcblxuICAvKipcbiAgICogU0RLIHByb3ZpZGVyIChzZWVkZWQgd2l0aCBkZWZhdWx0IGNyZWRlbnRpYWxzKVxuICAgKlxuICAgKiBXaWxsIGJlIHVzZWQgdG8gbWFrZSBTREsgY2FsbHMgdG8gQ2xvdWRGb3JtYXRpb24sIFMzLCBhbmQgRUNSLlxuICAgKi9cbiAgcmVhZG9ubHkgc2RrUHJvdmlkZXI6IFNka1Byb3ZpZGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgYm9vdHN0cmFwIHN0YWNrIHRvIGxvb2sgZm9yLlxuICAgKlxuICAgKiBAZGVmYXVsdCBERUZBVUxUX1RPT0xLSVRfU1RBQ0tfTkFNRVxuICAgKi9cbiAgcmVhZG9ubHkgYm9vdHN0cmFwU3RhY2tOYW1lPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBDb25maXJtIHdpdGggdGhlIHVzZXIgYmVmb3JlIGFjdHVhbCBkZWxldGlvbiBoYXBwZW5zXG4gICAqXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIHJlYWRvbmx5IGNvbmZpcm0/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEEgY2xhc3MgdG8gZmFjaWxpdGF0ZSBHYXJiYWdlIENvbGxlY3Rpb24gb2YgUzMgYW5kIEVDUiBhc3NldHNcbiAqL1xuZXhwb3J0IGNsYXNzIEdhcmJhZ2VDb2xsZWN0b3Ige1xuICBwcml2YXRlIGdhcmJhZ2VDb2xsZWN0UzNBc3NldHM6IGJvb2xlYW47XG4gIHByaXZhdGUgZ2FyYmFnZUNvbGxlY3RFY3JBc3NldHM6IGJvb2xlYW47XG4gIHByaXZhdGUgcGVybWlzc2lvblRvRGVsZXRlOiBib29sZWFuO1xuICBwcml2YXRlIHBlcm1pc3Npb25Ub1RhZzogYm9vbGVhbjtcbiAgcHJpdmF0ZSBib290c3RyYXBTdGFja05hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBjb25maXJtOiBib29sZWFuO1xuXG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihyZWFkb25seSBwcm9wczogR2FyYmFnZUNvbGxlY3RvclByb3BzKSB7XG4gICAgdGhpcy5nYXJiYWdlQ29sbGVjdFMzQXNzZXRzID0gWydzMycsICdhbGwnXS5pbmNsdWRlcyhwcm9wcy50eXBlKTtcbiAgICB0aGlzLmdhcmJhZ2VDb2xsZWN0RWNyQXNzZXRzID0gWydlY3InLCAnYWxsJ10uaW5jbHVkZXMocHJvcHMudHlwZSk7XG5cbiAgICBkZWJ1ZyhgJHt0aGlzLmdhcmJhZ2VDb2xsZWN0UzNBc3NldHN9ICR7dGhpcy5nYXJiYWdlQ29sbGVjdEVjckFzc2V0c31gKTtcblxuICAgIHRoaXMucGVybWlzc2lvblRvRGVsZXRlID0gWydkZWxldGUtdGFnZ2VkJywgJ2Z1bGwnXS5pbmNsdWRlcyhwcm9wcy5hY3Rpb24pO1xuICAgIHRoaXMucGVybWlzc2lvblRvVGFnID0gWyd0YWcnLCAnZnVsbCddLmluY2x1ZGVzKHByb3BzLmFjdGlvbik7XG4gICAgdGhpcy5jb25maXJtID0gcHJvcHMuY29uZmlybSA/PyB0cnVlO1xuXG4gICAgdGhpcy5ib290c3RyYXBTdGFja05hbWUgPSBwcm9wcy5ib290c3RyYXBTdGFja05hbWUgPz8gREVGQVVMVF9UT09MS0lUX1NUQUNLX05BTUU7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBnYXJiYWdlIGNvbGxlY3Rpb24gb24gdGhlIHJlc29sdmVkIGVudmlyb25tZW50LlxuICAgKi9cbiAgcHVibGljIGFzeW5jIGdhcmJhZ2VDb2xsZWN0KCkge1xuICAgIC8vIFNES3NcbiAgICBjb25zdCBzZGsgPSAoYXdhaXQgdGhpcy5wcm9wcy5zZGtQcm92aWRlci5mb3JFbnZpcm9ubWVudCh0aGlzLnByb3BzLnJlc29sdmVkRW52aXJvbm1lbnQsIE1vZGUuRm9yV3JpdGluZykpLnNkaztcbiAgICBjb25zdCBjZm4gPSBzZGsuY2xvdWRGb3JtYXRpb24oKTtcblxuICAgIGNvbnN0IHF1YWxpZmllciA9IGF3YWl0IHRoaXMuYm9vdHN0cmFwUXVhbGlmaWVyKHNkaywgdGhpcy5ib290c3RyYXBTdGFja05hbWUpO1xuICAgIGNvbnN0IGFjdGl2ZUFzc2V0cyA9IG5ldyBBY3RpdmVBc3NldENhY2hlKCk7XG5cbiAgICAvLyBHcmFiIHN0YWNrIHRlbXBsYXRlcyBmaXJzdFxuICAgIGF3YWl0IHJlZnJlc2hTdGFja3MoY2ZuLCBhY3RpdmVBc3NldHMsIHF1YWxpZmllcik7XG4gICAgLy8gU3RhcnQgdGhlIGJhY2tncm91bmQgcmVmcmVzaFxuICAgIGNvbnN0IGJhY2tncm91bmRTdGFja1JlZnJlc2ggPSBuZXcgQmFja2dyb3VuZFN0YWNrUmVmcmVzaCh7XG4gICAgICBjZm4sXG4gICAgICBhY3RpdmVBc3NldHMsXG4gICAgICBxdWFsaWZpZXIsXG4gICAgfSk7XG4gICAgYmFja2dyb3VuZFN0YWNrUmVmcmVzaC5zdGFydCgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICh0aGlzLmdhcmJhZ2VDb2xsZWN0UzNBc3NldHMpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5nYXJiYWdlQ29sbGVjdFMzKHNkaywgYWN0aXZlQXNzZXRzLCBiYWNrZ3JvdW5kU3RhY2tSZWZyZXNoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZ2FyYmFnZUNvbGxlY3RFY3JBc3NldHMpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5nYXJiYWdlQ29sbGVjdEVjcihzZGssIGFjdGl2ZUFzc2V0cywgYmFja2dyb3VuZFN0YWNrUmVmcmVzaCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoZXJyKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYmFja2dyb3VuZFN0YWNrUmVmcmVzaC5zdG9wKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gZ2FyYmFnZSBjb2xsZWN0aW9uIG9uIEVDUiBhc3NldHNcbiAgICovXG4gIHB1YmxpYyBhc3luYyBnYXJiYWdlQ29sbGVjdEVjcihzZGs6IFNESywgYWN0aXZlQXNzZXRzOiBBY3RpdmVBc3NldENhY2hlLCBiYWNrZ3JvdW5kU3RhY2tSZWZyZXNoOiBCYWNrZ3JvdW5kU3RhY2tSZWZyZXNoKSB7XG4gICAgY29uc3QgZWNyID0gc2RrLmVjcigpO1xuICAgIGNvbnN0IHJlcG8gPSBhd2FpdCB0aGlzLmJvb3RzdHJhcFJlcG9zaXRvcnlOYW1lKHNkaywgdGhpcy5ib290c3RyYXBTdGFja05hbWUpO1xuICAgIGNvbnN0IG51bUltYWdlcyA9IGF3YWl0IHRoaXMubnVtSW1hZ2VzSW5SZXBvKGVjciwgcmVwbyk7XG4gICAgY29uc3QgcHJpbnRlciA9IG5ldyBQcm9ncmVzc1ByaW50ZXIobnVtSW1hZ2VzLCAxMDAwKTtcblxuICAgIGRlYnVnKGBGb3VuZCBib290c3RyYXAgcmVwbyAke3JlcG99IHdpdGggJHtudW1JbWFnZXN9IGltYWdlc2ApO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIGNvbnN0IGJhdGNoZXMgPSAxO1xuICAgICAgY29uc3QgYmF0Y2hTaXplID0gMTAwMDtcbiAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgIGNvbnN0IGdyYWNlRGF5cyA9IHRoaXMucHJvcHMucm9sbGJhY2tCdWZmZXJEYXlzO1xuXG4gICAgICBkZWJ1ZyhgUGFyc2luZyB0aHJvdWdoICR7bnVtSW1hZ2VzfSBpbWFnZXMgaW4gYmF0Y2hlc2ApO1xuXG4gICAgICBmb3IgYXdhaXQgKGNvbnN0IGJhdGNoIG9mIHRoaXMucmVhZFJlcG9JbkJhdGNoZXMoZWNyLCByZXBvLCBiYXRjaFNpemUsIGN1cnJlbnRUaW1lKSkge1xuICAgICAgICBhd2FpdCBiYWNrZ3JvdW5kU3RhY2tSZWZyZXNoLm5vT2xkZXJUaGFuKDYwMF8wMDApOyAvLyAxMCBtaW5zXG4gICAgICAgIHByaW50ZXIuc3RhcnQoKTtcblxuICAgICAgICBjb25zdCB7IGluY2x1ZGVkOiBpc29sYXRlZCwgZXhjbHVkZWQ6IG5vdElzb2xhdGVkIH0gPSBwYXJ0aXRpb24oYmF0Y2gsIGFzc2V0ID0+ICFhc3NldC50YWdzLnNvbWUodCA9PiBhY3RpdmVBc3NldHMuY29udGFpbnModCkpKTtcblxuICAgICAgICBkZWJ1ZyhgJHtpc29sYXRlZC5sZW5ndGh9IGlzb2xhdGVkIGltYWdlc2ApO1xuICAgICAgICBkZWJ1ZyhgJHtub3RJc29sYXRlZC5sZW5ndGh9IG5vdCBpc29sYXRlZCBpbWFnZXNgKTtcbiAgICAgICAgZGVidWcoYCR7YmF0Y2gubGVuZ3RofSBpbWFnZXMgdG90YWxgKTtcblxuICAgICAgICBsZXQgZGVsZXRhYmxlczogSW1hZ2VBc3NldFtdID0gaXNvbGF0ZWQ7XG4gICAgICAgIGxldCB0YWdnYWJsZXM6IEltYWdlQXNzZXRbXSA9IFtdO1xuICAgICAgICBsZXQgdW50YWdnYWJsZXM6IEltYWdlQXNzZXRbXSA9IFtdO1xuXG4gICAgICAgIGlmIChncmFjZURheXMgPiAwKSB7XG4gICAgICAgICAgZGVidWcoJ0ZpbHRlcmluZyBvdXQgaW1hZ2VzIHRoYXQgYXJlIG5vdCBvbGQgZW5vdWdoIHRvIGRlbGV0ZScpO1xuXG4gICAgICAgICAgLy8gV2UgZGVsZXRlIGltYWdlcyB0aGF0IGFyZSBub3QgcmVmZXJlbmNlZCBpbiBBY3RpdmVBc3NldHMgYW5kIGhhdmUgdGhlIElzb2xhdGVkIFRhZyB3aXRoIGEgZGF0ZVxuICAgICAgICAgIC8vIGVhcmxpZXIgdGhhbiB0aGUgY3VycmVudCB0aW1lIC0gZ3JhY2UgcGVyaW9kLlxuICAgICAgICAgIGRlbGV0YWJsZXMgPSBpc29sYXRlZC5maWx0ZXIoaW1nID0+IGltZy5pc29sYXRlZFRhZ0JlZm9yZShuZXcgRGF0ZShjdXJyZW50VGltZSAtIChncmFjZURheXMgKiBEQVkpKSkpO1xuXG4gICAgICAgICAgLy8gV2UgdGFnIGltYWdlcyB0aGF0IGFyZSBub3QgcmVmZXJlbmNlZCBpbiBBY3RpdmVBc3NldHMgYW5kIGRvIG5vdCBoYXZlIHRoZSBJc29sYXRlZCBUYWcuXG4gICAgICAgICAgdGFnZ2FibGVzID0gaXNvbGF0ZWQuZmlsdGVyKGltZyA9PiAhaW1nLmhhc0lzb2xhdGVkVGFnKCkpO1xuXG4gICAgICAgICAgLy8gV2UgdW50YWcgaW1hZ2VzIHRoYXQgYXJlIHJlZmVyZW5jZWQgaW4gQWN0aXZlQXNzZXRzIGFuZCBjdXJyZW50bHkgaGF2ZSB0aGUgSXNvbGF0ZWQgVGFnLlxuICAgICAgICAgIHVudGFnZ2FibGVzID0gbm90SXNvbGF0ZWQuZmlsdGVyKGltZyA9PiBpbWcuaGFzSXNvbGF0ZWRUYWcoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBkZWJ1ZyhgJHtkZWxldGFibGVzLmxlbmd0aH0gZGVsZXRhYmxlIGFzc2V0c2ApO1xuICAgICAgICBkZWJ1ZyhgJHt0YWdnYWJsZXMubGVuZ3RofSB0YWdnYWJsZSBhc3NldHNgKTtcbiAgICAgICAgZGVidWcoYCR7dW50YWdnYWJsZXMubGVuZ3RofSBhc3NldHMgdG8gdW50YWdgKTtcblxuICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9uVG9EZWxldGUgJiYgZGVsZXRhYmxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5jb25maXJtYXRpb25Qcm9tcHQocHJpbnRlciwgZGVsZXRhYmxlcywgJ2ltYWdlJyk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wYXJhbGxlbERlbGV0ZUVjcihlY3IsIHJlcG8sIGRlbGV0YWJsZXMsIHByaW50ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvblRvVGFnICYmIHRhZ2dhYmxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wYXJhbGxlbFRhZ0VjcihlY3IsIHJlcG8sIHRhZ2dhYmxlcywgcHJpbnRlcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9uVG9UYWcgJiYgdW50YWdnYWJsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucGFyYWxsZWxVbnRhZ0VjcihlY3IsIHJlcG8sIHVudGFnZ2FibGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByaW50ZXIucmVwb3J0U2Nhbm5lZEFzc2V0KGJhdGNoLmxlbmd0aCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHRocm93IG5ldyBUb29sa2l0RXJyb3IoZXJyKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJpbnRlci5zdG9wKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gZ2FyYmFnZSBjb2xsZWN0aW9uIG9uIFMzIGFzc2V0c1xuICAgKi9cbiAgcHVibGljIGFzeW5jIGdhcmJhZ2VDb2xsZWN0UzMoc2RrOiBTREssIGFjdGl2ZUFzc2V0czogQWN0aXZlQXNzZXRDYWNoZSwgYmFja2dyb3VuZFN0YWNrUmVmcmVzaDogQmFja2dyb3VuZFN0YWNrUmVmcmVzaCkge1xuICAgIGNvbnN0IHMzID0gc2RrLnMzKCk7XG4gICAgY29uc3QgYnVja2V0ID0gYXdhaXQgdGhpcy5ib290c3RyYXBCdWNrZXROYW1lKHNkaywgdGhpcy5ib290c3RyYXBTdGFja05hbWUpO1xuICAgIGNvbnN0IG51bU9iamVjdHMgPSBhd2FpdCB0aGlzLm51bU9iamVjdHNJbkJ1Y2tldChzMywgYnVja2V0KTtcbiAgICBjb25zdCBwcmludGVyID0gbmV3IFByb2dyZXNzUHJpbnRlcihudW1PYmplY3RzLCAxMDAwKTtcblxuICAgIGRlYnVnKGBGb3VuZCBib290c3RyYXAgYnVja2V0ICR7YnVja2V0fSB3aXRoICR7bnVtT2JqZWN0c30gb2JqZWN0c2ApO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGJhdGNoU2l6ZSA9IDEwMDA7XG4gICAgICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XG4gICAgICBjb25zdCBncmFjZURheXMgPSB0aGlzLnByb3BzLnJvbGxiYWNrQnVmZmVyRGF5cztcblxuICAgICAgZGVidWcoYFBhcnNpbmcgdGhyb3VnaCAke251bU9iamVjdHN9IG9iamVjdHMgaW4gYmF0Y2hlc2ApO1xuXG4gICAgICAvLyBQcm9jZXNzIG9iamVjdHMgaW4gYmF0Y2hlcyBvZiAxMDAwXG4gICAgICAvLyBUaGlzIGlzIHRoZSBiYXRjaCBsaW1pdCBvZiBzMy5EZWxldGVPYmplY3QgYW5kIHdlIGludGVuZCB0byBvcHRpbWl6ZSBmb3IgdGhlIFwid29yc3QgY2FzZVwiIHNjZW5hcmlvXG4gICAgICAvLyB3aGVyZSBnYyBpcyBydW4gZm9yIHRoZSBmaXJzdCB0aW1lIG9uIGEgbG9uZy1zdGFuZGluZyBidWNrZXQgd2hlcmUgfjEwMCUgb2Ygb2JqZWN0cyBhcmUgaXNvbGF0ZWQuXG4gICAgICBmb3IgYXdhaXQgKGNvbnN0IGJhdGNoIG9mIHRoaXMucmVhZEJ1Y2tldEluQmF0Y2hlcyhzMywgYnVja2V0LCBiYXRjaFNpemUsIGN1cnJlbnRUaW1lKSkge1xuICAgICAgICBhd2FpdCBiYWNrZ3JvdW5kU3RhY2tSZWZyZXNoLm5vT2xkZXJUaGFuKDYwMF8wMDApOyAvLyAxMCBtaW5zXG4gICAgICAgIHByaW50ZXIuc3RhcnQoKTtcblxuICAgICAgICBjb25zdCB7IGluY2x1ZGVkOiBpc29sYXRlZCwgZXhjbHVkZWQ6IG5vdElzb2xhdGVkIH0gPSBwYXJ0aXRpb24oYmF0Y2gsIGFzc2V0ID0+ICFhY3RpdmVBc3NldHMuY29udGFpbnMoYXNzZXQuZmlsZU5hbWUoKSkpO1xuXG4gICAgICAgIGRlYnVnKGAke2lzb2xhdGVkLmxlbmd0aH0gaXNvbGF0ZWQgYXNzZXRzYCk7XG4gICAgICAgIGRlYnVnKGAke25vdElzb2xhdGVkLmxlbmd0aH0gbm90IGlzb2xhdGVkIGFzc2V0c2ApO1xuICAgICAgICBkZWJ1ZyhgJHtiYXRjaC5sZW5ndGh9IG9iamVjdHMgdG90YWxgKTtcblxuICAgICAgICBsZXQgZGVsZXRhYmxlczogT2JqZWN0QXNzZXRbXSA9IGlzb2xhdGVkO1xuICAgICAgICBsZXQgdGFnZ2FibGVzOiBPYmplY3RBc3NldFtdID0gW107XG4gICAgICAgIGxldCB1bnRhZ2dhYmxlczogT2JqZWN0QXNzZXRbXSA9IFtdO1xuXG4gICAgICAgIGlmIChncmFjZURheXMgPiAwKSB7XG4gICAgICAgICAgZGVidWcoJ0ZpbHRlcmluZyBvdXQgYXNzZXRzIHRoYXQgYXJlIG5vdCBvbGQgZW5vdWdoIHRvIGRlbGV0ZScpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGFyYWxsZWxSZWFkQWxsVGFncyhzMywgYmF0Y2gpO1xuXG4gICAgICAgICAgLy8gV2UgZGVsZXRlIG9iamVjdHMgdGhhdCBhcmUgbm90IHJlZmVyZW5jZWQgaW4gQWN0aXZlQXNzZXRzIGFuZCBoYXZlIHRoZSBJc29sYXRlZCBUYWcgd2l0aCBhIGRhdGVcbiAgICAgICAgICAvLyBlYXJsaWVyIHRoYW4gdGhlIGN1cnJlbnQgdGltZSAtIGdyYWNlIHBlcmlvZC5cbiAgICAgICAgICBkZWxldGFibGVzID0gaXNvbGF0ZWQuZmlsdGVyKG9iaiA9PiBvYmouaXNvbGF0ZWRUYWdCZWZvcmUobmV3IERhdGUoY3VycmVudFRpbWUgLSAoZ3JhY2VEYXlzICogREFZKSkpKTtcblxuICAgICAgICAgIC8vIFdlIHRhZyBvYmplY3RzIHRoYXQgYXJlIG5vdCByZWZlcmVuY2VkIGluIEFjdGl2ZUFzc2V0cyBhbmQgZG8gbm90IGhhdmUgdGhlIElzb2xhdGVkIFRhZy5cbiAgICAgICAgICB0YWdnYWJsZXMgPSBpc29sYXRlZC5maWx0ZXIob2JqID0+ICFvYmouaGFzSXNvbGF0ZWRUYWcoKSk7XG5cbiAgICAgICAgICAvLyBXZSB1bnRhZyBvYmplY3RzIHRoYXQgYXJlIHJlZmVyZW5jZWQgaW4gQWN0aXZlQXNzZXRzIGFuZCBjdXJyZW50bHkgaGF2ZSB0aGUgSXNvbGF0ZWQgVGFnLlxuICAgICAgICAgIHVudGFnZ2FibGVzID0gbm90SXNvbGF0ZWQuZmlsdGVyKG9iaiA9PiBvYmouaGFzSXNvbGF0ZWRUYWcoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBkZWJ1ZyhgJHtkZWxldGFibGVzLmxlbmd0aH0gZGVsZXRhYmxlIGFzc2V0c2ApO1xuICAgICAgICBkZWJ1ZyhgJHt0YWdnYWJsZXMubGVuZ3RofSB0YWdnYWJsZSBhc3NldHNgKTtcbiAgICAgICAgZGVidWcoYCR7dW50YWdnYWJsZXMubGVuZ3RofSBhc3NldHMgdG8gdW50YWdgKTtcblxuICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9uVG9EZWxldGUgJiYgZGVsZXRhYmxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5jb25maXJtYXRpb25Qcm9tcHQocHJpbnRlciwgZGVsZXRhYmxlcywgJ29iamVjdCcpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGFyYWxsZWxEZWxldGVTMyhzMywgYnVja2V0LCBkZWxldGFibGVzLCBwcmludGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnBlcm1pc3Npb25Ub1RhZyAmJiB0YWdnYWJsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGF3YWl0IHRoaXMucGFyYWxsZWxUYWdTMyhzMywgYnVja2V0LCB0YWdnYWJsZXMsIGN1cnJlbnRUaW1lLCBwcmludGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnBlcm1pc3Npb25Ub1RhZyAmJiB1bnRhZ2dhYmxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wYXJhbGxlbFVudGFnUzMoczMsIGJ1Y2tldCwgdW50YWdnYWJsZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpbnRlci5yZXBvcnRTY2FubmVkQXNzZXQoYmF0Y2gubGVuZ3RoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgdGhyb3cgbmV3IFRvb2xraXRFcnJvcihlcnIpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcmludGVyLnN0b3AoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHBhcmFsbGVsUmVhZEFsbFRhZ3MoczM6IElTM0NsaWVudCwgb2JqZWN0czogT2JqZWN0QXNzZXRbXSkge1xuICAgIGNvbnN0IGxpbWl0ID0gcExpbWl0KFBfTElNSVQpO1xuXG4gICAgZm9yIChjb25zdCBvYmogb2Ygb2JqZWN0cykge1xuICAgICAgYXdhaXQgbGltaXQoKCkgPT4gb2JqLmFsbFRhZ3MoczMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVW50YWcgYXNzZXRzIHRoYXQgd2VyZSBwcmV2aW91c2x5IHRhZ2dlZCwgYnV0IG5vdyBjdXJyZW50bHkgcmVmZXJlbmNlZC5cbiAgICogU2luY2UgdGhpcyBpcyB0cmVhdGVkIGFzIGFuIGltcGxlbWVudGF0aW9uIGRldGFpbCwgd2UgZG8gbm90IHByaW50IHRoZSByZXN1bHRzIGluIHRoZSBwcmludGVyLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwYXJhbGxlbFVudGFnRWNyKGVjcjogSUVDUkNsaWVudCwgcmVwbzogc3RyaW5nLCB1bnRhZ2dhYmxlczogSW1hZ2VBc3NldFtdKSB7XG4gICAgY29uc3QgbGltaXQgPSBwTGltaXQoUF9MSU1JVCk7XG5cbiAgICBmb3IgKGNvbnN0IGltZyBvZiB1bnRhZ2dhYmxlcykge1xuICAgICAgY29uc3QgdGFnID0gaW1nLmdldElzb2xhdGVkVGFnKCk7XG4gICAgICBhd2FpdCBsaW1pdCgoKSA9PlxuICAgICAgICBlY3IuYmF0Y2hEZWxldGVJbWFnZSh7XG4gICAgICAgICAgcmVwb3NpdG9yeU5hbWU6IHJlcG8sXG4gICAgICAgICAgaW1hZ2VJZHM6IFt7XG4gICAgICAgICAgICBpbWFnZVRhZzogdGFnLFxuICAgICAgICAgIH1dLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZGVidWcoYFVudGFnZ2VkICR7dW50YWdnYWJsZXMubGVuZ3RofSBhc3NldHNgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnRhZyBhc3NldHMgdGhhdCB3ZXJlIHByZXZpb3VzbHkgdGFnZ2VkLCBidXQgbm93IGN1cnJlbnRseSByZWZlcmVuY2VkLlxuICAgKiBTaW5jZSB0aGlzIGlzIHRyZWF0ZWQgYXMgYW4gaW1wbGVtZW50YXRpb24gZGV0YWlsLCB3ZSBkbyBub3QgcHJpbnQgdGhlIHJlc3VsdHMgaW4gdGhlIHByaW50ZXIuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHBhcmFsbGVsVW50YWdTMyhzMzogSVMzQ2xpZW50LCBidWNrZXQ6IHN0cmluZywgdW50YWdnYWJsZXM6IE9iamVjdEFzc2V0W10pIHtcbiAgICBjb25zdCBsaW1pdCA9IHBMaW1pdChQX0xJTUlUKTtcblxuICAgIGZvciAoY29uc3Qgb2JqIG9mIHVudGFnZ2FibGVzKSB7XG4gICAgICBjb25zdCB0YWdzID0gYXdhaXQgb2JqLmFsbFRhZ3MoczMpID8/IFtdO1xuICAgICAgY29uc3QgdXBkYXRlZFRhZ3MgPSB0YWdzLmZpbHRlcigodGFnOiBUYWcpID0+IHRhZy5LZXkgIT09IFMzX0lTT0xBVEVEX1RBRyk7XG4gICAgICBhd2FpdCBsaW1pdCgoKSA9PlxuICAgICAgICBzMy5kZWxldGVPYmplY3RUYWdnaW5nKHtcbiAgICAgICAgICBCdWNrZXQ6IGJ1Y2tldCxcbiAgICAgICAgICBLZXk6IG9iai5rZXksXG5cbiAgICAgICAgfSksXG4gICAgICApO1xuICAgICAgYXdhaXQgbGltaXQoKCkgPT5cbiAgICAgICAgczMucHV0T2JqZWN0VGFnZ2luZyh7XG4gICAgICAgICAgQnVja2V0OiBidWNrZXQsXG4gICAgICAgICAgS2V5OiBvYmoua2V5LFxuICAgICAgICAgIFRhZ2dpbmc6IHtcbiAgICAgICAgICAgIFRhZ1NldDogdXBkYXRlZFRhZ3MsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cblxuICAgIGRlYnVnKGBVbnRhZ2dlZCAke3VudGFnZ2FibGVzLmxlbmd0aH0gYXNzZXRzYCk7XG4gIH1cblxuICAvKipcbiAgICogVGFnIGltYWdlcyBpbiBwYXJhbGxlbCB1c2luZyBwLWxpbWl0XG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHBhcmFsbGVsVGFnRWNyKGVjcjogSUVDUkNsaWVudCwgcmVwbzogc3RyaW5nLCB0YWdnYWJsZXM6IEltYWdlQXNzZXRbXSwgcHJpbnRlcjogUHJvZ3Jlc3NQcmludGVyKSB7XG4gICAgY29uc3QgbGltaXQgPSBwTGltaXQoUF9MSU1JVCk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRhZ2dhYmxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgaW1nID0gdGFnZ2FibGVzW2ldO1xuICAgICAgY29uc3QgdGFnRWNyID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGVjci5wdXRJbWFnZSh7XG4gICAgICAgICAgICByZXBvc2l0b3J5TmFtZTogcmVwbyxcbiAgICAgICAgICAgIGltYWdlRGlnZXN0OiBpbWcuZGlnZXN0LFxuICAgICAgICAgICAgaW1hZ2VNYW5pZmVzdDogaW1nLm1hbmlmZXN0LFxuICAgICAgICAgICAgaW1hZ2VUYWc6IGltZy5idWlsZEltYWdlVGFnKGkpLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYSBmYWxzZSBuZWdhdGl2ZSAtLSBhbiBpc29sYXRlZCBhc3NldCBpcyB1bnRhZ2dlZFxuICAgICAgICAgIC8vIGxpa2VseSBkdWUgdG8gYW4gaW1hZ2VUYWcgY29sbGlzaW9uLiBXZSBjYW4gc2FmZWx5IGlnbm9yZSxcbiAgICAgICAgICAvLyBhbmQgdGhlIGlzb2xhdGVkIGFzc2V0IHdpbGwgYmUgdGFnZ2VkIG5leHQgdGltZS5cbiAgICAgICAgICBkZWJ1ZyhgV2FybmluZzogdW5hYmxlIHRvIHRhZyBpbWFnZSAke0pTT04uc3RyaW5naWZ5KGltZy50YWdzKX0gd2l0aCAke2ltZy5idWlsZEltYWdlVGFnKGkpfSBkdWUgdG8gdGhlIGZvbGxvd2luZyBlcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGF3YWl0IGxpbWl0KCgpID0+IHRhZ0VjcigpKTtcbiAgICB9XG5cbiAgICBwcmludGVyLnJlcG9ydFRhZ2dlZEFzc2V0KHRhZ2dhYmxlcyk7XG4gICAgZGVidWcoYFRhZ2dlZCAke3RhZ2dhYmxlcy5sZW5ndGh9IGFzc2V0c2ApO1xuICB9XG5cbiAgLyoqXG4gICAqIFRhZyBvYmplY3RzIGluIHBhcmFsbGVsIHVzaW5nIHAtbGltaXQuIFRoZSBwdXRPYmplY3RUYWdnaW5nIEFQSSBkb2VzIG5vdFxuICAgKiBzdXBwb3J0IGJhdGNoIHRhZ2dpbmcgc28gd2UgbXVzdCBoYW5kbGUgdGhlIHBhcmFsbGVsaXNtIGNsaWVudC1zaWRlLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBwYXJhbGxlbFRhZ1MzKHMzOiBJUzNDbGllbnQsIGJ1Y2tldDogc3RyaW5nLCB0YWdnYWJsZXM6IE9iamVjdEFzc2V0W10sIGRhdGU6IG51bWJlciwgcHJpbnRlcjogUHJvZ3Jlc3NQcmludGVyKSB7XG4gICAgY29uc3QgbGltaXQgPSBwTGltaXQoUF9MSU1JVCk7XG5cbiAgICBmb3IgKGNvbnN0IG9iaiBvZiB0YWdnYWJsZXMpIHtcbiAgICAgIGF3YWl0IGxpbWl0KCgpID0+XG4gICAgICAgIHMzLnB1dE9iamVjdFRhZ2dpbmcoe1xuICAgICAgICAgIEJ1Y2tldDogYnVja2V0LFxuICAgICAgICAgIEtleTogb2JqLmtleSxcbiAgICAgICAgICBUYWdnaW5nOiB7XG4gICAgICAgICAgICBUYWdTZXQ6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIEtleTogUzNfSVNPTEFURURfVEFHLFxuICAgICAgICAgICAgICAgIFZhbHVlOiBTdHJpbmcoZGF0ZSksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBwcmludGVyLnJlcG9ydFRhZ2dlZEFzc2V0KHRhZ2dhYmxlcyk7XG4gICAgZGVidWcoYFRhZ2dlZCAke3RhZ2dhYmxlcy5sZW5ndGh9IGFzc2V0c2ApO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZSBpbWFnZXMgaW4gcGFyYWxsZWwuIFRoZSBkZWxldGVJbWFnZSBBUEkgc3VwcG9ydHMgYmF0Y2hlcyBvZiAxMDAuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHBhcmFsbGVsRGVsZXRlRWNyKGVjcjogSUVDUkNsaWVudCwgcmVwbzogc3RyaW5nLCBkZWxldGFibGVzOiBJbWFnZUFzc2V0W10sIHByaW50ZXI6IFByb2dyZXNzUHJpbnRlcikge1xuICAgIGNvbnN0IGJhdGNoU2l6ZSA9IDEwMDtcbiAgICBjb25zdCBpbWFnZXNUb0RlbGV0ZSA9IGRlbGV0YWJsZXMubWFwKGltZyA9PiAoe1xuICAgICAgaW1hZ2VEaWdlc3Q6IGltZy5kaWdlc3QsXG4gICAgfSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGJhdGNoZXMgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW1hZ2VzVG9EZWxldGUubGVuZ3RoOyBpICs9IGJhdGNoU2l6ZSkge1xuICAgICAgICBiYXRjaGVzLnB1c2goaW1hZ2VzVG9EZWxldGUuc2xpY2UoaSwgaSArIGJhdGNoU2l6ZSkpO1xuICAgICAgfVxuICAgICAgLy8gRGVsZXRlIGltYWdlcyBpbiBiYXRjaGVzXG4gICAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIGJhdGNoZXMpIHtcbiAgICAgICAgYXdhaXQgZWNyLmJhdGNoRGVsZXRlSW1hZ2Uoe1xuICAgICAgICAgIGltYWdlSWRzOiBiYXRjaCxcbiAgICAgICAgICByZXBvc2l0b3J5TmFtZTogcmVwbyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgZGVsZXRlZENvdW50ID0gYmF0Y2gubGVuZ3RoO1xuICAgICAgICBkZWJ1ZyhgRGVsZXRlZCAke2RlbGV0ZWRDb3VudH0gYXNzZXRzYCk7XG4gICAgICAgIHByaW50ZXIucmVwb3J0RGVsZXRlZEFzc2V0KGRlbGV0YWJsZXMuc2xpY2UoMCwgZGVsZXRlZENvdW50KSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBwcmludChjaGFsay5yZWQoYEVycm9yIGRlbGV0aW5nIGltYWdlczogJHtlcnJ9YCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGUgb2JqZWN0cyBpbiBwYXJhbGxlbC4gVGhlIGRlbGV0ZU9iamVjdHMgQVBJIHN1cHBvcnRzIGJhdGNoZXMgb2YgMTAwMC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcGFyYWxsZWxEZWxldGVTMyhzMzogSVMzQ2xpZW50LCBidWNrZXQ6IHN0cmluZywgZGVsZXRhYmxlczogT2JqZWN0QXNzZXRbXSwgcHJpbnRlcjogUHJvZ3Jlc3NQcmludGVyKSB7XG4gICAgY29uc3QgYmF0Y2hTaXplID0gMTAwMDtcbiAgICBjb25zdCBvYmplY3RzVG9EZWxldGUgPSBkZWxldGFibGVzLm1hcChhc3NldCA9PiAoe1xuICAgICAgS2V5OiBhc3NldC5rZXksXG4gICAgfSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGJhdGNoZXMgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqZWN0c1RvRGVsZXRlLmxlbmd0aDsgaSArPSBiYXRjaFNpemUpIHtcbiAgICAgICAgYmF0Y2hlcy5wdXNoKG9iamVjdHNUb0RlbGV0ZS5zbGljZShpLCBpICsgYmF0Y2hTaXplKSk7XG4gICAgICB9XG4gICAgICAvLyBEZWxldGUgb2JqZWN0cyBpbiBiYXRjaGVzXG4gICAgICBmb3IgKGNvbnN0IGJhdGNoIG9mIGJhdGNoZXMpIHtcbiAgICAgICAgYXdhaXQgczMuZGVsZXRlT2JqZWN0cyh7XG4gICAgICAgICAgQnVja2V0OiBidWNrZXQsXG4gICAgICAgICAgRGVsZXRlOiB7XG4gICAgICAgICAgICBPYmplY3RzOiBiYXRjaCxcbiAgICAgICAgICAgIFF1aWV0OiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGRlbGV0ZWRDb3VudCA9IGJhdGNoLmxlbmd0aDtcbiAgICAgICAgZGVidWcoYERlbGV0ZWQgJHtkZWxldGVkQ291bnR9IGFzc2V0c2ApO1xuICAgICAgICBwcmludGVyLnJlcG9ydERlbGV0ZWRBc3NldChkZWxldGFibGVzLnNsaWNlKDAsIGRlbGV0ZWRDb3VudCkpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcHJpbnQoY2hhbGsucmVkKGBFcnJvciBkZWxldGluZyBvYmplY3RzOiAke2Vycn1gKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBib290c3RyYXBCdWNrZXROYW1lKHNkazogU0RLLCBib290c3RyYXBTdGFja05hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgaW5mbyA9IGF3YWl0IFRvb2xraXRJbmZvLmxvb2t1cCh0aGlzLnByb3BzLnJlc29sdmVkRW52aXJvbm1lbnQsIHNkaywgYm9vdHN0cmFwU3RhY2tOYW1lKTtcbiAgICByZXR1cm4gaW5mby5idWNrZXROYW1lO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBib290c3RyYXBSZXBvc2l0b3J5TmFtZShzZGs6IFNESywgYm9vdHN0cmFwU3RhY2tOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGluZm8gPSBhd2FpdCBUb29sa2l0SW5mby5sb29rdXAodGhpcy5wcm9wcy5yZXNvbHZlZEVudmlyb25tZW50LCBzZGssIGJvb3RzdHJhcFN0YWNrTmFtZSk7XG4gICAgcmV0dXJuIGluZm8ucmVwb3NpdG9yeU5hbWU7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGJvb3RzdHJhcFF1YWxpZmllcihzZGs6IFNESywgYm9vdHN0cmFwU3RhY2tOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IGluZm8gPSBhd2FpdCBUb29sa2l0SW5mby5sb29rdXAodGhpcy5wcm9wcy5yZXNvbHZlZEVudmlyb25tZW50LCBzZGssIGJvb3RzdHJhcFN0YWNrTmFtZSk7XG4gICAgcmV0dXJuIGluZm8uYm9vdHN0cmFwU3RhY2sucGFyYW1ldGVycy5RdWFsaWZpZXI7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG51bU9iamVjdHNJbkJ1Y2tldChzMzogSVMzQ2xpZW50LCBidWNrZXQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgbGV0IHRvdGFsQ291bnQgPSAwO1xuICAgIGxldCBjb250aW51YXRpb25Ub2tlbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgZG8ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzMy5saXN0T2JqZWN0c1YyKHtcbiAgICAgICAgQnVja2V0OiBidWNrZXQsXG4gICAgICAgIENvbnRpbnVhdGlvblRva2VuOiBjb250aW51YXRpb25Ub2tlbixcbiAgICAgIH0pO1xuXG4gICAgICB0b3RhbENvdW50ICs9IHJlc3BvbnNlLktleUNvdW50ID8/IDA7XG4gICAgICBjb250aW51YXRpb25Ub2tlbiA9IHJlc3BvbnNlLk5leHRDb250aW51YXRpb25Ub2tlbjtcbiAgICB9IHdoaWxlIChjb250aW51YXRpb25Ub2tlbik7XG5cbiAgICByZXR1cm4gdG90YWxDb3VudDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbnVtSW1hZ2VzSW5SZXBvKGVjcjogSUVDUkNsaWVudCwgcmVwbzogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBsZXQgdG90YWxDb3VudCA9IDA7XG4gICAgbGV0IG5leHRUb2tlbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgZG8ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBlY3IubGlzdEltYWdlcyh7XG4gICAgICAgIHJlcG9zaXRvcnlOYW1lOiByZXBvLFxuICAgICAgICBuZXh0VG9rZW46IG5leHRUb2tlbixcbiAgICAgIH0pO1xuXG4gICAgICB0b3RhbENvdW50ICs9IHJlc3BvbnNlLmltYWdlSWRzPy5sZW5ndGggPz8gMDtcbiAgICAgIG5leHRUb2tlbiA9IHJlc3BvbnNlLm5leHRUb2tlbjtcbiAgICB9IHdoaWxlIChuZXh0VG9rZW4pO1xuXG4gICAgcmV0dXJuIHRvdGFsQ291bnQ7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jICpyZWFkUmVwb0luQmF0Y2hlcyhlY3I6IElFQ1JDbGllbnQsIHJlcG86IHN0cmluZywgYmF0Y2hTaXplOiBudW1iZXIgPSAxMDAwLCBjdXJyZW50VGltZTogbnVtYmVyKTogQXN5bmNHZW5lcmF0b3I8SW1hZ2VBc3NldFtdPiB7XG4gICAgbGV0IGNvbnRpbnVhdGlvblRva2VuOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICBkbyB7XG4gICAgICBjb25zdCBiYXRjaDogSW1hZ2VBc3NldFtdID0gW107XG5cbiAgICAgIHdoaWxlIChiYXRjaC5sZW5ndGggPCBiYXRjaFNpemUpIHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBlY3IubGlzdEltYWdlcyh7XG4gICAgICAgICAgcmVwb3NpdG9yeU5hbWU6IHJlcG8sXG4gICAgICAgICAgbmV4dFRva2VuOiBjb250aW51YXRpb25Ub2tlbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm8gaW1hZ2VzIGluIHRoZSByZXBvc2l0b3J5XG4gICAgICAgIGlmICghcmVzcG9uc2UuaW1hZ2VJZHMgfHwgcmVzcG9uc2UuaW1hZ2VJZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtYXAgdW5pcXVlIGltYWdlIGRpZ2VzdCB0byAocG9zc2libHkgbXVsdGlwbGUpIHRhZ3NcbiAgICAgICAgY29uc3QgaW1hZ2VzID0gaW1hZ2VNYXAocmVzcG9uc2UuaW1hZ2VJZHMgPz8gW10pO1xuXG4gICAgICAgIGNvbnN0IGltYWdlSWRzID0gT2JqZWN0LmtleXMoaW1hZ2VzKS5tYXAoa2V5ID0+ICh7XG4gICAgICAgICAgaW1hZ2VEaWdlc3Q6IGtleSxcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIGNvbnN0IGRlc2NyaWJlSW1hZ2VJbmZvID0gYXdhaXQgZWNyLmRlc2NyaWJlSW1hZ2VzKHtcbiAgICAgICAgICByZXBvc2l0b3J5TmFtZTogcmVwbyxcbiAgICAgICAgICBpbWFnZUlkczogaW1hZ2VJZHMsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGdldEltYWdlSW5mbyA9IGF3YWl0IGVjci5iYXRjaEdldEltYWdlKHtcbiAgICAgICAgICByZXBvc2l0b3J5TmFtZTogcmVwbyxcbiAgICAgICAgICBpbWFnZUlkczogaW1hZ2VJZHMsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNvbWJpbmVkSW1hZ2VJbmZvID0gZGVzY3JpYmVJbWFnZUluZm8uaW1hZ2VEZXRhaWxzPy5tYXAoaW1hZ2VEZXRhaWwgPT4ge1xuICAgICAgICAgIGNvbnN0IG1hdGNoaW5nSW1hZ2UgPSBnZXRJbWFnZUluZm8uaW1hZ2VzPy5maW5kKFxuICAgICAgICAgICAgaW1nID0+IGltZy5pbWFnZUlkPy5pbWFnZURpZ2VzdCA9PT0gaW1hZ2VEZXRhaWwuaW1hZ2VEaWdlc3QsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5pbWFnZURldGFpbCxcbiAgICAgICAgICAgIG1hbmlmZXN0OiBtYXRjaGluZ0ltYWdlPy5pbWFnZU1hbmlmZXN0LFxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZvciAoY29uc3QgaW1hZ2Ugb2YgY29tYmluZWRJbWFnZUluZm8gPz8gW10pIHtcbiAgICAgICAgICBjb25zdCBsYXN0TW9kaWZpZWQgPSBpbWFnZS5pbWFnZVB1c2hlZEF0ID8/IG5ldyBEYXRlKGN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAvLyBTdG9yZSB0aGUgaW1hZ2UgaWYgaXQgd2FzIHB1c2hlZCBlYXJsaWVyIHRoYW4gdG9kYXkgLSBjcmVhdGVkQnVmZmVyRGF5c1xuICAgICAgICAgIGlmIChpbWFnZS5pbWFnZURpZ2VzdCAmJiBsYXN0TW9kaWZpZWQgPCBuZXcgRGF0ZShjdXJyZW50VGltZSAtICh0aGlzLnByb3BzLmNyZWF0ZWRCdWZmZXJEYXlzICogREFZKSkpIHtcbiAgICAgICAgICAgIGJhdGNoLnB1c2gobmV3IEltYWdlQXNzZXQoaW1hZ2UuaW1hZ2VEaWdlc3QsIGltYWdlLmltYWdlU2l6ZUluQnl0ZXMgPz8gMCwgaW1hZ2UuaW1hZ2VUYWdzID8/IFtdLCBpbWFnZS5tYW5pZmVzdCA/PyAnJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRpbnVhdGlvblRva2VuID0gcmVzcG9uc2UubmV4dFRva2VuO1xuXG4gICAgICAgIGlmICghY29udGludWF0aW9uVG9rZW4pIGJyZWFrOyAvLyBObyBtb3JlIGltYWdlcyB0byBmZXRjaFxuICAgICAgfVxuXG4gICAgICBpZiAoYmF0Y2gubGVuZ3RoID4gMCkge1xuICAgICAgICB5aWVsZCBiYXRjaDtcbiAgICAgIH1cbiAgICB9IHdoaWxlIChjb250aW51YXRpb25Ub2tlbik7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdG9yIGZ1bmN0aW9uIHRoYXQgcmVhZHMgb2JqZWN0cyBmcm9tIHRoZSBTMyBCdWNrZXQgaW4gYmF0Y2hlcy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgKnJlYWRCdWNrZXRJbkJhdGNoZXMoczM6IElTM0NsaWVudCwgYnVja2V0OiBzdHJpbmcsIGJhdGNoU2l6ZTogbnVtYmVyID0gMTAwMCwgY3VycmVudFRpbWU6IG51bWJlcik6IEFzeW5jR2VuZXJhdG9yPE9iamVjdEFzc2V0W10+IHtcbiAgICBsZXQgY29udGludWF0aW9uVG9rZW46IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgIGRvIHtcbiAgICAgIGNvbnN0IGJhdGNoOiBPYmplY3RBc3NldFtdID0gW107XG5cbiAgICAgIHdoaWxlIChiYXRjaC5sZW5ndGggPCBiYXRjaFNpemUpIHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzMy5saXN0T2JqZWN0c1YyKHtcbiAgICAgICAgICBCdWNrZXQ6IGJ1Y2tldCxcbiAgICAgICAgICBDb250aW51YXRpb25Ub2tlbjogY29udGludWF0aW9uVG9rZW4sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlc3BvbnNlLkNvbnRlbnRzPy5mb3JFYWNoKChvYmo6IGFueSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGtleSA9IG9iai5LZXkgPz8gJyc7XG4gICAgICAgICAgY29uc3Qgc2l6ZSA9IG9iai5TaXplID8/IDA7XG4gICAgICAgICAgY29uc3QgbGFzdE1vZGlmaWVkID0gb2JqLkxhc3RNb2RpZmllZCA/PyBuZXcgRGF0ZShjdXJyZW50VGltZSk7XG4gICAgICAgICAgLy8gU3RvcmUgdGhlIG9iamVjdCBpZiBpdCBoYXMgYSBLZXkgYW5kXG4gICAgICAgICAgLy8gaWYgaXQgaGFzIG5vdCBiZWVuIG1vZGlmaWVkIHNpbmNlIHRvZGF5IC0gY3JlYXRlZEJ1ZmZlckRheXNcbiAgICAgICAgICBpZiAoa2V5ICYmIGxhc3RNb2RpZmllZCA8IG5ldyBEYXRlKGN1cnJlbnRUaW1lIC0gKHRoaXMucHJvcHMuY3JlYXRlZEJ1ZmZlckRheXMgKiBEQVkpKSkge1xuICAgICAgICAgICAgYmF0Y2gucHVzaChuZXcgT2JqZWN0QXNzZXQoYnVja2V0LCBrZXksIHNpemUpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnRpbnVhdGlvblRva2VuID0gcmVzcG9uc2UuTmV4dENvbnRpbnVhdGlvblRva2VuO1xuXG4gICAgICAgIGlmICghY29udGludWF0aW9uVG9rZW4pIGJyZWFrOyAvLyBObyBtb3JlIG9iamVjdHMgdG8gZmV0Y2hcbiAgICAgIH1cblxuICAgICAgaWYgKGJhdGNoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgeWllbGQgYmF0Y2g7XG4gICAgICB9XG4gICAgfSB3aGlsZSAoY29udGludWF0aW9uVG9rZW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjb25maXJtYXRpb25Qcm9tcHQocHJpbnRlcjogUHJvZ3Jlc3NQcmludGVyLCBkZWxldGFibGVzOiBHY0Fzc2V0W10sIHR5cGU6IHN0cmluZykge1xuICAgIGNvbnN0IHBsdXJhbGl6ZSA9IChuYW1lOiBzdHJpbmcsIGNvdW50OiBudW1iZXIpOiBzdHJpbmcgPT4ge1xuICAgICAgcmV0dXJuIGNvdW50ID09PSAxID8gbmFtZSA6IGAke25hbWV9c2A7XG4gICAgfTtcblxuICAgIGlmICh0aGlzLmNvbmZpcm0pIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBbXG4gICAgICAgIGBGb3VuZCAke2RlbGV0YWJsZXMubGVuZ3RofSAke3BsdXJhbGl6ZSh0eXBlLCBkZWxldGFibGVzLmxlbmd0aCl9IHRvIGRlbGV0ZSBiYXNlZCBvZmYgb2YgdGhlIGZvbGxvd2luZyBjcml0ZXJpYTpgLFxuICAgICAgICBgLSAke3R5cGV9cyBoYXZlIGJlZW4gaXNvbGF0ZWQgZm9yID4gJHt0aGlzLnByb3BzLnJvbGxiYWNrQnVmZmVyRGF5c30gZGF5c2AsXG4gICAgICAgIGAtICR7dHlwZX1zIHdlcmUgY3JlYXRlZCA+ICR7dGhpcy5wcm9wcy5jcmVhdGVkQnVmZmVyRGF5c30gZGF5cyBhZ29gLFxuICAgICAgICAnJyxcbiAgICAgICAgJ0RlbGV0ZSB0aGlzIGJhdGNoICh5ZXMvbm8vZGVsZXRlLWFsbCk/JyxcbiAgICAgIF0uam9pbignXFxuJyk7XG4gICAgICBwcmludGVyLnBhdXNlKCk7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHByb21wdGx5LnByb21wdChtZXNzYWdlLFxuICAgICAgICB7IHRyaW06IHRydWUgfSxcbiAgICAgICk7XG5cbiAgICAgIC8vIEFueXRoaW5nIG90aGVyIHRoYW4geWVzL3kvZGVsZXRlLWFsbCBpcyB0cmVhdGVkIGFzIG5vXG4gICAgICBpZiAoIXJlc3BvbnNlIHx8ICFbJ3llcycsICd5JywgJ2RlbGV0ZS1hbGwnXS5pbmNsdWRlcyhyZXNwb25zZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICB0aHJvdyBuZXcgVG9vbGtpdEVycm9yKCdEZWxldGlvbiBhYm9ydGVkIGJ5IHVzZXInKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UudG9Mb3dlckNhc2UoKSA9PSAnZGVsZXRlLWFsbCcpIHtcbiAgICAgICAgdGhpcy5jb25maXJtID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHByaW50ZXIucmVzdW1lKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFydGl0aW9uPEE+KHhzOiBJdGVyYWJsZTxBPiwgcHJlZDogKHg6IEEpID0+IGJvb2xlYW4pOiB7IGluY2x1ZGVkOiBBW107IGV4Y2x1ZGVkOiBBW10gfSB7XG4gIGNvbnN0IHJlc3VsdCA9IHtcbiAgICBpbmNsdWRlZDogW10gYXMgQVtdLFxuICAgIGV4Y2x1ZGVkOiBbXSBhcyBBW10sXG4gIH07XG5cbiAgZm9yIChjb25zdCB4IG9mIHhzKSB7XG4gICAgaWYgKHByZWQoeCkpIHtcbiAgICAgIHJlc3VsdC5pbmNsdWRlZC5wdXNoKHgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQuZXhjbHVkZWQucHVzaCh4KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpbWFnZU1hcChpbWFnZUlkczogSW1hZ2VJZGVudGlmaWVyW10pIHtcbiAgY29uc3QgaW1hZ2VzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7fTtcbiAgZm9yIChjb25zdCBpbWFnZSBvZiBpbWFnZUlkcyA/PyBbXSkge1xuICAgIGlmICghaW1hZ2UuaW1hZ2VEaWdlc3QgfHwgIWltYWdlLmltYWdlVGFnKSB7IGNvbnRpbnVlOyB9XG4gICAgaWYgKCFpbWFnZXNbaW1hZ2UuaW1hZ2VEaWdlc3RdKSB7XG4gICAgICBpbWFnZXNbaW1hZ2UuaW1hZ2VEaWdlc3RdID0gW107XG4gICAgfVxuICAgIGltYWdlc1tpbWFnZS5pbWFnZURpZ2VzdF0ucHVzaChpbWFnZS5pbWFnZVRhZyk7XG4gIH1cbiAgcmV0dXJuIGltYWdlcztcbn1cbiJdfQ==