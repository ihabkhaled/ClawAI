import { z } from 'zod';
import { RUNNER_LABEL_MAX } from '../constants/runner.constants';
import { RunnerApprovalPolicy } from '../../../common/enums/runner-approval-policy.enum';
import { createAgentSessionSchema } from './create-agent-session.dto';

export const runnerLabelSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'labels are lower-case slugs');

export const registerRunnerSchema = createAgentSessionSchema.omit({ metadata: true }).extend({
  name: z.string().min(1).max(80),
  labels: z.array(runnerLabelSchema).max(RUNNER_LABEL_MAX).default([]),
  /** Only ever widens to read-only tool calls; writes and commands always ask. */
  approvalPolicy: z.enum(RunnerApprovalPolicy).default(RunnerApprovalPolicy.ASK),
});

export type RegisterRunnerDto = z.infer<typeof registerRunnerSchema>;

export const dispatchRunnerJobSchema = z.object({
  command: z.string().min(1).max(4096),
  workingDir: z.string().max(1024).optional(),
  /** Placement: the job goes to a connected runner carrying every label. */
  labels: z.array(runnerLabelSchema).max(RUNNER_LABEL_MAX).default([]),
});

export type DispatchRunnerJobDto = z.infer<typeof dispatchRunnerJobSchema>;
