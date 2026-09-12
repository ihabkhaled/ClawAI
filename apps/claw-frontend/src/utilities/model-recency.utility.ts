import {
  MODEL_DATE_SUFFIX_PATTERNS,
  MODEL_VERSION_DIGITS,
  PROVIDER_PRIMARY_MODEL_FAMILY,
} from '@/constants/model-recency.constants';
import { ModelRecencyTier } from '@/enums/model-recency-tier.enum';
import type { ModelRecencyRank, ModelSelection } from '@/types';

/**
 * The leading version number of one token: `5` from `5`, `5.1` from `5.1`,
 * `4` from `4o`. Returns null when the token does not start with a digit.
 *
 * Written as a scan rather than a regex — see MODEL_VERSION_DIGITS for why.
 */
function readLeadingVersion(token: string): string | null {
  let index = 0;
  while (index < token.length && MODEL_VERSION_DIGITS.includes(token[index] ?? '')) {
    index += 1;
  }
  if (index === 0) {
    return null;
  }
  // At most one dotted group, so `1.2.3` reads as 1.2 rather than an invalid
  // number — a model key has never needed a third component.
  if (token[index] === '.' && MODEL_VERSION_DIGITS.includes(token[index + 1] ?? '')) {
    let fraction = index + 1;
    while (fraction < token.length && MODEL_VERSION_DIGITS.includes(token[fraction] ?? '')) {
      fraction += 1;
    }
    return token.slice(0, fraction);
  }
  return token.slice(0, index);
}

/**
 * Strip a trailing release-date suffix, and say whether there was one.
 *
 * Providers publish two shapes for the same idea — OpenAI's
 * `gpt-5.1-2025-11-13` and Anthropic's `claude-opus-4-5-20251101` — and both
 * mean "the pinned snapshot of a model that also has a plain alias". The alias
 * is what almost everyone wants; the snapshot exists for reproducibility.
 */
function splitDateSuffix(modelKey: string): { base: string; isDatedSnapshot: boolean } {
  for (const pattern of MODEL_DATE_SUFFIX_PATTERNS) {
    const match = pattern.exec(modelKey);
    if (match !== null) {
      return { base: modelKey.slice(0, match.index), isDatedSnapshot: true };
    }
  }
  return { base: modelKey, isDatedSnapshot: false };
}

/**
 * The version a model key advertises, as a comparable number.
 *
 * Two styles have to work: dotted (`gpt-5.1` → 5.1) and hyphenated
 * (`claude-opus-4-5` → 4.5, because Anthropic writes 4.5 as `4-5`).
 *
 * It reads the FIRST run of numeric tokens and stops at the next word. That
 * matters for `gpt-3.5-turbo-16k`: without stopping, `16k` would be folded into
 * the version and a 2023 model would outrank everything. `gpt-4o` parses as 4
 * from its leading digits — 4o and 4 then tie and fall through to the name
 * comparison, which is a fair answer rather than a wrong one.
 *
 * Returns null when a key carries no version at all (`aqa`, `mistral`), which
 * sorts it below anything versioned rather than pretending it is version 0.
 *
 * Known, accepted imprecision: a parameter size that STARTS with digits joins
 * the run, so `gemma-4-31b` reads as 4.31 rather than 4. It only ever reorders
 * variants inside one product line — the larger one first — and never moves a
 * model between lines, so it is not worth a size-unit blocklist that would go
 * stale the first time a vendor invents a new suffix.
 */
export function parseModelVersion(modelKey: string): number | null {
  const { base } = splitDateSuffix(modelKey.toLowerCase());
  const tokens = base.split(/[-_/]/u).filter((token) => token.length > 0);

  const numericRun: string[] = [];
  for (const token of tokens) {
    const leading = readLeadingVersion(token);
    if (leading === null) {
      // Only break the run once it has started; leading words like "claude"
      // and "gpt" are the model's name, not a gap in its version.
      if (numericRun.length > 0) {
        break;
      }
      continue;
    }
    numericRun.push(leading);
  }

  if (numericRun.length === 0) {
    return null;
  }
  // ['4','5'] -> 4.5 ; ['5.1'] -> 5.1 ; ['5'] -> 5
  const major = numericRun[0] ?? '';
  const rest = numericRun.slice(1);
  const joined = rest.length > 0 && !major.includes('.') ? `${major}.${rest.join('')}` : major;
  const parsed = Number.parseFloat(joined);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * How a model should rank in the picker.
 *
 * Two tiers only, because every extra tier is a judgement nobody can check:
 *
 *   0 — the alias a person should normally pick (`claude-opus-5`, `gpt-5.2`)
 *   1 — a pinned dated snapshot of something already listed above it
 *
 * Previews deliberately stay in tier 0 and are ranked by their version, because
 * a `gemini-3.1-pro-preview` genuinely IS newer than a stable `gemini-2.5-pro`
 * — and "latest first" is the thing being asked for. Burying it would answer a
 * different question.
 */
export function rankModelRecency(modelKey: string): ModelRecencyRank {
  const { isDatedSnapshot } = splitDateSuffix(modelKey.toLowerCase());
  return {
    tier: isDatedSnapshot ? ModelRecencyTier.PINNED_SNAPSHOT : ModelRecencyTier.CANONICAL,
    version: parseModelVersion(modelKey),
  };
}

/**
 * Newest first, with the everyday alias above its pinned snapshots.
 *
 * Replaces a plain `localeCompare` on the display name, which put "Chatgpt
 * Image Latest" and "GPT 3.5 Turbo" above "GPT 5.4" — alphabetical order is
 * close to reverse-chronological for model names, so the oldest thing a
 * provider still serves was reliably first.
 *
 * The name comparison survives as the final tie-break, so the order is total
 * and stable: two models that rank identically never swap between renders.
 */
/**
 * True when a model belongs to its provider's primary product line.
 *
 * Read off the key rather than a per-model flag, because the key is the only
 * thing that reliably carries the line: `models/gemini-3.7-flash` is Gemini,
 * `models/gemma-4-31b-it` is not.
 */
function isPrimaryFamily(selection: ModelSelection): boolean {
  const family = PROVIDER_PRIMARY_MODEL_FAMILY[selection.provider];
  if (family === undefined) {
    return true;
  }
  const key = selection.model.toLowerCase();
  const base = key.includes('/') ? (key.split('/').pop() ?? key) : key;
  return base.startsWith(family);
}

export function compareModelsByRecency(left: ModelSelection, right: ModelSelection): number {
  // The provider's own line first. Versions only mean something within a line:
  // Gemma 4 is not newer than Gemini 3.7, but a numeric sort says it is.
  const leftPrimary = isPrimaryFamily(left);
  const rightPrimary = isPrimaryFamily(right);
  if (leftPrimary !== rightPrimary) {
    return leftPrimary ? -1 : 1;
  }

  const leftRank = rankModelRecency(left.model);
  const rightRank = rankModelRecency(right.model);

  if (leftRank.tier !== rightRank.tier) {
    return leftRank.tier - rightRank.tier;
  }
  if (leftRank.version !== rightRank.version) {
    // An unversioned model sorts below every versioned one.
    if (leftRank.version === null) {
      return 1;
    }
    if (rightRank.version === null) {
      return -1;
    }
    return rightRank.version - leftRank.version;
  }
  return left.displayName.localeCompare(right.displayName);
}
