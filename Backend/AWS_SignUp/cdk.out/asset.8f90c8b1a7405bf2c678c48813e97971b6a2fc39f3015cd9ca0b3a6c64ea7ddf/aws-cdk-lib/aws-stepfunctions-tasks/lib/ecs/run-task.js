"use strict";var _a,_b,_c;Object.defineProperty(exports,"__esModule",{value:!0}),exports.EcsRunTask=exports.EcsEc2LaunchTarget=exports.EcsFargateLaunchTarget=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var ec2=()=>{var tmp=require("../../../aws-ec2");return ec2=()=>tmp,tmp},ecs=()=>{var tmp=require("../../../aws-ecs");return ecs=()=>tmp,tmp},iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},cdk=()=>{var tmp=require("../../../core");return cdk=()=>tmp,tmp},cx_api_1=()=>{var tmp=require("../../../cx-api");return cx_api_1=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp};class EcsFargateLaunchTarget{constructor(options){this.options=options;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_EcsFargateLaunchTargetOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EcsFargateLaunchTarget),error}}bind(_task,launchTargetOptions){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_EcsRunTask(_task),jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_LaunchTargetBindOptions(launchTargetOptions)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}if(!launchTargetOptions.taskDefinition.isFargateCompatible)throw new Error("Supplied TaskDefinition is not compatible with Fargate");return{parameters:{LaunchType:"FARGATE",PlatformVersion:this.options?.platformVersion}}}}exports.EcsFargateLaunchTarget=EcsFargateLaunchTarget,_a=JSII_RTTI_SYMBOL_1,EcsFargateLaunchTarget[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.EcsFargateLaunchTarget",version:"2.175.1"};class EcsEc2LaunchTarget{constructor(options){this.options=options;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_EcsEc2LaunchTargetOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EcsEc2LaunchTarget),error}}bind(_task,launchTargetOptions){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_EcsRunTask(_task),jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_LaunchTargetBindOptions(launchTargetOptions)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}if(!launchTargetOptions.taskDefinition.isEc2Compatible)throw new Error("Supplied TaskDefinition is not compatible with EC2");if(!launchTargetOptions.cluster?.hasEc2Capacity)throw new Error("Cluster for this service needs Ec2 capacity. Call addCapacity() on the cluster.");return{parameters:{LaunchType:"EC2",PlacementConstraints:noEmpty(flatten((this.options?.placementConstraints??[]).map(c=>c.toJson().map(uppercaseKeys)))),PlacementStrategy:noEmpty(flatten((this.options?.placementStrategies??[]).map(c=>c.toJson().map(uppercaseKeys))))}};function uppercaseKeys(obj){const ret={};for(const key of Object.keys(obj))ret[key.slice(0,1).toUpperCase()+key.slice(1)]=obj[key];return ret}function flatten(xs){return Array.prototype.concat([],...xs)}function noEmpty(xs){if(xs.length!==0)return xs}}}exports.EcsEc2LaunchTarget=EcsEc2LaunchTarget,_b=JSII_RTTI_SYMBOL_1,EcsEc2LaunchTarget[_b]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.EcsEc2LaunchTarget",version:"2.175.1"};class EcsRunTask extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props,this.connections=new(ec2()).Connections,this.securityGroups=[];try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_EcsRunTaskProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EcsRunTask),error}if(this.integrationPattern=props.integrationPattern??sfn().IntegrationPattern.REQUEST_RESPONSE,(0,task_utils_1().validatePatternSupported)(this.integrationPattern,EcsRunTask.SUPPORTED_INTEGRATION_PATTERNS),this.integrationPattern===sfn().IntegrationPattern.WAIT_FOR_TASK_TOKEN&&!sfn().FieldUtils.containsTaskToken(props.containerOverrides?.map(override=>override.environment)))throw new Error("Task Token is required in at least one `containerOverrides.environment` for callback. Use JsonPath.taskToken to set the token.");if(!this.props.taskDefinition.defaultContainer)throw new Error("A TaskDefinition must have at least one essential container");this.props.taskDefinition.networkMode===ecs().NetworkMode.AWS_VPC?this.configureAwsVpcNetworking():(this.validateNoNetworkingProps(),this.connections.addSecurityGroup(...this.props.cluster.connections.securityGroups));for(const override of this.props.containerOverrides??[]){const name=override.containerDefinition.containerName;if(!cdk().Token.isUnresolved(name)&&!this.props.taskDefinition.findContainer(name))throw new Error(`Overrides mention container with name '${name}', but no such container in task definition`)}this.taskPolicies=this.makePolicyStatements()}_renderTask(){return{Resource:(0,task_utils_1().integrationResourceArn)("ecs","runTask",this.integrationPattern),Parameters:sfn().FieldUtils.renderObject({Cluster:this.props.cluster.clusterArn,TaskDefinition:this.props.revisionNumber===void 0?this.props.taskDefinition.family:`${this.props.taskDefinition.family}:${this.props.revisionNumber.toString()}`,NetworkConfiguration:this.networkConfiguration,Overrides:renderOverrides({cpu:this.props.cpu,memoryMiB:this.props.memoryMiB,containerOverrides:this.props.containerOverrides}),PropagateTags:this.props.propagatedTagSource,...this.props.launchTarget.bind(this,{taskDefinition:this.props.taskDefinition,cluster:this.props.cluster}).parameters,EnableExecuteCommand:this.props.enableExecuteCommand})}}configureAwsVpcNetworking(){const subnetSelection=this.props.subnets??{subnetType:this.props.assignPublicIp?ec2().SubnetType.PUBLIC:ec2().SubnetType.PRIVATE_WITH_EGRESS};this.networkConfiguration={AwsvpcConfiguration:{AssignPublicIp:this.props.assignPublicIp?this.props.assignPublicIp?"ENABLED":"DISABLED":void 0,Subnets:this.props.cluster.vpc.selectSubnets(subnetSelection).subnetIds,SecurityGroups:cdk().Lazy.list({produce:()=>this.securityGroups?.map(sg=>sg.securityGroupId)})}},this.securityGroups=this.props.securityGroups??[new(ec2()).SecurityGroup(this,"SecurityGroup",{vpc:this.props.cluster.vpc})],this.connections.addSecurityGroup(...this.securityGroups)}validateNoNetworkingProps(){if(this.props.subnets!==void 0||this.props.securityGroups!==void 0)throw new Error(`Supplied TaskDefinition must have 'networkMode' of 'AWS_VPC' to use 'vpcSubnets' and 'securityGroup'. Received: ${this.props.taskDefinition.networkMode}`)}makePolicyStatements(){const stack=cdk().Stack.of(this),policyStatements=[new(iam()).PolicyStatement({actions:["ecs:RunTask"],resources:[cdk().FeatureFlags.of(this).isEnabled(cx_api_1().STEPFUNCTIONS_TASKS_FIX_RUN_ECS_TASK_POLICY)?this.getTaskDefinitionArn():this.getTaskDefinitionFamilyArn()+":*"]}),new(iam()).PolicyStatement({actions:["ecs:StopTask","ecs:DescribeTasks"],resources:["*"]}),new(iam()).PolicyStatement({actions:["iam:PassRole"],resources:this.taskExecutionRoles().map(r=>r.roleArn)})];return this.integrationPattern===sfn().IntegrationPattern.RUN_JOB&&policyStatements.push(new(iam()).PolicyStatement({actions:["events:PutTargets","events:PutRule","events:DescribeRule"],resources:[stack.formatArn({service:"events",resource:"rule",resourceName:"StepFunctionsGetEventsForECSTaskRule"})]})),policyStatements}getTaskDefinitionArn(){return this.props.taskDefinition.taskDefinitionArn}getTaskDefinitionFamilyArn(){const arnComponents=cdk().Stack.of(this).splitArn(this.props.taskDefinition.taskDefinitionArn,cdk().ArnFormat.SLASH_RESOURCE_NAME);let{resourceName}=arnComponents;return resourceName&&(resourceName=resourceName.split(":")[0]),cdk().Stack.of(this).formatArn({partition:arnComponents.partition,service:arnComponents.service,account:arnComponents.account,region:arnComponents.region,resource:arnComponents.resource,arnFormat:arnComponents.arnFormat,resourceName})}taskExecutionRoles(){const ret=new Array;return ret.push(this.props.taskDefinition.taskRole),this.props.taskDefinition.executionRole&&ret.push(this.props.taskDefinition.executionRole),ret}}exports.EcsRunTask=EcsRunTask,_c=JSII_RTTI_SYMBOL_1,EcsRunTask[_c]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.EcsRunTask",version:"2.175.1"},EcsRunTask.SUPPORTED_INTEGRATION_PATTERNS=[sfn().IntegrationPattern.REQUEST_RESPONSE,sfn().IntegrationPattern.RUN_JOB,sfn().IntegrationPattern.WAIT_FOR_TASK_TOKEN];function renderOverrides(props){const containerOverrides=props.containerOverrides,noContainerOverrides=!containerOverrides||containerOverrides.length===0;if(noContainerOverrides&&!props.cpu&&!props.memoryMiB)return;const ret=new Array;if(!noContainerOverrides)for(const override of containerOverrides)ret.push({Name:override.containerDefinition.containerName,Command:override.command,Cpu:override.cpu,Memory:override.memoryLimit,MemoryReservation:override.memoryReservation,Environment:override.environment?.map(e=>({Name:e.name,Value:e.value}))});return{Cpu:props.cpu,Memory:props.memoryMiB,ContainerOverrides:noContainerOverrides?void 0:ret}}
