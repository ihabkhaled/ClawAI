import { POLICY_WEIGHT_DIMENSIONS, POLICY_WEIGHTS_SUM_TOLERANCE } from '@/constants';

type ValidationOk = { ok: true; weights: Record<string, number> };
type ValidationFail = { ok: false; errorKey: string };

export function parsePolicyWeightsJson(input: string): ValidationOk | ValidationFail {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: true, weights: {} };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, errorKey: 'routing.weightsJsonError.invalidJson' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errorKey: 'routing.weightsJsonError.notAnObject' };
  }
  const map = parsed as Record<string, unknown>;
  const weights: Record<string, number> = {};
  for (const dim of POLICY_WEIGHT_DIMENSIONS) {
    const value = map[dim];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return { ok: false, errorKey: 'routing.weightsJsonError.missingDimension' };
    }
    weights[dim] = value;
  }
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > POLICY_WEIGHTS_SUM_TOLERANCE) {
    return { ok: false, errorKey: 'routing.weightsJsonError.sumNotOne' };
  }
  return { ok: true, weights };
}

export function formatPolicyWeightsJson(config: Record<string, unknown> | undefined): string {
  if (config === undefined) {
    return '';
  }
  const value = config['weightsJson'];
  if (value === undefined || value === null || typeof value !== 'object') {
    return '';
  }
  return JSON.stringify(value, null, 2);
}
