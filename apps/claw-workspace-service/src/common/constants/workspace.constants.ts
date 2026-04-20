import { type WorkspaceProvider } from '../enums/workspace-provider.enum';

// ─── GitHub adapter URLs ──────────────────────────────────────────────────────
export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_AUTH_BASE = 'https://github.com/login/oauth/authorize';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/** How many of the user's top repos we drill into for issues/PRs per sync. */
export const GITHUB_SYNC_REPO_DEPTH = 3;
/** Max issues fetched per repo per sync. */
export const GITHUB_SYNC_ISSUES_PER_REPO = 30;
/** Max pull requests fetched per repo per sync. */
export const GITHUB_SYNC_PRS_PER_REPO = 20;

// ─── Slack adapter URLs ───────────────────────────────────────────────────────
export const SLACK_API_BASE = 'https://slack.com/api';
export const SLACK_AUTH_URL = 'https://slack.com/oauth/v2/authorize';
export const SLACK_TOKEN_URL = 'https://slack.com/api/oauth.v2.access';

// ─── Jira (Atlassian) adapter URLs ────────────────────────────────────────────
export const JIRA_API_BASE = 'https://api.atlassian.com';
export const JIRA_AUTH_URL = 'https://auth.atlassian.com/authorize';
export const JIRA_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
export const JIRA_API_RESOURCES = 'https://api.atlassian.com/oauth/token/accessible-resources';

// ─── Google Drive adapter URLs ────────────────────────────────────────────────
export const GOOGLE_API_BASE = 'https://www.googleapis.com';
export const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// ─── Crypto utility constants ─────────────────────────────────────────────────
export const AES_ALGORITHM = 'aes-256-gcm';
export const AES_IV_LENGTH = 12;
export const AES_AUTH_TAG_LENGTH = 16;
export const PKCE_CODE_VERIFIER_BYTE_LENGTH = 32;

// ─── OAuth / sync constants ───────────────────────────────────────────────────
export const OAUTH_STATE_TTL_SECONDS = 600;
export const OAUTH_REFRESH_LOCK_TTL_SECONDS = 30;
export const SYNC_MAX_RETRIES = 3;
export const SYNC_RETRY_DELAY_MS = 1000;
export const HEALTH_CHECK_TIMEOUT_MS = 5000;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const TOKEN_EXPIRY_BUFFER_SECONDS = 300;
export const OBJECT_UPSERT_BATCH_SIZE = 100;
export const OBJECT_CONTENT_MAX_LENGTH = 65_536;
export const SEARCH_SNIPPET_LENGTH = 200;

// ─── Action Layer constants ───────────────────────────────────────────────────
export const ACTION_EXPIRY_HOURS = 24;
export const ACTION_EXPIRY_MS = ACTION_EXPIRY_HOURS * 60 * 60 * 1000;
export const WRITE_EXECUTION_TIMEOUT_MS = 10_000;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 20;
export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 500;

// ─── Cross-reference detection patterns ──────────────────────────────────────
export const JIRA_KEY_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/g;
export const GITHUB_PR_URL_PATTERN = /https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/g;
export const GITHUB_ISSUE_URL_PATTERN = /https?:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/g;
export const SLACK_CHANNEL_PATTERN = /<#[A-Z0-9]+\|[^>]+>/g;

export const OAUTH_PROVIDERS: ReadonlySet<WorkspaceProvider> = new Set([
  'GITHUB',
  'GITLAB',
  'BITBUCKET',
  'SLACK',
  'JIRA',
  'CONFLUENCE',
  'FIGMA',
  'CLICKUP',
  'GOOGLE_DRIVE',
  'GMAIL',
  'MICROSOFT_SHAREPOINT',
  'MICROSOFT_ONEDRIVE',
] as WorkspaceProvider[]);

export const PAT_PROVIDERS: ReadonlySet<WorkspaceProvider> = new Set([
  'GITHUB',
  'GITLAB',
  'BITBUCKET',
] as WorkspaceProvider[]);
