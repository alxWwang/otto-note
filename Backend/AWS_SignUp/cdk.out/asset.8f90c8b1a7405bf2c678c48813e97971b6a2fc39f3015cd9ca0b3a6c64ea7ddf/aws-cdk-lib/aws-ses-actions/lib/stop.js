"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Stop=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");class Stop{constructor(props={}){this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ses_actions_StopProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,Stop),error}}bind(_rule){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ses_IReceiptRule(_rule)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}return{stopAction:{scope:"RuleSet",topicArn:this.props.topic?.topicArn}}}}exports.Stop=Stop,_a=JSII_RTTI_SYMBOL_1,Stop[_a]={fqn:"aws-cdk-lib.aws_ses_actions.Stop",version:"2.175.1"};
