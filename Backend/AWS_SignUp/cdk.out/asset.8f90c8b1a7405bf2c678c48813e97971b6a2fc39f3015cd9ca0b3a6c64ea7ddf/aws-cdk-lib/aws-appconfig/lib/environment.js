"use strict";var _a,_b;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Monitor=exports.MonitorType=exports.Environment=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var appconfig_generated_1=()=>{var tmp=require("./appconfig.generated");return appconfig_generated_1=()=>tmp,tmp},extension_1=()=>{var tmp=require("./extension");return extension_1=()=>tmp,tmp},hash_1=()=>{var tmp=require("./private/hash");return hash_1=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class EnvironmentBase extends core_1().Resource{constructor(){super(...arguments),this.deploymentQueue=[]}addDeployment(configuration){if(this.name===void 0)throw new Error("Environment name must be known to add a Deployment");const queueSize=this.deploymentQueue.push(new(appconfig_generated_1()).CfnDeployment(configuration,`Deployment${(0,hash_1().getHash)(this.name)}`,{applicationId:configuration.application.applicationId,configurationProfileId:configuration.configurationProfileId,deploymentStrategyId:configuration.deploymentStrategy.deploymentStrategyId,environmentId:this.environmentId,configurationVersion:configuration.versionNumber,description:configuration.description,kmsKeyIdentifier:configuration.deploymentKey?.keyArn}));queueSize>1&&this.deploymentQueue[queueSize-1].addDependency(this.deploymentQueue[queueSize-2])}addDeployments(...configurations){configurations.forEach(config=>this.addDeployment(config))}on(actionPoint,eventDestination,options){this.extensible.on(actionPoint,eventDestination,options)}preCreateHostedConfigurationVersion(eventDestination,options){this.extensible.preCreateHostedConfigurationVersion(eventDestination,options)}preStartDeployment(eventDestination,options){this.extensible.preStartDeployment(eventDestination,options)}onDeploymentStart(eventDestination,options){this.extensible.onDeploymentStart(eventDestination,options)}onDeploymentStep(eventDestination,options){this.extensible.onDeploymentStep(eventDestination,options)}onDeploymentBaking(eventDestination,options){this.extensible.onDeploymentBaking(eventDestination,options)}onDeploymentComplete(eventDestination,options){this.extensible.onDeploymentComplete(eventDestination,options)}onDeploymentRolledBack(eventDestination,options){this.extensible.onDeploymentRolledBack(eventDestination,options)}atDeploymentTick(eventDestination,options){this.extensible.atDeploymentTick(eventDestination,options)}addExtension(extension){this.extensible.addExtension(extension)}grant(grantee,...actions){return iam().Grant.addToPrincipal({grantee,actions,resourceArns:[this.environmentArn]})}grantReadConfig(identity){return iam().Grant.addToPrincipal({grantee:identity,actions:["appconfig:GetLatestConfiguration","appconfig:StartConfigurationSession"],resourceArns:[`${this.environmentArn}/configuration/*`]})}}class Environment extends EnvironmentBase{static fromEnvironmentArn(scope,id,environmentArn){const parsedArn=core_1().Stack.of(scope).splitArn(environmentArn,core_1().ArnFormat.SLASH_RESOURCE_NAME);if(!parsedArn.resourceName)throw new Error(`Missing required /$/{applicationId}/environment//$/{environmentId} from environment ARN: ${parsedArn.resourceName}`);const resourceName=parsedArn.resourceName.split("/");if(resourceName.length!=3||!resourceName[0]||!resourceName[2])throw new Error("Missing required parameters for environment ARN: format should be /$/{applicationId}/environment//$/{environmentId}");const applicationId=resourceName[0],environmentId=resourceName[2];class Import extends EnvironmentBase{constructor(){super(...arguments),this.applicationId=applicationId,this.environmentId=environmentId,this.environmentArn=environmentArn}}return new Import(scope,id,{environmentFromArn:environmentArn})}static fromEnvironmentAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_appconfig_EnvironmentAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromEnvironmentAttributes),error}const applicationId=attrs.application.applicationId,environmentId=attrs.environmentId,environmentArn=core_1().Stack.of(scope).formatArn({service:"appconfig",resource:"application",resourceName:`${applicationId}/environment/${environmentId}`});class Import extends EnvironmentBase{constructor(){super(...arguments),this.application=attrs.application,this.applicationId=attrs.application.applicationId,this.name=attrs.name,this.environmentId=environmentId,this.environmentArn=environmentArn,this.description=attrs.description,this.monitors=attrs.monitors}}return new Import(scope,id,{environmentFromArn:environmentArn})}constructor(scope,id,props){super(scope,id,{physicalName:props.environmentName});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_appconfig_EnvironmentProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,Environment),error}this.name=props.environmentName||core_1().Names.uniqueResourceName(this,{maxLength:64,separator:"-"}),this.application=props.application,this.applicationId=this.application.applicationId,this.description=props.description,this.monitors=props.monitors;const resource=new(appconfig_generated_1()).CfnEnvironment(this,"Resource",{applicationId:this.applicationId,name:this.name,description:this.description,monitors:this.monitors?.map(monitor=>({alarmArn:monitor.alarmArn,...monitor.monitorType===MonitorType.CLOUDWATCH?{alarmRoleArn:monitor.alarmRoleArn||this.createOrGetAlarmRole().roleArn}:{alarmRoleArn:monitor.alarmRoleArn}}))});this._cfnEnvironment=resource,this.environmentId=this._cfnEnvironment.ref,this.environmentArn=this.stack.formatArn({service:"appconfig",resource:"application",resourceName:`${this.applicationId}/environment/${this.environmentId}`}),this.extensible=new(extension_1()).ExtensibleBase(this,this.environmentArn,this.name),this.application.addExistingEnvironment(this)}createOrGetAlarmRole(){const logicalId=`Role${(0,hash_1().getHash)(this.name)}`,existingRole=this.node.tryFindChild(logicalId);if(existingRole)return existingRole;const policy=new(iam()).PolicyStatement({effect:iam().Effect.ALLOW,actions:["cloudwatch:DescribeAlarms"],resources:["*"]}),document=new(iam()).PolicyDocument({statements:[policy]});return new(iam()).Role(this,logicalId,{roleName:core_1().PhysicalName.GENERATE_IF_NEEDED,assumedBy:new(iam()).ServicePrincipal("appconfig.amazonaws.com"),inlinePolicies:{AllowAppConfigMonitorAlarmPolicy:document}})}}exports.Environment=Environment,_a=JSII_RTTI_SYMBOL_1,Environment[_a]={fqn:"aws-cdk-lib.aws_appconfig.Environment",version:"2.175.1"};var MonitorType;(function(MonitorType2){MonitorType2[MonitorType2.CLOUDWATCH=0]="CLOUDWATCH",MonitorType2[MonitorType2.CFN_MONITORS_PROPERTY=1]="CFN_MONITORS_PROPERTY"})(MonitorType||(exports.MonitorType=MonitorType={}));class Monitor{static fromCloudWatchAlarm(alarm,alarmRole){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudwatch_IAlarm(alarm),jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IRole(alarmRole)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromCloudWatchAlarm),error}return{alarmArn:alarm.alarmArn,alarmRoleArn:alarmRole?.roleArn,monitorType:MonitorType.CLOUDWATCH}}static fromCfnMonitorsProperty(monitorsProperty){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_appconfig_CfnEnvironment_MonitorsProperty(monitorsProperty)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromCfnMonitorsProperty),error}if(monitorsProperty.alarmArn===void 0)throw new Error('You must specify an alarmArn property to use "fromCfnMonitorsProperty".');return{alarmArn:monitorsProperty.alarmArn,alarmRoleArn:monitorsProperty.alarmRoleArn,monitorType:MonitorType.CFN_MONITORS_PROPERTY}}}exports.Monitor=Monitor,_b=JSII_RTTI_SYMBOL_1,Monitor[_b]={fqn:"aws-cdk-lib.aws_appconfig.Monitor",version:"2.175.1"};
