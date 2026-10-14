import { rankCloudModels } from '../cloud-model-ranking.utility';
import type { ConnectedProvider } from '../../types/model-catalog.types';

const model = (
  modelKey: string,
  extra: Partial<ConnectedProvider['models'][number]> = {},
): ConnectedProvider['models'][number] => ({
  modelKey,
  displayName: modelKey,
  maxContextTokens: null,
  usageTier: null,
  supportsStructuredOutput: false,
  supportsTools: false,
  ...extra,
});

describe('rankCloudModels', () => {
  it('never picks an image, speech or embedding model, even when it is listed first', () => {
    const providers: ConnectedProvider[] = [
      {
        provider: 'A',
        models: [model('chatgpt-image-latest'), model('text-embedding-3-small'), model('chat-one')],
      },
      { provider: 'B', models: [model('models/gemini-2.5-flash-image'), model('models/flash')] },
      { provider: 'C', models: [model('whisper-large')] },
    ];
    expect(rankCloudModels(providers, []).map((c) => c.model)).toEqual([
      'chat-one',
      'models/flash',
    ]);
  });

  it('returns an empty chain for an empty catalog', () => {
    expect(rankCloudModels([], ['general'])).toEqual([]);
  });

  it('skips a provider with no models', () => {
    expect(rankCloudModels([{ provider: 'A', models: [] }], [])).toEqual([]);
  });

  it('picks the best model inside a provider by hint fit, then by cheaper band', () => {
    const providers: ConnectedProvider[] = [
      {
        provider: 'A',
        models: [
          model('pricey', { usageTier: 'HIGH', supportsStructuredOutput: true }),
          model('cheap', { usageTier: 'LOW', supportsStructuredOutput: true }),
          model('cheap-no-fit', { usageTier: 'LOW' }),
        ],
      },
    ];
    expect(rankCloudModels(providers, ['json'])[0]?.model).toBe('cheap');
  });

  it('counts long context only at or above the window threshold', () => {
    const providers: ConnectedProvider[] = [
      {
        provider: 'A',
        models: [
          model('short', { maxContextTokens: 32_000, usageTier: 'LOW' }),
          model('long', { maxContextTokens: 200_000, usageTier: 'HIGH' }),
        ],
      },
    ];
    expect(rankCloudModels(providers, ['long_context'])[0]?.model).toBe('long');
  });

  it('ranks an unstated cost band with HIGH, behind MEDIUM and LOW', () => {
    const providers: ConnectedProvider[] = [
      { provider: 'HI', models: [model('m', { usageTier: 'HIGH' })] },
      { provider: 'UNKNOWN', models: [model('m')] },
      { provider: 'MED', models: [model('m', { usageTier: 'MEDIUM' })] },
    ];
    expect(rankCloudModels(providers, []).map((c) => c.provider)).toEqual(['MED', 'HI', 'UNKNOWN']);
  });

  it('keeps one primary plus three alternatives, in catalog order on a tie', () => {
    const providers: ConnectedProvider[] = ['A', 'B', 'C', 'D', 'E'].map((provider) => ({
      provider,
      models: [model('m', { usageTier: 'LOW' })],
    }));
    expect(rankCloudModels(providers, []).map((c) => c.provider)).toEqual(['A', 'B', 'C', 'D']);
  });
});
