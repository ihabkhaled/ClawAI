import { DomainPolicyOutcome } from '../enums/domain-policy-outcome.enum';
import type { DomainPolicyResult } from '../types/domain-policy.types';

/**
 * Evaluates a URL against per-provider (or global) allowlist/blocklist
 * rules. Pure function — no I/O. Called from both the fetch pipeline
 * (pre-adapter) and the search pipeline (when dropping untrusted
 * results from a provider's response).
 *
 * Rules:
 *   - Empty allowlist AND empty blocklist → ALLOWED
 *   - Host on blocklist (exact or wildcard)  → BLOCKED (wins over allow)
 *   - Allowlist non-empty AND host not on it → NOT_ALLOWED
 *   - Host on allowlist (exact or wildcard)  → ALLOWED
 *   - Invalid URL                            → INVALID_URL
 *
 * Matching:
 *   - Case-insensitive
 *   - Entries without `*.` prefix: exact match only
 *     (so "github.com" does NOT match "api.github.com")
 *   - Entries starting with `*.`: suffix match
 *     ("*.github.com" matches "api.github.com" but NOT "github.com")
 */
export function evaluateDomainPolicy(
  rawUrl: string,
  allowlist: readonly string[],
  blocklist: readonly string[],
): DomainPolicyResult {
  let host: string;
  try {
    const parsed = new URL(rawUrl);
    host = parsed.hostname.toLowerCase();
  } catch {
    return { outcome: DomainPolicyOutcome.INVALID_URL, reason: `Invalid URL: ${rawUrl}` };
  }

  const onBlocklist = blocklist.some((pattern) => matchesPattern(host, pattern));
  if (onBlocklist) {
    return {
      outcome: DomainPolicyOutcome.BLOCKED,
      reason: `Host ${host} matches the provider blocklist`,
      host,
    };
  }

  if (allowlist.length === 0) {
    return { outcome: DomainPolicyOutcome.ALLOWED, host };
  }

  const onAllowlist = allowlist.some((pattern) => matchesPattern(host, pattern));
  if (onAllowlist) {
    return { outcome: DomainPolicyOutcome.ALLOWED, host };
  }

  return {
    outcome: DomainPolicyOutcome.NOT_ALLOWED,
    reason: `Host ${host} is not on the provider allowlist`,
    host,
  };
}

function matchesPattern(host: string, pattern: string): boolean {
  const normalized = pattern.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  if (normalized.startsWith('*.')) {
    const suffix = normalized.slice(1);
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === normalized;
}
