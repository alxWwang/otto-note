"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Match=void 0;const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var matcher_1=()=>{var tmp=require("./matcher");return matcher_1=()=>tmp,tmp},absent_1=()=>{var tmp=require("./private/matchers/absent");return absent_1=()=>tmp,tmp},sorting_1=()=>{var tmp=require("./private/sorting");return sorting_1=()=>tmp,tmp},sparse_matrix_1=()=>{var tmp=require("./private/sparse-matrix");return sparse_matrix_1=()=>tmp,tmp},type_1=()=>{var tmp=require("./private/type");return type_1=()=>tmp,tmp};class Match{static absent(){return new(absent_1()).AbsentMatch("absent")}static arrayWith(pattern){return new ArrayMatch("arrayWith",pattern)}static arrayEquals(pattern){return new ArrayMatch("arrayEquals",pattern,{subsequence:!1})}static exact(pattern){return new LiteralMatch("exact",pattern,{partialObjects:!1})}static objectLike(pattern){return new ObjectMatch("objectLike",pattern)}static objectEquals(pattern){return new ObjectMatch("objectEquals",pattern,{partial:!1})}static not(pattern){return new NotMatch("not",pattern)}static serializedJson(pattern){return new SerializedJson("serializedJson",pattern)}static anyValue(){return new AnyMatch("anyValue")}static stringLikeRegexp(pattern){return new StringLikeRegexpMatch("stringLikeRegexp",pattern)}}exports.Match=Match,_a=JSII_RTTI_SYMBOL_1,Match[_a]={fqn:"aws-cdk-lib.assertions.Match",version:"2.175.1"};class LiteralMatch extends matcher_1().Matcher{constructor(name,pattern,options={}){if(super(),this.name=name,this.pattern=pattern,this.partialObjects=options.partialObjects??!1,matcher_1().Matcher.isMatcher(this.pattern))throw new Error("LiteralMatch cannot directly contain another matcher. Remove the top-level matcher or nest it more deeply.")}test(actual){if(Array.isArray(this.pattern))return new ArrayMatch(this.name,this.pattern,{subsequence:!1,partialObjects:this.partialObjects}).test(actual);if(typeof this.pattern=="object")return new ObjectMatch(this.name,this.pattern,{partial:this.partialObjects}).test(actual);const result=new(matcher_1()).MatchResult(actual);return typeof this.pattern!=typeof actual?(result.recordFailure({matcher:this,path:[],message:`Expected type ${typeof this.pattern} but received ${(0,type_1().getType)(actual)}`}),result):(actual!==this.pattern&&result.recordFailure({matcher:this,path:[],message:`Expected ${this.pattern} but received ${actual}`}),result)}}class ArrayMatch extends matcher_1().Matcher{constructor(name,pattern,options={}){super(),this.name=name,this.pattern=pattern,this.subsequence=options.subsequence??!0,this.partialObjects=options.partialObjects??!1}test(actual){return Array.isArray(actual)?this.subsequence?this.testSubsequence(actual):this.testFullArray(actual):new(matcher_1()).MatchResult(actual).recordFailure({matcher:this,path:[],message:`Expected type array but received ${(0,type_1().getType)(actual)}`})}testFullArray(actual){const result=new(matcher_1()).MatchResult(actual);let i=0;for(;i<this.pattern.length&&i<actual.length;i++){const patternElement=this.pattern[i],innerResult=(matcher_1().Matcher.isMatcher(patternElement)?patternElement:new LiteralMatch(this.name,patternElement,{partialObjects:this.partialObjects})).test(actual[i]);result.compose(`${i}`,innerResult)}return i<this.pattern.length&&result.recordFailure({matcher:this,message:`Not enough elements in array (expecting ${this.pattern.length}, got ${actual.length})`,path:[`${i}`]}),i<actual.length&&result.recordFailure({matcher:this,message:`Too many elements in array (expecting ${this.pattern.length}, got ${actual.length})`,path:[`${i}`]}),result}testSubsequence(actual){const result=new(matcher_1()).MatchResult(actual);let patternIdx=0,actualIdx=0;const matches=new(sparse_matrix_1()).SparseMatrix;for(;patternIdx<this.pattern.length&&actualIdx<actual.length;){const patternElement=this.pattern[patternIdx],matcher=matcher_1().Matcher.isMatcher(patternElement)?patternElement:new LiteralMatch(this.name,patternElement,{partialObjects:this.partialObjects}),matcherName=matcher.name;if(matcherName=="absent"||matcherName=="anyValue")throw new Error(`The Matcher ${matcherName}() cannot be nested within arrayWith()`);const innerResult=matcher.test(actual[actualIdx]);matches.set(patternIdx,actualIdx,innerResult),actualIdx++,innerResult.isSuccess&&(result.compose(`${actualIdx}`,innerResult),patternIdx++)}if(patternIdx<this.pattern.length){for(let spi=0;spi<patternIdx;spi++){const foundMatch=matches.row(spi).find(([,r])=>r.isSuccess);if(!foundMatch)continue;const[index]=foundMatch;result.compose(`${index}`,new(matcher_1()).MatchResult(actual[index]).recordFailure({matcher:this,message:`arrayWith pattern ${spi} matched here`,path:[],cost:0}))}const failedMatches=matches.row(patternIdx);if(failedMatches.sort((0,sorting_1().sortKeyComparator)(([i,r])=>[r.failCost,i])),failedMatches.length>0){const[index,innerResult]=failedMatches[0];result.recordFailure({matcher:this,message:`Could not match arrayWith pattern ${patternIdx}. This is the closest match`,path:[`${index}`],cost:0}),result.compose(`${index}`,innerResult)}else result.recordFailure({matcher:this,message:`Could not match arrayWith pattern ${patternIdx}. No more elements to try`,path:[`${actual.length}`]})}return result}}class ObjectMatch extends matcher_1().Matcher{constructor(name,pattern,options={}){super(),this.name=name,this.pattern=pattern,this.partial=options.partial??!0}test(actual){if(typeof actual!="object"||Array.isArray(actual))return new(matcher_1()).MatchResult(actual).recordFailure({matcher:this,path:[],message:`Expected type object but received ${(0,type_1().getType)(actual)}`});const result=new(matcher_1()).MatchResult(actual);if(!this.partial)for(const a of Object.keys(actual))a in this.pattern||result.recordFailure({matcher:this,path:[a],message:`Unexpected key ${a}`});for(const[patternKey,patternVal]of Object.entries(this.pattern)){if(!(patternKey in actual)&&!(patternVal instanceof absent_1().AbsentMatch)){result.recordFailure({matcher:this,path:[patternKey],message:`Missing key '${patternKey}'`});continue}const inner=(matcher_1().Matcher.isMatcher(patternVal)?patternVal:new LiteralMatch(this.name,patternVal,{partialObjects:this.partial})).test(actual[patternKey]);result.compose(patternKey,inner)}return result}}class SerializedJson extends matcher_1().Matcher{constructor(name,pattern){super(),this.name=name,this.pattern=pattern}test(actual){if((0,type_1().getType)(actual)!=="string")return new(matcher_1()).MatchResult(actual).recordFailure({matcher:this,path:[],message:`Expected JSON as a string but found ${(0,type_1().getType)(actual)}`});let parsed;try{parsed=JSON.parse(actual)}catch(err){if(err instanceof SyntaxError)return new(matcher_1()).MatchResult(actual).recordFailure({matcher:this,path:[],message:`Invalid JSON string: ${actual}`});throw err}const innerResult=(matcher_1().Matcher.isMatcher(this.pattern)?this.pattern:new LiteralMatch(this.name,this.pattern)).test(parsed);return innerResult.hasFailed()&&innerResult.recordFailure({matcher:this,path:[],message:"Encoded JSON value does not match"}),innerResult}}class NotMatch extends matcher_1().Matcher{constructor(name,pattern){super(),this.name=name,this.pattern=pattern}test(actual){const innerResult=(matcher_1().Matcher.isMatcher(this.pattern)?this.pattern:new LiteralMatch(this.name,this.pattern)).test(actual),result=new(matcher_1()).MatchResult(actual);return innerResult.failCount===0&&result.recordFailure({matcher:this,path:[],message:`Found unexpected match: ${JSON.stringify(actual,void 0,2)}`}),result}}class AnyMatch extends matcher_1().Matcher{constructor(name){super(),this.name=name}test(actual){const result=new(matcher_1()).MatchResult(actual);return actual==null&&result.recordFailure({matcher:this,path:[],message:"Expected a value but found none"}),result}}class StringLikeRegexpMatch extends matcher_1().Matcher{constructor(name,pattern){super(),this.name=name,this.pattern=pattern}test(actual){const result=new(matcher_1()).MatchResult(actual),regex=new RegExp(this.pattern,"gm");return typeof actual!="string"&&result.recordFailure({matcher:this,path:[],message:`Expected a string, but got '${typeof actual}'`}),regex.test(actual)||result.recordFailure({matcher:this,path:[],message:`String '${actual}' did not match pattern '${this.pattern}'`}),result}}
