import { Injectable, Logger } from '@nestjs/common';

import {
  AiActionKind,
  AiActionMode,
  AiActionPrivacyClass,
} from '../../../common/enums/ai-action-kind.enum';
import {
  AI_ACTION_CAPABILITY_HINTS,
  AI_ACTION_PREFERS_LOCAL,
} from '../constants/ai-action-routes.constants';
import type { AutoRouterResolution, ModelChoice } from '../types/ai-action.types';

import { ModelCatalogResolverManager } from './model-catalog-resolver.manager';

@Injectable()
export class AutoRouterManager {
  private readonly logger = new Logger(AutoRouterManager.name);

  constructor(private readonly resolver: ModelCatalogResolverManager) {}

  // Resolves a model selection into a concrete primary + fallback chain.
  //   preferredModel  → MANUAL mode, that model is primary, no fallback
  //   privacy=PRIVATE → AUTO mode, local-first; cloud entries stripped
  //   else            → AUTO mode, resolver picks based on action kind hints
  async resolve(input: {
    actionKind: AiActionKind;
    privacyClass: AiActionPrivacyClass;
    preferredModel?: ModelChoice;
  }): Promise<AutoRouterResolution> {
    if (input.preferredModel !== undefined) {
      return {
        mode: AiActionMode.MANUAL,
        primary: input.preferredModel,
        fallbackChain: [],
      };
    }
    const preferLocal =
      input.privacyClass === AiActionPrivacyClass.PRIVATE ||
      AI_ACTION_PREFERS_LOCAL[input.actionKind];
    const hints = AI_ACTION_CAPABILITY_HINTS[input.actionKind];
    const defaults = await this.resolver.resolveDefaults({ preferLocal, capabilityHints: hints });
    if (defaults.primary === null) {
      throw new Error('AutoRouterManager: no installed local model and no connected cloud provider');
    }
    const fallbackChain =
      input.privacyClass === AiActionPrivacyClass.PRIVATE
        ? this.filterLocalOnly(defaults.fallbackChain)
        : defaults.fallbackChain;
    if (
      input.privacyClass === AiActionPrivacyClass.PRIVATE &&
      defaults.primary.provider !== 'local-ollama'
    ) {
      this.logger.warn(
        `auto-router: privacy=PRIVATE but no local model available — refusing cloud fallback`,
      );
      throw new Error(
        'AutoRouterManager: privacy=PRIVATE requires an installed local model; none found',
      );
    }
    return {
      mode: AiActionMode.AUTO,
      primary: defaults.primary,
      fallbackChain,
    };
  }

  private filterLocalOnly(chain: ModelChoice[]): ModelChoice[] {
    return chain.filter((entry) => entry.provider === 'local-ollama');
  }
}
