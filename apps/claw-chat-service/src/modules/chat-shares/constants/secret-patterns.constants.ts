// Patterns that block a snapshot from becoming indexable.
//
// This is a safety net, not a guarantee. It exists because the realistic
// failure is a user pasting a key into a chat, forgetting, and later sharing
// the thread — not an attacker trying to evade detection. So the patterns
// target the shapes real credentials actually have, and a hit downgrades the
// share to REQUIRES_REVIEW rather than silently publishing it to a search
// engine.
//
// Every pattern is anchored and bounded. An unbounded quantifier here would be
// a catastrophic-backtracking DoS reachable from user content.

export const SECRET_PATTERNS: RegExp[] = [
  // AWS access key id
  /\bAKIA[0-9A-Z]{16}\b/,
  // GitHub tokens (classic, fine-grained, OAuth, app, refresh)
  /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/,
  // OpenAI / Anthropic style keys
  /\bsk-[A-Za-z0-9_-]{20,64}\b/,
  /\bsk-ant-[A-Za-z0-9_-]{20,120}\b/,
  // Google API key
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  // Slack tokens
  /\bxox[baprs]-[0-9A-Za-z-]{10,120}\b/,
  // Stripe secret / restricted keys
  /\b[rs]k_(?:live|test)_[0-9A-Za-z]{20,64}\b/,
  // PEM private key blocks
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  // JWT — three base64url segments. Bounded to avoid backtracking.
  /\beyJ[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\b/,
  // Connection strings carrying inline credentials
  /\b(?:postgres|postgresql|mysql|mongodb|redis|amqp)(?:\+srv)?:\/\/[^\s:@/]{1,128}:[^\s:@/]{1,128}@/i,
  // Explicit assignment of something secret-shaped
  /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[=:]\s*["']?[A-Za-z0-9_\-./+]{16,128}/i,
];

// Personally identifying shapes. These do NOT block publication — a phone
// number in a conversation is often the point of the conversation — but they do
// force a review before the page can be handed to a search engine.
export const PII_PATTERNS: RegExp[] = [
  // Email address
  /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}\b/,
  // Credit-card-shaped digits, as two separate patterns rather than one
  // alternation.
  //
  // The obvious spelling — `(?:\d{4}[ -]?){3}\d{4}` — puts an OPTIONAL
  // separator inside a repeated group, which gives the engine two ways to
  // match the same input. That is the shape that backtracks catastrophically,
  // and this runs against attacker-supplied chat content.
  /\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b/,
  /\b\d{16}\b/,
  // US social security number
  /\b\d{3}-\d{2}-\d{4}\b/,
  // IBAN
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/,
];
