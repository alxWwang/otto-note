"use strict";var _a,_b;Object.defineProperty(exports,"__esModule",{value:!0}),exports.SigningProfile=exports.Platform=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var signer_generated_1=()=>{var tmp=require("./signer.generated");return signer_generated_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class Platform{static of(platformId){return new Platform(platformId)}constructor(platformId){this.platformId=platformId,this.platformId=platformId}}exports.Platform=Platform,_a=JSII_RTTI_SYMBOL_1,Platform[_a]={fqn:"aws-cdk-lib.aws_signer.Platform",version:"2.175.1"},Platform.AWS_IOT_DEVICE_MANAGEMENT_SHA256_ECDSA=Platform.of("AWSIoTDeviceManagement-SHA256-ECDSA"),Platform.AWS_LAMBDA_SHA384_ECDSA=Platform.of("AWSLambda-SHA384-ECDSA"),Platform.AMAZON_FREE_RTOS_TI_CC3220SF=Platform.of("AmazonFreeRTOS-TI-CC3220SF"),Platform.AMAZON_FREE_RTOS_DEFAULT=Platform.of("AmazonFreeRTOS-Default"),Platform.NOTATION_OCI_SHA384_ECDSA=Platform.of("Notation-OCI-SHA384-ECDSA");class SigningProfile extends core_1().Resource{static fromSigningProfileAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_signer_SigningProfileAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromSigningProfileAttributes),error}class Import extends core_1().Resource{constructor(signingProfileArn2,signingProfileProfileVersionArn){super(scope,id),this.signingProfileName=attrs.signingProfileName,this.signingProfileVersion=attrs.signingProfileVersion,this.signingProfileArn=signingProfileArn2,this.signingProfileVersionArn=signingProfileProfileVersionArn}}const signingProfileArn=core_1().Stack.of(scope).formatArn({service:"signer",resource:"",resourceName:`/signing-profiles/${attrs.signingProfileName}`}),SigningProfileVersionArn=core_1().Stack.of(scope).formatArn({service:"signer",resource:"",resourceName:`/signing-profiles/${attrs.signingProfileName}/${attrs.signingProfileVersion}`});return new Import(signingProfileArn,SigningProfileVersionArn)}constructor(scope,id,props){super(scope,id,{physicalName:props.signingProfileName});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_signer_SigningProfileProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,SigningProfile),error}const resource=new(signer_generated_1()).CfnSigningProfile(this,"Resource",{platformId:props.platform.platformId,signatureValidityPeriod:props.signatureValidity?{type:"DAYS",value:props.signatureValidity?.toDays()}:{type:"MONTHS",value:135}});this.signingProfileArn=resource.attrArn,this.signingProfileName=resource.attrProfileName,this.signingProfileVersion=resource.attrProfileVersion,this.signingProfileVersionArn=resource.attrProfileVersionArn}}exports.SigningProfile=SigningProfile,_b=JSII_RTTI_SYMBOL_1,SigningProfile[_b]={fqn:"aws-cdk-lib.aws_signer.SigningProfile",version:"2.175.1"};
