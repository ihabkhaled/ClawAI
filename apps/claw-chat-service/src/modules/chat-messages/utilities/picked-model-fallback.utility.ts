import {
  BusinessException,
  ProviderCreditExhaustedException,
  ProviderRateLimitedException,
} from '../../../common/errors';
import {
  PICKED_MODEL_CANCELLED_CODE,
  PICKED_MODEL_MAX_FALLBACKS,
  PICKED_MODEL_MAX_SUGGESTIONS,
  PICKED_MODEL_NON_SUBSTITUTABLE_STATUSES,
  PICKED_MODEL_PROVIDER_WIDE_STATUSES,
  PICKED_MODEL_ROUTING_MODE,
} from '../constants/picked-model-fallback.constants';
import type { MessageRoutedData } from '../types/execution.types';
import type {
  PickedModelCandidate,
  PickedModelFallbackNotice,
  PickedModelSubstitute,
  SuggestedModel,
} from '../types/picked-model-fallback.types';

function pairKey(provider: string, model: string): string {
  return `${provider}/${model}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toSubstitute(value: unknown): PickedModelSubstitute | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const provider = record['provider'];
  const model = record['model'];
  if (!isNonEmptyString(provider) || !isNonEmptyString(model)) {
    return null;
  }
  return {
    provider,
    model,
    sameProvider: record['sameProvider'] === true,
    // Anything but an explicit `false` is treated as costlier: the label is
    // cheap, a silent upgrade is not.
    costlier: record['costlier'] !== false,
  };
}

/**
 * `pickedModelSubstitutes` from a message.routed payload, or undefined when the
 * field is absent or carries nothing usable. Malformed entries are dropped one
 * by one rather than failing the turn.
 */
export function parsePickedModelSubstitutes(raw: unknown): PickedModelSubstitute[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const parsed = raw
    .map((entry) => toSubstitute(entry))
    .filter((entry): entry is PickedModelSubstitute => entry !== null);
  return parsed.length === 0 ? undefined : parsed;
}

export function isPickedModelTurn(payload: MessageRoutedData): boolean {
  return payload.routingMode === PICKED_MODEL_ROUTING_MODE;
}

/**
 * The pick, then at most `PICKED_MODEL_MAX_FALLBACKS` substitutes. Duplicates
 * of the pick are dropped; without substitutes this is exactly the old
 * one-candidate chain.
 */
export function pickedModelCandidateChain(payload: MessageRoutedData): PickedModelCandidate[] {
  const pickKey = pairKey(payload.selectedProvider, payload.selectedModel);
  // Every named substitute is a candidate; the loop tries at most
  // PICKED_MODEL_MAX_FALLBACKS of them (skipping a provider that already failed
  // as a whole), so the cap counts real attempts, not list positions.
  const substitutes = (payload.pickedModelSubstitutes ?? [])
    .filter((entry) => pairKey(entry.provider, entry.model) !== pickKey)
    .map((entry) => ({ provider: entry.provider, model: entry.model, substitute: entry }));
  return [{ provider: payload.selectedProvider, model: payload.selectedModel }, ...substitutes];
}

/**
 * True when another model could plausibly answer: the provider was down, timed
 * out, refused the model, ran out of ITS credit, rate-limited us, returned an
 * error body, or rejected a parameter even after the resend. False for the
 * user's own refusals (credit 402, plan/exposure 403, our quota 429) and for a
 * user stop - those must reach the user as themselves.
 */
export function isSubstitutableFailure(error: unknown): boolean {
  if (!(error instanceof BusinessException)) {
    return true;
  }
  // The PROVIDER rate-limited us upstream: a different model can still answer.
  // (Our own quota 429s are plain BusinessExceptions and stay refusals.)
  if (error instanceof ProviderRateLimitedException) {
    return true;
  }
  if (error.code === PICKED_MODEL_CANCELLED_CODE) {
    return false;
  }
  return !PICKED_MODEL_NON_SUBSTITUTABLE_STATUSES.has(error.getStatus());
}

/**
 * Up to `PICKED_MODEL_MAX_SUGGESTIONS` models to offer after everything failed:
 * the substitutes routing ranked, minus every model already tried this turn,
 * cheaper-or-equal ones first (a costlier one is only offered when nothing
 * else is left, and the user still chooses it by hand).
 */
export function suggestedModelsAfterFailure(
  payload: MessageRoutedData,
  tried: ReadonlyArray<{ provider: string; model: string }>,
  failedProviders: ReadonlySet<string> = new Set(),
): SuggestedModel[] {
  const triedKeys = new Set(tried.map((entry) => pairKey(entry.provider, entry.model)));
  triedKeys.add(pairKey(payload.selectedProvider, payload.selectedModel));
  // A provider that failed as a whole (down, out of credit) is not offered again.
  const remaining = (payload.pickedModelSubstitutes ?? []).filter(
    (entry) =>
      !triedKeys.has(pairKey(entry.provider, entry.model)) &&
      !failedProviders.has(entry.provider.toUpperCase()),
  );
  const ordered = [
    ...remaining.filter((entry) => !entry.costlier),
    ...remaining.filter((entry) => entry.costlier),
  ];
  return ordered
    .slice(0, PICKED_MODEL_MAX_SUGGESTIONS)
    .map((entry) => ({ provider: entry.provider, model: entry.model }));
}

/**
 * Spread into a successful response: set only when a SUBSTITUTE answered a
 * picked-model turn (candidate index > 0), so the bubble can say which model
 * failed and which one answered. Empty for the pick itself and for AUTO.
 */
export function pickedModelFallbackPart(
  payload: MessageRoutedData,
  candidate: { provider: string; model: string },
  index: number,
): { pickedModelFallback?: PickedModelFallbackNotice } {
  if (!isPickedModelTurn(payload) || index === 0) {
    return {};
  }
  const substitute = (payload.pickedModelSubstitutes ?? []).find(
    (entry) => entry.provider === candidate.provider && entry.model === candidate.model,
  );
  return {
    pickedModelFallback: {
      originalProvider: payload.selectedProvider,
      originalModel: payload.selectedModel,
      costlier: substitute?.costlier !== false,
    },
  };
}

/**
 * The English sentence stored with an all-failed picked-model turn (the
 * frontend replaces it with the translated `chat.errors.pickedModelFailed`).
 * Names the pick and how many substitutes were tried; never provider text.
 */
export function describePickedModelFailure(
  payload: MessageRoutedData,
  attempts: ReadonlyArray<unknown>,
  baseMessage: string,
): string {
  const substitutesTried = Math.max(0, attempts.length - 1);
  const pick = `${payload.selectedProvider}/${payload.selectedModel}`;
  if (substitutesTried === 0) {
    return baseMessage;
  }
  return `${pick} failed, and ${String(substitutesTried)} substitute model${substitutesTried === 1 ? '' : 's'} could not answer either.`;
}

/** `{ pickedModelSubstitutes }` when the event carries usable ones, else `{}`. */
export function pickedModelSubstitutesField(raw: unknown): {
  pickedModelSubstitutes?: PickedModelSubstitute[];
} {
  const pickedModelSubstitutes = parsePickedModelSubstitutes(raw);
  return pickedModelSubstitutes === undefined ? {} : { pickedModelSubstitutes };
}

/**
 * The whole PROVIDER failed (down, overloaded, out of credit, rate limited, or
 * unreachable), so another model of it would fail the same way. A model-level
 * failure (404 unknown model, 400 bad request) is not provider-wide.
 */
export function isProviderWideFailure(error: unknown): boolean {
  if (
    error instanceof ProviderCreditExhaustedException ||
    error instanceof ProviderRateLimitedException
  ) {
    return true;
  }
  if (error instanceof BusinessException) {
    const upstream = Reflect.get(error, 'upstreamStatus');
    return PICKED_MODEL_PROVIDER_WIDE_STATUSES.has(
      typeof upstream === 'number' ? upstream : error.getStatus(),
    );
  }
  // A plain Error out of the transport (connection refused, DNS, timeout).
  return true;
}

/**
 * Why a substitute is not tried: the cap of PICKED_MODEL_MAX_FALLBACKS real
 * attempts is spent, or its provider already failed as a whole. Null = try it.
 */
export function pickedCandidateSkipReason(
  candidate: { provider: string },
  failedProviders: ReadonlySet<string>,
  substituteAttempts: number,
): 'cap' | 'provider' | null {
  if (substituteAttempts >= PICKED_MODEL_MAX_FALLBACKS) {
    return 'cap';
  }
  return failedProviders.has(candidate.provider.toUpperCase()) ? 'provider' : null;
}
