"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.ConfirmPermissionsBroadening=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},cpa=()=>{var tmp=require("../../../aws-codepipeline-actions");return cpa=()=>tmp,tmp},blueprint_1=()=>{var tmp=require("../blueprint");return blueprint_1=()=>tmp,tmp},application_security_check_1=()=>{var tmp=require("../private/application-security-check");return application_security_check_1=()=>tmp,tmp};class ConfirmPermissionsBroadening extends blueprint_1().Step{constructor(id,props){super(id),this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_pipelines_PermissionsBroadeningCheckProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,ConfirmPermissionsBroadening),error}}produceAction(stage,options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_codepipeline_IStage(stage),jsiiDeprecationWarnings().aws_cdk_lib_pipelines_ProduceActionOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.produceAction),error}const sec=this.getOrCreateSecCheck(options.pipeline);this.props.notificationTopic?.grantPublish(sec.cdkDiffProject);const variablesNamespace=constructs_1().Node.of(this.props.stage).addr,approveActionName=`${options.actionName}.Confirm`;return stage.addAction(new(cpa()).CodeBuildAction({runOrder:options.runOrder,actionName:`${options.actionName}.Check`,input:options.artifacts.toCodePipeline(options.pipeline.cloudAssemblyFileSet),project:sec.cdkDiffProject,variablesNamespace,environmentVariables:{STAGE_PATH:{value:constructs_1().Node.of(this.props.stage).path},STAGE_NAME:{value:stage.stageName},ACTION_NAME:{value:approveActionName},...this.props.notificationTopic?{NOTIFICATION_ARN:{value:this.props.notificationTopic.topicArn},NOTIFICATION_SUBJECT:{value:`Confirm permission broadening in ${this.props.stage.stageName}`}}:{}}})),stage.addAction(new(cpa()).ManualApprovalAction({actionName:approveActionName,runOrder:options.runOrder+1,additionalInformation:`#{${variablesNamespace}.MESSAGE}`,externalEntityLink:`#{${variablesNamespace}.LINK}`})),{runOrdersConsumed:2}}getOrCreateSecCheck(pipeline){const id="PipelinesSecurityCheck",existing=constructs_1().Node.of(pipeline).tryFindChild(id);if(existing){if(!(existing instanceof application_security_check_1().ApplicationSecurityCheck))throw new Error(`Expected '${constructs_1().Node.of(existing).path}' to be 'ApplicationSecurityCheck' but was '${existing}'`);return existing}return new(application_security_check_1()).ApplicationSecurityCheck(pipeline,id,{codePipeline:pipeline.pipeline})}}exports.ConfirmPermissionsBroadening=ConfirmPermissionsBroadening,_a=JSII_RTTI_SYMBOL_1,ConfirmPermissionsBroadening[_a]={fqn:"aws-cdk-lib.pipelines.ConfirmPermissionsBroadening",version:"2.175.1"};
