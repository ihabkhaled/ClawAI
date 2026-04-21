/**
 * Content safety utilities. Fetched and scraped page content lands in
 * the LLM prompt — this pass flags known prompt-injection patterns and
 * redacts secret-looking tokens before the bundle goes out.
 *
 * Philosophy for Session 1:
 *   - NEVER block a request. Always return content.
 *   - Redactions happen inline (replace token → "[REDACTED]").
 *   - Injection detection does NOT rewrite text — the caller decides.
 *     (Per plan: "log warning, redact, keep going.")
 *
 * Full defense-in-depth is tracked for Session 5 (heuristic scoring,
 * multi-pass sanitization, per-tenant override list).
 */

import {
  INJECTION_PATTERNS,
  REDACTION_REPLACEMENT,
  SECRET_PATTERNS,
} from '../constants/content-safety.constants';
import type {
  ContentSafetyResult,
  InjectionFilterResult,
  SecretRedactionResult,
} from '../types/content-safety.types';

export function filterPromptInjection(text: string): InjectionFilterResult {
  const detected: string[] = [];
  for (const { id, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      detected.push(id);
    }
  }
  return { text, detected };
}

export function redactSecrets(text: string): SecretRedactionResult {
  let redactedCount = 0;
  let out = text;
  for (const { pattern } of SECRET_PATTERNS) {
    const matches = out.match(pattern);
    if (matches === null || matches.length === 0) {
      continue;
    }
    redactedCount += matches.length;
    out = out.replace(pattern, REDACTION_REPLACEMENT);
  }
  return { text: out, redactedCount };
}

export function sanitizeForLlm(text: string): ContentSafetyResult {
  const injection = filterPromptInjection(text);
  const redacted = redactSecrets(injection.text);
  return {
    text: redacted.text,
    detected: injection.detected,
    redactedCount: redacted.redactedCount,
  };
}
