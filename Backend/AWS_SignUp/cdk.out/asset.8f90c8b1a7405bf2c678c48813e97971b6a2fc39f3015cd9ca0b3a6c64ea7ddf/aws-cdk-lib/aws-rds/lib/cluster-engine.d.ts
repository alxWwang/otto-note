import { Construct } from 'constructs';
import { IEngine } from './engine';
import { IParameterGroup } from './parameter-group';
import * as iam from '../../aws-iam';
import * as secretsmanager from '../../aws-secretsmanager';
/**
 * The extra options passed to the `IClusterEngine.bindToCluster` method.
 */
export interface ClusterEngineBindOptions {
    /**
     * The role used for S3 importing.
     *
     * @default - none
     */
    readonly s3ImportRole?: iam.IRole;
    /**
     * The role used for S3 exporting.
     *
     *  @default - none
     */
    readonly s3ExportRole?: iam.IRole;
    /**
     * The customer-provided ParameterGroup.
     *
     * @default - none
     */
    readonly parameterGroup?: IParameterGroup;
}
/**
 * The type returned from the `IClusterEngine.bindToCluster` method.
 */
export interface ClusterEngineConfig {
    /**
     * The ParameterGroup to use for the cluster.
     *
     * @default - no ParameterGroup will be used
     */
    readonly parameterGroup?: IParameterGroup;
    /**
     * The port to use for this cluster,
     * unless the customer specified the port directly.
     *
     * @default - use the default port for clusters (3306)
     */
    readonly port?: number;
    /**
     * Features supported by the database engine.
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DBEngineVersion.html
     *
     * @default - no features
     */
    readonly features?: ClusterEngineFeatures;
}
/**
 * Represents Database Engine features
 */
export interface ClusterEngineFeatures {
    /**
     * Feature name for the DB instance that the IAM role to access the S3 bucket for import
     * is to be associated with.
     *
     * @default - no s3Import feature name
     */
    readonly s3Import?: string;
    /**
     * Feature name for the DB instance that the IAM role to export to S3 bucket is to be
     * associated with.
     *
     * @default - no s3Export feature name
     */
    readonly s3Export?: string;
}
/**
 * The interface representing a database cluster (as opposed to instance) engine.
 */
export interface IClusterEngine extends IEngine {
    /** The application used by this engine to perform rotation for a single-user scenario. */
    readonly singleUserRotationApplication: secretsmanager.SecretRotationApplication;
    /** The application used by this engine to perform rotation for a multi-user scenario. */
    readonly multiUserRotationApplication: secretsmanager.SecretRotationApplication;
    /** The log types that are available with this engine type */
    readonly supportedLogTypes: string[];
    /**
     * Whether the IAM Roles used for data importing and exporting need to be combined for this Engine,
     * or can they be kept separate.
     *
     * @default false
     */
    readonly combineImportAndExportRoles?: boolean;
    /**
     * Method called when the engine is used to create a new cluster.
     */
    bindToCluster(scope: Construct, options: ClusterEngineBindOptions): ClusterEngineConfig;
}
/**
 * The versions for the Aurora cluster engine
 * (those returned by `DatabaseClusterEngine.aurora`).
 *
 * @deprecated use `AuroraMysqlEngineVersion` instead
 */
export declare class AuroraEngineVersion {
    /** Version "5.6.10a". */
    static readonly VER_10A: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.17.9". */
    static readonly VER_1_17_9: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.19.0". */
    static readonly VER_1_19_0: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.19.1". */
    static readonly VER_1_19_1: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.19.2". */
    static readonly VER_1_19_2: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.19.5". */
    static readonly VER_1_19_5: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.19.6". */
    static readonly VER_1_19_6: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.20.0". */
    static readonly VER_1_20_0: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.20.1". */
    static readonly VER_1_20_1: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.21.0". */
    static readonly VER_1_21_0: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.22.0". */
    static readonly VER_1_22_0: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.22.1". */
    static readonly VER_1_22_1: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.22.1.3". */
    static readonly VER_1_22_1_3: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.22.2". */
    static readonly VER_1_22_2: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.22.3". */
    static readonly VER_1_22_3: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.22.4". */
    static readonly VER_1_22_4: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.22.5". */
    static readonly VER_1_22_5: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.23.0". */
    static readonly VER_1_23_0: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.23.1". */
    static readonly VER_1_23_1: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.23.2". */
    static readonly VER_1_23_2: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.23.3". */
    static readonly VER_1_23_3: AuroraEngineVersion;
    /** Version "5.6.mysql_aurora.1.23.4". */
    static readonly VER_1_23_4: AuroraEngineVersion;
    /**
     * Create a new AuroraEngineVersion with an arbitrary version.
     *
     * @param auroraFullVersion the full version string,
     *   for example "5.6.mysql_aurora.1.78.3.6"
     * @param auroraMajorVersion the major version of the engine,
     *   defaults to "5.6"
     */
    static of(auroraFullVersion: string, auroraMajorVersion?: string): AuroraEngineVersion;
    private static builtIn_5_6;
    /** The full version string, for example, "5.6.mysql_aurora.1.78.3.6". */
    readonly auroraFullVersion: string;
    /** The major version of the engine. Currently, it's always "5.6". */
    readonly auroraMajorVersion: string;
    private constructor();
}
/**
 * Creation properties of the plain Aurora database cluster engine.
 * Used in `DatabaseClusterEngine.aurora`.
 *
 * @deprecated use `AuroraMysqlClusterEngineProps` instead
 */
export interface AuroraClusterEngineProps {
    /** The version of the Aurora cluster engine. */
    readonly version: AuroraEngineVersion;
}
/**
 * The versions for the Aurora MySQL cluster engine
 * (those returned by `DatabaseClusterEngine.auroraMysql`).
 *
 * https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/Welcome.html
 */
export declare class AuroraMysqlEngineVersion {
    /**
     * Version "5.7.12".
     * @deprecated Version 5.7.12 is no longer supported by Amazon RDS.
     */
    static readonly VER_5_7_12: AuroraMysqlEngineVersion;
    /**
    * Version "5.7.mysql_aurora.2.02.3"
    * @deprecated Version 5.7.mysql_aurora.2.02.3 is no longer supported by Amazon RDS.
    */
    static readonly VER_2_02_3: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.03.2".
     * @deprecated Version 5.7.mysql_aurora.2.03.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_03_2: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.03.3".
     * @deprecated Version 5.7.mysql_aurora.2.03.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_03_3: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.03.4".
     * @deprecated Version 5.7.mysql_aurora.2.03.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_03_4: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.0".
     * @deprecated Version 5.7.mysql_aurora.2.04.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_0: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.1".
     * @deprecated Version 5.7.mysql_aurora.2.04.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_1: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.2".
     * @deprecated Version 5.7.mysql_aurora.2.04.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_2: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.3".
     * @deprecated Version 5.7.mysql_aurora.2.04.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_3: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.4".
     * @deprecated Version 5.7.mysql_aurora.2.04.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_4: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.5".
     * @deprecated Version 5.7.mysql_aurora.2.04.5 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_5: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.6".
     * @deprecated Version 5.7.mysql_aurora.2.04.6 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_6: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.7".
     * @deprecated Version 5.7.mysql_aurora.2.04.7 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_7: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.04.8".
     * @deprecated Version 5.7.mysql_aurora.2.04.8 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_04_8: AuroraMysqlEngineVersion;
    /**
    * Version "5.7.mysql_aurora.2.04.9"
    * @deprecated Version 5.7.mysql_aurora.2.04.9 is no longer supported by Amazon RDS.
    */
    static readonly VER_2_04_9: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.05.0".
     * @deprecated Version 5.7.mysql_aurora.2.05.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_05_0: AuroraMysqlEngineVersion;
    /**
    * Version "5.7.mysql_aurora.2.05.1"
    * @deprecated Version 5.7.mysql_aurora.2.05.1 is no longer supported by Amazon RDS.
    */
    static readonly VER_2_05_1: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.06.0".
     * @deprecated Version 5.7.mysql_aurora.2.06.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_06_0: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.0".
     * @deprecated Version 5.7.mysql_aurora.2.07.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_0: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.1".
     * @deprecated Version 5.7.mysql_aurora.2.07.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_1: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.2".
     * @deprecated Version 5.7.mysql_aurora.2.07.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_2: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.3".
     * @deprecated Version 5.7.mysql_aurora.2.07.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_3: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.4"
     * @deprecated Version 5.7.mysql_aurora.2.07.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_4: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.5".
     * @deprecated Version 5.7.mysql_aurora.2.07.5 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_5: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.6".
     * @deprecated Version 5.7.mysql_aurora.2.07.6 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_6: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.7".
     * @deprecated Version 5.7.mysql_aurora.2.07.7 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_7: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.8".
     * @deprecated Version 5.7.mysql_aurora.2.07.8 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_8: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.9".
     * @deprecated Version 5.7.mysql_aurora.2.07.9 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_9: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.07.10".
     * @deprecated Version 5.7.mysql_aurora.2.07.10 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_07_10: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.08.0".
     * @deprecated Version 5.7.mysql_aurora.2.08.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_08_0: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.08.1".
     * @deprecated Version 5.7.mysql_aurora.2.08.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_08_1: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.08.2".
     * @deprecated Version 5.7.mysql_aurora.2.08.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_08_2: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.08.3".
     * @deprecated Version 5.7.mysql_aurora.2.08.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_08_3: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.08.4".
     * @deprecated Version 5.7.mysql_aurora.2.08.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_08_4: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.09.0".
     * @deprecated Version 5.7.mysql_aurora.2.09.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_09_0: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.09.1".
     * @deprecated Version 5.7.mysql_aurora.2.09.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_09_1: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.09.2".
     * @deprecated Version 5.7.mysql_aurora.2.09.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_09_2: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.09.3".
     * @deprecated Version 5.7.mysql_aurora.2.09.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_09_3: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.10.0".
     * @deprecated Version 5.7.mysql_aurora.2.10.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_10_0: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.10.1".
     * @deprecated Version 5.7.mysql_aurora.2.10.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_10_1: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.10.2".
     * @deprecated Version 5.7.mysql_aurora.2.10.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_10_2: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.10.3".
     * @deprecated Version 5.7.mysql_aurora.2.10.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_10_3: AuroraMysqlEngineVersion;
    /**
     * Version "5.7.mysql_aurora.2.11.0"
     * @deprecated Version 5.7.mysql_aurora.2.11.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_2_11_0: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.11.1". */
    static readonly VER_2_11_1: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.11.2". */
    static readonly VER_2_11_2: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.11.3". */
    static readonly VER_2_11_3: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.11.4". */
    static readonly VER_2_11_4: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.11.5". */
    static readonly VER_2_11_5: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.12.0". */
    static readonly VER_2_12_0: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.12.1". */
    static readonly VER_2_12_1: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.12.2". */
    static readonly VER_2_12_2: AuroraMysqlEngineVersion;
    /** Version "5.7.mysql_aurora.2.12.3". */
    static readonly VER_2_12_3: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.01.0"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.01.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_01_0: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.01.1"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.01.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_01_1: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.02.0"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.02.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_02_0: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.02.1"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.02.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_02_1: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.02.2"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.02.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_02_2: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.02.3"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.02.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_02_3: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.03.0"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.03.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_03_0: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.03.1"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.03.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_03_1: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.03.2"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.03.2 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_03_2: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.03.3"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.03.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_03_3: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.04.0". */
    static readonly VER_3_04_0: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.04.1". */
    static readonly VER_3_04_1: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.04.2". */
    static readonly VER_3_04_2: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.04.3". */
    static readonly VER_3_04_3: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.05.0"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.05.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_05_0: AuroraMysqlEngineVersion;
    /**
     * Version "8.0.mysql_aurora.3.05.1"
     * @deprecated Aurora MySQL 8.0.mysql_aurora.3.05.1 is no longer supported by Amazon RDS.
     */
    static readonly VER_3_05_1: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.05.2". */
    static readonly VER_3_05_2: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.06.0". */
    static readonly VER_3_06_0: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.06.1". */
    static readonly VER_3_06_1: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.07.0". */
    static readonly VER_3_07_0: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.07.1". */
    static readonly VER_3_07_1: AuroraMysqlEngineVersion;
    /** Version "8.0.mysql_aurora.3.08.0". */
    static readonly VER_3_08_0: AuroraMysqlEngineVersion;
    /**
     * Create a new AuroraMysqlEngineVersion with an arbitrary version.
     *
     * @param auroraMysqlFullVersion the full version string,
     *   for example "5.7.mysql_aurora.2.78.3.6"
     * @param auroraMysqlMajorVersion the major version of the engine,
     *   defaults to "5.7"
     */
    static of(auroraMysqlFullVersion: string, auroraMysqlMajorVersion?: string): AuroraMysqlEngineVersion;
    private static builtIn_5_7;
    private static builtIn_8_0;
    /** The full version string, for example, "5.7.mysql_aurora.1.78.3.6". */
    readonly auroraMysqlFullVersion: string;
    /** The major version of the engine. Currently, it's either "5.7", or "8.0". */
    readonly auroraMysqlMajorVersion: string;
    /**
     * Whether this version requires combining the import and export IAM Roles.
     *
     * @internal
     */
    readonly _combineImportAndExportRoles?: boolean;
    private constructor();
}
/**
 * Creation properties of the Aurora MySQL database cluster engine.
 * Used in `DatabaseClusterEngine.auroraMysql`.
 */
export interface AuroraMysqlClusterEngineProps {
    /** The version of the Aurora MySQL cluster engine. */
    readonly version: AuroraMysqlEngineVersion;
}
/**
 * Features supported by this version of the Aurora Postgres cluster engine.
 */
export interface AuroraPostgresEngineFeatures {
    /**
     * Whether this version of the Aurora Postgres cluster engine supports the S3 data import feature.
     *
     * @default false
     */
    readonly s3Import?: boolean;
    /**
     * Whether this version of the Aurora Postgres cluster engine supports the S3 data export feature.
     *
     * @default false
     */
    readonly s3Export?: boolean;
}
/**
 * The versions for the Aurora PostgreSQL cluster engine
 * (those returned by `DatabaseClusterEngine.auroraPostgres`).
 *
 * https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/AuroraPostgreSQL.Updates.html
 */
export declare class AuroraPostgresEngineVersion {
    /**
     * Version "9.6.8".
     * @deprecated Version 9.6.8 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_8: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.9".
     * @deprecated Version 9.6.9 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_9: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.11".
     * @deprecated Version 9.6.11 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_11: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.12".
     * @deprecated Version 9.6.12 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_12: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.16".
     * @deprecated Version 9.6.16 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_16: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.17".
     * @deprecated Version 9.6.17 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_17: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.18".
     * @deprecated Version 9.6.18 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_18: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.19".
     * @deprecated Version 9.6.19 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_19: AuroraPostgresEngineVersion;
    /**
     * Version "9.6.22"
     * @deprecated Version 9.6.22 is no longer supported by Amazon RDS.
     */
    static readonly VER_9_6_22: AuroraPostgresEngineVersion;
    /**
     *  Version "10.4".
     * @deprecated Version 10.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_4: AuroraPostgresEngineVersion;
    /**
     *  Version "10.5".
     * @deprecated Version 10.5 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_5: AuroraPostgresEngineVersion;
    /**
     *  Version "10.6".
     * @deprecated Version 10.6 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_6: AuroraPostgresEngineVersion;
    /**
     *  Version "10.7".
     * @deprecated Version 10.7 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_7: AuroraPostgresEngineVersion;
    /**
     *  Version "10.11".
     * @deprecated Version 10.11 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_11: AuroraPostgresEngineVersion;
    /**
     *  Version "10.12".
     * @deprecated Version 10.12 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_12: AuroraPostgresEngineVersion;
    /**
     *  Version "10.13".
     * @deprecated Version 10.13 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_13: AuroraPostgresEngineVersion;
    /**
     *  Version "10.14".
     * @deprecated Version 10.14 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_14: AuroraPostgresEngineVersion;
    /**
     *  Version "10.16".
     * @deprecated Version 10.16 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_16: AuroraPostgresEngineVersion;
    /**
     *  Version "10.17".
     * @deprecated Version 10.17 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_17: AuroraPostgresEngineVersion;
    /**
     *  Version "10.18".
     * @deprecated Version 10.18 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_18: AuroraPostgresEngineVersion;
    /**
     *  Version "10.19".
     * @deprecated Version 10.19 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_19: AuroraPostgresEngineVersion;
    /**
     *  Version "10.20".
     * @deprecated Version 10.20 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_20: AuroraPostgresEngineVersion;
    /**
     *  Version "10.21".
     * @deprecated Version 10.21 is no longer supported by Amazon RDS.
     */
    static readonly VER_10_21: AuroraPostgresEngineVersion;
    /**
     *  Version "11.4".
     * @deprecated Version 11.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_4: AuroraPostgresEngineVersion;
    /**
     *  Version "11.6".
     * @deprecated Version 11.6 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_6: AuroraPostgresEngineVersion;
    /**
     *  Version "11.7".
     * @deprecated Version 11.7 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_7: AuroraPostgresEngineVersion;
    /**
     *  Version "11.8".
     * @deprecated Version 11.8 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_8: AuroraPostgresEngineVersion;
    /** Version "11.9". */
    static readonly VER_11_9: AuroraPostgresEngineVersion;
    /**
     *  Version "11.11".
     * @deprecated Version 11.11 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_11: AuroraPostgresEngineVersion;
    /**
     *  Version "11.12".
     * @deprecated Version 11.12 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_12: AuroraPostgresEngineVersion;
    /**
     *  Version "11.13".
     * @deprecated Version 11.13 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_13: AuroraPostgresEngineVersion;
    /**
     *  Version "11.14".
     * @deprecated Version 11.14 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_14: AuroraPostgresEngineVersion;
    /**
     *  Version "11.15".
     * @deprecated Version 11.15 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_15: AuroraPostgresEngineVersion;
    /**
     * Version "11.16"
     * @deprecated Version 11.16 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_16: AuroraPostgresEngineVersion;
    /**
     * Version "11.17"
     * @deprecated Version 11.17 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_17: AuroraPostgresEngineVersion;
    /**
     * Version "11.18"
     * @deprecated Version 11.18 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_18: AuroraPostgresEngineVersion;
    /**
     * Version "11.19"
     * @deprecated Version 11.19 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_19: AuroraPostgresEngineVersion;
    /**
     * Version "11.20"
     * @deprecated Version 11.20 is no longer supported by Amazon RDS.
     */
    static readonly VER_11_20: AuroraPostgresEngineVersion;
    /** Version "11.21". */
    static readonly VER_11_21: AuroraPostgresEngineVersion;
    /**
     *  Version "12.4".
     * @deprecated Version 12.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_12_4: AuroraPostgresEngineVersion;
    /**
     *  Version "12.6".
     * @deprecated Version 12.6 is no longer supported by Amazon RDS.
     */
    static readonly VER_12_6: AuroraPostgresEngineVersion;
    /**
     *  Version "12.7".
     * @deprecated Version 12.7 is no longer supported by Amazon RDS.
     */
    static readonly VER_12_7: AuroraPostgresEngineVersion;
    /**
     *  Version "12.8".
     * @deprecated Version 12.8 is no longer supported by Amazon RDS.
     */
    static readonly VER_12_8: AuroraPostgresEngineVersion;
    /** Version "12.9". */
    static readonly VER_12_9: AuroraPostgresEngineVersion;
    /**
     *  Version "12.10".
     * @deprecated Version 12.10 is no longer supported by Amazon RDS.
     */
    static readonly VER_12_10: AuroraPostgresEngineVersion;
    /** Version "12.11". */
    static readonly VER_12_11: AuroraPostgresEngineVersion;
    /** Version "12.12". */
    static readonly VER_12_12: AuroraPostgresEngineVersion;
    /** Version "12.13". */
    static readonly VER_12_13: AuroraPostgresEngineVersion;
    /** Version "12.14". */
    static readonly VER_12_14: AuroraPostgresEngineVersion;
    /** Version "12.15". */
    static readonly VER_12_15: AuroraPostgresEngineVersion;
    /** Version "12.16". */
    static readonly VER_12_16: AuroraPostgresEngineVersion;
    /** Version "12.17". */
    static readonly VER_12_17: AuroraPostgresEngineVersion;
    /** Version "12.18". */
    static readonly VER_12_18: AuroraPostgresEngineVersion;
    /** Version "12.19". */
    static readonly VER_12_19: AuroraPostgresEngineVersion;
    /** Version "12.20". */
    static readonly VER_12_20: AuroraPostgresEngineVersion;
    /** Version "12.21". */
    static readonly VER_12_21: AuroraPostgresEngineVersion;
    /** Version "12.22". */
    static readonly VER_12_22: AuroraPostgresEngineVersion;
    /**
     *  Version "13.3".
     * @deprecated Version 13.3 is no longer supported by Amazon RDS.
     */
    static readonly VER_13_3: AuroraPostgresEngineVersion;
    /**
     *  Version "13.4".
     * @deprecated Version 13.4 is no longer supported by Amazon RDS.
     */
    static readonly VER_13_4: AuroraPostgresEngineVersion;
    /**
     *  Version "13.5".
     * @deprecated Version 13.5 is no longer supported by Amazon RDS.
     */
    static readonly VER_13_5: AuroraPostgresEngineVersion;
    /**
     *  Version "13.6".
     * @deprecated Version 13.6 is no longer supported by Amazon RDS.
     */
    static readonly VER_13_6: AuroraPostgresEngineVersion;
    /** Version "13.7". */
    static readonly VER_13_7: AuroraPostgresEngineVersion;
    /** Version "13.8". */
    static readonly VER_13_8: AuroraPostgresEngineVersion;
    /** Version "13.9". */
    static readonly VER_13_9: AuroraPostgresEngineVersion;
    /** Version "13.10". */
    static readonly VER_13_10: AuroraPostgresEngineVersion;
    /** Version "13.11". */
    static readonly VER_13_11: AuroraPostgresEngineVersion;
    /** Version "13.12". */
    static readonly VER_13_12: AuroraPostgresEngineVersion;
    /** Version "13.13". */
    static readonly VER_13_13: AuroraPostgresEngineVersion;
    /** Version "13.14". */
    static readonly VER_13_14: AuroraPostgresEngineVersion;
    /** Version "13.15". */
    static readonly VER_13_15: AuroraPostgresEngineVersion;
    /** Version "13.16". */
    static readonly VER_13_16: AuroraPostgresEngineVersion;
    /** Version "13.17". */
    static readonly VER_13_17: AuroraPostgresEngineVersion;
    /** Version "13.18". */
    static readonly VER_13_18: AuroraPostgresEngineVersion;
    /** Version "14.3". */
    static readonly VER_14_3: AuroraPostgresEngineVersion;
    /**  Version "14.4". */
    static readonly VER_14_4: AuroraPostgresEngineVersion;
    /** Version "14.5". */
    static readonly VER_14_5: AuroraPostgresEngineVersion;
    /** Version "14.6". */
    static readonly VER_14_6: AuroraPostgresEngineVersion;
    /** Version "14.7". */
    static readonly VER_14_7: AuroraPostgresEngineVersion;
    /** Version "14.8". */
    static readonly VER_14_8: AuroraPostgresEngineVersion;
    /** Version "14.9". */
    static readonly VER_14_9: AuroraPostgresEngineVersion;
    /** Version "14.10". */
    static readonly VER_14_10: AuroraPostgresEngineVersion;
    /** Version "14.11". */
    static readonly VER_14_11: AuroraPostgresEngineVersion;
    /** Version "14.12". */
    static readonly VER_14_12: AuroraPostgresEngineVersion;
    /** Version "14.13". */
    static readonly VER_14_13: AuroraPostgresEngineVersion;
    /** Version "14.14". */
    static readonly VER_14_14: AuroraPostgresEngineVersion;
    /** Version "14.15". */
    static readonly VER_14_15: AuroraPostgresEngineVersion;
    /** Version "15.2". */
    static readonly VER_15_2: AuroraPostgresEngineVersion;
    /** Version "15.3". */
    static readonly VER_15_3: AuroraPostgresEngineVersion;
    /** Version "15.4". */
    static readonly VER_15_4: AuroraPostgresEngineVersion;
    /** Version "15.5". */
    static readonly VER_15_5: AuroraPostgresEngineVersion;
    /** Version "15.6". */
    static readonly VER_15_6: AuroraPostgresEngineVersion;
    /** Version "15.7". */
    static readonly VER_15_7: AuroraPostgresEngineVersion;
    /** Version "15.8". */
    static readonly VER_15_8: AuroraPostgresEngineVersion;
    /** Version "15.9". */
    static readonly VER_15_9: AuroraPostgresEngineVersion;
    /** Version "15.10". */
    static readonly VER_15_10: AuroraPostgresEngineVersion;
    /**
     * Version "16.0"
     * @deprecated Version 16.0 is no longer supported by Amazon RDS.
     */
    static readonly VER_16_0: AuroraPostgresEngineVersion;
    /** Version "16.1". */
    static readonly VER_16_1: AuroraPostgresEngineVersion;
    /** Version "16.2". */
    static readonly VER_16_2: AuroraPostgresEngineVersion;
    /** Version "16.3". */
    static readonly VER_16_3: AuroraPostgresEngineVersion;
    /** Version "16.4". */
    static readonly VER_16_4: AuroraPostgresEngineVersion;
    /** Version "16.4 limitless" */
    static readonly VER_16_4_LIMITLESS: AuroraPostgresEngineVersion;
    /** Version "16.5". */
    static readonly VER_16_5: AuroraPostgresEngineVersion;
    /** Version "16.6". */
    static readonly VER_16_6: AuroraPostgresEngineVersion;
    /** Version "17.1". */
    static readonly VER_17_1: AuroraPostgresEngineVersion;
    /** Version "17.2". */
    static readonly VER_17_2: AuroraPostgresEngineVersion;
    /**
     * Create a new AuroraPostgresEngineVersion with an arbitrary version.
     *
     * @param auroraPostgresFullVersion the full version string,
     *   for example "9.6.25.1"
     * @param auroraPostgresMajorVersion the major version of the engine,
     *   for example "9.6"
     */
    static of(auroraPostgresFullVersion: string, auroraPostgresMajorVersion: string, auroraPostgresFeatures?: AuroraPostgresEngineFeatures): AuroraPostgresEngineVersion;
    /** The full version string, for example, "9.6.25.1". */
    readonly auroraPostgresFullVersion: string;
    /** The major version of the engine, for example, "9.6". */
    readonly auroraPostgresMajorVersion: string;
    /**
     * The supported features for the DB engine
     *
     * @internal
     */
    readonly _features: ClusterEngineFeatures;
    private constructor();
}
/**
 * Creation properties of the Aurora PostgreSQL database cluster engine.
 * Used in `DatabaseClusterEngine.auroraPostgres`.
 */
export interface AuroraPostgresClusterEngineProps {
    /** The version of the Aurora PostgreSQL cluster engine. */
    readonly version: AuroraPostgresEngineVersion;
}
/**
 * A database cluster engine. Provides mapping to the serverless application
 * used for secret rotation.
 */
export declare class DatabaseClusterEngine {
    /**
     * The unversioned 'aurora' cluster engine.
     *
     * **Note**: we do not recommend using unversioned engines for non-serverless Clusters,
     *   as that can pose an availability risk.
     *   We recommend using versioned engines created using the `aurora()` method
     *
     * @deprecated use `AURORA_MYSQL` instead
     */
    static readonly AURORA: IClusterEngine;
    /**
     * The unversioned 'aurora-msql' cluster engine.
     *
     * **Note**: we do not recommend using unversioned engines for non-serverless Clusters,
     *   as that can pose an availability risk.
     *   We recommend using versioned engines created using the `auroraMysql()` method
     */
    static readonly AURORA_MYSQL: IClusterEngine;
    /**
     * The unversioned 'aurora-postgresql' cluster engine.
     *
     * **Note**: we do not recommend using unversioned engines for non-serverless Clusters,
     *   as that can pose an availability risk.
     *   We recommend using versioned engines created using the `auroraPostgres()` method
     */
    static readonly AURORA_POSTGRESQL: IClusterEngine;
    /**
     * Creates a new plain Aurora database cluster engine.
     *
     * @deprecated use `auroraMysql()` instead
     */
    static aurora(props: AuroraClusterEngineProps): IClusterEngine;
    /** Creates a new Aurora MySQL database cluster engine. */
    static auroraMysql(props: AuroraMysqlClusterEngineProps): IClusterEngine;
    /** Creates a new Aurora PostgreSQL database cluster engine. */
    static auroraPostgres(props: AuroraPostgresClusterEngineProps): IClusterEngine;
}
