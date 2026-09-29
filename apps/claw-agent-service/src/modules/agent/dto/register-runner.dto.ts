import { z } from 'zod';
import { RUNNER_LABEL_MAX } from '../constants/runner.constants';
import { createAgentSessionSchema } from './create-agent-session.dto';

const labelSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'labels are lower-case slugs');

export const registerRunnerSchema = createAgentSessionSchema.omit({ metadata: true }).extend({
  name: z.string().min(1).max(80),
  labels: z.array(labelSchema).max(RUNNER_LABEL_MAX).default([]),
});

export type RegisterRunnerDto = z.infer<typeof registerRunnerSchema>;

export const dispatchRunnerJobSchema = z.object({
  command: z.string().min(1).max(4096),
  workingDir: z.string().max(1024).optional(),
  /** Placement: the job goes to a connected runner carrying every label. */
  labels: z.array(labelSchema).max(RUNNER_LABEL_MAX).default([]),
});

export type DispatchRunnerJobDto = z.infer<typeof dispatchRunnerJobSchema>;
