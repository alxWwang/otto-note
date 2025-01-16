"use strict";var _a,_b,_c;Object.defineProperty(exports,"__esModule",{value:!0}),exports.DashboardVariable=exports.DefaultValue=exports.Values=exports.VariableType=exports.VariableInputType=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var VariableInputType;(function(VariableInputType2){VariableInputType2.INPUT="input",VariableInputType2.RADIO="radio",VariableInputType2.SELECT="select"})(VariableInputType||(exports.VariableInputType=VariableInputType={}));var VariableType;(function(VariableType2){VariableType2.PROPERTY="property",VariableType2.PATTERN="pattern"})(VariableType||(exports.VariableType=VariableType={}));class Values{static fromSearchComponents(components){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudwatch_SearchComponents(components)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromSearchComponents),error}if(components.dimensions.length===0)throw new Error("Empty dimensions provided. Please specify one dimension at least");if(!components.dimensions.includes(components.populateFrom))throw new Error(`populateFrom (${components.populateFrom}) is not present in dimensions`);const metricSchema=[components.namespace,...components.dimensions];return Values.fromSearch(`{${metricSchema.join(",")}} MetricName="${components.metricName}"`,components.populateFrom)}static fromSearch(expression,populateFrom){return new SearchValues(expression,populateFrom)}static fromValues(...values){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudwatch_VariableValue(values)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromValues),error}if(values.length==0)throw new Error("Empty values is not allowed");return new StaticValues(values)}}exports.Values=Values,_a=JSII_RTTI_SYMBOL_1,Values[_a]={fqn:"aws-cdk-lib.aws_cloudwatch.Values",version:"2.175.1"};class StaticValues extends Values{constructor(values){super(),this.values=values}toJson(){return{values:this.values.map(value=>({label:value.label,value:value.value}))}}}class SearchValues extends Values{constructor(expression,populateFrom){super(),this.expression=expression,this.populateFrom=populateFrom}toJson(){return{search:this.expression,populateFrom:this.populateFrom}}}class DefaultValue{static value(value){return new DefaultValue(value)}constructor(val){this.val=val}}exports.DefaultValue=DefaultValue,_b=JSII_RTTI_SYMBOL_1,DefaultValue[_b]={fqn:"aws-cdk-lib.aws_cloudwatch.DefaultValue",version:"2.175.1"},DefaultValue.FIRST=new DefaultValue("__FIRST");class DashboardVariable{constructor(options){this.options=options;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudwatch_DashboardVariableOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DashboardVariable),error}if(options.inputType!==VariableInputType.INPUT&&!options.values)throw new Error(`Variable with inputType (${options.inputType}) requires values to be set`);if(options.inputType==VariableInputType.INPUT&&options.values)throw new Error("inputType INPUT cannot be combined with values. Please choose either SELECT or RADIO or remove 'values' from options.")}toJson(){return{[this.options.type]:this.options.value,type:this.options.type,inputType:this.options.inputType,id:this.options.id,defaultValue:this.options.defaultValue?.val,visible:this.options.visible,label:this.options.label,...this.options.values?.toJson()}}}exports.DashboardVariable=DashboardVariable,_c=JSII_RTTI_SYMBOL_1,DashboardVariable[_c]={fqn:"aws-cdk-lib.aws_cloudwatch.DashboardVariable",version:"2.175.1"};
