"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.TreeCloudArtifact=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cloud_artifact_1=()=>{var tmp=require("../cloud-artifact");return cloud_artifact_1=()=>tmp,tmp};const TREE_CLOUD_ARTIFACT_SYM=Symbol.for("@aws-cdk/cx-api.TreeCloudArtifact");class TreeCloudArtifact extends cloud_artifact_1().CloudArtifact{static isTreeCloudArtifact(art){return art&&typeof art=="object"&&art[TREE_CLOUD_ARTIFACT_SYM]}constructor(assembly,name,artifact){super(assembly,name,artifact);try{jsiiDeprecationWarnings().aws_cdk_lib_cx_api_CloudAssembly(assembly),jsiiDeprecationWarnings().aws_cdk_lib_cloud_assembly_schema_ArtifactManifest(artifact)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,TreeCloudArtifact),error}const properties=this.manifest.properties||{};if(!properties.file)throw new Error('Invalid TreeCloudArtifact. Missing "file" property');this.file=properties.file}}exports.TreeCloudArtifact=TreeCloudArtifact,_a=JSII_RTTI_SYMBOL_1,TreeCloudArtifact[_a]={fqn:"aws-cdk-lib.cx_api.TreeCloudArtifact",version:"2.175.1"},Object.defineProperty(TreeCloudArtifact.prototype,TREE_CLOUD_ARTIFACT_SYM,{value:!0,enumerable:!1,writable:!1});
