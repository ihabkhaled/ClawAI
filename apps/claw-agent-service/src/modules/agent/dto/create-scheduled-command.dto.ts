import { z } from 'zod';
import {
  PROMPT_ROUTINE_MAX_CHARS,
  PROMPT_ROUTINE_MODEL_MAX,
  PROMPT_ROUTINE_REPO_REF_MAX,
  RUNNER_LABEL_MAX,
} from '../constants/runner.constants';
import { ScheduledCommandKind } from '../../../common/enums/scheduled-command-kind.enum';
import { runnerLabelSchema } from './register-runner.dto';

const intervalMinutesSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(60 * 24 * 7);

/** A shell command on a paired device. `kind` may be omitted by older clients. */
export const createCommandRoutineSchema = z.object({
  kind: z.literal(ScheduledCommandKind.COMMAND).default(ScheduledCommandKind.COMMAND),
  deviceId: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  command: z.string().min(1).max(4096),
  workingDir: z.string().min(1).max(1024).optional(),
  intervalMinutes: intervalMinutesSchema,
});

/** F099: an agent prompt, run by an online runner carrying every listed label. */
export const createPromptRoutineSchema = z.object({
  kind: z.literal(ScheduledCommandKind.PROMPT),
  name: z.string().min(1).max(128),
  prompt: z.string().trim().min(1).max(PROMPT_ROUTINE_MAX_CHARS),
  model: z.string().trim().min(1).max(PROMPT_ROUTINE_MODEL_MAX).optional(),
  /** The workspace folder name the runner must have open; omitted means its first folder. */
  repoRef: z
    .string()
    .trim()
    .min(1)
    .max(PROMPT_ROUTINE_REPO_REF_MAX)
    .regex(/^[^/\\]+$/, 'a workspace folder name, not a path')
    .optional(),
  runnerLabels: z.array(runnerLabelSchema).max(RUNNER_LABEL_MAX).default([]),
  intervalMinutes: intervalMinutesSchema,
});

export const createScheduledCommandSchema = z.union([
  createPromptRoutineSchema,
  createCommandRoutineSchema,
]);

export type CreateScheduledCommandDto = z.infer<typeof createScheduledCommandSchema>;
export type CreatePromptRoutineDto = z.infer<typeof createPromptRoutineSchema>;
export type CreateCommandRoutineDto = z.infer<typeof createCommandRoutineSchema>;
