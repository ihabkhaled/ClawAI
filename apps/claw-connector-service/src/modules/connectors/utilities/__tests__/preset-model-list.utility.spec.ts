import { getConnectorPreset } from '@claw/shared-utilities';
import { ConnectorModelsResponseFormat, type ConnectorPreset } from '@claw/shared-types';
import { type PresetModelListEntry } from '../../types/provider-api.types';
import {
  isPresetChatModel,
  parsePresetModelList,
  presetModelSupportsTools,
  presetModelSupportsVision,
  staticPresetModels,
} from '../preset-model-list.utility';

function preset(provider: string): ConnectorPreset {
  const found = getConnectorPreset(provider);
  if (found === undefined) {
    throw new Error(`no preset ${provider}`);
  }
  return found;
}

function entry(overrides: Partial<PresetModelListEntry>): PresetModelListEntry {
  return {
    id: 'model',
    tags: [],
    inputModalities: [],
    outputModalities: [],
    supportedParameters: [],
    ...overrides,
  };
}

describe('parsePresetModelList', () => {
  it('reads DeepInfra metadata tags and window', () => {
    const [parsed] = parsePresetModelList(ConnectorModelsResponseFormat.OPENAI_LIST, {
      data: [
        {
          id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
          metadata: { context_length: 131_072, tags: ['chat'] },
        },
      ],
    });

    expect(parsed?.tags).toEqual(['chat']);
    expect(parsed?.contextWindow).toBe(131_072);
  });

  it('reads Vercel type, tags and modalities', () => {
    const [parsed] = parsePresetModelList(ConnectorModelsResponseFormat.OPENAI_LIST, {
      data: [
        {
          id: 'alibaba/qwen-3-14b',
          name: 'Qwen3-14B',
          type: 'language',
          context_window: 40_960,
          tags: ['reasoning', 'tool-use'],
          modalities: { input: ['text'], output: ['text'] },
        },
      ],
    });

    expect(parsed).toMatchObject({
      name: 'Qwen3-14B',
      type: 'language',
      contextWindow: 40_960,
      inputModalities: ['text'],
    });
  });

  it('treats nullable provider fields as absent', () => {
    const [parsed] = parsePresetModelList(ConnectorModelsResponseFormat.OPENAI_LIST, {
      data: [{ id: 'x', name: null, context_length: null, metadata: null }],
    });

    expect(parsed?.name).toBeUndefined();
    expect(parsed?.contextWindow).toBeUndefined();
  });

  it.each([
    [ConnectorModelsResponseFormat.OPENAI_LIST, []],
    [ConnectorModelsResponseFormat.BARE_ARRAY, { data: [] }],
    [ConnectorModelsResponseFormat.COHERE_MODELS, { data: [] }],
    [ConnectorModelsResponseFormat.CLOUDFLARE_SEARCH, null],
  ])('refuses a %s body with the wrong envelope', (format, body) => {
    expect(() => parsePresetModelList(format, body)).toThrow('unexpected shape');
  });

  it('skips malformed Cohere and Cloudflare entries', () => {
    expect(
      parsePresetModelList(ConnectorModelsResponseFormat.COHERE_MODELS, { models: [{}, 3] }),
    ).toEqual([]);
    expect(
      parsePresetModelList(ConnectorModelsResponseFormat.CLOUDFLARE_SEARCH, { result: [{}] }),
    ).toEqual([]);
  });
});

describe('isPresetChatModel', () => {
  it.each([
    ['an inactive model', entry({ active: false })],
    ['a model that cannot chat', entry({ completionChat: false })],
    ['an image-output model', entry({ outputModalities: ['image'] })],
    ['an embedding type', entry({ type: 'embedding' })],
    ['DeepInfra embed tags', entry({ tags: ['embed'] })],
    ['a non-chat Cohere model', entry({ endpoints: ['embed'] })],
    ['a non-text Cloudflare task', entry({ taskName: 'Text-to-Image' })],
    ['a speech id', entry({ id: 'whisper-large-v3-turbo' })],
  ])('rejects %s', (_label, candidate) => {
    expect(isPresetChatModel(candidate)).toBe(false);
  });

  it.each([
    ['a bare id', entry({ id: 'llama-3.3-70b' })],
    ['a language type with feature tags', entry({ type: 'language', tags: ['reasoning'] })],
    ['DeepInfra vlm tags', entry({ tags: ['vlm', 'vision'] })],
    ['a Cloudflare text-generation task', entry({ taskName: 'Text Generation' })],
  ])('accepts %s', (_label, candidate) => {
    expect(isPresetChatModel(candidate)).toBe(true);
  });
});

describe('presetModelSupportsVision', () => {
  it('trusts provider reports', () => {
    expect(presetModelSupportsVision(entry({ vision: true }), preset('GROQ'))).toBe(true);
    expect(presetModelSupportsVision(entry({ tags: ['vlm'] }), preset('DEEPINFRA'))).toBe(true);
  });

  it('falls back to the narrow per-preset id pattern', () => {
    expect(presetModelSupportsVision(entry({ id: 'qwen-vl-max' }), preset('QWEN'))).toBe(true);
    expect(presetModelSupportsVision(entry({ id: 'qwen-max' }), preset('QWEN'))).toBe(false);
    expect(
      presetModelSupportsVision(entry({ id: 'moonshot-v1-8k-vision-preview' }), preset('MOONSHOT')),
    ).toBe(true);
    expect(presetModelSupportsVision(entry({ id: 'vision-thing' }), preset('GROQ'))).toBe(false);
  });
});

describe('presetModelSupportsTools', () => {
  it('needs a provider report — no report means unknown, recorded as false', () => {
    expect(presetModelSupportsTools(entry({}), preset('GROQ'))).toBe(false);
    expect(presetModelSupportsTools(entry({ functionCalling: true }), preset('MISTRAL'))).toBe(
      true,
    );
    expect(
      presetModelSupportsTools(entry({ tags: ['tool-use'] }), preset('VERCEL_AI_GATEWAY')),
    ).toBe(true);
  });

  it('never claims tools for a preset without native tool support', () => {
    expect(presetModelSupportsTools(entry({ functionCalling: true }), preset('PERPLEXITY'))).toBe(
      false,
    );
  });
});

describe('staticPresetModels', () => {
  it('formats documented ids as display names', () => {
    const models = staticPresetModels(preset('PERPLEXITY'));

    expect(models[1]).toMatchObject({ modelKey: 'sonar-pro', displayName: 'Sonar Pro' });
  });
});
