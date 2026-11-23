import { z } from 'zod';

import { LivePlatform } from '../../../generated/prisma';
import {
  SERVER_PULL_DEFAULT_PLATFORMS,
  SERVER_PULL_PLATFORMS,
} from '../../sources/constants/server-pull.constants';

/** Per-plan price and free quota. Money is integer micro-USD (rule 28). */
export const livePlanPolicySchema = z.object({
  freeSecondsPerMonth: z.number().int().min(0),
  paidMicroUsdPerMinute: z.number().int().min(0),
});

/** A cheap model the platform pays for; walked in order, first answer wins. */
export const liveModelRefSchema = z.object({
  connector: z.string().min(1),
  model: z.string().min(1),
  style: z.enum(['OPENAI_COMPAT', 'OLLAMA']),
});

/**
 * The versioned admin policy (LivePolicyVersion.config). Seeded as v1 by
 * prisma/seeders/live-policy.seeder.cjs; every change is a new version.
 */
export const livePolicySchema = z.object({
  featureEnabled: z.boolean(),
  killSwitch: z.boolean(),
  plans: z.record(z.string(), livePlanPolicySchema),
  defaultPlan: livePlanPolicySchema,
  visionBilling: z.enum(['ACTUAL_COST', 'INCLUDED']),
  graceSeconds: z.number().int().min(0).max(600),
  maxActiveStreams: z.number().int().min(0),
  maxSessionsPerUser: z.number().int().min(1),
  sessionsPerUserPerHour: z.number().int().min(1),
  dailyBudgetMicroUsd: z.number().int().min(0),
  budgetSoftStopPercent: z.number().int().min(1).max(100),
  summaryModelChain: z.array(liveModelRefSchema),
  visionModelChain: z.array(liveModelRefSchema),
  /**
   * Platforms the server reads itself (shared run, any device). Absent in versions saved before
   * 2026-11-23, so it defaults on; an empty list turns server pull off (browser capture only).
   */
  serverPullPlatforms: z
    .array(z.nativeEnum(LivePlatform))
    .refine(
      (platforms) => platforms.every((platform) => SERVER_PULL_PLATFORMS.includes(platform)),
      {
        message: 'Only platforms with a server-pull resolver can be enabled',
      },
    )
    .default([...SERVER_PULL_DEFAULT_PLATFORMS]),
});
