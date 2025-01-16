"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.TarballImageAsset=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var fs=()=>{var tmp=require("fs");return fs=()=>tmp,tmp},path=()=>{var tmp=require("path");return path=()=>tmp,tmp},constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},ecr=()=>{var tmp=require("../../aws-ecr");return ecr=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class TarballImageAsset extends constructs_1().Construct{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ecr_assets_TarballImageAssetProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,TarballImageAsset),error}if(!fs().existsSync(props.tarballFile))throw new Error(`Cannot find file at ${props.tarballFile}`);const stagedTarball=new(core_1()).AssetStaging(this,"Staging",{sourcePath:props.tarballFile});this.sourceHash=stagedTarball.assetHash,this.assetHash=stagedTarball.assetHash;const stage=core_1().Stage.of(this),relativePathInOutDir=stage?path().relative(stage.assetOutdir,stagedTarball.absoluteStagedPath):stagedTarball.absoluteStagedPath,location=core_1().Stack.of(this).synthesizer.addDockerImageAsset({sourceHash:stagedTarball.assetHash,executable:["sh","-c",`docker load -i ${relativePathInOutDir} | tail -n 1 | sed "s/Loaded image: //g"`]});this.repository=ecr().Repository.fromRepositoryName(this,"Repository",location.repositoryName),this.imageUri=location.imageUri,this.imageTag=location.imageTag??this.assetHash}}exports.TarballImageAsset=TarballImageAsset,_a=JSII_RTTI_SYMBOL_1,TarballImageAsset[_a]={fqn:"aws-cdk-lib.aws_ecr_assets.TarballImageAsset",version:"2.175.1"};
