import { z } from 'zod';
import {
  ROUTINE_SECRET_NAME_PATTERN,
  ROUTINE_SECRET_RESERVED_NAMES,
  ROUTINE_SECRET_RESERVED_PREFIXES,
  ROUTINE_SECRET_VALUE_MAX_BYTES,
} from '../../../common/constants/routine-secret.constants';

/** `[A-Z][A-Z0-9_]{0,63}`, and not a name that would change how the runner loads code. */
export const routineSecretNameSchema = z
  .string()
  .regex(ROUTINE_SECRET_NAME_PATTERN, 'an upper-case name: A-Z, 0-9 and _, starting with a letter')
  .refine(
    (name) =>
      !ROUTINE_SECRET_RESERVED_NAMES.includes(name) &&
      !ROUTINE_SECRET_RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix)),
    'this name is reserved',
  );

/**
 * The value is never trimmed or transformed. Counted in UTF-8 bytes; a NUL byte is
 * refused because an environment variable cannot hold one. The messages are fixed
 * strings: a validation error must never echo the value back.
 */
export const routineSecretValueSchema = z
  .string()
  .min(1, 'a value is required')
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= ROUTINE_SECRET_VALUE_MAX_BYTES,
    'the value is too large',
  )
  .refine((value) => !value.includes('\0'), 'the value contains a forbidden character');

export const createRoutineSecretSchema = z.object({
  name: routineSecretNameSchema,
  value: routineSecretValueSchema,
});

export const replaceRoutineSecretSchema = z.object({
  value: routineSecretValueSchema,
});

/** Whether a webhook-fired run also receives the routine's secrets. */
export const setRoutineSecretsPolicySchema = z.object({
  webhookRunsReceiveSecrets: z.boolean(),
});

export type CreateRoutineSecretDto = z.infer<typeof createRoutineSecretSchema>;
export type ReplaceRoutineSecretDto = z.infer<typeof replaceRoutineSecretSchema>;
export type SetRoutineSecretsPolicyDto = z.infer<typeof setRoutineSecretsPolicySchema>;
