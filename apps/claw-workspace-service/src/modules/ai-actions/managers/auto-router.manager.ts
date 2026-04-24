import { Injectable } from '@nestjs/common';

import {
  AiActionKind,
  AiActionMode,
  AiActionPrivacyClass,
} from '../../../common/enums/ai-action-kind.enum';
import {
  AI_ACTION_DEFAULT_ROUTES,
  LOCAL_FALLBACK_CHAIN,
} from '../constants/ai-action-routes.constants';
import type { AutoRouterResolution, ModelChoice } from '../types/ai-action.types';

@Injectable()
export class AutoRouterManager {
  /**
   * Resolves a model selection into a concrete primary + fallback chain.
   * - If `preferredModel` is supplied: returns MANUAL mode with the preferred
   *   model as primary; fallback chain is empty (manual pick == user's choice
   *   is law).
   * - Else: returns AUTO mode using the per-action-kind default route. If
   *   privacyClass is PRIVATE, the chain is filtered to local-only models.
   */
  resolve(input: {
    actionKind: AiActionKind;
    privacyClass: AiActionPrivacyClass;
    preferredModel?: ModelChoice;
  }): AutoRouterResolution {
    if (input.preferredModel !== undefined) {
      return {
        mode: AiActionMode.MANUAL,
        primary: input.preferredModel,
        fallbackChain: [],
      };
    }

    const base = AI_ACTION_DEFAULT_ROUTES[input.actionKind];
    const chain =
      input.privacyClass === AiActionPrivacyClass.PRIVATE ? this.filterLocalOnly(base) : base;

    const primary = chain[0];
    if (primary === undefined) {
      // Privacy-class locked us out of everything — fall back to local-only
      // chain hard-coded in constants.
      const fallback = LOCAL_FALLBACK_CHAIN[0];
      if (fallback === undefined) {
        throw new Error('AutoRouterManager: no models available after filtering');
      }
      return {
        mode: AiActionMode.AUTO,
        primary: fallback,
        fallbackChain: LOCAL_FALLBACK_CHAIN.slice(1),
      };
    }
    return {
      mode: AiActionMode.AUTO,
      primary,
      fallbackChain: chain.slice(1),
    };
  }

  private filterLocalOnly(chain: ModelChoice[]): ModelChoice[] {
    return chain.filter((entry) => entry.provider === 'local-ollama');
  }
}
