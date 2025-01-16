"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.TagManager=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cfn_resource_1=()=>{var tmp=require("./cfn-resource");return cfn_resource_1=()=>tmp,tmp},lazy_1=()=>{var tmp=require("./lazy");return lazy_1=()=>tmp,tmp};const TAG_MANAGER_SYM=Symbol.for("@aws-cdk/core.TagManager");class StandardFormatter{parseTags(cfnPropertyTags,priority){if(!Array.isArray(cfnPropertyTags))throw new Error(`Invalid tag input expected array of {key, value} have ${JSON.stringify(cfnPropertyTags)}`);const tags=[],dynamicTags=[];for(const tag of cfnPropertyTags)tag.key===void 0||tag.value===void 0?dynamicTags.push(tag):tags.push({key:`${tag.key}`,value:`${tag.value}`,priority});return{tags,dynamicTags}}formatTags(tags){const cfnTags=[];for(const tag of tags)cfnTags.push({key:tag.key,value:tag.value});return cfnTags}}class AsgFormatter{parseTags(cfnPropertyTags,priority){if(!Array.isArray(cfnPropertyTags))throw new Error(`Invalid tag input expected array of {key, value, propagateAtLaunch} have ${JSON.stringify(cfnPropertyTags)}`);const tags=[],dynamicTags=[];for(const tag of cfnPropertyTags)tag.key===void 0||tag.value===void 0||tag.propagateAtLaunch===void 0?dynamicTags.push(tag):tags.push({key:`${tag.key}`,value:`${tag.value}`,priority,applyToLaunchedInstances:!!tag.propagateAtLaunch});return{tags,dynamicTags}}formatTags(tags){const cfnTags=[];for(const tag of tags)cfnTags.push({key:tag.key,value:tag.value,propagateAtLaunch:tag.applyToLaunchedInstances!==!1});return cfnTags}}class MapFormatter{parseTags(cfnPropertyTags,priority){if(Array.isArray(cfnPropertyTags)||typeof cfnPropertyTags!="object")throw new Error(`Invalid tag input expected map of {key: value} have ${JSON.stringify(cfnPropertyTags)}`);const tags=[];for(const[key,value]of Object.entries(cfnPropertyTags))tags.push({key,value:`${value}`,priority});return{tags,dynamicTags:void 0}}formatTags(tags){const cfnTags={};for(const tag of tags)cfnTags[`${tag.key}`]=`${tag.value}`;return cfnTags}}class KeyValueFormatter{parseTags(keyValueTags,priority){const tags=[];for(const key in keyValueTags)if(keyValueTags.hasOwnProperty(key)){const value=keyValueTags[key];tags.push({key,value,priority})}return{tags,dynamicTags:void 0}}formatTags(unformattedTags){const tags=[];return unformattedTags.forEach(tag=>{tags.push({Key:tag.key,Value:tag.value})}),tags}}class NoFormat{parseTags(_cfnPropertyTags){return{tags:[],dynamicTags:void 0}}formatTags(_tags){}}let _tagFormattersCache;function TAG_FORMATTERS(){return _tagFormattersCache??(_tagFormattersCache={[cfn_resource_1().TagType.AUTOSCALING_GROUP]:new AsgFormatter,[cfn_resource_1().TagType.STANDARD]:new StandardFormatter,[cfn_resource_1().TagType.MAP]:new MapFormatter,[cfn_resource_1().TagType.KEY_VALUE]:new KeyValueFormatter,[cfn_resource_1().TagType.NOT_TAGGABLE]:new NoFormat})}class TagManager{static isTaggable(construct){const tags=construct.tags;return tags!=null&&typeof tags=="object"&&tags[TAG_MANAGER_SYM]}static isTaggableV2(construct){return construct.cdkTagManager!==void 0}static of(construct){return TagManager.isTaggableV2(construct)?construct.cdkTagManager:TagManager.isTaggable(construct)?construct.tags:void 0}constructor(tagType,resourceTypeName,initialTags,options={}){this.tags=new Map,this.priorities=new Map,this.externalTagPriority=50;try{jsiiDeprecationWarnings().aws_cdk_lib_TagType(tagType),jsiiDeprecationWarnings().aws_cdk_lib_TagManagerOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,TagManager),error}this.resourceTypeName=resourceTypeName,this.tagFormatter=TAG_FORMATTERS()[tagType],this.tagPropertyName=options.tagPropertyName||"tags",this.parseExternalTags(initialTags),this.didHaveInitialTags=initialTags!==void 0,this.renderedTags=lazy_1().Lazy.any({produce:()=>this.renderTags()})}setTag(key,value,priority=0,applyToLaunchedInstances=!0){this._setTag({key,value,priority,applyToLaunchedInstances})}removeTag(key,priority){priority>=(this.priorities.get(key)||0)&&(this.tags.delete(key),this.priorities.set(key,priority))}renderTags(combineWithTags){if(combineWithTags!==void 0&&this.didHaveInitialTags)throw new Error("Specify external tags either during the creation of TagManager, or as a parameter to renderTags(), but not both");this.parseExternalTags(combineWithTags);const formattedTags=this.tagFormatter.formatTags(this.sortedTags);if(Array.isArray(formattedTags)||Array.isArray(this.dynamicTags)){const ret=[...formattedTags??[],...this.dynamicTags??[]];return ret.length>0?ret:void 0}else{const ret={...formattedTags??{},...this.dynamicTags??{}};return Object.keys(ret).length>0?ret:void 0}}tagValues(){const ret={};for(const tag of this.sortedTags)ret[tag.key]=tag.value;return ret}applyTagAspectHere(include,exclude){return!(exclude&&exclude.length>0&&exclude.indexOf(this.resourceTypeName)!==-1||include&&include.length>0&&include.indexOf(this.resourceTypeName)===-1)}hasTags(){return this.tags.size>0}_setTag(...tags){for(const tag of tags)tag.priority>=(this.priorities.get(tag.key)||0)&&(this.tags.set(tag.key,tag),this.priorities.set(tag.key,tag.priority))}get sortedTags(){return Array.from(this.tags.values()).sort((a,b)=>a.key.localeCompare(b.key))}parseExternalTags(initialTags){if(initialTags!==void 0){const parseTagsResult=this.tagFormatter.parseTags(initialTags,this.externalTagPriority);this.dynamicTags=parseTagsResult.dynamicTags,this._setTag(...parseTagsResult.tags)}}}exports.TagManager=TagManager,_a=JSII_RTTI_SYMBOL_1,TagManager[_a]={fqn:"aws-cdk-lib.TagManager",version:"2.175.1"},TagManager.prototype[TAG_MANAGER_SYM]=!0;
