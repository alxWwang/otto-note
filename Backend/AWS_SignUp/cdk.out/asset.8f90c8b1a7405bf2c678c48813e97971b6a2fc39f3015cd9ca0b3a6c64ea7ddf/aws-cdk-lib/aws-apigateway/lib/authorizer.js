"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Authorizer=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var method_1=()=>{var tmp=require("./method");return method_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};const AUTHORIZER_SYMBOL=Symbol.for("@aws-cdk/aws-apigateway.Authorizer");class Authorizer extends core_1().Resource{static isAuthorizer(x){return x!==null&&typeof x=="object"&&AUTHORIZER_SYMBOL in x}constructor(scope,id,props){super(scope,id,props),this.authorizationType=method_1().AuthorizationType.CUSTOM;try{jsiiDeprecationWarnings().aws_cdk_lib_ResourceProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,Authorizer),error}Object.defineProperty(this,AUTHORIZER_SYMBOL,{value:!0})}}exports.Authorizer=Authorizer,_a=JSII_RTTI_SYMBOL_1,Authorizer[_a]={fqn:"aws-cdk-lib.aws_apigateway.Authorizer",version:"2.175.1"};
