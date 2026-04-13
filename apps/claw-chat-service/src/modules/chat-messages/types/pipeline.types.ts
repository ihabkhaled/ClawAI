export type PipelineStage = {
  name: string;
  instruction: string;
  model: string;
};

export type PipelineStageResult = {
  stageName: string;
  model: string;
  output: string;
  latencyMs: number;
};

export type PipelineTemplate =
  | 'analyze-reason-format'
  | 'code-debug-review'
  | 'draft-critique-revise'
  | 'custom';

export type PipelineResponse = {
  messageId: string;
  threadId: string;
};
