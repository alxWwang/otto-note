"use strict";var _a,_b,_c;Object.defineProperty(exports,"__esModule",{value:!0}),exports.PrivateHostedZone=exports.PublicHostedZone=exports.HostedZone=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var key_signing_key_1=()=>{var tmp=require("./key-signing-key");return key_signing_key_1=()=>tmp,tmp},record_set_1=()=>{var tmp=require("./record-set");return record_set_1=()=>tmp,tmp},route53_generated_1=()=>{var tmp=require("./route53.generated");return route53_generated_1=()=>tmp,tmp},util_1=()=>{var tmp=require("./util");return util_1=()=>tmp,tmp},iam=()=>{var tmp=require("../../aws-iam");return iam=()=>tmp,tmp},cxschema=()=>{var tmp=require("../../cloud-assembly-schema");return cxschema=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class HostedZone extends core_1().Resource{get hostedZoneArn(){return(0,util_1().makeHostedZoneArn)(this,this.hostedZoneId)}static fromHostedZoneId(scope,id,hostedZoneId){class Import extends core_1().Resource{constructor(){super(...arguments),this.hostedZoneId=hostedZoneId}get zoneName(){throw new Error("Cannot reference `zoneName` when using `HostedZone.fromHostedZoneId()`. A construct consuming this hosted zone may be trying to reference its `zoneName`. If this is the case, use `fromHostedZoneAttributes()` or `fromLookup()` instead.")}get hostedZoneArn(){return(0,util_1().makeHostedZoneArn)(this,this.hostedZoneId)}grantDelegation(grantee){return(0,util_1().makeGrantDelegation)(grantee,this.hostedZoneArn)}}return new Import(scope,id)}static fromHostedZoneAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_HostedZoneAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromHostedZoneAttributes),error}class Import extends core_1().Resource{constructor(){super(...arguments),this.hostedZoneId=attrs.hostedZoneId,this.zoneName=attrs.zoneName}get hostedZoneArn(){return(0,util_1().makeHostedZoneArn)(this,this.hostedZoneId)}grantDelegation(grantee){return(0,util_1().makeGrantDelegation)(grantee,this.hostedZoneArn)}}return new Import(scope,id)}static fromLookup(scope,id,query){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_HostedZoneProviderProps(query)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromLookup),error}if(!query.domainName)throw new Error("Cannot use undefined value for attribute `domainName`");const DEFAULT_HOSTED_ZONE={Id:"DUMMY",Name:query.domainName},response=core_1().ContextProvider.getValue(scope,{provider:cxschema().ContextProvider.HOSTED_ZONE_PROVIDER,dummyValue:DEFAULT_HOSTED_ZONE,props:query}).value;return response.Name.endsWith(".")&&(response.Name=response.Name.substring(0,response.Name.length-1)),response.Id=response.Id.replace("/hostedzone/",""),HostedZone.fromHostedZoneAttributes(scope,id,{hostedZoneId:response.Id,zoneName:response.Name})}constructor(scope,id,props){super(scope,id),this.vpcs=new Array;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_HostedZoneProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,HostedZone),error}(0,util_1().validateZoneName)(props.zoneName);const zoneName=props.addTrailingDot===!1||props.zoneName.endsWith(".")?props.zoneName:`${props.zoneName}.`,resource=new(route53_generated_1()).CfnHostedZone(this,"Resource",{name:zoneName,hostedZoneConfig:props.comment?{comment:props.comment}:void 0,queryLoggingConfig:props.queryLogsLogGroupArn?{cloudWatchLogsLogGroupArn:props.queryLogsLogGroupArn}:void 0,vpcs:core_1().Lazy.any({produce:()=>this.vpcs.length===0?void 0:this.vpcs})});this.hostedZoneId=resource.ref,this.hostedZoneNameServers=resource.attrNameServers,this.zoneName=props.zoneName;for(const vpc of props.vpcs||[])this.addVpc(vpc)}addVpc(vpc){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ec2_IVpc(vpc)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addVpc),error}this.vpcs.push({vpcId:vpc.vpcId,vpcRegion:vpc.env.region??core_1().Stack.of(vpc).region})}grantDelegation(grantee){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_iam_IGrantable(grantee)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.grantDelegation),error}return(0,util_1().makeGrantDelegation)(grantee,this.hostedZoneArn)}enableDnssec(options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_ZoneSigningOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.enableDnssec),error}if(this.keySigningKey)throw new Error("DNSSEC is already enabled for this hosted zone");return this.keySigningKey=new(key_signing_key_1()).KeySigningKey(this,"KeySigningKey",{hostedZone:this,keySigningKeyName:options.keySigningKeyName,kmsKey:options.kmsKey}),new(route53_generated_1()).CfnDNSSEC(this,"DNSSEC",{hostedZoneId:this.hostedZoneId}).addDependency(this.keySigningKey.node.defaultChild),this.keySigningKey}}exports.HostedZone=HostedZone,_a=JSII_RTTI_SYMBOL_1,HostedZone[_a]={fqn:"aws-cdk-lib.aws_route53.HostedZone",version:"2.175.1"};class PublicHostedZone extends HostedZone{static fromPublicHostedZoneId(scope,id,publicHostedZoneId){class Import extends core_1().Resource{constructor(){super(...arguments),this.hostedZoneId=publicHostedZoneId}get zoneName(){throw new Error("Cannot reference `zoneName` when using `PublicHostedZone.fromPublicHostedZoneId()`. A construct consuming this hosted zone may be trying to reference its `zoneName`. If this is the case, use `fromPublicHostedZoneAttributes()` instead")}get hostedZoneArn(){return(0,util_1().makeHostedZoneArn)(this,this.hostedZoneId)}grantDelegation(grantee){return(0,util_1().makeGrantDelegation)(grantee,this.hostedZoneArn)}}return new Import(scope,id)}static fromPublicHostedZoneAttributes(scope,id,attrs){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_PublicHostedZoneAttributes(attrs)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.fromPublicHostedZoneAttributes),error}class Import extends core_1().Resource{constructor(){super(...arguments),this.hostedZoneId=attrs.hostedZoneId,this.zoneName=attrs.zoneName}get hostedZoneArn(){return(0,util_1().makeHostedZoneArn)(this,this.hostedZoneId)}grantDelegation(grantee){return(0,util_1().makeGrantDelegation)(grantee,this.hostedZoneArn)}}return new Import(scope,id)}constructor(scope,id,props){super(scope,id,props);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_PublicHostedZoneProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,PublicHostedZone),error}if(props.caaAmazon&&new(record_set_1()).CaaAmazonRecord(this,"CaaAmazon",{zone:this}),!props.crossAccountZoneDelegationPrincipal&&props.crossAccountZoneDelegationRoleName)throw Error("crossAccountZoneDelegationRoleName property is not supported without crossAccountZoneDelegationPrincipal");props.crossAccountZoneDelegationPrincipal&&(this.crossAccountZoneDelegationRole=new(iam()).Role(this,"CrossAccountZoneDelegationRole",{roleName:props.crossAccountZoneDelegationRoleName,assumedBy:props.crossAccountZoneDelegationPrincipal,inlinePolicies:{delegation:new(iam()).PolicyDocument({statements:[new(iam()).PolicyStatement({actions:["route53:ChangeResourceRecordSets"],resources:[this.hostedZoneArn],conditions:{"ForAllValues:StringEquals":{"route53:ChangeResourceRecordSetsRecordTypes":["NS"],"route53:ChangeResourceRecordSetsActions":["UPSERT","DELETE"]}}}),new(iam()).PolicyStatement({actions:["route53:ListHostedZonesByName"],resources:["*"]})]})}}))}addVpc(_vpc){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ec2_IVpc(_vpc)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addVpc),error}throw new Error("Cannot associate public hosted zones with a VPC")}addDelegation(delegate,opts={}){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_IPublicHostedZone(delegate),jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_ZoneDelegationOptions(opts)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addDelegation),error}new(record_set_1()).ZoneDelegationRecord(this,`${this.zoneName} -> ${delegate.zoneName}`,{zone:this,recordName:delegate.zoneName,nameServers:delegate.hostedZoneNameServers,comment:opts.comment,ttl:opts.ttl})}}exports.PublicHostedZone=PublicHostedZone,_b=JSII_RTTI_SYMBOL_1,PublicHostedZone[_b]={fqn:"aws-cdk-lib.aws_route53.PublicHostedZone",version:"2.175.1"};class PrivateHostedZone extends HostedZone{static fromPrivateHostedZoneId(scope,id,privateHostedZoneId){class Import extends core_1().Resource{constructor(){super(...arguments),this.hostedZoneId=privateHostedZoneId}get zoneName(){throw new Error("Cannot reference `zoneName` when using `PrivateHostedZone.fromPrivateHostedZoneId()`. A construct consuming this hosted zone may be trying to reference its `zoneName`")}get hostedZoneArn(){return(0,util_1().makeHostedZoneArn)(this,this.hostedZoneId)}grantDelegation(grantee){return(0,util_1().makeGrantDelegation)(grantee,this.hostedZoneArn)}}return new Import(scope,id)}constructor(scope,id,props){super(scope,id,props);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_PrivateHostedZoneProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,PrivateHostedZone),error}this.addVpc(props.vpc)}}exports.PrivateHostedZone=PrivateHostedZone,_c=JSII_RTTI_SYMBOL_1,PrivateHostedZone[_c]={fqn:"aws-cdk-lib.aws_route53.PrivateHostedZone",version:"2.175.1"};
