"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.WebSocketRoute=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},authorizer_1=()=>{var tmp=require("./authorizer");return authorizer_1=()=>tmp,tmp},index_1=()=>{var tmp=require(".././index");return index_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp};class WebSocketRoute extends core_1().Resource{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_apigatewayv2_WebSocketRouteProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,WebSocketRoute),error}if(props.routeKey!="$connect"&&props.authorizer)throw new Error("You can only set a WebSocket authorizer to a $connect route.");this.webSocketApi=props.webSocketApi,this.routeKey=props.routeKey;const config=props.integration._bindToRoute({route:this,scope:this}),authBindResult=(props.authorizer??new(authorizer_1()).WebSocketNoneAuthorizer).bind({route:this,scope:this.webSocketApi instanceof constructs_1().Construct?this.webSocketApi:this}),route=new(index_1()).CfnRoute(this,"Resource",{apiId:props.webSocketApi.apiId,apiKeyRequired:props.apiKeyRequired,routeKey:props.routeKey,target:`integrations/${config.integrationId}`,authorizerId:authBindResult.authorizerId,authorizationType:authBindResult.authorizationType,routeResponseSelectionExpression:props.returnResponse?"$default":void 0});this.routeId=route.ref,props.returnResponse&&new(index_1()).CfnRouteResponse(this,"Response",{apiId:props.webSocketApi.apiId,routeId:route.ref,routeResponseKey:"$default"})}}exports.WebSocketRoute=WebSocketRoute,_a=JSII_RTTI_SYMBOL_1,WebSocketRoute[_a]={fqn:"aws-cdk-lib.aws_apigatewayv2.WebSocketRoute",version:"2.175.1"};
