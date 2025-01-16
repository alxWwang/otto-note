"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.StepFunctionsRestApi=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var _1=()=>{var tmp=require(".");return _1=()=>tmp,tmp},stepfunctions_1=()=>{var tmp=require("./integrations/stepfunctions");return stepfunctions_1=()=>tmp,tmp},sfn=()=>{var tmp=require("../../aws-stepfunctions");return sfn=()=>tmp,tmp};class StepFunctionsRestApi extends _1().RestApi{constructor(scope,id,props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_apigateway_StepFunctionsRestApiProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,StepFunctionsRestApi),error}if(props.defaultIntegration)throw new Error('Cannot specify "defaultIntegration" since Step Functions integration is automatically defined');if(props.stateMachine.node.defaultChild.stateMachineType!==sfn().StateMachineType.EXPRESS)throw new Error('State Machine must be of type "EXPRESS". Please use StateMachineType.EXPRESS as the stateMachineType');const stepfunctionsIntegration=stepfunctions_1().StepFunctionsIntegration.startExecution(props.stateMachine,{credentialsRole:props.role,requestContext:props.requestContext,path:props.path??!0,querystring:props.querystring??!0,headers:props.headers,authorizer:props.authorizer,useDefaultMethodResponses:props.useDefaultMethodResponses});super(scope,id,props),this.root.addMethod("ANY",stepfunctionsIntegration)}}exports.StepFunctionsRestApi=StepFunctionsRestApi,_a=JSII_RTTI_SYMBOL_1,StepFunctionsRestApi[_a]={fqn:"aws-cdk-lib.aws_apigateway.StepFunctionsRestApi",version:"2.175.1"};
