import { z } from 'zod';

import {
  DEPLOYMENT_TOKEN_MAX_LENGTH,
  DEPLOYMENT_TOKEN_MIN_LENGTH,
  GITHUB_REF_PATTERN,
  GITHUB_REPOSITORY_PATTERN,
} from '../constants/deployment-trigger.constants';

/**
 * Credentials an admin saves from the deployment page.
 *
 * `token` is optional on update so an operator can correct the repository or
 * ref without re-pasting the token — the service keeps the stored one. It is
 * required the first time, because there is nothing to keep.
 */
export const saveDeploymentCredentialSchema = z
  .object({
    repository: z.string().regex(GITHUB_REPOSITORY_PATTERN),
    ref: z.string().regex(GITHUB_REF_PATTERN),
    token: z
      .string()
      .min(DEPLOYMENT_TOKEN_MIN_LENGTH)
      .max(DEPLOYMENT_TOKEN_MAX_LENGTH)
      // A pasted token routinely carries whitespace; a token with an interior
      // space is not a token at all.
      .refine((value) => !/\s/u.test(value))
      .optional(),
  })
  .strict();
export type SaveDeploymentCredentialDto = z.infer<typeof saveDeploymentCredentialSchema>;
