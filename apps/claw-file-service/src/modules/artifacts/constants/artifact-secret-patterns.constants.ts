// Credential shapes that refuse a publication server-side.
//
// The coding agent already scrubs and re-scans before sending. This is the
// second, independent check: a client that skipped its scan, or a detector
// that drifted, must still not be able to put a live key on a public URL.
//
// Same shapes as chat-service's share scan (apps/claw-chat-service/src/modules/
// chat-shares/constants/secret-patterns.constants.ts); services cannot import
// each other, so the list is kept in step by hand. Every pattern is bounded —
// an unbounded quantifier over user content is a backtracking DoS.

export const ARTIFACT_SECRET_PATTERNS: readonly RegExp[] = [
  // AWS access key id
  /\bAKIA[0-9A-Z]{16}\b/u,
  // GitHub tokens (classic, fine-grained, OAuth, app, refresh)
  /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{22,255}\b/u,
  // OpenAI / Anthropic style keys
  /\bsk-[A-Za-z0-9_-]{20,64}\b/u,
  /\bsk-ant-[A-Za-z0-9_-]{20,120}\b/u,
  // Google API key
  /\bAIza[0-9A-Za-z_-]{35}\b/u,
  // Slack tokens
  /\bxox[baprs]-[0-9A-Za-z-]{10,120}\b/u,
  // Stripe secret / restricted keys
  /\b[rs]k_(?:live|test)_[0-9A-Za-z]{20,64}\b/u,
  // PEM private key blocks
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/u,
  // JWT — three base64url segments, bounded.
  /\beyJ[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\b/u,
  // Connection strings carrying inline credentials
  /\b(?:postgres|postgresql|mysql|mongodb|redis|amqp)(?:\+srv)?:\/\/[^\s:@/]{1,128}:[^\s:@/]{1,128}@/iu,
  // Explicit assignment of something secret-shaped
  /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[=:]\s*["']?[A-Za-z0-9_\-./+]{16,128}/iu,
];
