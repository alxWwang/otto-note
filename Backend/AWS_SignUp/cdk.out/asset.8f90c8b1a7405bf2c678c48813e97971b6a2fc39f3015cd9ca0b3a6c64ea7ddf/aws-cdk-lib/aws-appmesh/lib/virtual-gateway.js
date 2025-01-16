"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.VirtualGateway=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var appmesh_generated_1=()=>{var tmp=require("./appmesh.generated");return appmesh_generated_1=()=>tmp,tmp},gateway_route_1=()=>{var tmp=require("./gateway-route");return gateway_route_1=()=>tmp,tmp},mesh_1=()=>{var tmp=require("./mesh");return mesh_1=()=>tmp,tmp},utils_1=()=>{var tmp=require("./private/utils");return utils_1=()=>tmp,tmp},virtual_gateway_listener_1=()=>{var tmp=require("./virtual-gateway-listener");return virtual_gateway_listener_1=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp},cdk=()=>{var tmp=require("../../core");return cdk=()=>tmp,tmp};class VirtualGatewayBase extends cdk().Resource{addGatewayRoute(id,props){return new(gateway_route_1()).GatewayRoute(this,id,{...props,virtualGateway:this})}grantStreamAggregatedResources(identity){return iam().Grant.addToPrincipal({grantee:identity,actions:["appmesh:StreamAggregatedResources"],resourceArns:[this.virtualGatewayArn]})}}class VirtualGateway extends VirtualGatewayBase{static fromVirtualGatewayArn(scope,id,virtualGatewayArn){return new class extends VirtualGatewayBase{constructor(){super(...arguments),this.parsedArn=cdk().Fn.split("/",cdk().Stack.of(scope).splitArn(virtualGatewayArn,cdk().ArnFormat.SLASH_RESOURCE_NAME).resourceName),this.mesh=mesh_1().Mesh.fromMeshName(this,"Mesh",cdk().Fn.select(0,this.parsedArn)),this.virtualGatewayArn=virtualGatewayArn,this.virtualGatewayName=cdk().Fn.select(2,this.parsedArn)}}(scope,id)}static fromVirtualGatewayAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_appmesh_VirtualGatewayAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromVirtualGatewayAttributes),error}return new class extends VirtualGatewayBase{constructor(){super(...arguments),this.mesh=attrs.mesh,this.virtualGatewayName=attrs.virtualGatewayName,this.virtualGatewayArn=cdk().Stack.of(this).formatArn({service:"appmesh",resource:`mesh/${attrs.mesh.meshName}/virtualGateway`,resourceName:this.virtualGatewayName})}}(scope,id)}constructor(scope,id,props){super(scope,id,{physicalName:props.virtualGatewayName||cdk().Lazy.string({produce:()=>cdk().Names.uniqueId(this)})}),this.listeners=new Array;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_appmesh_VirtualGatewayProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,VirtualGateway),error}this.mesh=props.mesh,props.listeners?props.listeners.forEach(listener=>this.listeners.push(listener.bind(this))):this.listeners.push(virtual_gateway_listener_1().VirtualGatewayListener.http().bind(this));const accessLogging=props.accessLog?.bind(this),node=new(appmesh_generated_1()).CfnVirtualGateway(this,"Resource",{virtualGatewayName:this.physicalName,meshName:this.mesh.meshName,meshOwner:(0,utils_1().renderMeshOwner)(this.env.account,this.mesh.env.account),spec:{listeners:this.listeners.map(listener=>listener.listener),backendDefaults:props.backendDefaults!==void 0?{clientPolicy:{tls:(0,utils_1().renderTlsClientPolicy)(this,props.backendDefaults?.tlsClientPolicy)}}:void 0,logging:accessLogging!==void 0?{accessLog:accessLogging.virtualGatewayAccessLog}:void 0}});this.virtualGatewayName=this.getResourceNameAttribute(node.attrVirtualGatewayName),this.virtualGatewayArn=this.getResourceArnAttribute(node.ref,{service:"appmesh",resource:`mesh/${props.mesh.meshName}/virtualGateway`,resourceName:this.physicalName})}}exports.VirtualGateway=VirtualGateway,_a=JSII_RTTI_SYMBOL_1,VirtualGateway[_a]={fqn:"aws-cdk-lib.aws_appmesh.VirtualGateway",version:"2.175.1"};
