"use strict";var _a,_b,_c,_d;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnCrossAccountAttachment=exports.CfnListener=exports.CfnEndpointGroup=exports.CfnAccelerator=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnAccelerator extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnAcceleratorPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnAccelerator(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnAccelerator.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_globalaccelerator_CfnAcceleratorProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnAccelerator),error}cdk().requireProperty(props,"name",this),this.attrAcceleratorArn=cdk().Token.asString(this.getAtt("AcceleratorArn",cdk().ResolutionTypeHint.STRING)),this.attrDnsName=cdk().Token.asString(this.getAtt("DnsName",cdk().ResolutionTypeHint.STRING)),this.attrDualStackDnsName=cdk().Token.asString(this.getAtt("DualStackDnsName",cdk().ResolutionTypeHint.STRING)),this.attrIpv4Addresses=cdk().Token.asList(this.getAtt("Ipv4Addresses",cdk().ResolutionTypeHint.STRING_LIST)),this.attrIpv6Addresses=cdk().Token.asList(this.getAtt("Ipv6Addresses",cdk().ResolutionTypeHint.STRING_LIST)),this.enabled=props.enabled,this.ipAddresses=props.ipAddresses,this.ipAddressType=props.ipAddressType,this.name=props.name,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::GlobalAccelerator::Accelerator",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags}get cfnProperties(){return{enabled:this.enabled,ipAddresses:this.ipAddresses,ipAddressType:this.ipAddressType,name:this.name,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnAccelerator.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnAcceleratorPropsToCloudFormation(props)}}exports.CfnAccelerator=CfnAccelerator,_a=JSII_RTTI_SYMBOL_1,CfnAccelerator[_a]={fqn:"aws-cdk-lib.aws_globalaccelerator.CfnAccelerator",version:"2.175.1"},CfnAccelerator.CFN_RESOURCE_TYPE_NAME="AWS::GlobalAccelerator::Accelerator";function CfnAcceleratorPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("enabled",cdk().validateBoolean)(properties.enabled)),errors.collect(cdk().propertyValidator("ipAddressType",cdk().validateString)(properties.ipAddressType)),errors.collect(cdk().propertyValidator("ipAddresses",cdk().listValidator(cdk().validateString))(properties.ipAddresses)),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnAcceleratorProps"')}function convertCfnAcceleratorPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnAcceleratorPropsValidator(properties).assertSuccess(),{Enabled:cdk().booleanToCloudFormation(properties.enabled),IpAddressType:cdk().stringToCloudFormation(properties.ipAddressType),IpAddresses:cdk().listMapper(cdk().stringToCloudFormation)(properties.ipAddresses),Name:cdk().stringToCloudFormation(properties.name),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnAcceleratorPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("enabled","Enabled",properties.Enabled!=null?cfn_parse().FromCloudFormation.getBoolean(properties.Enabled):void 0),ret.addPropertyResult("ipAddresses","IpAddresses",properties.IpAddresses!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.IpAddresses):void 0),ret.addPropertyResult("ipAddressType","IpAddressType",properties.IpAddressType!=null?cfn_parse().FromCloudFormation.getString(properties.IpAddressType):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnEndpointGroup extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnEndpointGroupPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnEndpointGroup(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnEndpointGroup.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_globalaccelerator_CfnEndpointGroupProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnEndpointGroup),error}cdk().requireProperty(props,"endpointGroupRegion",this),cdk().requireProperty(props,"listenerArn",this),this.attrEndpointGroupArn=cdk().Token.asString(this.getAtt("EndpointGroupArn",cdk().ResolutionTypeHint.STRING)),this.endpointConfigurations=props.endpointConfigurations,this.endpointGroupRegion=props.endpointGroupRegion,this.healthCheckIntervalSeconds=props.healthCheckIntervalSeconds,this.healthCheckPath=props.healthCheckPath,this.healthCheckPort=props.healthCheckPort,this.healthCheckProtocol=props.healthCheckProtocol,this.listenerArn=props.listenerArn,this.portOverrides=props.portOverrides,this.thresholdCount=props.thresholdCount,this.trafficDialPercentage=props.trafficDialPercentage}get cfnProperties(){return{endpointConfigurations:this.endpointConfigurations,endpointGroupRegion:this.endpointGroupRegion,healthCheckIntervalSeconds:this.healthCheckIntervalSeconds,healthCheckPath:this.healthCheckPath,healthCheckPort:this.healthCheckPort,healthCheckProtocol:this.healthCheckProtocol,listenerArn:this.listenerArn,portOverrides:this.portOverrides,thresholdCount:this.thresholdCount,trafficDialPercentage:this.trafficDialPercentage}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnEndpointGroup.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnEndpointGroupPropsToCloudFormation(props)}}exports.CfnEndpointGroup=CfnEndpointGroup,_b=JSII_RTTI_SYMBOL_1,CfnEndpointGroup[_b]={fqn:"aws-cdk-lib.aws_globalaccelerator.CfnEndpointGroup",version:"2.175.1"},CfnEndpointGroup.CFN_RESOURCE_TYPE_NAME="AWS::GlobalAccelerator::EndpointGroup";function CfnEndpointGroupPortOverridePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("endpointPort",cdk().requiredValidator)(properties.endpointPort)),errors.collect(cdk().propertyValidator("endpointPort",cdk().validateNumber)(properties.endpointPort)),errors.collect(cdk().propertyValidator("listenerPort",cdk().requiredValidator)(properties.listenerPort)),errors.collect(cdk().propertyValidator("listenerPort",cdk().validateNumber)(properties.listenerPort)),errors.wrap('supplied properties not correct for "PortOverrideProperty"')}function convertCfnEndpointGroupPortOverridePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnEndpointGroupPortOverridePropertyValidator(properties).assertSuccess(),{EndpointPort:cdk().numberToCloudFormation(properties.endpointPort),ListenerPort:cdk().numberToCloudFormation(properties.listenerPort)}):properties}function CfnEndpointGroupPortOverridePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("endpointPort","EndpointPort",properties.EndpointPort!=null?cfn_parse().FromCloudFormation.getNumber(properties.EndpointPort):void 0),ret.addPropertyResult("listenerPort","ListenerPort",properties.ListenerPort!=null?cfn_parse().FromCloudFormation.getNumber(properties.ListenerPort):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnEndpointGroupEndpointConfigurationPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("attachmentArn",cdk().validateString)(properties.attachmentArn)),errors.collect(cdk().propertyValidator("clientIpPreservationEnabled",cdk().validateBoolean)(properties.clientIpPreservationEnabled)),errors.collect(cdk().propertyValidator("endpointId",cdk().requiredValidator)(properties.endpointId)),errors.collect(cdk().propertyValidator("endpointId",cdk().validateString)(properties.endpointId)),errors.collect(cdk().propertyValidator("weight",cdk().validateNumber)(properties.weight)),errors.wrap('supplied properties not correct for "EndpointConfigurationProperty"')}function convertCfnEndpointGroupEndpointConfigurationPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnEndpointGroupEndpointConfigurationPropertyValidator(properties).assertSuccess(),{AttachmentArn:cdk().stringToCloudFormation(properties.attachmentArn),ClientIPPreservationEnabled:cdk().booleanToCloudFormation(properties.clientIpPreservationEnabled),EndpointId:cdk().stringToCloudFormation(properties.endpointId),Weight:cdk().numberToCloudFormation(properties.weight)}):properties}function CfnEndpointGroupEndpointConfigurationPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("attachmentArn","AttachmentArn",properties.AttachmentArn!=null?cfn_parse().FromCloudFormation.getString(properties.AttachmentArn):void 0),ret.addPropertyResult("clientIpPreservationEnabled","ClientIPPreservationEnabled",properties.ClientIPPreservationEnabled!=null?cfn_parse().FromCloudFormation.getBoolean(properties.ClientIPPreservationEnabled):void 0),ret.addPropertyResult("endpointId","EndpointId",properties.EndpointId!=null?cfn_parse().FromCloudFormation.getString(properties.EndpointId):void 0),ret.addPropertyResult("weight","Weight",properties.Weight!=null?cfn_parse().FromCloudFormation.getNumber(properties.Weight):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnEndpointGroupPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("endpointConfigurations",cdk().listValidator(CfnEndpointGroupEndpointConfigurationPropertyValidator))(properties.endpointConfigurations)),errors.collect(cdk().propertyValidator("endpointGroupRegion",cdk().requiredValidator)(properties.endpointGroupRegion)),errors.collect(cdk().propertyValidator("endpointGroupRegion",cdk().validateString)(properties.endpointGroupRegion)),errors.collect(cdk().propertyValidator("healthCheckIntervalSeconds",cdk().validateNumber)(properties.healthCheckIntervalSeconds)),errors.collect(cdk().propertyValidator("healthCheckPath",cdk().validateString)(properties.healthCheckPath)),errors.collect(cdk().propertyValidator("healthCheckPort",cdk().validateNumber)(properties.healthCheckPort)),errors.collect(cdk().propertyValidator("healthCheckProtocol",cdk().validateString)(properties.healthCheckProtocol)),errors.collect(cdk().propertyValidator("listenerArn",cdk().requiredValidator)(properties.listenerArn)),errors.collect(cdk().propertyValidator("listenerArn",cdk().validateString)(properties.listenerArn)),errors.collect(cdk().propertyValidator("portOverrides",cdk().listValidator(CfnEndpointGroupPortOverridePropertyValidator))(properties.portOverrides)),errors.collect(cdk().propertyValidator("thresholdCount",cdk().validateNumber)(properties.thresholdCount)),errors.collect(cdk().propertyValidator("trafficDialPercentage",cdk().validateNumber)(properties.trafficDialPercentage)),errors.wrap('supplied properties not correct for "CfnEndpointGroupProps"')}function convertCfnEndpointGroupPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnEndpointGroupPropsValidator(properties).assertSuccess(),{EndpointConfigurations:cdk().listMapper(convertCfnEndpointGroupEndpointConfigurationPropertyToCloudFormation)(properties.endpointConfigurations),EndpointGroupRegion:cdk().stringToCloudFormation(properties.endpointGroupRegion),HealthCheckIntervalSeconds:cdk().numberToCloudFormation(properties.healthCheckIntervalSeconds),HealthCheckPath:cdk().stringToCloudFormation(properties.healthCheckPath),HealthCheckPort:cdk().numberToCloudFormation(properties.healthCheckPort),HealthCheckProtocol:cdk().stringToCloudFormation(properties.healthCheckProtocol),ListenerArn:cdk().stringToCloudFormation(properties.listenerArn),PortOverrides:cdk().listMapper(convertCfnEndpointGroupPortOverridePropertyToCloudFormation)(properties.portOverrides),ThresholdCount:cdk().numberToCloudFormation(properties.thresholdCount),TrafficDialPercentage:cdk().numberToCloudFormation(properties.trafficDialPercentage)}):properties}function CfnEndpointGroupPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("endpointConfigurations","EndpointConfigurations",properties.EndpointConfigurations!=null?cfn_parse().FromCloudFormation.getArray(CfnEndpointGroupEndpointConfigurationPropertyFromCloudFormation)(properties.EndpointConfigurations):void 0),ret.addPropertyResult("endpointGroupRegion","EndpointGroupRegion",properties.EndpointGroupRegion!=null?cfn_parse().FromCloudFormation.getString(properties.EndpointGroupRegion):void 0),ret.addPropertyResult("healthCheckIntervalSeconds","HealthCheckIntervalSeconds",properties.HealthCheckIntervalSeconds!=null?cfn_parse().FromCloudFormation.getNumber(properties.HealthCheckIntervalSeconds):void 0),ret.addPropertyResult("healthCheckPath","HealthCheckPath",properties.HealthCheckPath!=null?cfn_parse().FromCloudFormation.getString(properties.HealthCheckPath):void 0),ret.addPropertyResult("healthCheckPort","HealthCheckPort",properties.HealthCheckPort!=null?cfn_parse().FromCloudFormation.getNumber(properties.HealthCheckPort):void 0),ret.addPropertyResult("healthCheckProtocol","HealthCheckProtocol",properties.HealthCheckProtocol!=null?cfn_parse().FromCloudFormation.getString(properties.HealthCheckProtocol):void 0),ret.addPropertyResult("listenerArn","ListenerArn",properties.ListenerArn!=null?cfn_parse().FromCloudFormation.getString(properties.ListenerArn):void 0),ret.addPropertyResult("portOverrides","PortOverrides",properties.PortOverrides!=null?cfn_parse().FromCloudFormation.getArray(CfnEndpointGroupPortOverridePropertyFromCloudFormation)(properties.PortOverrides):void 0),ret.addPropertyResult("thresholdCount","ThresholdCount",properties.ThresholdCount!=null?cfn_parse().FromCloudFormation.getNumber(properties.ThresholdCount):void 0),ret.addPropertyResult("trafficDialPercentage","TrafficDialPercentage",properties.TrafficDialPercentage!=null?cfn_parse().FromCloudFormation.getNumber(properties.TrafficDialPercentage):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnListener extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnListenerPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnListener(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnListener.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_globalaccelerator_CfnListenerProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnListener),error}cdk().requireProperty(props,"acceleratorArn",this),cdk().requireProperty(props,"portRanges",this),cdk().requireProperty(props,"protocol",this),this.attrListenerArn=cdk().Token.asString(this.getAtt("ListenerArn",cdk().ResolutionTypeHint.STRING)),this.acceleratorArn=props.acceleratorArn,this.clientAffinity=props.clientAffinity,this.portRanges=props.portRanges,this.protocol=props.protocol}get cfnProperties(){return{acceleratorArn:this.acceleratorArn,clientAffinity:this.clientAffinity,portRanges:this.portRanges,protocol:this.protocol}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnListener.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnListenerPropsToCloudFormation(props)}}exports.CfnListener=CfnListener,_c=JSII_RTTI_SYMBOL_1,CfnListener[_c]={fqn:"aws-cdk-lib.aws_globalaccelerator.CfnListener",version:"2.175.1"},CfnListener.CFN_RESOURCE_TYPE_NAME="AWS::GlobalAccelerator::Listener";function CfnListenerPortRangePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("fromPort",cdk().requiredValidator)(properties.fromPort)),errors.collect(cdk().propertyValidator("fromPort",cdk().validateNumber)(properties.fromPort)),errors.collect(cdk().propertyValidator("toPort",cdk().requiredValidator)(properties.toPort)),errors.collect(cdk().propertyValidator("toPort",cdk().validateNumber)(properties.toPort)),errors.wrap('supplied properties not correct for "PortRangeProperty"')}function convertCfnListenerPortRangePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnListenerPortRangePropertyValidator(properties).assertSuccess(),{FromPort:cdk().numberToCloudFormation(properties.fromPort),ToPort:cdk().numberToCloudFormation(properties.toPort)}):properties}function CfnListenerPortRangePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("fromPort","FromPort",properties.FromPort!=null?cfn_parse().FromCloudFormation.getNumber(properties.FromPort):void 0),ret.addPropertyResult("toPort","ToPort",properties.ToPort!=null?cfn_parse().FromCloudFormation.getNumber(properties.ToPort):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnListenerPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("acceleratorArn",cdk().requiredValidator)(properties.acceleratorArn)),errors.collect(cdk().propertyValidator("acceleratorArn",cdk().validateString)(properties.acceleratorArn)),errors.collect(cdk().propertyValidator("clientAffinity",cdk().validateString)(properties.clientAffinity)),errors.collect(cdk().propertyValidator("portRanges",cdk().requiredValidator)(properties.portRanges)),errors.collect(cdk().propertyValidator("portRanges",cdk().listValidator(CfnListenerPortRangePropertyValidator))(properties.portRanges)),errors.collect(cdk().propertyValidator("protocol",cdk().requiredValidator)(properties.protocol)),errors.collect(cdk().propertyValidator("protocol",cdk().validateString)(properties.protocol)),errors.wrap('supplied properties not correct for "CfnListenerProps"')}function convertCfnListenerPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnListenerPropsValidator(properties).assertSuccess(),{AcceleratorArn:cdk().stringToCloudFormation(properties.acceleratorArn),ClientAffinity:cdk().stringToCloudFormation(properties.clientAffinity),PortRanges:cdk().listMapper(convertCfnListenerPortRangePropertyToCloudFormation)(properties.portRanges),Protocol:cdk().stringToCloudFormation(properties.protocol)}):properties}function CfnListenerPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("acceleratorArn","AcceleratorArn",properties.AcceleratorArn!=null?cfn_parse().FromCloudFormation.getString(properties.AcceleratorArn):void 0),ret.addPropertyResult("clientAffinity","ClientAffinity",properties.ClientAffinity!=null?cfn_parse().FromCloudFormation.getString(properties.ClientAffinity):void 0),ret.addPropertyResult("portRanges","PortRanges",properties.PortRanges!=null?cfn_parse().FromCloudFormation.getArray(CfnListenerPortRangePropertyFromCloudFormation)(properties.PortRanges):void 0),ret.addPropertyResult("protocol","Protocol",properties.Protocol!=null?cfn_parse().FromCloudFormation.getString(properties.Protocol):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnCrossAccountAttachment extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnCrossAccountAttachmentPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnCrossAccountAttachment(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnCrossAccountAttachment.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_globalaccelerator_CfnCrossAccountAttachmentProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnCrossAccountAttachment),error}cdk().requireProperty(props,"name",this),this.attrAttachmentArn=cdk().Token.asString(this.getAtt("AttachmentArn",cdk().ResolutionTypeHint.STRING)),this.cdkTagManager=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::GlobalAccelerator::CrossAccountAttachment",void 0,{tagPropertyName:"tags"}),this.name=props.name,this.principals=props.principals,this.resources=props.resources,this.tags=props.tags}get cfnProperties(){return{tags:this.cdkTagManager.renderTags(this.tags),name:this.name,principals:this.principals,resources:this.resources}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnCrossAccountAttachment.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnCrossAccountAttachmentPropsToCloudFormation(props)}}exports.CfnCrossAccountAttachment=CfnCrossAccountAttachment,_d=JSII_RTTI_SYMBOL_1,CfnCrossAccountAttachment[_d]={fqn:"aws-cdk-lib.aws_globalaccelerator.CfnCrossAccountAttachment",version:"2.175.1"},CfnCrossAccountAttachment.CFN_RESOURCE_TYPE_NAME="AWS::GlobalAccelerator::CrossAccountAttachment";function CfnCrossAccountAttachmentResourcePropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("cidr",cdk().validateString)(properties.cidr)),errors.collect(cdk().propertyValidator("endpointId",cdk().validateString)(properties.endpointId)),errors.collect(cdk().propertyValidator("region",cdk().validateString)(properties.region)),errors.wrap('supplied properties not correct for "ResourceProperty"')}function convertCfnCrossAccountAttachmentResourcePropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnCrossAccountAttachmentResourcePropertyValidator(properties).assertSuccess(),{Cidr:cdk().stringToCloudFormation(properties.cidr),EndpointId:cdk().stringToCloudFormation(properties.endpointId),Region:cdk().stringToCloudFormation(properties.region)}):properties}function CfnCrossAccountAttachmentResourcePropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("cidr","Cidr",properties.Cidr!=null?cfn_parse().FromCloudFormation.getString(properties.Cidr):void 0),ret.addPropertyResult("endpointId","EndpointId",properties.EndpointId!=null?cfn_parse().FromCloudFormation.getString(properties.EndpointId):void 0),ret.addPropertyResult("region","Region",properties.Region!=null?cfn_parse().FromCloudFormation.getString(properties.Region):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnCrossAccountAttachmentPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("name",cdk().requiredValidator)(properties.name)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("principals",cdk().listValidator(cdk().validateString))(properties.principals)),errors.collect(cdk().propertyValidator("resources",cdk().listValidator(CfnCrossAccountAttachmentResourcePropertyValidator))(properties.resources)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnCrossAccountAttachmentProps"')}function convertCfnCrossAccountAttachmentPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnCrossAccountAttachmentPropsValidator(properties).assertSuccess(),{Name:cdk().stringToCloudFormation(properties.name),Principals:cdk().listMapper(cdk().stringToCloudFormation)(properties.principals),Resources:cdk().listMapper(convertCfnCrossAccountAttachmentResourcePropertyToCloudFormation)(properties.resources),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnCrossAccountAttachmentPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("principals","Principals",properties.Principals!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getString)(properties.Principals):void 0),ret.addPropertyResult("resources","Resources",properties.Resources!=null?cfn_parse().FromCloudFormation.getArray(CfnCrossAccountAttachmentResourcePropertyFromCloudFormation)(properties.Resources):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
