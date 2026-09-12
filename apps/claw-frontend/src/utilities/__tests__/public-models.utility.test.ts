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

    expect(
      selectModelsForProviderPage(live, ModelProviderPage.LOCAL_AI).map((m) => m.displayName),
    ).toEqual(['Llama 3', 'Mistral']);
  });

  // The database's order shifts on every re-sync; a page that reorders itself
  // between deploys looks like a different page to a reader and to a diff.
  it('sorts by display name rather than trusting catalog order', () => {
    const live = catalog([
      {
        provider: 'OPENAI',
        displayName: 'OpenAI',
        models: [model('GPT 5'), model('Aardvark'), model('Mini')],
      },
    ]);

    expect(
      selectModelsForProviderPage(live, ModelProviderPage.OPENAI).map((m) => m.displayName),
    ).toEqual(['Aardvark', 'GPT 5', 'Mini']);
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
