"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnParameter=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cfn_element_1=()=>{var tmp=require("./cfn-element");return cfn_element_1=()=>tmp,tmp},cfn_reference_1=()=>{var tmp=require("./private/cfn-reference");return cfn_reference_1=()=>tmp,tmp},token_1=()=>{var tmp=require("./token");return token_1=()=>tmp,tmp},type_hints_1=()=>{var tmp=require("./type-hints");return type_hints_1=()=>tmp,tmp};class CfnParameter extends cfn_element_1().CfnElement{constructor(scope,id,props={}){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_CfnParameterProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnParameter),error}this._type=props.type||"String",this._default=props.default,this._allowedPattern=props.allowedPattern,this._allowedValues=props.allowedValues,this._constraintDescription=props.constraintDescription,this._description=props.description,this._maxLength=props.maxLength,this._maxValue=props.maxValue,this._minLength=props.minLength,this._minValue=props.minValue,this._noEcho=props.noEcho,this.typeHint=typeToTypeHint(this._type)}get type(){return this._type}set type(type){this._type=type,this.typeHint=typeToTypeHint(this._type)}get default(){return this._default}set default(value){this._default=value}get allowedPattern(){return this._allowedPattern}set allowedPattern(pattern){this._allowedPattern=pattern}get allowedValues(){return this._allowedValues}set allowedValues(values){this._allowedValues=values}get constraintDescription(){return this._constraintDescription}set constraintDescription(desc){this._constraintDescription=desc}get description(){return this._description}set description(desc){this._description=desc}get maxLength(){return this._maxLength}set maxLength(len){this._maxLength=len}get minLength(){return this._minLength}set minLength(len){this._minLength=len}get maxValue(){return this._maxValue}set maxValue(len){this._maxValue=len}get minValue(){return this._minValue}set minValue(len){this._minValue=len}get noEcho(){return!!this._noEcho}set noEcho(echo){this._noEcho=echo}get value(){return cfn_reference_1().CfnReference.for(this,"Ref",void 0,this.typeHint)}get valueAsString(){if(!isStringType(this.type)&&!isNumberType(this.type))throw new Error(`Parameter type (${this.type}) is not a string or number type`);return token_1().Token.asString(this.value)}get valueAsList(){if(!isListType(this.type))throw new Error(`Parameter type (${this.type}) is not a string list type`);return token_1().Token.asList(this.value)}get valueAsNumber(){if(!isNumberType(this.type))throw new Error(`Parameter type (${this.type}) is not a number type`);return token_1().Token.asNumber(this.value)}_toCloudFormation(){return{Parameters:{[this.logicalId]:{Type:this.type,Default:this.default,AllowedPattern:this.allowedPattern,AllowedValues:this.allowedValues,ConstraintDescription:this.constraintDescription,Description:this.description,MaxLength:this.maxLength,MaxValue:this.maxValue,MinLength:this.minLength,MinValue:this.minValue,NoEcho:this._noEcho}}}}resolve(_context){try{jsiiDeprecationWarnings().aws_cdk_lib_IResolveContext(_context)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.resolve),error}return this.value}}exports.CfnParameter=CfnParameter,_a=JSII_RTTI_SYMBOL_1,CfnParameter[_a]={fqn:"aws-cdk-lib.CfnParameter",version:"2.175.1"};function isListType(type){return type.indexOf("List<")>=0||type.indexOf("CommaDelimitedList")>=0}function isNumberType(type){return type==="Number"}function isStringType(type){return!isListType(type)&&!isNumberType(type)}function typeToTypeHint(type){return isListType(type)?type_hints_1().ResolutionTypeHint.STRING_LIST:isNumberType(type)?type_hints_1().ResolutionTypeHint.NUMBER:type_hints_1().ResolutionTypeHint.STRING}
