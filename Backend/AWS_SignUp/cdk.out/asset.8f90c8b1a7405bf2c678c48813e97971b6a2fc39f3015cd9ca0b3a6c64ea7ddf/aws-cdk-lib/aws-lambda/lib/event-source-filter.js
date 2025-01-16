"use strict";var _a,_b;Object.defineProperty(exports,"__esModule",{value:!0}),exports.FilterCriteria=exports.FilterRule=void 0;const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");class FilterRule{static null(){return[null]}static empty(){return[""]}static isEqual(item){return typeof item=="number"?[{numeric:["=",item]}]:[item]}static or(...elem){return elem}static notEquals(elem){return[{"anything-but":[elem]}]}static between(first,second){return[{numeric:[">",first,"<=",second]}]}static exists(){return[{exists:!0}]}static notExists(){return[{exists:!1}]}static beginsWith(elem){return[{prefix:elem}]}}exports.FilterRule=FilterRule,_a=JSII_RTTI_SYMBOL_1,FilterRule[_a]={fqn:"aws-cdk-lib.aws_lambda.FilterRule",version:"2.175.1"};class FilterCriteria{static filter(filter){return{pattern:JSON.stringify(filter)}}}exports.FilterCriteria=FilterCriteria,_b=JSII_RTTI_SYMBOL_1,FilterCriteria[_b]={fqn:"aws-cdk-lib.aws_lambda.FilterCriteria",version:"2.175.1"};
