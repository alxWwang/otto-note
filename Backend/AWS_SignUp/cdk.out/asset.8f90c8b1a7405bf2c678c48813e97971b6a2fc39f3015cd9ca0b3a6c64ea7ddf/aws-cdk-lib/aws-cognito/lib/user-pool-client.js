"use strict";var _a,_b,_c;Object.defineProperty(exports,"__esModule",{value:!0}),exports.UserPoolClient=exports.UserPoolClientIdentityProvider=exports.OAuthScope=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var cognito_generated_1=()=>{var tmp=require("./cognito.generated");return cognito_generated_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp},custom_resources_1=()=>{var tmp=require("../../custom-resources");return custom_resources_1=()=>tmp,tmp};class OAuthScope{static custom(name){return new OAuthScope(name)}static resourceServer(server,scope){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cognito_IUserPoolResourceServer(server),jsiiDeprecationWarnings().aws_cdk_lib_aws_cognito_ResourceServerScope(scope)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.resourceServer),error}return new OAuthScope(`${server.userPoolResourceServerId}/${scope.scopeName}`)}constructor(scopeName){this.scopeName=scopeName}}exports.OAuthScope=OAuthScope,_a=JSII_RTTI_SYMBOL_1,OAuthScope[_a]={fqn:"aws-cdk-lib.aws_cognito.OAuthScope",version:"2.175.1"},OAuthScope.PHONE=new OAuthScope("phone"),OAuthScope.EMAIL=new OAuthScope("email"),OAuthScope.OPENID=new OAuthScope("openid"),OAuthScope.PROFILE=new OAuthScope("profile"),OAuthScope.COGNITO_ADMIN=new OAuthScope("aws.cognito.signin.user.admin");class UserPoolClientIdentityProvider{static custom(name){return new UserPoolClientIdentityProvider(name)}constructor(name){this.name=name}}exports.UserPoolClientIdentityProvider=UserPoolClientIdentityProvider,_b=JSII_RTTI_SYMBOL_1,UserPoolClientIdentityProvider[_b]={fqn:"aws-cdk-lib.aws_cognito.UserPoolClientIdentityProvider",version:"2.175.1"},UserPoolClientIdentityProvider.APPLE=new UserPoolClientIdentityProvider("SignInWithApple"),UserPoolClientIdentityProvider.FACEBOOK=new UserPoolClientIdentityProvider("Facebook"),UserPoolClientIdentityProvider.GOOGLE=new UserPoolClientIdentityProvider("Google"),UserPoolClientIdentityProvider.AMAZON=new UserPoolClientIdentityProvider("LoginWithAmazon"),UserPoolClientIdentityProvider.COGNITO=new UserPoolClientIdentityProvider("COGNITO");class UserPoolClient extends core_1().Resource{static fromUserPoolClientId(scope,id,userPoolClientId){class Import extends core_1().Resource{constructor(){super(...arguments),this.userPoolClientId=userPoolClientId}get userPoolClientSecret(){throw new Error("UserPool Client Secret is not available for imported Clients")}}return new Import(scope,id)}constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_cognito_UserPoolClientProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,UserPoolClient),error}if(props.disableOAuth&&props.oAuth)throw new Error("OAuth settings cannot be specified when disableOAuth is set.");this.oAuthFlows=props.oAuth?.flows??{implicitCodeGrant:!0,authorizationCodeGrant:!0};let callbackUrls=props.oAuth?.callbackUrls;if(this.oAuthFlows.authorizationCodeGrant||this.oAuthFlows.implicitCodeGrant){if(callbackUrls===void 0)callbackUrls=["https://example.com"];else if(callbackUrls.length===0)throw new Error("callbackUrl must not be empty when codeGrant or implicitGrant OAuth flows are enabled.")}if(props.oAuth?.defaultRedirectUri&&!core_1().Token.isUnresolved(props.oAuth.defaultRedirectUri)){if(callbackUrls&&!callbackUrls.includes(props.oAuth.defaultRedirectUri))throw new Error("defaultRedirectUri must be included in callbackUrls.");if(!/^(?=.{1,1024}$)[\p{L}\p{M}\p{S}\p{N}\p{P}]+$/u.test(props.oAuth.defaultRedirectUri))throw new Error(`defaultRedirectUri must match the \`^(?=.{1,1024}$)[p{L}p{M}p{S}p{N}p{P}]+$\` pattern, got ${props.oAuth.defaultRedirectUri}`)}if(!props.generateSecret&&props.enablePropagateAdditionalUserContextData)throw new Error("Cannot activate enablePropagateAdditionalUserContextData in an app client without a client secret.");this._generateSecret=props.generateSecret,this.userPool=props.userPool;const resource=new(cognito_generated_1()).CfnUserPoolClient(this,"Resource",{clientName:props.userPoolClientName,generateSecret:props.generateSecret,userPoolId:props.userPool.userPoolId,explicitAuthFlows:this.configureAuthFlows(props),allowedOAuthFlows:props.disableOAuth?void 0:this.configureOAuthFlows(),allowedOAuthScopes:props.disableOAuth?void 0:this.configureOAuthScopes(props.oAuth),defaultRedirectUri:props.oAuth?.defaultRedirectUri,callbackUrLs:callbackUrls&&callbackUrls.length>0&&!props.disableOAuth?callbackUrls:void 0,logoutUrLs:props.oAuth?.logoutUrls,allowedOAuthFlowsUserPoolClient:!props.disableOAuth,preventUserExistenceErrors:this.configurePreventUserExistenceErrors(props.preventUserExistenceErrors),supportedIdentityProviders:this.configureIdentityProviders(props),readAttributes:props.readAttributes?.attributes(),writeAttributes:props.writeAttributes?.attributes(),enableTokenRevocation:props.enableTokenRevocation,enablePropagateAdditionalUserContextData:props.enablePropagateAdditionalUserContextData});this.configureAuthSessionValidity(resource,props),this.configureTokenValidity(resource,props),this.userPoolClientId=resource.ref,this._userPoolClientName=props.userPoolClientName}get userPoolClientName(){if(this._userPoolClientName===void 0)throw new Error("userPoolClientName is available only if specified on the UserPoolClient during initialization");return this._userPoolClientName}get userPoolClientSecret(){if(!this._generateSecret)throw new Error("userPoolClientSecret is available only if generateSecret is set to true.");return this._userPoolClientSecret||(this._userPoolClientSecret=core_1().SecretValue.resourceAttribute(new(custom_resources_1()).AwsCustomResource(this,"DescribeCognitoUserPoolClient",{resourceType:"Custom::DescribeCognitoUserPoolClient",onUpdate:{region:core_1().Stack.of(this).region,service:"CognitoIdentityServiceProvider",action:"describeUserPoolClient",parameters:{UserPoolId:this.userPool.userPoolId,ClientId:this.userPoolClientId},physicalResourceId:custom_resources_1().PhysicalResourceId.of(this.userPoolClientId)},policy:custom_resources_1().AwsCustomResourcePolicy.fromSdkCalls({resources:[this.userPool.userPoolArn]}),installLatestAwsSdk:!1}).getResponseField("UserPoolClient.ClientSecret"))),this._userPoolClientSecret}configureAuthFlows(props){if(!props.authFlows||Object.keys(props.authFlows).length===0)return;const authFlows=[];return props.authFlows.userPassword&&authFlows.push("ALLOW_USER_PASSWORD_AUTH"),props.authFlows.adminUserPassword&&authFlows.push("ALLOW_ADMIN_USER_PASSWORD_AUTH"),props.authFlows.custom&&authFlows.push("ALLOW_CUSTOM_AUTH"),props.authFlows.userSrp&&authFlows.push("ALLOW_USER_SRP_AUTH"),props.authFlows.user&&authFlows.push("ALLOW_USER_AUTH"),authFlows.push("ALLOW_REFRESH_TOKEN_AUTH"),authFlows}configureOAuthFlows(){if((this.oAuthFlows.authorizationCodeGrant||this.oAuthFlows.implicitCodeGrant)&&this.oAuthFlows.clientCredentials)throw new Error("clientCredentials OAuth flow cannot be selected along with codeGrant or implicitGrant.");const oAuthFlows=[];if(this.oAuthFlows.clientCredentials&&oAuthFlows.push("client_credentials"),this.oAuthFlows.implicitCodeGrant&&oAuthFlows.push("implicit"),this.oAuthFlows.authorizationCodeGrant&&oAuthFlows.push("code"),oAuthFlows.length!==0)return oAuthFlows}configureOAuthScopes(oAuth){const scopes=oAuth?.scopes??[OAuthScope.PROFILE,OAuthScope.PHONE,OAuthScope.EMAIL,OAuthScope.OPENID,OAuthScope.COGNITO_ADMIN],scopeNames=new Set(scopes.map(x=>x.scopeName));return[OAuthScope.PHONE,OAuthScope.EMAIL,OAuthScope.PROFILE].reduce((agg,s)=>agg||scopeNames.has(s.scopeName),!1)&&scopeNames.add(OAuthScope.OPENID.scopeName),Array.from(scopeNames)}configurePreventUserExistenceErrors(prevent){if(prevent!==void 0)return prevent?"ENABLED":"LEGACY"}configureIdentityProviders(props){let providers;if(props.supportedIdentityProviders)providers=props.supportedIdentityProviders.map(p=>p.name);else{const providerSet=new Set(props.userPool.identityProviders.map(p=>p.providerName));providerSet.add("COGNITO"),providers=Array.from(providerSet)}if(providers.length!==0)return Array.from(providers)}configureAuthSessionValidity(resource,props){this.validateDuration("authSessionValidity",core_1().Duration.minutes(3),core_1().Duration.minutes(15),props.authSessionValidity),resource.authSessionValidity=props.authSessionValidity?props.authSessionValidity.toMinutes():void 0}configureTokenValidity(resource,props){this.validateDuration("idTokenValidity",core_1().Duration.minutes(5),core_1().Duration.days(1),props.idTokenValidity),this.validateDuration("accessTokenValidity",core_1().Duration.minutes(5),core_1().Duration.days(1),props.accessTokenValidity),this.validateDuration("refreshTokenValidity",core_1().Duration.minutes(60),core_1().Duration.days(10*365),props.refreshTokenValidity),props.refreshTokenValidity&&(this.validateDuration("idTokenValidity",core_1().Duration.minutes(5),props.refreshTokenValidity,props.idTokenValidity),this.validateDuration("accessTokenValidity",core_1().Duration.minutes(5),props.refreshTokenValidity,props.accessTokenValidity)),(props.accessTokenValidity||props.idTokenValidity||props.refreshTokenValidity)&&(resource.tokenValidityUnits={idToken:props.idTokenValidity?"minutes":void 0,accessToken:props.accessTokenValidity?"minutes":void 0,refreshToken:props.refreshTokenValidity?"minutes":void 0}),resource.idTokenValidity=props.idTokenValidity?props.idTokenValidity.toMinutes():void 0,resource.refreshTokenValidity=props.refreshTokenValidity?props.refreshTokenValidity.toMinutes():void 0,resource.accessTokenValidity=props.accessTokenValidity?props.accessTokenValidity.toMinutes():void 0}validateDuration(name,min,max,value){if(value!==void 0&&(value.toMilliseconds()<min.toMilliseconds()||value.toMilliseconds()>max.toMilliseconds()))throw new Error(`${name}: Must be a duration between ${min.toHumanString()} and ${max.toHumanString()} (inclusive); received ${value.toHumanString()}.`)}}exports.UserPoolClient=UserPoolClient,_c=JSII_RTTI_SYMBOL_1,UserPoolClient[_c]={fqn:"aws-cdk-lib.aws_cognito.UserPoolClient",version:"2.175.1"};
