import { describe, expect, it } from 'vitest';
import { PAYG_DEFAULT_PROVIDERS } from '@claw/shared-constants';
import {
  ConnectorPresetCategory,
  ConnectorPresetExtraField,
  ConnectorPresetGroup,
  ConnectorProvider,
} from '@claw/shared-types';

import {
  CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN,
  CONNECTOR_PRESETS,
} from '../connector-presets.constants';
import {
  connectorPresetDisplayNames,
  getConnectorPreset,
  hasAccountIdPlaceholder,
  isConnectorPresetProvider,
  isValidPresetAccountId,
  listConnectorPresetsByGroup,
  normalizePresetAccountId,
  presetRequiresAccountId,
  resolvePresetBaseUrl,
  resolvePresetEndpoint,
  resolvePresetUrl,
} from '../connector-presets.utility';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

const BESPOKE_PROVIDERS = new Set<string>([
  ConnectorProvider.OPENAI,
  ConnectorProvider.ANTHROPIC,
  ConnectorProvider.GEMINI,
  ConnectorProvider.AWS_BEDROCK,
  ConnectorProvider.DEEPSEEK,
  ConnectorProvider.OLLAMA,
  ConnectorProvider.GROK,
  ConnectorProvider.LLAMACPP,
]);

function presetFor(provider: ConnectorProvider): (typeof CONNECTOR_PRESETS)[number] {
  const preset = getConnectorPreset(provider);
  if (preset === undefined) {
    throw new Error(`missing preset ${provider}`);
  }
  return preset;
}

describe('CONNECTOR_PRESETS registry', () => {
  it('has one preset for every non-bespoke ConnectorProvider value, and nothing else', () => {
    const expected = Object.values(ConnectorProvider).filter((p) => !BESPOKE_PROVIDERS.has(p));
    expect(CONNECTOR_PRESETS.map((preset) => preset.key).sort()).toEqual([...expected].sort());
  });

  it('never lists a key twice', () => {
    const keys = CONNECTOR_PRESETS.map((preset) => preset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(CONNECTOR_PRESETS.map((preset) => [preset.key, preset] as const))(
    '%s is a well-formed LLM preset',
    (_key, preset) => {
      expect(preset.category).toBe(ConnectorPresetCategory.LLM);
      expect(preset.openAICompatible).toBe(true);
      expect(preset.displayName.trim().length).toBeGreaterThan(0);
      expect(preset.defaultBaseUrl).toMatch(/^https:\/\//u);
      expect(preset.defaultBaseUrl.endsWith('/')).toBe(false);
      for (const link of Object.values(preset.links)) {
        expect(link).toMatch(/^https:\/\//u);
      }
      for (const alternate of preset.alternateBaseUrls) {
        expect(alternate).toMatch(/^https:\/\//u);
      }
    },
  );

  it('gives every preset either a model endpoint or a documented static catalogue', () => {
    for (const preset of CONNECTOR_PRESETS) {
      if (preset.modelsEndpoint === null) {
        expect(preset.staticModels.length, preset.key).toBeGreaterThan(0);
        expect(preset.staticModelsSource, preset.key).toMatch(/^https:\/\//u);
      } else {
        expect(preset.staticModels, preset.key).toEqual([]);
      }
    }
  });

  it('can health-check every preset: a GET endpoint, or a static model to probe', () => {
    for (const preset of CONNECTOR_PRESETS) {
      const probeable = preset.healthCheckEndpoint !== null || preset.staticModels.length > 0;
      expect(probeable, preset.key).toBe(true);
    }
  });

  it('uses static catalogues exactly where no list endpoint is verified (Z.ai, Perplexity)', () => {
    const statics = CONNECTOR_PRESETS.filter((p) => p.modelsEndpoint === null).map((p) => p.key);
    expect(statics.sort()).toEqual([ConnectorProvider.PERPLEXITY, ConnectorProvider.ZAI].sort());
  });

  it('puts every placeholder URL on a preset that asks for the account id', () => {
    for (const preset of CONNECTOR_PRESETS) {
      const urls = [
        preset.defaultBaseUrl,
        preset.modelsEndpoint ?? '',
        preset.healthCheckEndpoint ?? '',
      ];
      const needsAccount = urls.some((url) => hasAccountIdPlaceholder(url));
      expect(preset.extraFields.includes(ConnectorPresetExtraField.ACCOUNT_ID), preset.key).toBe(
        needsAccount,
      );
    }
  });

  it('classifies every metered preset as a PAYG default provider', () => {
    const metered = CONNECTOR_PRESETS.filter((p) => p.defaultIsPayAsYouGo).map((p) => p.key);
    for (const key of metered) {
      expect(PAYG_DEFAULT_PROVIDERS, key).toContain(key);
    }
  });

  it('fills all three picker groups', () => {
    for (const group of Object.values(ConnectorPresetGroup)) {
      expect(listConnectorPresetsByGroup(group).length, group).toBeGreaterThan(0);
    }
  });
});

describe('preset lookups', () => {
  it('finds a preset case-insensitively and ignores bespoke providers', () => {
    expect(getConnectorPreset(' groq ')?.displayName).toBe('Groq');
    expect(getConnectorPreset(ConnectorProvider.OPENAI)).toBeUndefined();
    expect(isConnectorPresetProvider('MISTRAL')).toBe(true);
    expect(isConnectorPresetProvider('DEEPSEEK')).toBe(false);
  });

  it('knows which providers need an account id', () => {
    expect(presetRequiresAccountId('CLOUDFLARE')).toBe(true);
    expect(presetRequiresAccountId('GROQ')).toBe(false);
    expect(presetRequiresAccountId('OPENAI')).toBe(false);
  });

  it('maps every preset key to its display name', () => {
    const names = connectorPresetDisplayNames();
    expect(Object.keys(names)).toHaveLength(CONNECTOR_PRESETS.length);
    expect(names[ConnectorProvider.CLOUDFLARE]).toBe('Cloudflare Workers AI');
  });
});

describe('account id validation', () => {
  it('accepts a 32-character hex id in any case, trimmed', () => {
    expect(isValidPresetAccountId(ACCOUNT_ID)).toBe(true);
    expect(isValidPresetAccountId(` ${ACCOUNT_ID.toUpperCase()} `)).toBe(true);
    expect(normalizePresetAccountId(` ${ACCOUNT_ID.toUpperCase()} `)).toBe(ACCOUNT_ID);
  });

  it.each([
    ['too short', ACCOUNT_ID.slice(1)],
    ['too long', `${ACCOUNT_ID}0`],
    ['non-hex', `${ACCOUNT_ID.slice(0, 31)}g`],
    ['path traversal', '../../../../zones/0123456789abcd'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(isValidPresetAccountId(value)).toBe(false);
  });
});

describe('URL resolution', () => {
  const cloudflare = presetFor(ConnectorProvider.CLOUDFLARE);
  const groq = presetFor(ConnectorProvider.GROQ);
  const cohere = presetFor(ConnectorProvider.COHERE);

  it('substitutes the account id into the Cloudflare base and models URLs', () => {
    const base = resolvePresetBaseUrl(cloudflare, undefined, ACCOUNT_ID.toUpperCase());
    expect(base).toBe(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/v1`);
    expect(resolvePresetEndpoint(cloudflare.modelsEndpoint ?? '', base, ACCOUNT_ID)).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/models/search?task=Text%20Generation&per_page=100`,
    );
  });

  it('refuses to resolve a placeholder without a valid account id', () => {
    expect(() => resolvePresetBaseUrl(cloudflare, undefined, undefined)).toThrow(/account ID/u);
    expect(() => resolvePresetUrl(cloudflare.defaultBaseUrl, 'not-hex')).toThrow(/account ID/u);
  });

  it('leaves a URL without a placeholder untouched', () => {
    expect(resolvePresetUrl('https://api.groq.com/openai/v1', undefined)).toBe(
      'https://api.groq.com/openai/v1',
    );
  });

  it('prefers the connector base URL over the preset default and trims trailing slashes', () => {
    expect(resolvePresetBaseUrl(groq, 'https://proxy.example.com/v1//', undefined)).toBe(
      'https://proxy.example.com/v1',
    );
    expect(resolvePresetBaseUrl(groq, '   ', undefined)).toBe('https://api.groq.com/openai/v1');
  });

  it('joins a relative endpoint to the effective base and keeps an absolute one', () => {
    expect(resolvePresetEndpoint('/models', 'https://api.groq.com/openai/v1/', undefined)).toBe(
      'https://api.groq.com/openai/v1/models',
    );
    expect(resolvePresetEndpoint('models', 'https://api.groq.com/openai/v1', undefined)).toBe(
      'https://api.groq.com/openai/v1/models',
    );
    expect(
      resolvePresetEndpoint(cohere.modelsEndpoint ?? '', cohere.defaultBaseUrl, undefined),
    ).toBe('https://api.cohere.com/v1/models?endpoint=chat&page_size=1000');
  });
});

describe('non-chat model pattern', () => {
  it.each([
    'whisper-large-v3',
    'playai-tts',
    'text-embedding-3',
    'meta-llama/llama-guard-4-12b',
    'openai/gpt-image-1',
    'google/gemini-2.5-flash-image',
    'black-forest-labs/flux-1-schnell',
  ])('excludes %s', (id) => {
    expect(CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN.test(id)).toBe(true);
  });

  it.each([
    'llama-3.3-70b-versatile',
    'llama-3.2-11b-vision-preview',
    'mistral-large-latest',
    'qwen2.5-vl-72b-instruct',
  ])('keeps %s', (id) => {
    expect(CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN.test(id)).toBe(false);
  });
});
