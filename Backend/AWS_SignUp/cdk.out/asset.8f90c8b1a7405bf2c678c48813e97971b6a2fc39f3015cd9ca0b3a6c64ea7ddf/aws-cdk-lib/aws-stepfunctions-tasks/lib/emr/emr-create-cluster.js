"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.EmrCreateCluster=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cluster_utils_1=()=>{var tmp=require("./private/cluster-utils");return cluster_utils_1=()=>tmp,tmp},iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},sfn=()=>{var tmp=require("../../../aws-stepfunctions");return sfn=()=>tmp,tmp},cdk=()=>{var tmp=require("../../../core");return cdk=()=>tmp,tmp},cx_api_1=()=>{var tmp=require("../../../cx-api");return cx_api_1=()=>tmp,tmp},task_utils_1=()=>{var tmp=require("../private/task-utils");return task_utils_1=()=>tmp,tmp};class EmrCreateCluster extends sfn().TaskStateBase{constructor(scope,id,props){super(scope,id,props),this.props=props,this._baseTags=void 0;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_tasks_EmrCreateClusterProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EmrCreateCluster),error}if(this.visibleToAllUsers=this.props.visibleToAllUsers??!0,this.integrationPattern=props.integrationPattern||sfn().IntegrationPattern.RUN_JOB,(0,task_utils_1().validatePatternSupported)(this.integrationPattern,EmrCreateCluster.SUPPORTED_INTEGRATION_PATTERNS),this._autoScalingRole=this.props.autoScalingRole,this._serviceRole=this.props.serviceRole??this.createServiceRole(),this._clusterRole=this.props.clusterRole??this.createClusterRole(),this._clusterRole.grantPassRole(this._serviceRole),cdk().FeatureFlags.of(this).isEnabled(cx_api_1().ENABLE_EMR_SERVICE_POLICY_V2)&&(this._baseTags={"for-use-with-amazon-emr-managed-policies":"true"}),this.props.instances.instanceFleets===void 0||this.props.instances.instanceFleets.length===0)this._autoScalingRole=this._autoScalingRole||this.createAutoScalingRole();else if(this._autoScalingRole!==void 0)throw new Error("Auto Scaling roles can not be specified with instance fleets.");if(this.taskPolicies=this.createPolicyStatements(this._serviceRole,this._clusterRole,this._autoScalingRole),this.props.releaseLabel!==void 0&&!cdk().Token.isUnresolved(this.props.releaseLabel)&&this.validateReleaseLabel(this.props.releaseLabel),this.props.stepConcurrencyLevel!==void 0&&!cdk().Token.isUnresolved(this.props.stepConcurrencyLevel)){if(this.props.stepConcurrencyLevel<1||this.props.stepConcurrencyLevel>256)throw new Error(`Step concurrency level must be in range [1, 256], but got ${this.props.stepConcurrencyLevel}.`);if(this.props.releaseLabel&&this.props.stepConcurrencyLevel!==1){const[major,minor]=this.props.releaseLabel.slice(4).split(".");if(Number(major)<5||Number(major)===5&&Number(minor)<28)throw new Error(`Step concurrency is only supported in EMR release version 5.28.0 and above but got ${this.props.releaseLabel}.`)}}if(this.props.autoTerminationPolicyIdleTimeout!==void 0&&!cdk().Token.isUnresolved(this.props.autoTerminationPolicyIdleTimeout)){const idletimeOutSeconds=this.props.autoTerminationPolicyIdleTimeout.toSeconds();if(idletimeOutSeconds<60||idletimeOutSeconds>604800)throw new Error(`\`autoTerminationPolicyIdleTimeout\` must be between 60 and 604800 seconds, got ${idletimeOutSeconds} seconds.`)}}get serviceRole(){if(this._serviceRole===void 0)throw new Error("role not available yet--use the object in a Task first");return this._serviceRole}get clusterRole(){if(this._clusterRole===void 0)throw new Error("role not available yet--use the object in a Task first");return this._clusterRole}get autoScalingRole(){if(this._autoScalingRole===void 0)throw new Error("role not available yet--use the object in a Task first");return this._autoScalingRole}_renderTask(){return{Resource:(0,task_utils_1().integrationResourceArn)("elasticmapreduce","createCluster",this.integrationPattern),Parameters:sfn().FieldUtils.renderObject({Instances:(0,cluster_utils_1().InstancesConfigPropertyToJson)(this.props.instances),JobFlowRole:cdk().stringToCloudFormation(this._clusterRole.roleName),Name:cdk().stringToCloudFormation(this.props.name),ServiceRole:cdk().stringToCloudFormation(this._serviceRole.roleName),AdditionalInfo:cdk().stringToCloudFormation(this.props.additionalInfo),Applications:cdk().listMapper(cluster_utils_1().ApplicationConfigPropertyToJson)(this.props.applications),AutoScalingRole:cdk().stringToCloudFormation(this._autoScalingRole?.roleName),BootstrapActions:cdk().listMapper(cluster_utils_1().BootstrapActionConfigToJson)(this.props.bootstrapActions),Configurations:cdk().listMapper(cluster_utils_1().ConfigurationPropertyToJson)(this.props.configurations),CustomAmiId:cdk().stringToCloudFormation(this.props.customAmiId),EbsRootVolumeSize:this.props.ebsRootVolumeSize?.toGibibytes(),KerberosAttributes:this.props.kerberosAttributes?(0,cluster_utils_1().KerberosAttributesPropertyToJson)(this.props.kerberosAttributes):void 0,LogUri:cdk().stringToCloudFormation(this.props.logUri),ReleaseLabel:cdk().stringToCloudFormation(this.props.releaseLabel),ScaleDownBehavior:cdk().stringToCloudFormation(this.props.scaleDownBehavior?.valueOf()),SecurityConfiguration:cdk().stringToCloudFormation(this.props.securityConfiguration),StepConcurrencyLevel:cdk().numberToCloudFormation(this.props.stepConcurrencyLevel),...this.props.tags?this.renderTags({...this.props.tags,...this._baseTags}):this.renderTags(this._baseTags),VisibleToAllUsers:cdk().booleanToCloudFormation(this.visibleToAllUsers),AutoTerminationPolicy:this.props.autoTerminationPolicyIdleTimeout?{IdleTimeout:this.props.autoTerminationPolicyIdleTimeout.toSeconds()}:void 0})}}renderTags(tags){return tags?{Tags:Object.keys(tags).map(key=>({Key:key,Value:tags[key]}))}:{}}createPolicyStatements(serviceRole,clusterRole,autoScalingRole){const stack=cdk().Stack.of(this),policyStatements=[new(iam()).PolicyStatement({actions:["elasticmapreduce:RunJobFlow","elasticmapreduce:DescribeCluster","elasticmapreduce:TerminateJobFlows","elasticmapreduce:AddTags"],resources:["*"]})];return policyStatements.push(new(iam()).PolicyStatement({actions:["iam:PassRole"],resources:[serviceRole.roleArn,clusterRole.roleArn]})),autoScalingRole!==void 0&&policyStatements.push(new(iam()).PolicyStatement({actions:["iam:PassRole"],resources:[autoScalingRole.roleArn]})),this.props.tags&&policyStatements.push(new(iam()).PolicyStatement({actions:["elasticmapreduce:AddTags"],resources:[stack.formatArn({service:"elasticmapreduce",resource:"cluster",resourceName:"*"})]})),this.integrationPattern===sfn().IntegrationPattern.RUN_JOB&&policyStatements.push(new(iam()).PolicyStatement({actions:["events:PutTargets","events:PutRule","events:DescribeRule"],resources:[stack.formatArn({service:"events",resource:"rule",resourceName:"StepFunctionsGetEventForEMRRunJobFlowRule"})]})),policyStatements}createServiceRole(){return cdk().FeatureFlags.of(this).isEnabled(cx_api_1().ENABLE_EMR_SERVICE_POLICY_V2)?new(iam()).Role(this,"ServiceRole",{assumedBy:new(iam()).ServicePrincipal("elasticmapreduce.amazonaws.com"),managedPolicies:[iam().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonEMRServicePolicy_v2")]}):new(iam()).Role(this,"ServiceRole",{assumedBy:new(iam()).ServicePrincipal("elasticmapreduce.amazonaws.com"),managedPolicies:[iam().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonElasticMapReduceRole")]})}createClusterRole(){const role=new(iam()).Role(this,"InstanceRole",{assumedBy:new(iam()).ServicePrincipal("ec2.amazonaws.com")});return new(iam()).CfnInstanceProfile(this,"InstanceProfile",{roles:[role.roleName],instanceProfileName:role.roleName}),role}createAutoScalingRole(){const role=new(iam()).Role(this,"AutoScalingRole",{assumedBy:new(iam()).ServicePrincipal("elasticmapreduce.amazonaws.com"),managedPolicies:[iam().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonElasticMapReduceforAutoScalingRole")]});return role.assumeRolePolicy?.addStatements(new(iam()).PolicyStatement({effect:iam().Effect.ALLOW,principals:[new(iam()).ServicePrincipal("application-autoscaling.amazonaws.com")],actions:["sts:AssumeRole"]})),role}validateReleaseLabel(releaseLabel){const prefix=releaseLabel.slice(0,4),versions=releaseLabel.slice(4).split(".");if(prefix!=="emr-"||versions.length!==3||versions.some(e=>isNotANumber(e)))throw new Error(`The release label must be in the format 'emr-x.x.x' but got ${releaseLabel}`);return releaseLabel;function isNotANumber(value){return value===""||isNaN(Number(value))}}}exports.EmrCreateCluster=EmrCreateCluster,_a=JSII_RTTI_SYMBOL_1,EmrCreateCluster[_a]={fqn:"aws-cdk-lib.aws_stepfunctions_tasks.EmrCreateCluster",version:"2.175.1"},EmrCreateCluster.SUPPORTED_INTEGRATION_PATTERNS=[sfn().IntegrationPattern.REQUEST_RESPONSE,sfn().IntegrationPattern.RUN_JOB],function(EmrCreateCluster2){let EmrClusterScaleDownBehavior;(function(EmrClusterScaleDownBehavior2){EmrClusterScaleDownBehavior2.TERMINATE_AT_INSTANCE_HOUR="TERMINATE_AT_INSTANCE_HOUR",EmrClusterScaleDownBehavior2.TERMINATE_AT_TASK_COMPLETION="TERMINATE_AT_TASK_COMPLETION"})(EmrClusterScaleDownBehavior=EmrCreateCluster2.EmrClusterScaleDownBehavior||(EmrCreateCluster2.EmrClusterScaleDownBehavior={}));let InstanceRoleType;(function(InstanceRoleType2){InstanceRoleType2.MASTER="MASTER",InstanceRoleType2.CORE="CORE",InstanceRoleType2.TASK="TASK"})(InstanceRoleType=EmrCreateCluster2.InstanceRoleType||(EmrCreateCluster2.InstanceRoleType={}));let EbsBlockDeviceVolumeType;(function(EbsBlockDeviceVolumeType2){EbsBlockDeviceVolumeType2.GP3="gp3",EbsBlockDeviceVolumeType2.GP2="gp2",EbsBlockDeviceVolumeType2.IO1="io1",EbsBlockDeviceVolumeType2.ST1="st1",EbsBlockDeviceVolumeType2.SC1="sc1",EbsBlockDeviceVolumeType2.STANDARD="standard"})(EbsBlockDeviceVolumeType=EmrCreateCluster2.EbsBlockDeviceVolumeType||(EmrCreateCluster2.EbsBlockDeviceVolumeType={}));let OnDemandAllocationStrategy;(function(OnDemandAllocationStrategy2){OnDemandAllocationStrategy2.LOWEST_PRICE="lowest-price"})(OnDemandAllocationStrategy=EmrCreateCluster2.OnDemandAllocationStrategy||(EmrCreateCluster2.OnDemandAllocationStrategy={}));let SpotTimeoutAction;(function(SpotTimeoutAction2){SpotTimeoutAction2.SWITCH_TO_ON_DEMAND="SWITCH_TO_ON_DEMAND",SpotTimeoutAction2.TERMINATE_CLUSTER="TERMINATE_CLUSTER"})(SpotTimeoutAction=EmrCreateCluster2.SpotTimeoutAction||(EmrCreateCluster2.SpotTimeoutAction={}));let SpotAllocationStrategy;(function(SpotAllocationStrategy2){SpotAllocationStrategy2.CAPACITY_OPTIMIZED="capacity-optimized",SpotAllocationStrategy2.PRICE_CAPACITY_OPTIMIZED="price-capacity-optimized",SpotAllocationStrategy2.LOWEST_PRICE="lowest-price",SpotAllocationStrategy2.DIVERSIFIED="diversified"})(SpotAllocationStrategy=EmrCreateCluster2.SpotAllocationStrategy||(EmrCreateCluster2.SpotAllocationStrategy={}));let CloudWatchAlarmComparisonOperator;(function(CloudWatchAlarmComparisonOperator2){CloudWatchAlarmComparisonOperator2.GREATER_THAN_OR_EQUAL="GREATER_THAN_OR_EQUAL",CloudWatchAlarmComparisonOperator2.GREATER_THAN="GREATER_THAN",CloudWatchAlarmComparisonOperator2.LESS_THAN="LESS_THAN",CloudWatchAlarmComparisonOperator2.LESS_THAN_OR_EQUAL="LESS_THAN_OR_EQUAL"})(CloudWatchAlarmComparisonOperator=EmrCreateCluster2.CloudWatchAlarmComparisonOperator||(EmrCreateCluster2.CloudWatchAlarmComparisonOperator={}));let CloudWatchAlarmStatistic;(function(CloudWatchAlarmStatistic2){CloudWatchAlarmStatistic2.SAMPLE_COUNT="SAMPLE_COUNT",CloudWatchAlarmStatistic2.AVERAGE="AVERAGE",CloudWatchAlarmStatistic2.SUM="SUM",CloudWatchAlarmStatistic2.MINIMUM="MINIMUM",CloudWatchAlarmStatistic2.MAXIMUM="MAXIMUM"})(CloudWatchAlarmStatistic=EmrCreateCluster2.CloudWatchAlarmStatistic||(EmrCreateCluster2.CloudWatchAlarmStatistic={}));let CloudWatchAlarmUnit;(function(CloudWatchAlarmUnit2){CloudWatchAlarmUnit2.NONE="NONE",CloudWatchAlarmUnit2.SECONDS="SECONDS",CloudWatchAlarmUnit2.MICRO_SECONDS="MICRO_SECONDS",CloudWatchAlarmUnit2.MILLI_SECONDS="MILLI_SECONDS",CloudWatchAlarmUnit2.BYTES="BYTES",CloudWatchAlarmUnit2.KILO_BYTES="KILO_BYTES",CloudWatchAlarmUnit2.MEGA_BYTES="MEGA_BYTES",CloudWatchAlarmUnit2.GIGA_BYTES="GIGA_BYTES",CloudWatchAlarmUnit2.TERA_BYTES="TERA_BYTES",CloudWatchAlarmUnit2.BITS="BITS",CloudWatchAlarmUnit2.KILO_BITS="KILO_BITS",CloudWatchAlarmUnit2.MEGA_BITS="MEGA_BITS",CloudWatchAlarmUnit2.GIGA_BITS="GIGA_BITS",CloudWatchAlarmUnit2.TERA_BITS="TERA_BITS",CloudWatchAlarmUnit2.PERCENT="PERCENT",CloudWatchAlarmUnit2.COUNT="COUNT",CloudWatchAlarmUnit2.BYTES_PER_SECOND="BYTES_PER_SECOND",CloudWatchAlarmUnit2.KILO_BYTES_PER_SECOND="KILO_BYTES_PER_SECOND",CloudWatchAlarmUnit2.MEGA_BYTES_PER_SECOND="MEGA_BYTES_PER_SECOND",CloudWatchAlarmUnit2.GIGA_BYTES_PER_SECOND="GIGA_BYTES_PER_SECOND",CloudWatchAlarmUnit2.TERA_BYTES_PER_SECOND="TERA_BYTES_PER_SECOND",CloudWatchAlarmUnit2.BITS_PER_SECOND="BITS_PER_SECOND",CloudWatchAlarmUnit2.KILO_BITS_PER_SECOND="KILO_BITS_PER_SECOND",CloudWatchAlarmUnit2.MEGA_BITS_PER_SECOND="MEGA_BITS_PER_SECOND",CloudWatchAlarmUnit2.GIGA_BITS_PER_SECOND="GIGA_BITS_PER_SECOND",CloudWatchAlarmUnit2.TERA_BITS_PER_SECOND="TERA_BITS_PER_SECOND",CloudWatchAlarmUnit2.COUNT_PER_SECOND="COUNT_PER_SECOND"})(CloudWatchAlarmUnit=EmrCreateCluster2.CloudWatchAlarmUnit||(EmrCreateCluster2.CloudWatchAlarmUnit={}));let InstanceMarket;(function(InstanceMarket2){InstanceMarket2.ON_DEMAND="ON_DEMAND",InstanceMarket2.SPOT="SPOT"})(InstanceMarket=EmrCreateCluster2.InstanceMarket||(EmrCreateCluster2.InstanceMarket={}));let ScalingAdjustmentType;(function(ScalingAdjustmentType2){ScalingAdjustmentType2.CHANGE_IN_CAPACITY="CHANGE_IN_CAPACITY",ScalingAdjustmentType2.PERCENT_CHANGE_IN_CAPACITY="PERCENT_CHANGE_IN_CAPACITY",ScalingAdjustmentType2.EXACT_CAPACITY="EXACT_CAPACITY"})(ScalingAdjustmentType=EmrCreateCluster2.ScalingAdjustmentType||(EmrCreateCluster2.ScalingAdjustmentType={}))}(EmrCreateCluster||(exports.EmrCreateCluster=EmrCreateCluster={}));
