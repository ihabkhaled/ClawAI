import { z } from 'zod';
import { RUNNER_LABEL_MAX } from '../constants/runner.constants';
import { RunnerApprovalPolicy } from '../../../common/enums/runner-approval-policy.enum';
import {
  agentPlatformSchema,
  agentVersionSchema,
  createAgentSessionSchema,
} from './create-agent-session.dto';

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

/**
 * F100: what a runner says about itself at heartbeat. Self-reported and
 * unsigned, so it is recorded for the owner and never used to authorise
 * anything. Every field is optional and a missing body is an empty report,
 * which keeps every runner that sends no body working. Unknown keys are
 * dropped: a runner can change its version and platform, nothing else.
 */
export const runnerHeartbeatSchema = z
  .object({
    agentVersion: agentVersionSchema.optional(),
    platform: agentPlatformSchema.optional(),
  })
  .default({});

export type RunnerHeartbeatDto = z.infer<typeof runnerHeartbeatSchema>;
