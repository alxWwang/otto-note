"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Duration=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var token_1=()=>{var tmp=require("./token");return token_1=()=>tmp,tmp};class Duration{static millis(amount){return new Duration(amount,TimeUnit.Milliseconds)}static seconds(amount){return new Duration(amount,TimeUnit.Seconds)}static minutes(amount){return new Duration(amount,TimeUnit.Minutes)}static hours(amount){return new Duration(amount,TimeUnit.Hours)}static days(amount){return new Duration(amount,TimeUnit.Days)}static parse(duration){const matches=duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)\.?(\d{1,3})?S)?)?$/);if(!matches)throw new Error(`Not a valid ISO duration: ${duration}`);const[,days,hours,minutes,seconds,milliseconds]=matches;if(!days&&!hours&&!minutes&&!seconds&&!milliseconds)throw new Error(`Not a valid ISO duration: ${duration}`);const millis=milliseconds?milliseconds.padEnd(3,"0"):"";return Duration.millis(_toInt(millis)+_toInt(seconds)*TimeUnit.Seconds.inMillis+_toInt(minutes)*TimeUnit.Minutes.inMillis+_toInt(hours)*TimeUnit.Hours.inMillis+_toInt(days)*TimeUnit.Days.inMillis);function _toInt(str){return str?Number(str):0}}constructor(amount,unit){if(!token_1().Token.isUnresolved(amount)&&amount<0)throw new Error(`Duration amounts cannot be negative. Received: ${amount}`);this.amount=amount,this.unit=unit}plus(rhs){try{jsiiDeprecationWarnings().aws_cdk_lib_Duration(rhs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.plus),error}const targetUnit=finestUnit(this.unit,rhs.unit),res=convert(this.amount,this.unit,targetUnit,{})+convert(rhs.amount,rhs.unit,targetUnit,{});return new Duration(res,targetUnit)}minus(rhs){try{jsiiDeprecationWarnings().aws_cdk_lib_Duration(rhs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.minus),error}const targetUnit=finestUnit(this.unit,rhs.unit),res=convert(this.amount,this.unit,targetUnit,{})-convert(rhs.amount,rhs.unit,targetUnit,{});return new Duration(res,targetUnit)}toMilliseconds(opts={}){try{jsiiDeprecationWarnings().aws_cdk_lib_TimeConversionOptions(opts)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.toMilliseconds),error}return convert(this.amount,this.unit,TimeUnit.Milliseconds,opts)}toSeconds(opts={}){try{jsiiDeprecationWarnings().aws_cdk_lib_TimeConversionOptions(opts)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.toSeconds),error}return convert(this.amount,this.unit,TimeUnit.Seconds,opts)}toMinutes(opts={}){try{jsiiDeprecationWarnings().aws_cdk_lib_TimeConversionOptions(opts)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.toMinutes),error}return convert(this.amount,this.unit,TimeUnit.Minutes,opts)}toHours(opts={}){try{jsiiDeprecationWarnings().aws_cdk_lib_TimeConversionOptions(opts)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.toHours),error}return convert(this.amount,this.unit,TimeUnit.Hours,opts)}toDays(opts={}){try{jsiiDeprecationWarnings().aws_cdk_lib_TimeConversionOptions(opts)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.toDays),error}return convert(this.amount,this.unit,TimeUnit.Days,opts)}toIsoString(){if(this.amount===0)return"PT0S";const ret=["P"];let tee=!1;for(const[amount,unit]of this.components(!0))[TimeUnit.Seconds,TimeUnit.Minutes,TimeUnit.Hours].includes(unit)&&!tee&&(ret.push("T"),tee=!0),ret.push(`${amount}${unit.isoLabel}`);return ret.join("")}toISOString(){return this.toIsoString()}toHumanString(){if(this.amount===0)return fmtUnit(0,this.unit);if(token_1().Token.isUnresolved(this.amount))return`<token> ${this.unit.label}`;return this.components(!1).slice(0,2).map(([amount,unit])=>fmtUnit(amount,unit)).join(" ");function fmtUnit(amount,unit){return amount===1?`${amount} ${unit.label.substring(0,unit.label.length-1)}`:`${amount} ${unit.label}`}}toString(){return`Duration.${this.unit.label}(${this.amount})`}components(combineMillisWithSeconds){const ret=new Array;let millis=convert(this.amount,this.unit,TimeUnit.Milliseconds,{integral:!1});for(const unit of[TimeUnit.Days,TimeUnit.Hours,TimeUnit.Minutes,TimeUnit.Seconds]){const count=convert(millis,TimeUnit.Milliseconds,unit,{integral:!1}),wholeCount=unit===TimeUnit.Seconds&&combineMillisWithSeconds?count:Math.floor(count);wholeCount>0&&(ret.push([wholeCount,unit]),millis-=wholeCount*unit.inMillis)}return millis>1e-4&&ret.push([millis,TimeUnit.Milliseconds]),ret}isUnresolved(){return token_1().Token.isUnresolved(this.amount)}unitLabel(){return this.unit.label}formatTokenToNumber(){return`${token_1().Tokenization.stringifyNumber(this.amount)} ${this.unit.label}`}}exports.Duration=Duration,_a=JSII_RTTI_SYMBOL_1,Duration[_a]={fqn:"aws-cdk-lib.Duration",version:"2.175.1"};class TimeUnit{constructor(label,isoLabel,inMillis){this.label=label,this.isoLabel=isoLabel,this.inMillis=inMillis}toString(){return this.label}}TimeUnit.Milliseconds=new TimeUnit("millis","",1),TimeUnit.Seconds=new TimeUnit("seconds","S",1e3),TimeUnit.Minutes=new TimeUnit("minutes","M",6e4),TimeUnit.Hours=new TimeUnit("hours","H",36e5),TimeUnit.Days=new TimeUnit("days","D",864e5);function convert(amount,fromUnit,toUnit,{integral=!0}){if(fromUnit.inMillis===toUnit.inMillis){if(integral&&!token_1().Token.isUnresolved(amount)&&!Number.isInteger(amount))throw new Error(`${amount} must be a whole number of ${toUnit}.`);return amount}if(token_1().Token.isUnresolved(amount))throw new Error(`Duration must be specified as 'Duration.${toUnit}()' here since its value comes from a token and cannot be converted (got Duration.${fromUnit})`);const value=amount*fromUnit.inMillis/toUnit.inMillis;if(!Number.isInteger(value)&&integral)throw new Error(`'${amount} ${fromUnit}' cannot be converted into a whole number of ${toUnit}.`);return value}function finestUnit(a,b){return a.inMillis<b.inMillis?a:b}
