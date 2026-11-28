import {
  MODEL_SCALE_SEPARATOR,
  MODEL_SCALE_SUFFIX,
  MODEL_SIZE_PROVIDER_ALIASES,
  PARAMETER_BILLIONS_PER_TRILLION,
  RUNTIME_ACTIVE_PATTERN,
  RUNTIME_TOTAL_PATTERN,
  TOKEN_MILLIONS_ROUNDING_FLOOR,
  TOKEN_UNIT_KIBI,
  TOKEN_UNIT_MEBI,
  TOKEN_UNIT_MILLION,
  TOKEN_UNIT_THOUSAND,
} from '@/constants/model-scale.constants';
import type { TranslateFunction } from '@/types/i18n.types';
import type {
  ModelScale,
  ModelScaleSources,
  ModelScaleText,
  ModelSizeEntry,
  ModelSizeLookup,
  ParsedParameterCount,
} from '@/types/model-scale.types';

// ADR-234. Every number is formatted in Latin digits whatever the locale: the
// suffix letters (K, M, B, T) are Latin, and an Arabic-Indic digit glued to a
// Latin letter reorders unpredictably in a right-to-left row.
function numberFormat(
  locale: string | undefined,
  maximumFractionDigits: number,
): Intl.NumberFormat {
  const options = { maximumFractionDigits };
  try {
    return new Intl.NumberFormat(locale === undefined ? undefined : `${locale}-u-nu-latn`, options);
  } catch {
    return new Intl.NumberFormat(undefined, options);
  }
}

/** True when the value needs at most one decimal place. */
function isClean(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
}

/**
 * A token count as a model card quotes it: 128000 -> "128K", 2048 -> "2K",
 * 1048576 -> "1M", 1500000 -> "1.5M". A window is quoted in thousands (128000) or
 * in binary multiples (131072, 1048576); the decimal reading wins when it is
 * clean, else the binary one, so neither "131.1K" nor "125K" is ever shown.
 * Null for an unknown (null, 0, negative, NaN) count.
 */
export function formatTokenCount(
  tokens: number | null | undefined,
  locale?: string,
): string | null {
  if (tokens === null || tokens === undefined || !Number.isFinite(tokens) || tokens <= 0) {
    return null;
  }
  if (tokens < TOKEN_UNIT_THOUSAND) {
    return numberFormat(locale, 0).format(tokens);
  }
  const isMillions = tokens >= TOKEN_MILLIONS_ROUNDING_FLOOR;
  const decimal = tokens / (isMillions ? TOKEN_UNIT_MILLION : TOKEN_UNIT_THOUSAND);
  const binary = tokens / (isMillions ? TOKEN_UNIT_MEBI : TOKEN_UNIT_KIBI);
  const scaled = [decimal, binary].find(isClean) ?? decimal;
  const suffix = isMillions ? MODEL_SCALE_SUFFIX.million : MODEL_SCALE_SUFFIX.thousand;
  return `${numberFormat(locale, 1).format(scaled)}${suffix}`;
}

/** 0.135B keeps three decimals, 46.7B one, 671B none: the way a model card writes each. */
function parameterFractionDigits(billions: number): number {
  if (billions < 1) {
    return 3;
  }
  return billions < 100 ? 1 : 0;
}

/**
 * A parameter count in billions as a model card quotes it: 7.6 -> "7.6B",
 * 671 -> "671B", 0.5 -> "0.5B", 1000 -> "1T", 2400 -> "2.4T". Null for an unknown
 * (null, 0, negative, NaN) count.
 */
export function formatParameterCount(
  billions: number | null | undefined,
  locale?: string,
): string | null {
  if (billions === null || billions === undefined || !Number.isFinite(billions) || billions <= 0) {
    return null;
  }
  if (billions >= PARAMETER_BILLIONS_PER_TRILLION - 0.5) {
    const trillions = billions / PARAMETER_BILLIONS_PER_TRILLION;
    return `${numberFormat(locale, 1).format(trillions)}${MODEL_SCALE_SUFFIX.trillion}`;
  }
  return `${numberFormat(locale, parameterFractionDigits(billions)).format(billions)}${MODEL_SCALE_SUFFIX.billion}`;
}

/**
 * "671B (37B active per token)" for a mixture-of-experts model, "70B" for a dense one,
 * null when the count is unknown. For a detail row, where the room allows the active share.
 */
export function formatParameterCountDetail(
  totalBillions: number | null | undefined,
  activeBillions: number | null | undefined,
  t: TranslateFunction,
  locale?: string,
): string | null {
  const total = formatParameterCount(totalBillions, locale);
  if (total === null) {
    return null;
  }
  const active = formatParameterCount(activeBillions, locale);
  return active === null ? total : `${total} (${t('modelScale.activeNote', { value: active })})`;
}

const BILLIONS_PER_UNIT: Readonly<Record<string, number>> = {
  k: 0.000_001,
  m: 0.001,
  b: 1,
  t: PARAMETER_BILLIONS_PER_TRILLION,
};

function toBillions(amount: string | undefined, unit: string | undefined): number | null {
  const scale = unit === undefined ? undefined : BILLIONS_PER_UNIT[unit.toLowerCase()];
  const value = Number(amount);
  if (scale === undefined || !Number.isFinite(value)) {
    return null;
  }
  const billions = Math.round(value * scale * 1000) / 1000;
  return billions > 0 ? billions : null;
}

/**
 * A local runtime's size string as a count: "7.6B", "671B (37B active)", "1T",
 * "134.52M". Strict: anything else ("", "unknown", "8B-Q4") is null, never a guess.
 */
export function parseParameterCountText(
  text: string | null | undefined,
): ParsedParameterCount | null {
  const [head, tail, ...extra] = (text ?? '').split('(');
  const totalMatch = RUNTIME_TOTAL_PATTERN.exec(head ?? '');
  const activeMatch = tail === undefined ? null : RUNTIME_ACTIVE_PATTERN.exec(tail);
  if (totalMatch === null || extra.length > 0 || (tail !== undefined && activeMatch === null)) {
    return null;
  }
  const total = toBillions(totalMatch[1], totalMatch[2]);
  if (total === null) {
    return null;
  }
  const active = activeMatch === null ? null : toBillions(activeMatch[1], activeMatch[2]);
  return {
    totalBillions: total,
    activeBillions: active !== null && active < total ? active : null,
  };
}

/**
 * Merges the places a row can learn its size from. A local runtime's own string
 * beats the registry for the file it actually runs; the row's own numbers beat
 * the registry's; anything still unknown stays null.
 */
export function resolveModelScale(sources: ModelScaleSources): ModelScale {
  const runtime = parseParameterCountText(sources.runtimeParameterText);
  const entry = sources.entry;
  const total =
    runtime?.totalBillions ?? sources.parameterBillions ?? entry?.parameterCountBillions ?? null;
  const active =
    runtime === null
      ? (sources.activeParameterBillions ?? entry?.activeParameterCountBillions ?? null)
      : runtime.activeBillions;
  return {
    contextTokens: sources.contextTokens ?? entry?.contextWindowTokens ?? null,
    parameterBillions: total,
    activeParameterBillions: total === null ? null : active,
  };
}

/**
 * "1M context · 750B params", with any unknown part left out and `undefined` when
 * both are unknown (a closed model with no published window shows no label at all).
 * The title adds the active share of a mixture-of-experts model.
 */
export function buildModelScaleText(
  scale: ModelScale,
  t: TranslateFunction,
  locale?: string,
): ModelScaleText | undefined {
  const context = formatTokenCount(scale.contextTokens, locale);
  const parameters = formatParameterCount(scale.parameterBillions, locale);
  const active = formatParameterCount(scale.activeParameterBillions, locale);
  const parts = [
    context === null ? null : t('modelScale.context', { value: context }),
    parameters === null ? null : t('modelScale.parameters', { value: parameters }),
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) {
    return undefined;
  }
  const label = parts.join(MODEL_SCALE_SEPARATOR);
  const note =
    parameters !== null && active !== null ? t('modelScale.activeNote', { value: active }) : null;
  return { label, title: note === null ? label : `${label}, ${note}` };
}

/** The registry files a local group under the runtime's provider name; a cloud provider is its own. */
export function modelSizeProvider(provider: string): string {
  return MODEL_SIZE_PROVIDER_ALIASES[provider] ?? provider;
}

export function modelSizeKey(provider: string, modelKey: string): string {
  return `${modelSizeProvider(provider)}::${modelKey}`;
}

/**
 * A lookup over the size list. Tries each candidate key in order (`qwen3` then `qwen3:latest`).
 *
 * A provider the registry does not carry (it files only the providers its sync reaches) falls back to
 * another provider's row for the SAME model key, but only for the parameter count: the size of
 * `openai/gpt-oss-120b` does not depend on who hosts it, while a context window can.
 */
export function buildModelSizeLookup(entries: readonly ModelSizeEntry[]): ModelSizeLookup {
  const bySizeKey = new Map<string, ModelSizeEntry>();
  const parametersByModelKey = new Map<string, ModelSizeEntry>();
  for (const entry of entries) {
    bySizeKey.set(modelSizeKey(entry.provider, entry.modelKey), entry);
    const sharedKey = entry.modelKey.toLowerCase();
    if (entry.parameterCountBillions !== null && !parametersByModelKey.has(sharedKey)) {
      parametersByModelKey.set(sharedKey, entry);
    }
  }
  return (provider, ...modelKeys) => {
    for (const modelKey of modelKeys) {
      const found = bySizeKey.get(modelSizeKey(provider, modelKey));
      if (found !== undefined) {
        return found;
      }
    }
    for (const modelKey of modelKeys) {
      const shared = parametersByModelKey.get(modelKey.toLowerCase());
      if (shared !== undefined) {
        return { ...shared, provider, contextWindowTokens: null };
      }
    }
    return undefined;
  };
}
