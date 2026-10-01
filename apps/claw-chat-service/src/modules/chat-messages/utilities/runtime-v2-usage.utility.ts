import { RUNTIME_V2_USAGE_EVENT } from '../constants/runtime-v2-usage.constants';
import type { RuntimeV2UsageEventDraft } from '../types/runtime-v2-usage.types';

/**
 * Builds the usage event, or nothing when the amount is not a clean integer.
 *
 * Zero is a real cost (a free call) and is kept. A float, a negative, NaN or an
 * unsafe integer is a defect upstream, and the safe response to a defect on a
 * money field is to publish nothing rather than a rounded guess.
 */
export function buildRuntimeV2UsageEvent(costMicros: number): RuntimeV2UsageEventDraft | null {
  return Number.isSafeInteger(costMicros) && costMicros >= 0
    ? { type: RUNTIME_V2_USAGE_EVENT, payload: { costMicros } }
    : null;
}
