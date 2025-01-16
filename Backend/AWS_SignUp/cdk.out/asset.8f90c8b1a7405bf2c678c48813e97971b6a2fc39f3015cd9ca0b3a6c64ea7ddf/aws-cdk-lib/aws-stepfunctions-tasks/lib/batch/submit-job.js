"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.BatchSubmitJob=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp};class BatchSubmitJob extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_BatchSubmitJobProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,BatchSubmitJob),error}if(this.integrationPattern=props.integrationPattern??sfn().IntegrationPattern.RUN_JOB,(0,task_utils_1().validatePatternSupported)(this.integrationPattern,BatchSubmitJob.SUPPORTED_INTEGRATION_PATTERNS),(0,core_1().withResolved)(props.arraySize,arraySize=>{if(arraySize!==void 0&&(arraySize<2||arraySize>1e4))throw new Error(`arraySize must be between 2 and 10,000. Received ${arraySize}.`)}),props.dependsOn&&props.dependsOn.length>20)throw new Error(`dependencies must be 20 or less. Received ${props.dependsOn.length}.`);(0,core_1().withResolved)(props.attempts,attempts=>{if(attempts!==void 0&&(attempts<1||attempts>10))throw new Error(`attempts must be between 1 and 10. Received ${attempts}.`)}),(props.timeout!==void 0||props.taskTimeout!==void 0)&&(0,core_1().withResolved)(props.timeout?.toSeconds(),props.taskTimeout?.seconds,(timeout,taskTimeout)=>{const definedTimeout=timeout??taskTimeout;if(definedTimeout&&definedTimeout<60)throw new Error(`attempt duration must be greater than 60 seconds. Received ${definedTimeout} seconds.`)}),props.containerOverrides?.environment&&Object.keys(props.containerOverrides.environment).forEach(key=>{if(key.match(/^AWS_BATCH/))throw new Error(`Invalid environment variable name: ${key}. Environment variable names starting with 'AWS_BATCH' are reserved.`)}),this.validateTags(props.tags),this.taskPolicies=this.configurePolicyStatements()}_renderTask(){let timeout;return this.props.timeout?timeout=this.props.timeout.toSeconds():this.props.taskTimeout?.seconds?timeout=this.props.taskTimeout.seconds:this.props.taskTimeout?.path&&(timeout=sfn().JsonPath.numberAt(this.props.taskTimeout.path)),{Resource:(0,task_utils_1().integrationResourceArn)("batch","submitJob",this.integrationPattern),Parameters:sfn().FieldUtils.renderObject({JobDefinition:this.props.jobDefinitionArn,JobName:this.props.jobName,JobQueue:this.props.jobQueueArn,Parameters:this.props.payload?.value,ArrayProperties:this.props.arraySize!==void 0?{Size:this.props.arraySize}:void 0,ContainerOverrides:this.props.containerOverrides?this.configureContainerOverrides(this.props.containerOverrides):void 0,DependsOn:this.props.dependsOn?this.props.dependsOn.map(jobDependency=>({JobId:jobDependency.jobId,Type:jobDependency.type})):void 0,RetryStrategy:this.props.attempts!==void 0?{Attempts:this.props.attempts}:void 0,Tags:this.props.tags,Timeout:timeout?{AttemptDurationSeconds:timeout}:void 0}),TimeoutSeconds:void 0,TimeoutSecondsPath:void 0}}configurePolicyStatements(){return[new(iam()).PolicyStatement({resources:[core_1().Stack.of(this).formatArn({service:"batch",resource:"job-definition",resourceName:"*"}),this.props.jobQueueArn],actions:["batch:SubmitJob"]}),new(iam()).PolicyStatement({resources:[core_1().Stack.of(this).formatArn({service:"events",resource:"rule/StepFunctionsGetEventsForBatchJobsRule"})],actions:["events:PutTargets","events:PutRule","events:DescribeRule"]})]}configureContainerOverrides(containerOverrides){let environment;containerOverrides.environment&&(environment=Object.entries(containerOverrides.environment).map(([key,value])=>({Name:key,Value:value})));let resources=[];return containerOverrides.gpuCount&&resources.push({Type:"GPU",Value:`${containerOverrides.gpuCount}`}),containerOverrides.memory&&resources.push({Type:"MEMORY",Value:`${containerOverrides.memory.toMebibytes()}`}),containerOverrides.vcpus&&resources.push({Type:"VCPU",Value:`${containerOverrides.vcpus}`}),{Command:containerOverrides.command,Environment:environment,InstanceType:containerOverrides.instanceType?.toString(),ResourceRequirements:resources.length?resources:void 0}}validateTags(tags){if(tags===void 0)return;const tagEntries=Object.entries(tags);if(tagEntries.length>50)throw new Error(`Maximum tag number of entries is 50. Received ${tagEntries.length}.`);for(const[key,value]of tagEntries){if(key.length<1||key.length>128)throw new Error(`Tag key size must be between 1 and 128, but got ${key.length}.`);if(value.length>256)throw new Error(`Tag value maximum size is 256, but got ${value.length}.`)}}}exports.BatchSubmitJob=BatchSubmitJob,_a=JSII_RTTI_SYMBOL_1,BatchSubmitJob[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.BatchSubmitJob",version:"2.175.1"},BatchSubmitJob.SUPPORTED_INTEGRATION_PATTERNS=[sfn().IntegrationPattern.REQUEST_RESPONSE,sfn().IntegrationPattern.RUN_JOB];
