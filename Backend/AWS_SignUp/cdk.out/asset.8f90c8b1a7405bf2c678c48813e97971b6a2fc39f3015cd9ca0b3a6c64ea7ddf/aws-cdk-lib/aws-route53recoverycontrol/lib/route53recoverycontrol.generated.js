"use strict";var _a,_b,_c,_d;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnSafetyRule=exports.CfnRoutingControl=exports.CfnControlPanel=exports.CfnCluster=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnCluster extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnClusterPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnCluster(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnCluster.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53recoverycontrol_CfnClusterProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnCluster),error}cdk().requireProperty(props,"name",this),this.attrClusterArn=cdk().Token.asString(this.getAtt("ClusterArn",cdk().ResolutionTypeHint.STRING)),this.attrClusterEndpoints=this.getAtt("ClusterEndpoints"),this.attrStatus=cdk().Token.asString(this.getAtt("Status",cdk().ResolutionTypeHint.STRING)),this.name=props.name,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::Route53RecoveryControl::Cluster",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{name:this.name,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnCluster.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnClusterPropsToCloudFormation(props)}}exports.CfnCluster=CfnCluster,_a=JSII_RTTI_SYMBOL_1,CfnCluster[_a]={fqn:"aws-cdk-lib.aws_route53recoverycontrol.CfnCluster",version:"2.175.1"},CfnCluster.CFN_RESOURCE_TYPE_NAME="AWS::Route53RecoveryControl::Cluster";function CfnClusterClusterEndpointPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("endpoint",cdk().validateString)(properties.endpoint)),errors.collect(cdk().propertyValidator("region",cdk().validateString)(properties.region)),errors.wrap('supplied properties not correct for "ClusterEndpointProperty"')}function convertCfnClusterClusterEndpointPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnClusterClusterEndpointPropertyValidator(properties).assertSuccess(),{Endpoint:cdk().stringToCloudFormation(properties.endpoint),Region:cdk().stringToCloudFormation(properties.region)}):properties}function CfnClusterClusterEndpointPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("endpoint","Endpoint",properties.Endpoint!=null?cfn_parse().FromCloudFormation.getString(properties.Endpoint):void 0),ret.addPropertyResult("region","Region",properties.Region!=null?cfn_parse().FromCloudFormation.getString(properties.Region):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnClusterPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnClusterProps"')}function convertCfnClusterPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnClusterPropsValidator(properties).assertSuccess(),{Name:cdk().stringToCloudFormation(properties.name),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnClusterPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnControlPanel extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnControlPanelPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnControlPanel(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnControlPanel.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53recoverycontrol_CfnControlPanelProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnControlPanel),error}cdk().requireProperty(props,"name",this),this.attrControlPanelArn=cdk().Token.asString(this.getAtt("ControlPanelArn",cdk().ResolutionTypeHint.STRING)),this.attrDefaultControlPanel=this.getAtt("DefaultControlPanel"),this.attrRoutingControlCount=cdk().Token.asNumber(this.getAtt("RoutingControlCount",cdk().ResolutionTypeHint.NUMBER)),this.attrStatus=cdk().Token.asString(this.getAtt("Status",cdk().ResolutionTypeHint.STRING)),this.clusterArn=props.clusterArn,this.name=props.name,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::Route53RecoveryControl::ControlPanel",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{clusterArn:this.clusterArn,name:this.name,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnControlPanel.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnControlPanelPropsToCloudFormation(props)}}exports.CfnControlPanel=CfnControlPanel,_b=JSII_RTTI_SYMBOL_1,CfnControlPanel[_b]={fqn:"aws-cdk-lib.aws_route53recoverycontrol.CfnControlPanel",version:"2.175.1"},CfnControlPanel.CFN_RESOURCE_TYPE_NAME="AWS::Route53RecoveryControl::ControlPanel";function CfnControlPanelPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("clusterArn",cdk().validateString)(properties.clusterArn)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnControlPanelProps"')}function convertCfnControlPanelPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnControlPanelPropsValidator(properties).assertSuccess(),{ClusterArn:cdk().stringToCloudFormation(properties.clusterArn),Name:cdk().stringToCloudFormation(properties.name),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnControlPanelPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("clusterArn","ClusterArn",properties.ClusterArn!=null?cfn_parse().FromCloudFormation.getString(properties.ClusterArn):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnRoutingControl extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnRoutingControlPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnRoutingControl(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnRoutingControl.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53recoverycontrol_CfnRoutingControlProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnRoutingControl),error}cdk().requireProperty(props,"name",this),this.attrRoutingControlArn=cdk().Token.asString(this.getAtt("RoutingControlArn",cdk().ResolutionTypeHint.STRING)),this.attrStatus=cdk().Token.asString(this.getAtt("Status",cdk().ResolutionTypeHint.STRING)),this.clusterArn=props.clusterArn,this.controlPanelArn=props.controlPanelArn,this.name=props.name}get cfnProperties(){return{clusterArn:this.clusterArn,controlPanelArn:this.controlPanelArn,name:this.name}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnRoutingControl.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnRoutingControlPropsToCloudFormation(props)}}exports.CfnRoutingControl=CfnRoutingControl,_c=JSII_RTTI_SYMBOL_1,CfnRoutingControl[_c]={fqn:"aws-cdk-lib.aws_route53recoverycontrol.CfnRoutingControl",version:"2.175.1"},CfnRoutingControl.CFN_RESOURCE_TYPE_NAME="AWS::Route53RecoveryControl::RoutingControl";function CfnRoutingControlPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("clusterArn",cdk().validateString)(properties.clusterArn)),errors.collect(cdk().propertyValidator("controlPanelArn",cdk().validateString)(properties.controlPanelArn)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.wrap('supplied properties not correct for "CfnRoutingControlProps"')}function convertCfnRoutingControlPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnRoutingControlPropsValidator(properties).assertSuccess(),{ClusterArn:cdk().stringToCloudFormation(properties.clusterArn),ControlPanelArn:cdk().stringToCloudFormation(properties.controlPanelArn),Name:cdk().stringToCloudFormation(properties.name)}):properties}function CfnRoutingControlPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("clusterArn","ClusterArn",properties.ClusterArn!=null?cfn_parse().FromCloudFormation.getString(properties.ClusterArn):void 0),ret.addPropertyResult("controlPanelArn","ControlPanelArn",properties.ControlPanelArn!=null?cfn_parse().FromCloudFormation.getString(properties.ControlPanelArn):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnSafetyRule extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnSafetyRulePropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnSafetyRule(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnSafetyRule.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53recoverycontrol_CfnSafetyRuleProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnSafetyRule),error}cdk().requireProperty(props,"controlPanelArn",this),cdk().requireProperty(props,"name",this),cdk().requireProperty(props,"ruleConfig",this),this.attrSafetyRuleArn=cdk().Token.asString(this.getAtt("SafetyRuleArn",cdk().ResolutionTypeHint.STRING)),this.attrStatus=cdk().Token.asString(this.getAtt("Status",cdk().ResolutionTypeHint.STRING)),this.assertionRule=props.assertionRule,this.controlPanelArn=props.controlPanelArn,this.gatingRule=props.gatingRule,this.name=props.name,this.ruleConfig=props.ruleConfig,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::Route53RecoveryControl::SafetyRule",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{assertionRule:this.assertionRule,controlPanelArn:this.controlPanelArn,gatingRule:this.gatingRule,name:this.name,ruleConfig:this.ruleConfig,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnSafetyRule.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnSafetyRulePropsToCloudFormation(props)}}exports.CfnSafetyRule=CfnSafetyRule,_d=JSII_RTTI_SYMBOL_1,CfnSafetyRule[_d]={fqn:"aws-cdk-lib.aws_route53recoverycontrol.CfnSafetyRule",version:"2.175.1"},CfnSafetyRule.CFN_RESOURCE_TYPE_NAME="AWS::Route53RecoveryControl::SafetyRule";function CfnSafetyRuleAssertionRulePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("assertedControls",cdk().requiredValidator)(properties.assertedControls)),errors.collect(cdk().propertyValidator("assertedControls",cdk().listValidator(cdk().validateString))(properties.assertedControls)),errors.collect(cdk().propertyValidator("waitPeriodMs",cdk().requiredValidator)(properties.waitPeriodMs)),errors.collect(cdk().propertyValidator("waitPeriodMs",cdk().validateNumber)(properties.waitPeriodMs)),errors.wrap('supplied properties not correct for "AssertionRuleProperty"')}function convertCfnSafetyRuleAssertionRulePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSafetyRuleAssertionRulePropertyValidator(properties).assertSuccess(),{AssertedControls:cdk().listMapper(cdk().stringToCloudFormation)(properties.assertedControls),WaitPeriodMs:cdk().numberToCloudFormation(properties.waitPeriodMs)}):properties}function CfnSafetyRuleAssertionRulePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("assertedControls","AssertedControls",properties.AssertedControls!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.AssertedControls):void 0),ret.addPropertyResult("waitPeriodMs","WaitPeriodMs",properties.WaitPeriodMs!=null?cfn_parse().FromCloudFormation.getNumber(properties.WaitPeriodMs):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnSafetyRuleRuleConfigPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("inverted",cdk().requiredValidator)(properties.inverted)),errors.collect(cdk().propertyValidator("inverted",cdk().validateBoolean)(properties.inverted)),errors.collect(cdk().propertyValidator("threshold",cdk().requiredValidator)(properties.threshold)),errors.collect(cdk().propertyValidator("threshold",cdk().validateNumber)(properties.threshold)),errors.collect(cdk().propertyValidator("type",cdk().requiredValidator)(properties.type)),errors.collect(cdk().propertyValidator("type",cdk().validateString)(properties.type)),errors.wrap('supplied properties not correct for "RuleConfigProperty"')}function convertCfnSafetyRuleRuleConfigPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSafetyRuleRuleConfigPropertyValidator(properties).assertSuccess(),{Inverted:cdk().booleanToCloudFormation(properties.inverted),Threshold:cdk().numberToCloudFormation(properties.threshold),Type:cdk().stringToCloudFormation(properties.type)}):properties}function CfnSafetyRuleRuleConfigPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("inverted","Inverted",properties.Inverted!=null?cfn_parse().FromCloudFormation.getBoolean(properties.Inverted):void 0),ret.addPropertyResult("threshold","Threshold",properties.Threshold!=null?cfn_parse().FromCloudFormation.getNumber(properties.Threshold):void 0),ret.addPropertyResult("type","Type",properties.Type!=null?cfn_parse().FromCloudFormation.getString(properties.Type):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnSafetyRuleGatingRulePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("gatingControls",cdk().requiredValidator)(properties.gatingControls)),errors.collect(cdk().propertyValidator("gatingControls",cdk().listValidator(cdk().validateString))(properties.gatingControls)),errors.collect(cdk().propertyValidator("targetControls",cdk().requiredValidator)(properties.targetControls)),errors.collect(cdk().propertyValidator("targetControls",cdk().listValidator(cdk().validateString))(properties.targetControls)),errors.collect(cdk().propertyValidator("waitPeriodMs",cdk().requiredValidator)(properties.waitPeriodMs)),errors.collect(cdk().propertyValidator("waitPeriodMs",cdk().validateNumber)(properties.waitPeriodMs)),errors.wrap('supplied properties not correct for "GatingRuleProperty"')}function convertCfnSafetyRuleGatingRulePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSafetyRuleGatingRulePropertyValidator(properties).assertSuccess(),{GatingControls:cdk().listMapper(cdk().stringToCloudFormation)(properties.gatingControls),TargetControls:cdk().listMapper(cdk().stringToCloudFormation)(properties.targetControls),WaitPeriodMs:cdk().numberToCloudFormation(properties.waitPeriodMs)}):properties}function CfnSafetyRuleGatingRulePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("gatingControls","GatingControls",properties.GatingControls!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.GatingControls):void 0),ret.addPropertyResult("targetControls","TargetControls",properties.TargetControls!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.TargetControls):void 0),ret.addPropertyResult("waitPeriodMs","WaitPeriodMs",properties.WaitPeriodMs!=null?cfn_parse().FromCloudFormation.getNumber(properties.WaitPeriodMs):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnSafetyRulePropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("assertionRule",CfnSafetyRuleAssertionRulePropertyValidator)(properties.assertionRule)),errors.collect(cdk().propertyValidator("controlPanelArn",cdk().requiredValidator)(properties.controlPanelArn)),errors.collect(cdk().propertyValidator("controlPanelArn",cdk().validateString)(properties.controlPanelArn)),errors.collect(cdk().propertyValidator("gatingRule",CfnSafetyRuleGatingRulePropertyValidator)(properties.gatingRule)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("ruleConfig",cdk().requiredValidator)(properties.ruleConfig)),errors.collect(cdk().propertyValidator("ruleConfig",CfnSafetyRuleRuleConfigPropertyValidator)(properties.ruleConfig)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnSafetyRuleProps"')}function convertCfnSafetyRulePropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSafetyRulePropsValidator(properties).assertSuccess(),{AssertionRule:convertCfnSafetyRuleAssertionRulePropertyToCloudFormation(properties.assertionRule),ControlPanelArn:cdk().stringToCloudFormation(properties.controlPanelArn),GatingRule:convertCfnSafetyRuleGatingRulePropertyToCloudFormation(properties.gatingRule),Name:cdk().stringToCloudFormation(properties.name),RuleConfig:convertCfnSafetyRuleRuleConfigPropertyToCloudFormation(properties.ruleConfig),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnSafetyRulePropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("assertionRule","AssertionRule",properties.AssertionRule!=null?CfnSafetyRuleAssertionRulePropertyFromCloudFormation(properties.AssertionRule):void 0),ret.addPropertyResult("controlPanelArn","ControlPanelArn",properties.ControlPanelArn!=null?cfn_parse().FromCloudFormation.getString(properties.ControlPanelArn):void 0),ret.addPropertyResult("gatingRule","GatingRule",properties.GatingRule!=null?CfnSafetyRuleGatingRulePropertyFromCloudFormation(properties.GatingRule):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("ruleConfig","RuleConfig",properties.RuleConfig!=null?CfnSafetyRuleRuleConfigPropertyFromCloudFormation(properties.RuleConfig):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
