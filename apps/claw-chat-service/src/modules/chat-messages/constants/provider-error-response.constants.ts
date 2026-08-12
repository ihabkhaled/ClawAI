// How much of a candidate answer is inspected for an error envelope.
//
// An error body is small and its marker appears at the very start; a genuine
// answer can be megabytes. Scanning a bounded prefix keeps the check O(1) on
// large replies and stops a long answer that happens to quote an error shape
// deep in its body from being discarded.
export const PROVIDER_ERROR_RESPONSE_SCAN_CHARACTERS = 2_000;

// Shapes that mark a body as an error envelope rather than an answer.
//
// Detection is deliberately shape based, not message based: quota, rate limit,
// authentication, permission, safety blocks and server faults all arrive in the
// same envelope, and every one of them should mean the same thing — this
// candidate failed, try the next model.
export const PROVIDER_ERROR_ENVELOPE_PATTERNS: readonly RegExp[] = [
  // {"error": {...}} / [{"error": {...}}] — OpenAI, Gemini, Anthropic, Ollama.
  /"error"\s*:\s*[{"]/iu,
  // Explicit machine-readable failure states seen across providers.
  /"status"\s*:\s*"(?:RESOURCE_EXHAUSTED|PERMISSION_DENIED|UNAUTHENTICATED|UNAVAILABLE|INTERNAL|INVALID_ARGUMENT|FAILED_PRECONDITION|DEADLINE_EXCEEDED)"/iu,
  // A bare HTTP-ish error code with a message beside it. The code must end at a
  // comma or a closing brace so a longer number — a token count, an id — cannot
  // be mistaken for a status.
  /"code"\s*:\s*(?:4\d{2}|5\d{2})\s*[,}][\s\S]{0,120}?"message"\s*:/iu,
];
