"use strict";var _a,_b;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnResourceShare=exports.CfnPermission=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnPermission extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnPermissionPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnPermission(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnPermission.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ram_CfnPermissionProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnPermission),error}cdk().requireProperty(props,"name",this),cdk().requireProperty(props,"policyTemplate",this),cdk().requireProperty(props,"resourceType",this),this.attrArn=cdk().Token.asString(this.getAtt("Arn",cdk().ResolutionTypeHint.STRING)),this.attrIsResourceTypeDefault=this.getAtt("IsResourceTypeDefault"),this.attrPermissionType=cdk().Token.asString(this.getAtt("PermissionType",cdk().ResolutionTypeHint.STRING)),this.attrVersion=cdk().Token.asString(this.getAtt("Version",cdk().ResolutionTypeHint.STRING)),this.name=props.name,this.policyTemplate=props.policyTemplate,this.resourceType=props.resourceType,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::RAM::Permission",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{name:this.name,policyTemplate:this.policyTemplate,resourceType:this.resourceType,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnPermission.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnPermissionPropsToCloudFormation(props)}}exports.CfnPermission=CfnPermission,_a=JSII_RTTI_SYMBOL_1,CfnPermission[_a]={fqn:"aws-cdk-lib.aws_ram.CfnPermission",version:"2.175.1"},CfnPermission.CFN_RESOURCE_TYPE_NAME="AWS::RAM::Permission";function CfnPermissionPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("policyTemplate",cdk().requiredValidator)(properties.policyTemplate)),errors.collect(cdk().propertyValidator("policyTemplate",cdk().validateObject)(properties.policyTemplate)),errors.collect(cdk().propertyValidator("resourceType",cdk().requiredValidator)(properties.resourceType)),errors.collect(cdk().propertyValidator("resourceType",cdk().validateString)(properties.resourceType)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnPermissionProps"')}function convertCfnPermissionPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnPermissionPropsValidator(properties).assertSuccess(),{Name:cdk().stringToCloudFormation(properties.name),PolicyTemplate:cdk().objectToCloudFormation(properties.policyTemplate),ResourceType:cdk().stringToCloudFormation(properties.resourceType),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnPermissionPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("policyTemplate","PolicyTemplate",properties.PolicyTemplate!=null?cfn_parse().FromCloudFormation.getAny(properties.PolicyTemplate):void 0),ret.addPropertyResult("resourceType","ResourceType",properties.ResourceType!=null?cfn_parse().FromCloudFormation.getString(properties.ResourceType):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnResourceShare extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnResourceSharePropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnResourceShare(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnResourceShare.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ram_CfnResourceShareProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnResourceShare),error}cdk().requireProperty(props,"name",this),this.attrArn=cdk().Token.asString(this.getAtt("Arn",cdk().ResolutionTypeHint.STRING)),this.allowExternalPrincipals=props.allowExternalPrincipals,this.name=props.name,this.permissionArns=props.permissionArns,this.principals=props.principals,this.resourceArns=props.resourceArns,this.sources=props.sources,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::RAM::ResourceShare",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{allowExternalPrincipals:this.allowExternalPrincipals,name:this.name,permissionArns:this.permissionArns,principals:this.principals,resourceArns:this.resourceArns,sources:this.sources,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnResourceShare.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnResourceSharePropsToCloudFormation(props)}}exports.CfnResourceShare=CfnResourceShare,_b=JSII_RTTI_SYMBOL_1,CfnResourceShare[_b]={fqn:"aws-cdk-lib.aws_ram.CfnResourceShare",version:"2.175.1"},CfnResourceShare.CFN_RESOURCE_TYPE_NAME="AWS::RAM::ResourceShare";function CfnResourceSharePropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("allowExternalPrincipals",cdk().validateBoolean)(properties.allowExternalPrincipals)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("permissionArns",cdk().listValidator(cdk().validateString))(properties.permissionArns)),errors.collect(cdk().propertyValidator("principals",cdk().listValidator(cdk().validateString))(properties.principals)),errors.collect(cdk().propertyValidator("resourceArns",cdk().listValidator(cdk().validateString))(properties.resourceArns)),errors.collect(cdk().propertyValidator("sources",cdk().listValidator(cdk().validateString))(properties.sources)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnResourceShareProps"')}function convertCfnResourceSharePropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnResourceSharePropsValidator(properties).assertSuccess(),{AllowExternalPrincipals:cdk().booleanToCloudFormation(properties.allowExternalPrincipals),Name:cdk().stringToCloudFormation(properties.name),PermissionArns:cdk().listMapper(cdk().stringToCloudFormation)(properties.permissionArns),Principals:cdk().listMapper(cdk().stringToCloudFormation)(properties.principals),ResourceArns:cdk().listMapper(cdk().stringToCloudFormation)(properties.resourceArns),Sources:cdk().listMapper(cdk().stringToCloudFormation)(properties.sources),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnResourceSharePropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("allowExternalPrincipals","AllowExternalPrincipals",properties.AllowExternalPrincipals!=null?cfn_parse().FromCloudFormation.getBoolean(properties.AllowExternalPrincipals):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("permissionArns","PermissionArns",properties.PermissionArns!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.PermissionArns):void 0),ret.addPropertyResult("principals","Principals",properties.Principals!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.Principals):void 0),ret.addPropertyResult("resourceArns","ResourceArns",properties.ResourceArns!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.ResourceArns):void 0),ret.addPropertyResult("sources","Sources",properties.Sources!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.Sources):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
