import { type PaygHold } from '@claw/shared-entitlements';

import type { VideoSettlement } from '../types/video-generation.types';

/**
 * What a paid video hold settles on: the SECONDS of clip produced, never tokens.
 * A video endpoint reports no token usage, so settling on zero tokens alone would
 * charge $0 and release the whole hold (rule 37 item 17).
 */
export function videoSettlement(hold: PaygHold, seconds: number): VideoSettlement {
  return {
    hold,
    usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
    calls: { toolCalls: 0, videoSeconds: Math.max(0, Math.floor(seconds)) },
  };
}

/**
 * A hold rebuilt from nothing but its stored reservation id, for releasing the
 * hold of an attempt whose process died. `release` sends only the id and the
 * reason; the amounts are auth-service's record, so they stay zero here.
 */
export function abandonedVideoHold(reservationId: string): PaygHold {
  return {
    metered: true,
    maxOutputTokens: 0,
    clamped: false,
    reservationId,
    heldMicroUsd: 0,
    availableAfterMicroUsd: 0,
    reason: null,
  };
}
