"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnFlowTemplate=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnFlowTemplate extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnFlowTemplatePropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnFlowTemplate(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnFlowTemplate.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iotthingsgraph_CfnFlowTemplateProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnFlowTemplate),error}cdk().requireProperty(props,"definition",this),this.attrId=cdk().Token.asString(this.getAtt("Id",cdk().ResolutionTypeHint.STRING)),this.compatibleNamespaceVersion=props.compatibleNamespaceVersion,this.definition=props.definition}get cfnProperties(){return{compatibleNamespaceVersion:this.compatibleNamespaceVersion,definition:this.definition}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnFlowTemplate.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnFlowTemplatePropsToCloudFormation(props)}}exports.CfnFlowTemplate=CfnFlowTemplate,_a=JSII_RTTI_SYMBOL_1,CfnFlowTemplate[_a]={fqn:"aws-cdk-lib.aws_iotthingsgraph.CfnFlowTemplate",version:"2.175.1"},CfnFlowTemplate.CFN_RESOURCE_TYPE_NAME="AWS::IoTThingsGraph::FlowTemplate";function CfnFlowTemplateDefinitionDocumentPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("language",cdk().requiredValidator)(properties.language)),errors.collect(cdk().propertyValidator("language",cdk().validateString)(properties.language)),errors.collect(cdk().propertyValidator("text",cdk().requiredValidator)(properties.text)),errors.collect(cdk().propertyValidator("text",cdk().validateString)(properties.text)),errors.wrap('supplied properties not correct for "DefinitionDocumentProperty"')}function convertCfnFlowTemplateDefinitionDocumentPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnFlowTemplateDefinitionDocumentPropertyValidator(properties).assertSuccess(),{Language:cdk().stringToCloudFormation(properties.language),Text:cdk().stringToCloudFormation(properties.text)}):properties}function CfnFlowTemplateDefinitionDocumentPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("language","Language",properties.Language!=null?cfn_parse().FromCloudFormation.getString(properties.Language):void 0),ret.addPropertyResult("text","Text",properties.Text!=null?cfn_parse().FromCloudFormation.getString(properties.Text):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnFlowTemplatePropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("compatibleNamespaceVersion",cdk().validateNumber)(properties.compatibleNamespaceVersion)),errors.collect(cdk().propertyValidator("definition",cdk().requiredValidator)(properties.definition)),errors.collect(cdk().propertyValidator("definition",CfnFlowTemplateDefinitionDocumentPropertyValidator)(properties.definition)),errors.wrap('supplied properties not correct for "CfnFlowTemplateProps"')}function convertCfnFlowTemplatePropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnFlowTemplatePropsValidator(properties).assertSuccess(),{CompatibleNamespaceVersion:cdk().numberToCloudFormation(properties.compatibleNamespaceVersion),Definition:convertCfnFlowTemplateDefinitionDocumentPropertyToCloudFormation(properties.definition)}):properties}function CfnFlowTemplatePropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("compatibleNamespaceVersion","CompatibleNamespaceVersion",properties.CompatibleNamespaceVersion!=null?cfn_parse().FromCloudFormation.getNumber(properties.CompatibleNamespaceVersion):void 0),ret.addPropertyResult("definition","Definition",properties.Definition!=null?CfnFlowTemplateDefinitionDocumentPropertyFromCloudFormation(properties.Definition):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
