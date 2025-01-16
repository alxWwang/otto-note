"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.Dashboard=exports.PeriodOverride=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cloudwatch_generated_1=()=>{var tmp=require("./cloudwatch.generated");return cloudwatch_generated_1=()=>tmp,tmp},layout_1=()=>{var tmp=require("./layout");return layout_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},PeriodOverride;(function(PeriodOverride2){PeriodOverride2.AUTO="auto",PeriodOverride2.INHERIT="inherit"})(PeriodOverride||(exports.PeriodOverride=PeriodOverride={}));class Dashboard extends core_1().Resource{constructor(scope,id,props={}){super(scope,id,{physicalName:props.dashboardName}),this.rows=[],this.variables=[];try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudwatch_DashboardProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,Dashboard),error}{const{dashboardName}=props;if(dashboardName&&!core_1().Token.isUnresolved(dashboardName)&&!dashboardName.match(/^[\w-]+$/))throw new Error([`The value ${dashboardName} for field dashboardName contains invalid characters.`,"It can only contain alphanumerics, dash (-) and underscore (_)."].join(" "))}if(props.start!==void 0&&props.defaultInterval!==void 0)throw new Error("both properties defaultInterval and start cannot be set at once");if(props.end!==void 0&&props.start===void 0)throw new Error("If you specify a value for end, you must also specify a value for start.");const dashboard=new(cloudwatch_generated_1()).CfnDashboard(this,"Resource",{dashboardName:this.physicalName,dashboardBody:core_1().Lazy.string({produce:()=>{const column=new(layout_1()).Column(...this.rows);return column.position(0,0),core_1().Stack.of(this).toJsonString({start:props.defaultInterval!==void 0?`-${props.defaultInterval?.toIsoString()}`:props.start,end:props.defaultInterval!==void 0?void 0:props.end,periodOverride:props.periodOverride,widgets:column.toJson(),variables:this.variables.length>0?this.variables.map(variable=>variable.toJson()):void 0})}})});this.dashboardName=this.getResourceNameAttribute(dashboard.ref),(props.widgets||[]).forEach(row=>{this.addWidgets(...row)}),(props.variables||[]).forEach(variable=>this.addVariable(variable)),this.dashboardArn=core_1().Stack.of(this).formatArn({service:"cloudwatch",resource:"dashboard",region:"",resourceName:this.physicalName})}addWidgets(...widgets){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudwatch_IWidget(widgets)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addWidgets),error}if(widgets.length===0)return;const warnings=allWidgetsDeep(widgets).reduce((prev,curr)=>({...prev,...curr.warningsV2}),{});for(const[id,message]of Object.entries(warnings??{}))core_1().Annotations.of(this).addWarningV2(id,message);const w=widgets.length>1?new(layout_1()).Row(...widgets):widgets[0];this.rows.push(w)}addVariable(variable){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cloudwatch_IVariable(variable)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addVariable),error}this.variables.push(variable)}}exports.Dashboard=Dashboard,_a=JSII_RTTI_SYMBOL_1,Dashboard[_a]={fqn:"aws-cdk-lib.aws_cloudwatch.Dashboard",version:"2.175.1"};function allWidgetsDeep(ws){const ret=new Array;return ws.forEach(recurse),ret;function recurse(w){ret.push(w),hasSubWidgets(w)&&w.widgets.forEach(recurse)}}function hasSubWidgets(w){return"widgets"in w}
