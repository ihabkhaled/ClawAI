import type { PipelineStage } from '../types/pipeline.types';

export const PIPELINE_STAGE_TIMEOUT_MS = 120_000;
export const DEFAULT_PIPELINE_MODEL = 'gemma3:4b';
export const MAX_PIPELINE_STAGES = 5;

export const PIPELINE_TEMPLATES: Record<string, PipelineStage[]> = {
  'analyze-reason-format': [
    {
      name: 'Analyzer',
      instruction:
        'Analyze the following input and identify the key concepts, requirements, and context:',
      model: 'gemma3:4b',
    },
    {
      name: 'Reasoner',
      instruction: 'Given this analysis, reason through the solution step by step:',
      model: 'gemma3:4b',
    },
    {
      name: 'Formatter',
      instruction: 'Format the reasoning into a clear, well-structured final answer:',
      model: 'gemma3:4b',
    },
  ],
  'code-debug-review': [
    {
      name: 'Coder',
      instruction: 'Write code to solve the following task:',
      model: 'gemma3:4b',
    },
    {
      name: 'Debugger',
      instruction: 'Review this code for bugs, edge cases, and potential issues:',
      model: 'gemma3:4b',
    },
    {
      name: 'Reviewer',
      instruction: 'Provide a final reviewed version with improvements applied:',
      model: 'gemma3:4b',
    },
  ],
  'draft-critique-revise': [
    {
      name: 'Drafter',
      instruction: 'Write an initial draft response for:',
      model: 'gemma3:4b',
    },
    {
      name: 'Critic',
      instruction: 'Critically evaluate this draft for weaknesses, gaps, and improvements needed:',
      model: 'gemma3:4b',
    },
    {
      name: 'Reviser',
      instruction: 'Revise the draft incorporating all the critique points:',
      model: 'gemma3:4b',
    },
  ],
};
