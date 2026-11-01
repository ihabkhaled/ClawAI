import { isPricedMediaModel } from '@claw/shared-utilities';
import type { ModelKind } from '../../../generated/prisma';
import type { NormalizedModel } from '../types/connectors.types';

/**
 * A kind the adapter read from the provider itself (Gemini's method list)
 * wins over the id guess. Only a non-chat verdict is written, and on an update
 * it also pulls the row out of the catalog, so an EXPOSED row cannot keep
 * serving chat.
 *
 * Exception: a media-generation model routing prices (image, video, speech, music) is
 * offered by policy. Google's method list calls Veo and Imagen "predict" models (TOOL), which
 * would unexpose them on every sync, so for those the adapter verdict is ignored; the id
 * rules in `nonChatKind` still mark speech and music as AUDIO.
 */
export function adapterKindFields(
  model: NormalizedModel,
  isUpdate: boolean,
  provider?: string,
): { kind?: ModelKind; exposure?: 'UNEXPOSED' } {
  if (provider !== undefined && isPricedMediaModel(provider, model.modelKey)) return {};
  if (model.kind === undefined || model.kind === 'CHAT') return {};
  return isUpdate ? { kind: model.kind, exposure: 'UNEXPOSED' } : { kind: model.kind };
}

/**
 * Exposure policy for a newly discovered model: a priced media model starts EXPOSED (it has a
 * cost class, so plan limits apply); everything else starts UNEXPOSED until an admin decides.
 * Never applied on update, so an admin who hides one keeps it hidden.
 */
export function newMediaModelExposure(
  provider: string,
  modelKey: string,
): { exposure?: 'EXPOSED' } {
  return isPricedMediaModel(provider, modelKey) ? { exposure: 'EXPOSED' } : {};
}
