"use strict";var __classPrivateFieldGet=exports&&exports.__classPrivateFieldGet||function(receiver,state,kind,f){if(kind==="a"&&!f)throw new TypeError("Private accessor was defined without a getter");if(typeof state=="function"?receiver!==state||!f:!state.has(receiver))throw new TypeError("Cannot read private member from an object whose class did not declare it");return kind==="m"?f:kind==="a"?f.call(receiver):f?f.value:state.get(receiver)},__classPrivateFieldSet=exports&&exports.__classPrivateFieldSet||function(receiver,state,value,kind,f){if(kind==="m")throw new TypeError("Private method is not writable");if(kind==="a"&&!f)throw new TypeError("Private accessor was defined without a setter");if(typeof state=="function"?receiver!==state||!f:!state.has(receiver))throw new TypeError("Cannot write private member to an object whose class did not declare it");return kind==="a"?f.call(receiver,value):f?f.value=value:state.set(receiver,value),value},_a,_ConstructError_time,_ConstructError_constructPath,_ConstructError_constructInfo;Object.defineProperty(exports,"__esModule",{value:!0}),exports.ValidationError=exports.Errors=void 0;const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var helpers_internal_1=()=>{var tmp=require("./helpers-internal");return helpers_internal_1=()=>tmp,tmp};const CONSTRUCT_ERROR_SYMBOL=Symbol.for("@aws-cdk/core.SynthesisError"),VALIDATION_ERROR_SYMBOL=Symbol.for("@aws-cdk/core.ValidationError");class Errors{static isConstructError(x){return x!==null&&typeof x=="object"&&CONSTRUCT_ERROR_SYMBOL in x}static isValidationError(x){return Errors.isConstructError(x)&&VALIDATION_ERROR_SYMBOL in x}}exports.Errors=Errors,_a=JSII_RTTI_SYMBOL_1,Errors[_a]={fqn:"aws-cdk-lib.Errors",version:"2.175.1"};class ConstructError extends Error{get time(){return __classPrivateFieldGet(this,_ConstructError_time,"f")}get level(){return"error"}get constructPath(){return __classPrivateFieldGet(this,_ConstructError_constructPath,"f")}get constructInfo(){return __classPrivateFieldGet(this,_ConstructError_constructInfo,"f")}constructor(msg,scope){if(super(msg),_ConstructError_time.set(this,void 0),_ConstructError_constructPath.set(this,void 0),_ConstructError_constructInfo.set(this,void 0),Object.setPrototypeOf(this,ConstructError.prototype),Object.defineProperty(this,CONSTRUCT_ERROR_SYMBOL,{value:!0}),this.name=new.target.name,__classPrivateFieldSet(this,_ConstructError_time,new Date().toISOString(),"f"),__classPrivateFieldSet(this,_ConstructError_constructPath,scope?.node.path,"f"),scope){Error.captureStackTrace(this,scope.constructor);try{__classPrivateFieldSet(this,_ConstructError_constructInfo,scope?(0,helpers_internal_1().constructInfoFromConstruct)(scope):void 0,"f")}catch{}}const stack=[`${this.name}: ${this.message}`];this.constructInfo?stack.push(`in ${this.constructInfo?.fqn} at [${this.constructPath}]`):stack.push(`in [${this.constructPath}]`),this.stack&&stack.push(this.stack),this.stack=this.constructStack(this.stack)}constructStack(prev){const indent=" ".repeat(4),stack=[`${this.name}: ${this.message}`];return this.constructInfo?stack.push(`${indent}at path [${this.constructPath}] in ${this.constructInfo?.fqn}`):stack.push(`${indent}at path [${this.constructPath}]`),prev&&(stack.push(""),stack.push(...prev.split(`
`).slice(1))),stack.join(`
`)}}_ConstructError_time=new WeakMap,_ConstructError_constructPath=new WeakMap,_ConstructError_constructInfo=new WeakMap;class ValidationError extends ConstructError{get type(){return"validation"}constructor(msg,scope){super(msg,scope),Object.setPrototypeOf(this,ValidationError.prototype),Object.defineProperty(this,VALIDATION_ERROR_SYMBOL,{value:!0})}}exports.ValidationError=ValidationError;
