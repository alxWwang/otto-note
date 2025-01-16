"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CloudFormationTemplate=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var util_1=()=>{var tmp=require("./private/util");return util_1=()=>tmp,tmp},s3_assets=()=>{var tmp=require("../../aws-s3-assets");return s3_assets=()=>tmp,tmp};class CloudFormationTemplate{static fromUrl(url){return new CloudFormationUrlTemplate(url)}static fromAsset(path,options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_s3_assets_AssetOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromAsset),error}return new CloudFormationAssetTemplate(path,options)}static fromProductStack(productStack){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_servicecatalog_ProductStack(productStack)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromProductStack),error}return new CloudFormationProductStackTemplate(productStack)}}exports.CloudFormationTemplate=CloudFormationTemplate,_a=JSII_RTTI_SYMBOL_1,CloudFormationTemplate[_a]={fqn:"aws-cdk-lib.aws_servicecatalog.CloudFormationTemplate",version:"2.175.1"};class CloudFormationUrlTemplate extends CloudFormationTemplate{constructor(url){super(),this.url=url}bind(_scope){return{httpUrl:this.url}}}class CloudFormationAssetTemplate extends CloudFormationTemplate{constructor(path,options={}){super(),this.path=path,this.options=options}bind(scope){return this.asset||(this.asset=new(s3_assets()).Asset(scope,`Template${(0,util_1().hashValues)(this.path)}`,{path:this.path,...this.options})),{httpUrl:this.asset.httpUrl}}}class CloudFormationProductStackTemplate extends CloudFormationTemplate{constructor(productStack){super(),this.productStack=productStack}bind(_scope){return{httpUrl:this.productStack._getTemplateUrl(),assetBucket:this.productStack._getAssetBucket()}}}
