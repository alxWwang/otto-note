"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.CloudFrontTarget=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};class CloudFrontTarget{static getHostedZoneId(scope){const mappingName="AWSCloudFrontPartitionHostedZoneIdMap",scopeStack=core_1().Stack.of(scope);return(scopeStack.node.tryFindChild(mappingName)??new(core_1()).CfnMapping(scopeStack,mappingName,{mapping:{aws:{zoneId:"Z2FDTNDATAQYW2"},"aws-cn":{zoneId:"Z3RFFRIM2A3IF5"}}})).findInMap(core_1().Aws.PARTITION,"zoneId")}constructor(distribution){this.distribution=distribution;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudfront_IDistribution(distribution)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,CloudFrontTarget),error}}bind(_record,_zone){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_IRecordSet(_record),jsiiDeprecationWarnings().aws_cdk_lib_aws_route53_IHostedZone(_zone)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.bind),error}return{hostedZoneId:CloudFrontTarget.getHostedZoneId(this.distribution),dnsName:this.distribution.distributionDomainName}}}exports.CloudFrontTarget=CloudFrontTarget,_a=JSII_RTTI_SYMBOL_1,CloudFrontTarget[_a]={fqn:"aws-cdk-lib.aws_route53_targets.CloudFrontTarget",version:"2.175.1"},CloudFrontTarget.CLOUDFRONT_ZONE_ID="Z2FDTNDATAQYW2";
