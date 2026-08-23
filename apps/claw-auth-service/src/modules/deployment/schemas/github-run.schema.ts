import { DeploymentRunConclusion, DeploymentRunStatus } from '@claw/shared-types';
import { z } from 'zod';

import {
  GITHUB_JOB_NAME_MAX_LENGTH,
  GITHUB_MAX_JOBS,
  GITHUB_MAX_STEPS_PER_JOB,
} from '../constants/deployment-trigger.constants';

/**
 * GitHub's Actions responses, validated before anything reaches an operator's
 * screen. This is third-party data: names are rendered in the UI and URLs are
 * turned into links, so both are bounded here rather than trusted.
 *
 * Unknown status or conclusion values are tolerated as null rather than
 * rejected — GitHub adds new ones, and a rollout in an unrecognised state
 * should still show its jobs instead of failing the whole read.
 */
const runStatusSchema = z
  .enum([
    DeploymentRunStatus.QUEUED,
    DeploymentRunStatus.IN_PROGRESS,
    DeploymentRunStatus.COMPLETED,
    DeploymentRunStatus.WAITING,
    DeploymentRunStatus.REQUESTED,
    DeploymentRunStatus.PENDING,
  ])
  .catch(DeploymentRunStatus.QUEUED);

const runConclusionSchema = z
  .enum([
    DeploymentRunConclusion.SUCCESS,
    DeploymentRunConclusion.FAILURE,
    DeploymentRunConclusion.CANCELLED,
    DeploymentRunConclusion.SKIPPED,
    DeploymentRunConclusion.TIMED_OUT,
    DeploymentRunConclusion.ACTION_REQUIRED,
    DeploymentRunConclusion.NEUTRAL,
    DeploymentRunConclusion.STALE,
  ])
  .nullable()
  .catch(null);

const githubUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('https://github.com/'));

const boundedName = z.string().min(1).max(GITHUB_JOB_NAME_MAX_LENGTH);

export const githubRunSchema = z.object({
  id: z.number().int().positive(),
  run_number: z.number().int().nonnegative(),
  status: runStatusSchema,
  conclusion: runConclusionSchema,
  html_url: githubUrlSchema,
  head_sha: z.string().min(7).max(64),
  run_started_at: z.iso.datetime().nullish(),
  updated_at: z.iso.datetime().nullish(),
});

export const githubRunListSchema = z.object({
  workflow_runs: z.array(githubRunSchema).max(GITHUB_MAX_JOBS),
});

export const githubJobSchema = z.object({
  id: z.number().int().positive(),
  name: boundedName,
  status: runStatusSchema,
  conclusion: runConclusionSchema,
  html_url: githubUrlSchema,
  started_at: z.iso.datetime().nullish(),
  completed_at: z.iso.datetime().nullish(),
  steps: z
    .array(
      z.object({
        number: z.number().int().nonnegative(),
        name: boundedName,
        status: runStatusSchema,
        conclusion: runConclusionSchema,
        started_at: z.iso.datetime().nullish(),
        completed_at: z.iso.datetime().nullish(),
      }),
    )
    .max(GITHUB_MAX_STEPS_PER_JOB)
    .optional(),
});

export const githubJobListSchema = z.object({
  jobs: z.array(githubJobSchema).max(GITHUB_MAX_JOBS),
});
