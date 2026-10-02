// When a request may ask Anthropic to cache its prompt (F093). Pure, so every
// refusal reason is a tested branch rather than a condition buried in the
// manager.
//
// Caching changes what a request COSTS: a cache write is billed at a premium over
// plain input. Every condition below exists to keep the user's hold and the
// settled charge in agreement, so a refusal here is always the safe direction —
// the request simply runs uncached on the OpenAI-compatible path, as before.

import { ANTHROPIC_PROVIDER } from '../../../common/constants/execution.constants';
import type { PromptCacheEligibilityInput } from '../types/anthropic-prompt-cache-policy.types';

export function isPromptCacheEligible(input: PromptCacheEligibilityInput): boolean {
  return (
    input.provider === ANTHROPIC_PROVIDER &&
    input.catalogEnabled &&
    !input.carriesTools &&
    !input.holdSuppliedByCaller
  );
}
