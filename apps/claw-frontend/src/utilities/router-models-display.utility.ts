import { CostConfidence } from '@/enums/router-models.enum';
import type { RouterModel } from '@/types/router-models.types';
import type { RouterModelRowDisplay } from '@/types/use-router-models-page.types';

export function toRouterModelRowDisplay(model: RouterModel): RouterModelRowDisplay {
  return {
    id: model.id,
    provider: model.provider,
    modelKey: model.modelKey,
    displayName: model.displayName,
    isLocal: model.isLocal,
    isRouterOnly: model.isRouterOnly,
    lifecycle: model.lifecycle,
    qualityTier: model.qualityTier,
    costClass: model.costClass,
    costConfidenceLabel: costConfidenceLabel(model.costConfidence),
    privacy: model.privacySupport,
    latencyP95Ms: model.latencyP95Ms,
  };
}

function costConfidenceLabel(confidence: CostConfidence): string {
  switch (confidence) {
    case CostConfidence.EXACT:
      return 'exact';
    case CostConfidence.ESTIMATED:
      return 'est';
    case CostConfidence.UNKNOWN:
      return '?';
  }
}
