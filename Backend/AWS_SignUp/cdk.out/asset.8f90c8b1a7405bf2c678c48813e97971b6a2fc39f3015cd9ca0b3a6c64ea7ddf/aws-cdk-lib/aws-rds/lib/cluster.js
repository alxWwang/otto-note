"use strict";var _a,_b,_c;Object.defineProperty(exports,"__esModule",{value:!0}),exports.DatabaseClusterFromSnapshot=exports.DatabaseCluster=exports.DatabaseClusterBase=exports.ClusterScailabilityType=exports.InstanceUpdateBehaviour=exports.DBClusterStorageType=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var aurora_cluster_instance_1=()=>{var tmp=require("./aurora-cluster-instance");return aurora_cluster_instance_1=()=>tmp,tmp},endpoint_1=()=>{var tmp=require("./endpoint");return endpoint_1=()=>tmp,tmp},parameter_group_1=()=>{var tmp=require("./parameter-group");return parameter_group_1=()=>tmp,tmp},perms_1=()=>{var tmp=require("./perms");return perms_1=()=>tmp,tmp},util_1=()=>{var tmp=require("./private/util");return util_1=()=>tmp,tmp},props_1=()=>{var tmp=require("./props");return props_1=()=>tmp,tmp},proxy_1=()=>{var tmp=require("./proxy");return proxy_1=()=>tmp,tmp},rds_generated_1=()=>{var tmp=require("./rds.generated");return rds_generated_1=()=>tmp,tmp},subnet_group_1=()=>{var tmp=require("./subnet-group");return subnet_group_1=()=>tmp,tmp},ec2=()=>{var tmp=require("../../aws-ec2");return ec2=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp},aws_iam_1=()=>{var tmp=require("../../aws-iam");return aws_iam_1=()=>tmp,tmp},logs=()=>{var tmp=require("../../aws-logs");return logs=()=>tmp,tmp},secretsmanager=()=>{var tmp=require("../../aws-secretsmanager");return secretsmanager=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},cxapi=()=>{var tmp=require("../../cx-api");return cxapi=()=>tmp,tmp},DBClusterStorageType;(function(DBClusterStorageType2){DBClusterStorageType2.AURORA="aurora",DBClusterStorageType2.AURORA_IOPT1="aurora-iopt1"})(DBClusterStorageType||(exports.DBClusterStorageType=DBClusterStorageType={}));var InstanceUpdateBehaviour;(function(InstanceUpdateBehaviour2){InstanceUpdateBehaviour2.BULK="BULK",InstanceUpdateBehaviour2.ROLLING="ROLLING"})(InstanceUpdateBehaviour||(exports.InstanceUpdateBehaviour=InstanceUpdateBehaviour={}));var ClusterScailabilityType;(function(ClusterScailabilityType2){ClusterScailabilityType2.STANDARD="standard",ClusterScailabilityType2.LIMITLESS="limitless"})(ClusterScailabilityType||(exports.ClusterScailabilityType=ClusterScailabilityType={}));class DatabaseClusterBase extends core_1().Resource{get clusterArn(){return core_1().Stack.of(this).formatArn({service:"rds",resource:"cluster",arnFormat:core_1().ArnFormat.COLON_RESOURCE_NAME,resourceName:this.clusterIdentifier})}addProxy(id,options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseProxyOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addProxy),error}return new(proxy_1()).DatabaseProxy(this,id,{proxyTarget:proxy_1().ProxyTarget.fromCluster(this),...options})}asSecretAttachmentTarget(){return{targetId:this.clusterIdentifier,targetType:secretsmanager().AttachmentTargetType.RDS_DB_CLUSTER}}grantConnect(grantee,dbUser){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IGrantable(grantee)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.grantConnect),error}return iam().Grant.addToPrincipal({actions:["rds-db:connect"],grantee,resourceArns:[core_1().Stack.of(this).formatArn({service:"rds-db",resource:"dbuser",resourceName:`${this.clusterResourceIdentifier}/${dbUser}`,arnFormat:core_1().ArnFormat.COLON_RESOURCE_NAME})]})}grantDataApiAccess(grantee){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IGrantable(grantee)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.grantDataApiAccess),error}if(this.enableDataApi===!1)throw new Error("Cannot grant Data API access when the Data API is disabled");this.enableDataApi=!0;const ret=iam().Grant.addToPrincipal({grantee,actions:perms_1().DATA_API_ACTIONS,resourceArns:[this.clusterArn],scope:this});return this.secret?.grantRead(grantee),ret}}exports.DatabaseClusterBase=DatabaseClusterBase,_a=JSII_RTTI_SYMBOL_1,DatabaseClusterBase[_a]={fqn:"aws-cdk-lib.aws_rds.DatabaseClusterBase",version:"2.175.1"};class DatabaseClusterNew extends DatabaseClusterBase{constructor(scope,id,props){if(super(scope,id),props.vpc&&props.instanceProps?.vpc||!props.vpc&&!props.instanceProps?.vpc)throw new Error("Provide either vpc or instanceProps.vpc, but not both");if(props.vpcSubnets&&props.instanceProps?.vpcSubnets)throw new Error("Provide either vpcSubnets or instanceProps.vpcSubnets, but not both");this.vpc=props.instanceProps?.vpc??props.vpc,this.vpcSubnets=props.instanceProps?.vpcSubnets??props.vpcSubnets,this.cloudwatchLogGroups={},this.singleUserRotationApplication=props.engine.singleUserRotationApplication,this.multiUserRotationApplication=props.engine.multiUserRotationApplication,this.serverlessV2MaxCapacity=props.serverlessV2MaxCapacity??2,this.serverlessV2MinCapacity=props.serverlessV2MinCapacity??.5,this.validateServerlessScalingConfig(),this.enableDataApi=props.enableDataApi;const{subnetIds}=this.vpc.selectSubnets(this.vpcSubnets);subnetIds.length<2&&core_1().Annotations.of(this).addError(`Cluster requires at least 2 subnets, got ${subnetIds.length}`),this.subnetGroup=props.subnetGroup??new(subnet_group_1()).SubnetGroup(this,"Subnets",{description:`Subnets for ${id} database`,vpc:this.vpc,vpcSubnets:this.vpcSubnets,removalPolicy:(0,util_1().renderUnless)((0,util_1().helperRemovalPolicy)(props.removalPolicy),core_1().RemovalPolicy.DESTROY)}),this.securityGroups=props.instanceProps?.securityGroups??props.securityGroups??[new(ec2()).SecurityGroup(this,"SecurityGroup",{description:"RDS security group",vpc:this.vpc})];const combineRoles=props.engine.combineImportAndExportRoles??!1;let{s3ImportRole,s3ExportRole}=(0,util_1().setupS3ImportExport)(this,props,combineRoles);if(props.parameterGroup&&props.parameters)throw new Error("You cannot specify both parameterGroup and parameters");const parameterGroup=props.parameterGroup??(props.parameters?new(parameter_group_1()).ParameterGroup(this,"ParameterGroup",{engine:props.engine,parameters:props.parameters}):void 0),clusterEngineBindConfig=props.engine.bindToCluster(this,{s3ImportRole,s3ExportRole,parameterGroup}),clusterAssociatedRoles=[];s3ImportRole&&clusterAssociatedRoles.push({roleArn:s3ImportRole.roleArn,featureName:clusterEngineBindConfig.features?.s3Import}),s3ExportRole&&(s3ExportRole!==s3ImportRole||clusterEngineBindConfig.features?.s3Import!==clusterEngineBindConfig.features?.s3Export)&&clusterAssociatedRoles.push({roleArn:s3ExportRole.roleArn,featureName:clusterEngineBindConfig.features?.s3Export});const clusterParameterGroupConfig=(props.parameterGroup??clusterEngineBindConfig.parameterGroup)?.bindToCluster({});this.engine=props.engine;const clusterIdentifier=core_1().FeatureFlags.of(this).isEnabled(cxapi().RDS_LOWERCASE_DB_IDENTIFIER)&&!core_1().Token.isUnresolved(props.clusterIdentifier)?props.clusterIdentifier?.toLowerCase():props.clusterIdentifier;props.domain&&(this.domainId=props.domain,this.domainRole=props.domainRole??new(iam()).Role(this,"RDSClusterDirectoryServiceRole",{assumedBy:new(iam()).CompositePrincipal(new(iam()).ServicePrincipal("rds.amazonaws.com"),new(iam()).ServicePrincipal("directoryservice.rds.amazonaws.com")),managedPolicies:[iam().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonRDSDirectoryServiceAccess")]}));const enablePerformanceInsights=props.enablePerformanceInsights||props.performanceInsightRetention!==void 0||props.performanceInsightEncryptionKey!==void 0;if(enablePerformanceInsights&&props.enablePerformanceInsights===!1)throw new Error("`enablePerformanceInsights` disabled, but `performanceInsightRetention` or `performanceInsightEncryptionKey` was set");if(props.clusterScailabilityType===ClusterScailabilityType.LIMITLESS){if(!props.enablePerformanceInsights)throw new Error("Performance Insights must be enabled for Aurora Limitless Database.");if(!props.performanceInsightRetention||props.performanceInsightRetention<props_1().PerformanceInsightRetention.MONTHS_1)throw new Error("Performance Insights retention period must be set at least 31 days for Aurora Limitless Database.");if(!props.monitoringInterval||!props.enableClusterLevelEnhancedMonitoring)throw new Error("Cluster level enhanced monitoring must be set for Aurora Limitless Database. Please set 'monitoringInterval' and enable 'enableClusterLevelEnhancedMonitoring'.");if(props.writer||props.readers)throw new Error("Aurora Limitless Database does not support readers or writer instances.");if(!props.engine.engineVersion?.fullVersion?.endsWith("limitless"))throw new Error(`Aurora Limitless Database requires an engine version that supports it, got ${props.engine.engineVersion?.fullVersion}`);if(props.storageType!==DBClusterStorageType.AURORA_IOPT1)throw new Error(`Aurora Limitless Database requires I/O optimized storage type, got: ${props.storageType}`);if(props.cloudwatchLogsExports===void 0||props.cloudwatchLogsExports.length===0)throw new Error("Aurora Limitless Database requires CloudWatch Logs exports to be set.")}if(this.performanceInsightsEnabled=enablePerformanceInsights,this.performanceInsightRetention=enablePerformanceInsights?props.performanceInsightRetention||props_1().PerformanceInsightRetention.DEFAULT:void 0,this.performanceInsightEncryptionKey=props.performanceInsightEncryptionKey,this.monitoringRole=props.monitoringRole,!props.monitoringRole&&props.monitoringInterval&&props.monitoringInterval.toSeconds()&&(this.monitoringRole=new(aws_iam_1()).Role(this,"MonitoringRole",{assumedBy:new(aws_iam_1()).ServicePrincipal("monitoring.rds.amazonaws.com"),managedPolicies:[aws_iam_1().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonRDSEnhancedMonitoringRole")]})),props.enableClusterLevelEnhancedMonitoring&&!props.monitoringInterval)throw new Error("`monitoringInterval` must be set when `enableClusterLevelEnhancedMonitoring` is true.");if(props.monitoringInterval&&[0,1,5,10,15,30,60].indexOf(props.monitoringInterval.toSeconds())===-1)throw new Error(`'monitoringInterval' must be one of 0, 1, 5, 10, 15, 30, or 60 seconds, got: ${props.monitoringInterval.toSeconds()} seconds.`);this.newCfnProps={engine:props.engine.engineType,engineVersion:props.engine.engineVersion?.fullVersion,dbClusterIdentifier:clusterIdentifier,dbSubnetGroupName:this.subnetGroup.subnetGroupName,vpcSecurityGroupIds:this.securityGroups.map(sg=>sg.securityGroupId),port:props.port??clusterEngineBindConfig.port,dbClusterParameterGroupName:clusterParameterGroupConfig?.parameterGroupName,associatedRoles:clusterAssociatedRoles.length>0?clusterAssociatedRoles:void 0,deletionProtection:(0,util_1().defaultDeletionProtection)(props.deletionProtection,props.removalPolicy),enableIamDatabaseAuthentication:props.iamAuthentication,enableHttpEndpoint:core_1().Lazy.any({produce:()=>this.enableDataApi}),networkType:props.networkType,serverlessV2ScalingConfiguration:core_1().Lazy.any({produce:()=>{if(this.hasServerlessInstance)return{minCapacity:this.serverlessV2MinCapacity,maxCapacity:this.serverlessV2MaxCapacity}}}),storageType:props.storageType?.toString(),enableLocalWriteForwarding:props.enableLocalWriteForwarding,clusterScalabilityType:props.clusterScailabilityType,backtrackWindow:props.backtrackWindow?.toSeconds(),backupRetentionPeriod:props.backup?.retention?.toDays(),preferredBackupWindow:props.backup?.preferredWindow,preferredMaintenanceWindow:props.preferredMaintenanceWindow,databaseName:props.defaultDatabaseName,enableCloudwatchLogsExports:props.cloudwatchLogsExports,kmsKeyId:props.storageEncryptionKey?.keyArn,storageEncrypted:props.storageEncryptionKey?!0:props.storageEncrypted,copyTagsToSnapshot:props.copyTagsToSnapshot??!0,domain:this.domainId,domainIamRoleName:this.domainRole?.roleName,performanceInsightsEnabled:this.performanceInsightsEnabled||props.enablePerformanceInsights,performanceInsightsKmsKeyId:this.performanceInsightEncryptionKey?.keyArn,performanceInsightsRetentionPeriod:this.performanceInsightRetention,autoMinorVersionUpgrade:props.autoMinorVersionUpgrade,monitoringInterval:props.enableClusterLevelEnhancedMonitoring?props.monitoringInterval?.toSeconds():void 0,monitoringRoleArn:props.enableClusterLevelEnhancedMonitoring?this.monitoringRole?.roleArn:void 0}}_createInstances(props){const instanceEndpoints=[],instanceIdentifiers=[],readers=[],writer=props.writer.bind(this,this,{monitoringInterval:props.enableClusterLevelEnhancedMonitoring?void 0:props.monitoringInterval,monitoringRole:props.enableClusterLevelEnhancedMonitoring?void 0:this.monitoringRole,removalPolicy:props.removalPolicy??core_1().RemovalPolicy.SNAPSHOT,subnetGroup:this.subnetGroup,promotionTier:0});return instanceIdentifiers.push(writer.instanceIdentifier),instanceEndpoints.push(new(endpoint_1()).Endpoint(writer.dbInstanceEndpointAddress,this.clusterEndpoint.port)),(props.readers??[]).forEach(instance=>{const clusterInstance=instance.bind(this,this,{monitoringInterval:props.enableClusterLevelEnhancedMonitoring?void 0:props.monitoringInterval,monitoringRole:props.enableClusterLevelEnhancedMonitoring?void 0:this.monitoringRole,removalPolicy:props.removalPolicy??core_1().RemovalPolicy.SNAPSHOT,subnetGroup:this.subnetGroup});readers.push(clusterInstance),clusterInstance.node.addDependency(writer),clusterInstance.tier<2&&this.validateReaderInstance(writer,clusterInstance),instanceEndpoints.push(new(endpoint_1()).Endpoint(clusterInstance.dbInstanceEndpointAddress,this.clusterEndpoint.port)),instanceIdentifiers.push(clusterInstance.instanceIdentifier)}),this.validateClusterInstances(writer,readers),{instanceEndpoints,instanceIdentifiers}}validateClusterInstances(writer,readers){if(writer.type===aurora_cluster_instance_1().InstanceType.SERVERLESS_V2&&(this.hasServerlessInstance=!0),validatePerformanceInsightsSettings(this,{nodeId:writer.node.id,performanceInsightsEnabled:writer.performanceInsightsEnabled,performanceInsightRetention:writer.performanceInsightRetention,performanceInsightEncryptionKey:writer.performanceInsightEncryptionKey}),readers.length>0){const sortedReaders=readers.sort((a,b)=>a.tier-b.tier),highestTierReaders=[],highestTier=sortedReaders[0].tier;let hasProvisionedReader=!1,noFailoverTierInstances=!0,serverlessInHighestTier=!1,hasServerlessReader=!1;const someProvisionedReadersDontMatchWriter=[];for(const reader of sortedReaders)reader.type===aurora_cluster_instance_1().InstanceType.SERVERLESS_V2?(hasServerlessReader=!0,this.hasServerlessInstance=!0):(hasProvisionedReader=!0,reader.instanceSize!==writer.instanceSize&&someProvisionedReadersDontMatchWriter.push(reader)),reader.tier===highestTier&&(reader.type===aurora_cluster_instance_1().InstanceType.SERVERLESS_V2&&(serverlessInHighestTier=!0),highestTierReaders.push(reader)),reader.tier<=1&&(noFailoverTierInstances=!1),validatePerformanceInsightsSettings(this,{nodeId:reader.node.id,performanceInsightsEnabled:reader.performanceInsightsEnabled,performanceInsightRetention:reader.performanceInsightRetention,performanceInsightEncryptionKey:reader.performanceInsightEncryptionKey});hasServerlessReader&&!hasProvisionedReader?noFailoverTierInstances&&core_1().Annotations.of(this).addWarningV2("@aws-cdk/aws-rds:noFailoverServerlessReaders",`Cluster ${this.node.id} only has serverless readers and no reader is in promotion tier 0-1.Serverless readers in promotion tiers >= 2 will NOT scale with the writer, which can lead to availability issues if a failover event occurs. It is recommended that at least one reader has \`scaleWithWriter\` set to true`):(serverlessInHighestTier&&highestTier>1&&core_1().Annotations.of(this).addWarningV2("@aws-cdk/aws-rds:serverlessInHighestTier2-15",`There are serverlessV2 readers in tier ${highestTier}. Since there are no instances in a higher tier, any instance in this tier is a failover target. Since this tier is > 1 the serverless reader will not scale with the writer which could lead to availability issues during failover.`),someProvisionedReadersDontMatchWriter.length>0&&writer.type===aurora_cluster_instance_1().InstanceType.PROVISIONED&&core_1().Annotations.of(this).addWarningV2("@aws-cdk/aws-rds:provisionedReadersDontMatchWriter",`There are provisioned readers in the highest promotion tier ${highestTier} that do not have the same InstanceSize as the writer. Any of these instances could be chosen as the new writer in the event of a failover.
Writer InstanceSize: ${writer.instanceSize}
Reader InstanceSizes: ${someProvisionedReadersDontMatchWriter.map(reader=>reader.instanceSize).join(", ")}`))}}validateReaderInstance(writer,reader){writer.type===aurora_cluster_instance_1().InstanceType.PROVISIONED&&reader.type===aurora_cluster_instance_1().InstanceType.SERVERLESS_V2&&(instanceSizeSupportedByServerlessV2(writer.instanceSize,this.serverlessV2MaxCapacity)||core_1().Annotations.of(this).addWarningV2("@aws-cdk/aws-rds:serverlessInstanceCantScaleWithWriter",`For high availability any serverless instances in promotion tiers 0-1 should be able to scale to match the provisioned instance capacity.
Serverless instance ${reader.node.id} is in promotion tier ${reader.tier},
But can not scale to match the provisioned writer instance (${writer.instanceSize})`))}metricServerlessDatabaseCapacity(props){return this.metric("ServerlessDatabaseCapacity",{statistic:"Average",...props})}metricACUUtilization(props){return this.metric("ACUUtilization",{statistic:"Average",...props})}validateServerlessScalingConfig(){if(this.serverlessV2MaxCapacity>256||this.serverlessV2MaxCapacity<1)throw new Error("serverlessV2MaxCapacity must be >= 1 & <= 256");if(this.serverlessV2MinCapacity>256||this.serverlessV2MinCapacity<0)throw new Error("serverlessV2MinCapacity must be >= 0 & <= 256");if(this.serverlessV2MaxCapacity<this.serverlessV2MinCapacity)throw new Error("serverlessV2MaxCapacity must be greater than serverlessV2MinCapacity");const regexp=new RegExp(/^[0-9]+\.?5?$/);if(!regexp.test(this.serverlessV2MaxCapacity.toString())||!regexp.test(this.serverlessV2MinCapacity.toString()))throw new Error(`serverlessV2MinCapacity & serverlessV2MaxCapacity must be in 0.5 step increments, received min: ${this.serverlessV2MaxCapacity}, max: ${this.serverlessV2MaxCapacity}`)}addRotationSingleUser(options={}){if(!this.secret)throw new Error("Cannot add a single user rotation for a cluster without a secret.");const id="RotationSingleUser";if(this.node.tryFindChild(id))throw new Error("A single user rotation was already added to this cluster.");return new(secretsmanager()).SecretRotation(this,id,{...(0,util_1().applyDefaultRotationOptions)(options,this.vpcSubnets),secret:this.secret,application:this.singleUserRotationApplication,vpc:this.vpc,target:this})}addRotationMultiUser(id,options){if(!this.secret)throw new Error("Cannot add a multi user rotation for a cluster without a secret.");return new(secretsmanager()).SecretRotation(this,id,{...(0,util_1().applyDefaultRotationOptions)(options,this.vpcSubnets),secret:options.secret,masterSecret:this.secret,application:this.multiUserRotationApplication,vpc:this.vpc,target:this})}}class ImportedDatabaseCluster extends DatabaseClusterBase{constructor(scope,id,attrs){super(scope,id),this.clusterIdentifier=attrs.clusterIdentifier,this._clusterResourceIdentifier=attrs.clusterResourceIdentifier;const defaultPort=attrs.port?ec2().Port.tcp(attrs.port):void 0;this.connections=new(ec2()).Connections({securityGroups:attrs.securityGroups,defaultPort}),this.engine=attrs.engine,this.secret=attrs.secret,this.enableDataApi=attrs.dataApiEnabled??!1,this._clusterEndpoint=attrs.clusterEndpointAddress&&attrs.port?new(endpoint_1()).Endpoint(attrs.clusterEndpointAddress,attrs.port):void 0,this._clusterReadEndpoint=attrs.readerEndpointAddress&&attrs.port?new(endpoint_1()).Endpoint(attrs.readerEndpointAddress,attrs.port):void 0,this._instanceIdentifiers=attrs.instanceIdentifiers,this._instanceEndpoints=attrs.instanceEndpointAddresses&&attrs.port?attrs.instanceEndpointAddresses.map(addr=>new(endpoint_1()).Endpoint(addr,attrs.port)):void 0}get clusterResourceIdentifier(){if(!this._clusterResourceIdentifier)throw new Error("Cannot access `clusterResourceIdentifier` of an imported cluster without a clusterResourceIdentifier");return this._clusterResourceIdentifier}get clusterEndpoint(){if(!this._clusterEndpoint)throw new Error("Cannot access `clusterEndpoint` of an imported cluster without an endpoint address and port");return this._clusterEndpoint}get clusterReadEndpoint(){if(!this._clusterReadEndpoint)throw new Error("Cannot access `clusterReadEndpoint` of an imported cluster without a readerEndpointAddress and port");return this._clusterReadEndpoint}get instanceIdentifiers(){if(!this._instanceIdentifiers)throw new Error("Cannot access `instanceIdentifiers` of an imported cluster without provided instanceIdentifiers");return this._instanceIdentifiers}get instanceEndpoints(){if(!this._instanceEndpoints)throw new Error("Cannot access `instanceEndpoints` of an imported cluster without instanceEndpointAddresses and port");return this._instanceEndpoints}}class DatabaseCluster extends DatabaseClusterNew{static fromDatabaseClusterAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseClusterAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromDatabaseClusterAttributes),error}return new ImportedDatabaseCluster(scope,id,attrs)}constructor(scope,id,props){super(scope,id,props);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseClusterProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DatabaseCluster),error}const credentials=(0,util_1().renderCredentials)(this,props.engine,props.credentials),secret=credentials.secret,cluster=new(rds_generated_1()).CfnDBCluster(this,"Resource",{...this.newCfnProps,masterUsername:credentials.username,masterUserPassword:credentials.password?.unsafeUnwrap()});this.clusterIdentifier=cluster.ref,this.clusterResourceIdentifier=cluster.attrDbClusterResourceId,secret&&(this.secret=secret.attach(this));const portAttribute=core_1().Token.asNumber(cluster.attrEndpointPort);if(this.clusterEndpoint=new(endpoint_1()).Endpoint(cluster.attrEndpointAddress,portAttribute),this.clusterReadEndpoint=new(endpoint_1()).Endpoint(cluster.attrReadEndpointAddress,portAttribute),this.connections=new(ec2()).Connections({securityGroups:this.securityGroups,defaultPort:ec2().Port.tcp(this.clusterEndpoint.port)}),cluster.applyRemovalPolicy(props.removalPolicy??core_1().RemovalPolicy.SNAPSHOT),setLogRetention(this,props),props.clusterScailabilityType!==ClusterScailabilityType.LIMITLESS){if((props.writer||props.readers)&&(props.instances||props.instanceProps))throw new Error("Cannot provide writer or readers if instances or instanceProps are provided");if(!props.instanceProps&&!props.writer)throw new Error("writer must be provided");const createdInstances=props.writer?this._createInstances(props):legacyCreateInstances(this,props,this.subnetGroup);this.instanceIdentifiers=createdInstances.instanceIdentifiers,this.instanceEndpoints=createdInstances.instanceEndpoints}else this.instanceIdentifiers=[],this.instanceEndpoints=[]}}exports.DatabaseCluster=DatabaseCluster,_b=JSII_RTTI_SYMBOL_1,DatabaseCluster[_b]={fqn:"aws-cdk-lib.aws_rds.DatabaseCluster",version:"2.175.1"};const INSTANCE_TYPE_XLARGE_MEMORY_MAPPING={m5:16,m5d:16,m6g:16,t4g:16,t3:16,m4:16,r6g:32,r5:32,r5b:32,r5d:32,r4:30.5,x2g:64,x1e:122,x1:61,z1d:32};function instanceSizeSupportedByServerlessV2(instanceSize,serverlessV2MaxCapacity){const serverlessMaxMem=serverlessV2MaxCapacity*2,sizeParts=instanceSize.split(".");if(sizeParts.length===2){const type=sizeParts[0],size=sizeParts[1],xlargeMem=INSTANCE_TYPE_XLARGE_MEMORY_MAPPING[type];if(size.endsWith("xlarge")){if((size==="xlarge"?xlargeMem:Number(size.slice(0,-6))*xlargeMem)>serverlessMaxMem)return!1}else return!0}else if(["db.r5.2xlarge.tpc2.mem8x","db.r5.4xlarge.tpc2.mem3x","db.r5.4xlarge.tpc2.mem4x","db.r5.6xlarge.tpc2.mem4x","db.r5.8xlarge.tpc2.mem3x","db.r5.12xlarge.tpc2.mem2x"].includes(instanceSize))return!1;return!0}class DatabaseClusterFromSnapshot extends DatabaseClusterNew{constructor(scope,id,props){super(scope,id,props);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_DatabaseClusterFromSnapshotProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DatabaseClusterFromSnapshot),error}props.credentials&&!props.credentials.password&&!props.credentials.secret&&core_1().Annotations.of(this).addWarningV2("@aws-cdk/aws-rds:useSnapshotCredentials","Use `snapshotCredentials` to modify password of a cluster created from a snapshot."),!props.credentials&&!props.snapshotCredentials&&core_1().Annotations.of(this).addWarningV2("@aws-cdk/aws-rds:generatedCredsNotApplied","Generated credentials will not be applied to cluster. Use `snapshotCredentials` instead. `addRotationSingleUser()` and `addRotationMultiUser()` cannot be used on this cluster.");const deprecatedCredentials=core_1().FeatureFlags.of(this).isEnabled(cxapi().RDS_PREVENT_RENDERING_DEPRECATED_CREDENTIALS)?void 0:(0,util_1().renderCredentials)(this,props.engine,props.credentials),credentials=(0,util_1().renderSnapshotCredentials)(this,props.snapshotCredentials),cluster=new(rds_generated_1()).CfnDBCluster(this,"Resource",{...this.newCfnProps,snapshotIdentifier:props.snapshotIdentifier,masterUserPassword:credentials?.secret?.secretValueFromJson("password")?.unsafeUnwrap()??credentials?.password?.unsafeUnwrap()});if(this.clusterIdentifier=cluster.ref,this.clusterResourceIdentifier=cluster.attrDbClusterResourceId,credentials?.secret&&(this.secret=credentials.secret.attach(this)),deprecatedCredentials?.secret){const deprecatedSecret=deprecatedCredentials.secret.attach(this);this.secret||(this.secret=deprecatedSecret)}const portAttribute=core_1().Token.asNumber(cluster.attrEndpointPort);if(this.clusterEndpoint=new(endpoint_1()).Endpoint(cluster.attrEndpointAddress,portAttribute),this.clusterReadEndpoint=new(endpoint_1()).Endpoint(cluster.attrReadEndpointAddress,portAttribute),this.connections=new(ec2()).Connections({securityGroups:this.securityGroups,defaultPort:ec2().Port.tcp(this.clusterEndpoint.port)}),cluster.applyRemovalPolicy(props.removalPolicy??core_1().RemovalPolicy.SNAPSHOT),setLogRetention(this,props),(props.writer||props.readers)&&(props.instances||props.instanceProps))throw new Error("Cannot provide clusterInstances if instances or instanceProps are provided");const createdInstances=props.writer?this._createInstances(props):legacyCreateInstances(this,props,this.subnetGroup);this.instanceIdentifiers=createdInstances.instanceIdentifiers,this.instanceEndpoints=createdInstances.instanceEndpoints}}exports.DatabaseClusterFromSnapshot=DatabaseClusterFromSnapshot,_c=JSII_RTTI_SYMBOL_1,DatabaseClusterFromSnapshot[_c]={fqn:"aws-cdk-lib.aws_rds.DatabaseClusterFromSnapshot",version:"2.175.1"};function setLogRetention(cluster,props){if(props.cloudwatchLogsExports){const unsupportedLogTypes=props.cloudwatchLogsExports.filter(logType=>!props.engine.supportedLogTypes.includes(logType));if(unsupportedLogTypes.length>0)throw new Error(`Unsupported logs for the current engine type: ${unsupportedLogTypes.join(",")}`);if(props.cloudwatchLogsRetention)for(const log of props.cloudwatchLogsExports){const logGroupName=`/aws/rds/cluster/${cluster.clusterIdentifier}/${log}`;new(logs()).LogRetention(cluster,`LogRetention${log}`,{logGroupName,retention:props.cloudwatchLogsRetention,role:props.cloudwatchLogsRetentionRole}),cluster.cloudwatchLogGroups[log]=logs().LogGroup.fromLogGroupName(cluster,`LogGroup${cluster.clusterIdentifier}${log}`,logGroupName)}}}function legacyCreateInstances(cluster,props,subnetGroup){const instanceCount=props.instances!=null?props.instances:2,instanceUpdateBehaviour=props.instanceUpdateBehaviour??InstanceUpdateBehaviour.BULK;if(core_1().Token.isUnresolved(instanceCount))throw new Error("The number of instances an RDS Cluster consists of cannot be provided as a deploy-time only value!");if(instanceCount<1)throw new Error("At least one instance is required");const instanceIdentifiers=[],instanceEndpoints=[],portAttribute=cluster.clusterEndpoint.port,instanceProps=props.instanceProps,internetConnected=instanceProps.vpc.selectSubnets(instanceProps.vpcSubnets).internetConnectivityEstablished,enablePerformanceInsights=instanceProps.enablePerformanceInsights||instanceProps.performanceInsightRetention!==void 0||instanceProps.performanceInsightEncryptionKey!==void 0;if(enablePerformanceInsights&&instanceProps.enablePerformanceInsights===!1)throw new Error("`enablePerformanceInsights` disabled, but `performanceInsightRetention` or `performanceInsightEncryptionKey` was set");const performanceInsightRetention=enablePerformanceInsights?instanceProps.performanceInsightRetention||props_1().PerformanceInsightRetention.DEFAULT:void 0;validatePerformanceInsightsSettings(cluster,{performanceInsightsEnabled:enablePerformanceInsights,performanceInsightRetention,performanceInsightEncryptionKey:instanceProps.performanceInsightEncryptionKey});const instanceType=instanceProps.instanceType??ec2().InstanceType.of(ec2().InstanceClass.T3,ec2().InstanceSize.MEDIUM);if(instanceProps.parameterGroup&&instanceProps.parameters)throw new Error("You cannot specify both parameterGroup and parameters");const instanceParameterGroupConfig=(instanceProps.parameterGroup??(instanceProps.parameters?new(parameter_group_1()).ParameterGroup(cluster,"InstanceParameterGroup",{engine:props.engine,parameters:instanceProps.parameters}):void 0))?.bindToInstance({}),instances=[];for(let i=0;i<instanceCount;i++){const instanceIndex=i+1,instanceIdentifier=props.instanceIdentifierBase!=null?`${props.instanceIdentifierBase}${instanceIndex}`:props.clusterIdentifier!=null?`${props.clusterIdentifier}instance${instanceIndex}`:void 0,instance=new(rds_generated_1()).CfnDBInstance(cluster,`Instance${instanceIndex}`,{engine:props.engine.engineType,dbClusterIdentifier:cluster.clusterIdentifier,dbInstanceIdentifier:instanceIdentifier,dbInstanceClass:databaseInstanceType(instanceType),publiclyAccessible:instanceProps.publiclyAccessible??(instanceProps.vpcSubnets&&instanceProps.vpcSubnets.subnetType===ec2().SubnetType.PUBLIC),enablePerformanceInsights:enablePerformanceInsights||instanceProps.enablePerformanceInsights,performanceInsightsKmsKeyId:instanceProps.performanceInsightEncryptionKey?.keyArn,performanceInsightsRetentionPeriod:performanceInsightRetention,dbSubnetGroupName:subnetGroup.subnetGroupName,dbParameterGroupName:instanceParameterGroupConfig?.parameterGroupName,monitoringInterval:props.enableClusterLevelEnhancedMonitoring?void 0:props.monitoringInterval?.toSeconds(),monitoringRoleArn:props.enableClusterLevelEnhancedMonitoring?void 0:cluster.monitoringRole?.roleArn,autoMinorVersionUpgrade:instanceProps.autoMinorVersionUpgrade,allowMajorVersionUpgrade:instanceProps.allowMajorVersionUpgrade,deleteAutomatedBackups:instanceProps.deleteAutomatedBackups,preferredMaintenanceWindow:instanceProps.preferredMaintenanceWindow});instance.applyRemovalPolicy((0,util_1().helperRemovalPolicy)(props.removalPolicy)),instance.node.addDependency(internetConnected),instanceIdentifiers.push(instance.ref),instanceEndpoints.push(new(endpoint_1()).Endpoint(instance.attrEndpointAddress,portAttribute)),instances.push(instance)}if(instanceUpdateBehaviour===InstanceUpdateBehaviour.ROLLING)for(let i=1;i<instanceCount;i++)instances[i].node.addDependency(instances[i-1]);return{instanceEndpoints,instanceIdentifiers}}function databaseInstanceType(instanceType){return"db."+instanceType.toString()}function validatePerformanceInsightsSettings(cluster,instance){const target=instance.nodeId?`instance '${instance.nodeId}'`:"`instanceProps`";if(cluster.performanceInsightsEnabled&&instance.performanceInsightsEnabled===!1&&core_1().Annotations.of(cluster).addWarningV2("@aws-cdk/aws-rds:instancePerformanceInsightsOverridden",`Performance Insights is enabled on cluster '${cluster.node.id}' at cluster level, but disabled for ${target}. However, Performance Insights for this instance will also be automatically enabled if enabled at cluster level.`),cluster.performanceInsightRetention&&instance.performanceInsightRetention&&instance.performanceInsightRetention!==cluster.performanceInsightRetention)throw new Error(`\`performanceInsightRetention\` for each instance must be the same as the one at cluster level, got ${target}: ${instance.performanceInsightRetention}, cluster: ${cluster.performanceInsightRetention}`);if(cluster.performanceInsightEncryptionKey&&instance.performanceInsightEncryptionKey){const clusterKeyArn=cluster.performanceInsightEncryptionKey.keyArn,instanceKeyArn=instance.performanceInsightEncryptionKey.keyArn,compared=core_1().Token.compareStrings(clusterKeyArn,instanceKeyArn);if(compared===core_1().TokenComparison.DIFFERENT)throw new Error(`\`performanceInsightEncryptionKey\` for each instance must be the same as the one at cluster level, got ${target}: '${instance.performanceInsightEncryptionKey.keyArn}', cluster: '${cluster.performanceInsightEncryptionKey.keyArn}'`);if(compared===core_1().TokenComparison.BOTH_UNRESOLVED&&clusterKeyArn!==instanceKeyArn)throw new Error("`performanceInsightEncryptionKey` for each instance must be the same as the one at cluster level")}}
