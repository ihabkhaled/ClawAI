export const WEBHOOK_HEADER_NAMES = {
  GITHUB_DELIVERY: 'x-github-delivery',
  GITHUB_EVENT: 'x-github-event',
  GITHUB_SIGNATURE_256: 'x-hub-signature-256',
  GITLAB_TOKEN: 'x-gitlab-token',
  GITLAB_EVENT: 'x-gitlab-event',
  BITBUCKET_EVENT: 'x-event-key',
  BITBUCKET_REQUEST_UUID: 'x-request-uuid',
  BITBUCKET_HOOK_UUID: 'x-hook-uuid',
  JIRA_SIGNATURE: 'x-atlassian-webhook-identifier',
  SLACK_SIGNATURE: 'x-slack-signature',
  SLACK_TIMESTAMP: 'x-slack-request-timestamp',
  FIGMA_SIGNATURE: 'x-figma-signature',
  CONTENT_TYPE: 'content-type',
} as const;

export const WEBHOOK_REJECTION_CODES = {
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  SIGNATURE_MISSING: 'SIGNATURE_MISSING',
  SECRET_NOT_CONFIGURED: 'SECRET_NOT_CONFIGURED',
  REPLAY_DUPLICATE: 'REPLAY_DUPLICATE',
  BODY_TOO_LARGE: 'BODY_TOO_LARGE',
  UNSUPPORTED_PROVIDER: 'UNSUPPORTED_PROVIDER',
  MALFORMED_BODY: 'MALFORMED_BODY',
} as const;

export const WEBHOOK_PROVIDER_DISPLAY_LIMIT = 50;
