/** Matched against the whole text, URLs included: a secret or an address is dangerous wherever it sits. */
export const PUBLICATION_SECRET_PATTERNS = [
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/u,
  /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,120}\b/u,
  /\bAIza[0-9A-Za-z_-]{35}\b/u,
  /\bxox[baprs]-[0-9A-Za-z-]{10,120}\b/u,
  /\b[rs]k_(?:live|test)_[0-9A-Za-z]{20,64}\b/u,
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/u,
  /\beyJ[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,2000}\b/u,
  /\b(?:postgres|postgresql|mysql|mongodb|redis|amqp)(?:\+srv)?:\/\/[^\s:@/]{1,128}:[^\s:@/]{1,128}@/iu,
  /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[=:]\s*["']?[A-Za-z0-9_\-./+]{16,128}/iu,
];

export const PUBLICATION_EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}\b/u;

/**
 * Numeric identifiers are only judged in PROSE (URLs, link targets and evidence markers removed):
 * a 16-digit id inside a citation URL is not a card. Candidates are digit runs with word edges and
 * must then pass the Luhn checksum.
 */
export const PUBLICATION_CARD_CANDIDATE_PATTERN =
  /(?<![\p{L}\p{N}_])\d[\d -]{11,21}\d(?![\p{L}\p{N}_])/gu;
export const PUBLICATION_SSN_PATTERN = /(?<![\p{L}\p{N}_])\d{3}-\d{2}-\d{4}(?![\p{L}\p{N}_])/u;
export const PUBLICATION_IBAN_PATTERN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/u;

/** Characters of context shown on each side of a flagged passage. */
export const PUBLICATION_FINDING_CONTEXT_CHARS = 28;
export const PUBLICATION_MAX_FINDINGS = 5;

/** Reasons in the order they are reported. */
export const PUBLICATION_REASON_ORDER = ['POSSIBLE_SECRET', 'POSSIBLE_PII'] as const;
