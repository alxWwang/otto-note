"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.JsonSchemaMapper=exports.ALL_METHODS=void 0,exports.validateHttpMethod=validateHttpMethod,exports.parseMethodOptionsPath=parseMethodOptionsPath,exports.parseAwsApiCall=parseAwsApiCall,exports.validateInteger=validateInteger,exports.validateDouble=validateDouble;var url_1=()=>{var tmp=require("url");return url_1=()=>tmp,tmp},jsonSchema=()=>{var tmp=require("./json-schema");return jsonSchema=()=>tmp,tmp};exports.ALL_METHODS=["OPTIONS","GET","PUT","POST","DELETE","PATCH","HEAD"];const ALLOWED_METHODS=["ANY",...exports.ALL_METHODS];function validateHttpMethod(method,messagePrefix=""){if(!ALLOWED_METHODS.includes(method))throw new Error(`${messagePrefix}Invalid HTTP method "${method}". Allowed methods: ${ALLOWED_METHODS.join(",")}`)}function parseMethodOptionsPath(originalPath){if(!originalPath.startsWith("/"))throw new Error(`Method options path must start with '/': ${originalPath}`);const path=originalPath.slice(1),components=path.split("/");if(components.length<2)throw new Error(`Method options path must include at least two components: /{resource}/{method} (i.e. /foo/bar/GET): ${path}`);const httpMethod=components.pop().toUpperCase();httpMethod!=="*"&&validateHttpMethod(httpMethod,`${originalPath}: `);let resourcePath="/~1"+components.join("~1");return components.length===1&&components[0]==="*"?resourcePath="/*":components.length===1&&components[0]===""&&(resourcePath="/"),{httpMethod,resourcePath}}function parseAwsApiCall(path,action,actionParams){if(actionParams&&!action)throw new Error('"actionParams" requires that "action" will be set');if(path&&action)throw new Error(`"path" and "action" are mutually exclusive (path="${path}", action="${action}")`);if(path)return{apiType:"path",apiValue:path};if(action)return actionParams&&(action+="&"+(0,url_1().format)({query:actionParams}).slice(1)),{apiType:"action",apiValue:action};throw new Error('Either "path" or "action" are required')}function validateInteger(property,messagePrefix){if(property&&!Number.isInteger(property))throw new Error(`${messagePrefix} should be an integer`)}function validateDouble(property,messagePrefix){if(property&&isNaN(property)&&isNaN(parseFloat(property.toString())))throw new Error(`${messagePrefix} should be an double`)}class JsonSchemaMapper{static toCfnJsonSchema(schema){const result=JsonSchemaMapper._toCfnJsonSchema(schema);return"$schema"in result||(result.$schema=jsonSchema().JsonSchemaVersion.DRAFT4),result}static _toCfnJsonSchema(schema,preserveKeys=!1){return schema==null||typeof schema!="object"?schema:Array.isArray(schema)?schema.map(entry=>JsonSchemaMapper._toCfnJsonSchema(entry)):Object.assign({},...Object.entries(schema).map(([key,value])=>{const newKey=!preserveKeys&&key in JsonSchemaMapper.SchemaPropsWithPrefix?JsonSchemaMapper.SchemaPropsWithPrefix[key]:key,newValue=JsonSchemaMapper._toCfnJsonSchema(value,!preserveKeys&&JsonSchemaMapper.SchemaPropsWithUserDefinedChildren[key]);return{[newKey]:newValue}}))}}exports.JsonSchemaMapper=JsonSchemaMapper,JsonSchemaMapper.SchemaPropsWithPrefix={schema:"$schema",ref:"$ref"},JsonSchemaMapper.SchemaPropsWithUserDefinedChildren={definitions:!0,properties:!0,patternProperties:!0,dependencies:!0};
