import { Construct } from 'constructs';
import { IClusterInstance } from './aurora-cluster-instance';
import { IClusterEngine } from './cluster-engine';
import { DatabaseClusterAttributes, IDatabaseCluster } from './cluster-ref';
import { Endpoint } from './endpoint';
import { NetworkType } from './instance';
import { IParameterGroup } from './parameter-group';
import { BackupProps, Credentials, InstanceProps, PerformanceInsightRetention, RotationSingleUserOptions, RotationMultiUserOptions, SnapshotCredentials } from './props';
import { DatabaseProxy, DatabaseProxyOptions } from './proxy';
import { CfnDBClusterProps } from './rds.generated';
import { ISubnetGroup } from './subnet-group';
import * as cloudwatch from '../../aws-cloudwatch';
import * as ec2 from '../../aws-ec2';
import * as iam from '../../aws-iam';
import { IRole } from '../../aws-iam';
import * as kms from '../../aws-kms';
import * as logs from '../../aws-logs';
import * as s3 from '../../aws-s3';
import * as secretsmanager from '../../aws-secretsmanager';
import { Duration, RemovalPolicy, Resource } from '../../core';
/**
 * Common properties for a new database cluster or cluster from snapshot.
 */
interface DatabaseClusterBaseProps {
    /**
     * What kind of database to start
     */
    readonly engine: IClusterEngine;
    /**
     * How many replicas/instances to create
     *
     * Has to be at least 1.
     *
     * @default 2
     * @deprecated - use writer and readers instead
     */
    readonly instances?: number;
    /**
     * Settings for the individual instances that are launched
     *
     * @deprecated - use writer and readers instead
     */
    readonly instanceProps?: InstanceProps;
    /**
     * The instance to use for the cluster writer
     *
     * @default - required if instanceProps is not provided
     */
    readonly writer?: IClusterInstance;
    /**
     * A list of instances to create as cluster reader instances
     *
     * @default - no readers are created. The cluster will have a single writer/reader
     */
    readonly readers?: IClusterInstance[];
    /**
     * The maximum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2 cluster.
     * You can specify ACU values in half-step increments, such as 40, 40.5, 41, and so on.
     * The largest value that you can use is 256.
     *
     * The maximum capacity must be higher than 0.5 ACUs.
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html#aurora-serverless-v2.max_capacity_considerations
     *
     * @default 2
     */
    readonly serverlessV2MaxCapacity?: number;
    /**
     * The minimum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2 cluster.
     * You can specify ACU values in half-step increments, such as 8, 8.5, 9, and so on.
     * The smallest value that you can use is 0.
     *
     * For Aurora versions that support the Aurora Serverless v2 auto-pause feature, the smallest value that you can use is 0.
     * For versions that don't support Aurora Serverless v2 auto-pause, the smallest value that you can use is 0.5.
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html#aurora-serverless-v2.min_capacity_considerations
     *
     * @default 0.5
     */
    readonly serverlessV2MinCapacity?: number;
    /**
     * What subnets to run the RDS instances in.
     *
     * Must be at least 2 subnets in two different AZs.
     */
    readonly vpc?: ec2.IVpc;
    /**
     * Where to place the instances within the VPC
     *
     * @default - the Vpc default strategy if not specified.
     */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /**
     * Security group.
     *
     * @default - a new security group is created.
     */
    readonly securityGroups?: ec2.ISecurityGroup[];
    /**
     * The ordering of updates for instances
     *
     * @default InstanceUpdateBehaviour.BULK
     */
    readonly instanceUpdateBehaviour?: InstanceUpdateBehaviour;
    /**
     * The number of seconds to set a cluster's target backtrack window to.
     * This feature is only supported by the Aurora MySQL database engine and
     * cannot be enabled on existing clusters.
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.html
     * @default 0 seconds (no backtrack)
     */
    readonly backtrackWindow?: Duration;
    /**
     * Backup settings
     *
     * @default - Backup retention period for automated backups is 1 day.
     * Backup preferred window is set to a 30-minute window selected at random from an
     * 8-hour block of time for each AWS Region, occurring on a random day of the week.
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html#USER_WorkingWithAutomatedBackups.BackupWindow
     */
    readonly backup?: BackupProps;
    /**
     * What port to listen on
     *
     * @default - The default for the engine is used.
     */
    readonly port?: number;
    /**
     * An optional identifier for the cluster
     *
     * @default - A name is automatically generated.
     */
    readonly clusterIdentifier?: string;
    /**
     * Base identifier for instances
     *
     * Every replica is named by appending the replica number to this string, 1-based.
     *
     * @default - clusterIdentifier is used with the word "Instance" appended.
     * If clusterIdentifier is not provided, the identifier is automatically generated.
     */
    readonly instanceIdentifierBase?: string;
    /**
     * Name of a database which is automatically created inside the cluster
     *
     * @default - Database is not created in cluster.
     */
    readonly defaultDatabaseName?: string;
    /**
     * Indicates whether the DB cluster should have deletion protection enabled.
     *
     * @default - true if `removalPolicy` is RETAIN, `undefined` otherwise, which will not enable deletion protection.
     * To disable deletion protection after it has been enabled, you must explicitly set this value to `false`.
     */
    readonly deletionProtection?: boolean;
    /**
     * A preferred maintenance window day/time range. Should be specified as a range ddd:hh24:mi-ddd:hh24:mi (24H Clock UTC).
     *
     * Example: 'Sun:23:45-Mon:00:15'
     *
     * @default - 30-minute window selected at random from an 8-hour block of time for
     * each AWS Region, occurring on a random day of the week.
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.Maintenance.html#Concepts.DBMaintenance
     */
    readonly preferredMaintenanceWindow?: string;
    /**
     * Additional parameters to pass to the database engine
     *
     * @default - No parameter group.
     */
    readonly parameterGroup?: IParameterGroup;
    /**
     * The parameters in the DBClusterParameterGroup to create automatically
     *
     * You can only specify parameterGroup or parameters but not both.
     * You need to use a versioned engine to auto-generate a DBClusterParameterGroup.
     *
     * @default - None
     */
    readonly parameters?: {
        [key: string]: string;
    };
    /**
     * The removal policy to apply when the cluster and its instances are removed
     * from the stack or replaced during an update.
     *
     * @default - RemovalPolicy.SNAPSHOT (remove the cluster and instances, but retain a snapshot of the data)
     */
    readonly removalPolicy?: RemovalPolicy;
    /**
     * The list of log types that need to be enabled for exporting to
     * CloudWatch Logs.
     *
     * @default - no log exports
     */
    readonly cloudwatchLogsExports?: string[];
    /**
     * The number of days log events are kept in CloudWatch Logs. When updating
     * this property, unsetting it doesn't remove the log retention policy. To
     * remove the retention policy, set the value to `Infinity`.
     *
     * @default - logs never expire
     */
    readonly cloudwatchLogsRetention?: logs.RetentionDays;
    /**
     * The IAM role for the Lambda function associated with the custom resource
     * that sets the retention policy.
     *
     * @default - a new role is created.
     */
    readonly cloudwatchLogsRetentionRole?: IRole;
    /**
     * The interval between points when Amazon RDS collects enhanced monitoring metrics.
     *
     * If you enable `enableClusterLevelEnhancedMonitoring`, this property is applied to the cluster,
     * otherwise it is applied to the instances.
     *
     * @default - no enhanced monitoring
     */
    readonly monitoringInterval?: Duration;
    /**
     * Role that will be used to manage DB monitoring.
     *
     * If you enable `enableClusterLevelEnhancedMonitoring`, this property is applied to the cluster,
     * otherwise it is applied to the instances.
     *
     * @default - A role is automatically created for you
     */
    readonly monitoringRole?: IRole;
    /**
     * Whether to enable enhanced monitoring at the cluster level.
     *
     * If set to true, `monitoringInterval` and `monitoringRole` are applied to not the instances, but the cluster.
     * `monitoringInterval` is required to be set if `enableClusterLevelEnhancedMonitoring` is set to true.
     *
     * @default - When the `monitoringInterval` is set, enhanced monitoring is enabled for each instance.
     */
    readonly enableClusterLevelEnhancedMonitoring?: boolean;
    /**
     * Role that will be associated with this DB cluster to enable S3 import.
     * This feature is only supported by the Aurora database engine.
     *
     * This property must not be used if `s3ImportBuckets` is used.
     * To use this property with Aurora PostgreSQL, it must be configured with the S3 import feature enabled when creating the DatabaseClusterEngine
     * For MySQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.LoadFromS3.html
     *
     * For PostgreSQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Migrating.html
     *
     * @default - New role is created if `s3ImportBuckets` is set, no role is defined otherwise
     */
    readonly s3ImportRole?: IRole;
    /**
     * S3 buckets that you want to load data from. This feature is only supported by the Aurora database engine.
     *
     * This property must not be used if `s3ImportRole` is used.
     *
     * For MySQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.LoadFromS3.html
     *
     * For PostgreSQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Migrating.html
     *
     * @default - None
     */
    readonly s3ImportBuckets?: s3.IBucket[];
    /**
     * Role that will be associated with this DB cluster to enable S3 export.
     * This feature is only supported by the Aurora database engine.
     *
     * This property must not be used if `s3ExportBuckets` is used.
     * To use this property with Aurora PostgreSQL, it must be configured with the S3 export feature enabled when creating the DatabaseClusterEngine
     * For MySQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.SaveIntoS3.html
     *
     * For PostgreSQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/postgresql-s3-export.html
     *
     * @default - New role is created if `s3ExportBuckets` is set, no role is defined otherwise
     */
    readonly s3ExportRole?: IRole;
    /**
     * S3 buckets that you want to load data into. This feature is only supported by the Aurora database engine.
     *
     * This property must not be used if `s3ExportRole` is used.
     *
     * For MySQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.SaveIntoS3.html
     *
     * For PostgreSQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/postgresql-s3-export.html
     *
     * @default - None
     */
    readonly s3ExportBuckets?: s3.IBucket[];
    /**
     * Existing subnet group for the cluster.
     *
     * @default - a new subnet group will be created.
     */
    readonly subnetGroup?: ISubnetGroup;
    /**
     * Whether to enable mapping of AWS Identity and Access Management (IAM) accounts
     * to database accounts.
     *
     * @default false
     */
    readonly iamAuthentication?: boolean;
    /**
     * Whether to enable storage encryption.
     *
     * @default - true if storageEncryptionKey is provided, false otherwise
     */
    readonly storageEncrypted?: boolean;
    /**
     * The KMS key for storage encryption.
     * If specified, `storageEncrypted` will be set to `true`.
     *
     * @default - if storageEncrypted is true then the default master key, no key otherwise
     */
    readonly storageEncryptionKey?: kms.IKey;
    /**
     * The storage type to be associated with the DB cluster.
     *
     * @default - DBClusterStorageType.AURORA_IOPT1
     */
    readonly storageType?: DBClusterStorageType;
    /**
     * Whether to copy tags to the snapshot when a snapshot is created.
     *
     * @default - true
     */
    readonly copyTagsToSnapshot?: boolean;
    /**
     * The network type of the DB instance.
     *
     * @default - IPV4
     */
    readonly networkType?: NetworkType;
    /**
    * Directory ID for associating the DB cluster with a specific Active Directory.
    *
    * Necessary for enabling Kerberos authentication. If specified, the DB cluster joins the given Active Directory, enabling Kerberos authentication.
    * If not specified, the DB cluster will not be associated with any Active Directory, and Kerberos authentication will not be enabled.
    *
    * @default - DB cluster is not associated with an Active Directory; Kerberos authentication is not enabled.
    */
    readonly domain?: string;
    /**
     * The IAM role to be used when making API calls to the Directory Service. The role needs the AWS-managed policy
     * `AmazonRDSDirectoryServiceAccess` or equivalent.
     *
     * @default - If `DatabaseClusterBaseProps.domain` is specified, a role with the `AmazonRDSDirectoryServiceAccess` policy is automatically created.
     */
    readonly domainRole?: iam.IRole;
    /**
     * Whether to enable the Data API for the cluster.
     *
     * @default - false
     */
    readonly enableDataApi?: boolean;
    /**
     * Whether read replicas can forward write operations to the writer DB instance in the DB cluster.
     *
     * This setting can only be enabled for Aurora MySQL 3.04 or higher, and for Aurora PostgreSQL 16.4
     * or higher (for version 16), 15.8 or higher (for version 15), and 14.13 or higher (for version 14).
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-write-forwarding.html
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-postgresql-write-forwarding.html
     *
     * @default false
     */
    readonly enableLocalWriteForwarding?: boolean;
    /**
     * Whether to enable Performance Insights for the DB cluster.
     *
     * @default - false, unless `performanceInsightRetention` or `performanceInsightEncryptionKey` is set.
     */
    readonly enablePerformanceInsights?: boolean;
    /**
     * The amount of time, in days, to retain Performance Insights data.
     *
     * @default 7
     */
    readonly performanceInsightRetention?: PerformanceInsightRetention;
    /**
     * The AWS KMS key for encryption of Performance Insights data.
     *
     * @default - default master key
     */
    readonly performanceInsightEncryptionKey?: kms.IKey;
    /**
     * Specifies whether minor engine upgrades are applied automatically to the DB cluster during the maintenance window.
     *
     * @default true
     */
    readonly autoMinorVersionUpgrade?: boolean;
    /**
     * Specifies the scalability mode of the Aurora DB cluster.
     *
     * Set LIMITLESS if you want to use a limitless database; otherwise, set it to STANDARD.
     *
     * @default ClusterScailabilityType.STANDARD
     */
    readonly clusterScailabilityType?: ClusterScailabilityType;
}
/**
 * The storage type to be associated with the DB cluster.
 */
export declare enum DBClusterStorageType {
    /**
     * Storage type for Aurora DB standard clusters.
     */
    AURORA = "aurora",
    /**
     * Storage type for Aurora DB I/O-Optimized clusters.
     */
    AURORA_IOPT1 = "aurora-iopt1"
}
/**
 * The orchestration of updates of multiple instances
 */
export declare enum InstanceUpdateBehaviour {
    /**
     * In a bulk update, all instances of the cluster are updated at the same time.
     * This results in a faster update procedure.
     * During the update, however, all instances might be unavailable at the same time and thus a downtime might occur.
     */
    BULK = "BULK",
    /**
     * In a rolling update, one instance after another is updated.
     * This results in at most one instance being unavailable during the update.
     * If your cluster consists of more than 1 instance, the downtime periods are limited to the time a primary switch needs.
     */
    ROLLING = "ROLLING"
}
/**
 * The scalability mode of the Aurora DB cluster.
 */
export declare enum ClusterScailabilityType {
    /**
     * The cluster uses normal DB instance creation.
     */
    STANDARD = "standard",
    /**
     * The cluster operates as an Aurora Limitless Database,
     * allowing you to create a DB shard group for horizontal scaling (sharding) capabilities.
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless.html
     */
    LIMITLESS = "limitless"
}
/**
 * A new or imported clustered database.
 */
export declare abstract class DatabaseClusterBase extends Resource implements IDatabaseCluster {
    abstract readonly engine?: IClusterEngine;
    /**
     * Identifier of the cluster
     */
    abstract readonly clusterIdentifier: string;
    /**
     * The immutable identifier for the cluster; for example: cluster-ABCD1234EFGH5678IJKL90MNOP.
     *
     * This AWS Region-unique identifier is used in things like IAM authentication policies.
     */
    abstract readonly clusterResourceIdentifier: string;
    /**
     * Identifiers of the replicas
     */
    abstract readonly instanceIdentifiers: string[];
    /**
     * The endpoint to use for read/write operations
     */
    abstract readonly clusterEndpoint: Endpoint;
    /**
     * Endpoint to use for load-balanced read-only operations.
     */
    abstract readonly clusterReadEndpoint: Endpoint;
    /**
     * Endpoints which address each individual replica.
     */
    abstract readonly instanceEndpoints: Endpoint[];
    /**
     * Access to the network connections
     */
    abstract readonly connections: ec2.Connections;
    /**
     * The secret attached to this cluster
     */
    abstract readonly secret?: secretsmanager.ISecret;
    protected abstract enableDataApi?: boolean;
    /**
     * The ARN of the cluster
     */
    get clusterArn(): string;
    /**
     * Add a new db proxy to this cluster.
     */
    addProxy(id: string, options: DatabaseProxyOptions): DatabaseProxy;
    /**
     * Renders the secret attachment target specifications.
     */
    asSecretAttachmentTarget(): secretsmanager.SecretAttachmentTargetProps;
    grantConnect(grantee: iam.IGrantable, dbUser: string): iam.Grant;
    /**
     * Grant the given identity to access the Data API.
     */
    grantDataApiAccess(grantee: iam.IGrantable): iam.Grant;
}
/**
 * Abstract base for ``DatabaseCluster`` and ``DatabaseClusterFromSnapshot``
 */
declare abstract class DatabaseClusterNew extends DatabaseClusterBase {
    /**
     * The engine for this Cluster.
     * Never undefined.
     */
    readonly engine?: IClusterEngine;
    protected readonly newCfnProps: CfnDBClusterProps;
    protected readonly securityGroups: ec2.ISecurityGroup[];
    protected readonly subnetGroup: ISubnetGroup;
    private readonly domainId?;
    private readonly domainRole?;
    /**
     * Secret in SecretsManager to store the database cluster user credentials.
     */
    abstract readonly secret?: secretsmanager.ISecret;
    /**
     * The VPC network to place the cluster in.
     */
    readonly vpc: ec2.IVpc;
    /**
     * The cluster's subnets.
     */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /**
     * The log group is created when `cloudwatchLogsExports` is set.
     *
     * Each export value will create a separate log group.
     */
    readonly cloudwatchLogGroups: {
        [engine: string]: logs.ILogGroup;
    };
    /**
     * Application for single user rotation of the master password to this cluster.
     */
    readonly singleUserRotationApplication: secretsmanager.SecretRotationApplication;
    /**
     * Application for multi user rotation to this cluster.
     */
    readonly multiUserRotationApplication: secretsmanager.SecretRotationApplication;
    /**
     * Whether Performance Insights is enabled at cluster level.
     */
    readonly performanceInsightsEnabled: boolean;
    /**
     * The amount of time, in days, to retain Performance Insights data.
     */
    readonly performanceInsightRetention?: PerformanceInsightRetention;
    /**
     * The AWS KMS key for encryption of Performance Insights data.
     */
    readonly performanceInsightEncryptionKey?: kms.IKey;
    /**
     * The IAM role for the enhanced monitoring.
     */
    readonly monitoringRole?: iam.IRole;
    protected readonly serverlessV2MinCapacity: number;
    protected readonly serverlessV2MaxCapacity: number;
    protected hasServerlessInstance?: boolean;
    protected enableDataApi?: boolean;
    constructor(scope: Construct, id: string, props: DatabaseClusterBaseProps);
    /**
     * Create cluster instances
     *
     * @internal
     */
    protected _createInstances(props: DatabaseClusterProps): InstanceConfig;
    /**
     * Perform validations on the cluster instances
     */
    private validateClusterInstances;
    /**
     * Perform validations on the reader instance
     */
    private validateReaderInstance;
    /**
     * As a cluster-level metric, it represents the average of the ServerlessDatabaseCapacity
     * values of all the Aurora Serverless v2 DB instances in the cluster.
     */
    metricServerlessDatabaseCapacity(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    /**
     * This value is represented as a percentage. It's calculated as the value of the
     * ServerlessDatabaseCapacity metric divided by the maximum ACU value of the DB cluster.
     *
     * If this metric approaches a value of 100.0, the DB instance has scaled up as high as it can.
     * Consider increasing the maximum ACU setting for the cluster.
     */
    metricACUUtilization(props?: cloudwatch.MetricOptions): cloudwatch.Metric;
    private validateServerlessScalingConfig;
    /**
     * Adds the single user rotation of the master password to this cluster.
     * See [Single user rotation strategy](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets_strategies.html#rotating-secrets-one-user-one-password)
     */
    addRotationSingleUser(options?: RotationSingleUserOptions): secretsmanager.SecretRotation;
    /**
     * Adds the multi user rotation to this cluster.
     * See [Alternating users rotation strategy](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets_strategies.html#rotating-secrets-two-users)
     */
    addRotationMultiUser(id: string, options: RotationMultiUserOptions): secretsmanager.SecretRotation;
}
/**
 * Properties for a new database cluster
 */
export interface DatabaseClusterProps extends DatabaseClusterBaseProps {
    /**
     * Credentials for the administrative user
     *
     * @default - A username of 'admin' (or 'postgres' for PostgreSQL) and SecretsManager-generated password
     */
    readonly credentials?: Credentials;
}
/**
 * Create a clustered database with a given number of instances.
 *
 * @resource AWS::RDS::DBCluster
 */
export declare class DatabaseCluster extends DatabaseClusterNew {
    /**
     * Import an existing DatabaseCluster from properties
     */
    static fromDatabaseClusterAttributes(scope: Construct, id: string, attrs: DatabaseClusterAttributes): IDatabaseCluster;
    readonly clusterIdentifier: string;
    readonly clusterResourceIdentifier: string;
    readonly clusterEndpoint: Endpoint;
    readonly clusterReadEndpoint: Endpoint;
    readonly connections: ec2.Connections;
    readonly instanceIdentifiers: string[];
    readonly instanceEndpoints: Endpoint[];
    /**
     * The secret attached to this cluster
     */
    readonly secret?: secretsmanager.ISecret;
    constructor(scope: Construct, id: string, props: DatabaseClusterProps);
}
/**
 * Properties for ``DatabaseClusterFromSnapshot``
 */
export interface DatabaseClusterFromSnapshotProps extends DatabaseClusterBaseProps {
    /**
     * The identifier for the DB instance snapshot or DB cluster snapshot to restore from.
     * You can use either the name or the Amazon Resource Name (ARN) to specify a DB cluster snapshot.
     * However, you can use only the ARN to specify a DB instance snapshot.
     */
    readonly snapshotIdentifier: string;
    /**
     * Credentials for the administrative user
     *
     * Note - using this prop only works with `Credentials.fromPassword()` with the
     * username of the snapshot, `Credentials.fromUsername()` with the username and
     * password of the snapshot or `Credentials.fromSecret()` with a secret containing
     * the username and password of the snapshot.
     *
     * @default - A username of 'admin' (or 'postgres' for PostgreSQL) and SecretsManager-generated password
     * that **will not be applied** to the cluster, use `snapshotCredentials` for the correct behavior.
     *
     * @deprecated use `snapshotCredentials` which allows to generate a new password
     */
    readonly credentials?: Credentials;
    /**
     * Master user credentials.
     *
     * Note - It is not possible to change the master username for a snapshot;
     * however, it is possible to provide (or generate) a new password.
     *
     * @default - The existing username and password from the snapshot will be used.
     */
    readonly snapshotCredentials?: SnapshotCredentials;
}
/**
 * A database cluster restored from a snapshot.
 *
 * @resource AWS::RDS::DBCluster
 */
export declare class DatabaseClusterFromSnapshot extends DatabaseClusterNew {
    readonly clusterIdentifier: string;
    readonly clusterResourceIdentifier: string;
    readonly clusterEndpoint: Endpoint;
    readonly clusterReadEndpoint: Endpoint;
    readonly connections: ec2.Connections;
    readonly instanceIdentifiers: string[];
    readonly instanceEndpoints: Endpoint[];
    /**
     * The secret attached to this cluster
     */
    readonly secret?: secretsmanager.ISecret;
    constructor(scope: Construct, id: string, props: DatabaseClusterFromSnapshotProps);
}
/** Output from the createInstances method; used to set instance identifiers and endpoints */
interface InstanceConfig {
    readonly instanceIdentifiers: string[];
    readonly instanceEndpoints: Endpoint[];
}
export {};
