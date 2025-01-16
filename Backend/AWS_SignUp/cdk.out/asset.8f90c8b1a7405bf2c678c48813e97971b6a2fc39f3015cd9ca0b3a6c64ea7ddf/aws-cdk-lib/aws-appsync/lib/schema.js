"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.SchemaFile=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var fs_1=()=>{var tmp=require("fs");return fs_1=()=>tmp,tmp};class SchemaFile{static fromAsset(filePath){return new SchemaFile({filePath})}constructor(options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_appsync_SchemaProps(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,SchemaFile),error}this.definition=(0,fs_1().readFileSync)(options.filePath).toString("utf-8")}bind(api,_options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_appsync_IGraphqlApi(api),jsiiDeprecationWarnings().aws_cdk_lib_aws_appsync_SchemaBindOptions(_options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}return{apiId:api.apiId,definition:this.definition}}}exports.SchemaFile=SchemaFile,_a=JSII_RTTI_SYMBOL_1,SchemaFile[_a]={fqn:"aws-cdk-lib.aws_appsync.SchemaFile",version:"2.175.1"};
