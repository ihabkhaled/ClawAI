import { Injectable, Logger } from '@nestjs/common';
import { ModelCapability } from '../../../common/enums/model-capability.enum';
import {
  AUDIO_MODALITY_PATTERNS,
  CAPABILITY_PROVIDER_PRIORITY,
  OCR_MODALITY_PATTERNS,
  PDF_MODALITY_PATTERNS,
  PROVIDER_CAPABILITY_MATRIX,
  VIDEO_MODALITY_PATTERNS,
  VISION_MODALITY_PATTERNS,
  WEB_SEARCH_MODALITY_PATTERNS,
} from '../constants/capability.constants';
import type { CapabilityRoutingResult } from '../types/capability.types';
import type { RoutingContext } from '../types/routing.types';

@Injectable()
export class CapabilityRouterManager {
  private readonly logger = new Logger(CapabilityRouterManager.name);

  route(context: RoutingContext): CapabilityRoutingResult | null {
    const lower = context.message.toLowerCase();
    const required = this.detectRequiredCapability(lower, context.requiresToolCalling ?? false);

    if (!required) {
      return null;
    }

    this.logger.debug(`CapabilityRouterManager: detected required capability=${required}`);

    return this.selectProviderForCapability(required, context);
  }

  detectRequiredCapability(
    lowerMessage: string,
    requiresToolCalling = false,
  ): ModelCapability | null {
    // Checked before the modality patterns on purpose. Every check below is a
    // keyword guess over user prose; this one is an explicit fact the caller
    // supplied. An agent prompt that happens to say "show me an image of the
    // architecture" must not lose its tool requirement to a substring match.
    //
    // This is also the first time CAPABILITY_PROVIDER_PRIORITY[TOOL_CALLING]
    // has been reachable — the entry existed in the matrix but nothing could
    // ever return the capability that selects it.
    if (requiresToolCalling) {
      return ModelCapability.TOOL_CALLING;
    }
    if (AUDIO_MODALITY_PATTERNS.some((p) => lowerMessage.includes(p))) {
      return ModelCapability.AUDIO_INPUT;
    }
    if (VIDEO_MODALITY_PATTERNS.some((p) => lowerMessage.includes(p))) {
      return ModelCapability.VIDEO_INPUT;
    }
    if (PDF_MODALITY_PATTERNS.some((p) => lowerMessage.includes(p))) {
      return ModelCapability.PDF_INPUT;
    }
    if (OCR_MODALITY_PATTERNS.some((p) => lowerMessage.includes(p))) {
      return ModelCapability.OCR;
    }
    if (WEB_SEARCH_MODALITY_PATTERNS.some((p) => lowerMessage.includes(p))) {
      return ModelCapability.WEB_SEARCH;
    }
    if (VISION_MODALITY_PATTERNS.some((p) => lowerMessage.includes(p))) {
      return ModelCapability.IMAGE_INPUT;
    }
    return null;
  }

  private selectProviderForCapability(
    capability: ModelCapability,
    context: RoutingContext,
  ): CapabilityRoutingResult | null {
    const priority = CAPABILITY_PROVIDER_PRIORITY.get(capability) ?? [];

    for (const providerName of priority) {
      if (!this.isProviderAvailable(providerName, context)) {
        continue;
      }
      const entry = PROVIDER_CAPABILITY_MATRIX.find((e) => e.provider === providerName);
      if (!entry) {
        continue;
      }

      this.logger.log(
        `CapabilityRouterManager: selected ${providerName}/${entry.model} for capability=${capability}`,
      );

      return {
        provider: entry.provider,
        model: entry.model,
        capability,
        reason: `capability_${capability.toLowerCase()}`,
      };
    }

    // Returning null degrades to ordinary routing rather than failing the
    // request. That is deliberate and load-bearing for TOOL_CALLING: hard-
    // filtering on a capability flag turns a data gap (a provider marked
    // unhealthy, a seed not yet backfilled) into a total agent-run outage.
    // Rank, do not filter — the run then proceeds on the best available model
    // and the drift guard reports a degraded lane rather than nothing running
    // at all.
    this.logger.warn(
      `CapabilityRouterManager: no healthy provider found for capability=${capability} — degrading to standard routing`,
    );
    return null;
  }

  private isProviderAvailable(provider: string, context: RoutingContext): boolean {
    if (provider === 'local-ollama') {
      return context.runtimeHealth?.['OLLAMA'] ?? true;
    }
    const healthMap = context.connectorHealth;
    if (!healthMap || Object.keys(healthMap).length === 0) {
      return true;
    }
    const entry = Object.entries(healthMap).find(([name]) => name === provider);
    return entry?.[1] ?? false;
  }
}
