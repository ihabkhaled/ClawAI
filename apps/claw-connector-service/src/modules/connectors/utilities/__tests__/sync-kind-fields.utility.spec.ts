import { describe, expect, it } from 'vitest';
import type { NormalizedModel } from '../../types/connectors.types';
import { syncKindFields } from '../sync-kind-fields.utility';

const model = (
  modelKey: string,
  kind?: NormalizedModel['kind'],
  kindReason?: string,
): NormalizedModel => ({ modelKey, kind, kindReason }) as NormalizedModel;

describe('syncKindFields', () => {
  it('writes nothing for a chat model, so the stored kind and reason stand', () => {
    expect(syncKindFields(model('gemini-2.5-pro', 'CHAT'), true, 'GEMINI')).toEqual({});
  });

  it("stores the adapter's own reason with its verdict and unexposes on update", () => {
    expect(
      syncKindFields(
        model('models/gemini-decision-1', 'TOOL', 'Google lists only: createDecision'),
        true,
        'GEMINI',
      ),
    ).toEqual({
      kind: 'TOOL',
      exposure: 'UNEXPOSED',
      kindReason: 'Google lists only: createDecision',
    });
  });

  it('falls back to a generic adapter reason when the adapter gave none', () => {
    expect(syncKindFields(model('aqa', 'TOOL'), false, 'GEMINI')).toMatchObject({
      kind: 'TOOL',
      kindReason: 'The provider lists this model as TOOL',
    });
  });

  it('names the id pattern when only the id rule classified it', () => {
    expect(syncKindFields(model('text-embedding-3-large'), true, 'OPENAI')).toEqual({
      kind: 'EMBEDDING',
      kindReason: 'Model id matches the EMBEDDING name pattern',
    });
  });
});
