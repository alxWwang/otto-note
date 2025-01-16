"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.copyDirectory=copyDirectory;var fs=()=>{var tmp=require("fs");return fs=()=>tmp,tmp},path=()=>{var tmp=require("path");return path=()=>tmp,tmp},ignore_1=()=>{var tmp=require("./ignore");return ignore_1=()=>tmp,tmp},options_1=()=>{var tmp=require("./options");return options_1=()=>tmp,tmp},utils_1=()=>{var tmp=require("./utils");return utils_1=()=>tmp,tmp};function copyDirectory(srcDir,destDir,options={},rootDir){const follow=options.follow??options_1().SymlinkFollowMode.EXTERNAL;rootDir=rootDir||srcDir;const ignoreStrategy=ignore_1().IgnoreStrategy.fromCopyOptions(options,rootDir);if(!fs().statSync(srcDir).isDirectory())throw new Error(`${srcDir} is not a directory`);const files=fs().readdirSync(srcDir);for(const file of files){const sourceFilePath=path().join(srcDir,file);if(ignoreStrategy.ignores(sourceFilePath))continue;const destFilePath=path().join(destDir,file);let stat=follow===options_1().SymlinkFollowMode.ALWAYS?fs().statSync(sourceFilePath):fs().lstatSync(sourceFilePath);if(stat&&stat.isSymbolicLink()){const target=fs().readlinkSync(sourceFilePath),targetPath=path().normalize(path().resolve(srcDir,target));(0,utils_1().shouldFollow)(follow,rootDir,targetPath)?stat=fs().statSync(sourceFilePath):(fs().symlinkSync(target,destFilePath),stat=void 0)}stat&&stat.isDirectory()&&(fs().mkdirSync(destFilePath),copyDirectory(sourceFilePath,destFilePath,options,rootDir),stat=void 0),stat&&stat.isFile()&&(fs().copyFileSync(sourceFilePath,destFilePath),stat=void 0)}}
