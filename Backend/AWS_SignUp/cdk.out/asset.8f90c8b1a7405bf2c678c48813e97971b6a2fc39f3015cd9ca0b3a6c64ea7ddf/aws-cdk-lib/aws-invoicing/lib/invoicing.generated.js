"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnInvoiceUnit=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnInvoiceUnit extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnInvoiceUnitPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnInvoiceUnit(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnInvoiceUnit.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_invoicing_CfnInvoiceUnitProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnInvoiceUnit),error}cdk().requireProperty(props,"invoiceReceiver",this),cdk().requireProperty(props,"name",this),cdk().requireProperty(props,"rule",this),this.attrInvoiceUnitArn=cdk().Token.asString(this.getAtt("InvoiceUnitArn",cdk().ResolutionTypeHint.STRING)),this.attrLastModified=this.getAtt("LastModified",cdk().ResolutionTypeHint.NUMBER),this.cdkTagManager=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::Invoicing::InvoiceUnit",void 0,{tagPropertyName:"resourceTags"}),this.description=props.description,this.invoiceReceiver=props.invoiceReceiver,this.name=props.name,this.resourceTags=props.resourceTags,this.rule=props.rule,this.taxInheritanceDisabled=props.taxInheritanceDisabled}get cfnProperties(){return{resourceTags:this.cdkTagManager.renderTags(this.resourceTags),description:this.description,invoiceReceiver:this.invoiceReceiver,name:this.name,rule:this.rule,taxInheritanceDisabled:this.taxInheritanceDisabled}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnInvoiceUnit.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnInvoiceUnitPropsToCloudFormation(props)}}exports.CfnInvoiceUnit=CfnInvoiceUnit,_a=JSII_RTTI_SYMBOL_1,CfnInvoiceUnit[_a]={fqn:"aws-cdk-lib.aws_invoicing.CfnInvoiceUnit",version:"2.175.1"},CfnInvoiceUnit.CFN_RESOURCE_TYPE_NAME="AWS::Invoicing::InvoiceUnit";function CfnInvoiceUnitRulePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("linkedAccounts",cdk().requiredValidator)(properties.linkedAccounts)),errors.collect(cdk().propertyValidator("linkedAccounts",cdk().listValidator(cdk().validateString))(properties.linkedAccounts)),errors.wrap('supplied properties not correct for "RuleProperty"')}function convertCfnInvoiceUnitRulePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnInvoiceUnitRulePropertyValidator(properties).assertSuccess(),{LinkedAccounts:cdk().listMapper(cdk().stringToCloudFormation)(properties.linkedAccounts)}):properties}function CfnInvoiceUnitRulePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("linkedAccounts","LinkedAccounts",properties.LinkedAccounts!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.LinkedAccounts):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnInvoiceUnitResourceTagPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("key",cdk().requiredValidator)(properties.key)),errors.collect(cdk().propertyValidator("key",cdk().validateString)(properties.key)),errors.collect(cdk().propertyValidator("value",cdk().requiredValidator)(properties.value)),errors.collect(cdk().propertyValidator("value",cdk().validateString)(properties.value)),errors.wrap('supplied properties not correct for "ResourceTagProperty"')}function convertCfnInvoiceUnitResourceTagPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnInvoiceUnitResourceTagPropertyValidator(properties).assertSuccess(),{Key:cdk().stringToCloudFormation(properties.key),Value:cdk().stringToCloudFormation(properties.value)}):properties}function CfnInvoiceUnitResourceTagPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("key","Key",properties.Key!=null?cfn_parse().FromCloudFormation.getString(properties.Key):void 0),ret.addPropertyResult("value","Value",properties.Value!=null?cfn_parse().FromCloudFormation.getString(properties.Value):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnInvoiceUnitPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("description",cdk().validateString)(properties.description)),errors.collect(cdk().propertyValidator("invoiceReceiver",cdk().requiredValidator)(properties.invoiceReceiver)),errors.collect(cdk().propertyValidator("invoiceReceiver",cdk().validateString)(properties.invoiceReceiver)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("resourceTags",cdk().listValidator(CfnInvoiceUnitResourceTagPropertyValidator))(properties.resourceTags)),errors.collect(cdk().propertyValidator("rule",cdk().requiredValidator)(properties.rule)),errors.collect(cdk().propertyValidator("rule",CfnInvoiceUnitRulePropertyValidator)(properties.rule)),errors.collect(cdk().propertyValidator("taxInheritanceDisabled",cdk().validateBoolean)(properties.taxInheritanceDisabled)),errors.wrap('supplied properties not correct for "CfnInvoiceUnitProps"')}function convertCfnInvoiceUnitPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnInvoiceUnitPropsValidator(properties).assertSuccess(),{Description:cdk().stringToCloudFormation(properties.description),InvoiceReceiver:cdk().stringToCloudFormation(properties.invoiceReceiver),Name:cdk().stringToCloudFormation(properties.name),ResourceTags:cdk().listMapper(convertCfnInvoiceUnitResourceTagPropertyToCloudFormation)(properties.resourceTags),Rule:convertCfnInvoiceUnitRulePropertyToCloudFormation(properties.rule),TaxInheritanceDisabled:cdk().booleanToCloudFormation(properties.taxInheritanceDisabled)}):properties}function CfnInvoiceUnitPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("description","Description",properties.Description!=null?cfn_parse().FromCloudFormation.getString(properties.Description):void 0),ret.addPropertyResult("invoiceReceiver","InvoiceReceiver",properties.InvoiceReceiver!=null?cfn_parse().FromCloudFormation.getString(properties.InvoiceReceiver):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("resourceTags","ResourceTags",properties.ResourceTags!=null?cfn_parse().FromCloudFormation.getArray(CfnInvoiceUnitResourceTagPropertyFromCloudFormation)(properties.ResourceTags):void 0),ret.addPropertyResult("rule","Rule",properties.Rule!=null?CfnInvoiceUnitRulePropertyFromCloudFormation(properties.Rule):void 0),ret.addPropertyResult("taxInheritanceDisabled","TaxInheritanceDisabled",properties.TaxInheritanceDisabled!=null?cfn_parse().FromCloudFormation.getBoolean(properties.TaxInheritanceDisabled):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
