import { DeploymentTriggerMode } from '@claw/shared-types';
import { z } from 'zod';

import { DEPLOYMENT_SHA_PATTERN } from '../constants/deployment-status.constants';

/**
 * A manual deployment request. `targetSha` is required for — and only accepted
 * by — the SHA mode: LATEST resolves the configured ref on GitHub's side and
 * REDEPLOY reuses the SHA already recorded as live, so accepting a SHA there
 * would silently ignore it.
 */
export const triggerDeploymentSchema = z
  .object({
    mode: z.enum([
      DeploymentTriggerMode.LATEST,
      DeploymentTriggerMode.REDEPLOY,
      DeploymentTriggerMode.SHA,
    ]),
    targetSha: z.string().regex(DEPLOYMENT_SHA_PATTERN).optional(),
  })
  .strict()
  .refine(
    (value) => (value.mode === DeploymentTriggerMode.SHA) === (value.targetSha !== undefined),
    { message: 'targetSha is required for the sha mode and rejected for every other mode' },
  );
export type TriggerDeploymentDto = z.infer<typeof triggerDeploymentSchema>;

export const setDeploymentAutomationSchema = z.object({ enabled: z.boolean() }).strict();
export type SetDeploymentAutomationDto = z.infer<typeof setDeploymentAutomationSchema>;
