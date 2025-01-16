"use strict";var _a,_b;Object.defineProperty(exports,"__esModule",{value:!0}),exports.JobDefinitionBase=exports.Reason=exports.Action=exports.RetryStrategy=void 0,exports.baseJobDefinitionProperties=baseJobDefinitionProperties;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class RetryStrategy{static of(action,on){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_Action(action),jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_Reason(on)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.of),error}return new RetryStrategy(action,on)}constructor(action,on){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_Action(action),jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_Reason(on)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,RetryStrategy),error}this.action=action,this.on=on}}exports.RetryStrategy=RetryStrategy,_a=JSII_RTTI_SYMBOL_1,RetryStrategy[_a]={fqn:"aws-cdk-lib.aws_batch.RetryStrategy",version:"2.175.1"};var Action;(function(Action2){Action2.EXIT="EXIT",Action2.RETRY="RETRY"})(Action||(exports.Action=Action={}));class Reason{static custom(customReasonProps){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_CustomReason(customReasonProps)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.custom),error}return customReasonProps}}exports.Reason=Reason,_b=JSII_RTTI_SYMBOL_1,Reason[_b]={fqn:"aws-cdk-lib.aws_batch.Reason",version:"2.175.1"},Reason.NON_ZERO_EXIT_CODE={onExitCode:"*"},Reason.CANNOT_PULL_CONTAINER={onReason:"CannotPullContainerError:*"},Reason.SPOT_INSTANCE_RECLAIMED={onStatusReason:"Host EC2*"};class JobDefinitionBase extends core_1().Resource{constructor(scope,id,props){super(scope,id,{physicalName:props?.jobDefinitionName}),this.parameters=props?.parameters,this.retryAttempts=props?.retryAttempts,this.retryStrategies=props?.retryStrategies??[],this.schedulingPriority=props?.schedulingPriority,this.timeout=props?.timeout}addRetryStrategy(strategy){this.retryStrategies.push(strategy)}}exports.JobDefinitionBase=JobDefinitionBase;function baseJobDefinitionProperties(baseJobDefinition){return{parameters:baseJobDefinition.parameters,retryStrategy:{attempts:baseJobDefinition.retryAttempts,evaluateOnExit:core_1().Lazy.any({produce:()=>{if(baseJobDefinition.retryStrategies.length!==0)return baseJobDefinition.retryStrategies.map(strategy=>({action:strategy.action,...strategy.on}))}})},schedulingPriority:baseJobDefinition.schedulingPriority,timeout:{attemptDurationSeconds:baseJobDefinition.timeout?.toSeconds()},type:"dummy"}}
