"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.HttpInvoke=exports.URLEncodingFormat=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp},URLEncodingFormat;(function(URLEncodingFormat2){URLEncodingFormat2.BRACKETS="BRACKETS",URLEncodingFormat2.COMMAS="COMMAS",URLEncodingFormat2.DEFAULT="DEFAULT",URLEncodingFormat2.INDICES="INDICES",URLEncodingFormat2.NONE="NONE",URLEncodingFormat2.REPEAT="REPEAT"})(URLEncodingFormat||(exports.URLEncodingFormat=URLEncodingFormat={}));class HttpInvoke extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_HttpInvokeProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,HttpInvoke),error}this.taskPolicies=this.buildTaskPolicyStatements()}_renderTask(){return{Resource:(0,task_utils_1().integrationResourceArn)("http","invoke"),Parameters:sfn().FieldUtils.renderObject(this.buildTaskParameters())}}buildTaskPolicyStatements(){return[new(iam()).PolicyStatement({actions:["events:RetrieveConnectionCredentials"],resources:[this.props.connection.connectionArn]}),new(iam()).PolicyStatement({actions:["secretsmanager:GetSecretValue","secretsmanager:DescribeSecret"],resources:[this.props.connection.connectionSecretArn]}),new(iam()).PolicyStatement({actions:["states:InvokeHTTPEndpoint"],resources:["*"],conditions:{StringLike:{"states:HTTPEndpoint":`${this.props.apiRoot}*`}}})]}buildTaskParameters(){const parameters={ApiEndpoint:`${this.props.apiRoot}/${this.props.apiEndpoint.value}`,Authentication:{ConnectionArn:this.props.connection.connectionArn},Method:this.props.method.value,Headers:this.props.headers?.value,RequestBody:this.props.body?.value,QueryParameters:this.props.queryStringParameters?.value};return this.props.urlEncodingFormat!=null&&this.props.urlEncodingFormat!==URLEncodingFormat.NONE&&(parameters.Headers={...parameters.Headers,"Content-Type":"application/x-www-form-urlencoded"},parameters.Transform={RequestBodyEncoding:"URL_ENCODED"},this.props.urlEncodingFormat!==URLEncodingFormat.DEFAULT&&(parameters.Transform.RequestEncodingOptions={ArrayFormat:this.props.urlEncodingFormat})),parameters}}exports.HttpInvoke=HttpInvoke,_a=JSII_RTTI_SYMBOL_1,HttpInvoke[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.HttpInvoke",version:"2.175.1"};
