import {
  LEARNED_SAMPLING_REJECTION_MAX_ENTRIES,
  LEARNED_SAMPLING_REJECTION_TTL_MS,
} from '../constants/sampling-parameter.constants';

/**
 * Remembers which model refused which sampling parameter, so the request
 * builders leave it out up front instead of learning it from a 400 every turn.
 *
 * Keyed on the model id, not the provider: the same Claude model is reachable
 * through the native Messages route and the OpenAI-compatible one and is
 * equally strict on both (same reasoning as `modelRejectsSamplingParams`).
 *
 * Process-wide and in memory, with a TTL so a provider that restores the
 * parameter gets it back the next day. Each replica learns on its own; that
 * costs one silently retried call per model per replica per TTL, never a
 * visible failure.
 */
export class SamplingParameterSupportManager {
  private static readonly learned = new Map<string, number>();

  /** Test-only reset of the process-wide learned rejections. */
  static forgetAll(): void {
    SamplingParameterSupportManager.learned.clear();
  }

  record(model: string, parameter: string, now: number = Date.now()): void {
    const learned = SamplingParameterSupportManager.learned;
    const key = SamplingParameterSupportManager.key(model, parameter);
    if (learned.size >= LEARNED_SAMPLING_REJECTION_MAX_ENTRIES && !learned.has(key)) {
      const oldest = learned.keys().next();
      if (oldest.done !== true) {
        learned.delete(oldest.value);
      }
    }
    learned.set(key, now + LEARNED_SAMPLING_REJECTION_TTL_MS);
  }

  rejects(model: string, parameter: string, now: number = Date.now()): boolean {
    const learned = SamplingParameterSupportManager.learned;
    const key = SamplingParameterSupportManager.key(model, parameter);
    const expiresAt = learned.get(key);
    if (expiresAt === undefined) {
      return false;
    }
    if (expiresAt <= now) {
      learned.delete(key);
      return false;
    }
    return true;
  }

  private static key(model: string, parameter: string): string {
    return `${model.trim().toLowerCase()}|${parameter}`;
  }
}
