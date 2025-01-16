"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.AwsApi=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var util_1=()=>{var tmp=require("./util");return util_1=()=>tmp,tmp},events=()=>{var tmp=require("../../aws-events");return events=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},aws_api_provider_generated_1=()=>{var tmp=require("../../custom-resource-handlers/dist/aws-events-targets/aws-api-provider.generated");return aws_api_provider_generated_1=()=>tmp,tmp},metadata=()=>{var tmp=require("../../custom-resources/lib/helpers-internal/sdk-v3-metadata.json");return metadata=()=>tmp,tmp};const awsSdkMetadata=metadata();class AwsApi{constructor(props){this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_events_targets_AwsApiProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,AwsApi),error}}bind(rule,id){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_events_IRule(rule)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}const handler=new(aws_api_provider_generated_1()).AwsApiSingletonFunction(rule,`${rule.node.id}${id}Handler`,{timeout:core_1().Duration.seconds(60),memorySize:256,uuid:"b4cf1abd-4e4f-4bc6-9944-1af7ccd9ec37",lambdaPurpose:"AWS"});checkServiceExists(this.props.service,handler),this.props.policyStatement?handler.addToRolePolicy(this.props.policyStatement):handler.addToRolePolicy(new(iam()).PolicyStatement({actions:[awsSdkToIamAction(this.props.service,this.props.action)],resources:["*"]})),(0,util_1().addLambdaPermission)(rule,handler);const input={service:this.props.service,action:this.props.action,parameters:this.props.parameters,catchErrorPattern:this.props.catchErrorPattern,apiVersion:this.props.apiVersion};return{arn:handler.functionArn,input:events().RuleTargetInput.fromObject(input),targetResource:handler}}}exports.AwsApi=AwsApi,_a=JSII_RTTI_SYMBOL_1,AwsApi[_a]={fqn:"aws-cdk-lib.aws_events_targets.AwsApi",version:"2.175.1"};function checkServiceExists(service,handler){awsSdkMetadata[service.toLowerCase()]||core_1().Annotations.of(handler).addWarningV2(`@aws-cdk/aws-events-targets:${service}DoesNotExist`,`Service ${service} does not exist in the AWS SDK. Check the list of available services and actions from https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html`)}function awsSdkToIamAction(service,action){const srv=service.toLowerCase(),iamService=awsSdkMetadata[srv].iamPrefix||srv,iamAction=action.charAt(0).toUpperCase()+action.slice(1);return`${iamService}:${iamAction}`}
