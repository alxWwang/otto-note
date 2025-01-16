"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.ProductStackHistory=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var fs=()=>{var tmp=require("fs");return fs=()=>tmp,tmp},path=()=>{var tmp=require("path");return path=()=>tmp,tmp},constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},cloudformation_template_1=()=>{var tmp=require("./cloudformation-template");return cloudformation_template_1=()=>tmp,tmp},common_1=()=>{var tmp=require("./common");return common_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class ProductStackHistory extends constructs_1().Construct{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_servicecatalog_ProductStackHistoryProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,ProductStackHistory),error}props.productStack._setParentProductStackHistory(this),this.props=props}currentVersion(){return{cloudFormationTemplate:cloudformation_template_1().CloudFormationTemplate.fromProductStack(this.props.productStack),productVersionName:this.props.currentVersionName,description:this.props.description}}versionFromSnapshot(productVersionName){const productStackSnapshotDirectory=this.props.directory||common_1().DEFAULT_PRODUCT_STACK_SNAPSHOT_DIRECTORY,templateFileKey=`${core_1().Names.uniqueId(this)}.${this.props.productStack.artifactId}.${productVersionName}.product.template.json`,templateFilePath=path().join(productStackSnapshotDirectory,templateFileKey);if(!fs().existsSync(templateFilePath))throw new Error(`Template ${templateFileKey} cannot be found in ${productStackSnapshotDirectory}`);return{cloudFormationTemplate:cloudformation_template_1().CloudFormationTemplate.fromAsset(templateFilePath),productVersionName,description:this.props.description}}_writeTemplateToSnapshot(cfn){const productStackSnapshotDirectory=this.props.directory||common_1().DEFAULT_PRODUCT_STACK_SNAPSHOT_DIRECTORY;fs().existsSync(productStackSnapshotDirectory)||fs().mkdirSync(productStackSnapshotDirectory,{recursive:!0});const templateFileKey=`${core_1().Names.uniqueId(this)}.${this.props.productStack.artifactId}.${this.props.currentVersionName}.product.template.json`,templateFilePath=path().join(productStackSnapshotDirectory,templateFileKey);if(fs().existsSync(templateFilePath)&&fs().readFileSync(templateFilePath).toString()!==cfn&&this.props.currentVersionLocked)throw new Error(`Template has changed for ProductStack Version ${this.props.currentVersionName}.
        ${this.props.currentVersionName} already exist in ${productStackSnapshotDirectory}.
        Since locked has been set to ${this.props.currentVersionLocked},
        Either update the currentVersionName to deploy a new version or deploy the existing ProductStack snapshot.
        If ${this.props.currentVersionName} was unintentionally synthesized and not deployed, 
        delete the corresponding version from ${productStackSnapshotDirectory} and redeploy.`);fs().writeFileSync(templateFilePath,cfn)}}exports.ProductStackHistory=ProductStackHistory,_a=JSII_RTTI_SYMBOL_1,ProductStackHistory[_a]={fqn:"aws-cdk-lib.aws_servicecatalog.ProductStackHistory",version:"2.175.1"};
