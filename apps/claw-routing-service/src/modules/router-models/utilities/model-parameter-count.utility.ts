import { ParameterCountOrigin } from '../../../common/enums';
import {
  BILLIONS_PER_UNIT,
  MAX_PARAMETER_COUNT_BILLIONS,
  NAMED_ACTIVE_PARAMETER_TOKEN,
  NAMED_EXPERT_LAYOUT,
  NAMED_TOTAL_PARAMETER_TOKEN,
  PARAMETER_NAMING_FAMILIES,
  PUBLISHED_PARAMETER_COUNT_INDEX,
  RUNTIME_ACTIVE_PATTERN,
  RUNTIME_TOTAL_PATTERN,
} from '../constants/model-parameter-count.constants';
import {
  type ParameterCount,
  type ResolvedParameterCount,
} from '../types/model-parameter-count.types';

/** Three decimals: the column is Decimal(9,3), and 135M is the smallest count shown. */
function roundBillions(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function toBillions(amount: string, unit: string): number | null {
  const scale = BILLIONS_PER_UNIT[unit.toLowerCase()];
  const value = Number(amount);
  if (scale === undefined || !Number.isFinite(value)) {
    return null;
  }
  const billions = roundBillions(value * scale);
  return billions > 0 && billions <= MAX_PARAMETER_COUNT_BILLIONS ? billions : null;
}

/** An active share only counts when it is smaller than the total it is a share of. */
function activeShare(active: number | null, total: number): number | null {
  return active !== null && active < total ? active : null;
}

/** Lower case, with the `org/` or `models/` prefix removed. The `:tag` is kept. */
export function normaliseModelKey(modelKey: string): string {
  const lower = modelKey.trim().toLowerCase();
  const slash = lower.lastIndexOf('/');
  return slash === -1 ? lower : lower.slice(slash + 1);
}

/**
 * A runtime's own size string as a count. Strict on purpose: anything that is
 * not `<number><K|M|B|T>` (with an optional `(<n><unit> active)`) is `null`,
 * never a guess, so `unknown`, `""` and `8B-Q4` leave the column empty.
 */
export function parseParameterCountText(text: string | null | undefined): ParameterCount | null {
  const [head, tail, ...extra] = (text ?? '').split('(');
  const totalMatch = RUNTIME_TOTAL_PATTERN.exec(head ?? '');
  const activeMatch = tail === undefined ? null : RUNTIME_ACTIVE_PATTERN.exec(tail);
  if (totalMatch === null || extra.length > 0 || (tail !== undefined && activeMatch === null)) {
    return null;
  }
  const total = toBillions(totalMatch[1] ?? '', totalMatch[2] ?? '');
  if (total === null) {
    return null;
  }
  const active =
    activeMatch === null ? null : toBillions(activeMatch[1] ?? '', activeMatch[2] ?? '');
  return { totalBillions: total, activeBillions: activeShare(active, total) };
}

/**
 * The count a maker's own model name states, for the families in
 * `PARAMETER_NAMING_FAMILIES` only. Two sizes in one name, an `8x7b` product, an
 * `e4b` "effective" size and a `17b-16e` expert layout all return `null`: each
 * of them is a number that is not the total.
 */
export function parseNamedParameterCount(modelKey: string): ParameterCount | null {
  const key = normaliseModelKey(modelKey);
  if (!PARAMETER_NAMING_FAMILIES.test(key) || NAMED_EXPERT_LAYOUT.test(key)) {
    return null;
  }
  const totals = new Set<number>();
  for (const [, amount, unit] of key.matchAll(NAMED_TOTAL_PARAMETER_TOKEN)) {
    const billions = toBillions(amount ?? '', unit ?? '');
    if (billions !== null) {
      totals.add(billions);
    }
  }
  const [only] = [...totals];
  if (totals.size !== 1 || only === undefined) {
    return null;
  }
  const activeMatch = NAMED_ACTIVE_PARAMETER_TOKEN.exec(key);
  const active = activeMatch === null ? null : toBillions(activeMatch[1] ?? '', 'b');
  return { totalBillions: only, activeBillions: activeShare(active, only) };
}

/** A maker-published count from `PUBLISHED_PARAMETER_COUNT_RULES`, else the name-stated one, else `null`. */
export function lookupPublishedParameterCount(modelKey: string): ResolvedParameterCount | null {
  const key = normaliseModelKey(modelKey);
  const rule = PUBLISHED_PARAMETER_COUNT_INDEX.get(key);
  if (rule !== undefined) {
    return {
      totalBillions: rule.totalBillions,
      activeBillions: rule.activeBillions ?? null,
      origin: ParameterCountOrigin.PUBLISHED_RULE,
    };
  }
  const named = parseNamedParameterCount(key);
  return named === null ? null : { ...named, origin: ParameterCountOrigin.MODEL_NAME };
}

/**
 * The count for one model, most trustworthy source first: the local runtime's own
 * report (the file it actually runs), then a maker-published rule, then the
 * maker's own name. `null` means the maker publishes no count: the picker then
 * shows the context window alone.
 */
export function resolveParameterCount(input: {
  modelKey: string;
  runtimeText?: string | null;
}): ResolvedParameterCount | null {
  const fromRuntime = parseParameterCountText(input.runtimeText);
  return fromRuntime === null
    ? lookupPublishedParameterCount(input.modelKey)
    : { ...fromRuntime, origin: ParameterCountOrigin.RUNTIME };
}
