import { describe, expect, it } from 'vitest';
import type { NormalizedModel } from '../../types/connectors.types';
import { adapterKindFields, newMediaModelExposure } from '../adapter-kind-fields.utility';

const model = (modelKey: string, kind?: NormalizedModel['kind']): NormalizedModel =>
  ({ modelKey, kind }) as NormalizedModel;

describe('adapterKindFields', () => {
  it('writes nothing when the adapter gave no verdict or said CHAT', () => {
    expect(adapterKindFields(model('gemini-2.5-pro'), true)).toEqual({});
    expect(adapterKindFields(model('gemini-2.5-pro', 'CHAT'), true)).toEqual({});
  });

  it('writes a non-chat kind, and unexposes the row on an update only', () => {
    expect(adapterKindFields(model('aqa', 'TOOL'), false)).toEqual({ kind: 'TOOL' });
    expect(adapterKindFields(model('aqa', 'TOOL'), true)).toEqual({
      kind: 'TOOL',
      exposure: 'UNEXPOSED',
    });
  });

  it('ignores the adapter TOOL verdict for a priced media model (Gemini Omni video is not a chat model)', () => {
    expect(
      adapterKindFields(model('models/gemini-omni-1.1-flash', 'TOOL'), true, 'GEMINI'),
    ).toEqual({});
  });

  it('still applies the verdict to an unpriced model of the same provider', () => {
    expect(adapterKindFields(model('veo-9-unpriced', 'TOOL'), true, 'GEMINI')).toMatchObject({
      exposure: 'UNEXPOSED',
    });
  });
});

describe('newMediaModelExposure', () => {
  it.each([
    ['GEMINI', 'gemini-2.5-pro-preview-tts'],
    ['GEMINI', 'lyria-3.5'],
    ['OPENAI', 'gpt-4o-mini-tts'],
    ['GROK', 'grok-imagine-video-1.5'],
  ])('exposes a new priced %s %s', (provider, key) => {
    expect(newMediaModelExposure(provider, key)).toEqual({ exposure: 'EXPOSED' });
  });

  it.each([
    ['GEMINI', 'lyria-9-unpriced'],
    ['OPENROUTER', 'google/lyria-3'],
    ['OPENAI', 'gpt-4o'],
  ])('leaves %s %s for an admin decision', (provider, key) => {
    expect(newMediaModelExposure(provider, key)).toEqual({});
  });
});
