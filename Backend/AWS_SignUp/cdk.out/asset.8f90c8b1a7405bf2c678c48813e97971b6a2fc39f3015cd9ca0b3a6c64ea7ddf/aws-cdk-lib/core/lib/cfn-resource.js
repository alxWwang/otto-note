"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.TagType=exports.CfnResource=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var annotations_1=()=>{var tmp=require("./annotations");return annotations_1=()=>tmp,tmp},cfn_element_1=()=>{var tmp=require("./cfn-element");return cfn_element_1=()=>tmp,tmp},cfn_resource_policy_1=()=>{var tmp=require("./cfn-resource-policy");return cfn_resource_policy_1=()=>tmp,tmp},constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},deps_1=()=>{var tmp=require("./deps");return deps_1=()=>tmp,tmp},cfn_reference_1=()=>{var tmp=require("./private/cfn-reference");return cfn_reference_1=()=>tmp,tmp},removal_policy_1=()=>{var tmp=require("./removal-policy");return removal_policy_1=()=>tmp,tmp},tag_manager_1=()=>{var tmp=require("./tag-manager");return tag_manager_1=()=>tmp,tmp},util_1=()=>{var tmp=require("./util");return util_1=()=>tmp,tmp},feature_flags_1=()=>{var tmp=require("./feature-flags");return feature_flags_1=()=>tmp,tmp},cxapi=()=>{var tmp=require("../../cx-api");return cxapi=()=>tmp,tmp};class CfnResource extends cfn_element_1().CfnRefElement{static isCfnResource(x){return x!==null&&typeof x=="object"&&x.cfnResourceType!==void 0}constructor(scope,id,props){super(scope,id),this.cfnOptions={},this.rawOverrides={},this.dependsOn=new Set;try{jsiiDeprecationWarnings().aws_cdk_lib_CfnResourceProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CfnResource),error}if(!props.type)throw new Error("The `type` property is required");this.cfnResourceType=props.type,this._cfnProperties=props.properties||{},constructs_1().Node.of(this).tryGetContext(cxapi().PATH_METADATA_ENABLE_CONTEXT)&&this.addMetadata(cxapi().PATH_METADATA_KEY,constructs_1().Node.of(this).path)}applyRemovalPolicy(policy,options={}){try{jsiiDeprecationWarnings().aws_cdk_lib_RemovalPolicy(policy),jsiiDeprecationWarnings().aws_cdk_lib_RemovalPolicyOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.applyRemovalPolicy),error}policy=policy||options.default||removal_policy_1().RemovalPolicy.RETAIN;let deletionPolicy,updateReplacePolicy;switch(policy){case removal_policy_1().RemovalPolicy.DESTROY:deletionPolicy=cfn_resource_policy_1().CfnDeletionPolicy.DELETE,updateReplacePolicy=cfn_resource_policy_1().CfnDeletionPolicy.DELETE;break;case removal_policy_1().RemovalPolicy.RETAIN:deletionPolicy=cfn_resource_policy_1().CfnDeletionPolicy.RETAIN,updateReplacePolicy=cfn_resource_policy_1().CfnDeletionPolicy.RETAIN;break;case removal_policy_1().RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE:deletionPolicy=cfn_resource_policy_1().CfnDeletionPolicy.RETAIN_EXCEPT_ON_CREATE,updateReplacePolicy=cfn_resource_policy_1().CfnDeletionPolicy.RETAIN;break;case removal_policy_1().RemovalPolicy.SNAPSHOT:if(!["AWS::DocDB::DBCluster","AWS::EC2::Volume","AWS::ElastiCache::CacheCluster","AWS::ElastiCache::ReplicationGroup","AWS::Neptune::DBCluster","AWS::RDS::DBCluster","AWS::RDS::DBInstance","AWS::Redshift::Cluster"].includes(this.cfnResourceType)){if(feature_flags_1().FeatureFlags.of(this).isEnabled(cxapi().VALIDATE_SNAPSHOT_REMOVAL_POLICY))throw new Error(`${this.cfnResourceType} does not support snapshot removal policy`);annotations_1().Annotations.of(this).addWarningV2(`@aws-cdk/core:${this.cfnResourceType}SnapshotRemovalPolicyIgnored`,`${this.cfnResourceType} does not support snapshot removal policy. This policy will be ignored.`)}deletionPolicy=cfn_resource_policy_1().CfnDeletionPolicy.SNAPSHOT,updateReplacePolicy=cfn_resource_policy_1().CfnDeletionPolicy.SNAPSHOT;break;default:throw new Error(`Invalid removal policy: ${policy}`)}this.cfnOptions.deletionPolicy=deletionPolicy,options.applyToUpdateReplacePolicy!==!1&&(this.cfnOptions.updateReplacePolicy=updateReplacePolicy)}getAtt(attributeName,typeHint){try{jsiiDeprecationWarnings().aws_cdk_lib_ResolutionTypeHint(typeHint)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.getAtt),error}return cfn_reference_1().CfnReference.for(this,attributeName,void 0,typeHint)}addOverride(path,value){const parts=splitOnPeriods(path);let curr=this.rawOverrides;for(;parts.length>1;){const key=parts.shift();curr[key]!=null&&typeof curr[key]=="object"&&!Array.isArray(curr[key])||(curr[key]={}),curr=curr[key]}const lastKey=parts.shift();curr[lastKey]=value}addDeletionOverride(path){this.addOverride(path,void 0)}addPropertyOverride(propertyPath,value){this.addOverride(`Properties.${propertyPath}`,value)}addPropertyDeletionOverride(propertyPath){this.addPropertyOverride(propertyPath,void 0)}addDependsOn(target){try{jsiiDeprecationWarnings().print("aws-cdk-lib.CfnResource#addDependsOn","use addDependency"),jsiiDeprecationWarnings().aws_cdk_lib_CfnResource(target)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addDependsOn),error}return this.addDependency(target)}addDependency(target){try{jsiiDeprecationWarnings().aws_cdk_lib_CfnResource(target)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addDependency),error}target.shouldSynthesize()&&(0,deps_1().addDependency)(this,target,`{${this.node.path}}.addDependency({${target.node.path}})`)}removeDependency(target){try{jsiiDeprecationWarnings().aws_cdk_lib_CfnResource(target)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.removeDependency),error}target.shouldSynthesize()&&(0,deps_1().removeDependency)(this,target)}obtainDependencies(){return(0,deps_1().obtainDependencies)(this)}replaceDependency(target,newTarget){try{jsiiDeprecationWarnings().aws_cdk_lib_CfnResource(target),jsiiDeprecationWarnings().aws_cdk_lib_CfnResource(newTarget)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.replaceDependency),error}if(this.obtainDependencies().includes(target))this.removeDependency(target),this.addDependency(newTarget);else throw new Error(`"${constructs_1().Node.of(this).path}" does not depend on "${constructs_1().Node.of(target).path}"`)}addMetadata(key,value){this.cfnOptions.metadata||(this.cfnOptions.metadata={}),this.cfnOptions.metadata[key]=value}getMetadata(key){return this.cfnOptions.metadata?.[key]}toString(){return`${super.toString()} [${this.cfnResourceType}]`}_addResourceDependency(target){this.dependsOn.add(target)}obtainResourceDependencies(){return Array.from(this.dependsOn.values())}_removeResourceDependency(target){this.dependsOn.delete(target)}_toCloudFormation(){if(!this.shouldSynthesize())return{};try{return{Resources:{[this.logicalId]:new(util_1()).PostResolveToken({Type:this.cfnResourceType,Properties:(0,util_1().ignoreEmpty)(this.cfnProperties),DependsOn:(0,util_1().ignoreEmpty)(renderDependsOn(this.dependsOn)),CreationPolicy:(0,util_1().capitalizePropertyNames)(this,renderCreationPolicy(this.cfnOptions.creationPolicy)),UpdatePolicy:(0,util_1().capitalizePropertyNames)(this,this.cfnOptions.updatePolicy),UpdateReplacePolicy:(0,util_1().capitalizePropertyNames)(this,this.cfnOptions.updateReplacePolicy),DeletionPolicy:(0,util_1().capitalizePropertyNames)(this,this.cfnOptions.deletionPolicy),Version:this.cfnOptions.version,Description:this.cfnOptions.description,Metadata:(0,util_1().ignoreEmpty)(this.cfnOptions.metadata),Condition:this.cfnOptions.condition&&this.cfnOptions.condition.logicalId},(resourceDef,context)=>{const renderedProps=this.renderProperties(resourceDef.Properties||{});if(renderedProps){const hasDefined=Object.values(renderedProps).find(v=>v!==void 0);resourceDef.Properties=hasDefined!==void 0?renderedProps:void 0}const resolvedRawOverrides=context.resolve(this.rawOverrides,{removeEmpty:!1});return deepMerge(resourceDef,resolvedRawOverrides)})}}}catch(e){e.message=`While synthesizing ${this.node.path}: ${e.message}`;const trace=this.creationStack;if(trace){const creationStack=["--- resource created at ---",...trace].join(`
  at `),problemTrace=e.stack.slice(e.stack.indexOf(e.message)+e.message.length);e.stack=`${e.message}
  ${creationStack}
  --- problem discovered at ---${problemTrace}`}throw e}function renderDependsOn(dependsOn){return Array.from(dependsOn).sort((x,y)=>x.node.path.localeCompare(y.node.path)).map(r=>r.logicalId)}function renderCreationPolicy(policy){if(!policy)return;const result={...policy};return policy.resourceSignal&&policy.resourceSignal.timeout&&(result.resourceSignal=policy.resourceSignal),result}}get cfnProperties(){const props=this._cfnProperties||{},tagMgr=tag_manager_1().TagManager.of(this);if(tagMgr){const tagsProp={};return tagsProp[tagMgr.tagPropertyName]=tagMgr.renderTags(),deepMerge(props,tagsProp)}return props}renderProperties(props){return props}get updatedProperites(){try{jsiiDeprecationWarnings().print("aws-cdk-lib.CfnResource#updatedProperites",`use \`updatedProperties\`

Return properties modified after initiation

Resources that expose mutable properties should override this function to
collect and return the properties object for this resource.`)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,jsiiDeprecationWarnings().getPropertyDescriptor(this,"updatedProperites").get),error}return this.updatedProperties}get updatedProperties(){return this._cfnProperties}validateProperties(_properties){}shouldSynthesize(){return!0}}exports.CfnResource=CfnResource,_a=JSII_RTTI_SYMBOL_1,CfnResource[_a]={fqn:"aws-cdk-lib.CfnResource",version:"2.175.1"};var TagType;(function(TagType2){TagType2.STANDARD="StandardTag",TagType2.AUTOSCALING_GROUP="AutoScalingGroupTag",TagType2.MAP="StringToStringMap",TagType2.KEY_VALUE="KeyValue",TagType2.NOT_TAGGABLE="NotTaggable"})(TagType||(exports.TagType=TagType={}));const MERGE_EXCLUDE_KEYS=["Ref","Fn::Base64","Fn::Cidr","Fn::FindInMap","Fn::GetAtt","Fn::GetAZs","Fn::ImportValue","Fn::Join","Fn::Select","Fn::Split","Fn::Sub","Fn::Transform","Fn::And","Fn::Equals","Fn::If","Fn::Not","Fn::Or"];function deepMerge(target,...sources){for(const source of sources){if(typeof source!="object"||typeof target!="object")throw new Error(`Invalid usage. Both source (${JSON.stringify(source)}) and target (${JSON.stringify(target)}) must be objects`);for(const key of Object.keys(source)){if(key==="__proto__"||key==="constructor")continue;const value=source[key];if(typeof value=="object"&&value!=null&&!Array.isArray(value)){typeof target[key]!="object"?target[key]={}:Object.keys(target[key]).length===1&&MERGE_EXCLUDE_KEYS.includes(Object.keys(target[key])[0])&&(target[key]={}),Object.keys(value).length===1&&MERGE_EXCLUDE_KEYS.includes(Object.keys(value)[0])&&(target[key]={}),deepMerge(target[key],value);const output=target[key];typeof output=="object"&&Object.keys(output).length===0&&delete target[key]}else value===void 0?delete target[key]:target[key]=value}}return target}function splitOnPeriods(x){const ret=[""];for(let i=0;i<x.length;i++)x[i]==="\\"&&i+1<x.length?(ret[0]+=x[i+1],i++):x[i]==="."?ret.unshift(""):ret[0]+=x[i];return ret.reverse(),ret}
