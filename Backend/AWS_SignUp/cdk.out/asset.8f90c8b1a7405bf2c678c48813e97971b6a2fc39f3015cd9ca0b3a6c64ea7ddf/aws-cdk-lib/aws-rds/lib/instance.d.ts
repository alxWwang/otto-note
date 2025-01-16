import { Construct } from 'constructs';
import { CaCertificate } from './ca-certificate';
import { Endpoint } from './endpoint';
import { IInstanceEngine } from './instance-engine';
import { IOptionGroup } from './option-group';
import { IParameterGroup } from './parameter-group';
import { Credentials, PerformanceInsightRetention, RotationMultiUserOptions, RotationSingleUserOptions, SnapshotCredentials } from './props';
import { DatabaseProxy, DatabaseProxyOptions } from './proxy';
import { CfnDBInstanceProps } from './rds.generated';
import { ISubnetGroup } from './subnet-group';
import * as ec2 from '../../aws-ec2';
import * as events from '../../aws-events';
import * as iam from '../../aws-iam';
import * as kms from '../../aws-kms';
import * as logs from '../../aws-logs';
import * as s3 from '../../aws-s3';
import * as secretsmanager from '../../aws-secretsmanager';
import { Duration, IResource, RemovalPolicy, Resource } from '../../core';
/**
 * A database instance
 */
export interface IDatabaseInstance extends IResource, ec2.IConnectable, secretsmanager.ISecretAttachmentTarget {
    /**
     * The instance identifier.
     */
    readonly instanceIdentifier: string;
    /**
     * The instance arn.
     */
    readonly instanceArn: string;
    /**
     * The instance endpoint address.
     *
     * @attribute EndpointAddress
     */
    readonly dbInstanceEndpointAddress: string;
    /**
     * The instance endpoint port.
     *
     * @attribute EndpointPort
     */
    readonly dbInstanceEndpointPort: string;
    /**
     * The AWS Region-unique, immutable identifier for the DB instance.
     * This identifier is found in AWS CloudTrail log entries whenever the AWS KMS key for the DB instance is accessed.
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html#aws-resource-rds-dbinstance-return-values
     */
    readonly instanceResourceId?: string;
    /**
     * The instance endpoint.
     */
    readonly instanceEndpoint: Endpoint;
    /**
     * The engine of this database Instance.
     * May be not known for imported Instances if it wasn't provided explicitly,
     * or for read replicas.
     */
    readonly engine?: IInstanceEngine;
    /**
     * Add a new db proxy to this instance.
     */
    addProxy(id: string, options: DatabaseProxyOptions): DatabaseProxy;
    /**
     * Grant the given identity connection access to the database.
     *
     * @param grantee the Principal to grant the permissions to
     * @param dbUser the name of the database user to allow connecting as to the db instance
     */
    grantConnect(grantee: iam.IGrantable, dbUser?: string): iam.Grant;
    /**
     * Defines a CloudWatch event rule which triggers for instance events. Use
     * `rule.addEventPattern(pattern)` to specify a filter.
     */
    onEvent(id: string, options?: events.OnEventOptions): events.Rule;
}
/**
 * Properties that describe an existing instance
 */
export interface DatabaseInstanceAttributes {
    /**
     * The instance identifier.
     */
    readonly instanceIdentifier: string;
    /**
     * The endpoint address.
     */
    readonly instanceEndpointAddress: string;
    /**
     * The database port.
     */
    readonly port: number;
    /**
     * The AWS Region-unique, immutable identifier for the DB instance.
     * This identifier is found in AWS CloudTrail log entries whenever the AWS KMS key for the DB instance is accessed.
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html#aws-resource-rds-dbinstance-return-values
     */
    readonly instanceResourceId?: string;
    /**
     * The security groups of the instance.
     */
    readonly securityGroups: ec2.ISecurityGroup[];
    /**
     * The engine of the existing database Instance.
     *
     * @default - the imported Instance's engine is unknown
     */
    readonly engine?: IInstanceEngine;
}
/**
 * A new or imported database instance.
 */
export declare abstract class DatabaseInstanceBase extends Resource implements IDatabaseInstance {
    /**
     * Import an existing database instance.
     */
    static fromDatabaseInstanceAttributes(scope: Construct, id: string, attrs: DatabaseInstanceAttributes): IDatabaseInstance;
    abstract readonly instanceIdentifier: string;
    abstract readonly dbInstanceEndpointAddress: string;
    abstract readonly dbInstanceEndpointPort: string;
    abstract readonly instanceResourceId?: string;
    abstract readonly instanceEndpoint: Endpoint;
    abstract readonly engine?: IInstanceEngine;
    protected abstract enableIamAuthentication?: boolean;
    /**
     * Access to network connections.
     */
    abstract readonly connections: ec2.Connections;
    /**
     * Add a new db proxy to this instance.
     */
    addProxy(id: string, options: DatabaseProxyOptions): DatabaseProxy;
    grantConnect(grantee: iam.IGrantable, dbUser?: string): iam.Grant;
    /**
     * Defines a CloudWatch event rule which triggers for instance events. Use
     * `rule.addEventPattern(pattern)` to specify a filter.
     */
    onEvent(id: string, options?: events.OnEventOptions): events.Rule;
    /**
     * The instance arn.
     */
    get instanceArn(): string;
    /**
     * Renders the secret attachment target specifications.
     */
    asSecretAttachmentTarget(): secretsmanager.SecretAttachmentTargetProps;
}
/**
 * The license model.
 */
export declare enum LicenseModel {
    /**
     * License included.
     */
    LICENSE_INCLUDED = "license-included",
    /**
     * Bring your own licencse.
     */
    BRING_YOUR_OWN_LICENSE = "bring-your-own-license",
    /**
     * General public license.
     */
    GENERAL_PUBLIC_LICENSE = "general-public-license"
}
/**
 * The processor features.
 */
export interface ProcessorFeatures {
    /**
     * The number of CPU core.
     *
     * @default - the default number of CPU cores for the chosen instance class.
     */
    readonly coreCount?: number;
    /**
     * The number of threads per core.
     *
     * @default - the default number of threads per core for the chosen instance class.
     */
    readonly threadsPerCore?: number;
}
/**
 * The type of storage.
 *
 * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
 */
export declare enum StorageType {
    /**
     * Standard.
     *
     * Amazon RDS supports magnetic storage for backward compatibility. It is recommended to use
     * General Purpose SSD or Provisioned IOPS SSD for any new storage needs.
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#CHAP_Storage.Magnetic
     */
    STANDARD = "standard",
    /**
     * General purpose SSD (gp2).
     *
     * Baseline performance determined by volume size
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#Concepts.Storage.GeneralSSD
     */
    GP2 = "gp2",
    /**
     * General purpose SSD (gp3).
     *
     * Performance scales independently from storage
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#Concepts.Storage.GeneralSSD
     */
    GP3 = "gp3",
    /**
     * Provisioned IOPS SSD (io1).
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#USER_PIOPS
     */
    IO1 = "io1",
    /**
     * Provisioned IOPS SSD (io2).
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#USER_PIOPS
     */
    IO2 = "io2"
}
/**
 * The network type of the DB instance.
 */
export declare enum NetworkType {
    /**
     * IPv4 only network type.
     */
    IPV4 = "IPV4",
    /**
     * Dual-stack network type.
     */
    DUAL = "DUAL"
}
/**
 * Construction properties for a DatabaseInstanceNew
 */
export interface DatabaseInstanceNewProps {
    /**
     * Specifies if the database instance is a multiple Availability Zone deployment.
     *
     * @default false
     */
    readonly multiAz?: boolean;
    /**
     * The name of the Availability Zone where the DB instance will be located.
     *
     * @default - no preference
     */
    readonly availabilityZone?: string;
    /**
     * The storage type. Storage types supported are gp2, io1, standard.
     *
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#Concepts.Storage.GeneralSSD
     *
     * @default GP2
     */
    readonly storageType?: StorageType;
    /**
     * The storage throughput, specified in mebibytes per second (MiBps).
     *
     * Only applicable for GP3.
     *
     * @see https://docs.aws.amazon.com//AmazonRDS/latest/UserGuide/CHAP_Storage.html#gp3-storage
     *
     * @default - 125 MiBps if allocated storage is less than 400 GiB for MariaDB, MySQL, and PostgreSQL,
     * less than 200 GiB for Oracle and less than 20 GiB for SQL Server. 500 MiBps otherwise (except for
     * SQL Server where the default is always 125 MiBps).
     */
    readonly storageThroughput?: number;
    /**
     * The number of I/O operations per second (IOPS) that the database provisions.
     * The value must be equal to or greater than 1000.
     *
     * @default - no provisioned iops if storage type is not specified. For GP3: 3,000 IOPS if allocated
     * storage is less than 400 GiB for MariaDB, MySQL, and PostgreSQL, less than 200 GiB for Oracle and
     * less than 20 GiB for SQL Server. 12,000 IOPS otherwise (except for SQL Server where the default is
     * always 3,000 IOPS).
     */
    readonly iops?: number;
    /**
     * The number of CPU cores and the number of threads per core.
     *
     * @default - the default number of CPU cores and threads per core for the
     * chosen instance class.
     *
     * See https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html#USER_ConfigureProcessor
     */
    readonly processorFeatures?: ProcessorFeatures;
    /**
     * A name for the DB instance. If you specify a name, AWS CloudFormation
     * converts it to lowercase.
     *
     * @default - a CloudFormation generated name
     */
    readonly instanceIdentifier?: string;
    /**
     * The VPC network where the DB subnet group should be created.
     */
    readonly vpc: ec2.IVpc;
    /**
     * The type of subnets to add to the created DB subnet group.
     *
     * @default - private subnets
     */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /**
     * The security groups to assign to the DB instance.
     *
     * @default - a new security group is created
     */
    readonly securityGroups?: ec2.ISecurityGroup[];
    /**
     * The port for the instance.
     *
     * @default - the default port for the chosen engine.
     */
    readonly port?: number;
    /**
     * The DB parameter group to associate with the instance.
     *
     * @default - no parameter group
     */
    readonly parameterGroup?: IParameterGroup;
    /**
     * The option group to associate with the instance.
     *
     * @default - no option group
     */
    readonly optionGroup?: IOptionGroup;
    /**
     * Whether to enable mapping of AWS Identity and Access Management (IAM) accounts
     * to database accounts.
     *
     * @default false
     */
    readonly iamAuthentication?: boolean;
    /**
     * The number of days during which automatic DB snapshots are retained.
     * Set to zero to disable backups.
     * When creating a read replica, you must enable automatic backups on the source
     * database instance by setting the backup retention to a value other than zero.
     *
     * @default - Duration.days(1) for source instances, disabled for read replicas
     */
    readonly backupRetention?: Duration;
    /**
     * The daily time range during which automated backups are performed.
     *
     * Constraints:
     * - Must be in the format `hh24:mi-hh24:mi`.
     * - Must be in Universal Coordinated Time (UTC).
     * - Must not conflict with the preferred maintenance window.
     * - Must be at least 30 minutes.
     *
     * @default - a 30-minute window selected at random from an 8-hour block of
     * time for each AWS Region. To see the time blocks available, see
     * https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html#USER_WorkingWithAutomatedBackups.BackupWindow
     */
    readonly preferredBackupWindow?: string;
    /**
     * Indicates whether to copy all of the user-defined tags from the
     * DB instance to snapshots of the DB instance.
     *
     * @default true
     */
    readonly copyTagsToSnapshot?: boolean;
    /**
     * Indicates whether automated backups should be deleted or retained when
     * you delete a DB instance.
     *
     * @default true
     */
    readonly deleteAutomatedBackups?: boolean;
    /**
     * The interval, in seconds, between points when Amazon RDS collects enhanced
     * monitoring metrics for the DB instance.
     *
     * @default - no enhanced monitoring
     */
    readonly monitoringInterval?: Duration;
    /**
     * Role that will be used to manage DB instance monitoring.
     *
     * @default - A role is automatically created for you
     */
    readonly monitoringRole?: iam.IRole;
    /**
     * Whether to enable Performance Insights for the DB instance.
     *
     * @default - false, unless ``performanceInsightRetention`` or ``performanceInsightEncryptionKey`` is set.
     */
    readonly enablePerformanceInsights?: boolean;
    /**
     * The amount of time, in days, to retain Performance Insights data.
     *
     * @default 7 this is the free tier
     */
    readonly performanceInsightRetention?: PerformanceInsightRetention;
    /**
     * The AWS KMS key for encryption of Performance Insights data.
     *
     * @default - default master key
     */
    readonly performanceInsightEncryptionKey?: kms.IKey;
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
    readonly cloudwatchLogsRetentionRole?: iam.IRole;
    /**
     * Indicates that minor engine upgrades are applied automatically to the
     * DB instance during the maintenance window.
     *
     * @default true
     */
    readonly autoMinorVersionUpgrade?: boolean;
    /**
     * The weekly time range (in UTC) during which system maintenance can occur.
     *
     * Format: `ddd:hh24:mi-ddd:hh24:mi`
     * Constraint: Minimum 30-minute window
     *
     * @default - a 30-minute window selected at random from an 8-hour block of
     * time for each AWS Region, occurring on a random day of the week. To see
     * the time blocks available, see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Maintenance.html#Concepts.DBMaintenance
     */
    readonly preferredMaintenanceWindow?: string;
    /**
     * Indicates whether the DB instance should have deletion protection enabled.
     *
     * @default - true if ``removalPolicy`` is RETAIN, false otherwise
     */
    readonly deletionProtection?: boolean;
    /**
     * The CloudFormation policy to apply when the instance is removed from the
     * stack or replaced during an update.
     *
     * @default - RemovalPolicy.SNAPSHOT (remove the resource, but retain a snapshot of the data)
     */
    readonly removalPolicy?: RemovalPolicy;
    /**
     * Upper limit to which RDS can scale the storage in GiB(Gibibyte).
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.StorageTypes.html#USER_PIOPS.Autoscaling
     * @default - No autoscaling of RDS instance
     */
    readonly maxAllocatedStorage?: number;
    /**
     * The Active Directory directory ID to create the DB instance in.
     *
     * @default - Do not join domain
     */
    readonly domain?: string;
    /**
     * The IAM role to be used when making API calls to the Directory Service. The role needs the AWS-managed policy
     * AmazonRDSDirectoryServiceAccess or equivalent.
     *
     * @default - The role will be created for you if `DatabaseInstanceNewProps#domain` is specified
     */
    readonly domainRole?: iam.IRole;
    /**
     * Existing subnet group for the instance.
     *
     * @default - a new subnet group will be created.
     */
    readonly subnetGroup?: ISubnetGroup;
    /**
     * Role that will be associated with this DB instance to enable S3 import.
     * This feature is only supported by the Microsoft SQL Server, Oracle, and PostgreSQL engines.
     *
     * This property must not be used if `s3ImportBuckets` is used.
     *
     * For Microsoft SQL Server:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.html
     * For Oracle:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.html
     * For PostgreSQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.html
     *
     * @default - New role is created if `s3ImportBuckets` is set, no role is defined otherwise
     */
    readonly s3ImportRole?: iam.IRole;
    /**
     * S3 buckets that you want to load data from.
     * This feature is only supported by the Microsoft SQL Server, Oracle, and PostgreSQL engines.
     *
     * This property must not be used if `s3ImportRole` is used.
     *
     * For Microsoft SQL Server:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.html
     * For Oracle:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.html
     * For PostgreSQL:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.html
     *
     * @default - None
     */
    readonly s3ImportBuckets?: s3.IBucket[];
    /**
     * Role that will be associated with this DB instance to enable S3 export.
     *
     * This property must not be used if `s3ExportBuckets` is used.
     *
     * For Microsoft SQL Server:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.html
     * For Oracle:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.html
     *
     * @default - New role is created if `s3ExportBuckets` is set, no role is defined otherwise
     */
    readonly s3ExportRole?: iam.IRole;
    /**
     * S3 buckets that you want to load data into.
     *
     * This property must not be used if `s3ExportRole` is used.
     *
     * For Microsoft SQL Server:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.html
     * For Oracle:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.html
     *
     * @default - None
     */
    readonly s3ExportBuckets?: s3.IBucket[];
    /**
     * Indicates whether the DB instance is an internet-facing instance. If not specified,
     * the instance's vpcSubnets will be used to determine if the instance is internet-facing
     * or not.
     *
     * @default - `true` if the instance's `vpcSubnets` is `subnetType: SubnetType.PUBLIC`, `false` otherwise
     */
    readonly publiclyAccessible?: boolean;
    /**
     * The network type of the DB instance.
     *
     * @default - IPV4
     */
    readonly networkType?: NetworkType;
    /**
     * The identifier of the CA certificate for this DB instance.
     *
     * Specifying or updating this property triggers a reboot.
     *
     * For RDS DB engines:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL-certificate-rotation.html
     * For Aurora DB engines:
     * @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.SSL-certificate-rotation.html
     *
     * @default - RDS will choose a certificate authority
     */
    readonly caCertificate?: CaCertificate;
}
/**
 * A new database instance.
 */
declare abstract class DatabaseInstanceNew extends DatabaseInstanceBase implements IDatabaseInstance {
    /**
     * The VPC where this database instance is deployed.
     */
    readonly vpc: ec2.IVpc;
    readonly connections: ec2.Connections;
    /**
     * The log group is created when `cloudwatchLogsExports` is set.
     *
     * Each export value will create a separate log group.
     */
    readonly cloudwatchLogGroups: {
        [engine: string]: logs.ILogGroup;
    };
    protected abstract readonly instanceType: ec2.InstanceType;
    protected readonly vpcPlacement?: ec2.SubnetSelection;
    protected readonly newCfnProps: CfnDBInstanceProps;
    private readonly cloudwatchLogsExports?;
    private readonly cloudwatchLogsRetention?;
    private readonly cloudwatchLogsRetentionRole?;
    private readonly domainId?;
    private readonly domainRole?;
    protected enableIamAuthentication?: boolean;
    constructor(scope: Construct, id: string, props: DatabaseInstanceNewProps);
    protected setLogRetention(): void;
}
/**
 * Construction properties for a DatabaseInstanceSource
 */
export interface DatabaseInstanceSourceProps extends DatabaseInstanceNewProps {
    /**
     * The database engine.
     */
    readonly engine: IInstanceEngine;
    /**
     * The name of the compute and memory capacity for the instance.
     *
     * @default - m5.large (or, more specifically, db.m5.large)
     */
    readonly instanceType?: ec2.InstanceType;
    /**
     * The license model.
     *
     * @default - RDS default license model
     */
    readonly licenseModel?: LicenseModel;
    /**
     * Whether to allow major version upgrades.
     *
     * @default false
     */
    readonly allowMajorVersionUpgrade?: boolean;
    /**
     * The time zone of the instance. This is currently supported only by Microsoft Sql Server.
     *
     * @default - RDS default timezone
     */
    readonly timezone?: string;
    /**
     * The allocated storage size, specified in gibibytes (GiB).
     *
     * @default 100
     */
    readonly allocatedStorage?: number;
    /**
     * The name of the database.
     *
     * @default - no name
     */
    readonly databaseName?: string;
    /**
     * The parameters in the DBParameterGroup to create automatically
     *
     * You can only specify parameterGroup or parameters but not both.
     * You need to use a versioned engine to auto-generate a DBParameterGroup.
     *
     * @default - None
     */
    readonly parameters?: {
        [key: string]: string;
    };
}
/**
 * A new source database instance (not a read replica)
 */
declare abstract class DatabaseInstanceSource extends DatabaseInstanceNew implements IDatabaseInstance {
    readonly engine?: IInstanceEngine;
    /**
     * The AWS Secrets Manager secret attached to the instance.
     */
    abstract readonly secret?: secretsmanager.ISecret;
    protected readonly sourceCfnProps: CfnDBInstanceProps;
    protected readonly instanceType: ec2.InstanceType;
    private readonly singleUserRotationApplication;
    private readonly multiUserRotationApplication;
    constructor(scope: Construct, id: string, props: DatabaseInstanceSourceProps);
    /**
     * Adds the single user rotation of the master password to this instance.
     *
     * @param options the options for the rotation,
     *                if you want to override the defaults
     */
    addRotationSingleUser(options?: RotationSingleUserOptions): secretsmanager.SecretRotation;
    /**
     * Adds the multi user rotation to this instance.
     */
    addRotationMultiUser(id: string, options: RotationMultiUserOptions): secretsmanager.SecretRotation;
    /**
     * Grant the given identity connection access to the database.
     *
     * @param grantee the Principal to grant the permissions to
     * @param dbUser the name of the database user to allow connecting as to the db instance,
     * or the default database user, obtained from the Secret, if not specified
     */
    grantConnect(grantee: iam.IGrantable, dbUser?: string): iam.Grant;
}
/**
 * Construction properties for a DatabaseInstance.
 */
export interface DatabaseInstanceProps extends DatabaseInstanceSourceProps {
    /**
     * Credentials for the administrative user
     *
     * @default - A username of 'admin' (or 'postgres' for PostgreSQL) and SecretsManager-generated password
     */
    readonly credentials?: Credentials;
    /**
     * For supported engines, specifies the character set to associate with the
     * DB instance.
     *
     * @default - RDS default character set name
     */
    readonly characterSetName?: string;
    /**
     * Indicates whether the DB instance is encrypted.
     *
     * @default - true if storageEncryptionKey has been provided, false otherwise
     */
    readonly storageEncrypted?: boolean;
    /**
     * The KMS key that's used to encrypt the DB instance.
     *
     * @default - default master key if storageEncrypted is true, no key otherwise
     */
    readonly storageEncryptionKey?: kms.IKey;
}
/**
 * A database instance
 *
 * @resource AWS::RDS::DBInstance
 */
export declare class DatabaseInstance extends DatabaseInstanceSource implements IDatabaseInstance {
    readonly instanceIdentifier: string;
    readonly dbInstanceEndpointAddress: string;
    readonly dbInstanceEndpointPort: string;
    readonly instanceResourceId?: string;
    readonly instanceEndpoint: Endpoint;
    readonly secret?: secretsmanager.ISecret;
    constructor(scope: Construct, id: string, props: DatabaseInstanceProps);
}
/**
 * Construction properties for a DatabaseInstanceFromSnapshot.
 */
export interface DatabaseInstanceFromSnapshotProps extends DatabaseInstanceSourceProps {
    /**
     * The name or Amazon Resource Name (ARN) of the DB snapshot that's used to
     * restore the DB instance. If you're restoring from a shared manual DB
     * snapshot, you must specify the ARN of the snapshot.
     */
    readonly snapshotIdentifier: string;
    /**
     * Master user credentials.
     *
     * Note - It is not possible to change the master username for a snapshot;
     * however, it is possible to provide (or generate) a new password.
     *
     * @default - The existing username and password from the snapshot will be used.
     */
    readonly credentials?: SnapshotCredentials;
}
/**
 * A database instance restored from a snapshot.
 *
 * @resource AWS::RDS::DBInstance
 */
export declare class DatabaseInstanceFromSnapshot extends DatabaseInstanceSource implements IDatabaseInstance {
    readonly instanceIdentifier: string;
    readonly dbInstanceEndpointAddress: string;
    readonly dbInstanceEndpointPort: string;
    readonly instanceResourceId?: string;
    readonly instanceEndpoint: Endpoint;
    readonly secret?: secretsmanager.ISecret;
    constructor(scope: Construct, id: string, props: DatabaseInstanceFromSnapshotProps);
}
/**
 * Construction properties for a DatabaseInstanceReadReplica.
 */
export interface DatabaseInstanceReadReplicaProps extends DatabaseInstanceNewProps {
    /**
     * The name of the compute and memory capacity classes.
     */
    readonly instanceType: ec2.InstanceType;
    /**
     * The source database instance.
     *
     * Each DB instance can have a limited number of read replicas. For more
     * information, see https://docs.aws.amazon.com/AmazonRDS/latest/DeveloperGuide/USER_ReadRepl.html.
     *
     */
    readonly sourceDatabaseInstance: IDatabaseInstance;
    /**
     * Indicates whether the DB instance is encrypted.
     *
     * @default - true if storageEncryptionKey has been provided, false otherwise
     */
    readonly storageEncrypted?: boolean;
    /**
     * The KMS key that's used to encrypt the DB instance.
     *
     * @default - default master key if storageEncrypted is true, no key otherwise
     */
    readonly storageEncryptionKey?: kms.IKey;
    /**
     * The allocated storage size, specified in gibibytes (GiB).
     *
     * @default - The replica will inherit the allocated storage of the source database instance
     */
    readonly allocatedStorage?: number;
}
/**
 * A read replica database instance.
 *
 * @resource AWS::RDS::DBInstance
 */
export declare class DatabaseInstanceReadReplica extends DatabaseInstanceNew implements IDatabaseInstance {
    readonly instanceIdentifier: string;
    readonly dbInstanceEndpointAddress: string;
    readonly dbInstanceEndpointPort: string;
    /**
     * The AWS Region-unique, immutable identifier for the DB instance.
     * This identifier is found in AWS CloudTrail log entries whenever the AWS KMS key for the DB instance is accessed.
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html#aws-resource-rds-dbinstance-return-values
     */
    readonly instanceResourceId?: string;
    readonly instanceEndpoint: Endpoint;
    readonly engine?: IInstanceEngine;
    protected readonly instanceType: ec2.InstanceType;
    constructor(scope: Construct, id: string, props: DatabaseInstanceReadReplicaProps);
}
export {};
