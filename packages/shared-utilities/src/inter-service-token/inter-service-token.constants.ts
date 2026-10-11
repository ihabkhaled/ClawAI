/**
 * Substrings that mark an INTER_SERVICE_AUTH_TOKEN as a published placeholder
 * (the zod default in every service config and the `.env.example` value).
 */
export const INTER_SERVICE_TOKEN_PLACEHOLDER_MARKERS: readonly string[] = [
  'change-me',
  'changeme',
  'replace-me',
  'your-token',
];

export const PRODUCTION_NODE_ENV = 'production';
