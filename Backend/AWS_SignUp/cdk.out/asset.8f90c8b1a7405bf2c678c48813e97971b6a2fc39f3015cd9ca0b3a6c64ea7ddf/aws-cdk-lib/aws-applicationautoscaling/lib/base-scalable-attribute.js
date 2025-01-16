"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.BaseScalableAttribute=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},scalable_target_1=()=>{var tmp=require("./scalable-target");return scalable_target_1=()=>tmp,tmp};class BaseScalableAttribute extends constructs_1().Construct{constructor(scope,id,props){super(scope,id),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_applicationautoscaling_BaseScalableAttributeProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,BaseScalableAttribute),error}this.target=new(scalable_target_1()).ScalableTarget(this,"Target",{serviceNamespace:this.props.serviceNamespace,scalableDimension:this.props.dimension,resourceId:this.props.resourceId,role:this.props.role,minCapacity:props.minCapacity??1,maxCapacity:props.maxCapacity})}doScaleOnSchedule(id,props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_applicationautoscaling_ScalingSchedule(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.doScaleOnSchedule),error}this.target.scaleOnSchedule(id,props)}doScaleOnMetric(id,props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_applicationautoscaling_BasicStepScalingPolicyProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.doScaleOnMetric),error}this.target.scaleOnMetric(id,props)}doScaleToTrackMetric(id,props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_applicationautoscaling_BasicTargetTrackingScalingPolicyProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.doScaleToTrackMetric),error}this.target.scaleToTrackMetric(id,props)}}exports.BaseScalableAttribute=BaseScalableAttribute,_a=JSII_RTTI_SYMBOL_1,BaseScalableAttribute[_a]={fqn:"aws-cdk-lib.aws_applicationautoscaling.BaseScalableAttribute",version:"2.175.1"};
