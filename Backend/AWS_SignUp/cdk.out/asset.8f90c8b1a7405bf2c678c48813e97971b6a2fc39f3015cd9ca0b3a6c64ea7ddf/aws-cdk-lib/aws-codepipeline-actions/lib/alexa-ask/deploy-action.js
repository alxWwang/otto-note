"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.AlexaSkillDeployAction=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var codepipeline=()=>{var tmp=require("../../../aws-codepipeline");return codepipeline=()=>tmp,tmp},action_1=()=>{var tmp=require("../action");return action_1=()=>tmp,tmp};class AlexaSkillDeployAction extends action_1().Action{constructor(props){super({...props,category:codepipeline().ActionCategory.DEPLOY,owner:"ThirdParty",provider:"AlexaSkillsKit",artifactBounds:{minInputs:1,maxInputs:2,minOutputs:0,maxOutputs:0},inputs:getInputs(props)});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_codepipeline_actions_AlexaSkillDeployActionProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,AlexaSkillDeployAction),error}this.props=props}bound(_scope,_stage,_options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_codepipeline_IStage(_stage),jsiiDeprecationWarnings().aws_cdk_lib_aws_codepipeline_ActionBindOptions(_options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bound),error}return{configuration:{ClientId:this.props.clientId,ClientSecret:this.props.clientSecret.unsafeUnwrap(),RefreshToken:this.props.refreshToken.unsafeUnwrap(),SkillId:this.props.skillId}}}}exports.AlexaSkillDeployAction=AlexaSkillDeployAction,_a=JSII_RTTI_SYMBOL_1,AlexaSkillDeployAction[_a]={fqn:"aws-cdk-lib.aws_codepipeline_actions.AlexaSkillDeployAction",version:"2.175.1"};function getInputs(props){const ret=[props.input];return props.parameterOverridesArtifact&&ret.push(props.parameterOverridesArtifact),ret}
