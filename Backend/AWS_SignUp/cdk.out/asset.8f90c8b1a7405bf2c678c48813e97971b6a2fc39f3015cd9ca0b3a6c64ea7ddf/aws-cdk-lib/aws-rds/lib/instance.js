"use strict";var _a,_b,_c,_d;Object.defineProperty(exports,"__esModule",{value:!0}),exports.DatabaseInstanceReadReplica=exports.DatabaseInstanceFromSnapshot=exports.DatabaseInstance=exports.NetworkType=exports.StorageType=exports.LicenseModel=exports.DatabaseInstanceBase=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var database_secret_1=()=>{var tmp=require("./database-secret");return database_secret_1=()=>tmp,tmp},endpoint_1=()=>{var tmp=require("./endpoint");return endpoint_1=()=>tmp,tmp},parameter_group_1=()=>{var tmp=require("./parameter-group");return parameter_group_1=()=>tmp,tmp},util_1=()=>{var tmp=require("./private/util");return util_1=()=>tmp,tmp},props_1=()=>{var tmp=require("./props");return props_1=()=>tmp,tmp},proxy_1=()=>{var tmp=require("./proxy");return proxy_1=()=>tmp,tmp},rds_generated_1=()=>{var tmp=require("./rds.generated");return rds_generated_1=()=>tmp,tmp},subnet_group_1=()=>{var tmp=require("./subnet-group");return subnet_group_1=()=>tmp,tmp},ec2=()=>{var tmp=require("../../aws-ec2");return ec2=()=>tmp,tmp},events=()=>{var tmp=require("../../aws-events");return events=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp},logs=()=>{var tmp=require("../../aws-logs");return logs=()=>tmp,tmp},secretsmanager=()=>{var tmp=require("../../aws-secretsmanager");return secretsmanager=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},cxapi=()=>{var tmp=require("../../cx-api");return cxapi=()=>tmp,tmp};class DatabaseInstanceBase extends core_1().Resource{static fromDatabaseInstanceAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseInstanceAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromDatabaseInstanceAttributes),error}class Import extends DatabaseInstanceBase{constructor(){super(...arguments),this.defaultPort=ec2().Port.tcp(attrs.port),this.connections=new(ec2()).Connections({securityGroups:attrs.securityGroups,defaultPort:this.defaultPort}),this.instanceIdentifier=attrs.instanceIdentifier,this.dbInstanceEndpointAddress=attrs.instanceEndpointAddress,this.dbInstanceEndpointPort=core_1().Tokenization.stringifyNumber(attrs.port),this.instanceEndpoint=new(endpoint_1()).Endpoint(attrs.instanceEndpointAddress,attrs.port),this.engine=attrs.engine,this.enableIamAuthentication=!0,this.instanceResourceId=attrs.instanceResourceId}}return new Import(scope,id)}addProxy(id,options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseProxyOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addProxy),error}return new(proxy_1()).DatabaseProxy(this,id,{proxyTarget:proxy_1().ProxyTarget.fromInstance(this),...options})}grantConnect(grantee,dbUser){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IGrantable(grantee)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.grantConnect),error}if(this.enableIamAuthentication===!1)throw new Error("Cannot grant connect when IAM authentication is disabled");if(!this.instanceResourceId)throw new Error("For imported Database Instances, instanceResourceId is required to grantConnect()");if(!dbUser)throw new Error("For imported Database Instances, the dbUser is required to grantConnect()");return this.enableIamAuthentication=!0,iam().Grant.addToPrincipal({grantee,actions:["rds-db:connect"],resourceArns:[core_1().Stack.of(this).formatArn({arnFormat:core_1().ArnFormat.COLON_RESOURCE_NAME,service:"rds-db",resource:"dbuser",resourceName:[this.instanceResourceId,dbUser].join("/")})]})}onEvent(id,options={}){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_events_OnEventOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.onEvent),error}const rule=new(events()).Rule(this,id,options);return rule.addEventPattern({source:["aws.rds"],resources:[this.instanceArn]}),rule.addTarget(options.target),rule}get instanceArn(){const commonAnComponents={service:"rds",resource:"db",arnFormat:core_1().ArnFormat.COLON_RESOURCE_NAME},localArn=core_1().Stack.of(this).formatArn({...commonAnComponents,resourceName:this.instanceIdentifier});return this.getResourceArnAttribute(localArn,{...commonAnComponents,resourceName:this.physicalName})}asSecretAttachmentTarget(){return{targetId:this.instanceIdentifier,targetType:secretsmanager().AttachmentTargetType.RDS_DB_INSTANCE}}}exports.DatabaseInstanceBase=DatabaseInstanceBase,_a=JSII_RTTI_SYMBOL_1,DatabaseInstanceBase[_a]={fqn:"aws-cdk-lib.aws_rds.DatabaseInstanceBase",version:"2.175.1"};var LicenseModel;(function(LicenseModel2){LicenseModel2.LICENSE_INCLUDED="license-included",LicenseModel2.BRING_YOUR_OWN_LICENSE="bring-your-own-license",LicenseModel2.GENERAL_PUBLIC_LICENSE="general-public-license"})(LicenseModel||(exports.LicenseModel=LicenseModel={}));var StorageType;(function(StorageType2){StorageType2.STANDARD="standard",StorageType2.GP2="gp2",StorageType2.GP3="gp3",StorageType2.IO1="io1",StorageType2.IO2="io2"})(StorageType||(exports.StorageType=StorageType={}));var NetworkType;(function(NetworkType2){NetworkType2.IPV4="IPV4",NetworkType2.DUAL="DUAL"})(NetworkType||(exports.NetworkType=NetworkType={}));class DatabaseInstanceNew extends DatabaseInstanceBase{constructor(scope,id,props){const instancePhysicalName=core_1().Token.isUnresolved(props.instanceIdentifier)?props.instanceIdentifier:props.instanceIdentifier?.toLowerCase();if(super(scope,id,{physicalName:instancePhysicalName}),this.vpc=props.vpc,props.vpcSubnets&&props.vpcPlacement)throw new Error("Only one of `vpcSubnets` or `vpcPlacement` can be specified");if(this.vpcPlacement=props.vpcSubnets??props.vpcPlacement,props.multiAz===!0&&props.availabilityZone)throw new Error("Requesting a specific availability zone is not valid for Multi-AZ instances");const subnetGroup=props.subnetGroup??new(subnet_group_1()).SubnetGroup(this,"SubnetGroup",{description:`Subnet group for ${this.node.id} database`,vpc:this.vpc,vpcSubnets:this.vpcPlacement,removalPolicy:(0,util_1().renderUnless)((0,util_1().helperRemovalPolicy)(props.removalPolicy),core_1().RemovalPolicy.DESTROY)}),securityGroups=props.securityGroups||[new(ec2()).SecurityGroup(this,"SecurityGroup",{description:`Security group for ${this.node.id} database`,vpc:props.vpc})];this.connections=new(ec2()).Connections({securityGroups,defaultPort:ec2().Port.tcp(core_1().Lazy.number({produce:()=>this.instanceEndpoint.port}))});let monitoringRole;props.monitoringInterval&&props.monitoringInterval.toSeconds()&&(monitoringRole=props.monitoringRole||new(iam()).Role(this,"MonitoringRole",{assumedBy:new(iam()).ServicePrincipal("monitoring.rds.amazonaws.com"),managedPolicies:[iam().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonRDSEnhancedMonitoringRole")]}));const storageType=props.storageType??StorageType.GP2,iops=defaultIops(storageType,props.iops);if(props.storageThroughput&&storageType!==StorageType.GP3)throw new Error(`The storage throughput can only be specified with GP3 storage type. Got ${storageType}.`);if(storageType===StorageType.GP3&&props.storageThroughput&&iops&&!core_1().Token.isUnresolved(props.storageThroughput)&&!core_1().Token.isUnresolved(iops)&&props.storageThroughput/iops>.25)throw new Error(`The maximum ratio of storage throughput to IOPS is 0.25. Got ${props.storageThroughput/iops}.`);this.cloudwatchLogGroups={},this.cloudwatchLogsExports=props.cloudwatchLogsExports,this.cloudwatchLogsRetention=props.cloudwatchLogsRetention,this.cloudwatchLogsRetentionRole=props.cloudwatchLogsRetentionRole,this.enableIamAuthentication=props.iamAuthentication;const enablePerformanceInsights=props.enablePerformanceInsights||props.performanceInsightRetention!==void 0||props.performanceInsightEncryptionKey!==void 0;if(enablePerformanceInsights&&props.enablePerformanceInsights===!1)throw new Error("`enablePerformanceInsights` disabled, but `performanceInsightRetention` or `performanceInsightEncryptionKey` was set");props.domain&&(this.domainId=props.domain,this.domainRole=props.domainRole||new(iam()).Role(this,"RDSDirectoryServiceRole",{assumedBy:new(iam()).CompositePrincipal(new(iam()).ServicePrincipal("rds.amazonaws.com"),new(iam()).ServicePrincipal("directoryservice.rds.amazonaws.com")),managedPolicies:[iam().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonRDSDirectoryServiceAccess")]}));const maybeLowercasedInstanceId=core_1().FeatureFlags.of(this).isEnabled(cxapi().RDS_LOWERCASE_DB_IDENTIFIER)&&!core_1().Token.isUnresolved(props.instanceIdentifier)?props.instanceIdentifier?.toLowerCase():props.instanceIdentifier,instanceParameterGroupConfig=props.parameterGroup?.bindToInstance({}),isInPublicSubnet=this.vpcPlacement&&this.vpcPlacement.subnetType===ec2().SubnetType.PUBLIC;this.newCfnProps={autoMinorVersionUpgrade:props.autoMinorVersionUpgrade,availabilityZone:props.multiAz?void 0:props.availabilityZone,backupRetentionPeriod:props.backupRetention?.toDays(),copyTagsToSnapshot:props.copyTagsToSnapshot??!0,dbInstanceClass:core_1().Lazy.string({produce:()=>`db.${this.instanceType}`}),dbInstanceIdentifier:core_1().Token.isUnresolved(props.instanceIdentifier)?this.physicalName:maybeLowercasedInstanceId,dbSubnetGroupName:subnetGroup.subnetGroupName,deleteAutomatedBackups:props.deleteAutomatedBackups,deletionProtection:(0,util_1().defaultDeletionProtection)(props.deletionProtection,props.removalPolicy),enableCloudwatchLogsExports:this.cloudwatchLogsExports,enableIamDatabaseAuthentication:core_1().Lazy.any({produce:()=>this.enableIamAuthentication}),enablePerformanceInsights:enablePerformanceInsights||props.enablePerformanceInsights,iops,monitoringInterval:props.monitoringInterval?.toSeconds(),monitoringRoleArn:monitoringRole?.roleArn,multiAz:props.multiAz,dbParameterGroupName:instanceParameterGroupConfig?.parameterGroupName,optionGroupName:props.optionGroup?.optionGroupName,performanceInsightsKmsKeyId:props.performanceInsightEncryptionKey?.keyArn,performanceInsightsRetentionPeriod:enablePerformanceInsights?props.performanceInsightRetention||props_1().PerformanceInsightRetention.DEFAULT:void 0,port:props.port!==void 0?core_1().Tokenization.stringifyNumber(props.port):void 0,preferredBackupWindow:props.preferredBackupWindow,preferredMaintenanceWindow:props.preferredMaintenanceWindow,processorFeatures:props.processorFeatures&&renderProcessorFeatures(props.processorFeatures),publiclyAccessible:props.publiclyAccessible??isInPublicSubnet,storageType,storageThroughput:props.storageThroughput,vpcSecurityGroups:securityGroups.map(s=>s.securityGroupId),maxAllocatedStorage:props.maxAllocatedStorage,domain:this.domainId,domainIamRoleName:this.domainRole?.roleName,networkType:props.networkType,caCertificateIdentifier:props.caCertificate?props.caCertificate.toString():void 0}}setLogRetention(){if(this.cloudwatchLogsExports&&this.cloudwatchLogsRetention)for(const log of this.cloudwatchLogsExports){const logGroupName=`/aws/rds/instance/${this.instanceIdentifier}/${log}`;new(logs()).LogRetention(this,`LogRetention${log}`,{logGroupName,retention:this.cloudwatchLogsRetention,role:this.cloudwatchLogsRetentionRole}),this.cloudwatchLogGroups[log]=logs().LogGroup.fromLogGroupName(this,`LogGroup${this.instanceIdentifier}${log}`,logGroupName)}}}class DatabaseInstanceSource extends DatabaseInstanceNew{constructor(scope,id,props){super(scope,id,props),this.singleUserRotationApplication=props.engine.singleUserRotationApplication,this.multiUserRotationApplication=props.engine.multiUserRotationApplication,this.engine=props.engine;const engineType=props.engine.engineType,combineRoles=engineType.startsWith("oracle-")||engineType.startsWith("sqlserver-");let{s3ImportRole,s3ExportRole}=(0,util_1().setupS3ImportExport)(this,props,combineRoles);const engineConfig=props.engine.bindToInstance(this,{...props,s3ImportRole,s3ExportRole}),instanceAssociatedRoles=[],engineFeatures=engineConfig.features;if(s3ImportRole){if(!engineFeatures?.s3Import)throw new Error(`Engine '${(0,util_1().engineDescription)(props.engine)}' does not support S3 import`);instanceAssociatedRoles.push({roleArn:s3ImportRole.roleArn,featureName:engineFeatures?.s3Import})}if(s3ExportRole){if(!engineFeatures?.s3Export)throw new Error(`Engine '${(0,util_1().engineDescription)(props.engine)}' does not support S3 export`);engineFeatures.s3Import!==engineFeatures?.s3Export&&instanceAssociatedRoles.push({roleArn:s3ExportRole.roleArn,featureName:engineFeatures?.s3Export})}if(this.instanceType=props.instanceType??ec2().InstanceType.of(ec2().InstanceClass.M5,ec2().InstanceSize.LARGE),props.parameterGroup&&props.parameters)throw new Error("You cannot specify both parameterGroup and parameters");const dbParameterGroupName=props.parameters?new(parameter_group_1()).ParameterGroup(this,"ParameterGroup",{engine:props.engine,parameters:props.parameters}).bindToInstance({}).parameterGroupName:this.newCfnProps.dbParameterGroupName;this.sourceCfnProps={...this.newCfnProps,associatedRoles:instanceAssociatedRoles.length>0?instanceAssociatedRoles:void 0,optionGroupName:engineConfig.optionGroup?.optionGroupName,allocatedStorage:props.allocatedStorage?.toString()??"100",allowMajorVersionUpgrade:props.allowMajorVersionUpgrade,dbName:props.databaseName,engine:engineType,engineVersion:props.engine.engineVersion?.fullVersion,licenseModel:props.licenseModel,timezone:props.timezone,dbParameterGroupName}}addRotationSingleUser(options={}){if(!this.secret)throw new Error("Cannot add single user rotation for an instance without secret.");const id="RotationSingleUser";if(this.node.tryFindChild(id))throw new Error("A single user rotation was already added to this instance.");return new(secretsmanager()).SecretRotation(this,id,{...(0,util_1().applyDefaultRotationOptions)(options,this.vpcPlacement),secret:this.secret,application:this.singleUserRotationApplication,vpc:this.vpc,target:this})}addRotationMultiUser(id,options){if(!this.secret)throw new Error("Cannot add multi user rotation for an instance without secret.");return new(secretsmanager()).SecretRotation(this,id,{...(0,util_1().applyDefaultRotationOptions)(options,this.vpcPlacement),secret:options.secret,masterSecret:this.secret,application:this.multiUserRotationApplication,vpc:this.vpc,target:this})}grantConnect(grantee,dbUser){if(!dbUser){if(!this.secret)throw new Error("A secret or dbUser is required to grantConnect()");dbUser=this.secret.secretValueFromJson("username").unsafeUnwrap()}return super.grantConnect(grantee,dbUser)}}class DatabaseInstance extends DatabaseInstanceSource{constructor(scope,id,props){super(scope,id,props);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseInstanceProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DatabaseInstance),error}const credentials=(0,util_1().renderCredentials)(this,props.engine,props.credentials),secret=credentials.secret,instance=new(rds_generated_1()).CfnDBInstance(this,"Resource",{...this.sourceCfnProps,characterSetName:props.characterSetName,kmsKeyId:props.storageEncryptionKey&&props.storageEncryptionKey.keyArn,masterUsername:credentials.username,masterUserPassword:credentials.password?.unsafeUnwrap(),storageEncrypted:props.storageEncryptionKey?!0:props.storageEncrypted});this.instanceIdentifier=this.getResourceNameAttribute(instance.ref),this.dbInstanceEndpointAddress=instance.attrEndpointAddress,this.dbInstanceEndpointPort=instance.attrEndpointPort,this.instanceResourceId=instance.attrDbiResourceId;const portAttribute=core_1().Token.asNumber(instance.attrEndpointPort);this.instanceEndpoint=new(endpoint_1()).Endpoint(instance.attrEndpointAddress,portAttribute),instance.applyRemovalPolicy(props.removalPolicy??core_1().RemovalPolicy.SNAPSHOT),secret&&(this.secret=secret.attach(this)),this.setLogRetention()}}exports.DatabaseInstance=DatabaseInstance,_b=JSII_RTTI_SYMBOL_1,DatabaseInstance[_b]={fqn:"aws-cdk-lib.aws_rds.DatabaseInstance",version:"2.175.1"};class DatabaseInstanceFromSnapshot extends DatabaseInstanceSource{constructor(scope,id,props){super(scope,id,props);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseInstanceFromSnapshotProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DatabaseInstanceFromSnapshot),error}let credentials=props.credentials,secret=credentials?.secret;if(!secret&&credentials?.generatePassword){if(!credentials.username)throw new Error("`credentials` `username` must be specified when `generatePassword` is set to true");secret=new(database_secret_1()).DatabaseSecret(this,"Secret",{username:credentials.username,encryptionKey:credentials.encryptionKey,excludeCharacters:credentials.excludeCharacters,replaceOnPasswordCriteriaChanges:credentials.replaceOnPasswordCriteriaChanges,replicaRegions:credentials.replicaRegions})}const instance=new(rds_generated_1()).CfnDBInstance(this,"Resource",{...this.sourceCfnProps,dbSnapshotIdentifier:props.snapshotIdentifier,masterUserPassword:secret?.secretValueFromJson("password")?.unsafeUnwrap()??credentials?.password?.unsafeUnwrap()});this.instanceIdentifier=instance.ref,this.dbInstanceEndpointAddress=instance.attrEndpointAddress,this.dbInstanceEndpointPort=instance.attrEndpointPort,this.instanceResourceId=instance.attrDbiResourceId;const portAttribute=core_1().Token.asNumber(instance.attrEndpointPort);this.instanceEndpoint=new(endpoint_1()).Endpoint(instance.attrEndpointAddress,portAttribute),instance.applyRemovalPolicy(props.removalPolicy??core_1().RemovalPolicy.SNAPSHOT),secret&&(this.secret=secret.attach(this)),this.setLogRetention()}}exports.DatabaseInstanceFromSnapshot=DatabaseInstanceFromSnapshot,_c=JSII_RTTI_SYMBOL_1,DatabaseInstanceFromSnapshot[_c]={fqn:"aws-cdk-lib.aws_rds.DatabaseInstanceFromSnapshot",version:"2.175.1"};class DatabaseInstanceReadReplica extends DatabaseInstanceNew{constructor(scope,id,props){super(scope,id,props),this.engine=void 0;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseInstanceReadReplicaProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DatabaseInstanceReadReplica),error}if(props.sourceDatabaseInstance.engine&&!props.sourceDatabaseInstance.engine.supportsReadReplicaBackups&&props.backupRetention)throw new Error(`Cannot set 'backupRetention', as engine '${(0,util_1().engineDescription)(props.sourceDatabaseInstance.engine)}' does not support automatic backups for read replicas`);const shouldPassEngine=props.domain!=null,instance=new(rds_generated_1()).CfnDBInstance(this,"Resource",{...this.newCfnProps,sourceDbInstanceIdentifier:props.sourceDatabaseInstance.instanceArn,kmsKeyId:props.storageEncryptionKey?.keyArn,storageEncrypted:props.storageEncryptionKey?!0:props.storageEncrypted,engine:shouldPassEngine?props.sourceDatabaseInstance.engine?.engineType:void 0,allocatedStorage:props.allocatedStorage?.toString()});this.instanceType=props.instanceType,this.instanceIdentifier=instance.ref,this.dbInstanceEndpointAddress=instance.attrEndpointAddress,this.dbInstanceEndpointPort=instance.attrEndpointPort,this.instanceResourceId=core_1().FeatureFlags.of(this).isEnabled(cxapi().USE_CORRECT_VALUE_FOR_INSTANCE_RESOURCE_ID_PROPERTY)?instance.attrDbiResourceId:instance.attrDbInstanceArn;const portAttribute=core_1().Token.asNumber(instance.attrEndpointPort);this.instanceEndpoint=new(endpoint_1()).Endpoint(instance.attrEndpointAddress,portAttribute),instance.applyRemovalPolicy(props.removalPolicy??core_1().RemovalPolicy.SNAPSHOT),this.setLogRetention()}}exports.DatabaseInstanceReadReplica=DatabaseInstanceReadReplica,_d=JSII_RTTI_SYMBOL_1,DatabaseInstanceReadReplica[_d]={fqn:"aws-cdk-lib.aws_rds.DatabaseInstanceReadReplica",version:"2.175.1"};function renderProcessorFeatures(features){const featuresList=Object.entries(features).map(([name,value])=>({name,value:value.toString()}));return featuresList.length===0?void 0:featuresList}function defaultIops(storageType,iops){switch(storageType){case StorageType.STANDARD:case StorageType.GP2:return;case StorageType.GP3:return iops;case StorageType.IO1:case StorageType.IO2:return iops??1e3}}
