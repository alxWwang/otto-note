"use strict";var _a,_b,_c,_d;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CfnSecretTargetAttachment=exports.CfnSecret=exports.CfnRotationSchedule=exports.CfnResourcePolicy=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp},cfn_parse=()=>{var tmp=require("../../core/lib/helpers-internal");return cfn_parse=()=>tmp,tmp};class CfnResourcePolicy extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnResourcePolicyPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnResourcePolicy(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnResourcePolicy.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_secretsmanager_CfnResourcePolicyProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnResourcePolicy),error}cdk().requireProperty(props,"resourcePolicy",this),cdk().requireProperty(props,"secretId",this),this.attrId=cdk().Token.asString(this.getAtt("Id",cdk().ResolutionTypeHint.STRING)),this.blockPublicPolicy=props.blockPublicPolicy,this.resourcePolicy=props.resourcePolicy,this.secretId=props.secretId}get cfnProperties(){return{blockPublicPolicy:this.blockPublicPolicy,resourcePolicy:this.resourcePolicy,secretId:this.secretId}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnResourcePolicy.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnResourcePolicyPropsToCloudFormation(props)}}exports.CfnResourcePolicy=CfnResourcePolicy,_a=JSII_RTTI_SYMBOL_1,CfnResourcePolicy[_a]={fqn:"aws-cdk-lib.aws_secretsmanager.CfnResourcePolicy",version:"2.175.1"},CfnResourcePolicy.CFN_RESOURCE_TYPE_NAME="AWS::SecretsManager::ResourcePolicy";function CfnResourcePolicyPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("blockPublicPolicy",cdk().validateBoolean)(properties.blockPublicPolicy)),errors.collect(cdk().propertyValidator("resourcePolicy",cdk().requiredValidator)(properties.resourcePolicy)),errors.collect(cdk().propertyValidator("resourcePolicy",cdk().validateObject)(properties.resourcePolicy)),errors.collect(cdk().propertyValidator("secretId",cdk().requiredValidator)(properties.secretId)),errors.collect(cdk().propertyValidator("secretId",cdk().validateString)(properties.secretId)),errors.wrap('supplied properties not correct for "CfnResourcePolicyProps"')}function convertCfnResourcePolicyPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnResourcePolicyPropsValidator(properties).assertSuccess(),{BlockPublicPolicy:cdk().booleanToCloudFormation(properties.blockPublicPolicy),ResourcePolicy:cdk().objectToCloudFormation(properties.resourcePolicy),SecretId:cdk().stringToCloudFormation(properties.secretId)}):properties}function CfnResourcePolicyPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("blockPublicPolicy","BlockPublicPolicy",properties.BlockPublicPolicy!=null?cfn_parse().FromCloudFormation.getBoolean(properties.BlockPublicPolicy):void 0),ret.addPropertyResult("resourcePolicy","ResourcePolicy",properties.ResourcePolicy!=null?cfn_parse().FromCloudFormation.getAny(properties.ResourcePolicy):void 0),ret.addPropertyResult("secretId","SecretId",properties.SecretId!=null?cfn_parse().FromCloudFormation.getString(properties.SecretId):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnRotationSchedule extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnRotationSchedulePropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnRotationSchedule(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnRotationSchedule.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_secretsmanager_CfnRotationScheduleProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnRotationSchedule),error}cdk().requireProperty(props,"secretId",this),this.attrId=cdk().Token.asString(this.getAtt("Id",cdk().ResolutionTypeHint.STRING)),this.hostedRotationLambda=props.hostedRotationLambda,this.rotateImmediatelyOnUpdate=props.rotateImmediatelyOnUpdate,this.rotationLambdaArn=props.rotationLambdaArn,this.rotationRules=props.rotationRules,this.secretId=props.secretId}get cfnProperties(){return{hostedRotationLambda:this.hostedRotationLambda,rotateImmediatelyOnUpdate:this.rotateImmediatelyOnUpdate,rotationLambdaArn:this.rotationLambdaArn,rotationRules:this.rotationRules,secretId:this.secretId}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnRotationSchedule.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnRotationSchedulePropsToCloudFormation(props)}}exports.CfnRotationSchedule=CfnRotationSchedule,_b=JSII_RTTI_SYMBOL_1,CfnRotationSchedule[_b]={fqn:"aws-cdk-lib.aws_secretsmanager.CfnRotationSchedule",version:"2.175.1"},CfnRotationSchedule.CFN_RESOURCE_TYPE_NAME="AWS::SecretsManager::RotationSchedule";function CfnRotationScheduleHostedRotationLambdaPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("excludeCharacters",cdk().validateString)(properties.excludeCharacters)),errors.collect(cdk().propertyValidator("kmsKeyArn",cdk().validateString)(properties.kmsKeyArn)),errors.collect(cdk().propertyValidator("masterSecretArn",cdk().validateString)(properties.masterSecretArn)),errors.collect(cdk().propertyValidator("masterSecretKmsKeyArn",cdk().validateString)(properties.masterSecretKmsKeyArn)),errors.collect(cdk().propertyValidator("rotationLambdaName",cdk().validateString)(properties.rotationLambdaName)),errors.collect(cdk().propertyValidator("rotationType",cdk().requiredValidator)(properties.rotationType)),errors.collect(cdk().propertyValidator("rotationType",cdk().validateString)(properties.rotationType)),errors.collect(cdk().propertyValidator("runtime",cdk().validateString)(properties.runtime)),errors.collect(cdk().propertyValidator("superuserSecretArn",cdk().validateString)(properties.superuserSecretArn)),errors.collect(cdk().propertyValidator("superuserSecretKmsKeyArn",cdk().validateString)(properties.superuserSecretKmsKeyArn)),errors.collect(cdk().propertyValidator("vpcSecurityGroupIds",cdk().validateString)(properties.vpcSecurityGroupIds)),errors.collect(cdk().propertyValidator("vpcSubnetIds",cdk().validateString)(properties.vpcSubnetIds)),errors.wrap('supplied properties not correct for "HostedRotationLambdaProperty"')}function convertCfnRotationScheduleHostedRotationLambdaPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnRotationScheduleHostedRotationLambdaPropertyValidator(properties).assertSuccess(),{ExcludeCharacters:cdk().stringToCloudFormation(properties.excludeCharacters),KmsKeyArn:cdk().stringToCloudFormation(properties.kmsKeyArn),MasterSecretArn:cdk().stringToCloudFormation(properties.masterSecretArn),MasterSecretKmsKeyArn:cdk().stringToCloudFormation(properties.masterSecretKmsKeyArn),RotationLambdaName:cdk().stringToCloudFormation(properties.rotationLambdaName),RotationType:cdk().stringToCloudFormation(properties.rotationType),Runtime:cdk().stringToCloudFormation(properties.runtime),SuperuserSecretArn:cdk().stringToCloudFormation(properties.superuserSecretArn),SuperuserSecretKmsKeyArn:cdk().stringToCloudFormation(properties.superuserSecretKmsKeyArn),VpcSecurityGroupIds:cdk().stringToCloudFormation(properties.vpcSecurityGroupIds),VpcSubnetIds:cdk().stringToCloudFormation(properties.vpcSubnetIds)}):properties}function CfnRotationScheduleHostedRotationLambdaPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("excludeCharacters","ExcludeCharacters",properties.ExcludeCharacters!=null?cfn_parse().FromCloudFormation.getString(properties.ExcludeCharacters):void 0),ret.addPropertyResult("kmsKeyArn","KmsKeyArn",properties.KmsKeyArn!=null?cfn_parse().FromCloudFormation.getString(properties.KmsKeyArn):void 0),ret.addPropertyResult("masterSecretArn","MasterSecretArn",properties.MasterSecretArn!=null?cfn_parse().FromCloudFormation.getString(properties.MasterSecretArn):void 0),ret.addPropertyResult("masterSecretKmsKeyArn","MasterSecretKmsKeyArn",properties.MasterSecretKmsKeyArn!=null?cfn_parse().FromCloudFormation.getString(properties.MasterSecretKmsKeyArn):void 0),ret.addPropertyResult("rotationLambdaName","RotationLambdaName",properties.RotationLambdaName!=null?cfn_parse().FromCloudFormation.getString(properties.RotationLambdaName):void 0),ret.addPropertyResult("rotationType","RotationType",properties.RotationType!=null?cfn_parse().FromCloudFormation.getString(properties.RotationType):void 0),ret.addPropertyResult("runtime","Runtime",properties.Runtime!=null?cfn_parse().FromCloudFormation.getString(properties.Runtime):void 0),ret.addPropertyResult("superuserSecretArn","SuperuserSecretArn",properties.SuperuserSecretArn!=null?cfn_parse().FromCloudFormation.getString(properties.SuperuserSecretArn):void 0),ret.addPropertyResult("superuserSecretKmsKeyArn","SuperuserSecretKmsKeyArn",properties.SuperuserSecretKmsKeyArn!=null?cfn_parse().FromCloudFormation.getString(properties.SuperuserSecretKmsKeyArn):void 0),ret.addPropertyResult("vpcSecurityGroupIds","VpcSecurityGroupIds",properties.VpcSecurityGroupIds!=null?cfn_parse().FromCloudFormation.getString(properties.VpcSecurityGroupIds):void 0),ret.addPropertyResult("vpcSubnetIds","VpcSubnetIds",properties.VpcSubnetIds!=null?cfn_parse().FromCloudFormation.getString(properties.VpcSubnetIds):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnRotationScheduleRotationRulesPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("automaticallyAfterDays",cdk().validateNumber)(properties.automaticallyAfterDays)),errors.collect(cdk().propertyValidator("duration",cdk().validateString)(properties.duration)),errors.collect(cdk().propertyValidator("scheduleExpression",cdk().validateString)(properties.scheduleExpression)),errors.wrap('supplied properties not correct for "RotationRulesProperty"')}function convertCfnRotationScheduleRotationRulesPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnRotationScheduleRotationRulesPropertyValidator(properties).assertSuccess(),{AutomaticallyAfterDays:cdk().numberToCloudFormation(properties.automaticallyAfterDays),Duration:cdk().stringToCloudFormation(properties.duration),ScheduleExpression:cdk().stringToCloudFormation(properties.scheduleExpression)}):properties}function CfnRotationScheduleRotationRulesPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("automaticallyAfterDays","AutomaticallyAfterDays",properties.AutomaticallyAfterDays!=null?cfn_parse().FromCloudFormation.getNumber(properties.AutomaticallyAfterDays):void 0),ret.addPropertyResult("duration","Duration",properties.Duration!=null?cfn_parse().FromCloudFormation.getString(properties.Duration):void 0),ret.addPropertyResult("scheduleExpression","ScheduleExpression",properties.ScheduleExpression!=null?cfn_parse().FromCloudFormation.getString(properties.ScheduleExpression):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnRotationSchedulePropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("hostedRotationLambda",CfnRotationScheduleHostedRotationLambdaPropertyValidator)(properties.hostedRotationLambda)),errors.collect(cdk().propertyValidator("rotateImmediatelyOnUpdate",cdk().validateBoolean)(properties.rotateImmediatelyOnUpdate)),errors.collect(cdk().propertyValidator("rotationLambdaArn",cdk().validateString)(properties.rotationLambdaArn)),errors.collect(cdk().propertyValidator("rotationRules",CfnRotationScheduleRotationRulesPropertyValidator)(properties.rotationRules)),errors.collect(cdk().propertyValidator("secretId",cdk().requiredValidator)(properties.secretId)),errors.collect(cdk().propertyValidator("secretId",cdk().validateString)(properties.secretId)),errors.wrap('supplied properties not correct for "CfnRotationScheduleProps"')}function convertCfnRotationSchedulePropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnRotationSchedulePropsValidator(properties).assertSuccess(),{HostedRotationLambda:convertCfnRotationScheduleHostedRotationLambdaPropertyToCloudFormation(properties.hostedRotationLambda),RotateImmediatelyOnUpdate:cdk().booleanToCloudFormation(properties.rotateImmediatelyOnUpdate),RotationLambdaARN:cdk().stringToCloudFormation(properties.rotationLambdaArn),RotationRules:convertCfnRotationScheduleRotationRulesPropertyToCloudFormation(properties.rotationRules),SecretId:cdk().stringToCloudFormation(properties.secretId)}):properties}function CfnRotationSchedulePropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("hostedRotationLambda","HostedRotationLambda",properties.HostedRotationLambda!=null?CfnRotationScheduleHostedRotationLambdaPropertyFromCloudFormation(properties.HostedRotationLambda):void 0),ret.addPropertyResult("rotateImmediatelyOnUpdate","RotateImmediatelyOnUpdate",properties.RotateImmediatelyOnUpdate!=null?cfn_parse().FromCloudFormation.getBoolean(properties.RotateImmediatelyOnUpdate):void 0),ret.addPropertyResult("rotationLambdaArn","RotationLambdaARN",properties.RotationLambdaARN!=null?cfn_parse().FromCloudFormation.getString(properties.RotationLambdaARN):void 0),ret.addPropertyResult("rotationRules","RotationRules",properties.RotationRules!=null?CfnRotationScheduleRotationRulesPropertyFromCloudFormation(properties.RotationRules):void 0),ret.addPropertyResult("secretId","SecretId",properties.SecretId!=null?cfn_parse().FromCloudFormation.getString(properties.SecretId):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnSecret extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnSecretPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnSecret(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props={}){super(scope,id,{type:CfnSecret.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_secretsmanager_CfnSecretProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnSecret),error}this.attrId=cdk().Token.asString(this.getAtt("Id",cdk().ResolutionTypeHint.STRING)),this.description=props.description,this.generateSecretString=props.generateSecretString,this.kmsKeyId=props.kmsKeyId,this.name=props.name,this.replicaRegions=props.replicaRegions,this.secretString=props.secretString,this.tags=new(cdk()).TagManager(cdk().TagType.STANDARD,"AWS::SecretsManager::Secret",props.tags,{tagPropertyName:"tags"}),this.tagsRaw=props.tags,this.node.scope!=null&&cdk().Resource.isResource(this.node.scope)&&this.node.addValidation({validate:()=>this.cfnOptions.deletionPolicy===void 0?["'AWS::SecretsManager::Secret' is a stateful resource type, and you must specify a Removal Policy for it. Call 'resource.applyRemovalPolicy()'."]:[]})}get cfnProperties(){return{description:this.description,generateSecretString:this.generateSecretString,kmsKeyId:this.kmsKeyId,name:this.name,replicaRegions:this.replicaRegions,secretString:this.secretString,tags:this.tags.renderTags()}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnSecret.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnSecretPropsToCloudFormation(props)}}exports.CfnSecret=CfnSecret,_c=JSII_RTTI_SYMBOL_1,CfnSecret[_c]={fqn:"aws-cdk-lib.aws_secretsmanager.CfnSecret",version:"2.175.1"},CfnSecret.CFN_RESOURCE_TYPE_NAME="AWS::SecretsManager::Secret";function CfnSecretGenerateSecretStringPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("excludeCharacters",cdk().validateString)(properties.excludeCharacters)),errors.collect(cdk().propertyValidator("excludeLowercase",cdk().validateBoolean)(properties.excludeLowercase)),errors.collect(cdk().propertyValidator("excludeNumbers",cdk().validateBoolean)(properties.excludeNumbers)),errors.collect(cdk().propertyValidator("excludePunctuation",cdk().validateBoolean)(properties.excludePunctuation)),errors.collect(cdk().propertyValidator("excludeUppercase",cdk().validateBoolean)(properties.excludeUppercase)),errors.collect(cdk().propertyValidator("generateStringKey",cdk().validateString)(properties.generateStringKey)),errors.collect(cdk().propertyValidator("includeSpace",cdk().validateBoolean)(properties.includeSpace)),errors.collect(cdk().propertyValidator("passwordLength",cdk().validateNumber)(properties.passwordLength)),errors.collect(cdk().propertyValidator("requireEachIncludedType",cdk().validateBoolean)(properties.requireEachIncludedType)),errors.collect(cdk().propertyValidator("secretStringTemplate",cdk().validateString)(properties.secretStringTemplate)),errors.wrap('supplied properties not correct for "GenerateSecretStringProperty"')}function convertCfnSecretGenerateSecretStringPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSecretGenerateSecretStringPropertyValidator(properties).assertSuccess(),{ExcludeCharacters:cdk().stringToCloudFormation(properties.excludeCharacters),ExcludeLowercase:cdk().booleanToCloudFormation(properties.excludeLowercase),ExcludeNumbers:cdk().booleanToCloudFormation(properties.excludeNumbers),ExcludePunctuation:cdk().booleanToCloudFormation(properties.excludePunctuation),ExcludeUppercase:cdk().booleanToCloudFormation(properties.excludeUppercase),GenerateStringKey:cdk().stringToCloudFormation(properties.generateStringKey),IncludeSpace:cdk().booleanToCloudFormation(properties.includeSpace),PasswordLength:cdk().numberToCloudFormation(properties.passwordLength),RequireEachIncludedType:cdk().booleanToCloudFormation(properties.requireEachIncludedType),SecretStringTemplate:cdk().stringToCloudFormation(properties.secretStringTemplate)}):properties}function CfnSecretGenerateSecretStringPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("excludeCharacters","ExcludeCharacters",properties.ExcludeCharacters!=null?cfn_parse().FromCloudFormation.getString(properties.ExcludeCharacters):void 0),ret.addPropertyResult("excludeLowercase","ExcludeLowercase",properties.ExcludeLowercase!=null?cfn_parse().FromCloudFormation.getBoolean(properties.ExcludeLowercase):void 0),ret.addPropertyResult("excludeNumbers","ExcludeNumbers",properties.ExcludeNumbers!=null?cfn_parse().FromCloudFormation.getBoolean(properties.ExcludeNumbers):void 0),ret.addPropertyResult("excludePunctuation","ExcludePunctuation",properties.ExcludePunctuation!=null?cfn_parse().FromCloudFormation.getBoolean(properties.ExcludePunctuation):void 0),ret.addPropertyResult("excludeUppercase","ExcludeUppercase",properties.ExcludeUppercase!=null?cfn_parse().FromCloudFormation.getBoolean(properties.ExcludeUppercase):void 0),ret.addPropertyResult("generateStringKey","GenerateStringKey",properties.GenerateStringKey!=null?cfn_parse().FromCloudFormation.getString(properties.GenerateStringKey):void 0),ret.addPropertyResult("includeSpace","IncludeSpace",properties.IncludeSpace!=null?cfn_parse().FromCloudFormation.getBoolean(properties.IncludeSpace):void 0),ret.addPropertyResult("passwordLength","PasswordLength",properties.PasswordLength!=null?cfn_parse().FromCloudFormation.getNumber(properties.PasswordLength):void 0),ret.addPropertyResult("requireEachIncludedType","RequireEachIncludedType",properties.RequireEachIncludedType!=null?cfn_parse().FromCloudFormation.getBoolean(properties.RequireEachIncludedType):void 0),ret.addPropertyResult("secretStringTemplate","SecretStringTemplate",properties.SecretStringTemplate!=null?cfn_parse().FromCloudFormation.getString(properties.SecretStringTemplate):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnSecretReplicaRegionPropertyValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("kmsKeyId",cdk().validateString)(properties.kmsKeyId)),errors.collect(cdk().propertyValidator("region",cdk().requiredValidator)(properties.region)),errors.collect(cdk().propertyValidator("region",cdk().validateString)(properties.region)),errors.wrap('supplied properties not correct for "ReplicaRegionProperty"')}function convertCfnSecretReplicaRegionPropertyToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSecretReplicaRegionPropertyValidator(properties).assertSuccess(),{KmsKeyId:cdk().stringToCloudFormation(properties.kmsKeyId),Region:cdk().stringToCloudFormation(properties.region)}):properties}function CfnSecretReplicaRegionPropertyFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("kmsKeyId","KmsKeyId",properties.KmsKeyId!=null?cfn_parse().FromCloudFormation.getString(properties.KmsKeyId):void 0),ret.addPropertyResult("region","Region",properties.Region!=null?cfn_parse().FromCloudFormation.getString(properties.Region):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}function CfnSecretPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("description",cdk().validateString)(properties.description)),errors.collect(cdk().propertyValidator("generateSecretString",CfnSecretGenerateSecretStringPropertyValidator)(properties.generateSecretString)),errors.collect(cdk().propertyValidator("kmsKeyId",cdk().validateString)(properties.kmsKeyId)),errors.collect(cdk().propertyValidator("name",cdk().validateString)(properties.name)),errors.collect(cdk().propertyValidator("replicaRegions",cdk().listValidator(CfnSecretReplicaRegionPropertyValidator))(properties.replicaRegions)),errors.collect(cdk().propertyValidator("secretString",cdk().validateString)(properties.secretString)),errors.collect(cdk().propertyValidator("tags",cdk().listValidator(cdk().validateCfnTag))(properties.tags)),errors.wrap('supplied properties not correct for "CfnSecretProps"')}function convertCfnSecretPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSecretPropsValidator(properties).assertSuccess(),{Description:cdk().stringToCloudFormation(properties.description),GenerateSecretString:convertCfnSecretGenerateSecretStringPropertyToCloudFormation(properties.generateSecretString),KmsKeyId:cdk().stringToCloudFormation(properties.kmsKeyId),Name:cdk().stringToCloudFormation(properties.name),ReplicaRegions:cdk().listMapper(convertCfnSecretReplicaRegionPropertyToCloudFormation)(properties.replicaRegions),SecretString:cdk().stringToCloudFormation(properties.secretString),Tags:cdk().listMapper(cdk().cfnTagToCloudFormation)(properties.tags)}):properties}function CfnSecretPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("description","Description",properties.Description!=null?cfn_parse().FromCloudFormation.getString(properties.Description):void 0),ret.addPropertyResult("generateSecretString","GenerateSecretString",properties.GenerateSecretString!=null?CfnSecretGenerateSecretStringPropertyFromCloudFormation(properties.GenerateSecretString):void 0),ret.addPropertyResult("kmsKeyId","KmsKeyId",properties.KmsKeyId!=null?cfn_parse().FromCloudFormation.getString(properties.KmsKeyId):void 0),ret.addPropertyResult("name","Name",properties.Name!=null?cfn_parse().FromCloudFormation.getString(properties.Name):void 0),ret.addPropertyResult("replicaRegions","ReplicaRegions",properties.ReplicaRegions!=null?cfn_parse().FromCloudFormation.getArray(CfnSecretReplicaRegionPropertyFromCloudFormation)(properties.ReplicaRegions):void 0),ret.addPropertyResult("secretString","SecretString",properties.SecretString!=null?cfn_parse().FromCloudFormation.getString(properties.SecretString):void 0),ret.addPropertyResult("tags","Tags",properties.Tags!=null?cfn_parse().FromCloudFormation.getArray(cfn_parse().FromCloudFormation.getCfnTag)(properties.Tags):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}class CfnSecretTargetAttachment extends cdk().CfnResource{static _fromCloudFormation(scope,id,resourceAttributes,options){resourceAttributes=resourceAttributes||{};const resourceProperties=options.parser.parseValue(resourceAttributes.Properties),propsResult=CfnSecretTargetAttachmentPropsFromCloudFormation(resourceProperties);if(cdk().isResolvableObject(propsResult.value))throw new Error("Unexpected IResolvable");const ret=new CfnSecretTargetAttachment(scope,id,propsResult.value);for(const[propKey,propVal]of Object.entries(propsResult.extraProperties))ret.addPropertyOverride(propKey,propVal);return options.parser.handleAttributes(ret,resourceAttributes,id),ret}constructor(scope,id,props){super(scope,id,{type:CfnSecretTargetAttachment.CFN_RESOURCE_TYPE_NAME,properties:props});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_secretsmanager_CfnSecretTargetAttachmentProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnSecretTargetAttachment),error}cdk().requireProperty(props,"secretId",this),cdk().requireProperty(props,"targetId",this),cdk().requireProperty(props,"targetType",this),this.attrId=cdk().Token.asString(this.getAtt("Id",cdk().ResolutionTypeHint.STRING)),this.secretId=props.secretId,this.targetId=props.targetId,this.targetType=props.targetType}get cfnProperties(){return{secretId:this.secretId,targetId:this.targetId,targetType:this.targetType}}inspect(inspector){try{jsiiDeprecationWarnings().aws_cdk_lib_TreeInspector(inspector)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.inspect),error}inspector.addAttribute("aws:cdk:cloudformation:type",CfnSecretTargetAttachment.CFN_RESOURCE_TYPE_NAME),inspector.addAttribute("aws:cdk:cloudformation:props",this.cfnProperties)}renderProperties(props){return convertCfnSecretTargetAttachmentPropsToCloudFormation(props)}}exports.CfnSecretTargetAttachment=CfnSecretTargetAttachment,_d=JSII_RTTI_SYMBOL_1,CfnSecretTargetAttachment[_d]={fqn:"aws-cdk-lib.aws_secretsmanager.CfnSecretTargetAttachment",version:"2.175.1"},CfnSecretTargetAttachment.CFN_RESOURCE_TYPE_NAME="AWS::SecretsManager::SecretTargetAttachment";function CfnSecretTargetAttachmentPropsValidator(properties){if(!cdk().canInspect(properties))return cdk().VALIDATION_SUCCESS;const errors=new(cdk()).ValidationResults;return properties&&typeof properties=="object"&&!Array.isArray(properties)||errors.collect(new(cdk()).ValidationResult("Expected an object, but received: "+JSON.stringify(properties))),errors.collect(cdk().propertyValidator("secretId",cdk().requiredValidator)(properties.secretId)),errors.collect(cdk().propertyValidator("secretId",cdk().validateString)(properties.secretId)),errors.collect(cdk().propertyValidator("targetId",cdk().requiredValidator)(properties.targetId)),errors.collect(cdk().propertyValidator("targetId",cdk().validateString)(properties.targetId)),errors.collect(cdk().propertyValidator("targetType",cdk().requiredValidator)(properties.targetType)),errors.collect(cdk().propertyValidator("targetType",cdk().validateString)(properties.targetType)),errors.wrap('supplied properties not correct for "CfnSecretTargetAttachmentProps"')}function convertCfnSecretTargetAttachmentPropsToCloudFormation(properties){return cdk().canInspect(properties)?(CfnSecretTargetAttachmentPropsValidator(properties).assertSuccess(),{SecretId:cdk().stringToCloudFormation(properties.secretId),TargetId:cdk().stringToCloudFormation(properties.targetId),TargetType:cdk().stringToCloudFormation(properties.targetType)}):properties}function CfnSecretTargetAttachmentPropsFromCloudFormation(properties){if(cdk().isResolvableObject(properties))return new(cfn_parse()).FromCloudFormationResult(properties);if(properties=properties??{},!(properties&&typeof properties=="object"&&!Array.isArray(properties)))return new(cfn_parse()).FromCloudFormationResult(properties);const ret=new(cfn_parse()).FromCloudFormationPropertyObject;return ret.addPropertyResult("secretId","SecretId",properties.SecretId!=null?cfn_parse().FromCloudFormation.getString(properties.SecretId):void 0),ret.addPropertyResult("targetId","TargetId",properties.TargetId!=null?cfn_parse().FromCloudFormation.getString(properties.TargetId):void 0),ret.addPropertyResult("targetType","TargetType",properties.TargetType!=null?cfn_parse().FromCloudFormation.getString(properties.TargetType):void 0),ret.addUnrecognizedPropertiesAsExtra(properties),ret}
