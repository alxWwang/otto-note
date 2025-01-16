"use strict";var _a,_b,_c,_d;Object.defineProperty(exports,"__esModule",{value:!0}),exports.DatabaseClusterEngine=exports.AuroraPostgresEngineVersion=exports.AuroraMysqlEngineVersion=exports.AuroraEngineVersion=void 0;var jsiiDeprecationWarnings=()=>{var tmp=require("../../.warnings.jsii.js");return jsiiDeprecationWarnings=()=>tmp,tmp};const JSII_RTTI_SYMBOL_1=Symbol.for("jsii.rtti");var parameter_group_1=()=>{var tmp=require("./parameter-group");return parameter_group_1=()=>tmp,tmp},secretsmanager=()=>{var tmp=require("../../aws-secretsmanager");return secretsmanager=()=>tmp,tmp};class ClusterEngineBase{constructor(props){this.engineType=props.engineType,this.features=props.features,this.singleUserRotationApplication=props.singleUserRotationApplication,this.multiUserRotationApplication=props.multiUserRotationApplication,this.defaultPort=props.defaultPort,this.engineVersion=props.engineVersion,this.parameterGroupFamily=this.engineVersion?`${this.engineType}${this.engineVersion.majorVersion}`:void 0}bindToCluster(scope,options){return{parameterGroup:options.parameterGroup??this.defaultParameterGroup(scope),port:this.defaultPort,features:this.features}}}class MySqlClusterEngineBase extends ClusterEngineBase{constructor(props){super({...props,singleUserRotationApplication:secretsmanager().SecretRotationApplication.MYSQL_ROTATION_SINGLE_USER,multiUserRotationApplication:secretsmanager().SecretRotationApplication.MYSQL_ROTATION_MULTI_USER,engineVersion:props.engineVersion?props.engineVersion:{majorVersion:props.defaultMajorVersion}}),this.engineFamily="MYSQL",this.supportedLogTypes=["error","general","slowquery","audit"],this.combineImportAndExportRoles=props.combineImportAndExportRoles}bindToCluster(scope,options){const config=super.bindToCluster(scope,options),parameterGroup=options.parameterGroup??(options.s3ImportRole||options.s3ExportRole?new(parameter_group_1()).ParameterGroup(scope,"ClusterParameterGroup",{engine:this}):config.parameterGroup);if(options.s3ImportRole){const s3ImportParam=this.combineImportAndExportRoles?"aws_default_s3_role":"aurora_load_from_s3_role";parameterGroup?.addParameter(s3ImportParam,options.s3ImportRole.roleArn)}if(options.s3ExportRole){const s3ExportParam=this.combineImportAndExportRoles?"aws_default_s3_role":"aurora_select_into_s3_role";parameterGroup?.addParameter(s3ExportParam,options.s3ExportRole.roleArn)}return{...config,parameterGroup}}}class AuroraEngineVersion{static of(auroraFullVersion,auroraMajorVersion){try{jsiiDeprecationWarnings().print("aws-cdk-lib.aws_rds.AuroraEngineVersion#of","use `AuroraMysqlEngineVersion` instead")}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.of),error}return new AuroraEngineVersion(auroraFullVersion,auroraMajorVersion)}static builtIn_5_6(minorVersion,addStandardPrefix=!0){return new AuroraEngineVersion(`5.6.${addStandardPrefix?"mysql_aurora.":""}${minorVersion}`)}constructor(auroraFullVersion,auroraMajorVersion="5.6"){this.auroraFullVersion=auroraFullVersion,this.auroraMajorVersion=auroraMajorVersion}}exports.AuroraEngineVersion=AuroraEngineVersion,_a=JSII_RTTI_SYMBOL_1,AuroraEngineVersion[_a]={fqn:"aws-cdk-lib.aws_rds.AuroraEngineVersion",version:"2.175.1"},AuroraEngineVersion.VER_10A=AuroraEngineVersion.builtIn_5_6("10a",!1),AuroraEngineVersion.VER_1_17_9=AuroraEngineVersion.builtIn_5_6("1.17.9"),AuroraEngineVersion.VER_1_19_0=AuroraEngineVersion.builtIn_5_6("1.19.0"),AuroraEngineVersion.VER_1_19_1=AuroraEngineVersion.builtIn_5_6("1.19.1"),AuroraEngineVersion.VER_1_19_2=AuroraEngineVersion.builtIn_5_6("1.19.2"),AuroraEngineVersion.VER_1_19_5=AuroraEngineVersion.builtIn_5_6("1.19.5"),AuroraEngineVersion.VER_1_19_6=AuroraEngineVersion.builtIn_5_6("1.19.6"),AuroraEngineVersion.VER_1_20_0=AuroraEngineVersion.builtIn_5_6("1.20.0"),AuroraEngineVersion.VER_1_20_1=AuroraEngineVersion.builtIn_5_6("1.20.1"),AuroraEngineVersion.VER_1_21_0=AuroraEngineVersion.builtIn_5_6("1.21.0"),AuroraEngineVersion.VER_1_22_0=AuroraEngineVersion.builtIn_5_6("1.22.0"),AuroraEngineVersion.VER_1_22_1=AuroraEngineVersion.builtIn_5_6("1.22.1"),AuroraEngineVersion.VER_1_22_1_3=AuroraEngineVersion.builtIn_5_6("1.22.1.3"),AuroraEngineVersion.VER_1_22_2=AuroraEngineVersion.builtIn_5_6("1.22.2"),AuroraEngineVersion.VER_1_22_3=AuroraEngineVersion.builtIn_5_6("1.22.3"),AuroraEngineVersion.VER_1_22_4=AuroraEngineVersion.builtIn_5_6("1.22.4"),AuroraEngineVersion.VER_1_22_5=AuroraEngineVersion.builtIn_5_6("1.22.5"),AuroraEngineVersion.VER_1_23_0=AuroraEngineVersion.builtIn_5_6("1.23.0"),AuroraEngineVersion.VER_1_23_1=AuroraEngineVersion.builtIn_5_6("1.23.1"),AuroraEngineVersion.VER_1_23_2=AuroraEngineVersion.builtIn_5_6("1.23.2"),AuroraEngineVersion.VER_1_23_3=AuroraEngineVersion.builtIn_5_6("1.23.3"),AuroraEngineVersion.VER_1_23_4=AuroraEngineVersion.builtIn_5_6("1.23.4");class AuroraClusterEngine extends MySqlClusterEngineBase{constructor(version){super({engineType:"aurora",engineVersion:version?{fullVersion:version.auroraFullVersion,majorVersion:version.auroraMajorVersion}:void 0,defaultMajorVersion:"5.6"})}defaultParameterGroup(_scope){}}class AuroraMysqlEngineVersion{static of(auroraMysqlFullVersion,auroraMysqlMajorVersion){return new AuroraMysqlEngineVersion(auroraMysqlFullVersion,auroraMysqlMajorVersion)}static builtIn_5_7(minorVersion,addStandardPrefix=!0){return new AuroraMysqlEngineVersion(`5.7.${addStandardPrefix?"mysql_aurora.":""}${minorVersion}`)}static builtIn_8_0(minorVersion){return new AuroraMysqlEngineVersion(`8.0.mysql_aurora.${minorVersion}`,"8.0",!0)}constructor(auroraMysqlFullVersion,auroraMysqlMajorVersion="5.7",combineImportAndExportRoles){this.auroraMysqlFullVersion=auroraMysqlFullVersion,this.auroraMysqlMajorVersion=auroraMysqlMajorVersion,this._combineImportAndExportRoles=combineImportAndExportRoles}}exports.AuroraMysqlEngineVersion=AuroraMysqlEngineVersion,_b=JSII_RTTI_SYMBOL_1,AuroraMysqlEngineVersion[_b]={fqn:"aws-cdk-lib.aws_rds.AuroraMysqlEngineVersion",version:"2.175.1"},AuroraMysqlEngineVersion.VER_5_7_12=AuroraMysqlEngineVersion.builtIn_5_7("12",!1),AuroraMysqlEngineVersion.VER_2_02_3=AuroraMysqlEngineVersion.builtIn_5_7("2.02.3"),AuroraMysqlEngineVersion.VER_2_03_2=AuroraMysqlEngineVersion.builtIn_5_7("2.03.2"),AuroraMysqlEngineVersion.VER_2_03_3=AuroraMysqlEngineVersion.builtIn_5_7("2.03.3"),AuroraMysqlEngineVersion.VER_2_03_4=AuroraMysqlEngineVersion.builtIn_5_7("2.03.4"),AuroraMysqlEngineVersion.VER_2_04_0=AuroraMysqlEngineVersion.builtIn_5_7("2.04.0"),AuroraMysqlEngineVersion.VER_2_04_1=AuroraMysqlEngineVersion.builtIn_5_7("2.04.1"),AuroraMysqlEngineVersion.VER_2_04_2=AuroraMysqlEngineVersion.builtIn_5_7("2.04.2"),AuroraMysqlEngineVersion.VER_2_04_3=AuroraMysqlEngineVersion.builtIn_5_7("2.04.3"),AuroraMysqlEngineVersion.VER_2_04_4=AuroraMysqlEngineVersion.builtIn_5_7("2.04.4"),AuroraMysqlEngineVersion.VER_2_04_5=AuroraMysqlEngineVersion.builtIn_5_7("2.04.5"),AuroraMysqlEngineVersion.VER_2_04_6=AuroraMysqlEngineVersion.builtIn_5_7("2.04.6"),AuroraMysqlEngineVersion.VER_2_04_7=AuroraMysqlEngineVersion.builtIn_5_7("2.04.7"),AuroraMysqlEngineVersion.VER_2_04_8=AuroraMysqlEngineVersion.builtIn_5_7("2.04.8"),AuroraMysqlEngineVersion.VER_2_04_9=AuroraMysqlEngineVersion.builtIn_5_7("2.04.9"),AuroraMysqlEngineVersion.VER_2_05_0=AuroraMysqlEngineVersion.builtIn_5_7("2.05.0"),AuroraMysqlEngineVersion.VER_2_05_1=AuroraMysqlEngineVersion.builtIn_5_7("2.05.1"),AuroraMysqlEngineVersion.VER_2_06_0=AuroraMysqlEngineVersion.builtIn_5_7("2.06.0"),AuroraMysqlEngineVersion.VER_2_07_0=AuroraMysqlEngineVersion.builtIn_5_7("2.07.0"),AuroraMysqlEngineVersion.VER_2_07_1=AuroraMysqlEngineVersion.builtIn_5_7("2.07.1"),AuroraMysqlEngineVersion.VER_2_07_2=AuroraMysqlEngineVersion.builtIn_5_7("2.07.2"),AuroraMysqlEngineVersion.VER_2_07_3=AuroraMysqlEngineVersion.builtIn_5_7("2.07.3"),AuroraMysqlEngineVersion.VER_2_07_4=AuroraMysqlEngineVersion.builtIn_5_7("2.07.4"),AuroraMysqlEngineVersion.VER_2_07_5=AuroraMysqlEngineVersion.builtIn_5_7("2.07.5"),AuroraMysqlEngineVersion.VER_2_07_6=AuroraMysqlEngineVersion.builtIn_5_7("2.07.6"),AuroraMysqlEngineVersion.VER_2_07_7=AuroraMysqlEngineVersion.builtIn_5_7("2.07.7"),AuroraMysqlEngineVersion.VER_2_07_8=AuroraMysqlEngineVersion.builtIn_5_7("2.07.8"),AuroraMysqlEngineVersion.VER_2_07_9=AuroraMysqlEngineVersion.builtIn_5_7("2.07.9"),AuroraMysqlEngineVersion.VER_2_07_10=AuroraMysqlEngineVersion.builtIn_5_7("2.07.10"),AuroraMysqlEngineVersion.VER_2_08_0=AuroraMysqlEngineVersion.builtIn_5_7("2.08.0"),AuroraMysqlEngineVersion.VER_2_08_1=AuroraMysqlEngineVersion.builtIn_5_7("2.08.1"),AuroraMysqlEngineVersion.VER_2_08_2=AuroraMysqlEngineVersion.builtIn_5_7("2.08.2"),AuroraMysqlEngineVersion.VER_2_08_3=AuroraMysqlEngineVersion.builtIn_5_7("2.08.3"),AuroraMysqlEngineVersion.VER_2_08_4=AuroraMysqlEngineVersion.builtIn_5_7("2.08.4"),AuroraMysqlEngineVersion.VER_2_09_0=AuroraMysqlEngineVersion.builtIn_5_7("2.09.0"),AuroraMysqlEngineVersion.VER_2_09_1=AuroraMysqlEngineVersion.builtIn_5_7("2.09.1"),AuroraMysqlEngineVersion.VER_2_09_2=AuroraMysqlEngineVersion.builtIn_5_7("2.09.2"),AuroraMysqlEngineVersion.VER_2_09_3=AuroraMysqlEngineVersion.builtIn_5_7("2.09.3"),AuroraMysqlEngineVersion.VER_2_10_0=AuroraMysqlEngineVersion.builtIn_5_7("2.10.0"),AuroraMysqlEngineVersion.VER_2_10_1=AuroraMysqlEngineVersion.builtIn_5_7("2.10.1"),AuroraMysqlEngineVersion.VER_2_10_2=AuroraMysqlEngineVersion.builtIn_5_7("2.10.2"),AuroraMysqlEngineVersion.VER_2_10_3=AuroraMysqlEngineVersion.builtIn_5_7("2.10.3"),AuroraMysqlEngineVersion.VER_2_11_0=AuroraMysqlEngineVersion.builtIn_5_7("2.11.0"),AuroraMysqlEngineVersion.VER_2_11_1=AuroraMysqlEngineVersion.builtIn_5_7("2.11.1"),AuroraMysqlEngineVersion.VER_2_11_2=AuroraMysqlEngineVersion.builtIn_5_7("2.11.2"),AuroraMysqlEngineVersion.VER_2_11_3=AuroraMysqlEngineVersion.builtIn_5_7("2.11.3"),AuroraMysqlEngineVersion.VER_2_11_4=AuroraMysqlEngineVersion.builtIn_5_7("2.11.4"),AuroraMysqlEngineVersion.VER_2_11_5=AuroraMysqlEngineVersion.builtIn_5_7("2.11.5"),AuroraMysqlEngineVersion.VER_2_12_0=AuroraMysqlEngineVersion.builtIn_5_7("2.12.0"),AuroraMysqlEngineVersion.VER_2_12_1=AuroraMysqlEngineVersion.builtIn_5_7("2.12.1"),AuroraMysqlEngineVersion.VER_2_12_2=AuroraMysqlEngineVersion.builtIn_5_7("2.12.2"),AuroraMysqlEngineVersion.VER_2_12_3=AuroraMysqlEngineVersion.builtIn_5_7("2.12.3"),AuroraMysqlEngineVersion.VER_3_01_0=AuroraMysqlEngineVersion.builtIn_8_0("3.01.0"),AuroraMysqlEngineVersion.VER_3_01_1=AuroraMysqlEngineVersion.builtIn_8_0("3.01.1"),AuroraMysqlEngineVersion.VER_3_02_0=AuroraMysqlEngineVersion.builtIn_8_0("3.02.0"),AuroraMysqlEngineVersion.VER_3_02_1=AuroraMysqlEngineVersion.builtIn_8_0("3.02.1"),AuroraMysqlEngineVersion.VER_3_02_2=AuroraMysqlEngineVersion.builtIn_8_0("3.02.2"),AuroraMysqlEngineVersion.VER_3_02_3=AuroraMysqlEngineVersion.builtIn_8_0("3.02.3"),AuroraMysqlEngineVersion.VER_3_03_0=AuroraMysqlEngineVersion.builtIn_8_0("3.03.0"),AuroraMysqlEngineVersion.VER_3_03_1=AuroraMysqlEngineVersion.builtIn_8_0("3.03.1"),AuroraMysqlEngineVersion.VER_3_03_2=AuroraMysqlEngineVersion.builtIn_8_0("3.03.2"),AuroraMysqlEngineVersion.VER_3_03_3=AuroraMysqlEngineVersion.builtIn_8_0("3.03.3"),AuroraMysqlEngineVersion.VER_3_04_0=AuroraMysqlEngineVersion.builtIn_8_0("3.04.0"),AuroraMysqlEngineVersion.VER_3_04_1=AuroraMysqlEngineVersion.builtIn_8_0("3.04.1"),AuroraMysqlEngineVersion.VER_3_04_2=AuroraMysqlEngineVersion.builtIn_8_0("3.04.2"),AuroraMysqlEngineVersion.VER_3_04_3=AuroraMysqlEngineVersion.builtIn_8_0("3.04.3"),AuroraMysqlEngineVersion.VER_3_05_0=AuroraMysqlEngineVersion.builtIn_8_0("3.05.0"),AuroraMysqlEngineVersion.VER_3_05_1=AuroraMysqlEngineVersion.builtIn_8_0("3.05.1"),AuroraMysqlEngineVersion.VER_3_05_2=AuroraMysqlEngineVersion.builtIn_8_0("3.05.2"),AuroraMysqlEngineVersion.VER_3_06_0=AuroraMysqlEngineVersion.builtIn_8_0("3.06.0"),AuroraMysqlEngineVersion.VER_3_06_1=AuroraMysqlEngineVersion.builtIn_8_0("3.06.1"),AuroraMysqlEngineVersion.VER_3_07_0=AuroraMysqlEngineVersion.builtIn_8_0("3.07.0"),AuroraMysqlEngineVersion.VER_3_07_1=AuroraMysqlEngineVersion.builtIn_8_0("3.07.1"),AuroraMysqlEngineVersion.VER_3_08_0=AuroraMysqlEngineVersion.builtIn_8_0("3.08.0");class AuroraMysqlClusterEngine extends MySqlClusterEngineBase{constructor(version){super({engineType:"aurora-mysql",engineVersion:version?{fullVersion:version.auroraMysqlFullVersion,majorVersion:version.auroraMysqlMajorVersion}:void 0,defaultMajorVersion:"5.7",combineImportAndExportRoles:version?._combineImportAndExportRoles})}defaultParameterGroup(scope){return parameter_group_1().ParameterGroup.fromParameterGroupName(scope,"AuroraMySqlDatabaseClusterEngineDefaultParameterGroup",`default.${this.parameterGroupFamily}`)}}class AuroraPostgresEngineVersion{static of(auroraPostgresFullVersion,auroraPostgresMajorVersion,auroraPostgresFeatures){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_AuroraPostgresEngineFeatures(auroraPostgresFeatures)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.of),error}return new AuroraPostgresEngineVersion(auroraPostgresFullVersion,auroraPostgresMajorVersion,auroraPostgresFeatures)}constructor(auroraPostgresFullVersion,auroraPostgresMajorVersion,auroraPostgresFeatures){this.auroraPostgresFullVersion=auroraPostgresFullVersion,this.auroraPostgresMajorVersion=auroraPostgresMajorVersion,this._features={s3Import:auroraPostgresFeatures?.s3Import?"s3Import":void 0,s3Export:auroraPostgresFeatures?.s3Export?"s3Export":void 0}}}exports.AuroraPostgresEngineVersion=AuroraPostgresEngineVersion,_c=JSII_RTTI_SYMBOL_1,AuroraPostgresEngineVersion[_c]={fqn:"aws-cdk-lib.aws_rds.AuroraPostgresEngineVersion",version:"2.175.1"},AuroraPostgresEngineVersion.VER_9_6_8=AuroraPostgresEngineVersion.of("9.6.8","9.6"),AuroraPostgresEngineVersion.VER_9_6_9=AuroraPostgresEngineVersion.of("9.6.9","9.6"),AuroraPostgresEngineVersion.VER_9_6_11=AuroraPostgresEngineVersion.of("9.6.11","9.6"),AuroraPostgresEngineVersion.VER_9_6_12=AuroraPostgresEngineVersion.of("9.6.12","9.6"),AuroraPostgresEngineVersion.VER_9_6_16=AuroraPostgresEngineVersion.of("9.6.16","9.6"),AuroraPostgresEngineVersion.VER_9_6_17=AuroraPostgresEngineVersion.of("9.6.17","9.6"),AuroraPostgresEngineVersion.VER_9_6_18=AuroraPostgresEngineVersion.of("9.6.18","9.6"),AuroraPostgresEngineVersion.VER_9_6_19=AuroraPostgresEngineVersion.of("9.6.19","9.6"),AuroraPostgresEngineVersion.VER_9_6_22=AuroraPostgresEngineVersion.of("9.6.22","9.6"),AuroraPostgresEngineVersion.VER_10_4=AuroraPostgresEngineVersion.of("10.4","10"),AuroraPostgresEngineVersion.VER_10_5=AuroraPostgresEngineVersion.of("10.5","10"),AuroraPostgresEngineVersion.VER_10_6=AuroraPostgresEngineVersion.of("10.6","10"),AuroraPostgresEngineVersion.VER_10_7=AuroraPostgresEngineVersion.of("10.7","10",{s3Import:!0}),AuroraPostgresEngineVersion.VER_10_11=AuroraPostgresEngineVersion.of("10.11","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_12=AuroraPostgresEngineVersion.of("10.12","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_13=AuroraPostgresEngineVersion.of("10.13","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_14=AuroraPostgresEngineVersion.of("10.14","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_16=AuroraPostgresEngineVersion.of("10.16","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_17=AuroraPostgresEngineVersion.of("10.17","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_18=AuroraPostgresEngineVersion.of("10.18","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_19=AuroraPostgresEngineVersion.of("10.19","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_20=AuroraPostgresEngineVersion.of("10.20","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_10_21=AuroraPostgresEngineVersion.of("10.21","10",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_4=AuroraPostgresEngineVersion.of("11.4","11",{s3Import:!0}),AuroraPostgresEngineVersion.VER_11_6=AuroraPostgresEngineVersion.of("11.6","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_7=AuroraPostgresEngineVersion.of("11.7","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_8=AuroraPostgresEngineVersion.of("11.8","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_9=AuroraPostgresEngineVersion.of("11.9","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_11=AuroraPostgresEngineVersion.of("11.11","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_12=AuroraPostgresEngineVersion.of("11.12","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_13=AuroraPostgresEngineVersion.of("11.13","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_14=AuroraPostgresEngineVersion.of("11.14","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_15=AuroraPostgresEngineVersion.of("11.15","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_16=AuroraPostgresEngineVersion.of("11.16","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_17=AuroraPostgresEngineVersion.of("11.17","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_18=AuroraPostgresEngineVersion.of("11.18","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_19=AuroraPostgresEngineVersion.of("11.19","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_20=AuroraPostgresEngineVersion.of("11.20","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_11_21=AuroraPostgresEngineVersion.of("11.21","11",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_4=AuroraPostgresEngineVersion.of("12.4","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_6=AuroraPostgresEngineVersion.of("12.6","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_7=AuroraPostgresEngineVersion.of("12.7","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_8=AuroraPostgresEngineVersion.of("12.8","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_9=AuroraPostgresEngineVersion.of("12.9","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_10=AuroraPostgresEngineVersion.of("12.10","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_11=AuroraPostgresEngineVersion.of("12.11","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_12=AuroraPostgresEngineVersion.of("12.12","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_13=AuroraPostgresEngineVersion.of("12.13","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_14=AuroraPostgresEngineVersion.of("12.14","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_15=AuroraPostgresEngineVersion.of("12.15","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_16=AuroraPostgresEngineVersion.of("12.16","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_17=AuroraPostgresEngineVersion.of("12.17","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_18=AuroraPostgresEngineVersion.of("12.18","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_19=AuroraPostgresEngineVersion.of("12.19","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_20=AuroraPostgresEngineVersion.of("12.20","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_21=AuroraPostgresEngineVersion.of("12.21","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_12_22=AuroraPostgresEngineVersion.of("12.22","12",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_3=AuroraPostgresEngineVersion.of("13.3","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_4=AuroraPostgresEngineVersion.of("13.4","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_5=AuroraPostgresEngineVersion.of("13.5","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_6=AuroraPostgresEngineVersion.of("13.6","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_7=AuroraPostgresEngineVersion.of("13.7","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_8=AuroraPostgresEngineVersion.of("13.8","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_9=AuroraPostgresEngineVersion.of("13.9","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_10=AuroraPostgresEngineVersion.of("13.10","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_11=AuroraPostgresEngineVersion.of("13.11","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_12=AuroraPostgresEngineVersion.of("13.12","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_13=AuroraPostgresEngineVersion.of("13.13","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_14=AuroraPostgresEngineVersion.of("13.14","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_15=AuroraPostgresEngineVersion.of("13.15","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_16=AuroraPostgresEngineVersion.of("13.16","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_17=AuroraPostgresEngineVersion.of("13.17","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_13_18=AuroraPostgresEngineVersion.of("13.18","13",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_3=AuroraPostgresEngineVersion.of("14.3","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_4=AuroraPostgresEngineVersion.of("14.4","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_5=AuroraPostgresEngineVersion.of("14.5","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_6=AuroraPostgresEngineVersion.of("14.6","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_7=AuroraPostgresEngineVersion.of("14.7","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_8=AuroraPostgresEngineVersion.of("14.8","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_9=AuroraPostgresEngineVersion.of("14.9","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_10=AuroraPostgresEngineVersion.of("14.10","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_11=AuroraPostgresEngineVersion.of("14.11","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_12=AuroraPostgresEngineVersion.of("14.12","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_13=AuroraPostgresEngineVersion.of("14.13","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_14=AuroraPostgresEngineVersion.of("14.14","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_14_15=AuroraPostgresEngineVersion.of("14.15","14",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_2=AuroraPostgresEngineVersion.of("15.2","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_3=AuroraPostgresEngineVersion.of("15.3","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_4=AuroraPostgresEngineVersion.of("15.4","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_5=AuroraPostgresEngineVersion.of("15.5","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_6=AuroraPostgresEngineVersion.of("15.6","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_7=AuroraPostgresEngineVersion.of("15.7","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_8=AuroraPostgresEngineVersion.of("15.8","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_9=AuroraPostgresEngineVersion.of("15.9","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_15_10=AuroraPostgresEngineVersion.of("15.10","15",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_0=AuroraPostgresEngineVersion.of("16.0","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_1=AuroraPostgresEngineVersion.of("16.1","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_2=AuroraPostgresEngineVersion.of("16.2","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_3=AuroraPostgresEngineVersion.of("16.3","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_4=AuroraPostgresEngineVersion.of("16.4","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_4_LIMITLESS=AuroraPostgresEngineVersion.of("16.4-limitless","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_5=AuroraPostgresEngineVersion.of("16.5","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_16_6=AuroraPostgresEngineVersion.of("16.6","16",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_17_1=AuroraPostgresEngineVersion.of("17.1","17",{s3Import:!0,s3Export:!0}),AuroraPostgresEngineVersion.VER_17_2=AuroraPostgresEngineVersion.of("17.2","17",{s3Import:!0,s3Export:!0});class AuroraPostgresClusterEngine extends ClusterEngineBase{constructor(version){super({engineType:"aurora-postgresql",singleUserRotationApplication:secretsmanager().SecretRotationApplication.POSTGRES_ROTATION_SINGLE_USER,multiUserRotationApplication:secretsmanager().SecretRotationApplication.POSTGRES_ROTATION_MULTI_USER,defaultPort:5432,engineVersion:version?{fullVersion:version.auroraPostgresFullVersion,majorVersion:version.auroraPostgresMajorVersion}:void 0,features:version?{s3Import:version._features.s3Import?AuroraPostgresClusterEngine.S3_IMPORT_FEATURE_NAME:void 0,s3Export:version._features.s3Export?AuroraPostgresClusterEngine.S3_EXPORT_FEATURE_NAME:void 0}:{s3Import:AuroraPostgresClusterEngine.S3_IMPORT_FEATURE_NAME,s3Export:AuroraPostgresClusterEngine.S3_EXPORT_FEATURE_NAME}}),this.engineFamily="POSTGRESQL",this.defaultUsername="postgres",this.supportedLogTypes=["postgresql"]}bindToCluster(scope,options){const config=super.bindToCluster(scope,options);if(this.engineVersion?.fullVersion){if(options.s3ImportRole&&!config.features?.s3Import)throw new Error(`s3Import is not supported for Postgres version: ${this.engineVersion.fullVersion}. Use a version that supports the s3Import feature.`);if(options.s3ExportRole&&!config.features?.s3Export)throw new Error(`s3Export is not supported for Postgres version: ${this.engineVersion.fullVersion}. Use a version that supports the s3Export feature.`)}return config}defaultParameterGroup(scope){if(!this.parameterGroupFamily)throw new Error("Could not create a new ParameterGroup for an unversioned aurora-postgresql cluster engine. Please either use a versioned engine, or pass an explicit ParameterGroup when creating the cluster");return parameter_group_1().ParameterGroup.fromParameterGroupName(scope,"AuroraPostgreSqlDatabaseClusterEngineDefaultParameterGroup",`default.${this.parameterGroupFamily}`)}}AuroraPostgresClusterEngine.S3_IMPORT_FEATURE_NAME="s3Import",AuroraPostgresClusterEngine.S3_EXPORT_FEATURE_NAME="s3Export";class DatabaseClusterEngine{static aurora(props){try{jsiiDeprecationWarnings().print("aws-cdk-lib.aws_rds.DatabaseClusterEngine#aurora","use `auroraMysql()` instead"),jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_AuroraClusterEngineProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.aurora),error}return new AuroraClusterEngine(props.version)}static auroraMysql(props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_AuroraMysqlClusterEngineProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.auroraMysql),error}return new AuroraMysqlClusterEngine(props.version)}static auroraPostgres(props){try{jsiiDeprecationWarnings().aws_cdk_lib_aws_rds_AuroraPostgresClusterEngineProps(props)}catch(error){throw process.env.JSII_DEBUG!=="1"&&error.name==="DeprecationError"&&Error.captureStackTrace(error,this.auroraPostgres),error}return new AuroraPostgresClusterEngine(props.version)}}exports.DatabaseClusterEngine=DatabaseClusterEngine,_d=JSII_RTTI_SYMBOL_1,DatabaseClusterEngine[_d]={fqn:"aws-cdk-lib.aws_rds.DatabaseClusterEngine",version:"2.175.1"},DatabaseClusterEngine.AURORA=new AuroraClusterEngine,DatabaseClusterEngine.AURORA_MYSQL=new AuroraMysqlClusterEngine,DatabaseClusterEngine.AURORA_POSTGRESQL=new AuroraPostgresClusterEngine;
