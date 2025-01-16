"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.awsSdkToIamAction=awsSdkToIamAction;var path=()=>{var tmp=require("path");return path=()=>tmp,tmp};function awsSdkToIamAction(service,action){const v3Name=normalizeServiceName(service),iamPrefix=v3Metadata()[v3Name]?.iamPrefix??v3Name,iamAction=normalizeActionName(v3Name,action);return`${iamPrefix}:${iamAction}`}function normalizeServiceName(service){return service=service.toLowerCase(),service=service.replace(/^@aws-sdk\/client-/,""),service=v2ToV3Mapping()?.[service]??service,service}function normalizeActionName(v3Service,action){return action.charAt(0).toLowerCase()===action.charAt(0)?action.charAt(0).toUpperCase()+action.slice(1):v3Metadata()[v3Service]?.commands?.includes(action)?action:action.replace(/Command$/,"")}function v2ToV3Mapping(){return require(path().join(__dirname,"sdk-v2-to-v3.json"))}function v3Metadata(){return require(path().join(__dirname,"sdk-v3-metadata.json"))}
