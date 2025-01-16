import { type ChangeHotswapResult, type HotswappableChangeCandidate } from './common';
import { type EvaluateCloudFormationTemplate } from '../evaluate-cloudformation-template';
export declare function isHotswappableLambdaFunctionChange(logicalId: string, change: HotswappableChangeCandidate, evaluateCfnTemplate: EvaluateCloudFormationTemplate): Promise<ChangeHotswapResult>;
