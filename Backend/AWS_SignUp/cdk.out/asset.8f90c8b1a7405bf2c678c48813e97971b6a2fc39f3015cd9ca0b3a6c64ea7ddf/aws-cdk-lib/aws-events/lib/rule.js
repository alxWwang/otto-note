"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Rule=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},events_generated_1=()=>{var tmp=require("./events.generated");return events_generated_1=()=>tmp,tmp},schedule_1=()=>{var tmp=require("./schedule");return schedule_1=()=>tmp,tmp},util_1=()=>{var tmp=require("./util");return util_1=()=>tmp,tmp},aws_iam_1=()=>{var tmp=require("../../aws-iam");return aws_iam_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class Rule extends core_1().Resource{static fromEventRuleArn(scope,id,eventRuleArn){const parts=core_1().Stack.of(scope).splitArn(eventRuleArn,core_1().ArnFormat.SLASH_RESOURCE_NAME);class Import extends core_1().Resource{constructor(){super(...arguments),this.ruleArn=eventRuleArn,this.ruleName=parts.resourceName||""}}return new Import(scope,id,{environmentFromArn:eventRuleArn})}constructor(scope,id,props={}){super(determineRuleScope(scope,props),id,{physicalName:props.ruleName}),this.targets=new Array,this.eventPattern={},this._xEnvTargetsAdded=new Set;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_events_RuleProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,Rule),error}if(props.eventBus&&props.schedule)throw new Error("Cannot associate rule with 'eventBus' when using 'schedule'");this.description=props.description,this.scheduleExpression=props.schedule?.expressionString,props.schedule?._bind(this);const resource=new(events_generated_1()).CfnRule(this,"Resource",{name:this.physicalName,description:this.description,state:props.enabled==null||props.enabled?"ENABLED":"DISABLED",scheduleExpression:this.scheduleExpression,eventPattern:core_1().Lazy.any({produce:()=>this._renderEventPattern()}),targets:core_1().Lazy.any({produce:()=>this.renderTargets()}),eventBusName:props.eventBus&&props.eventBus.eventBusName});this.ruleArn=this.getResourceArnAttribute(resource.attrArn,{service:"events",resource:"rule",resourceName:this.physicalName}),this.ruleName=this.getResourceNameAttribute(resource.ref),this.addEventPattern(props.eventPattern);for(const target of props.targets||[])this.addTarget(target);this.node.addValidation({validate:()=>this.validateRule()})}addTarget(target){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_events_IRuleTarget(target)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addTarget),error}if(!target)return;const autoGeneratedId=`Target${this.targets.length}`,targetProps=target.bind(this,autoGeneratedId),inputProps=targetProps.input&&targetProps.input.bind(this),roleArn=targetProps.role?.roleArn,id=targetProps.id||autoGeneratedId;if(targetProps.targetResource){const targetStack=core_1().Stack.of(targetProps.targetResource),targetAccount=targetProps.targetResource.env?.account||targetStack.account,targetRegion=targetProps.targetResource.env?.region||targetStack.region,sourceStack=core_1().Stack.of(this),sourceAccount=sourceStack.account,sourceRegion=sourceStack.region;if(!this.sameEnvDimension(sourceAccount,targetAccount)||!this.sameEnvDimension(sourceRegion,targetRegion)){if(!targetAccount||core_1().Token.isUnresolved(targetAccount))throw new Error("You need to provide a concrete account for the target stack when using cross-account or cross-region events");if(!targetRegion||core_1().Token.isUnresolved(targetRegion))throw new Error("You need to provide a concrete region for the target stack when using cross-account or cross-region events");if(core_1().Token.isUnresolved(sourceAccount))throw new Error("You need to provide a concrete account for the source stack when using cross-account or cross-region events");const sourceApp=this.node.root;if(!sourceApp||!core_1().App.isApp(sourceApp))throw new Error("Event stack which uses cross-account or cross-region targets must be part of a CDK app");const targetApp=constructs_1().Node.of(targetProps.targetResource).root;if(!targetApp||!core_1().App.isApp(targetApp))throw new Error("Target stack which uses cross-account or cross-region event targets must be part of a CDK app");if(sourceApp!==targetApp)throw new Error("Event stack and target stack must belong to the same CDK app");this.ensureXEnvTargetEventBus(targetStack,targetAccount,targetRegion,id);const mirrorRuleScope=this.obtainMirrorRuleScope(targetStack,targetAccount,targetRegion);new MirrorRule(mirrorRuleScope,`${core_1().Names.uniqueId(this)}-${id}`,{targets:[target],eventPattern:this.eventPattern,schedule:this.scheduleExpression?schedule_1().Schedule.expression(this.scheduleExpression):void 0,description:this.description},this);return}}this.targets.push({id,arn:targetProps.arn,roleArn,ecsParameters:targetProps.ecsParameters,httpParameters:targetProps.httpParameters,kinesisParameters:targetProps.kinesisParameters,runCommandParameters:targetProps.runCommandParameters,batchParameters:targetProps.batchParameters,deadLetterConfig:targetProps.deadLetterConfig,retryPolicy:targetProps.retryPolicy,sqsParameters:targetProps.sqsParameters,redshiftDataParameters:targetProps.redshiftDataParameters,appSyncParameters:targetProps.appSyncParameters,input:inputProps&&inputProps.input,inputPath:inputProps&&inputProps.inputPath,inputTransformer:inputProps?.inputTemplate!==void 0?{inputTemplate:inputProps.inputTemplate,inputPathsMap:inputProps.inputPathsMap}:void 0})}addEventPattern(eventPattern){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_events_EventPattern(eventPattern)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addEventPattern),error}eventPattern&&(0,util_1().mergeEventPattern)(this.eventPattern,eventPattern)}_renderEventPattern(){return(0,util_1().renderEventPattern)(this.eventPattern)}validateRule(){const errors=[],name=this.physicalName;return name!==void 0&&!core_1().Token.isUnresolved(name)&&((name.length<1||name.length>64)&&errors.push(`Event rule name must be between 1 and 64 characters. Received: ${name}`),/^[\.\-_A-Za-z0-9]+$/.test(name)||errors.push(`Event rule name ${name} can contain only letters, numbers, periods, hyphens, or underscores with no spaces.`)),Object.keys(this.eventPattern).length===0&&!this.scheduleExpression&&errors.push("Either 'eventPattern' or 'schedule' must be defined"),this.targets.length>5&&errors.push("Event rule cannot have more than 5 targets."),errors}renderTargets(){if(this.targets.length!==0)return this.targets}ensureXEnvTargetEventBus(targetStack,targetAccount,targetRegion,id){const key=`${targetAccount}:${targetRegion}`;if(this._xEnvTargetsAdded.has(key))return;this._xEnvTargetsAdded.add(key);const eventBusArn=targetStack.formatArn({service:"events",resource:"event-bus",resourceName:"default",region:targetRegion,account:targetAccount}),roleArn=this.sameEnvDimension(targetRegion,core_1().Stack.of(this).region)?void 0:this.crossRegionPutEventsRole(eventBusArn).roleArn;this.targets.push({id,arn:eventBusArn,roleArn});const sourceApp=this.node.root,sourceAccount=core_1().Stack.of(this).account;if(!this.sameEnvDimension(sourceAccount,targetAccount)){const stackId=`EventBusPolicy-${sourceAccount}-${targetRegion}-${targetAccount}`;let eventBusPolicyStack=sourceApp.node.tryFindChild(stackId);if(!eventBusPolicyStack){eventBusPolicyStack=new(core_1()).Stack(sourceApp,stackId,{env:{account:targetAccount,region:targetRegion},stackName:`${targetStack.stackName}-EventBusPolicy-support-${targetRegion}-${sourceAccount}`});const statementPrefix=`Allow-account-${sourceAccount}-`;new(events_generated_1()).CfnEventBusPolicy(eventBusPolicyStack,"GivePermToOtherAccount",{action:"events:PutEvents",statementId:statementPrefix+core_1().Names.uniqueResourceName(this,{maxLength:64-statementPrefix.length}),principal:sourceAccount})}core_1().Stack.of(this).addDependency(eventBusPolicyStack)}}obtainMirrorRuleScope(targetStack,targetAccount,targetRegion){if(this.sameEnvDimension(targetStack.account,targetAccount)&&this.sameEnvDimension(targetStack.region,targetRegion))return targetStack;throw new Error("Cannot create a cross-account or cross-region rule for an imported resource (create a stack with the right environment for the imported resource)")}crossRegionPutEventsRole(eventBusArn){const id="EventsRole";let role=this.node.tryFindChild(id);return role||(role=new(aws_iam_1()).Role(this,id,{roleName:core_1().PhysicalName.GENERATE_IF_NEEDED,assumedBy:new(aws_iam_1()).ServicePrincipal("events.amazonaws.com")})),role.addToPrincipalPolicy(new(aws_iam_1()).PolicyStatement({actions:["events:PutEvents"],resources:[eventBusArn]})),role}sameEnvDimension(dim1,dim2){switch(core_1().Token.compareStrings(dim1,dim2)){case core_1().TokenComparison.ONE_UNRESOLVED:return core_1().Annotations.of(this).addWarningV2("@aws-cdk/aws-events:ruleUnresolvedEnvironment",`Either the Event Rule or target has an unresolved environment. 
           If they are being used in a cross-environment setup you need to specify the environment for both.`),!0;case core_1().TokenComparison.BOTH_UNRESOLVED:case core_1().TokenComparison.SAME:return!0;default:return!1}}}exports.Rule=Rule,_a=JSII_RTTI_SYMBOL_1,Rule[_a]={fqn:"aws-cdk-lib.aws_events.Rule",version:"2.175.1"};function determineRuleScope(scope,props){if(!props.crossStackScope)return scope;const scopeStack=core_1().Stack.of(scope),targetStack=core_1().Stack.of(props.crossStackScope);if(scopeStack===targetStack)return scope;const regionComparison=core_1().Token.compareStrings(scopeStack.region,targetStack.region),accountComparison=core_1().Token.compareStrings(scopeStack.account,targetStack.account);return(regionComparison===core_1().TokenComparison.SAME||regionComparison===core_1().TokenComparison.BOTH_UNRESOLVED)&&(accountComparison===core_1().TokenComparison.SAME||accountComparison===core_1().TokenComparison.BOTH_UNRESOLVED)?props.crossStackScope:scope}class MirrorRule extends Rule{constructor(scope,id,props,source){super(scope,id,props),this.source=source}_renderEventPattern(){return this.source._renderEventPattern()}validateRule(){return[]}}
