import { z } from 'zod';
import {
  REPOSITORY_BRANCH_MAX,
  REPOSITORY_BRANCH_PATTERN,
  REPOSITORY_NAME_MAX,
  REPOSITORY_NAME_PATTERN,
  REPOSITORY_REMOTE_MAX,
} from '../constants/repository-ref.constants';
import { normalizeRepositoryRemote } from '../utilities/normalize-repository-remote.utility';

/**
 * F095: the repository a thread was started in. The remote is normalised and
 * stripped of credentials, query and fragment before it is stored; unknown keys
 * are dropped, so a token field sent by mistake is never kept.
 */
export const repositoryRefSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(REPOSITORY_NAME_MAX)
    .regex(REPOSITORY_NAME_PATTERN, 'a repository or folder name, not a path'),
  remoteUrl: z
    .string()
    .trim()
    .max(REPOSITORY_REMOTE_MAX)
    .transform((value, context) => {
      const normalised = normalizeRepositoryRemote(value);
      if (normalised === null) {
        context.addIssue({ code: 'custom', message: 'an http(s), ssh or git remote' });
        return z.NEVER;
      }
      return normalised;
    })
    .optional(),
  branch: z
    .string()
    .trim()
    .min(1)
    .max(REPOSITORY_BRANCH_MAX)
    .regex(REPOSITORY_BRANCH_PATTERN, 'a git branch name')
    .optional(),
});

export type RepositoryRefDto = z.infer<typeof repositoryRefSchema>;
