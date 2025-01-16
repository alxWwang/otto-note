"use strict";var _a,_b,_c,_d,_e;Object.defineProperty(exports,"__esModule",{value:!0}),exports.SecretPathVolume=exports.HostPathVolume=exports.EmptyDirVolume=exports.EmptyDirMediumType=exports.EksVolume=exports.EksContainerDefinition=exports.ImagePullPolicy=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},core_1=()=>{var tmp=require("../../core");return core_1=()=>tmp,tmp};const EMPTY_DIR_VOLUME_SYMBOL=Symbol.for("aws-cdk-lib/aws-batch/lib/eks-container-definition.EmptyDirVolume"),HOST_PATH_VOLUME_SYMBOL=Symbol.for("aws-cdk-lib/aws-batch/lib/eks-container-definition.HostPathVolume"),SECRET_PATH_VOLUME_SYMBOL=Symbol.for("aws-cdk-lib/aws-batch/lib/eks-container-definition.SecretVolume");var ImagePullPolicy;(function(ImagePullPolicy2){ImagePullPolicy2.ALWAYS="Always",ImagePullPolicy2.IF_NOT_PRESENT="IfNotPresent",ImagePullPolicy2.NEVER="Never"})(ImagePullPolicy||(exports.ImagePullPolicy=ImagePullPolicy={}));class EksContainerDefinition extends constructs_1().Construct{constructor(scope,id,props){super(scope,id);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_EksContainerDefinitionProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EksContainerDefinition),error}this.image=props.image,this.args=props.args,this.command=props.command,this.env=props.env,this.imagePullPolicy=props.imagePullPolicy,this.name=props.name,this.memoryLimit=props.memoryLimit,this.memoryReservation=props.memoryReservation,this.cpuLimit=props.cpuLimit,this.cpuReservation=props.cpuReservation,this.gpuLimit=props.gpuLimit,this.gpuReservation=props.gpuReservation,this.privileged=props.privileged,this.readonlyRootFilesystem=props.readonlyRootFilesystem,this.runAsGroup=props.runAsGroup,this.runAsRoot=props.runAsRoot,this.runAsUser=props.runAsUser,this.volumes=props.volumes??[],this.imageConfig=props.image.bind(this,this)}addVolume(volume){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_EksVolume(volume)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.addVolume),error}this.volumes.push(volume)}_renderContainerDefinition(){return{image:this.imageConfig.imageName,command:this.command,args:this.args,env:Object.keys(this.env??{}).map(key=>({name:key,value:this.env[key]})),name:this.name,imagePullPolicy:this.imagePullPolicy,resources:{limits:{cpu:this.cpuLimit,memory:this.memoryLimit?this.memoryLimit.toMebibytes()+"Mi":void 0,"nvidia.com/gpu":this.gpuLimit},requests:{cpu:this.cpuReservation,memory:this.memoryReservation?this.memoryReservation.toMebibytes()+"Mi":void 0,"nvidia.com/gpu":this.gpuReservation}},securityContext:{privileged:this.privileged,readOnlyRootFilesystem:this.readonlyRootFilesystem,runAsGroup:this.runAsGroup,runAsNonRoot:!this.runAsRoot,runAsUser:this.runAsUser},volumeMounts:core_1().Lazy.any({produce:()=>{if(this.volumes.length!==0)return this.volumes.map(volume=>({name:volume.name,mountPath:volume.containerPath,readOnly:volume.readonly}))}})}}}exports.EksContainerDefinition=EksContainerDefinition,_a=JSII_RTTI_SYMBOL_1,EksContainerDefinition[_a]={fqn:"aws-cdk-lib.aws_batch.EksContainerDefinition",version:"2.175.1"};class EksVolume{static emptyDir(options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_EmptyDirVolumeOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.emptyDir),error}return new EmptyDirVolume(options)}static hostPath(options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_HostPathVolumeOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.hostPath),error}return new HostPathVolume(options)}static secret(options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_SecretPathVolumeOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.secret),error}return new SecretPathVolume(options)}constructor(options){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_EksVolumeOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EksVolume),error}this.name=options.name,this.containerPath=options.mountPath,this.readonly=options.readonly}}exports.EksVolume=EksVolume,_b=JSII_RTTI_SYMBOL_1,EksVolume[_b]={fqn:"aws-cdk-lib.aws_batch.EksVolume",version:"2.175.1"};var EmptyDirMediumType;(function(EmptyDirMediumType2){EmptyDirMediumType2.DISK="",EmptyDirMediumType2.MEMORY="Memory"})(EmptyDirMediumType||(exports.EmptyDirMediumType=EmptyDirMediumType={}));class EmptyDirVolume extends EksVolume{static isEmptyDirVolume(x){return x!==null&&typeof x=="object"&&EMPTY_DIR_VOLUME_SYMBOL in x}constructor(options){super(options);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_EmptyDirVolumeOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,EmptyDirVolume),error}this.medium=options.medium,this.sizeLimit=options.sizeLimit}}exports.EmptyDirVolume=EmptyDirVolume,_c=JSII_RTTI_SYMBOL_1,EmptyDirVolume[_c]={fqn:"aws-cdk-lib.aws_batch.EmptyDirVolume",version:"2.175.1"},Object.defineProperty(EmptyDirVolume.prototype,EMPTY_DIR_VOLUME_SYMBOL,{value:!0,enumerable:!1,writable:!1});class HostPathVolume extends EksVolume{static isHostPathVolume(x){return x!==null&&typeof x=="object"&&HOST_PATH_VOLUME_SYMBOL in x}constructor(options){super(options);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_HostPathVolumeOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,HostPathVolume),error}this.path=options.hostPath}}exports.HostPathVolume=HostPathVolume,_d=JSII_RTTI_SYMBOL_1,HostPathVolume[_d]={fqn:"aws-cdk-lib.aws_batch.HostPathVolume",version:"2.175.1"},Object.defineProperty(HostPathVolume.prototype,HOST_PATH_VOLUME_SYMBOL,{value:!0,enumerable:!1,writable:!1});class SecretPathVolume extends EksVolume{static isSecretPathVolume(x){return x!==null&&typeof x=="object"&&SECRET_PATH_VOLUME_SYMBOL in x}constructor(options){super(options);try{jsiiDeprecationWarnings().aws_cdk_lib_aws_batch_SecretPathVolumeOptions(options)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,SecretPathVolume),error}this.secretName=options.secretName,this.optional=options.optional??!0}}exports.SecretPathVolume=SecretPathVolume,_e=JSII_RTTI_SYMBOL_1,SecretPathVolume[_e]={fqn:"aws-cdk-lib.aws_batch.SecretPathVolume",version:"2.175.1"},Object.defineProperty(SecretPathVolume.prototype,SECRET_PATH_VOLUME_SYMBOL,{value:!0,enumerable:!1,writable:!1});
