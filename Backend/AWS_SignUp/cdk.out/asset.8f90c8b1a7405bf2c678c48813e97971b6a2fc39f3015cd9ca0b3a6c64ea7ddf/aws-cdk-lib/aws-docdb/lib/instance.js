"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.DatabaseInstance=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var docdb_generated_1=()=>{var tmp=require("./docdb.generated");return docdb_generated_1=()=>tmp,tmp},endpoint_1=()=>{var tmp=require("./endpoint");return endpoint_1=()=>tmp,tmp},ec2=()=>{var tmp=require("../../aws-ec2");return ec2=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp};class DatabaseInstanceBase extends cdk().Resource{static fromDatabaseInstanceAttributes(scope,id,attrs){class Import extends DatabaseInstanceBase{constructor(){super(...arguments),this.defaultPort=ec2().Port.tcp(attrs.port),this.instanceIdentifier=attrs.instanceIdentifier,this.dbInstanceEndpointAddress=attrs.instanceEndpointAddress,this.dbInstanceEndpointPort=attrs.port.toString(),this.instanceEndpoint=new(endpoint_1()).Endpoint(attrs.instanceEndpointAddress,attrs.port)}}return new Import(scope,id)}get instanceArn(){return cdk().Stack.of(this).formatArn({service:"rds",resource:"db",arnFormat:core_1().ArnFormat.COLON_RESOURCE_NAME,resourceName:this.instanceIdentifier})}}class DatabaseInstance extends DatabaseInstanceBase{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_docdb_DatabaseInstanceProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,DatabaseInstance),error}const instance=new(docdb_generated_1()).CfnDBInstance(this,"Resource",{dbClusterIdentifier:props.cluster.clusterIdentifier,dbInstanceClass:`db.${props.instanceType}`,autoMinorVersionUpgrade:props.autoMinorVersionUpgrade??!0,availabilityZone:props.availabilityZone,caCertificateIdentifier:props.caCertificate?props.caCertificate.toString():void 0,dbInstanceIdentifier:props.dbInstanceName,preferredMaintenanceWindow:props.preferredMaintenanceWindow,enablePerformanceInsights:props.enablePerformanceInsights});this.cluster=props.cluster,this.instanceIdentifier=instance.ref,this.dbInstanceEndpointAddress=instance.attrEndpoint,this.dbInstanceEndpointPort=instance.attrPort;const portAttribute=cdk().Token.asNumber(instance.attrPort);this.instanceEndpoint=new(endpoint_1()).Endpoint(instance.attrEndpoint,portAttribute),instance.applyRemovalPolicy(props.removalPolicy,{applyToUpdateReplacePolicy:!0})}}exports.DatabaseInstance=DatabaseInstance,_a=JSII_RTTI_SYMBOL_1,DatabaseInstance[_a]={fqn:"aws-cdk-lib.aws_docdb.DatabaseInstance",version:"2.175.1"};
