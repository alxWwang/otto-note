"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.CrossRegionSsmWriterProvider=void 0;var path=()=>{var tmp=require("path");return path=()=>tmp,tmp},stack_1=()=>{var tmp=require("../../stack");return stack_1=()=>tmp,tmp},custom_resource_provider_1=()=>{var tmp=require("../../custom-resource-provider");return custom_resource_provider_1=()=>tmp,tmp};class CrossRegionSsmWriterProvider extends custom_resource_provider_1().CustomResourceProviderBase{static getOrCreate(scope,uniqueid,props){return this.getOrCreateProvider(scope,uniqueid,props).serviceToken}static getOrCreateProvider(scope,uniqueid,props){const id=`${uniqueid}CustomResourceProvider`,stack=stack_1().Stack.of(scope);return stack.node.tryFindChild(id)??new CrossRegionSsmWriterProvider(stack,id,props)}constructor(scope,id,props){super(scope,id,{...props,codeDirectory:path().join(__dirname,"cross-region-ssm-writer-handler"),runtimeName:(0,custom_resource_provider_1().determineLatestNodeRuntimeName)(scope)}),this.node.addMetadata("aws:cdk:is-custom-resource-handler-customResourceProvider",!0)}}exports.CrossRegionSsmWriterProvider=CrossRegionSsmWriterProvider;
