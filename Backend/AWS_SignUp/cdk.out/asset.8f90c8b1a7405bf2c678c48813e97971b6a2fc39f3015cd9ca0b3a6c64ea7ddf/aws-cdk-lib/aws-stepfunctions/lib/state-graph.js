"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.StateGraph=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var distributed_map_1=()=>{var tmp=require("./states/distributed-map");return distributed_map_1=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp};class StateGraph{constructor(startState,graphDescription){this.startState=startState,this.graphDescription=graphDescription,this.policyStatements=new Array,this.allStates=new Set,this.allContainedStates=new Map;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_State(startState)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,StateGraph),error}this.allStates.add(startState),startState.bindToGraph(this)}registerState(state){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_State(state)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.registerState),error}this.registerContainedState(state.stateId,this),this.allStates.add(state)}registerPolicyStatement(statement){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_PolicyStatement(statement)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.registerPolicyStatement),error}this.superGraph?this.superGraph.registerPolicyStatement(statement):this.policyStatements.push(statement)}registerSuperGraph(graph){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_StateGraph(graph)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.registerSuperGraph),error}if(this.superGraph!==graph){if(this.superGraph)throw new Error("Every StateGraph can only be registered into one other StateGraph");this.superGraph=graph,this.pushContainedStatesUp(graph),this.pushPolicyStatementsUp(graph)}}toGraphJson(){const states={};for(const state of this.allStates)states[state.stateId]=state.toStateJson();return{StartAt:this.startState.stateId,States:states,TimeoutSeconds:this.timeout&&this.timeout.toSeconds()}}toString(){const someNodes=Array.from(this.allStates).slice(0,3).map(x=>x.stateId);return this.allStates.size>3&&someNodes.push("..."),`${this.graphDescription} (${someNodes.join(", ")})`}registerContainedState(stateId,graph){if(this.superGraph)this.superGraph.registerContainedState(stateId,graph);else{const existingGraph=this.allContainedStates.get(stateId);if(existingGraph)throw new Error(`State with name '${stateId}' occurs in both ${graph} and ${existingGraph}. All states must have unique names.`);this.allContainedStates.set(stateId,graph)}}pushContainedStatesUp(superGraph){for(const[stateId,graph]of this.allContainedStates)superGraph.registerContainedState(stateId,graph)}pushPolicyStatementsUp(superGraph){for(const policyStatement of this.policyStatements)superGraph.registerPolicyStatement(policyStatement)}bind(stateMachine){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_stepfunctions_StateMachine(stateMachine)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}for(const state of this.allStates)if(distributed_map_1().DistributedMap.isDistributedMap(state)){stateMachine.role.attachInlinePolicy(new(iam()).Policy(stateMachine,"DistributedMapPolicy",{document:new(iam()).PolicyDocument({statements:[new(iam()).PolicyStatement({actions:["states:StartExecution"],resources:[stateMachine.stateMachineArn]}),new(iam()).PolicyStatement({actions:["states:DescribeExecution","states:StopExecution"],resources:[`${stateMachine.stateMachineArn}:*`]})]})}));break}}}exports.StateGraph=StateGraph,_a=JSII_RTTI_SYMBOL_1,StateGraph[_a]={fqn:"aws-cdk-lib.aws_stepfunctions.StateGraph",version:"2.175.1"};
