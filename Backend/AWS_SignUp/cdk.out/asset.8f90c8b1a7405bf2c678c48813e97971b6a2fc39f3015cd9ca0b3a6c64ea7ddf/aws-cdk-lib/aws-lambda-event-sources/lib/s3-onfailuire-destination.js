"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.S3OnFailureDestination=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");class S3OnFailureDestination{constructor(bucket){this.bucket=bucket;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_s3_IBucket(bucket)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,S3OnFailureDestination),error}}bind(_target,targetHandler){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_lambda_IEventSourceMapping(_target),jsiiDeprecationWarnings().aws_cdk_lib_aws_lambda_IFunction(targetHandler)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}return this.bucket.grantReadWrite(targetHandler),{destination:this.bucket.bucketArn}}}exports.S3OnFailureDestination=S3OnFailureDestination,_a=JSII_RTTI_SYMBOL_1,S3OnFailureDestination[_a]={fqn:"aws-cdk-lib.aws_lambda_event_sources.S3OnFailureDestination",version:"2.175.1"};
