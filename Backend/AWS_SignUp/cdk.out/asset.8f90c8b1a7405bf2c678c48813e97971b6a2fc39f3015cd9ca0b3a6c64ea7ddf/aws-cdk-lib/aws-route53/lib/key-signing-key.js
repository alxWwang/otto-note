"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.KeySigningKey=exports.KeySigningKeyStatus=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var route53_generated_1=()=>{var tmp=require("./route53.generated");return route53_generated_1=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},KeySigningKeyStatus;(function(KeySigningKeyStatus2){KeySigningKeyStatus2.ACTIVE="ACTIVE",KeySigningKeyStatus2.INACTIVE="INACTIVE"})(KeySigningKeyStatus||(exports.KeySigningKeyStatus=KeySigningKeyStatus={}));class KeySigningKey extends core_1().Resource{static fromKeySigningKeyAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_KeySigningKeyAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromKeySigningKeyAttributes),error}class Import extends core_1().Resource{constructor(){super(scope,id),this.keySigningKeyName=attrs.keySigningKeyName,this.hostedZone=attrs.hostedZone}get keySigningKeyId(){return`${this.hostedZone.hostedZoneId}|${this.keySigningKeyName}`}}return new Import}constructor(scope,id,props){super(scope,id,{physicalName:props.keySigningKeyName??core_1().Lazy.string({produce:()=>core_1().Names.uniqueResourceName(this,{maxLength:128,allowedSpecialCharacters:"_"})})});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_KeySigningKeyProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,KeySigningKey),error}this.grantKeyPermissionsForZone(props.kmsKey,props.hostedZone);const resource=new(route53_generated_1()).CfnKeySigningKey(this,"Resource",{hostedZoneId:props.hostedZone.hostedZoneId,keyManagementServiceArn:props.kmsKey.keyArn,name:this.physicalName,status:props.status??KeySigningKeyStatus.ACTIVE});this.keySigningKeyId=resource.ref,this.hostedZone=props.hostedZone,this.keySigningKeyName=this.physicalName}grantKeyPermissionsForZone(key,zone){return[key.grant(new(iam()).ServicePrincipal("dnssec-route53.amazonaws.com",{conditions:{ArnEquals:{"aws:SourceArn":zone.hostedZoneArn}}}),"kms:DescribeKey","kms:GetPublicKey","kms:Sign"),key.grant(new(iam()).ServicePrincipal("dnssec-route53.amazonaws.com",{conditions:{Bool:{"kms:GrantIsForAWSResource":!0}}}),"kms:CreateGrant")]}}exports.KeySigningKey=KeySigningKey,_a=JSII_RTTI_SYMBOL_1,KeySigningKey[_a]={fqn:"aws-cdk-lib.aws_route53.KeySigningKey",version:"2.175.1"};
