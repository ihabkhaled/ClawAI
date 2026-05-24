import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Agent, interceptors, request } from 'undici';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import {
  HF_DEFAULT_SEARCH_LIMIT,
  HF_QUANT_PRIORITY,
  HF_REQUEST_TIMEOUT_MS,
  HF_TRENDING_FILTER,
} from '../constants/hf-discovery.constants';
import {
  type HfAddRequestDto,
  type HfSearchQueryDto,
} from '../dto/hf-search.dto';
import {
  type HfApiModelDetail,
  type HfApiModelListItem,
  type HfApiTreeEntry,
  type HfOnboardingPayload,
} from '../types/hf-api.types';
import {
  type HfModelDetails,
  type HfModelGgufFile,
  type HfModelSummary,
} from '../types/hf-search.types';

@Injectable()
export class HfDiscoveryManager {
  private readonly logger = new Logger(HfDiscoveryManager.name);

  async search(query: HfSearchQueryDto): Promise<HfModelSummary[]> {
    this.logger.debug(`search: q="${query.q ?? '(none)'}" sort=${query.sort ?? 'trending'}`);
    const config = AppConfig.get();
    const params = new URLSearchParams();
    if (query.q && query.q.length > 0) {
      params.set('search', query.q);
    } else {
      // Default to GGUF text-generation models so we don't return image/voice models.
      params.set('filter', HF_TRENDING_FILTER);
    }
    if (query.sort) {
      params.set('sort', query.sort === 'trending' ? 'trendingScore' : query.sort);
      params.set('direction', '-1');
    } else {
      params.set('sort', 'trendingScore');
      params.set('direction', '-1');
    }
    params.set('limit', String(query.limit ?? HF_DEFAULT_SEARCH_LIMIT));
    const url = `${config.HUGGINGFACE_API_BASE}/api/models?${params.toString()}`;
    const items = await this.fetchJson<HfApiModelListItem[]>(url);
    return items
      .filter((item) => this.isGgufCapable(item))
      .map((item) => this.toSummary(item));
  }

  async getDetails(repo: string): Promise<HfModelDetails> {
    this.logger.debug(`getDetails: repo=${repo}`);
    const config = AppConfig.get();
    const detailUrl = `${config.HUGGINGFACE_API_BASE}/api/models/${repo}`;
    const detail = await this.fetchJson<HfApiModelDetail>(detailUrl);
    const treeUrl = `${config.HUGGINGFACE_API_BASE}/api/models/${repo}/tree/main?recursive=true`;
    const tree = await this.fetchJson<HfApiTreeEntry[]>(treeUrl).catch(() => [] as HfApiTreeEntry[]);
    const ggufFiles = this.extractGgufFiles(tree);
    return {
      ...this.toSummary(detail),
      ggufFiles,
      recommendedFile: this.pickRecommendedFile(ggufFiles),
    };
  }

  buildOnboardingPayload(details: HfModelDetails, request: HfAddRequestDto): HfOnboardingPayload {
    const match = details.ggufFiles.find((file) =>
      file.name.toLowerCase().includes(request.quantization.toLowerCase()),
    );
    if (!match) {
      throw new BusinessException(
        `No GGUF file matched quantization "${request.quantization}" in repo ${request.repo}`,
        'HF_QUANT_NOT_FOUND',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const repoSlug = request.repo.split('/').at(-1) ?? request.repo;
    const name = repoSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    return {
      name,
      tag: request.quantization,
      displayName: `${repoSlug} (${request.quantization})`,
      huggingfaceRepo: request.repo,
      filePattern: `*${request.quantization}*.gguf`,
      fileSizeBytes: BigInt(match.sizeBytes),
      sourceUrl: `${AppConfig.get().HUGGINGFACE_API_BASE}/${request.repo}`,
      description: `Imported from HuggingFace. ${this.formatTags(details.tags)}`.slice(0, 500),
    };
  }

  private isGgufCapable(item: HfApiModelListItem): boolean {
    const tags = item.tags ?? [];
    return tags.includes('gguf') || tags.includes('GGUF');
  }

  private toSummary(item: HfApiModelListItem): HfModelSummary {
    return {
      id: item.id,
      author: item.author ?? null,
      downloads: item.downloads ?? 0,
      likes: item.likes ?? 0,
      lastModified: item.lastModified ?? null,
      tags: item.tags ?? [],
      pipelineTag: item.pipeline_tag ?? null,
      gated: this.isGated(item.gated),
      private: item.private ?? false,
    };
  }

  private extractGgufFiles(tree: HfApiTreeEntry[]): HfModelGgufFile[] {
    return tree
      .filter((entry) => entry.type === 'file' && entry.path.toLowerCase().endsWith('.gguf'))
      .map((entry) => ({
        name: entry.path,
        sizeBytes: entry.size ?? 0,
        quantization: this.extractQuantization(entry.path),
      }))
      .sort((a, b) => a.sizeBytes - b.sizeBytes);
  }

  private extractQuantization(filename: string): string | null {
    const match = /(IQ\d[_A-Za-z0-9]*|Q\d[_A-Za-z0-9]*|BF16|F16|F32)/i.exec(filename);
    return match && match[1] !== undefined ? match[1] : null;
  }

  private pickRecommendedFile(files: HfModelGgufFile[]): HfModelGgufFile | null {
    if (files.length === 0) return null;
    for (const preferred of HF_QUANT_PRIORITY) {
      const match = files.find((f) => f.quantization?.toLowerCase() === preferred.toLowerCase());
      if (match) return match;
    }
    return files[0] ?? null;
  }

  private formatTags(tags: string[]): string {
    return tags.slice(0, 6).join(', ');
  }

  private isGated(value: boolean | string | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'false';
    return false;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const config = AppConfig.get();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (config.HUGGINGFACE_TOKEN && config.HUGGINGFACE_TOKEN.length > 0) {
      headers['Authorization'] = `Bearer ${config.HUGGINGFACE_TOKEN}`;
    }
    const dispatcher = new Agent({ bodyTimeout: HF_REQUEST_TIMEOUT_MS }).compose(
      interceptors.redirect({ maxRedirections: 5 }),
    );
    const response = await request(url, {
      method: 'GET',
      headers,
      dispatcher,
      headersTimeout: HF_REQUEST_TIMEOUT_MS,
    });
    const text = await response.body.text();
    if (response.statusCode >= 400) {
      this.logger.error(`fetchJson: ${url} → ${response.statusCode}`);
      throw new BusinessException(
        `HuggingFace API returned ${response.statusCode} for ${url}. ${text.slice(0, 160)}`,
        'HF_API_ERROR',
        response.statusCode === 404 || response.statusCode === 401
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_GATEWAY,
      );
    }
    return JSON.parse(text) as T;
  }
}
