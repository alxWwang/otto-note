"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.DailyAutomaticBackupStartTime=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");class DailyAutomaticBackupStartTime{constructor(props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_fsx_DailyAutomaticBackupStartTimeProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DailyAutomaticBackupStartTime),error}this.validate(props.hour,props.minute),this.hour=this.getTwoDigitString(props.hour),this.minute=this.getTwoDigitString(props.minute)}toTimestamp(){return`${this.hour}:${this.minute}`}getTwoDigitString(n){const numberString=n.toString();return numberString.length===1?`0${n}`:numberString}validate(hour,minute){if(!Number.isInteger(hour)||hour<0||hour>23)throw new Error(`dailyAutomaticBackupStartTime hour must be an integer between 0 and 24. received: ${hour}`);if(!Number.isInteger(minute)||minute<0||minute>59)throw new Error(`dailyAutomaticBackupStartTime minute must be an integer between 0 and 59. received: ${minute}`)}}exports.DailyAutomaticBackupStartTime=DailyAutomaticBackupStartTime,_a=JSII_RTTI_SYMBOL_1,DailyAutomaticBackupStartTime[_a]={fqn:"aws-cdk-lib.aws_fsx.DailyAutomaticBackupStartTime",version:"2.175.1"};
