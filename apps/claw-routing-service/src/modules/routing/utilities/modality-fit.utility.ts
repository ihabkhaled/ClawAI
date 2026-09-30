import { RequiredModality } from '@claw/shared-types';

import { ModalityFit } from '../../../common/enums/modality-fit.enum';
import { ModalityKind } from '../../../generated/prisma';
import { MODALITY_FIT_RANK, MODALITY_FIT_RERANKED_TAG } from '../constants/modality-fit.constants';
import type { ModalityFitRanking, ModalityFitSource } from '../types/modality-fit.types';
import type { RoutableDeploymentRecord } from '../types/model-deployment.types';
import type { FallbackEntry, RoutingDecisionResult } from '../types/routing.types';

/**
 * How one deployment fits the turn's attachments (multimodal batch 8, rule 51
 * item 13). Pure.
 *
 *   - DIRECT — reads every required modality itself (the registry's synced
 *     `modalitiesIn`; for images the endpoint's `supportsVision` override
 *     wins), or the turn needs none.
 *   - TRANSFORMED — misses some, but chat-service transforms every missing
 *     one (audio → transcript, video → frames + transcript, image → helper
 *     vision when the plan has it).
 *   - DEGRADED — misses one chat-service cannot transform for this user.
 */
export function modalityFitOf(
  deployment: Pick<RoutableDeploymentRecord, 'modalitiesIn' | 'supportsVision'>,
  required: readonly RequiredModality[],
  transformable: readonly RequiredModality[],
): ModalityFit {
  const missing = required.filter((modality) => !readsDirectly(deployment, modality));
  if (missing.length === 0) {
    return ModalityFit.DIRECT;
  }
  return missing.every((modality) => transformable.includes(modality))
    ? ModalityFit.TRANSFORMED
    : ModalityFit.DEGRADED;
}

/** Lower is better; DIRECT first. */
export function modalityFitRank(fit: ModalityFit): number {
  return MODALITY_FIT_RANK[fit];
}

/** The reason tag a decision carries: `modalityFit:direct` / `:transformed` / `:degraded`. */
export function modalityFitReasonTag(fit: ModalityFit): string {
  return `modalityFit:${fit.toLowerCase()}`;
}

function readsDirectly(
  deployment: Pick<RoutableDeploymentRecord, 'modalitiesIn' | 'supportsVision'>,
  modality: RequiredModality,
): boolean {
  const modalities = deployment.modalitiesIn ?? [];
  if (modality === RequiredModality.IMAGE_INPUT) {
    const override = deployment.supportsVision ?? null;
    return override ?? modalities.includes(ModalityKind.IMAGE_INPUT);
  }
  return modality === RequiredModality.VIDEO_INPUT
    ? modalities.includes(ModalityKind.VIDEO_INPUT)
    : modalities.includes(ModalityKind.AUDIO_INPUT);
}

/**
 * Modality fit on every AUTO path, not only the cloud router (rule 51 item 13).
 * Re-orders an already-built decision's `[selected, ...fallbackChain]` by
 * {@link modalityFitOf} — a stable sort, so inside a tier the path's own order
 * stands, and nothing is removed (chat-service still transforms what a model
 * cannot read). `lookup` returns the catalog row for an entry, or undefined
 * when routing has none (ranked as "no known modality"). Pure.
 */
export function rankDecisionByModalityFit(
  decision: RoutingDecisionResult,
  lookup: (entry: FallbackEntry) => ModalityFitSource | undefined,
  required: readonly RequiredModality[],
  transformable: readonly RequiredModality[],
): ModalityFitRanking {
  const entries: FallbackEntry[] = [
    { provider: decision.selectedProvider, model: decision.selectedModel },
    ...decision.fallbackChain,
  ];
  const ranked = entries
    .map((entry, index) => ({
      entry,
      index,
      fit: modalityFitOf(lookup(entry) ?? {}, required, transformable),
    }))
    .sort((a, b) => modalityFitRank(a.fit) - modalityFitRank(b.fit) || a.index - b.index);
  const [top, ...rest] = ranked;
  if (top === undefined) {
    return { decision, reordered: false, originalFit: ModalityFit.DIRECT, fit: ModalityFit.DIRECT };
  }
  const originalFit = ranked.find((item) => item.index === 0)?.fit ?? top.fit;
  const reordered = top.index !== 0;
  return {
    decision: {
      ...decision,
      selectedProvider: top.entry.provider,
      selectedModel: top.entry.model,
      fallbackChain: rest.map((item) => item.entry),
      reasonTags: [
        ...decision.reasonTags,
        modalityFitReasonTag(top.fit),
        ...(reordered ? [MODALITY_FIT_RERANKED_TAG] : []),
      ],
    },
    reordered,
    originalFit,
    fit: top.fit,
  };
}
