/**
 * Prompt-injection & secret-pattern regexes. Intentionally conservative;
 * better to miss an injection than to erase legitimate content. Full
 * defense-in-depth (scoring, multi-pass, ML) comes in Session 5.
 */

export const REDACTION_REPLACEMENT = '[REDACTED]';

export const INJECTION_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  {
    id: 'ignore-previous-instructions',
    pattern: /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
  },
  { id: 'system-tag', pattern: /<system\b[^>]*>/i },
  { id: 'role-reassignment', pattern: /\byou\s+are\s+now\s+(?:a|an|the)\s+\w+/i },
  { id: 'jailbreak-dan', pattern: /\bdo\s+anything\s+now\b|\bDAN\b/i },
  {
    id: 'prompt-leak',
    pattern: /\b(?:reveal|print|show)\s+(?:the\s+)?(?:system|original)\s+prompt\b/i,
  },
  { id: 'instruction-fence', pattern: /```\s*(?:instruction|system|prompt)[\s\S]{0,500}```/i },
  { id: 'developer-mode', pattern: /\b(?:developer|debug)\s+mode\s+enabled\b/i },
];

// Redaction patterns. Order matters — longer-match patterns first so
// narrower patterns don't swallow parts of bigger secrets.
export const SECRET_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  // Key=value style secrets (api_key=…, apikey=…, api-key=…, password=…, secret=…)
  { id: 'api-key-kv', pattern: /\bapi[_-]?key\s*=\s*[^\s'"<>,;]{4,}/gi },
  { id: 'password-kv', pattern: /\bpassword\s*=\s*[^\s'"<>,;]{3,}/gi },
  { id: 'secret-kv', pattern: /\bsecret\s*=\s*[^\s'"<>,;]{4,}/gi },
  // Authorization headers
  { id: 'bearer', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{10,}/gi },
  { id: 'basic', pattern: /\bBasic\s+[A-Za-z0-9+/=]{10,}/gi },
  // Cloud provider patterns
  { id: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'aws-secret-key', pattern: /\baws_secret_access_key\s*=\s*[^\s'"<>,;]{10,}/gi },
  // GitHub patterns
  { id: 'github-pat-classic', pattern: /\bghp_[A-Za-z0-9]{30,}\b/g },
  { id: 'github-pat-server', pattern: /\bghs_[A-Za-z0-9]{30,}\b/g },
  { id: 'github-pat-fine', pattern: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g },
  // Generic 40+ hex (sha-like / old-style API keys)
  { id: 'hex-40plus', pattern: /\b[a-f0-9]{40,}\b/gi },
];
