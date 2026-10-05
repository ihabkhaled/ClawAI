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

export const PUBLICATION_PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}\b/u,
  /\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b/u,
  /\b\d{16}\b/u,
  /\b\d{3}-\d{2}-\d{4}\b/u,
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/u,
];
