"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressPrinter = void 0;
const chalk = require("chalk");
const logging_1 = require("../../logging");
class ProgressPrinter {
    constructor(totalAssets, interval) {
        this.totalAssets = totalAssets;
        this.assetsScanned = 0;
        this.taggedAsset = 0;
        this.taggedAssetsSizeMb = 0;
        this.deletedAssets = 0;
        this.deletedAssetsSizeMb = 0;
        this.interval = interval ?? 10000;
        this.isPaused = false;
    }
    reportScannedAsset(amt) {
        this.assetsScanned += amt;
    }
    reportTaggedAsset(assets) {
        this.taggedAsset += assets.length;
        const sizeInBytes = assets.reduce((total, asset) => total + asset.size, 0);
        this.taggedAssetsSizeMb += sizeInBytes / 1048576;
    }
    reportDeletedAsset(assets) {
        this.deletedAssets += assets.length;
        const sizeInBytes = assets.reduce((total, asset) => total + asset.size, 0);
        this.deletedAssetsSizeMb += sizeInBytes / 1048576;
    }
    start() {
        this.setInterval = setInterval(() => {
            if (!this.isPaused) {
                this.print();
            }
        }, this.interval);
    }
    pause() {
        this.isPaused = true;
    }
    resume() {
        this.isPaused = false;
    }
    stop() {
        clearInterval(this.setInterval);
        // print one last time if not paused
        if (!this.isPaused) {
            this.print();
        }
    }
    print() {
        const percentage = ((this.assetsScanned / this.totalAssets) * 100).toFixed(2);
        // print in MiB until we hit at least 1 GiB of data tagged/deleted
        if (Math.max(this.taggedAssetsSizeMb, this.deletedAssetsSizeMb) >= 1000) {
            (0, logging_1.print)(chalk.green(`[${percentage}%] ${this.assetsScanned} files scanned: ${this.taggedAsset} assets (${(this.taggedAssetsSizeMb / 1000).toFixed(2)} GiB) tagged, ${this.deletedAssets} assets (${(this.deletedAssetsSizeMb / 1000).toFixed(2)} GiB) deleted.`));
        }
        else {
            (0, logging_1.print)(chalk.green(`[${percentage}%] ${this.assetsScanned} files scanned: ${this.taggedAsset} assets (${this.taggedAssetsSizeMb.toFixed(2)} MiB) tagged, ${this.deletedAssets} assets (${this.deletedAssetsSizeMb.toFixed(2)} MiB) deleted.`));
        }
    }
}
exports.ProgressPrinter = ProgressPrinter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MtcHJpbnRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2dyZXNzLXByaW50ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBRS9CLDJDQUFzQztBQUV0QyxNQUFhLGVBQWU7SUFXMUIsWUFBWSxXQUFtQixFQUFFLFFBQWlCO1FBQ2hELElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsSUFBSSxLQUFNLENBQUM7UUFDbkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDeEIsQ0FBQztJQUVNLGtCQUFrQixDQUFDLEdBQVc7UUFDbkMsSUFBSSxDQUFDLGFBQWEsSUFBSSxHQUFHLENBQUM7SUFDNUIsQ0FBQztJQUVNLGlCQUFpQixDQUFDLE1BQWlCO1FBQ3hDLElBQUksQ0FBQyxXQUFXLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNsQyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLGtCQUFrQixJQUFJLFdBQVcsR0FBRyxPQUFTLENBQUM7SUFDckQsQ0FBQztJQUVNLGtCQUFrQixDQUFDLE1BQWlCO1FBQ3pDLElBQUksQ0FBQyxhQUFhLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNwQyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLG1CQUFtQixJQUFJLFdBQVcsR0FBRyxPQUFTLENBQUM7SUFDdEQsQ0FBQztJQUVNLEtBQUs7UUFDVixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2YsQ0FBQztRQUNILENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUVNLEtBQUs7UUFDVixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUN2QixDQUFDO0lBRU0sTUFBTTtRQUNYLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ3hCLENBQUM7SUFFTSxJQUFJO1FBQ1QsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNoQyxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztJQUVPLEtBQUs7UUFDWCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLGtFQUFrRTtRQUNsRSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hFLElBQUEsZUFBSyxFQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxVQUFVLE1BQU0sSUFBSSxDQUFDLGFBQWEsbUJBQW1CLElBQUksQ0FBQyxXQUFXLFlBQVksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLGFBQWEsWUFBWSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNsUSxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUEsZUFBSyxFQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxVQUFVLE1BQU0sSUFBSSxDQUFDLGFBQWEsbUJBQW1CLElBQUksQ0FBQyxXQUFXLFlBQVksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLElBQUksQ0FBQyxhQUFhLFlBQVksSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ2hQLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUF2RUQsMENBdUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgR2NBc3NldCBhcyBHQ0Fzc2V0IH0gZnJvbSAnLi9nYXJiYWdlLWNvbGxlY3Rvcic7XG5pbXBvcnQgeyBwcmludCB9IGZyb20gJy4uLy4uL2xvZ2dpbmcnO1xuXG5leHBvcnQgY2xhc3MgUHJvZ3Jlc3NQcmludGVyIHtcbiAgcHJpdmF0ZSB0b3RhbEFzc2V0czogbnVtYmVyO1xuICBwcml2YXRlIGFzc2V0c1NjYW5uZWQ6IG51bWJlcjtcbiAgcHJpdmF0ZSB0YWdnZWRBc3NldDogbnVtYmVyO1xuICBwcml2YXRlIHRhZ2dlZEFzc2V0c1NpemVNYjogbnVtYmVyO1xuICBwcml2YXRlIGRlbGV0ZWRBc3NldHM6IG51bWJlcjtcbiAgcHJpdmF0ZSBkZWxldGVkQXNzZXRzU2l6ZU1iOiBudW1iZXI7XG4gIHByaXZhdGUgaW50ZXJ2YWw6IG51bWJlcjtcbiAgcHJpdmF0ZSBzZXRJbnRlcnZhbD86IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+O1xuICBwcml2YXRlIGlzUGF1c2VkOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKHRvdGFsQXNzZXRzOiBudW1iZXIsIGludGVydmFsPzogbnVtYmVyKSB7XG4gICAgdGhpcy50b3RhbEFzc2V0cyA9IHRvdGFsQXNzZXRzO1xuICAgIHRoaXMuYXNzZXRzU2Nhbm5lZCA9IDA7XG4gICAgdGhpcy50YWdnZWRBc3NldCA9IDA7XG4gICAgdGhpcy50YWdnZWRBc3NldHNTaXplTWIgPSAwO1xuICAgIHRoaXMuZGVsZXRlZEFzc2V0cyA9IDA7XG4gICAgdGhpcy5kZWxldGVkQXNzZXRzU2l6ZU1iID0gMDtcbiAgICB0aGlzLmludGVydmFsID0gaW50ZXJ2YWwgPz8gMTBfMDAwO1xuICAgIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcbiAgfVxuXG4gIHB1YmxpYyByZXBvcnRTY2FubmVkQXNzZXQoYW10OiBudW1iZXIpIHtcbiAgICB0aGlzLmFzc2V0c1NjYW5uZWQgKz0gYW10O1xuICB9XG5cbiAgcHVibGljIHJlcG9ydFRhZ2dlZEFzc2V0KGFzc2V0czogR0NBc3NldFtdKSB7XG4gICAgdGhpcy50YWdnZWRBc3NldCArPSBhc3NldHMubGVuZ3RoO1xuICAgIGNvbnN0IHNpemVJbkJ5dGVzID0gYXNzZXRzLnJlZHVjZSgodG90YWwsIGFzc2V0KSA9PiB0b3RhbCArIGFzc2V0LnNpemUsIDApO1xuICAgIHRoaXMudGFnZ2VkQXNzZXRzU2l6ZU1iICs9IHNpemVJbkJ5dGVzIC8gMV8wNDhfNTc2O1xuICB9XG5cbiAgcHVibGljIHJlcG9ydERlbGV0ZWRBc3NldChhc3NldHM6IEdDQXNzZXRbXSkge1xuICAgIHRoaXMuZGVsZXRlZEFzc2V0cyArPSBhc3NldHMubGVuZ3RoO1xuICAgIGNvbnN0IHNpemVJbkJ5dGVzID0gYXNzZXRzLnJlZHVjZSgodG90YWwsIGFzc2V0KSA9PiB0b3RhbCArIGFzc2V0LnNpemUsIDApO1xuICAgIHRoaXMuZGVsZXRlZEFzc2V0c1NpemVNYiArPSBzaXplSW5CeXRlcyAvIDFfMDQ4XzU3NjtcbiAgfVxuXG4gIHB1YmxpYyBzdGFydCgpIHtcbiAgICB0aGlzLnNldEludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLmlzUGF1c2VkKSB7XG4gICAgICAgIHRoaXMucHJpbnQoKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzLmludGVydmFsKTtcbiAgfVxuXG4gIHB1YmxpYyBwYXVzZSgpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyByZXN1bWUoKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuICB9XG5cbiAgcHVibGljIHN0b3AoKSB7XG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLnNldEludGVydmFsKTtcbiAgICAvLyBwcmludCBvbmUgbGFzdCB0aW1lIGlmIG5vdCBwYXVzZWRcbiAgICBpZiAoIXRoaXMuaXNQYXVzZWQpIHtcbiAgICAgIHRoaXMucHJpbnQoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHByaW50KCkge1xuICAgIGNvbnN0IHBlcmNlbnRhZ2UgPSAoKHRoaXMuYXNzZXRzU2Nhbm5lZCAvIHRoaXMudG90YWxBc3NldHMpICogMTAwKS50b0ZpeGVkKDIpO1xuICAgIC8vIHByaW50IGluIE1pQiB1bnRpbCB3ZSBoaXQgYXQgbGVhc3QgMSBHaUIgb2YgZGF0YSB0YWdnZWQvZGVsZXRlZFxuICAgIGlmIChNYXRoLm1heCh0aGlzLnRhZ2dlZEFzc2V0c1NpemVNYiwgdGhpcy5kZWxldGVkQXNzZXRzU2l6ZU1iKSA+PSAxMDAwKSB7XG4gICAgICBwcmludChjaGFsay5ncmVlbihgWyR7cGVyY2VudGFnZX0lXSAke3RoaXMuYXNzZXRzU2Nhbm5lZH0gZmlsZXMgc2Nhbm5lZDogJHt0aGlzLnRhZ2dlZEFzc2V0fSBhc3NldHMgKCR7KHRoaXMudGFnZ2VkQXNzZXRzU2l6ZU1iIC8gMTAwMCkudG9GaXhlZCgyKX0gR2lCKSB0YWdnZWQsICR7dGhpcy5kZWxldGVkQXNzZXRzfSBhc3NldHMgKCR7KHRoaXMuZGVsZXRlZEFzc2V0c1NpemVNYiAvIDEwMDApLnRvRml4ZWQoMil9IEdpQikgZGVsZXRlZC5gKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByaW50KGNoYWxrLmdyZWVuKGBbJHtwZXJjZW50YWdlfSVdICR7dGhpcy5hc3NldHNTY2FubmVkfSBmaWxlcyBzY2FubmVkOiAke3RoaXMudGFnZ2VkQXNzZXR9IGFzc2V0cyAoJHt0aGlzLnRhZ2dlZEFzc2V0c1NpemVNYi50b0ZpeGVkKDIpfSBNaUIpIHRhZ2dlZCwgJHt0aGlzLmRlbGV0ZWRBc3NldHN9IGFzc2V0cyAoJHt0aGlzLmRlbGV0ZWRBc3NldHNTaXplTWIudG9GaXhlZCgyKX0gTWlCKSBkZWxldGVkLmApKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==