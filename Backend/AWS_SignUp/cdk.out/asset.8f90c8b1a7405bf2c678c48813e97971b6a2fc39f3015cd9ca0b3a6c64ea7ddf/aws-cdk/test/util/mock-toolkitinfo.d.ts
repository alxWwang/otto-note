import { ToolkitInfo } from '../../lib/api';
import { CloudFormationStack } from '../../lib/api/util/cloudformation';
export interface MockToolkitInfoProps {
    readonly bucketName?: string;
    readonly bucketUrl?: string;
    readonly repositoryName?: string;
    readonly version?: number;
    readonly bootstrapStack?: CloudFormationStack;
}
export declare class MockToolkitInfo extends ToolkitInfo {
    static setup(toolkitInfo?: ToolkitInfo): {
        toolkitInfo: ToolkitInfo;
        dispose: () => void;
    };
    readonly found = true;
    readonly bucketUrl: string;
    readonly bucketName: string;
    readonly repositoryName: string;
    readonly version: number;
    readonly variant: string;
    readonly stackName = "MockBootstrapStack";
    private readonly _bootstrapStack?;
    constructor(props?: MockToolkitInfoProps);
    get bootstrapStack(): CloudFormationStack;
}
