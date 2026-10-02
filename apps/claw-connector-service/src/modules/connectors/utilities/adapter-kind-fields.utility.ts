import type { ModelKind } from '../../../generated/prisma';
import type { NormalizedModel } from '../types/connectors.types';

/**
 * A kind the adapter read from the provider itself (Gemini's method list)
 * wins over the id guess. Only a non-chat verdict is written, and on an update
 * it also pulls the row out of the catalog, so an EXPOSED row cannot keep
 * serving chat.
 */
export function adapterKindFields(
  model: NormalizedModel,
  isUpdate: boolean,
): { kind?: ModelKind; exposure?: 'UNEXPOSED' } {
  if (model.kind === undefined || model.kind === 'CHAT') return {};
  return isUpdate ? { kind: model.kind, exposure: 'UNEXPOSED' } : { kind: model.kind };
}
