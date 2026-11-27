import type { CaptchaKeys } from '../types/bot-check.types';

/** An integer setting inside [min, max]; anything else (absent, text, out of range) is `fallback`. */
export function parseBoundedInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const trimmed = raw?.trim() ?? '';
  const value = trimmed.length === 0 ? Number.NaN : Number(trimmed);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

/** A decimal setting inside [min, max]; anything else is `fallback`. */
export function parseBoundedNumber(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const trimmed = raw?.trim() ?? '';
  const value = trimmed.length === 0 ? Number.NaN : Number(trimmed);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/** A non-empty stored value wins; otherwise the environment value (absent = ''); both trimmed. */
export function resolveKey(
  settingValue: string | null,
  environmentValue: string | undefined,
): string {
  const stored = settingValue?.trim() ?? '';
  return stored.length > 0 ? stored : (environmentValue?.trim() ?? '');
}

/** A provider is on only when BOTH keys are known: a site key alone cannot be verified. */
export function toCaptchaKeys(siteKey: string, secretKey: string): CaptchaKeys | null {
  return siteKey.length > 0 && secretKey.length > 0 ? { siteKey, secretKey } : null;
}
