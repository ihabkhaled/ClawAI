/**
 * `@provider` at a word boundary.
 *
 * The leading boundary check is what stops `ops@github.example` — an email
 * address — from being read as a mention of GitHub. Hyphens are allowed so
 * `@google-drive` resolves to GOOGLE_DRIVE, which is how a user would write it.
 */
export const WORKSPACE_MENTION_PATTERN = /(?<![\w@.])@([a-z][a-z0-9-]{1,31})\b/giu;
