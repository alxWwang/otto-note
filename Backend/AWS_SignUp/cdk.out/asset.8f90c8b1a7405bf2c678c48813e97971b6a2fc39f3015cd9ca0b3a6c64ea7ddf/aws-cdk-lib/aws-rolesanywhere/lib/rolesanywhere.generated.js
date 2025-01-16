"use strict";var _a,_b,_c;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnTrustAnchor=exports.CfnProfile=exports.CfnCRL=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnCRL extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnCRLPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnCRL(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnCRL.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rolesanywhere_CfnCRLProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnCRL),error}cdk().requireProperty(props,"crlData",this),cdk().requireProperty(props,"name",this),this.attrCrlId=cdk().Token.asString(this.getAtt("CrlId",cdk().ResolutionTypeHint.STRING)),this.crlData=props.crlData,this.enabled=props.enabled,this.name=props.name,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::RolesAnywhere::CRL",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags,this.trustAnchorArn=props.trustAnchorArn}get cfnProperties(){return{crlData:this.crlData,enabled:this.enabled,name:this.name,tags:this.tags.renderTags(),trustAnchorArn:this.trustAnchorArn}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnCRL.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnCRLPropsToCloudFormation(props)}}exports.CfnCRL=CfnCRL,_a=JSII_RTTI_SYMBOL_1,CfnCRL[_a]={fqn:"aws-cdk-lib.aws_rolesanywhere.CfnCRL",version:"2.175.1"},CfnCRL.CFN_RESOURCE_TYPE_NAME="AWS::RolesAnywhere::CRL";function CfnCRLPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("crlData",cdk().requiredValidator)(properties.crlData)),errors.collect(cdk().propertyValidator("crlData",cdk().validateString)(properties.crlData)),errors.collect(cdk().propertyValidator("enabled",cdk().validateBoolean)(properties.enabled)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.collect(cdk().propertyValidator("trustAnchorArn",cdk().validateString)(properties.trustAnchorArn)),errors.wrap('supplied properties not correct for "CfnCRLProps"')}function convertCfnCRLPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnCRLPropsValidator(properties).assertSuccess(),{CrlData:cdk().stringToCloudFormation(properties.crlData),Enabled:cdk().booleanToCloudFormation(properties.enabled),Name:cdk().stringToCloudFormation(properties.name),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags),TrustAnchorArn:cdk().stringToCloudFormation(properties.trustAnchorArn)}):properties}function CfnCRLPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("crlData","CrlData",properties.CrlData!=null?cfn_parse().FromCloudFormation.getString(properties.CrlData):void 0),ret.addPropertyResult("enabled","Enabled",properties.Enabled!=null?cfn_parse().FromCloudFormation.getBoolean(properties.Enabled):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addPropertyResult("trustAnchorArn","TrustAnchorArn",properties.TrustAnchorArn!=null?cfn_parse().FromCloudFormation.getString(properties.TrustAnchorArn):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnProfile extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnProfilePropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnProfile(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnProfile.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rolesanywhere_CfnProfileProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnProfile),error}cdk().requireProperty(props,"name",this),cdk().requireProperty(props,"roleArns",this),this.attrProfileArn=cdk().Token.asString(this.getAtt("ProfileArn",cdk().ResolutionTypeHint.STRING)),this.attrProfileId=cdk().Token.asString(this.getAtt("ProfileId",cdk().ResolutionTypeHint.STRING)),this.acceptRoleSessionName=props.acceptRoleSessionName,this.attributeMappings=props.attributeMappings,this.durationSeconds=props.durationSeconds,this.enabled=props.enabled,this.managedPolicyArns=props.managedPolicyArns,this.name=props.name,this.requireInstanceProperties=props.requireInstanceProperties,this.roleArns=props.roleArns,this.sessionPolicy=props.sessionPolicy,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::RolesAnywhere::Profile",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{acceptRoleSessionName:this.acceptRoleSessionName,attributeMappings:this.attributeMappings,durationSeconds:this.durationSeconds,enabled:this.enabled,managedPolicyArns:this.managedPolicyArns,name:this.name,requireInstanceProperties:this.requireInstanceProperties,roleArns:this.roleArns,sessionPolicy:this.sessionPolicy,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnProfile.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnProfilePropsToCloudFormation(props)}}exports.CfnProfile=CfnProfile,_b=JSII_RTTI_SYMBOL_1,CfnProfile[_b]={fqn:"aws-cdk-lib.aws_rolesanywhere.CfnProfile",version:"2.175.1"},CfnProfile.CFN_RESOURCE_TYPE_NAME="AWS::RolesAnywhere::Profile";function CfnProfileMappingRulePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("specifier",cdk().requiredValidator)(properties.specifier)),errors.collect(cdk().propertyValidator("specifier",cdk().validateString)(properties.specifier)),errors.wrap('supplied properties not correct for "MappingRuleProperty"')}function convertCfnProfileMappingRulePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnProfileMappingRulePropertyValidator(properties).assertSuccess(),{Specifier:cdk().stringToCloudFormation(properties.specifier)}):properties}function CfnProfileMappingRulePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("specifier","Specifier",properties.Specifier!=null?cfn_parse().FromCloudFormation.getString(properties.Specifier):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnProfileAttributeMappingPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("certificateField",cdk().requiredValidator)(properties.certificateField)),errors.collect(cdk().propertyValidator("certificateField",cdk().validateString)(properties.certificateField)),errors.collect(cdk().propertyValidator("mappingRules",cdk().requiredValidator)(properties.mappingRules)),errors.collect(cdk().propertyValidator("mappingRules",cdk().listValidator(CfnProfileMappingRulePropertyValidator))(properties.mappingRules)),errors.wrap('supplied properties not correct for "AttributeMappingProperty"')}function convertCfnProfileAttributeMappingPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnProfileAttributeMappingPropertyValidator(properties).assertSuccess(),{CertificateField:cdk().stringToCloudFormation(properties.certificateField),MappingRules:cdk().listMapper(convertCfnProfileMappingRulePropertyToCloudFormation)(properties.mappingRules)}):properties}function CfnProfileAttributeMappingPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("certificateField","CertificateField",properties.CertificateField!=null?cfn_parse().FromCloudFormation.getString(properties.CertificateField):void 0),ret.addPropertyResult("mappingRules","MappingRules",properties.MappingRules!=null?cfn_parse().FromCloudFormation.getArray(CfnProfileMappingRulePropertyFromCloudFormation)(properties.MappingRules):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnProfilePropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("acceptRoleSessionName",cdk().validateBoolean)(properties.acceptRoleSessionName)),errors.collect(cdk().propertyValidator("attributeMappings",cdk().listValidator(CfnProfileAttributeMappingPropertyValidator))(properties.attributeMappings)),errors.collect(cdk().propertyValidator("durationSeconds",cdk().validateNumber)(properties.durationSeconds)),errors.collect(cdk().propertyValidator("enabled",cdk().validateBoolean)(properties.enabled)),errors.collect(cdk().propertyValidator("managedPolicyArns",cdk().listValidator(cdk().validateString))(properties.managedPolicyArns)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("requireInstanceProperties",cdk().validateBoolean)(properties.requireInstanceProperties)),errors.collect(cdk().propertyValidator("roleArns",cdk().requiredValidator)(properties.roleArns)),errors.collect(cdk().propertyValidator("roleArns",cdk().listValidator(cdk().validateString))(properties.roleArns)),errors.collect(cdk().propertyValidator("sessionPolicy",cdk().validateString)(properties.sessionPolicy)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnProfileProps"')}function convertCfnProfilePropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnProfilePropsValidator(properties).assertSuccess(),{AcceptRoleSessionName:cdk().booleanToCloudFormation(properties.acceptRoleSessionName),AttributeMappings:cdk().listMapper(convertCfnProfileAttributeMappingPropertyToCloudFormation)(properties.attributeMappings),DurationSeconds:cdk().numberToCloudFormation(properties.durationSeconds),Enabled:cdk().booleanToCloudFormation(properties.enabled),ManagedPolicyArns:cdk().listMapper(cdk().stringToCloudFormation)(properties.managedPolicyArns),Name:cdk().stringToCloudFormation(properties.name),RequireInstanceProperties:cdk().booleanToCloudFormation(properties.requireInstanceProperties),RoleArns:cdk().listMapper(cdk().stringToCloudFormation)(properties.roleArns),SessionPolicy:cdk().stringToCloudFormation(properties.sessionPolicy),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnProfilePropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("acceptRoleSessionName","AcceptRoleSessionName",properties.AcceptRoleSessionName!=null?cfn_parse().FromCloudFormation.getBoolean(properties.AcceptRoleSessionName):void 0),ret.addPropertyResult("attributeMappings","AttributeMappings",properties.AttributeMappings!=null?cfn_parse().FromCloudFormation.getArray(CfnProfileAttributeMappingPropertyFromCloudFormation)(properties.AttributeMappings):void 0),ret.addPropertyResult("durationSeconds","DurationSeconds",properties.DurationSeconds!=null?cfn_parse().FromCloudFormation.getNumber(properties.DurationSeconds):void 0),ret.addPropertyResult("enabled","Enabled",properties.Enabled!=null?cfn_parse().FromCloudFormation.getBoolean(properties.Enabled):void 0),ret.addPropertyResult("managedPolicyArns","ManagedPolicyArns",properties.ManagedPolicyArns!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.ManagedPolicyArns):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("requireInstanceProperties","RequireInstanceProperties",properties.RequireInstanceProperties!=null?cfn_parse().FromCloudFormation.getBoolean(properties.RequireInstanceProperties):void 0),ret.addPropertyResult("roleArns","RoleArns",properties.RoleArns!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.RoleArns):void 0),ret.addPropertyResult("sessionPolicy","SessionPolicy",properties.SessionPolicy!=null?cfn_parse().FromCloudFormation.getString(properties.SessionPolicy):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnTrustAnchor extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnTrustAnchorPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnTrustAnchor(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnTrustAnchor.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rolesanywhere_CfnTrustAnchorProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnTrustAnchor),error}cdk().requireProperty(props,"name",this),cdk().requireProperty(props,"source",this),this.attrTrustAnchorArn=cdk().Token.asString(this.getAtt("TrustAnchorArn",cdk().ResolutionTypeHint.STRING)),this.attrTrustAnchorId=cdk().Token.asString(this.getAtt("TrustAnchorId",cdk().ResolutionTypeHint.STRING)),this.enabled=props.enabled,this.name=props.name,this.notificationSettings=props.notificationSettings,this.source=props.source,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::RolesAnywhere::TrustAnchor",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{enabled:this.enabled,name:this.name,notificationSettings:this.notificationSettings,source:this.source,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnTrustAnchor.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnTrustAnchorPropsToCloudFormation(props)}}exports.CfnTrustAnchor=CfnTrustAnchor,_c=JSII_RTTI_SYMBOL_1,CfnTrustAnchor[_c]={fqn:"aws-cdk-lib.aws_rolesanywhere.CfnTrustAnchor",version:"2.175.1"},CfnTrustAnchor.CFN_RESOURCE_TYPE_NAME="AWS::RolesAnywhere::TrustAnchor";function CfnTrustAnchorNotificationSettingPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("channel",cdk().validateString)(properties.channel)),errors.collect(cdk().propertyValidator("enabled",cdk().requiredValidator)(properties.enabled)),errors.collect(cdk().propertyValidator("enabled",cdk().validateBoolean)(properties.enabled)),errors.collect(cdk().propertyValidator("event",cdk().requiredValidator)(properties.event)),errors.collect(cdk().propertyValidator("event",cdk().validateString)(properties.event)),errors.collect(cdk().propertyValidator("threshold",cdk().validateNumber)(properties.threshold)),errors.wrap('supplied properties not correct for "NotificationSettingProperty"')}function convertCfnTrustAnchorNotificationSettingPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnTrustAnchorNotificationSettingPropertyValidator(properties).assertSuccess(),{Channel:cdk().stringToCloudFormation(properties.channel),Enabled:cdk().booleanToCloudFormation(properties.enabled),Event:cdk().stringToCloudFormation(properties.event),Threshold:cdk().numberToCloudFormation(properties.threshold)}):properties}function CfnTrustAnchorNotificationSettingPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("channel","Channel",properties.Channel!=null?cfn_parse().FromCloudFormation.getString(properties.Channel):void 0),ret.addPropertyResult("enabled","Enabled",properties.Enabled!=null?cfn_parse().FromCloudFormation.getBoolean(properties.Enabled):void 0),ret.addPropertyResult("event","Event",properties.Event!=null?cfn_parse().FromCloudFormation.getString(properties.Event):void 0),ret.addPropertyResult("threshold","Threshold",properties.Threshold!=null?cfn_parse().FromCloudFormation.getNumber(properties.Threshold):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnTrustAnchorSourceDataPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("acmPcaArn",cdk().validateString)(properties.acmPcaArn)),errors.collect(cdk().propertyValidator("x509CertificateData",cdk().validateString)(properties.x509CertificateData)),errors.wrap('supplied properties not correct for "SourceDataProperty"')}function convertCfnTrustAnchorSourceDataPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnTrustAnchorSourceDataPropertyValidator(properties).assertSuccess(),{AcmPcaArn:cdk().stringToCloudFormation(properties.acmPcaArn),X509CertificateData:cdk().stringToCloudFormation(properties.x509CertificateData)}):properties}function CfnTrustAnchorSourceDataPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("acmPcaArn","AcmPcaArn",properties.AcmPcaArn!=null?cfn_parse().FromCloudFormation.getString(properties.AcmPcaArn):void 0),ret.addPropertyResult("x509CertificateData","X509CertificateData",properties.X509CertificateData!=null?cfn_parse().FromCloudFormation.getString(properties.X509CertificateData):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnTrustAnchorSourcePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("sourceData",CfnTrustAnchorSourceDataPropertyValidator)(properties.sourceData)),errors.collect(cdk().propertyValidator("sourceType",cdk().validateString)(properties.sourceType)),errors.wrap('supplied properties not correct for "SourceProperty"')}function convertCfnTrustAnchorSourcePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnTrustAnchorSourcePropertyValidator(properties).assertSuccess(),{SourceData:convertCfnTrustAnchorSourceDataPropertyToCloudFormation(properties.sourceData),SourceType:cdk().stringToCloudFormation(properties.sourceType)}):properties}function CfnTrustAnchorSourcePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("sourceData","SourceData",properties.SourceData!=null?CfnTrustAnchorSourceDataPropertyFromCloudFormation(properties.SourceData):void 0),ret.addPropertyResult("sourceType","SourceType",properties.SourceType!=null?cfn_parse().FromCloudFormation.getString(properties.SourceType):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnTrustAnchorPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("enabled",cdk().validateBoolean)(properties.enabled)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("notificationSettings",cdk().listValidator(CfnTrustAnchorNotificationSettingPropertyValidator))(properties.notificationSettings)),errors.collect(cdk().propertyValidator("source",cdk().requiredValidator)(properties.source)),errors.collect(cdk().propertyValidator("source",CfnTrustAnchorSourcePropertyValidator)(properties.source)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnTrustAnchorProps"')}function convertCfnTrustAnchorPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnTrustAnchorPropsValidator(properties).assertSuccess(),{Enabled:cdk().booleanToCloudFormation(properties.enabled),Name:cdk().stringToCloudFormation(properties.name),NotificationSettings:cdk().listMapper(convertCfnTrustAnchorNotificationSettingPropertyToCloudFormation)(properties.notificationSettings),Source:convertCfnTrustAnchorSourcePropertyToCloudFormation(properties.source),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnTrustAnchorPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("enabled","Enabled",properties.Enabled!=null?cfn_parse().FromCloudFormation.getBoolean(properties.Enabled):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("notificationSettings","NotificationSettings",properties.NotificationSettings!=null?cfn_parse().FromCloudFormation.getArray(CfnTrustAnchorNotificationSettingPropertyFromCloudFormation)(properties.NotificationSettings):void 0),ret.addPropertyResult("source","Source",properties.Source!=null?CfnTrustAnchorSourcePropertyFromCloudFormation(properties.Source):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
