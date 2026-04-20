import { z } from 'zod';
import { researchModeSchema } from './create-message.dto';

/**
 * Optional research fields that every chat DTO should spread so that the
 * user's research toggle works regardless of which chat flow they hit
 * (compare, consensus, escalation, …).
 */
export const researchFields = {
  researchMode: researchModeSchema.optional(),
  researchProviderId: z.string().max(64, 'Research provider id too long').optional(),
};
