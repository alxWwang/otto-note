"use strict";var _a,_b;Object.defineProperty(exports,"__esModule",{value:!0}),exports.InstanceTarget=exports.InstanceIdTarget=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var elbv2=()=>{var tmp=require("../../aws-elasticloadbalancingv2");return elbv2=()=>tmp,tmp};class InstanceIdTarget{constructor(instanceId,port){this.instanceId=instanceId,this.port=port}attachToApplicationTargetGroup(targetGroup){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_elasticloadbalancingv2_IApplicationTargetGroup(targetGroup)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.attachToApplicationTargetGroup),error}return this.attach(targetGroup)}attachToNetworkTargetGroup(targetGroup){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_elasticloadbalancingv2_INetworkTargetGroup(targetGroup)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.attachToNetworkTargetGroup),error}return this.attach(targetGroup)}attach(_targetGroup){return{targetType:elbv2().TargetType.INSTANCE,targetJson:{id:this.instanceId,port:this.port}}}}exports.InstanceIdTarget=InstanceIdTarget,_a=JSII_RTTI_SYMBOL_1,InstanceIdTarget[_a]={fqn:"aws-cdk-lib.aws_elasticloadbalancingv2_targets.InstanceIdTarget",version:"2.175.1"};class InstanceTarget extends InstanceIdTarget{constructor(instance,port){super(instance.instanceId,port);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ec2_Instance(instance)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,InstanceTarget),error}}}exports.InstanceTarget=InstanceTarget,_b=JSII_RTTI_SYMBOL_1,InstanceTarget[_b]={fqn:"aws-cdk-lib.aws_elasticloadbalancingv2_targets.InstanceTarget",version:"2.175.1"};
