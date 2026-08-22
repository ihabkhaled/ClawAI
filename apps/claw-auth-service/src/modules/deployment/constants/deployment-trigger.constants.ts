/** GitHub REST host used to dispatch the production deployment workflow. */
export const GITHUB_API_BASE_URL = 'https://api.github.com';

/** Pinned REST contract — GitHub requires this header on every call. */
export const GITHUB_API_VERSION = '2022-11-28';

export const GITHUB_ACCEPT_HEADER = 'application/vnd.github+json';

/** Workflow file dispatched for a production rollout. */
export const GITHUB_DEPLOY_WORKFLOW_FILE = 'deploy-production.yml';

/** A dispatch is a single small POST; it either lands quickly or is retried by hand. */
export const GITHUB_DISPATCH_TIMEOUT_MS = 10_000;

/** owner/repo, exactly as GitHub spells it in a repository URL. */
export const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;

/** Git ref a manual dispatch may target — a plain branch name, no globs or paths. */
export const GITHUB_REF_PATTERN = /^[A-Za-z0-9._/-]{1,255}$/;

/** How long a rollout may report nothing before a manual dispatch may pre-empt it. */
export const DEPLOYMENT_TRIGGER_CONFLICT_GRACE_MS = 30 * 60 * 1000;
