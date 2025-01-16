"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Ec2TaskDefinition=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp},_imported_task_definition_1=()=>{var tmp=require("../base/_imported-task-definition");return _imported_task_definition_1=()=>tmp,tmp},task_definition_1=()=>{var tmp=require("../base/task-definition");return task_definition_1=()=>tmp,tmp};class Ec2TaskDefinition extends task_definition_1().TaskDefinition{static fromEc2TaskDefinitionArn(scope,id,ec2TaskDefinitionArn){return new(_imported_task_definition_1()).ImportedTaskDefinition(scope,id,{taskDefinitionArn:ec2TaskDefinitionArn})}static fromEc2TaskDefinitionAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ecs_Ec2TaskDefinitionAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromEc2TaskDefinitionAttributes),error}return new(_imported_task_definition_1()).ImportedTaskDefinition(scope,id,{taskDefinitionArn:attrs.taskDefinitionArn,compatibility:task_definition_1().Compatibility.EC2,networkMode:attrs.networkMode,taskRole:attrs.taskRole,executionRole:attrs.executionRole})}static validatePlacementConstraints(constraints){const validConstraints=new Set(["memberOf"]),invalidConstraints=constraints?.filter(constraint=>constraint.toJson().some(constraintProperty=>!validConstraints.has(constraintProperty.type)))??[];if(invalidConstraints.length>0){const invalidConstraintTypes=invalidConstraints.map(constraint=>constraint.toJson().map(constraintProperty=>constraintProperty.type)).flat();throw new Error(`Invalid placement constraint(s): ${invalidConstraintTypes.join(", ")}. Only 'memberOf' is currently supported in the Ec2TaskDefinition class.`)}}constructor(scope,id,props={}){super(scope,id,{...props,compatibility:task_definition_1().Compatibility.EC2,placementConstraints:props.placementConstraints,ipcMode:props.ipcMode,pidMode:props.pidMode,inferenceAccelerators:props.inferenceAccelerators});try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ecs_Ec2TaskDefinitionProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,Ec2TaskDefinition),error}Ec2TaskDefinition.validatePlacementConstraints(props.placementConstraints??[])}addContainer(id,props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ecs_ContainerDefinitionOptions(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addContainer),error}return this.networkMode===task_definition_1().NetworkMode.AWS_VPC?super.addContainer(id,{...props,environment:{...props.environment,AWS_REGION:core_1().Stack.of(this).region}}):super.addContainer(id,props)}}exports.Ec2TaskDefinition=Ec2TaskDefinition,_a=JSII_RTTI_SYMBOL_1,Ec2TaskDefinition[_a]={fqn:"aws-cdk-lib.aws_ecs.Ec2TaskDefinition",version:"2.175.1"};
