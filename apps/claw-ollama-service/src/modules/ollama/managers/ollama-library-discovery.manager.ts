import { Injectable, Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
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

  /**
   * A discovery client bound to one source's base URL.
   *
   * This used to be a single instance built on OLLAMA_LIBRARY_BASE_URL whose
   * `baseURL` every request then overrode with the discovery-source row's own
   * value — so a construction-time host check would have checked a URL that is
   * never called. The base URL is bound at build time instead, and declared to
   * the guard from that same value.
   *
   * `baseUrl` comes from an operator-managed `DiscoverySource` row (admin UI),
   * not from end-user input, which is the same case as a connector base URL:
   * the documented `declaredHost(<configured base>)` pattern. It is an explicit
   * declaration at the call site rather than something the guard waves past;
   * it does NOT constrain an operator who deliberately points a source
   * elsewhere, and it is not meant to.
   */
  private createClient(baseUrl: string): AxiosInstance {
    const effectiveBaseUrl = baseUrl.length > 0 ? baseUrl : OLLAMA_LIBRARY_BASE_URL;
    return createHttpClient(
      {
        baseURL: effectiveBaseUrl,
        timeout: DISCOVERY_DEFAULT_TIMEOUT_MS,
      },
      declaredHost(effectiveBaseUrl),
    );
  }

  async discover(
    baseUrl: string,
    maxResults: number,
    seedQueries: string[] = DISCOVERY_SEED_FAMILIES,
  ): Promise<DiscoveredModel[]> {
    const results = new Map<string, DiscoveredModel>();
    const queries = seedQueries.length > 0 ? seedQueries : DISCOVERY_SEED_FAMILIES;
    const client = this.createClient(baseUrl);

    for (const query of queries) {
      if (results.size >= maxResults) break;
      try {
        const listings = await this.fetchListings(client, query);
        for (const listing of listings) {
          if (results.size >= maxResults) break;
          const tags = await this.fetchTags(client, listing.slug);
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

  private async fetchListings(client: AxiosInstance, query: string): Promise<LibraryListing[]> {
    const path = '/search';
    try {
      const response = await client.get<string>(path, {
        params: { q: query },
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

  private async fetchTags(client: AxiosInstance, slug: string): Promise<string[]> {
    try {
      const response = await client.get<string>(`/library/${slug}/tags`);
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
    if (tag.length === 0 || tag.length > 50) return false;
    if (tag === 'cloud') return false;
    if (tag === 'latest') return true;
    if (/(?:^|[-_])(q\d|q\d+_[a-z0-9_]+|bf16|fp16|mxfp\d+|nvfp\d+|mlx)/i.test(tag)) return false;
    if (/^\d+(?:\.\d+)?[bm]$/i.test(tag)) return true;
    if (/^[a-z]{1,8}\d+(?:\.\d+)?[bm]$/i.test(tag)) return true;
    if (
      /^(base|chat|instruct|instruction|reasoning|thinking|vision|embedding|coder|mini|super|next|vl|it|tool|tools|agent|pt|moe|plus|text|image|audio)$/i.test(
        tag,
      )
    ) {
      return true;
    }
    if (/^[a-z]+(?:-[a-z0-9.]+)+$/i.test(tag) && !tag.includes('cloud')) return true;
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
    return match?.[1] === undefined ? null : match[1].toUpperCase();
  }

  private errorMsg(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
