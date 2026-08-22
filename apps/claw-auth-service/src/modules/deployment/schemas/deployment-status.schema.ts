import { DeploymentPhase, DeploymentState } from '@claw/shared-types';
import { z } from 'zod';

import {
  DEPLOYMENT_RESET_FAILURE_CODE,
  DEPLOYMENT_SERVICE_PATTERN,
  DEPLOYMENT_SHA_PATTERN,
  DEPLOYMENT_VERSION_PATTERN,
  DEPLOYMENT_WORKFLOW_URL_PREFIX,
} from '../constants/deployment-status.constants';

const nullableShaSchema = z.string().regex(DEPLOYMENT_SHA_PATTERN).nullable();

export const deploymentStatusSchema = z
  .object({
    schemaVersion: z.literal(1),
    state: z.enum([DeploymentState.RUNNING, DeploymentState.COMPLETED, DeploymentState.FAILED]),
    phase: z.enum([
      DeploymentPhase.PREPARING,
      DeploymentPhase.PLANNING,
      DeploymentPhase.BUILDING,
      DeploymentPhase.DEPLOYING,
      DeploymentPhase.RELOADING_NGINX,
      DeploymentPhase.VERIFYING,
      DeploymentPhase.FINALIZING,
      DeploymentPhase.COMPLETED,
    ]),
    targetSha: z.string().regex(DEPLOYMENT_SHA_PATTERN),
    previousSha: nullableShaSchema,
    deployedSha: nullableShaSchema,
    version: z.string().regex(DEPLOYMENT_VERSION_PATTERN).nullable(),
    services: z.array(z.string().regex(DEPLOYMENT_SERVICE_PATTERN)).max(64),
    currentService: z.string().regex(DEPLOYMENT_SERVICE_PATTERN).nullable(),
    startedAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
    workflowUrl: z
      .url()
      .refine((value) => value.startsWith(DEPLOYMENT_WORKFLOW_URL_PREFIX))
      .nullable(),
    failureCode: z.enum(['DEPLOYMENT_FAILED', DEPLOYMENT_RESET_FAILURE_CODE]).nullable(),
  })
  .strict();

/**
 * The automatic-deploy switch on disk. Kept in its own file so clearing a stuck
 * rollout and pausing the automatic lane stay independent operations.
 */
export const deploymentAutomationSchema = z
  .object({
    schemaVersion: z.literal(1),
    enabled: z.boolean(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
