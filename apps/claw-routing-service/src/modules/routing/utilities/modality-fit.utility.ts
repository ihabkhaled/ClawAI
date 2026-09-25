import { RequiredModality } from '@claw/shared-types';

import { ModalityFit } from '../../../common/enums/modality-fit.enum';
import { ModalityKind } from '../../../generated/prisma';
import { MODALITY_FIT_RANK } from '../constants/modality-fit.constants';
import type { RoutableDeploymentRecord } from '../types/model-deployment.types';

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
