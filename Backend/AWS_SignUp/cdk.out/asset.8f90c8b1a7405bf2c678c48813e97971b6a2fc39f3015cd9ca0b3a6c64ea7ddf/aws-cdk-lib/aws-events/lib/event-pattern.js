"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Match=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class Match{static nullValue(){return this.fromObjects([null])}static exists(){return this.fromObjects([{exists:!0}])}static doesNotExist(){return this.fromObjects([{exists:!1}])}static exactString(value){return this.fromObjects([value])}static equalsIgnoreCase(value){return this.fromObjects([{"equals-ignore-case":value}])}static prefix(value){return this.fromObjects([{prefix:value}])}static suffix(value){return this.fromObjects([{suffix:value}])}static prefixEqualsIgnoreCase(value){return this.fromObjects([{prefix:{"equals-ignore-case":value}}])}static suffixEqualsIgnoreCase(value){return this.fromObjects([{suffix:{"equals-ignore-case":value}}])}static wildcard(value){return this.fromObjects([{wildcard:value}])}static cidr(range){const ipv4Regex=/^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/igm,ipv6Regex=/^s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:)))(%.+)?s*(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$/igm;if(!ipv4Regex.test(range)&&!ipv6Regex.test(range))throw new Error(`Invalid IP address range: ${range}`);return this.fromObjects([{cidr:range}])}static ipAddressRange(range){return Match.cidr(range)}static anythingBut(...values){if(values.length===0)throw new Error("anythingBut matchers must be non-empty lists");const allNumbers=values.every(v=>typeof v=="number"),allStrings=values.every(v=>typeof v=="string");if(!(allNumbers||allStrings))throw new Error("anythingBut matchers must be lists that contain only strings or only numbers.");return this.fromObjects([{"anything-but":values}])}static anythingButPrefix(...values){return this.anythingButConjunction("prefix",values)}static anythingButSuffix(...values){return this.anythingButConjunction("suffix",values)}static anythingButWildcard(...values){return this.anythingButConjunction("wildcard",values)}static anythingButEqualsIgnoreCase(...values){return this.anythingButConjunction("equals-ignore-case",values)}static greaterThan(value){return this.numeric(">",value)}static greaterThanOrEqual(value){return this.numeric(">=",value)}static lessThan(value){return this.numeric("<",value)}static lessThanOrEqual(value){return this.numeric("<=",value)}static equal(value){return this.numeric("=",value)}static interval(lower,upper){if(lower>upper)throw new Error(`Invalid interval: [${lower}, ${upper}]`);return Match.allOf(Match.greaterThanOrEqual(lower),Match.lessThanOrEqual(upper))}static allOf(...matchers){if(matchers.length===0)throw new Error("A list of matchers must contain at least one element.");return this.fromMergedObjects(matchers)}static anyOf(...matchers){if(matchers.length===0)throw new Error("A list of matchers must contain at least one element.");return this.fromObjects(matchers)}static anythingButConjunction(filterKey,values){if(values.length===0)throw new Error("anythingBut matchers must be non-empty lists");const filterValue=values.length===1?values[0]:values;return this.fromObjects([{"anything-but":{[filterKey]:filterValue}}])}static numeric(operator,value){return this.fromObjects([{numeric:[operator,value]}])}static fromObjects(values){return new Match(values,{mergeMatchers:!1}).asList()}static fromMergedObjects(values){return new Match(values,{mergeMatchers:!0}).asList()}constructor(matchers,options){this.matchers=matchers,this.options=options,this.creationStack=(0,core_1().captureStackTrace)()}resolve(context){try{jsiiDeprecationWarnings().aws_cdk_lib_IResolveContext(context)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.resolve),error}const matchers=this.matchers.flatMap(matcher=>context.resolve(matcher));return this.options.mergeMatchers?this.merge(matchers):matchers}merge(matchers){if(!matchers.every(matcher=>matcher?.numeric))throw new Error("Only numeric matchers can be merged into a single matcher.");return[{numeric:matchers.flatMap(matcher=>matcher.numeric)}]}toString(){return core_1().Token.asString(this)}asList(){return core_1().Token.asList(this)}}exports.Match=Match,_a=JSII_RTTI_SYMBOL_1,Match[_a]={fqn:"aws-cdk-lib.aws_events.Match",version:"2.175.1"};
