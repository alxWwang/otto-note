"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.LoadBalancerTarget=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");class LoadBalancerTarget{constructor(loadBalancer,props){this.loadBalancer=loadBalancer,this.props=props;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_elasticloadbalancingv2_ILoadBalancerV2(loadBalancer),jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_targets_IAliasRecordTargetProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,LoadBalancerTarget),error}}bind(_record,_zone){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_IRecordSet(_record),jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_IHostedZone(_zone)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}return{hostedZoneId:this.loadBalancer.loadBalancerCanonicalHostedZoneId,dnsName:`dualstack.${this.loadBalancer.loadBalancerDnsName}`,evaluateTargetHealth:this.props?.evaluateTargetHealth}}}exports.LoadBalancerTarget=LoadBalancerTarget,_a=JSII_RTTI_SYMBOL_1,LoadBalancerTarget[_a]={fqn:"aws-cdk-lib.aws_route53_targets.LoadBalancerTarget",version:"2.175.1"};
