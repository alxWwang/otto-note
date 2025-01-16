"use strict";var n=Object.defineProperty,R=Object.getOwnPropertyDescriptor,d=Object.getOwnPropertyNames,u=Object.prototype.hasOwnProperty,m=(e,s)=>{for(var t in s)n(e,t,{get:s[t],enumerable:!0})},b=(e,s,t,o)=>{if(s&&typeof s=="object"||typeof s=="function")for(let a of d(s))!u.call(e,a)&&a!==t&&n(e,a,{get:()=>s[a],enumerable:!(o=R(s,a))||o.enumerable});return e},T=e=>b(n({},"__esModule",{value:!0}),e),y={};m(y,{isCompleteHandler:()=>g,onEventHandler:()=>C}),module.exports=T(y);var c=require("@aws-sdk/client-dynamodb");async function C(e){console.log("Event: %j",{...e,ResponseURL:"..."});let s=new c.DynamoDB({}),t=e.ResourceProperties.TableName,o=e.ResourceProperties.Region,a;if(e.RequestType==="Create"||e.RequestType==="Delete")a=e.RequestType;else{let l=await s.describeTable({TableName:t});console.log("Describe table: %j",l),a=l.Table?.Replicas?.some(i=>i.RegionName===o)?void 0:"Create"}if(a){let l=await s.updateTable({TableName:t,ReplicaUpdates:[{[a]:{RegionName:o}}]});console.log("Update table: %j",l)}else console.log("Skipping updating Table, as a replica in '%s' already exists",o);return e.RequestType==="Create"||e.RequestType==="Update"?{PhysicalResourceId:`${t}-${o}`}:{}}async function g(e){console.log("Event: %j",{...e,ResponseURL:"..."});let t=await new c.DynamoDB({}).describeTable({TableName:e.ResourceProperties.TableName});console.log("Describe table: %j",t);let o=t.Table?.TableStatus==="ACTIVE",l=(t.Table?.Replicas??[]).find(r=>r.RegionName===e.ResourceProperties.Region),p=l?.ReplicaStatus==="ACTIVE",i=e.ResourceProperties.SkipReplicationCompletedWait==="true";switch(e.RequestType){case"Create":case"Update":return{IsComplete:o&&(p||i)};case"Delete":return{IsComplete:o&&l===void 0}}}
