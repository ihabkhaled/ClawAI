import type { NormalizedModel, SyncKindFields } from '../types/connectors.types';
import { adapterKindFields } from './adapter-kind-fields.utility';
import { nonChatKind } from './model-kind.utility';

/**
 * Every kind-related column one sync writes for one model: the id rule
 * (`nonChatKind`), overridden by the adapter's own verdict (`adapterKindFields`),
 * plus the reason in admin words. The repository writes exactly this, and the
 * visibility trail (`detectSyncModelEvents`) predicts the write with it, so the
 * two cannot disagree. Empty for a chat model: the stored kind and reason stand.
 */
export function syncKindFields(
  model: NormalizedModel,
  isUpdate: boolean,
  provider?: string,
): SyncKindFields {
  const byId = nonChatKind(model.modelKey);
  const byAdapter = adapterKindFields(model, isUpdate, provider);
  const fields: SyncKindFields = { ...byId, ...byAdapter };
  if (fields.kind === undefined) return fields;
  const kindReason =
    byAdapter.kind === undefined
      ? `Model id matches the ${fields.kind} name pattern`
      : (model.kindReason ?? `The provider lists this model as ${fields.kind}`);
  return { ...fields, kindReason };
}
