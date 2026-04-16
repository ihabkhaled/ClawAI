import { describe, expect, it } from '@jest/globals';

import { CATALOG_ENTRIES } from '../../constants/catalog-entries.constants';
import {
  buildOllamaSlugCandidates,
  ensureCatalogEntryHasReference,
  resolveCatalogSourceUrl,
} from '../catalog-reference.utility';

describe('catalog-reference.utility', () => {
  it('builds an ollama library url from ollamaName', () => {
    expect(
      resolveCatalogSourceUrl({
        name: 'model2.1',
        tag: 'latest',
        runtime: 'OLLAMA',
        ollamaName: 'model2.1:latest',
      }),
    ).toBe('https://ollama.com/library/model2.1');
  });

  it('builds generic slug candidates for letter-number names', () => {
    expect(buildOllamaSlugCandidates('model2.1')).toEqual(['model2.1', 'model-2.1']);
  });

  it('resolves a source url for every seeded catalog entry', () => {
    for (const entry of CATALOG_ENTRIES) {
      expect(
        resolveCatalogSourceUrl({
          name: entry.name,
          tag: entry.tag,
          runtime: entry.runtime,
          ollamaName: entry.ollamaName,
        }),
      ).not.toBeNull();
    }
  });

  it('falls back to a provider reference for comfyui entries', () => {
    expect(
      resolveCatalogSourceUrl({
        name: 'flux.2-dev',
        tag: 'latest',
        runtime: 'COMFYUI',
        ollamaName: null,
      }),
    ).toBe('https://www.comfy.org/models/flux.2-dev');
  });

  it('throws when no reference can be resolved', () => {
    expect(() =>
      ensureCatalogEntryHasReference({
        name: 'mystery-model',
        tag: 'latest',
        runtime: 'LOCAL_AI',
        ollamaName: null,
      }),
    ).toThrow('missing a source reference');
  });
});
