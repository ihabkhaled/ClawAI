import { Injectable, Logger } from '@nestjs/common';
import { type AxiosInstance, createHttpClient } from '@common/utilities';
import { type ModelCatalogEntry, RuntimeType } from '../../../generated/prisma';
import {
  OLLAMA_CATALOG_METADATA_CACHE_TTL_MS,
  OLLAMA_LIBRARY_BASE_URL,
  OLLAMA_PUBLIC_BASE_URL,
  OLLAMA_REGISTRY_BASE_URL,
} from '../constants/catalog.constants';
import { getComfyUIDownloadDescriptor } from '../constants/comfyui-downloads.constants';
import {
  type CatalogRemoteMetadata,
  type CatalogRemoteMetadataCacheEntry,
  type OllamaManifestLookupResult,
  type OllamaRegistryManifest,
} from '../types/ollama-registry.types';
import {
  buildOllamaSlugCandidates,
  parseOllamaModelName,
  resolveCatalogSourceUrl,
  resolveOllamaModelReference,
} from '../utilities/catalog-reference.utility';

@Injectable()
export class CatalogRemoteMetadataService {
  private readonly logger = new Logger(CatalogRemoteMetadataService.name);

  private readonly client: AxiosInstance;

  private readonly libraryClient: AxiosInstance;

  private readonly cache = new Map<string, CatalogRemoteMetadataCacheEntry>();

  constructor() {
    this.client = createHttpClient({
      baseURL: OLLAMA_REGISTRY_BASE_URL,
      timeout: 10_000,
    });
    this.libraryClient = createHttpClient({
      baseURL: OLLAMA_PUBLIC_BASE_URL,
      timeout: 10_000,
    });
  }

  async getMetadata(entry: ModelCatalogEntry): Promise<CatalogRemoteMetadata> {
    const cacheKey = this.getCacheKey(entry);
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.metadata;
    }

    const metadata = await this.fetchMetadata(entry);
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + OLLAMA_CATALOG_METADATA_CACHE_TTL_MS,
      metadata,
    });
    return metadata;
  }

  private async fetchMetadata(entry: ModelCatalogEntry): Promise<CatalogRemoteMetadata> {
    if (entry.runtime === RuntimeType.COMFYUI) {
      return this.createComfyUiMetadata(entry);
    }
    if (entry.runtime !== RuntimeType.OLLAMA || entry.ollamaName === null) {
      return this.createNonOllamaMetadata(entry);
    }

    const lookup = await this.lookupManifest(entry.ollamaName);
    if (lookup.manifest === null) {
      this.logger.warn(
        `Catalog metadata unavailable for ${entry.ollamaName}: ${lookup.availabilityError}`,
      );
      return {
        sourceUrl: lookup.sourceUrl,
        isAvailable: false,
        isDownloadable: false,
        sizeBytes: null,
        resolvedOllamaName: lookup.resolvedOllamaName,
        availabilityError: lookup.availabilityError,
      };
    }

    try {
      const layers = lookup.manifest.layers ?? [];
      const sizeBytes = this.sumLayerSizes(layers);

      return {
        sourceUrl: lookup.sourceUrl,
        isAvailable: true,
        isDownloadable: layers.length > 0 && sizeBytes !== null,
        sizeBytes,
        resolvedOllamaName: lookup.resolvedOllamaName,
        availabilityError: layers.length > 0 ? null : 'Ollama registry entry is cloud-only',
      };
    } catch (error: unknown) {
      const message = this.resolveErrorMessage(error);
      this.logger.warn(`Catalog metadata unavailable for ${entry.ollamaName}: ${message}`);
      return {
        sourceUrl: lookup.sourceUrl,
        isAvailable: false,
        isDownloadable: false,
        sizeBytes: null,
        resolvedOllamaName: lookup.resolvedOllamaName,
        availabilityError: message,
      };
    }
  }

  private async lookupManifest(ollamaName: string): Promise<OllamaManifestLookupResult> {
    const { modelName, tag } = parseOllamaModelName(ollamaName);
    const candidateSlugs = buildOllamaSlugCandidates(modelName);
    const candidateResult = await this.findManifestForSlugs(candidateSlugs, tag);
    if (candidateResult !== null) {
      return candidateResult;
    }

    const searchSlugs = await this.searchLibrarySlugs(modelName);
    const searchResult = await this.findManifestForSlugs(searchSlugs, tag);
    if (searchResult !== null) {
      return searchResult;
    }

    const [sourceSlug] = this.rankSourceSlugs(modelName, candidateSlugs, searchSlugs);
    const fallback = resolveOllamaModelReference(ollamaName);
    return {
      sourceUrl:
        sourceSlug !== undefined ? `${OLLAMA_LIBRARY_BASE_URL}/${sourceSlug}` : fallback.sourceUrl,
      resolvedOllamaName: fallback.pullName,
      manifest: null,
      availabilityError: 'Ollama registry manifest not found',
    };
  }

  private async findManifestForSlugs(
    slugs: string[],
    tag: string,
  ): Promise<OllamaManifestLookupResult | null> {
    for (const slug of [...new Set(slugs)]) {
      const sourceUrl = `${OLLAMA_LIBRARY_BASE_URL}/${slug}`;
      try {
        const response = await this.client.get<OllamaRegistryManifest>(
          `/v2/library/${slug}/manifests/${encodeURIComponent(tag)}`,
        );
        return {
          sourceUrl,
          resolvedOllamaName: `${slug}:${tag}`,
          manifest: response.data,
          availabilityError: null,
        };
      } catch (error: unknown) {
        this.logger.debug(
          `Manifest lookup failed for ${slug}:${tag}: ${this.resolveErrorMessage(error)}`,
        );
      }
    }

    return null;
  }

  private async searchLibrarySlugs(modelName: string): Promise<string[]> {
    try {
      const response = await this.libraryClient.get<string>('/search', {
        params: { q: modelName },
      });
      const slugs = [...response.data.matchAll(/href="\/library\/([^":/]+)(?:"|:)/g)]
        .map((match) => match[1] ?? '')
        .filter((slug) => slug.length > 0);
      return this.rankSourceSlugs(modelName, buildOllamaSlugCandidates(modelName), slugs);
    } catch (error: unknown) {
      this.logger.warn(
        `Ollama catalog search failed for ${modelName}: ${this.resolveErrorMessage(error)}`,
      );
      return [];
    }
  }

  private createNonOllamaMetadata(entry: ModelCatalogEntry): CatalogRemoteMetadata {
    const sourceUrl = resolveCatalogSourceUrl(entry);
    return {
      sourceUrl,
      isAvailable: sourceUrl !== null,
      isDownloadable: false,
      sizeBytes: null,
      resolvedOllamaName: null,
      availabilityError: null,
    };
  }

  // ComfyUI entries are downloadable iff they have a matching descriptor in
  // the ComfyUI download registry (constants/comfyui-downloads.constants.ts).
  // We deliberately DON'T HEAD-check the HuggingFace URL here — HF rate-limits
  // unauthenticated HEAD requests and this metadata path is called on every
  // catalog list. The registry is the source of truth; HEAD verification is
  // done in `qa/test-image-gen-catalog.sh` and at pull time.
  private createComfyUiMetadata(entry: ModelCatalogEntry): CatalogRemoteMetadata {
    const sourceUrl = resolveCatalogSourceUrl(entry);
    const descriptor = getComfyUIDownloadDescriptor(entry.name, entry.tag);
    if (descriptor === undefined) {
      return {
        sourceUrl,
        isAvailable: sourceUrl !== null,
        isDownloadable: false,
        sizeBytes: null,
        resolvedOllamaName: null,
        availabilityError: 'ComfyUI download recipe not registered',
      };
    }
    return {
      sourceUrl: sourceUrl ?? descriptor.url,
      isAvailable: true,
      isDownloadable: true,
      sizeBytes: entry.sizeBytes,
      // We piggy-back on `resolvedOllamaName` to carry the ComfyUI catalog
      // key (`name:tag`) through to the runtime adapter — the adapter then
      // looks up the descriptor from the registry. This avoids changing
      // every consumer of `CatalogRemoteMetadata`.
      resolvedOllamaName: `${entry.name}:${entry.tag}`,
      availabilityError: null,
    };
  }

  private sumLayerSizes(layers: Array<{ size: number }>): bigint | null {
    if (layers.length === 0) {
      return null;
    }

    return layers.reduce((total, layer) => total + BigInt(layer.size), BigInt(0));
  }

  private rankSourceSlugs(
    modelName: string,
    candidateSlugs: string[],
    searchSlugs: string[],
  ): string[] {
    const normalizedModelName = this.normalizeSlug(modelName);
    const ranked = [...candidateSlugs, ...searchSlugs].map((slug) => ({
      slug,
      score: this.scoreSlug(slug, normalizedModelName, candidateSlugs),
    }));

    return ranked
      .sort((left, right) => left.score - right.score)
      .map((rankedSlug) => rankedSlug.slug)
      .filter((slug, index, slugs) => slug.length > 0 && slugs.indexOf(slug) === index);
  }

  private scoreSlug(slug: string, normalizedModelName: string, candidateSlugs: string[]): number {
    const normalizedSlug = this.normalizeSlug(slug);
    if (candidateSlugs.includes(slug) && normalizedSlug === normalizedModelName) {
      return 0;
    }
    if (normalizedSlug === normalizedModelName) {
      return 1;
    }
    if (candidateSlugs.includes(slug)) {
      return 2;
    }
    if (normalizedSlug.startsWith(normalizedModelName)) {
      return 3;
    }
    if (normalizedSlug.includes(normalizedModelName)) {
      return 4;
    }
    return 5;
  }

  private normalizeSlug(slug: string): string {
    return slug.toLowerCase().replaceAll(/[^a-z0-9.]/g, '');
  }

  private getCacheKey(entry: ModelCatalogEntry): string {
    return `${entry.runtime}:${entry.ollamaName ?? `${entry.name}:${entry.tag}`}:${entry.updatedAt.toISOString()}`;
  }

  private resolveErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown Ollama registry error';
  }
}
