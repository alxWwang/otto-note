import { Construct } from 'constructs';
import { IVpc } from '../../../aws-ec2';
import { AwsLogDriver, BaseService, CloudMapOptions, Cluster, ContainerDefinition, ContainerImage, ICluster, LogDriver, PropagatedTagSource, Secret } from '../../../aws-ecs';
import { NetworkListener, NetworkLoadBalancer, NetworkTargetGroup } from '../../../aws-elasticloadbalancingv2';
import { IRole } from '../../../aws-iam';
import { IHostedZone } from '../../../aws-route53';
import { Duration } from '../../../core';
/**
 * The properties for the base NetworkMultipleTargetGroupsEc2Service or NetworkMultipleTargetGroupsFargateService service.
 */
export interface NetworkMultipleTargetGroupsServiceBaseProps {
    /**
     * The name of the cluster that hosts the service.
     *
     * If a cluster is specified, the vpc construct should be omitted. Alternatively, you can omit both cluster and vpc.
     * @default - create a new cluster; if both cluster and vpc are omitted, a new VPC will be created for you.
     */
    readonly cluster?: ICluster;
    /**
     * The VPC where the container instances will be launched or the elastic network interfaces (ENIs) will be deployed.
     *
     * If a vpc is specified, the cluster construct should be omitted. Alternatively, you can omit both vpc and cluster.
     * @default - uses the VPC defined in the cluster or creates a new VPC.
     */
    readonly vpc?: IVpc;
    /**
     * The properties required to create a new task definition. Only one of TaskDefinition or TaskImageOptions must be specified.
     *
     * @default - none
     */
    readonly taskImageOptions?: NetworkLoadBalancedTaskImageProps;
    /**
     * The desired number of instantiations of the task definition to keep running on the service.
     * The minimum value is 1
     *
     * @default - The default is 1 for all new services and uses the existing service's desired count
     * when updating an existing service.
     */
    readonly desiredCount?: number;
    /**
     * Name of the service.
     *
     * @default - CloudFormation-generated name.
     */
    readonly serviceName?: string;
    /**
     * The period of time, in seconds, that the Amazon ECS service scheduler ignores unhealthy
     * Elastic Load Balancing target health checks after a task has first started.
     *
     * @default - defaults to 60 seconds if at least one load balancer is in-use and it is not already set
     */
    readonly healthCheckGracePeriod?: Duration;
    /**
     * The network load balancer that will serve traffic to the service.
     *
     * @default - a new load balancer with a listener will be created.
     */
    readonly loadBalancers?: NetworkLoadBalancerProps[];
    /**
     * Specifies whether to propagate the tags from the task definition or the service to the tasks in the service.
     * Tags can only be propagated to the tasks within the service during service creation.
     *
     * @default - none
     */
    readonly propagateTags?: PropagatedTagSource;
    /**
     * Specifies whether to enable Amazon ECS managed tags for the tasks within the service. For more information, see
     * [Tagging Your Amazon ECS Resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html)
     *
     * @default false
     */
    readonly enableECSManagedTags?: boolean;
    /**
     * The options for configuring an Amazon ECS service to use service discovery.
     *
     * @default - AWS Cloud Map service discovery is not enabled.
     */
    readonly cloudMapOptions?: CloudMapOptions;
    /**
     * Properties to specify NLB target groups.
     *
     * @default - default portMapping registered as target group and attached to the first defined listener
     */
    readonly targetGroups?: NetworkTargetProps[];
    /**
     * Whether ECS Exec should be enabled
     *
     * @default - false
     */
    readonly enableExecuteCommand?: boolean;
}
/**
 * Options for configuring a new container.
 */
export interface NetworkLoadBalancedTaskImageProps {
    /**
     * The image used to start a container. Image or taskDefinition must be specified, but not both.
     *
     * @default - none
     */
    readonly image: ContainerImage;
    /**
     * The environment variables to pass to the container.
     *
     * @default - No environment variables.
     */
    readonly environment?: {
        [key: string]: string;
    };
    /**
     * The secrets to expose to the container as an environment variable.
     *
     * @default - No secret environment variables.
     */
    readonly secrets?: {
        [key: string]: Secret;
    };
    /**
     * Flag to indicate whether to enable logging.
     *
     * @default true
     */
    readonly enableLogging?: boolean;
    /**
     * The log driver to use.
     *
     * @default - AwsLogDriver if enableLogging is true
     */
    readonly logDriver?: LogDriver;
    /**
     * The name of the task execution IAM role that grants the Amazon ECS container agent permission to call AWS APIs on your behalf.
     *
     * @default - No value
     */
    readonly executionRole?: IRole;
    /**
     * The name of the task IAM role that grants containers in the task permission to call AWS APIs on your behalf.
     *
     * @default - A task role is automatically created for you.
     */
    readonly taskRole?: IRole;
    /**
     * The container name value to be specified in the task definition.
     *
     * @default - none
     */
    readonly containerName?: string;
    /**
     * A list of port numbers on the container that is bound to the user-specified or automatically assigned host port.
     *
     * If you are using containers in a task with the awsvpc or host network mode, exposed ports should be specified using containerPort.
     * If you are using containers in a task with the bridge network mode and you specify a container port and not a host port,
     * your container automatically receives a host port in the ephemeral port range.
     *
     * Port mappings that are automatically assigned in this way do not count toward the 100 reserved ports limit of a container instance.
     *
     * For more information, see
     * [hostPort](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html#ECS-Type-PortMapping-hostPort).
     *
     * @default - [80]
     */
    readonly containerPorts?: number[];
    /**
     * The name of a family that this task definition is registered to. A family groups multiple versions of a task definition.
     *
     * @default - Automatically generated name.
     */
    readonly family?: string;
    /**
     * A key/value map of labels to add to the container.
     *
     * @default - No labels.
     */
    readonly dockerLabels?: {
        [key: string]: string;
    };
}
/**
 * Properties to define an network load balancer.
 */
export interface NetworkLoadBalancerProps {
    /**
     * Name of the load balancer.
     */
    readonly name: string;
    /**
     * Listeners (at least one listener) attached to this load balancer.
     *
     * @default - none
     */
    readonly listeners: NetworkListenerProps[];
    /**
     * Determines whether the Load Balancer will be internet-facing.
     *
     * @default true
     */
    readonly publicLoadBalancer?: boolean;
    /**
     * The domain name for the service, e.g. "api.example.com."
     *
     * @default - No domain name.
     */
    readonly domainName?: string;
    /**
     * The Route53 hosted zone for the domain, e.g. "example.com."
     *
     * @default - No Route53 hosted domain zone.
     */
    readonly domainZone?: IHostedZone;
}
/**
 * Properties to define an network listener.
 */
export interface NetworkListenerProps {
    /**
     * Name of the listener.
     */
    readonly name: string;
    /**
     * The port on which the listener listens for requests.
     *
     * @default 80
     */
    readonly port?: number;
}
/**
 * Properties to define a network load balancer target group.
 */
export interface NetworkTargetProps {
    /**
     * The port number of the container. Only applicable when using application/network load balancers.
     */
    readonly containerPort: number;
    /**
     * Name of the listener the target group attached to.
     *
     * @default - default listener (first added listener)
     */
    readonly listener?: string;
}
/**
 * The base class for NetworkMultipleTargetGroupsEc2Service and NetworkMultipleTargetGroupsFargateService classes.
 */
export declare abstract class NetworkMultipleTargetGroupsServiceBase extends Construct {
    /**
     * The desired number of instantiations of the task definition to keep running on the service.
     * The default is 1 for all new services and uses the existing services desired count
     * when updating an existing service, if one is not provided.
     */
    readonly internalDesiredCount?: number;
    /**
     * The Network Load Balancer for the service.
     * @deprecated - Use `loadBalancers` instead.
     */
    readonly loadBalancer: NetworkLoadBalancer;
    /**
     * The listener for the service.
     * @deprecated - Use `listeners` instead.
     */
    readonly listener: NetworkListener;
    /**
     * The cluster that hosts the service.
     */
    readonly cluster: ICluster;
    protected logDriver?: LogDriver;
    /**
     * The listeners of the service.
     */
    readonly listeners: NetworkListener[];
    /**
     * The target groups of the service.
     */
    readonly targetGroups: NetworkTargetGroup[];
    /**
     * The load balancers of the service.
     */
    readonly loadBalancers: NetworkLoadBalancer[];
    /**
     * Constructs a new instance of the NetworkMultipleTargetGroupsServiceBase class.
     */
    constructor(scope: Construct, id: string, props?: NetworkMultipleTargetGroupsServiceBaseProps);
    /**
     * Returns the default cluster.
     */
    protected getDefaultCluster(scope: Construct, vpc?: IVpc): Cluster;
    protected createAWSLogDriver(prefix: string): AwsLogDriver;
    protected findListener(name?: string): NetworkListener;
    protected registerECSTargets(service: BaseService, container: ContainerDefinition, targets: NetworkTargetProps[]): NetworkTargetGroup;
    protected addPortMappingForTargets(container: ContainerDefinition, targets: NetworkTargetProps[]): void;
    /**
     * Create log driver if logging is enabled.
     */
    private createLogDriver;
    private validateInput;
    private createLoadBalancer;
    private createListener;
    private createDomainName;
}
