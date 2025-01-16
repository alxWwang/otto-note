"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.ApplicationMultipleTargetGroupsFargateService=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var aws_ecs_1=()=>{var tmp=require("../../../aws-ecs");return aws_ecs_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp},cxapi=()=>{var tmp=require("../../../cx-api");return cxapi=()=>tmp,tmp},application_multiple_target_groups_service_base_1=()=>{var tmp=require("../base/application-multiple-target-groups-service-base");return application_multiple_target_groups_service_base_1=()=>tmp,tmp};class ApplicationMultipleTargetGroupsFargateService extends application_multiple_target_groups_service_base_1().ApplicationMultipleTargetGroupsServiceBase{constructor(scope,id,props={}){super(scope,id,props);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ecs_patterns_ApplicationMultipleTargetGroupsFargateServiceProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,ApplicationMultipleTargetGroupsFargateService),error}if(this.assignPublicIp=props.assignPublicIp??!1,props.taskDefinition&&props.taskImageOptions)throw new Error("You must specify only one of TaskDefinition or TaskImageOptions.");if(props.taskDefinition)this.taskDefinition=props.taskDefinition;else if(props.taskImageOptions){const taskImageOptions=props.taskImageOptions;this.taskDefinition=new(aws_ecs_1()).FargateTaskDefinition(this,"TaskDef",{memoryLimitMiB:props.memoryLimitMiB,cpu:props.cpu,ephemeralStorageGiB:props.ephemeralStorageGiB,executionRole:taskImageOptions.executionRole,taskRole:taskImageOptions.taskRole,family:taskImageOptions.family,runtimePlatform:props.runtimePlatform});const containerName=taskImageOptions.containerName??"web",container=this.taskDefinition.addContainer(containerName,{image:taskImageOptions.image,logging:this.logDriver,environment:taskImageOptions.environment,secrets:taskImageOptions.secrets,dockerLabels:taskImageOptions.dockerLabels});if(taskImageOptions.containerPorts)for(const containerPort of taskImageOptions.containerPorts)container.addPortMappings({containerPort})}else throw new Error("You must specify one of: taskDefinition or image");if(!this.taskDefinition.defaultContainer)throw new Error("At least one essential container must be specified");this.taskDefinition.defaultContainer.portMappings.length===0&&this.taskDefinition.defaultContainer.addPortMappings({containerPort:80}),this.service=this.createFargateService(props),props.targetGroups?(this.addPortMappingForTargets(this.taskDefinition.defaultContainer,props.targetGroups),this.targetGroup=this.registerECSTargets(this.service,this.taskDefinition.defaultContainer,props.targetGroups)):this.targetGroup=this.listener.addTargets("ECS",{targets:[this.service],port:this.taskDefinition.defaultContainer.portMappings[0].containerPort})}createFargateService(props){const desiredCount=core_1().FeatureFlags.of(this).isEnabled(cxapi().ECS_REMOVE_DEFAULT_DESIRED_COUNT)?this.internalDesiredCount:this.desiredCount;return new(aws_ecs_1()).FargateService(this,"Service",{cluster:this.cluster,desiredCount,taskDefinition:this.taskDefinition,assignPublicIp:this.assignPublicIp,serviceName:props.serviceName,healthCheckGracePeriod:props.healthCheckGracePeriod,propagateTags:props.propagateTags,enableECSManagedTags:props.enableECSManagedTags,cloudMapOptions:props.cloudMapOptions,platformVersion:props.platformVersion,enableExecuteCommand:props.enableExecuteCommand})}}exports.ApplicationMultipleTargetGroupsFargateService=ApplicationMultipleTargetGroupsFargateService,_a=JSII_RTTI_SYMBOL_1,ApplicationMultipleTargetGroupsFargateService[_a]={fqn:"aws-cdk-lib.aws_ecs_patterns.ApplicationMultipleTargetGroupsFargateService",version:"2.175.1"};
