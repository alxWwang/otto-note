"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Policy=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var iam_generated_1=()=>{var tmp=require("./iam.generated");return iam_generated_1=()=>tmp,tmp},policy_document_1=()=>{var tmp=require("./policy-document");return policy_document_1=()=>tmp,tmp},util_1=()=>{var tmp=require("./private/util");return util_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class Policy extends core_1().Resource{static fromPolicyName(scope,id,policyName){class Import extends core_1().Resource{constructor(){super(...arguments),this.policyName=policyName}}return new Import(scope,id)}constructor(scope,id,props={}){super(scope,id,{physicalName:props.policyName||core_1().Lazy.string({produce:()=>(0,util_1().generatePolicyName)(scope,resource.logicalId)})}),this.document=new(policy_document_1()).PolicyDocument,this.roles=new Array,this.users=new Array,this.groups=new Array,this.referenceTaken=!1;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_PolicyProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,Policy),error}const self=this;class CfnPolicyConditional extends iam_generated_1().CfnPolicy{shouldSynthesize(){return self.force||self.referenceTaken||!self.document.isEmpty&&self.isAttached}}props.document&&(this.document=props.document);const resource=new CfnPolicyConditional(this,"Resource",{policyDocument:this.document,policyName:this.physicalName,roles:(0,util_1().undefinedIfEmpty)(()=>this.roles.map(r=>r.roleName)),users:(0,util_1().undefinedIfEmpty)(()=>this.users.map(u=>u.userName)),groups:(0,util_1().undefinedIfEmpty)(()=>this.groups.map(g=>g.groupName))});this._policyName=this.physicalName,this.force=props.force??!1,props.users&&props.users.forEach(u=>this.attachToUser(u)),props.groups&&props.groups.forEach(g=>this.attachToGroup(g)),props.roles&&props.roles.forEach(r=>this.attachToRole(r)),props.statements&&props.statements.forEach(p=>this.addStatements(p)),this.grantPrincipal=new PolicyGrantPrincipal(this),this.node.addValidation({validate:()=>this.validatePolicy()})}addStatements(...statement){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_PolicyStatement(statement)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addStatements),error}this.document.addStatements(...statement)}attachToUser(user){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IUser(user)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.attachToUser),error}this.users.find(u=>u.userArn===user.userArn)||(this.users.push(user),user.attachInlinePolicy(this))}attachToRole(role){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IRole(role)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.attachToRole),error}this.roles.find(r=>r.roleArn===role.roleArn)||(this.roles.push(role),role.attachInlinePolicy(this))}attachToGroup(group){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IGroup(group)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.attachToGroup),error}this.groups.find(g=>g.groupArn===group.groupArn)||(this.groups.push(group),group.attachInlinePolicy(this))}get policyName(){return this.referenceTaken=!0,this._policyName}validatePolicy(){const result=new Array;return this.document.isEmpty&&(this.force&&result.push("Policy created with force=true is empty. You must add statements to the policy"),!this.force&&this.referenceTaken&&result.push("This Policy has been referenced by a resource, so it must contain at least one statement.")),this.isAttached||(this.force&&result.push("Policy created with force=true must be attached to at least one principal: user, group or role"),!this.force&&this.referenceTaken&&result.push("This Policy has been referenced by a resource, so it must be attached to at least one user, group or role.")),result.push(...this.document.validateForIdentityPolicy()),result}get isAttached(){return this.groups.length+this.users.length+this.roles.length>0}}exports.Policy=Policy,_a=JSII_RTTI_SYMBOL_1,Policy[_a]={fqn:"aws-cdk-lib.aws_iam.Policy",version:"2.175.1"};class PolicyGrantPrincipal{constructor(_policy){this._policy=_policy,this.assumeRoleAction="sts:AssumeRole",this.grantPrincipal=this,this.principalAccount=_policy.env.account}get policyFragment(){throw new Error(`Cannot use a Policy '${this._policy.node.path}' as the 'Principal' or 'NotPrincipal' in an IAM Policy`)}addToPolicy(statement){return this.addToPrincipalPolicy(statement).statementAdded}addToPrincipalPolicy(statement){return this._policy.addStatements(statement),{statementAdded:!0,policyDependable:this._policy}}}
