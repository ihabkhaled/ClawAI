import { z } from 'zod';
import { SessionGlobalAction } from '../enums/session-global-action.enum';
import { SessionState } from '../enums/session-state.enum';
import {
  SESSION_LIST_DEFAULT_PAGE_SIZE,
  SESSION_LIST_MAX_PAGE_SIZE,
} from '../constants/session-admin.constants';

export const listSessionsQuerySchema = z
  .object({
    state: z.nativeEnum(SessionState).optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(SESSION_LIST_MAX_PAGE_SIZE)
      .default(SESSION_LIST_DEFAULT_PAGE_SIZE),
  })
  .strict();
export type ListSessionsQueryDto = z.infer<typeof listSessionsQuerySchema>;

/** Ending your own current login must be confirmed explicitly. */
export const terminateSessionSchema = z.object({ confirmCurrent: z.boolean().optional() }).strict();
export type TerminateSessionDto = z.infer<typeof terminateSessionSchema>;

export const globalChallengeSchema = z
  .object({
    action: z.nativeEnum(SessionGlobalAction),
    // Never logged, never echoed; bounded so a huge body cannot be hashed.
    password: z.string().min(1).max(1_024),
  })
  .strict();
export type GlobalChallengeDto = z.infer<typeof globalChallengeSchema>;

export const globalTerminateSchema = z
  .object({
    token: z.string().min(16).max(256),
    phrase: z.string().min(1).max(64),
    /** Default true: the acting administrator's own login survives so they can keep working. */
    keepCurrentSession: z.boolean().default(true),
  })
  .strict();
export type GlobalTerminateDto = z.infer<typeof globalTerminateSchema>;

export const globalClearSchema = z
  .object({
    token: z.string().min(16).max(256),
    phrase: z.string().min(1).max(64),
  })
  .strict();
export type GlobalClearDto = z.infer<typeof globalClearSchema>;
