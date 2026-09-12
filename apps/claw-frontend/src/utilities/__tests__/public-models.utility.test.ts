import { describe, expect, it } from 'vitest';

import { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { PublicCatalogModel, PublicModelCatalog } from '@/types/public-models.types';
import {
  selectAvailableProviderNames,
  selectModelsForProviderPage,
} from '@/utilities/public-models.utility';

function model(displayName: string): PublicCatalogModel {
  return {
    modelKey: displayName.toLowerCase(),
    displayName,
    maxContextTokens: null,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsAudio: false,
    supportsStructuredOutput: true,
    usageTier: 'UNKNOWN',
  };
}

function catalog(
  providers: Array<{ provider: string; displayName: string; models: PublicCatalogModel[] }>,
): PublicModelCatalog {
  return {
    providers: providers.map((p) => ({ ...p, modelCount: p.models.length })),
    totalModelCount: providers.reduce((sum, p) => sum + p.models.length, 0),
    providerCount: providers.length,
    generatedAt: '2026-09-12T00:00:00.000Z',
  };
}

describe('selectModelsForProviderPage', () => {
  it('selects the models of the connector behind the page', () => {
    const live = catalog([
      { provider: 'GEMINI', displayName: 'Google Gemini', models: [model('Gemini 2.5 Pro')] },
      { provider: 'OPENAI', displayName: 'OpenAI', models: [model('GPT 5')] },
    ]);

    expect(
      selectModelsForProviderPage(live, ModelProviderPage.GOOGLE).map((m) => m.displayName),
    ).toEqual(['Gemini 2.5 Pro']);
  });

  // One page, two runtimes: a reader asking "can I run this on my own hardware"
  // does not care whether the answer is Ollama or llama.cpp.
  it('merges both local runtimes onto the local-ai page', () => {
    const live = catalog([
      { provider: 'OLLAMA', displayName: 'Ollama', models: [model('Mistral')] },
      { provider: 'LLAMACPP', displayName: 'llama.cpp', models: [model('Llama 3')] },
    ]);

    const merged = selectModelsForProviderPage(live, ModelProviderPage.LOCAL_AI).map(
      (m) => m.displayName,
    );
    expect(merged).toHaveLength(2);
    expect(merged).toEqual(expect.arrayContaining(['Llama 3', 'Mistral']));
  });

  // Was "sorts by display name". Name order is close to REVERSE chronological
  // for model names, so it reliably surfaced the oldest model a provider still
  // serves — the home page advertised "GPT 3.5 Turbo" while the in-app picker
  // showed GPT 5.6. Public pages now use the same comparator as the picker.
  it('orders newest first, using the same comparator as the model picker', () => {
    const live = catalog([
      {
        provider: 'OPENAI',
        displayName: 'OpenAI',
        models: [
          { ...model('GPT 3.5 Turbo'), modelKey: 'gpt-3.5-turbo' },
          { ...model('GPT 5.4'), modelKey: 'gpt-5.4' },
          { ...model('GPT 4o'), modelKey: 'gpt-4o' },
        ],
      },
    ]);

    expect(
      selectModelsForProviderPage(live, ModelProviderPage.OPENAI).map((m) => m.displayName),
    ).toEqual(['GPT 5.4', 'GPT 4o', 'GPT 3.5 Turbo']);
  });

  it('returns nothing for a provider this deployment has not connected', () => {
    const live = catalog([{ provider: 'OPENAI', displayName: 'OpenAI', models: [model('GPT 5')] }]);
    expect(selectModelsForProviderPage(live, ModelProviderPage.XAI)).toEqual([]);
  });

  // A failed fetch must render an empty section, never throw a page away.
  it('treats an unavailable catalog as empty rather than throwing', () => {
    expect(selectModelsForProviderPage(null, ModelProviderPage.OPENAI)).toEqual([]);
  });
});

describe('selectAvailableProviderNames', () => {
  it('names only providers that actually have models', () => {
    const live = catalog([
      { provider: 'OPENAI', displayName: 'OpenAI', models: [model('GPT 5')] },
      { provider: 'DEEPSEEK', displayName: 'DeepSeek', models: [] },
    ]);

    expect(selectAvailableProviderNames(live)).toEqual(['OpenAI']);
  });

  it('returns nothing when the catalog is unavailable', () => {
    expect(selectAvailableProviderNames(null)).toEqual([]);
  });
});
