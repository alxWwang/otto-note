"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.InsufficientDataHealthStatusEnum=exports.HealthCheck=exports.HealthCheckType=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var route53_generated_1=()=>{var tmp=require("./route53.generated");return route53_generated_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},HealthCheckType;(function(HealthCheckType2){HealthCheckType2.HTTP="HTTP",HealthCheckType2.HTTPS="HTTPS",HealthCheckType2.HTTP_STR_MATCH="HTTP_STR_MATCH",HealthCheckType2.HTTPS_STR_MATCH="HTTPS_STR_MATCH",HealthCheckType2.TCP="TCP",HealthCheckType2.CLOUDWATCH_METRIC="CLOUDWATCH_METRIC",HealthCheckType2.CALCULATED="CALCULATED",HealthCheckType2.RECOVERY_CONTROL="RECOVERY_CONTROL"})(HealthCheckType||(exports.HealthCheckType=HealthCheckType={}));class HealthCheck extends core_1().Resource{static fromHealthCheckId(scope,id,healthCheckId){class Import extends core_1().Resource{constructor(){super(...arguments),this.healthCheckId=healthCheckId}}return new Import(scope,id)}constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_HealthCheckProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,HealthCheck),error}const resource=new(route53_generated_1()).CfnHealthCheck(this,"Resource",{healthCheckConfig:{type:props.type,alarmIdentifier:props.alarmIdentifier,childHealthChecks:props.childHealthChecks?.map(childHealthCheck=>childHealthCheck.healthCheckId),enableSni:props.enableSNI??getDefaultEnableSNIForType(props.type),failureThreshold:props.failureThreshold??getDefaultFailureThresholdForType(props.type),fullyQualifiedDomainName:props.fqdn,healthThreshold:props.healthThreshold??getDefaultHealthThresholdForType(props),insufficientDataHealthStatus:props.insufficientDataHealthStatus??getDefaultInsufficientDataHealthStatusForType(props.type),inverted:props.inverted??!1,ipAddress:props.ipAddress,measureLatency:props.measureLatency??getDefaultMeasureLatencyForType(props.type),port:props.port??getDefaultPortForType(props.type),regions:props.regions,requestInterval:props.requestInterval?.toSeconds()??getDefaultRequestIntervalForType(props.type)?.toSeconds(),resourcePath:props.resourcePath??getDefaultResourcePathForType(props.type),routingControlArn:props.routingControl,searchString:props.searchString}});this.healthCheckId=resource.ref}}exports.HealthCheck=HealthCheck,_a=JSII_RTTI_SYMBOL_1,HealthCheck[_a]={fqn:"aws-cdk-lib.aws_route53.HealthCheck",version:"2.175.1"};function getDefaultResourcePathForType(type){switch(type){case HealthCheckType.HTTP:case HealthCheckType.HTTP_STR_MATCH:case HealthCheckType.HTTPS:case HealthCheckType.HTTPS_STR_MATCH:return"";default:return}}function getDefaultInsufficientDataHealthStatusForType(type){if(type===HealthCheckType.CLOUDWATCH_METRIC)return InsufficientDataHealthStatusEnum.LAST_KNOWN_STATUS}function getDefaultMeasureLatencyForType(type){switch(type){case HealthCheckType.CALCULATED:case HealthCheckType.CLOUDWATCH_METRIC:return;default:return!1}}function getDefaultHealthThresholdForType(props){if(props.type===HealthCheckType.CALCULATED)return props.childHealthChecks.length}function getDefaultFailureThresholdForType(type){switch(type){case HealthCheckType.CALCULATED:case HealthCheckType.CLOUDWATCH_METRIC:return;default:return 3}}function getDefaultRequestIntervalForType(type){switch(type){case HealthCheckType.CALCULATED:case HealthCheckType.CLOUDWATCH_METRIC:return;default:return core_1().Duration.seconds(30)}}function getDefaultEnableSNIForType(type){switch(type){case HealthCheckType.HTTPS:case HealthCheckType.HTTPS_STR_MATCH:return!0;default:return}}function getDefaultPortForType(type){switch(type){case HealthCheckType.HTTP:case HealthCheckType.HTTP_STR_MATCH:return 80;case HealthCheckType.HTTPS:case HealthCheckType.HTTPS_STR_MATCH:return 443;default:return}}var InsufficientDataHealthStatusEnum;(function(InsufficientDataHealthStatusEnum2){InsufficientDataHealthStatusEnum2.HEALTHY="Healthy",InsufficientDataHealthStatusEnum2.UNHEALTHY="Unhealthy",InsufficientDataHealthStatusEnum2.LAST_KNOWN_STATUS="LastKnownStatus"})(InsufficientDataHealthStatusEnum||(exports.InsufficientDataHealthStatusEnum=InsufficientDataHealthStatusEnum={}));
