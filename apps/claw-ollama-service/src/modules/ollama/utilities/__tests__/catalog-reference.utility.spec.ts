import { describe, expect, it } from '@jest/globals';
import { DownloadStatus } from '../../../../generated/prisma';

import { CATALOG_ENTRIES } from '../../constants/catalog-entries.constants';
import {
  buildOllamaSlugCandidates,
  ensureCatalogEntryHasReference,
  resolveCatalogDownloadStatus,
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
    ).toBe('https://registry.ollama.com/library/model2.1');
  });

  it('builds generic slug candidates for letter-number names', () => {
    expect(buildOllamaSlugCandidates('model2.1')).toEqual(['model2.1', 'model-2.1']);
  });

  it('marks cloud-tagged Ollama catalog entries as CLOUD_ONLY', () => {
    expect(
      resolveCatalogDownloadStatus({
        name: 'glm5.1',
        tag: 'latest',
        runtime: 'OLLAMA',
        ollamaName: 'glm-5.1:cloud',
      }),
    ).toBe(DownloadStatus.CLOUD_ONLY);
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

  it('exports a deduplicated catalog with more than 400 entries', () => {
    const keys = CATALOG_ENTRIES.map((entry) => `${entry.name}:${entry.tag}:${entry.runtime}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(CATALOG_ENTRIES.length).toBeGreaterThan(400);
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
