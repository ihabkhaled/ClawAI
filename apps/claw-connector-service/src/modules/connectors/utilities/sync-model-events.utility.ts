import { isPricedMediaModel } from '@claw/shared-utilities';
import type {
  CreateModelEventData,
  NormalizedModel,
  SyncEventBaseline,
} from '../types/connectors.types';
import { SYNC_REMOVED_REASON } from '../constants/model-visibility.constants';
import { syncKindFields } from './sync-kind-fields.utility';

/**
 * What a sync is about to change on a model without an administrator asking:
 * its kind flips (it leaves the chat picker), or an exposed model is
 * unexposed. Computed from the rows as they were before the sync and the same
 * `syncKindFields` the repository writes, so the trail matches the write.
 * Before this, `models/gemini-decision-1` went from priced CHAT to TOOL with
 * no record of when or why (2026-11-22).
 */
export function detectSyncModelEvents(
  connectorId: string,
  provider: string,
  existing: ReadonlyArray<SyncEventBaseline>,
  listed: ReadonlyArray<NormalizedModel>,
): CreateModelEventData[] {
  const byKey = new Map(existing.map((row) => [row.modelKey, row]));
  const listedKeys = new Set(listed.map((model) => model.modelKey));
  const events: CreateModelEventData[] = [];

  for (const model of listed) {
    const before = byKey.get(model.modelKey);
    if (before === undefined) continue;
    const fields = syncKindFields(model, true, provider);
    const afterKind = fields.kind ?? before.kind;
    const afterExposure = fields.exposure ?? before.exposure;
    const base = {
      connectorId,
      modelKey: model.modelKey,
      beforeKind: before.kind,
      afterKind,
      beforeExposure: before.exposure,
      afterExposure,
      ...(fields.kindReason === undefined ? {} : { reason: fields.kindReason }),
    };
    if (afterKind !== before.kind) {
      events.push({ ...base, type: 'KIND_CHANGED' });
    } else if (before.exposure === 'EXPOSED' && afterExposure === 'UNEXPOSED') {
      events.push({ ...base, type: 'UNEXPOSED_BY_SYNC' });
    }
  }

  // Mirrors replaceMany: an omitted model goes REMOVED + UNEXPOSED, except a
  // priced media model, which keeps its row.
  for (const row of existing) {
    if (
      listedKeys.has(row.modelKey) ||
      row.lifecycle === 'REMOVED' ||
      row.exposure !== 'EXPOSED' ||
      isPricedMediaModel(provider, row.modelKey)
    ) {
      continue;
    }
    events.push({
      connectorId,
      modelKey: row.modelKey,
      type: 'UNEXPOSED_BY_SYNC',
      beforeKind: row.kind,
      afterKind: row.kind,
      beforeExposure: 'EXPOSED',
      afterExposure: 'UNEXPOSED',
      reason: SYNC_REMOVED_REASON,
    });
  }
  return events;
}
