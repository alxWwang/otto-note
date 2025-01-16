"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.SnsPublish=exports.MessageAttributeDataType=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp},MessageAttributeDataType;(function(MessageAttributeDataType2){MessageAttributeDataType2.STRING="String",MessageAttributeDataType2.STRING_ARRAY="String.Array",MessageAttributeDataType2.NUMBER="Number",MessageAttributeDataType2.BINARY="Binary"})(MessageAttributeDataType||(exports.MessageAttributeDataType=MessageAttributeDataType={}));class SnsPublish extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_SnsPublishProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,SnsPublish),error}if(this.integrationPattern=props.integrationPattern??sfn().IntegrationPattern.REQUEST_RESPONSE,(0,task_utils_1().validatePatternSupported)(this.integrationPattern,SnsPublish.SUPPORTED_INTEGRATION_PATTERNS),this.integrationPattern===sfn().IntegrationPattern.WAIT_FOR_TASK_TOKEN&&!sfn().FieldUtils.containsTaskToken(props.message))throw new Error("Task Token is required in `message` Use JsonPath.taskToken to set the token.");if(props.topic.fifo){if(!props.messageGroupId)throw new Error("'messageGroupId' is required for FIFO topics");if(props.messageGroupId.length>128)throw new Error(`'messageGroupId' must be at most 128 characters long, got ${props.messageGroupId.length}`);if(!props.topic.contentBasedDeduplication&&!props.messageDeduplicationId)throw new Error("'messageDeduplicationId' is required for FIFO topics with 'contentBasedDeduplication' disabled");if(props.messageDeduplicationId&&props.messageDeduplicationId.length>128)throw new Error(`'messageDeduplicationId' must be at most 128 characters long, got ${props.messageDeduplicationId.length}`)}this.taskPolicies=[new(iam()).PolicyStatement({actions:["sns:Publish"],resources:[this.props.topic.topicArn]})]}_renderTask(){return{Resource:(0,task_utils_1().integrationResourceArn)("sns","publish",this.integrationPattern),Parameters:sfn().FieldUtils.renderObject({TopicArn:this.props.topic.topicArn,Message:this.props.message.value,MessageDeduplicationId:this.props.messageDeduplicationId,MessageGroupId:this.props.messageGroupId,MessageStructure:this.props.messagePerSubscriptionType?"json":void 0,MessageAttributes:renderMessageAttributes(this.props.messageAttributes),Subject:this.props.subject})}}}exports.SnsPublish=SnsPublish,_a=JSII_RTTI_SYMBOL_1,SnsPublish[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.SnsPublish",version:"2.175.1"},SnsPublish.SUPPORTED_INTEGRATION_PATTERNS=[sfn().IntegrationPattern.REQUEST_RESPONSE,sfn().IntegrationPattern.WAIT_FOR_TASK_TOKEN];function renderMessageAttributes(attributes){if(attributes===void 0)return;const renderedAttributes={};return Object.entries(attributes).map(([key,val])=>{renderedAttributes[key]=renderMessageAttributeValue(val)}),sfn().TaskInput.fromObject(renderedAttributes).value}function renderMessageAttributeValue(attribute){const dataType=attribute.dataType;if(attribute.value instanceof sfn().TaskInput)return{DataType:dataType??MessageAttributeDataType.STRING,StringValue:dataType!==MessageAttributeDataType.BINARY?attribute.value.value:void 0,BinaryValue:dataType===MessageAttributeDataType.BINARY?attribute.value.value:void 0};if(dataType===MessageAttributeDataType.BINARY)return{DataType:dataType,BinaryValue:`${attribute.value}`};if(core_1().Token.isUnresolved(attribute.value))return{DataType:dataType??MessageAttributeDataType.STRING,StringValue:attribute.value};if(validateMessageAttribute(attribute),Array.isArray(attribute.value))return{DataType:MessageAttributeDataType.STRING_ARRAY,StringValue:JSON.stringify(attribute.value)};const value=attribute.value;return typeof value=="number"?{DataType:MessageAttributeDataType.NUMBER,StringValue:`${value}`}:{DataType:MessageAttributeDataType.STRING,StringValue:`${value}`}}function validateMessageAttribute(attribute){const dataType=attribute.dataType,value=attribute.value;if(dataType===void 0)return;if(Array.isArray(value)){if(dataType!==MessageAttributeDataType.STRING_ARRAY)throw new Error(`Requested SNS message attribute type was ${dataType} but ${value} was of type Array`);const validArrayTypes=["string","boolean","number"];value.forEach(v=>{if(v!==null||!validArrayTypes.includes(typeof v))throw new Error(`Requested SNS message attribute type was ${typeof value} but Array values must be one of ${validArrayTypes}`)});return}const error=new Error(`Requested SNS message attribute type was ${dataType} but ${value} was of type ${typeof value}`);switch(typeof value){case"string":if(sfn().JsonPath.isEncodedJsonPath(attribute.value)||dataType===MessageAttributeDataType.STRING||dataType===MessageAttributeDataType.BINARY)return;throw error;case"number":if(dataType===MessageAttributeDataType.NUMBER)return;throw error;case"boolean":if(dataType===MessageAttributeDataType.STRING)return;throw error;default:throw error}}
