"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.validateArtifactBounds=validateArtifactBounds,exports.validateSourceAction=validateSourceAction,exports.validateName=validateName,exports.validateArtifactName=validateArtifactName,exports.validateNamespaceName=validateNamespaceName,exports.validatePipelineVariableName=validatePipelineVariableName;var cdk=()=>{var tmp=require("../../../core");return cdk=()=>tmp,tmp},action_1=()=>{var tmp=require("../action");return action_1=()=>tmp,tmp};function validateArtifactBounds(type,artifacts,min,max,category,provider){const ret=[];return artifacts.length<min&&ret.push(`${category}/${provider} must have at least ${min} ${type} artifacts`),artifacts.length>max&&ret.push(`${category}/${provider} cannot have more than ${max} ${type} artifacts`),ret}function validateSourceAction(mustBeSource,category,actionName,stageName){return mustBeSource!==(category===action_1().ActionCategory.SOURCE)?[`Action ${actionName} in stage ${stageName}: `+(mustBeSource?"first stage may only contain Source actions":"Source actions may only occur in first stage")]:[]}const VALID_IDENTIFIER_REGEX=/^[a-zA-Z0-9.@_-]{1,100}$/;function validateName(thing,name){validateAgainstRegex(VALID_IDENTIFIER_REGEX,thing,name)}function validateArtifactName(artifactName){validateAgainstRegex(/^[a-zA-Z0-9_-]{1,100}$/,"Artifact",artifactName)}function validateNamespaceName(namespaceName){validateAgainstRegex(/^[A-Za-z0-9@_-]{1,100}$/,"Namespace",namespaceName)}function validatePipelineVariableName(variableName){validateAgainstRegex(/^[A-Za-z0-9@\-_]{1,128}$/,"Variable",variableName)}function validateAgainstRegex(regex,thing,name){if(!cdk().Token.isUnresolved(name)&&name!==void 0&&!regex.test(name))throw new Error(`${thing} name must match regular expression: ${regex.toString()}, got '${name}'`)}
