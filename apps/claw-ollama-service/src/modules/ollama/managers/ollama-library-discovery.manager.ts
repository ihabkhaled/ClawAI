import { Injectable, Logger } from '@nestjs/common';
import { type AxiosInstance, createHttpClient } from '@common/utilities';
import { DownloadStatus, RuntimeType } from '../../../generated/prisma';
import { OLLAMA_LIBRARY_BASE_URL } from '../constants/catalog.constants';
import {
  DISCOVERY_DEFAULT_TIMEOUT_MS,
  DISCOVERY_SEED_FAMILIES,
  LIBRARY_ITEM_REGEX,
  LIBRARY_MAX_TAGS_PER_MODEL,
  LIBRARY_SIMPLE_HREF_REGEX,
  LIBRARY_TAG_REGEX,
  LIBRARY_TOP_LISTINGS,
  VALID_PARAM_TAG_REGEX,
} from '../constants/discovery.constants';
import type { DiscoveredModel, LibraryListing } from '../types/discovery.types';
import {
  buildCanonicalKey,
  extractFamily,
  normalizeDisplayName,
  parseOllamaName,
  parseParameterSizeToBytes,
} from '../utilities/model-normalizer.utility';

@Injectable()
export class OllamaLibraryDiscoveryManager {
  private readonly logger = new Logger(OllamaLibraryDiscoveryManager.name);

  private readonly libraryClient: AxiosInstance;

  constructor() {
    this.libraryClient = createHttpClient({
      baseURL: OLLAMA_LIBRARY_BASE_URL,
      timeout: DISCOVERY_DEFAULT_TIMEOUT_MS,
    });
  }

  async discover(
    baseUrl: string,
    maxResults: number,
    seedQueries: string[] = DISCOVERY_SEED_FAMILIES,
  ): Promise<DiscoveredModel[]> {
    const results = new Map<string, DiscoveredModel>();
    const queries = seedQueries.length > 0 ? seedQueries : DISCOVERY_SEED_FAMILIES;

    for (const query of queries) {
      if (results.size >= maxResults) break;
      try {
        const listings = await this.fetchListings(baseUrl, query);
        for (const listing of listings) {
          if (results.size >= maxResults) break;
          const tags = await this.fetchTags(baseUrl, listing.slug);
          for (const tag of tags) {
            if (results.size >= maxResults) break;
            const key = buildCanonicalKey(listing.slug, tag);
            if (results.has(key)) continue;
            results.set(key, this.buildDiscoveredModel(listing, tag));
          }
        }
      } catch (error: unknown) {
        this.logger.warn(`Library discovery failed for query "${query}": ${this.errorMsg(error)}`);
      }
    }

    return [...results.values()].slice(0, maxResults);
  }

  private async fetchListings(baseUrl: string, query: string): Promise<LibraryListing[]> {
    const path = '/search';
    try {
      const response = await this.libraryClient.get<string>(path, {
        params: { q: query },
        baseURL: baseUrl,
      });
      return this.parseListings(response.data);
    } catch (error: unknown) {
      this.logger.debug(`listing fetch failed for "${query}": ${this.errorMsg(error)}`);
      return [];
    }
  }

  private parseListings(html: string): LibraryListing[] {
    const matches: LibraryListing[] = [];
    for (const match of html.matchAll(LIBRARY_ITEM_REGEX)) {
      const slug = match[1]?.trim();
      const displayName = match[2]?.trim() ?? slug ?? '';
      const description = match[3]?.trim() ?? '';
      if (!slug) continue;
      matches.push({ slug, displayName, description });
    }

    const simple = [...html.matchAll(LIBRARY_SIMPLE_HREF_REGEX)]
      .map((m) => m[1]?.trim() ?? '')
      .filter((s) => s.length > 0);

    for (const slug of simple) {
      if (!matches.some((m) => m.slug === slug)) {
        matches.push({ slug, displayName: slug, description: '' });
      }
    }

    return matches.slice(0, LIBRARY_TOP_LISTINGS);
  }

  private async fetchTags(baseUrl: string, slug: string): Promise<string[]> {
    try {
      const response = await this.libraryClient.get<string>(`/library/${slug}/tags`, {
        baseURL: baseUrl,
      });
      return this.parseTags(response.data);
    } catch (error: unknown) {
      this.logger.debug(`tags fetch failed for ${slug}: ${this.errorMsg(error)}`);
      return ['latest'];
    }
  }

  private parseTags(html: string): string[] {
    const tags = new Set<string>();
    for (const match of html.matchAll(LIBRARY_TAG_REGEX)) {
      const tag = match[1]?.trim().toLowerCase();
      if (tag !== undefined && this.isValidTag(tag)) {
        tags.add(tag);
      }
    }
    if (tags.size === 0) {
      tags.add('latest');
    }
    return [...tags].slice(0, LIBRARY_MAX_TAGS_PER_MODEL);
  }

  private isValidTag(tag: string): boolean {
    if (tag.length === 0 || tag.length > 30) return false;
    if (tag === 'latest') return true;
    if (/^\d+(?:\.\d+)?[bm](?:-[a-z0-9_]+)?$/i.test(tag)) return true;
    if (/^v?\d+(?:\.\d+)*$/i.test(tag)) return true;
    return false;
  }

  private buildDiscoveredModel(listing: LibraryListing, tag: string): DiscoveredModel {
    const parsed = parseOllamaName(`${listing.slug}:${tag}`);
    const family = extractFamily(parsed.name);
    const size = parseParameterSizeToBytes(tag);
    return {
      name: parsed.name,
      tag: parsed.tag,
      displayName: listing.displayName || normalizeDisplayName(parsed.name, parsed.tag),
      ollamaName: `${parsed.name}:${parsed.tag}`,
      description: listing.description.length > 0 ? listing.description : null,
      sizeBytes: size,
      parameterCount: this.extractParameterCount(tag),
      familyName: family,
      runtime: RuntimeType.OLLAMA,
      capabilities: [],
      sourceUrl: `${OLLAMA_LIBRARY_BASE_URL}/${parsed.name}`,
      downloadStatus: DownloadStatus.UNKNOWN,
    };
  }

  private extractParameterCount(tag: string): string | null {
    const match = tag.match(VALID_PARAM_TAG_REGEX);
    if (match?.[1] === undefined) {
      return null;
    }
    return match[1].toUpperCase();
  }

  private errorMsg(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
