import { Injectable } from '@nestjs/common';

import { ANTHROPIC_PROVIDER } from '../../../common/constants/execution.constants';
import { ModelCapabilityClient } from '../clients/model-capability.client';
import { isPromptCacheEligible } from '../utilities/anthropic-prompt-cache-policy.utility';

/**
 * Decides whether one call asks Anthropic to cache its prompt (F093).
 *
 * The catalog switch is read ONLY for Anthropic, so every other provider costs
 * no snapshot lookup. A catalog that cannot be read answers false
 * (`ModelCapabilityClient.resolvePromptCaching` never throws and defaults off).
 */
@Injectable()
export class PromptCachePolicyService {
  constructor(private readonly modelCapability: ModelCapabilityClient) {}

  async shouldCache(args: {
    provider: string;
    model: string;
    carriesTools: boolean;
    holdSuppliedByCaller: boolean;
  }): Promise<boolean> {
    if (args.provider !== ANTHROPIC_PROVIDER) {
      return false;
    }
    return isPromptCacheEligible({
      provider: args.provider,
      catalogEnabled: await this.modelCapability.resolvePromptCaching(args.provider, args.model),
      carriesTools: args.carriesTools,
      holdSuppliedByCaller: args.holdSuppliedByCaller,
    });
  }
}
