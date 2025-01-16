"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.MediaConvertCreateJob=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp},cdk=()=>{var tmp=require("../../../core");return cdk=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp};class MediaConvertCreateJob extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_MediaConvertCreateJobProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,MediaConvertCreateJob),error}this.integrationPattern=props.integrationPattern??sfn().IntegrationPattern.REQUEST_RESPONSE,(0,task_utils_1().validatePatternSupported)(this.integrationPattern,MediaConvertCreateJob.SUPPORTED_INTEGRATION_PATTERNS),cdk().requireProperty(props.createJobRequest,"Role",this),cdk().requireProperty(props.createJobRequest,"Settings",this),this.taskPolicies=this.renderPolicyStatements()}renderPolicyStatements(){const policyStatements=[new(iam()).PolicyStatement({actions:["iam:PassRole"],resources:[this.props.createJobRequest.Role],conditions:{StringLike:{"iam:PassedToService":"mediaconvert.amazonaws.com"}}}),new(iam()).PolicyStatement({actions:["mediaconvert:CreateJob"],resources:["*"]})];return this.props.integrationPattern==sfn().IntegrationPattern.RUN_JOB&&(policyStatements.push(new(iam()).PolicyStatement({actions:["mediaconvert:GetJob","mediaconvert:CancelJob"],resources:["*"]})),policyStatements.push(new(iam()).PolicyStatement({actions:["events:PutTargets","events:PutRule","events:DescribeRule"],resources:[core_1().Stack.of(this).formatArn({service:"events",resource:"rule",resourceName:"StepFunctionsGetEventsForMediaConvertJobRule"})]}))),policyStatements}_renderTask(){return{Resource:(0,task_utils_1().integrationResourceArn)("mediaconvert","createJob",this.props.integrationPattern),Parameters:this.props.createJobRequest}}}exports.MediaConvertCreateJob=MediaConvertCreateJob,_a=JSII_RTTI_SYMBOL_1,MediaConvertCreateJob[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.MediaConvertCreateJob",version:"2.175.1"},MediaConvertCreateJob.SUPPORTED_INTEGRATION_PATTERNS=[sfn().IntegrationPattern.REQUEST_RESPONSE,sfn().IntegrationPattern.RUN_JOB];
