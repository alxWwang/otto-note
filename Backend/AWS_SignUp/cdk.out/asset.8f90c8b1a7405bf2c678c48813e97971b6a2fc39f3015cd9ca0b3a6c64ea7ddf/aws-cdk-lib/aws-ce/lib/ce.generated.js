"use strict";var _a,_b,_c;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnCostCategory=exports.CfnAnomalySubscription=exports.CfnAnomalyMonitor=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnAnomalyMonitor extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnAnomalyMonitorPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnAnomalyMonitor(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnAnomalyMonitor.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ce_CfnAnomalyMonitorProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnAnomalyMonitor),error}cdk().requireProperty(props,"monitorName",this),cdk().requireProperty(props,"monitorType",this),this.attrCreationDate=cdk().Token.asString(this.getAtt("CreationDate",cdk().ResolutionTypeHint.STRING)),this.attrDimensionalValueCount=cdk().Token.asNumber(this.getAtt("DimensionalValueCount",cdk().ResolutionTypeHint.NUMBER)),this.attrLastEvaluatedDate=cdk().Token.asString(this.getAtt("LastEvaluatedDate",cdk().ResolutionTypeHint.STRING)),this.attrLastUpdatedDate=cdk().Token.asString(this.getAtt("LastUpdatedDate",cdk().ResolutionTypeHint.STRING)),this.attrMonitorArn=cdk().Token.asString(this.getAtt("MonitorArn",cdk().ResolutionTypeHint.STRING)),this.monitorDimension=props.monitorDimension,this.monitorName=props.monitorName,this.monitorSpecification=props.monitorSpecification,this.monitorType=props.monitorType,this.resourceTags=props.resourceTags}get cfnProperties(){return{monitorDimension:this.monitorDimension,monitorName:this.monitorName,monitorSpecification:this.monitorSpecification,monitorType:this.monitorType,resourceTags:this.resourceTags}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnAnomalyMonitor.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnAnomalyMonitorPropsToCloudFormation(props)}}exports.CfnAnomalyMonitor=CfnAnomalyMonitor,_a=JSII_RTTI_SYMBOL_1,CfnAnomalyMonitor[_a]={fqn:"aws-cdk-lib.aws_ce.CfnAnomalyMonitor",version:"2.175.1"},CfnAnomalyMonitor.CFN_RESOURCE_TYPE_NAME="AWS::CE::AnomalyMonitor";function CfnAnomalyMonitorResourceTagPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("key",cdk().requiredValidator)(properties.key)),errors.collect(cdk().propertyValidator("key",cdk().validateString)(properties.key)),errors.collect(cdk().propertyValidator("value",cdk().requiredValidator)(properties.value)),errors.collect(cdk().propertyValidator("value",cdk().validateString)(properties.value)),errors.wrap('supplied properties not correct for "ResourceTagProperty"')}function convertCfnAnomalyMonitorResourceTagPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnAnomalyMonitorResourceTagPropertyValidator(properties).assertSuccess(),{Key:cdk().stringToCloudFormation(properties.key),Value:cdk().stringToCloudFormation(properties.value)}):properties}function CfnAnomalyMonitorResourceTagPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("key","Key",properties.Key!=null?cfn_parse().FromCloudFormation.getString(properties.Key):void 0),ret.addPropertyResult("value","Value",properties.Value!=null?cfn_parse().FromCloudFormation.getString(properties.Value):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnAnomalyMonitorPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("monitorDimension",cdk().validateString)(properties.monitorDimension)),errors.collect(cdk().propertyValidator("monitorName",cdk().requiredValidator)(properties.monitorName)),errors.collect(cdk().propertyValidator("monitorName",cdk().validateString)(properties.monitorName)),errors.collect(cdk().propertyValidator("monitorSpecification",cdk().validateString)(properties.monitorSpecification)),errors.collect(cdk().propertyValidator("monitorType",cdk().requiredValidator)(properties.monitorType)),errors.collect(cdk().propertyValidator("monitorType",cdk().validateString)(properties.monitorType)),errors.collect(cdk().propertyValidator("resourceTags",cdk().listValidator(CfnAnomalyMonitorResourceTagPropertyValidator))(properties.resourceTags)),errors.wrap('supplied properties not correct for "CfnAnomalyMonitorProps"')}function convertCfnAnomalyMonitorPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnAnomalyMonitorPropsValidator(properties).assertSuccess(),{MonitorDimension:cdk().stringToCloudFormation(properties.monitorDimension),MonitorName:cdk().stringToCloudFormation(properties.monitorName),MonitorSpecification:cdk().stringToCloudFormation(properties.monitorSpecification),MonitorType:cdk().stringToCloudFormation(properties.monitorType),ResourceTags:cdk().listMapper(convertCfnAnomalyMonitorResourceTagPropertyToCloudFormation)(properties.resourceTags)}):properties}function CfnAnomalyMonitorPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("monitorDimension","MonitorDimension",properties.MonitorDimension!=null?cfn_parse().FromCloudFormation.getString(properties.MonitorDimension):void 0),ret.addPropertyResult("monitorName","MonitorName",properties.MonitorName!=null?cfn_parse().FromCloudFormation.getString(properties.MonitorName):void 0),ret.addPropertyResult("monitorSpecification","MonitorSpecification",properties.MonitorSpecification!=null?cfn_parse().FromCloudFormation.getString(properties.MonitorSpecification):void 0),ret.addPropertyResult("monitorType","MonitorType",properties.MonitorType!=null?cfn_parse().FromCloudFormation.getString(properties.MonitorType):void 0),ret.addPropertyResult("resourceTags","ResourceTags",properties.ResourceTags!=null?cfn_parse().FromCloudFormation.getArray(CfnAnomalyMonitorResourceTagPropertyFromCloudFormation)(properties.ResourceTags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnAnomalySubscription extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnAnomalySubscriptionPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnAnomalySubscription(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnAnomalySubscription.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ce_CfnAnomalySubscriptionProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnAnomalySubscription),error}cdk().requireProperty(props,"frequency",this),cdk().requireProperty(props,"monitorArnList",this),cdk().requireProperty(props,"subscribers",this),cdk().requireProperty(props,"subscriptionName",this),this.attrAccountId=cdk().Token.asString(this.getAtt("AccountId",cdk().ResolutionTypeHint.STRING)),this.attrSubscriptionArn=cdk().Token.asString(this.getAtt("SubscriptionArn",cdk().ResolutionTypeHint.STRING)),this.frequency=props.frequency,this.monitorArnList=props.monitorArnList,this.resourceTags=props.resourceTags,this.subscribers=props.subscribers,this.subscriptionName=props.subscriptionName,this.threshold=props.threshold,this.thresholdExpression=props.thresholdExpression}get cfnProperties(){return{frequency:this.frequency,monitorArnList:this.monitorArnList,resourceTags:this.resourceTags,subscribers:this.subscribers,subscriptionName:this.subscriptionName,threshold:this.threshold,thresholdExpression:this.thresholdExpression}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnAnomalySubscription.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnAnomalySubscriptionPropsToCloudFormation(props)}}exports.CfnAnomalySubscription=CfnAnomalySubscription,_b=JSII_RTTI_SYMBOL_1,CfnAnomalySubscription[_b]={fqn:"aws-cdk-lib.aws_ce.CfnAnomalySubscription",version:"2.175.1"},CfnAnomalySubscription.CFN_RESOURCE_TYPE_NAME="AWS::CE::AnomalySubscription";function CfnAnomalySubscriptionResourceTagPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("key",cdk().requiredValidator)(properties.key)),errors.collect(cdk().propertyValidator("key",cdk().validateString)(properties.key)),errors.collect(cdk().propertyValidator("value",cdk().requiredValidator)(properties.value)),errors.collect(cdk().propertyValidator("value",cdk().validateString)(properties.value)),errors.wrap('supplied properties not correct for "ResourceTagProperty"')}function convertCfnAnomalySubscriptionResourceTagPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnAnomalySubscriptionResourceTagPropertyValidator(properties).assertSuccess(),{Key:cdk().stringToCloudFormation(properties.key),Value:cdk().stringToCloudFormation(properties.value)}):properties}function CfnAnomalySubscriptionResourceTagPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("key","Key",properties.Key!=null?cfn_parse().FromCloudFormation.getString(properties.Key):void 0),ret.addPropertyResult("value","Value",properties.Value!=null?cfn_parse().FromCloudFormation.getString(properties.Value):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnAnomalySubscriptionSubscriberPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("address",cdk().requiredValidator)(properties.address)),errors.collect(cdk().propertyValidator("address",cdk().validateString)(properties.address)),errors.collect(cdk().propertyValidator("status",cdk().validateString)(properties.status)),errors.collect(cdk().propertyValidator("type",cdk().requiredValidator)(properties.type)),errors.collect(cdk().propertyValidator("type",cdk().validateString)(properties.type)),errors.wrap('supplied properties not correct for "SubscriberProperty"')}function convertCfnAnomalySubscriptionSubscriberPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnAnomalySubscriptionSubscriberPropertyValidator(properties).assertSuccess(),{Address:cdk().stringToCloudFormation(properties.address),Status:cdk().stringToCloudFormation(properties.status),Type:cdk().stringToCloudFormation(properties.type)}):properties}function CfnAnomalySubscriptionSubscriberPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("address","Address",properties.Address!=null?cfn_parse().FromCloudFormation.getString(properties.Address):void 0),ret.addPropertyResult("status","Status",properties.Status!=null?cfn_parse().FromCloudFormation.getString(properties.Status):void 0),ret.addPropertyResult("type","Type",properties.Type!=null?cfn_parse().FromCloudFormation.getString(properties.Type):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnAnomalySubscriptionPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("frequency",cdk().requiredValidator)(properties.frequency)),errors.collect(cdk().propertyValidator("frequency",cdk().validateString)(properties.frequency)),errors.collect(cdk().propertyValidator("monitorArnList",cdk().requiredValidator)(properties.monitorArnList)),errors.collect(cdk().propertyValidator("monitorArnList",cdk().listValidator(cdk().validateString))(properties.monitorArnList)),errors.collect(cdk().propertyValidator("resourceTags",cdk().listValidator(CfnAnomalySubscriptionResourceTagPropertyValidator))(properties.resourceTags)),errors.collect(cdk().propertyValidator("subscribers",cdk().requiredValidator)(properties.subscribers)),errors.collect(cdk().propertyValidator("subscribers",cdk().listValidator(CfnAnomalySubscriptionSubscriberPropertyValidator))(properties.subscribers)),errors.collect(cdk().propertyValidator("subscriptionName",cdk().requiredValidator)(properties.subscriptionName)),errors.collect(cdk().propertyValidator("subscriptionName",cdk().validateString)(properties.subscriptionName)),errors.collect(cdk().propertyValidator("threshold",cdk().validateNumber)(properties.threshold)),errors.collect(cdk().propertyValidator("thresholdExpression",cdk().validateString)(properties.thresholdExpression)),errors.wrap('supplied properties not correct for "CfnAnomalySubscriptionProps"')}function convertCfnAnomalySubscriptionPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnAnomalySubscriptionPropsValidator(properties).assertSuccess(),{Frequency:cdk().stringToCloudFormation(properties.frequency),MonitorArnList:cdk().listMapper(cdk().stringToCloudFormation)(properties.monitorArnList),ResourceTags:cdk().listMapper(convertCfnAnomalySubscriptionResourceTagPropertyToCloudFormation)(properties.resourceTags),Subscribers:cdk().listMapper(convertCfnAnomalySubscriptionSubscriberPropertyToCloudFormation)(properties.subscribers),SubscriptionName:cdk().stringToCloudFormation(properties.subscriptionName),Threshold:cdk().numberToCloudFormation(properties.threshold),ThresholdExpression:cdk().stringToCloudFormation(properties.thresholdExpression)}):properties}function CfnAnomalySubscriptionPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("frequency","Frequency",properties.Frequency!=null?cfn_parse().FromCloudFormation.getString(properties.Frequency):void 0),ret.addPropertyResult("monitorArnList","MonitorArnList",properties.MonitorArnList!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.MonitorArnList):void 0),ret.addPropertyResult("resourceTags","ResourceTags",properties.ResourceTags!=null?cfn_parse().FromCloudFormation.getArray(CfnAnomalySubscriptionResourceTagPropertyFromCloudFormation)(properties.ResourceTags):void 0),ret.addPropertyResult("subscribers","Subscribers",properties.Subscribers!=null?cfn_parse().FromCloudFormation.getArray(CfnAnomalySubscriptionSubscriberPropertyFromCloudFormation)(properties.Subscribers):void 0),ret.addPropertyResult("subscriptionName","SubscriptionName",properties.SubscriptionName!=null?cfn_parse().FromCloudFormation.getString(properties.SubscriptionName):void 0),ret.addPropertyResult("threshold","Threshold",properties.Threshold!=null?cfn_parse().FromCloudFormation.getNumber(properties.Threshold):void 0),ret.addPropertyResult("thresholdExpression","ThresholdExpression",properties.ThresholdExpression!=null?cfn_parse().FromCloudFormation.getString(properties.ThresholdExpression):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnCostCategory extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnCostCategoryPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnCostCategory(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnCostCategory.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ce_CfnCostCategoryProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnCostCategory),error}cdk().requireProperty(props,"name",this),cdk().requireProperty(props,"rules",this),cdk().requireProperty(props,"ruleVersion",this),this.attrArn=cdk().Token.asString(this.getAtt("Arn",cdk().ResolutionTypeHint.STRING)),this.attrEffectiveStart=cdk().Token.asString(this.getAtt("EffectiveStart",cdk().ResolutionTypeHint.STRING)),this.defaultValue=props.defaultValue,this.name=props.name,this.rules=props.rules,this.ruleVersion=props.ruleVersion,this.splitChargeRules=props.splitChargeRules}get cfnProperties(){return{defaultValue:this.defaultValue,name:this.name,rules:this.rules,ruleVersion:this.ruleVersion,splitChargeRules:this.splitChargeRules}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnCostCategory.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnCostCategoryPropsToCloudFormation(props)}}exports.CfnCostCategory=CfnCostCategory,_c=JSII_RTTI_SYMBOL_1,CfnCostCategory[_c]={fqn:"aws-cdk-lib.aws_ce.CfnCostCategory",version:"2.175.1"},CfnCostCategory.CFN_RESOURCE_TYPE_NAME="AWS::CE::CostCategory";function CfnCostCategoryPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("defaultValue",cdk().validateString)(properties.defaultValue)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("ruleVersion",cdk().requiredValidator)(properties.ruleVersion)),errors.collect(cdk().propertyValidator("ruleVersion",cdk().validateString)(properties.ruleVersion)),errors.collect(cdk().propertyValidator("rules",cdk().requiredValidator)(properties.rules)),errors.collect(cdk().propertyValidator("rules",cdk().validateString)(properties.rules)),errors.collect(cdk().propertyValidator("splitChargeRules",cdk().validateString)(properties.splitChargeRules)),errors.wrap('supplied properties not correct for "CfnCostCategoryProps"')}function convertCfnCostCategoryPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnCostCategoryPropsValidator(properties).assertSuccess(),{DefaultValue:cdk().stringToCloudFormation(properties.defaultValue),Name:cdk().stringToCloudFormation(properties.name),RuleVersion:cdk().stringToCloudFormation(properties.ruleVersion),Rules:cdk().stringToCloudFormation(properties.rules),SplitChargeRules:cdk().stringToCloudFormation(properties.splitChargeRules)}):properties}function CfnCostCategoryPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("defaultValue","DefaultValue",properties.DefaultValue!=null?cfn_parse().FromCloudFormation.getString(properties.DefaultValue):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("rules","Rules",properties.Rules!=null?cfn_parse().FromCloudFormation.getString(properties.Rules):void 0),ret.addPropertyResult("ruleVersion","RuleVersion",properties.RuleVersion!=null?cfn_parse().FromCloudFormation.getString(properties.RuleVersion):void 0),ret.addPropertyResult("splitChargeRules","SplitChargeRules",properties.SplitChargeRules!=null?cfn_parse().FromCloudFormation.getString(properties.SplitChargeRules):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
