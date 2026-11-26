import { z } from 'zod';

import { LivePlatform } from '../../../generated/prisma';
import {
  RECORDED_VIDEO_DEFAULT_MAX_SECONDS,
  RECORDED_VIDEO_MAX_SECONDS_CEILING,
} from '../../sources/constants/recorded-video.constants';
import {
  SERVER_PULL_DEFAULT_PLATFORMS,
  SERVER_PULL_PLATFORMS,
} from '../../sources/constants/server-pull.constants';
import {
  LIVE_COUNCIL_DEFAULT_AGENT,
  LIVE_COUNCIL_MAX,
  LIVE_COUNCIL_MIN,
  LIVE_MODEL_CHAIN_MAX,
  LIVE_MODEL_CHAIN_MIN,
} from '../constants/live-policy.constants';

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

const liveModelChainSchema = z
  .array(liveModelRefSchema)
  .min(LIVE_MODEL_CHAIN_MIN)
  .max(LIVE_MODEL_CHAIN_MAX);

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
  summaryModelChain: liveModelChainSchema,
  visionModelChain: liveModelChainSchema,
  /**
   * 1..3 extra agents that each draft the summary, highlights and report; the main model
   * (summaryModelChain) merges the drafts. Absent in versions saved before 2026-11-26: one agent.
   */
  councilModelChain: z
    .array(liveModelRefSchema)
    .min(LIVE_COUNCIL_MIN)
    .max(LIVE_COUNCIL_MAX)
    .default([{ ...LIVE_COUNCIL_DEFAULT_AGENT }]),
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
  /**
   * Longest recorded video the server downloads and plays along (ADR-221 batch 6, owner decision
   * 2026-11-24: 3 hours). 0 turns recorded videos off; absent in older versions = the 3-hour default.
   */
  recordedVideoMaxSeconds: z
    .number()
    .int()
    .min(0)
    .max(RECORDED_VIDEO_MAX_SECONDS_CEILING)
    .default(RECORDED_VIDEO_DEFAULT_MAX_SECONDS),
});
