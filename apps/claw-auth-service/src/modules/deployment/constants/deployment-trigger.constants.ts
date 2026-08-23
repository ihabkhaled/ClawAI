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

/**
 * Primary key of the single deployment-credential row. The table holds exactly
 * one configuration; pinning the id makes that a property of every write
 * rather than something callers have to remember.
 */
export const DEPLOYMENT_CREDENTIAL_ID = 'production';

/** How much of the token the page may see — enough to identify it, not to use it. */
export const DEPLOYMENT_TOKEN_LAST_FOUR_LENGTH = 4;

/**
 * Bounds on a stored token. GitHub's fine-grained PATs are ~93 characters and
 * classic ones 40; the range is deliberately loose enough to survive a format
 * change and tight enough to reject a pasted paragraph.
 */
export const DEPLOYMENT_TOKEN_MIN_LENGTH = 20;
export const DEPLOYMENT_TOKEN_MAX_LENGTH = 512;

/** Reading run progress is on the page's poll path, so it fails fast. */
export const GITHUB_READ_TIMEOUT_MS = 8_000;

/**
 * Bounds on what a progress read will accept from GitHub. The deployment
 * workflow has one job and a handful of steps; these ceilings exist so a
 * surprising response cannot turn into an unbounded render.
 */
export const GITHUB_MAX_JOBS = 50;
export const GITHUB_MAX_STEPS_PER_JOB = 100;
export const GITHUB_JOB_NAME_MAX_LENGTH = 256;

/**
 * Which ENCRYPTION_KEY generation encrypted a stored token. Recorded so a
 * future key rotation can tell re-encryptable rows from ones that must be
 * re-entered, the same way payment-service versions its gateway credentials.
 */
export const DEPLOYMENT_CREDENTIAL_ENCRYPTION_KEY_VERSION = 1;
