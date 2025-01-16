"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Endpoint=void 0;const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class Endpoint{static isValidPort(port){return Number.isInteger(port)&&port>=Endpoint.MIN_PORT&&port<=Endpoint.MAX_PORT}constructor(address,port){if(!core_1().Token.isUnresolved(port)&&!Endpoint.isValidPort(port))throw new Error(`Port must be an integer between [${Endpoint.MIN_PORT}, ${Endpoint.MAX_PORT}] but got: ${port}`);this.hostname=address,this.port=port;const portDesc=core_1().Token.isUnresolved(port)?core_1().Token.asString(port):port;this.socketAddress=`${address}:${portDesc}`}portAsString(){return core_1().Token.isUnresolved(this.port)?core_1().Token.asString(this.port):this.port.toString()}}exports.Endpoint=Endpoint,_a=JSII_RTTI_SYMBOL_1,Endpoint[_a]={fqn:"aws-cdk-lib.aws_docdb.Endpoint",version:"2.175.1"},Endpoint.MIN_PORT=1,Endpoint.MAX_PORT=65535;
