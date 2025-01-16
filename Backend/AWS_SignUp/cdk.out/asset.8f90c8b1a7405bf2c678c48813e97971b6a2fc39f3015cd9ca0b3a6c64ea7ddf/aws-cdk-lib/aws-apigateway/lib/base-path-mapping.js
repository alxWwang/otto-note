"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.BasePathMapping=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var apigateway_generated_1=()=>{var tmp=require("./apigateway.generated");return apigateway_generated_1=()=>tmp,tmp},restapi_1=()=>{var tmp=require("./restapi");return restapi_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class BasePathMapping extends core_1().Resource{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_apigateway_BasePathMappingProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,BasePathMapping),error}if(props.basePath&&!core_1().Token.isUnresolved(props.basePath)){if(props.basePath.startsWith("/")||props.basePath.endsWith("/"))throw new Error(`A base path cannot start or end with /", received: ${props.basePath}`);if(props.basePath.match(/\/{2,}/))throw new Error(`A base path cannot have more than one consecutive /", received: ${props.basePath}`);if(!props.basePath.match(/^[a-zA-Z0-9$_.+!*'()-/]+$/))throw new Error(`A base path may only contain letters, numbers, and one of "$-_.+!*'()/", received: ${props.basePath}`)}const attachToStage=props.attachToStage??!0,stage=props.stage??(props.restApi instanceof restapi_1().RestApiBase&&attachToStage?props.restApi.deploymentStage:void 0);new(apigateway_generated_1()).CfnBasePathMapping(this,"Resource",{basePath:props.basePath,domainName:props.domainName.domainName,restApiId:props.restApi.restApiId,stage:stage?.stageName})}}exports.BasePathMapping=BasePathMapping,_a=JSII_RTTI_SYMBOL_1,BasePathMapping[_a]={fqn:"aws-cdk-lib.aws_apigateway.BasePathMapping",version:"2.175.1"};
