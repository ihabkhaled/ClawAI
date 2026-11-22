import { describe, expect, it } from 'vitest';
import type { NormalizedModel, SyncEventBaseline } from '../../types/connectors.types';
import { SYNC_REMOVED_REASON } from '../../constants/model-visibility.constants';
import { detectSyncModelEvents } from '../sync-model-events.utility';

const listed = (modelKey: string, kind?: NormalizedModel['kind'], kindReason?: string) =>
  ({ modelKey, kind, kindReason }) as NormalizedModel;
const row = (
  modelKey: string,
  kind: SyncEventBaseline['kind'],
  exposure: SyncEventBaseline['exposure'],
  lifecycle: SyncEventBaseline['lifecycle'] = 'ACTIVE',
): SyncEventBaseline => ({ modelKey, kind, exposure, lifecycle });

describe('detectSyncModelEvents', () => {
  it('records a kind flip with before/after and the reason (the gemini-decision-1 case)', () => {
    const events = detectSyncModelEvents(
      'c1',
      'GEMINI',
      [row('models/gemini-decision-1', 'CHAT', 'EXPOSED')],
      [listed('models/gemini-decision-1', 'TOOL', 'Google lists only: createDecision')],
    );
    expect(events).toEqual([
      {
        connectorId: 'c1',
        modelKey: 'models/gemini-decision-1',
        type: 'KIND_CHANGED',
        beforeKind: 'CHAT',
        afterKind: 'TOOL',
        beforeExposure: 'EXPOSED',
        afterExposure: 'UNEXPOSED',
        reason: 'Google lists only: createDecision',
      },
    ]);
  });

  it('records an unexpose when an exposed non-chat row is re-classified as the same kind', () => {
    const events = detectSyncModelEvents(
      'c1',
      'GEMINI',
      [row('models/gemini-decision-1', 'TOOL', 'EXPOSED')],
      [listed('models/gemini-decision-1', 'TOOL', 'Google lists only: createDecision')],
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'UNEXPOSED_BY_SYNC', afterExposure: 'UNEXPOSED' });
  });

  it('records nothing for an unchanged chat model or a new model', () => {
    expect(
      detectSyncModelEvents(
        'c1',
        'GEMINI',
        [row('models/gemini-2.5-pro', 'CHAT', 'EXPOSED')],
        [listed('models/gemini-2.5-pro', 'CHAT'), listed('models/gemini-9-new', 'TOOL')],
      ),
    ).toEqual([]);
  });

  it('records an exposed model the provider stopped listing, but not a removed or priced media one', () => {
    const events = detectSyncModelEvents(
      'c1',
      'GEMINI',
      [
        row('models/gone-1', 'CHAT', 'EXPOSED'),
        row('models/gone-2', 'CHAT', 'EXPOSED', 'REMOVED'),
        row('models/gone-3', 'CHAT', 'UNEXPOSED'),
        row('models/gemini-omni-1.1-flash', 'CHAT', 'EXPOSED'),
      ],
      [],
    );
    expect(events).toEqual([
      expect.objectContaining({
        modelKey: 'models/gone-1',
        type: 'UNEXPOSED_BY_SYNC',
        reason: SYNC_REMOVED_REASON,
      }),
    ]);
  });
});
