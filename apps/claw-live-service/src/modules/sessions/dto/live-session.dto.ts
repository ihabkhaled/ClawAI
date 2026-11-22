import { z } from 'zod';

import { LiveHeartbeatState } from '../../../common/enums/live-heartbeat-state.enum';
import { LiveMode } from '../../../generated/prisma';
import { canonicalLanguage } from '../utilities/live-session-language.utility';

/** Longest pasted source URL accepted. */
const URL_MAX_LENGTH = 2048;
/** Media times are epoch ms; bounded so a BigInt conversion cannot overflow anything. */
const EPOCH_MS_MAX = 8_640_000_000_000_000;
/** Largest spending cap a viewer can set: $10,000 in micro-USD. */
const SPENDING_CAP_MAX = 10_000_000_000;

const languageSchema = z
  .string()
  .min(2)
  .max(16)
  .transform((value, context) => {
    const canonical = canonicalLanguage(value);
    if (canonical === null) {
      context.addIssue({ code: 'custom', message: 'Unsupported language' });
      return z.NEVER;
    }
    return canonical;
  });

export const resolveSourceBodySchema = z.object({
  url: z.string().trim().min(1).max(URL_MAX_LENGTH),
});
export type ResolveSourceBody = z.infer<typeof resolveSourceBodySchema>;

export const createSessionBodySchema = z.object({
  url: z.string().trim().min(1).max(URL_MAX_LENGTH),
  language: languageSchema,
  mode: z.nativeEnum(LiveMode),
  attestRights: z.boolean().default(false),
});
export type CreateSessionBody = z.infer<typeof createSessionBodySchema>;

export const heartbeatBodySchema = z.object({
  state: z.nativeEnum(LiveHeartbeatState),
  playbackAt: z.number().int().min(0).max(EPOCH_MS_MAX),
  atLiveEdge: z.boolean().default(false),
  seekableFromAt: z.number().int().min(0).max(EPOCH_MS_MAX).optional(),
});
export type HeartbeatBody = z.infer<typeof heartbeatBodySchema>;

export const approveCreditsBodySchema = z.object({
  spendingCapMicroUsd: z.number().int().min(1).max(SPENDING_CAP_MAX).optional(),
});
export type ApproveCreditsBody = z.infer<typeof approveCreditsBodySchema>;

export const updateSessionBodySchema = z
  .object({
    language: languageSchema.optional(),
    mode: z.nativeEnum(LiveMode).optional(),
  })
  .refine((body) => body.language !== undefined || body.mode !== undefined, {
    message: 'Nothing to update',
  });
export type UpdateSessionBody = z.infer<typeof updateSessionBodySchema>;
