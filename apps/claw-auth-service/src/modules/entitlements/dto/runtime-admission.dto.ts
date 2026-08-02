import { z } from 'zod';

const runtimeIdentitySchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/u);

export const runtimeAdmissionSchema = z
  .object({
    userId: runtimeIdentitySchema,
    requestId: runtimeIdentitySchema,
    provider: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9._:-]+$/u),
    model: z.string().min(1).max(160),
    estimatedTokens: z.number().int().positive().max(2_000_000),
  })
  .strict();

export const runtimeAdmissionReleaseSchema = z
  .object({
    userId: runtimeIdentitySchema,
    requestId: runtimeIdentitySchema,
  })
  .strict();

export const runtimeAdmissionAckSchema = z
  .object({
    requestId: runtimeIdentitySchema,
    planId: z.string().min(1).max(160).nullable(),
    estimatedTokens: z.number().int().positive().max(2_000_000),
    reservationId: z.string().uuid(),
    replayed: z.boolean(),
    adminBypass: z.boolean(),
  })
  .strict();

export type RuntimeAdmissionDto = z.infer<typeof runtimeAdmissionSchema>;
export type RuntimeAdmissionReleaseDto = z.infer<typeof runtimeAdmissionReleaseSchema>;
