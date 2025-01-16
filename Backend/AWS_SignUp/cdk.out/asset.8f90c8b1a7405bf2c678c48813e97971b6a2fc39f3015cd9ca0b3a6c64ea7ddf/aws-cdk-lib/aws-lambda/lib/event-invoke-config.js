"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.EventInvokeConfig=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var destination_1=()=>{var tmp=require("./destination");return destination_1=()=>tmp,tmp},lambda_generated_1=()=>{var tmp=require("./lambda.generated");return lambda_generated_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class EventInvokeConfig extends core_1().Resource{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_lambda_EventInvokeConfigProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EventInvokeConfig),error}if(props.maxEventAge&&(props.maxEventAge.toSeconds()<60||props.maxEventAge.toSeconds()>21600))throw new Error("`maximumEventAge` must represent a `Duration` that is between 60 and 21600 seconds.");if(props.retryAttempts&&(props.retryAttempts<0||props.retryAttempts>2))throw new Error("`retryAttempts` must be between 0 and 2.");new(lambda_generated_1()).CfnEventInvokeConfig(this,"Resource",{destinationConfig:props.onFailure||props.onSuccess?{...props.onFailure?{onFailure:props.onFailure.bind(this,props.function,{type:destination_1().DestinationType.FAILURE})}:{},...props.onSuccess?{onSuccess:props.onSuccess.bind(this,props.function,{type:destination_1().DestinationType.SUCCESS})}:{}}:void 0,functionName:props.function.functionName,maximumEventAgeInSeconds:props.maxEventAge&&props.maxEventAge.toSeconds(),maximumRetryAttempts:props.retryAttempts??void 0,qualifier:props.qualifier||"$LATEST"})}}exports.EventInvokeConfig=EventInvokeConfig,_a=JSII_RTTI_SYMBOL_1,EventInvokeConfig[_a]={fqn:"aws-cdk-lib.aws_lambda.EventInvokeConfig",version:"2.175.1"};
