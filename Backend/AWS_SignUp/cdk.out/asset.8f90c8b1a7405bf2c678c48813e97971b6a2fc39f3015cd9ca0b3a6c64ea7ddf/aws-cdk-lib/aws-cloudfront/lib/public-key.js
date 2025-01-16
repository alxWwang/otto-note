"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.PublicKey=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cloudfront_generated_1=()=>{var tmp=require("./cloudfront.generated");return cloudfront_generated_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class PublicKey extends core_1().Resource{static fromPublicKeyId(scope,id,publicKeyId){return new class extends core_1().Resource{constructor(){super(...arguments),this.publicKeyId=publicKeyId}}(scope,id)}constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudfront_PublicKeyProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,PublicKey),error}if(!core_1().Token.isUnresolved(props.encodedKey)&&!/^-----BEGIN PUBLIC KEY-----/.test(props.encodedKey))throw new Error(`Public key must be in PEM format (with the BEGIN/END PUBLIC KEY lines); got ${props.encodedKey}`);const resource=new(cloudfront_generated_1()).CfnPublicKey(this,"Resource",{publicKeyConfig:{name:props.publicKeyName??this.generateName(),callerReference:this.node.addr,encodedKey:props.encodedKey,comment:props.comment}});this.publicKeyId=resource.ref}generateName(){const name=core_1().Names.uniqueId(this);return name.length>80?name.substring(0,40)+name.substring(name.length-40):name}}exports.PublicKey=PublicKey,_a=JSII_RTTI_SYMBOL_1,PublicKey[_a]={fqn:"aws-cdk-lib.aws_cloudfront.PublicKey",version:"2.175.1"};
