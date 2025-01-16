"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.StepScalingPolicy=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},step_scaling_action_1=()=>{var tmp=require("./step-scaling-action");return step_scaling_action_1=()=>tmp,tmp},aws_autoscaling_common_1=()=>{var tmp=require("../../aws-autoscaling-common");return aws_autoscaling_common_1=()=>tmp,tmp},cloudwatch=()=>{var tmp=require("../../aws-cloudwatch");return cloudwatch=()=>tmp,tmp},cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp};class StepScalingPolicy extends constructs_1().Construct{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_applicationautoscaling_StepScalingPolicyProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,StepScalingPolicy),error}if(props.scalingSteps.length<2)throw new Error("You must supply at least 2 intervals for autoscaling");if(props.scalingSteps.length>40)throw new Error(`'scalingSteps' can have at most 40 steps, got ${props.scalingSteps.length}`);if(props.evaluationPeriods!==void 0&&!cdk().Token.isUnresolved(props.evaluationPeriods)&&props.evaluationPeriods<1)throw new Error(`evaluationPeriods cannot be less than 1, got: ${props.evaluationPeriods}`);if(props.datapointsToAlarm!==void 0){if(props.evaluationPeriods===void 0)throw new Error("evaluationPeriods must be set if datapointsToAlarm is set");if(!cdk().Token.isUnresolved(props.datapointsToAlarm)&&props.datapointsToAlarm<1)throw new Error(`datapointsToAlarm cannot be less than 1, got: ${props.datapointsToAlarm}`);if(!cdk().Token.isUnresolved(props.datapointsToAlarm)&&!cdk().Token.isUnresolved(props.evaluationPeriods)&&props.evaluationPeriods<props.datapointsToAlarm)throw new Error(`datapointsToAlarm must be less than or equal to evaluationPeriods, got datapointsToAlarm: ${props.datapointsToAlarm}, evaluationPeriods: ${props.evaluationPeriods}`)}const adjustmentType=props.adjustmentType||step_scaling_action_1().AdjustmentType.CHANGE_IN_CAPACITY,changesAreAbsolute=adjustmentType===step_scaling_action_1().AdjustmentType.EXACT_CAPACITY,intervals=(0,aws_autoscaling_common_1().normalizeIntervals)(props.scalingSteps,changesAreAbsolute),alarms=(0,aws_autoscaling_common_1().findAlarmThresholds)(intervals);if(alarms.lowerAlarmIntervalIndex!==void 0){const threshold=intervals[alarms.lowerAlarmIntervalIndex].upper;this.lowerAction=new(step_scaling_action_1()).StepScalingAction(this,"LowerPolicy",{adjustmentType,cooldown:props.cooldown,metricAggregationType:props.metricAggregationType??aggregationTypeFromMetric(props.metric),minAdjustmentMagnitude:props.minAdjustmentMagnitude,scalingTarget:props.scalingTarget});for(let i=alarms.lowerAlarmIntervalIndex;i>=0;i--)this.lowerAction.addAdjustment({adjustment:intervals[i].change,lowerBound:i!==0?intervals[i].lower-threshold:void 0,upperBound:intervals[i].upper-threshold});this.lowerAlarm=new(cloudwatch()).Alarm(this,"LowerAlarm",{metric:props.metric,alarmDescription:"Lower threshold scaling alarm",comparisonOperator:cloudwatch().ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,evaluationPeriods:props.evaluationPeriods??1,datapointsToAlarm:props.datapointsToAlarm,threshold}),this.lowerAlarm.addAlarmAction(new StepScalingAlarmAction(this.lowerAction))}if(alarms.upperAlarmIntervalIndex!==void 0){const threshold=intervals[alarms.upperAlarmIntervalIndex].lower;this.upperAction=new(step_scaling_action_1()).StepScalingAction(this,"UpperPolicy",{adjustmentType,cooldown:props.cooldown,metricAggregationType:props.metricAggregationType??aggregationTypeFromMetric(props.metric),minAdjustmentMagnitude:props.minAdjustmentMagnitude,scalingTarget:props.scalingTarget});for(let i=alarms.upperAlarmIntervalIndex;i<intervals.length;i++)this.upperAction.addAdjustment({adjustment:intervals[i].change,lowerBound:intervals[i].lower-threshold,upperBound:i!==intervals.length-1?intervals[i].upper-threshold:void 0});this.upperAlarm=new(cloudwatch()).Alarm(this,"UpperAlarm",{metric:props.metric,alarmDescription:"Upper threshold scaling alarm",comparisonOperator:cloudwatch().ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,evaluationPeriods:props.evaluationPeriods??1,datapointsToAlarm:props.datapointsToAlarm,threshold}),this.upperAlarm.addAlarmAction(new StepScalingAlarmAction(this.upperAction))}}}exports.StepScalingPolicy=StepScalingPolicy,_a=JSII_RTTI_SYMBOL_1,StepScalingPolicy[_a]={fqn:"aws-cdk-lib.aws_applicationautoscaling.StepScalingPolicy",version:"2.175.1"};function aggregationTypeFromMetric(metric){const statistic=metric.toMetricConfig().metricStat?.statistic;if(statistic!=null)switch(statistic){case"Average":return step_scaling_action_1().MetricAggregationType.AVERAGE;case"Minimum":return step_scaling_action_1().MetricAggregationType.MINIMUM;case"Maximum":return step_scaling_action_1().MetricAggregationType.MAXIMUM;default:return step_scaling_action_1().MetricAggregationType.AVERAGE}}class StepScalingAlarmAction{constructor(stepScalingAction){this.stepScalingAction=stepScalingAction}bind(_scope,_alarm){return{alarmActionArn:this.stepScalingAction.scalingPolicyArn}}}
