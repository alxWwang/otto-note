"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.SqsSendMessage=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp};class SqsSendMessage extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_SqsSendMessageProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,SqsSendMessage),error}if(this.integrationPattern=props.integrationPattern??sfn().IntegrationPattern.REQUEST_RESPONSE,(0,task_utils_1().validatePatternSupported)(this.integrationPattern,SqsSendMessage.SUPPORTED_INTEGRATION_PATTERNS),props.integrationPattern===sfn().IntegrationPattern.WAIT_FOR_TASK_TOKEN&&!sfn().FieldUtils.containsTaskToken(props.messageBody))throw new Error("Task Token is required in `messageBody` Use JsonPath.taskToken to set the token.");this.taskPolicies=[new(iam()).PolicyStatement({actions:["sqs:SendMessage"],resources:[this.props.queue.queueArn]})],this.props.queue.encryptionMasterKey&&this.taskPolicies.push(new(iam()).PolicyStatement({actions:["kms:Decrypt","kms:GenerateDataKey*"],resources:[this.props.queue.encryptionMasterKey.keyArn]}))}_renderTask(){return{Resource:(0,task_utils_1().integrationResourceArn)("sqs","sendMessage",this.integrationPattern),Parameters:sfn().FieldUtils.renderObject({QueueUrl:this.props.queue.queueUrl,MessageBody:this.props.messageBody.value,DelaySeconds:this.props.delay?.toSeconds(),MessageDeduplicationId:this.props.messageDeduplicationId,MessageGroupId:this.props.messageGroupId})}}}exports.SqsSendMessage=SqsSendMessage,_a=JSII_RTTI_SYMBOL_1,SqsSendMessage[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.SqsSendMessage",version:"2.175.1"},SqsSendMessage.SUPPORTED_INTEGRATION_PATTERNS=[sfn().IntegrationPattern.REQUEST_RESPONSE,sfn().IntegrationPattern.WAIT_FOR_TASK_TOKEN];
