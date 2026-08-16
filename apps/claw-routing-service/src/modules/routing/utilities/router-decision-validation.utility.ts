import {
  DECISION_REJECTION_INELIGIBLE,
  DECISION_REJECTION_NO_JSON,
  DECISION_REJECTION_OVERSIZED,
  DECISION_REJECTION_SCHEMA,
  DECISION_REJECTION_UNPARSABLE,
  MAX_ROUTER_RAW_LENGTH,
  REPAIR_HINT_RAW_LIMIT,
  ROUTER_REPAIR_INSTRUCTION,
  routerDecisionSchema,
} from '../constants/router-decision-schema.constants';
import type { DecisionValidationResult } from '../types/router-inference.types';

/**
 * Extracts the first balanced JSON object from a raw answer.
 *
 * Models wrap JSON in prose and markdown fences, and a greedy `/\{[\s\S]*\}/`
 * over-matches the moment the prose that follows contains a brace — it swallows
 * everything to the last one and yields unparsable text. Scanning for balance
 * (while respecting string literals and escapes) returns the actual object.
 */
export function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const char = raw.charAt(index);

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return null;
}

/**
 * Validates a raw router answer against the strict schema and the eligible set.
 *
 * The eligibility check is the important one: hard policy filters run before
 * ranking, so a model naming a deployment outside `eligibleDeploymentIds` has
 * either hallucinated an id or tried to reach past a privacy/entitlement filter.
 * Either way the answer is refused rather than trusted — the model's memory is
 * never allowed to override the verified candidate set.
 */
export function validateRouterDecision(
  raw: string,
  eligibleDeploymentIds: readonly string[],
): DecisionValidationResult {
  if (raw.length > MAX_ROUTER_RAW_LENGTH) {
    return { valid: false, rejection: DECISION_REJECTION_OVERSIZED };
  }

  const candidate = extractJsonObject(raw);
  if (candidate === null) {
    return { valid: false, rejection: DECISION_REJECTION_NO_JSON };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { valid: false, rejection: DECISION_REJECTION_UNPARSABLE };
  }

  const result = routerDecisionSchema.safeParse(parsed);
  if (!result.success) {
    return { valid: false, rejection: DECISION_REJECTION_SCHEMA };
  }

  if (!eligibleDeploymentIds.includes(result.data.deploymentId)) {
    return { valid: false, rejection: DECISION_REJECTION_INELIGIBLE };
  }

  return { valid: true, decision: result.data };
}

/**
 * Builds the single repair prompt suffix.
 *
 * The malformed answer is echoed back, truncated, because a model shown its own
 * failure corrects it far more often than one told merely to try again.
 */
export function buildRepairHint(raw: string): string {
  return `${ROUTER_REPAIR_INSTRUCTION}\n\nYour previous answer:\n${raw.slice(0, REPAIR_HINT_RAW_LIMIT)}`;
}
