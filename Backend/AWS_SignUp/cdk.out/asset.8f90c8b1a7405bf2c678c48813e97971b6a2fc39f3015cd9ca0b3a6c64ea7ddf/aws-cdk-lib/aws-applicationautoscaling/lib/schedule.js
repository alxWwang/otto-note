"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Schedule=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class Schedule{static expression(expression){return new LiteralSchedule(expression)}static rate(duration){try{jsiiDeprecationWarnings().aws_cdk_lib_Duration(duration)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.rate),error}if(duration.isUnresolved()){if(!["minute","minutes","hour","hours","day","days"].includes(duration.unitLabel()))throw new Error("Allowed units for scheduling are: 'minute', 'minutes', 'hour', 'hours', 'day' or 'days'");return new LiteralSchedule(`rate(${duration.formatTokenToNumber()})`)}if(duration.toSeconds()===0)throw new Error("Duration cannot be 0");let rate=maybeRate(duration.toDays({integral:!1}),"day");return rate===void 0&&(rate=maybeRate(duration.toHours({integral:!1}),"hour")),rate===void 0&&(rate=makeRate(duration.toMinutes({integral:!0}),"minute")),new LiteralSchedule(rate)}static at(moment){return new LiteralSchedule(`at(${formatISO(moment)})`)}static cron(options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_applicationautoscaling_CronOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.cron),error}if(options.weekDay!==void 0&&options.day!==void 0)throw new Error("Cannot supply both 'day' and 'weekDay', use at most one");const minute=fallback(options.minute,"*"),hour=fallback(options.hour,"*"),month=fallback(options.month,"*"),year=fallback(options.year,"*"),day=fallback(options.day,options.weekDay!==void 0?"?":"*"),weekDay=fallback(options.weekDay,"?");return new class extends Schedule{constructor(){super(...arguments),this.expressionString=`cron(${minute} ${hour} ${day} ${month} ${weekDay} ${year})`}_bind(scope){return options.minute||core_1().Annotations.of(scope).addWarningV2("@aws-cdk/aws-applicationautoscaling:defaultRunEveryMinute","cron: If you don't pass 'minute', by default the event runs every minute. Pass 'minute: '*'' if that's what you intend, or 'minute: 0' to run once per hour instead."),new LiteralSchedule(this.expressionString)}}}constructor(){}}exports.Schedule=Schedule,_a=JSII_RTTI_SYMBOL_1,Schedule[_a]={fqn:"aws-cdk-lib.aws_applicationautoscaling.Schedule",version:"2.175.1"};class LiteralSchedule extends Schedule{constructor(expressionString){super(),this.expressionString=expressionString}_bind(){}}function fallback(x,def){return x===void 0?def:x}function formatISO(date){if(!date)return;return date.getUTCFullYear()+"-"+pad(date.getUTCMonth()+1)+"-"+pad(date.getUTCDate())+"T"+pad(date.getUTCHours())+":"+pad(date.getUTCMinutes())+":"+pad(date.getUTCSeconds());function pad(num){return num<10?"0"+num:num}}function maybeRate(interval,singular){if(!(interval===0||!Number.isInteger(interval)))return makeRate(interval,singular)}function makeRate(interval,singular){return interval===1?`rate(1 ${singular})`:`rate(${interval} ${singular}s)`}
