export const IMPL_HANDOFF_BRIEF_SNIPPET_MAX_CHARS = 1024;
export const IMPL_HANDOFF_HTTP_TIMEOUT_MS = 15_000;

// Stream 41 — common secret-detection patterns we never let through into a
// chat-thread or agent terminal handoff. The risk-scorer (Stream 10) already
// runs a broader catalog; this is a defence-in-depth check at handoff time.
export const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/i,
  /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
  /sk-[A-Za-z0-9]{20,}/, // OpenAI / Anthropic style
  /ghp_[A-Za-z0-9]{30,}/, // GitHub PAT
  /ghs_[A-Za-z0-9]{30,}/,
  /xoxb-[A-Za-z0-9-]{20,}/, // Slack bot
  /xoxp-[A-Za-z0-9-]{20,}/,
] as const;

export const PLAN_MAX_SUBTASKS_DEFAULT = 12;
export const PLAN_TSHIRT_SIZES_DEFAULT = ['XS', 'S', 'M', 'L', 'XL'] as const;
