import type { NamedModelNoticeReason } from '@claw/shared-types';
import {
  generationRequestText,
  modelMatchKey,
  resolveImageCapabilityProvider,
  resolveVideoCapabilityProvider,
} from '@claw/shared-utilities';
import { NamedModelCapability } from '../../../common/enums/named-model-capability.enum';
import {
  NAMED_MODEL_ALIASES,
  NAMED_MODEL_COMPARISON_PATTERN,
  NAMED_MODEL_DIRECTIVE_PATTERN,
  NAMED_MODEL_ID_DECORATIONS,
  NAMED_MODEL_MIN_PHRASE_LENGTH,
  NAMED_MODEL_PROVIDER_DEFAULTS,
  NAMED_MODEL_SEPARATORS,
  NAMED_MODEL_SPECIALISED_ID,
  NAMED_MODEL_TAIL_CHARS,
} from '../constants/named-model-request.constants';
import type {
  NamedModelCandidate,
  NamedModelCatalogEntry,
  NamedModelMatch,
  NamedModelPhraseEntry,
  NamedModelResolution,
} from '../types/named-model-request.types';

/** How a person writes a model: lowercase, ids' separators as single spaces. */
export function normaliseModelPhrase(text: string): string {
  return text.toLowerCase().replaceAll(NAMED_MODEL_SEPARATORS, ' ').replaceAll(/\s+/gu, ' ').trim();
}

/** Cheap pre-check: a model can only be named after a directive word or "@". */
export function hasModelDirective(message: string): boolean {
  return new RegExp(NAMED_MODEL_DIRECTIVE_PATTERN.source, 'u').test(message.toLowerCase());
}

/** What a catalog model is: a picture model, a video model, or a chat model. */
export function namedModelCapabilityOf(candidate: NamedModelCandidate): NamedModelCapability {
  if (resolveImageCapabilityProvider(candidate.provider, candidate.providerModelId) !== undefined) {
    return NamedModelCapability.IMAGE;
  }
  return resolveVideoCapabilityProvider(candidate.provider, candidate.providerModelId) === undefined
    ? NamedModelCapability.CHAT
    : NamedModelCapability.VIDEO;
}

/** The names a catalog model answers to: its id as written, minus date/preview decorations. */
function catalogPhrases(candidate: NamedModelCandidate): string[] {
  const id = modelMatchKey(candidate.provider, candidate.providerModelId)
    .split('/')
    .slice(1)
    .join('/');
  const variants = new Set<string>();
  let phrase = normaliseModelPhrase(id);
  variants.add(phrase);
  for (const decoration of NAMED_MODEL_ID_DECORATIONS) {
    phrase = phrase.replace(decoration, '');
    variants.add(phrase);
  }
  return [...variants].filter(
    (variant) =>
      variant.length >= NAMED_MODEL_MIN_PHRASE_LENGTH &&
      (/\d/u.test(variant) || variant.includes(' ')),
  );
}

function phraseEntries(candidates: readonly NamedModelCandidate[]): NamedModelPhraseEntry[] {
  const entries: NamedModelPhraseEntry[] = [];
  for (const candidate of candidates) {
    for (const phrase of catalogPhrases(candidate)) {
      entries.push({
        phrase,
        provider: candidate.provider,
        model: candidate.providerModelId,
        modelPattern: null,
      });
    }
  }
  for (const alias of NAMED_MODEL_ALIASES) {
    for (const phrase of alias.phrases) {
      entries.push({
        phrase: normaliseModelPhrase(phrase),
        provider: alias.provider,
        model: null,
        modelPattern: alias.modelPattern ?? null,
      });
    }
  }
  // Longest phrase first, a specific catalog model before an alias of equal length.
  return entries.sort(
    (a, b) =>
      b.phrase.length - a.phrase.length || Number(a.model === null) - Number(b.model === null),
  );
}

/** What follows each directive in the request, ready to be compared with a phrase. */
function directiveTails(request: string): string[] {
  const tails: string[] = [];
  for (const match of request.matchAll(NAMED_MODEL_DIRECTIVE_PATTERN)) {
    const start = (match.index ?? 0) + match[0].length;
    tails.push(normaliseModelPhrase(request.slice(start, start + NAMED_MODEL_TAIL_CHARS)));
  }
  return tails;
}

function endsAtWordBoundary(tail: string, phrase: string): boolean {
  const next = tail.at(phrase.length);
  return next === undefined || !/[\p{L}\p{N}]/u.test(next);
}

/**
 * The model a prompt asks for by name: "use nano banana to make a poster",
 * "ask grok about …", "@veo a sunset". The name must follow a directive word,
 * so prose that merely mentions a model never routes, and a comparison ("GPT
 * vs Gemini") or a negated clause ("don't use Grok") is ignored. Names come
 * from the live catalog plus a few aliases that differ from the ids
 * (`NAMED_MODEL_ALIASES`); the longest name wins.
 */
export function findNamedModelRequest(
  message: string,
  candidates: readonly NamedModelCandidate[],
): NamedModelMatch | null {
  // A directive is not a generation request: only negation and pasted material are filtered.
  const request = generationRequestText(message, { dropMentions: false }).toLowerCase();
  if (request.length === 0 || NAMED_MODEL_COMPARISON_PATTERN.test(request)) return null;
  const tails = directiveTails(request);
  if (tails.length === 0) return null;
  for (const entry of phraseEntries(candidates)) {
    if (
      tails.some((tail) => tail.startsWith(entry.phrase) && endsAtWordBoundary(tail, entry.phrase))
    ) {
      return {
        phrase: entry.phrase,
        provider: entry.provider,
        model: entry.model,
        modelPattern: entry.modelPattern,
      };
    }
  }
  return null;
}

function preferredFirst(
  pool: readonly NamedModelCandidate[],
  provider: string,
): NamedModelCandidate | undefined {
  const fallback = NAMED_MODEL_PROVIDER_DEFAULTS.get(provider);
  // Proven first, a general chat model before a coding/agent variant, then the
  // newest id (numeric-aware: "grok-4.10" is newer than "grok-4.9").
  const sorted = [...pool].sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) ||
      Number(NAMED_MODEL_SPECIALISED_ID.test(a.providerModelId)) -
        Number(NAMED_MODEL_SPECIALISED_ID.test(b.providerModelId)) ||
      b.providerModelId.localeCompare(a.providerModelId, undefined, { numeric: true }),
  );
  return (
    sorted.find(
      (candidate) =>
        fallback !== undefined &&
        modelMatchKey(candidate.provider, candidate.providerModelId) ===
          modelMatchKey(provider, fallback),
    ) ?? sorted.at(0)
  );
}

/**
 * Turns a named model into something routing can execute.
 *
 * - A phrase naming one catalog model resolves to it. A picture or video model
 *   is honoured for any request; a chat model is honoured unless the request
 *   wants a picture or video (it cannot make one, and normal routing can).
 * - A marketing alias ("nano banana") resolves to the provider's models its
 *   pattern selects.
 * - A provider-level name ("use grok") resolves to that provider's model that
 *   fits what is asked: a picture model for a picture request, a video model
 *   for a video request, otherwise a chat model (the provider default first).
 *   No fitting model means null, and normal routing carries on.
 */
export function resolveNamedModel(
  match: NamedModelMatch,
  candidates: readonly NamedModelCandidate[],
  wanted: NamedModelCapability,
): NamedModelResolution | null {
  const pool = candidates.filter((candidate) => candidate.provider === match.provider);
  const done = (candidate: NamedModelCandidate | undefined): NamedModelResolution | null =>
    candidate === undefined
      ? null
      : {
          provider: candidate.provider,
          model: candidate.providerModelId,
          capability: namedModelCapabilityOf(candidate),
          phrase: match.phrase,
        };
  if (match.model !== null) {
    const exact = pool.find((candidate) => candidate.providerModelId === match.model);
    const capability = exact === undefined ? undefined : namedModelCapabilityOf(exact);
    return capability === undefined ||
      (capability === NamedModelCapability.CHAT && wanted !== NamedModelCapability.CHAT)
      ? null
      : done(exact);
  }
  const selected =
    match.modelPattern === null
      ? pool
      : pool.filter((candidate) =>
          match.modelPattern?.test(candidate.providerModelId.toLowerCase()),
        );
  const fitting = selected.filter((candidate) => namedModelCapabilityOf(candidate) === wanted);
  // A marketing alias means what it says whatever is asked ("nano banana" is a picture model).
  const pickFrom = fitting.length > 0 || match.modelPattern === null ? fitting : selected;
  return done(preferredFirst(pickFrom, match.provider));
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[|\\{}()[\]^$+*?.]/gu, String.raw`\$&`);
}

/**
 * The request with the directive removed: "use nano banana to make a poster of
 * cats" becomes "Make a poster of cats", "ask grok about relativity" becomes
 * "Tell me about relativity". The target model should read the task, not the
 * routing instruction that picked it. Null when nothing would change or
 * nothing would be left ("use grok").
 */
export function stripNamedModelDirective(message: string, phrase: string): string | null {
  const name = phrase
    .split(' ')
    .filter((word) => word.length > 0)
    .map(escapeRegExp)
    .join(String.raw`[-_./:\s]+`);
  const pattern = new RegExp(
    String.raw`(?:${NAMED_MODEL_DIRECTIVE_PATTERN.source})(?:the\s+)?(?:model\s+)?${name}(?![\p{L}\p{N}])(?:\s*(?:to(?![\p{L}\p{N}])|:|,|-|—))?`,
    'iu',
  );
  const found = pattern.exec(message);
  if (found === null) return null;
  const rest = `${message.slice(0, found.index)} ${message.slice(found.index + found[0].length)}`
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/\s+([.,!?;:])/gu, '$1')
    .replaceAll(/^[\s,;:-]+|[\s,;:-]+$/gu, '')
    .replaceAll(/\s+(?:and|then|please)$/giu, '');
  if (rest.length === 0) return null;
  const sentence = /^about(?![\p{L}\p{N}])/iu.test(rest) ? `Tell me ${rest}` : rest;
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}`;
}

/**
 * Why a named model cannot answer: nothing of its provider is set up, it has no
 * model for what is asked, the model fitting the ask is outside the user's plan,
 * or its connector is down.
 */
export function namedModelUnavailableReason(
  match: NamedModelMatch,
  catalog: readonly NamedModelCatalogEntry[],
  wanted: NamedModelCapability,
): NamedModelNoticeReason {
  const pool = catalog.filter((entry) => entry.provider === match.provider);
  if (pool.length === 0) return 'NOT_CONFIGURED';
  const fitting = resolveNamedModel(match, pool, wanted);
  if (fitting === null) return 'NO_FITTING_MODEL';
  const entry = pool.find(
    (candidate) =>
      candidate.provider === fitting.provider && candidate.providerModelId === fitting.model,
  );
  return entry?.allowed === false ? 'NOT_IN_PLAN' : 'CONNECTOR_DOWN';
}
