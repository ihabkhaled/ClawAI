import type { PipelineStage } from '../types/pipeline.types';

export const PIPELINE_STAGE_TIMEOUT_MS = 120_000;
export const DEFAULT_PIPELINE_MODEL = 'AUTO';
export const MAX_PIPELINE_STAGES = 5;

export const PIPELINE_TEMPLATES: Record<string, PipelineStage[]> = {
  'analyze-reason-format': [
    {
      name: 'Analyzer',
      instruction:
        'Analyze the following input and identify the key concepts, requirements, and context:',
      model: 'AUTO',
    },
    {
      name: 'Reasoner',
      instruction: 'Given this analysis, reason through the solution step by step:',
      model: 'AUTO',
    },
    {
      name: 'Formatter',
      instruction: 'Format the reasoning into a clear, well-structured final answer:',
      model: 'AUTO',
    },
  ],
  'code-debug-review': [
    {
      name: 'Coder',
      instruction: 'Write code to solve the following task:',
      model: 'AUTO',
    },
    {
      name: 'Debugger',
      instruction: 'Review this code for bugs, edge cases, and potential issues:',
      model: 'AUTO',
    },
    {
      name: 'Reviewer',
      instruction: 'Provide a final reviewed version with improvements applied:',
      model: 'AUTO',
    },
  ],
  'draft-critique-revise': [
    {
      name: 'Drafter',
      instruction: 'Write an initial draft response for:',
      model: 'AUTO',
    },
    {
      name: 'Critic',
      instruction: 'Critically evaluate this draft for weaknesses, gaps, and improvements needed:',
      model: 'AUTO',
    },
    {
      name: 'Reviser',
      instruction: 'Revise the draft incorporating all the critique points:',
      model: 'AUTO',
    },
  ],
};
