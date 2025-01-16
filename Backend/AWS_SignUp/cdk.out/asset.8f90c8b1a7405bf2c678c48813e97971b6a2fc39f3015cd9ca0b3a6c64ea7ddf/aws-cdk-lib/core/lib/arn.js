"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Arn=exports.ArnFormat=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cfn_fn_1=()=>{var tmp=require("./cfn-fn");return cfn_fn_1=()=>tmp,tmp},token_1=()=>{var tmp=require("./token");return token_1=()=>tmp,tmp},util_1=()=>{var tmp=require("./util");return util_1=()=>tmp,tmp},ArnFormat;(function(ArnFormat2){ArnFormat2.NO_RESOURCE_NAME="arn:aws:service:region:account:resource",ArnFormat2.COLON_RESOURCE_NAME="arn:aws:service:region:account:resource:resourceName",ArnFormat2.SLASH_RESOURCE_NAME="arn:aws:service:region:account:resource/resourceName",ArnFormat2.SLASH_RESOURCE_SLASH_RESOURCE_NAME="arn:aws:service:region:account:/resource/resourceName"})(ArnFormat||(exports.ArnFormat=ArnFormat={}));class Arn{static format(components,stack){try{jsiiDeprecationWarnings().aws_cdk_lib_ArnComponents(components),jsiiDeprecationWarnings().aws_cdk_lib_Stack(stack)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.format),error}const partition=components.partition??stack?.partition,region=components.region??stack?.region,account=components.account??stack?.account;if(partition==null||region==null||account==null)throw new Error(`Arn.format: partition (${partition}), region (${region}), and account (${account}) must all be passed if stack is not passed.`);const sep=components.sep??(components.arnFormat===ArnFormat.COLON_RESOURCE_NAME?":":"/"),values=["arn",":",partition,":",components.service,":",region,":",account,":",...components.arnFormat===ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME?["/"]:[],components.resource];if(sep!=="/"&&sep!==":"&&sep!=="")throw new Error('resourcePathSep may only be ":", "/" or an empty string');return components.resourceName!=null&&(values.push(sep),values.push(components.resourceName)),values.join("")}static parse(arn,sepIfToken="/",hasName=!0){let arnFormat;return hasName?arnFormat=sepIfToken==="/"?ArnFormat.SLASH_RESOURCE_NAME:ArnFormat.COLON_RESOURCE_NAME:arnFormat=ArnFormat.NO_RESOURCE_NAME,this.split(arn,arnFormat)}static split(arn,arnFormat){try{jsiiDeprecationWarnings().aws_cdk_lib_ArnFormat(arnFormat)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.split),error}const components=parseArnShape(arn);if(components==="token")return parseTokenArn(arn,arnFormat);const[,partition,service,region,account,resourceTypeOrName,...rest]=components;let resource,resourceName,sep,resourcePartStartIndex=0,detectedArnFormat,slashIndex=resourceTypeOrName.indexOf("/");return slashIndex===0&&(slashIndex=resourceTypeOrName.indexOf("/",1),resourcePartStartIndex=1,detectedArnFormat=ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME),slashIndex!==-1?arnFormat===ArnFormat.NO_RESOURCE_NAME?(sep=void 0,slashIndex=-1,detectedArnFormat=ArnFormat.NO_RESOURCE_NAME):(sep="/",detectedArnFormat=resourcePartStartIndex===0?ArnFormat.SLASH_RESOURCE_NAME:ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME):rest.length>0?(sep=":",slashIndex=-1,detectedArnFormat=ArnFormat.COLON_RESOURCE_NAME):(sep=void 0,detectedArnFormat=ArnFormat.NO_RESOURCE_NAME),slashIndex!==-1?(resource=resourceTypeOrName.substring(resourcePartStartIndex,slashIndex),resourceName=resourceTypeOrName.substring(slashIndex+1)):resource=resourceTypeOrName,rest.length>0&&(resourceName?resourceName+=":":resourceName="",resourceName+=rest.join(":")),(0,util_1().filterUndefined)({service:service||void 0,resource:resource||void 0,partition:partition||void 0,region,account,resourceName,sep,arnFormat:detectedArnFormat})}static extractResourceName(arn,resourceType){if(parseArnShape(arn)==="token")return cfn_fn_1().Fn.select(1,cfn_fn_1().Fn.split(`:${resourceType}/`,arn));const parsed=Arn.split(arn,ArnFormat.SLASH_RESOURCE_NAME);if(!token_1().Token.isUnresolved(parsed.resource)&&parsed.resource!==resourceType)throw new Error(`Expected resource type '${resourceType}' in ARN, got '${parsed.resource}' in '${arn}'`);if(!parsed.resourceName)throw new Error(`Expected resource name in ARN, didn't find one: '${arn}'`);return parsed.resourceName}constructor(){}}exports.Arn=Arn,_a=JSII_RTTI_SYMBOL_1,Arn[_a]={fqn:"aws-cdk-lib.Arn",version:"2.175.1"};function parseTokenArn(arnToken,arnFormat){const components=cfn_fn_1().Fn.split(":",arnToken),partition=cfn_fn_1().Fn.select(1,components).toString(),service=cfn_fn_1().Fn.select(2,components).toString(),region=cfn_fn_1().Fn.select(3,components).toString(),account=cfn_fn_1().Fn.select(4,components).toString();let resource,resourceName,sep;if(arnFormat===ArnFormat.NO_RESOURCE_NAME||arnFormat===ArnFormat.COLON_RESOURCE_NAME)resource=cfn_fn_1().Fn.select(5,components),arnFormat===ArnFormat.COLON_RESOURCE_NAME?(resourceName=cfn_fn_1().Fn.select(6,components),sep=":"):(resourceName=void 0,sep=void 0);else{const lastComponents=cfn_fn_1().Fn.split("/",cfn_fn_1().Fn.select(5,components));arnFormat===ArnFormat.SLASH_RESOURCE_NAME?(resource=cfn_fn_1().Fn.select(0,lastComponents),resourceName=cfn_fn_1().Fn.select(1,lastComponents)):(resource=cfn_fn_1().Fn.select(1,lastComponents),resourceName=cfn_fn_1().Fn.select(2,lastComponents)),sep="/"}return{partition,service,region,account,resource,resourceName,sep,arnFormat}}function parseArnShape(arn){if(!arn.startsWith("arn:")){if(token_1().Token.isUnresolved(arn))return"token";throw new Error(`ARNs must start with "arn:" and have at least 6 components: ${arn}`)}const components=arn.split(":");if(!(components.length>1?components[1]:void 0))throw new Error("The `partition` component (2nd component) of an ARN is required: "+arn);if(!(components.length>2?components[2]:void 0))throw new Error("The `service` component (3rd component) of an ARN is required: "+arn);if(!(components.length>5?components[5]:void 0))throw new Error("The `resource` component (6th component) of an ARN is required: "+arn);return components}
