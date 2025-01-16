"use strict";var _a;Object.defineProperty(exports,"__esModule",{value:!0}),exports.ServiceManagedVolume=exports.EbsPropagatedTagSource=exports.FileSystemType=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var constructs_1=()=>{var tmp=require("constructs");return constructs_1=()=>tmp,tmp},ec2=()=>{var tmp=require("../../../aws-ec2");return ec2=()=>tmp,tmp},iam=()=>{var tmp=require("../../../aws-iam");return iam=()=>tmp,tmp},core_1=()=>{var tmp=require("../../../core");return core_1=()=>tmp,tmp},FileSystemType;(function(FileSystemType2){FileSystemType2.EXT3="ext3",FileSystemType2.EXT4="ext4",FileSystemType2.XFS="xfs"})(FileSystemType||(exports.FileSystemType=FileSystemType={}));var EbsPropagatedTagSource;(function(EbsPropagatedTagSource2){EbsPropagatedTagSource2.SERVICE="SERVICE",EbsPropagatedTagSource2.TASK_DEFINITION="TASK_DEFINITION"})(EbsPropagatedTagSource||(exports.EbsPropagatedTagSource=EbsPropagatedTagSource={}));class ServiceManagedVolume extends constructs_1().Construct{constructor(scope,id,props){super(scope,id),this.configuredAtLaunch=!0;try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ecs_ServiceManagedVolumeProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,ServiceManagedVolume),error}this.validateEbsVolumeConfiguration(props.managedEBSVolume),this.name=props.name,this.role=props.managedEBSVolume?.role??new(iam()).Role(this,"EBSRole",{assumedBy:new(iam()).ServicePrincipal("ecs.amazonaws.com"),managedPolicies:[iam().ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSInfrastructureRolePolicyForVolumes")]}),this.config={...props.managedEBSVolume,role:this.role}}mountIn(container,mountPoint){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_ecs_ContainerDefinition(container),jsiiDeprecationWarnings().aws_cdk_lib_aws_ecs_ContainerMountPoint(mountPoint)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.mountIn),error}container.addMountPoints({sourceVolume:this.name,...mountPoint})}validateEbsVolumeConfiguration(volumeConfig){if(!volumeConfig)return;const{volumeType=ec2().EbsDeviceVolumeType.GP2,iops,size,throughput,snapShotId}=volumeConfig;if(size===void 0&&snapShotId===void 0)throw new Error("'size' or 'snapShotId' must be specified");if(snapShotId&&!core_1().Token.isUnresolved(snapShotId)&&!/^snap-[0-9a-fA-F]+$/.test(snapShotId))throw new Error(`'snapshotId' does match expected pattern. Expected 'snap-<hexadecmial value>' (ex: 'snap-05abe246af') or Token, got: ${snapShotId}`);const sizeInGiBRanges={[ec2().EbsDeviceVolumeType.GP2]:{minSize:1,maxSize:16384},[ec2().EbsDeviceVolumeType.GP3]:{minSize:1,maxSize:16384},[ec2().EbsDeviceVolumeType.IO1]:{minSize:4,maxSize:16384},[ec2().EbsDeviceVolumeType.IO2]:{minSize:4,maxSize:16384},[ec2().EbsDeviceVolumeType.SC1]:{minSize:125,maxSize:16384},[ec2().EbsDeviceVolumeType.ST1]:{minSize:125,maxSize:16384},[ec2().EbsDeviceVolumeType.STANDARD]:{minSize:1,maxSize:1024}};if(size!==void 0){const{minSize,maxSize}=sizeInGiBRanges[volumeType];if(size.toGibibytes()<minSize||size.toGibibytes()>maxSize)throw new Error(`'${volumeType}' volumes must have a size between ${minSize} and ${maxSize} GiB, got ${size.toGibibytes()} GiB`)}if(throughput!==void 0){if(volumeType!==ec2().EbsDeviceVolumeType.GP3)throw new Error(`'throughput' can only be configured with gp3 volume type, got ${volumeType}`);if(!core_1().Token.isUnresolved(throughput)&&throughput>1e3)throw new Error(`'throughput' must be less than or equal to 1000 MiB/s, got ${throughput} MiB/s`)}if([ec2().EbsDeviceVolumeType.SC1,ec2().EbsDeviceVolumeType.ST1,ec2().EbsDeviceVolumeType.STANDARD,ec2().EbsDeviceVolumeType.GP2].includes(volumeType)&&iops!==void 0)throw new Error(`'iops' cannot be specified with sc1, st1, gp2 and standard volume types, got ${volumeType}`);if([ec2().EbsDeviceVolumeType.IO1,ec2().EbsDeviceVolumeType.IO2].includes(volumeType)&&iops===void 0)throw new Error(`'iops' must be specified with io1 or io2 volume types, got ${volumeType}`);const iopsRanges={};if(iopsRanges[ec2().EbsDeviceVolumeType.GP3]={min:3e3,max:16e3},iopsRanges[ec2().EbsDeviceVolumeType.IO1]={min:100,max:64e3},iopsRanges[ec2().EbsDeviceVolumeType.IO2]={min:100,max:256e3},iops!==void 0&&!core_1().Token.isUnresolved(iops)){const{min,max}=iopsRanges[volumeType];if(iops<min||iops>max)throw new Error(`'${volumeType}' volumes must have 'iops' between ${min} and ${max}, got ${iops}`)}}}exports.ServiceManagedVolume=ServiceManagedVolume,_a=JSII_RTTI_SYMBOL_1,ServiceManagedVolume[_a]={fqn:"aws-cdk-lib.aws_ecs.ServiceManagedVolume",version:"2.175.1"};
