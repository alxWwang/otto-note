"use strict";var _a,_b;Object.defineProperty(exports,"__esModule",{value:!0}),exports.ScopedAws=exports.Aws=void 0;const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cfn_reference_1=()=>{var tmp=require("./private/cfn-reference");return cfn_reference_1=()=>tmp,tmp},token_1=()=>{var tmp=require("./token");return token_1=()=>tmp,tmp};const AWS_ACCOUNTID="AWS::AccountId",AWS_URLSUFFIX="AWS::URLSuffix",AWS_NOTIFICATIONARNS="AWS::NotificationARNs",AWS_PARTITION="AWS::Partition",AWS_REGION="AWS::Region",AWS_STACKID="AWS::StackId",AWS_STACKNAME="AWS::StackName",AWS_NOVALUE="AWS::NoValue";class Aws{constructor(){}}exports.Aws=Aws,_a=JSII_RTTI_SYMBOL_1,Aws[_a]={fqn:"aws-cdk-lib.Aws",version:"2.175.1"},Aws.ACCOUNT_ID=pseudoString(AWS_ACCOUNTID),Aws.URL_SUFFIX=pseudoString(AWS_URLSUFFIX),Aws.NOTIFICATION_ARNS=token_1().Token.asList({Ref:AWS_NOTIFICATIONARNS},{displayHint:AWS_NOTIFICATIONARNS}),Aws.PARTITION=pseudoString(AWS_PARTITION),Aws.REGION=pseudoString(AWS_REGION),Aws.STACK_ID=pseudoString(AWS_STACKID),Aws.STACK_NAME=pseudoString(AWS_STACKNAME),Aws.NO_VALUE=pseudoString(AWS_NOVALUE);class ScopedAws{constructor(scope){this.scope=scope}get accountId(){return this.asString(AWS_ACCOUNTID)}get urlSuffix(){return this.asString(AWS_URLSUFFIX)}get notificationArns(){return token_1().Token.asList(cfn_reference_1().CfnReference.forPseudo(AWS_NOTIFICATIONARNS,this.scope),{displayHint:AWS_NOTIFICATIONARNS})}get partition(){return this.asString(AWS_PARTITION)}get region(){return this.asString(AWS_REGION)}get stackId(){return this.asString(AWS_STACKID)}get stackName(){return this.asString(AWS_STACKNAME)}asString(name){return token_1().Token.asString(cfn_reference_1().CfnReference.forPseudo(name,this.scope),{displayHint:name})}}exports.ScopedAws=ScopedAws,_b=JSII_RTTI_SYMBOL_1,ScopedAws[_b]={fqn:"aws-cdk-lib.ScopedAws",version:"2.175.1"};function pseudoString(name){return token_1().Token.asString({Ref:name},{displayHint:name.replace("::",".")})}
