"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.BedrockInvokeModel=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp},cxapi=()=>{var tmp=require("../../../cx-api");return cxapi=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp};class BedrockInvokeModel extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_BedrockInvokeModelProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,BedrockInvokeModel),error}this.integrationPattern=props.integrationPattern??sfn().IntegrationPattern.REQUEST_RESPONSE,(0,task_utils_1().validatePatternSupported)(this.integrationPattern,BedrockInvokeModel.SUPPORTED_INTEGRATION_PATTERNS);const useNewS3UriParamsForTask=core_1().FeatureFlags.of(this).isEnabled(cxapi().USE_NEW_S3URI_PARAMETERS_FOR_BEDROCK_INVOKE_MODEL_TASK),isBodySpecified=props.body!==void 0;let isInputSpecified;if(useNewS3UriParamsForTask?isInputSpecified=props.input!==void 0?props.input?.s3Location!==void 0||props.input?.s3InputUri!==void 0:!1:isInputSpecified=props.input!==void 0&&props.input.s3Location!==void 0||props.inputPath!==void 0,isBodySpecified&&isInputSpecified)throw new Error("Either `body` or `input` must be specified, but not both.");if(!isBodySpecified&&!isInputSpecified)throw new Error("Either `body` or `input` must be specified.");if(props.input?.s3Location?.objectVersion!==void 0)throw new Error("Input S3 object version is not supported.");if(props.output?.s3Location?.objectVersion!==void 0)throw new Error("Output S3 object version is not supported.");if(props.input?.s3InputUri&&props.input.s3Location||props.output?.s3OutputUri&&props.output.s3Location)throw new Error("Either specify S3 Uri or S3 location, but not both.");if(useNewS3UriParamsForTask&&(props.input?.s3InputUri===""||props.output?.s3OutputUri===""))throw new Error("S3 Uri cannot be an empty string");(props.inputPath||props.outputPath&&!useNewS3UriParamsForTask)&&core_1().Annotations.of(scope).addWarningV2("aws-cdk-lib/aws-stepfunctions-taks",'These props will set the value of inputPath/outputPath as s3 URI under input/output field in state machine JSON definition. To modify the behaviour set feature flag `@aws-cdk/aws-stepfunctions-tasks:useNewS3UriParametersForBedrockInvokeModelTask": true` and use props input.s3InputUri/output.s3OutputUri'),this.taskPolicies=this.renderPolicyStatements()}renderPolicyStatements(){const useNewS3UriParamsForTask=core_1().FeatureFlags.of(this).isEnabled(cxapi().USE_NEW_S3URI_PARAMETERS_FOR_BEDROCK_INVOKE_MODEL_TASK),policyStatements=[new(iam()).PolicyStatement({actions:["bedrock:InvokeModel"],resources:[this.props.model.modelArn]})];if(this.props.input?.s3InputUri!==void 0||!useNewS3UriParamsForTask&&this.props.inputPath!==void 0?policyStatements.push(new(iam()).PolicyStatement({actions:["s3:GetObject"],resources:[core_1().Stack.of(this).formatArn({region:"",account:"",service:"s3",resource:"*"})]})):this.props.input!==void 0&&this.props.input.s3Location!==void 0&&policyStatements.push(new(iam()).PolicyStatement({actions:["s3:GetObject"],resources:[core_1().Stack.of(this).formatArn({region:"",account:"",service:"s3",resource:this.props.input?.s3Location?.bucketName,resourceName:this.props.input?.s3Location?.objectKey})]})),this.props.output?.s3OutputUri!==void 0||!useNewS3UriParamsForTask&&this.props.outputPath!==void 0?policyStatements.push(new(iam()).PolicyStatement({actions:["s3:PutObject"],resources:[core_1().Stack.of(this).formatArn({region:"",account:"",service:"s3",resource:"*"})]})):this.props.output!==void 0&&this.props.output.s3Location!==void 0&&policyStatements.push(new(iam()).PolicyStatement({actions:["s3:PutObject"],resources:[core_1().Stack.of(this).formatArn({region:"",account:"",service:"s3",resource:this.props.output?.s3Location?.bucketName,resourceName:this.props.output?.s3Location?.objectKey})]})),this.props.guardrail){const isArn=this.props.guardrail.guardrailIdentifier.startsWith("arn:");policyStatements.push(new(iam()).PolicyStatement({actions:["bedrock:ApplyGuardrail"],resources:[isArn?this.props.guardrail.guardrailIdentifier:core_1().Stack.of(this).formatArn({service:"bedrock",resource:"guardrail",resourceName:this.props.guardrail.guardrailIdentifier})]}))}return policyStatements}_renderTask(){const useNewS3UriParamsForTask=core_1().FeatureFlags.of(this).isEnabled(cxapi().USE_NEW_S3URI_PARAMETERS_FOR_BEDROCK_INVOKE_MODEL_TASK),inputSource=this.getInputSource(this.props.input,this.props.inputPath,useNewS3UriParamsForTask),outputSource=this.getOutputSource(this.props.output,this.props.outputPath,useNewS3UriParamsForTask);return{Resource:(0,task_utils_1().integrationResourceArn)("bedrock","invokeModel"),Parameters:sfn().FieldUtils.renderObject({ModelId:this.props.model.modelArn,Accept:this.props.accept,ContentType:this.props.contentType,Body:this.props.body?.value,Input:inputSource?{S3Uri:inputSource}:void 0,Output:outputSource?{S3Uri:outputSource}:void 0,GuardrailIdentifier:this.props.guardrail?.guardrailIdentifier,GuardrailVersion:this.props.guardrail?.guardrailVersion,Trace:this.props.traceEnabled===void 0?void 0:this.props.traceEnabled?"ENABLED":"DISABLED"})}}getInputSource(props,inputPath,useNewS3UriParamsForTask){if(props?.s3Location)return`s3://${props.s3Location.bucketName}/${props.s3Location.objectKey}`;if(useNewS3UriParamsForTask&&props?.s3InputUri)return props.s3InputUri;if(!useNewS3UriParamsForTask&&inputPath)return inputPath}getOutputSource(props,outputPath,useNewS3UriParamsForTask){if(props?.s3Location)return`s3://${props.s3Location.bucketName}/${props.s3Location.objectKey}`;if(useNewS3UriParamsForTask&&props?.s3OutputUri)return props.s3OutputUri;if(!useNewS3UriParamsForTask&&outputPath)return outputPath}}exports.BedrockInvokeModel=BedrockInvokeModel,_a=JSII_RTTI_SYMBOL_1,BedrockInvokeModel[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.BedrockInvokeModel",version:"2.175.1"},BedrockInvokeModel.SUPPORTED_INTEGRATION_PATTERNS=[sfn().IntegrationPattern.REQUEST_RESPONSE];
