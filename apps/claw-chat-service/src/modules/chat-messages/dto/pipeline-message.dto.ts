import { z } from 'zod';

const pipelineStageSchema = z.object({
  name: z.string().min(1).max(100),
  instruction: z.string().min(1).max(2000),
  model: z.string().min(1).max(255),
});

export const pipelineMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
  threadId: z.string().max(255).optional(),
  template: z
    .enum(['analyze-reason-format', 'code-debug-review', 'draft-critique-revise', 'custom'])
    .default('analyze-reason-format'),
  customStages: z.array(pipelineStageSchema).max(5).optional(),
});

export type PipelineMessageDto = z.infer<typeof pipelineMessageSchema>;
