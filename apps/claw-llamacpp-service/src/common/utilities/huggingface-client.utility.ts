import { Logger } from '@nestjs/common';
import { request } from 'undici';
import { type HFFile, type HFRepoInfo, type HFTreeEntry } from '../types/huggingface.type';

const logger = new Logger('HuggingFaceClient');

export class HuggingFaceClient {
  constructor(
    private readonly apiBase: string,
    private readonly token?: string,
  ) {}

  async listFiles(repo: string, pattern?: RegExp): Promise<HFFile[]> {
    logger.debug(`listFiles: ${repo} pattern=${pattern?.source ?? '(any)'}`);
    const url = `${this.apiBase}/api/models/${repo}/tree/main?recursive=true`;
    const response = await this.fetchJson<HFTreeEntry[]>(url);
    if (!Array.isArray(response)) {
      logger.warn(`listFiles: ${repo} returned non-array body`);
      return [];
    }
    const files: HFFile[] = response
      .filter((entry) => entry.type === 'file')
      .map((entry) => ({
        name: entry.path,
        size: entry.size ?? 0,
        sha256: entry.lfs?.sha256 ?? null,
        oid: entry.oid ?? null,
      }));
    if (!pattern) {
      return files;
    }
    return files.filter((f) => pattern.test(f.name));
  }

  async getRepoInfo(repo: string): Promise<HFRepoInfo | null> {
    logger.debug(`getRepoInfo: ${repo}`);
    try {
      const url = `${this.apiBase}/api/models/${repo}`;
      const data = await this.fetchJson<{
        id?: string;
        tags?: string[];
        cardData?: { license?: string };
      }>(url);
      return {
        id: data.id ?? repo,
        tags: data.tags ?? [],
        license: data.cardData?.license ?? null,
      };
    } catch (error) {
      logger.warn(`getRepoInfo: ${repo} failed — ${(error as Error).message}`);
      return null;
    }
  }

  buildDownloadUrl(repo: string, file: string): string {
    return `${this.apiBase}/${repo}/resolve/main/${file}`;
  }

  buildHeaders(rangeStart?: bigint): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/octet-stream',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (rangeStart && rangeStart > 0n) {
      headers['Range'] = `bytes=${rangeStart.toString()}-`;
    }
    return headers;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await request(url, { method: 'GET', headers, headersTimeout: 10_000 });
    const text = await response.body.text();
    if (response.statusCode >= 400) {
      logger.error(`fetchJson: ${url} → ${response.statusCode}`);
      // HuggingFace returns 401 for both gated repos AND non-existent repos.
      // Rewrite the message so users know what likely happened.
      if (response.statusCode === 401) {
        const hint = this.token
          ? 'The repository may be gated, private, or your HUGGINGFACE_TOKEN may lack access.'
          : 'The repository may not exist on HuggingFace, or it is gated/private and requires HUGGINGFACE_TOKEN to be set.';
        throw new Error(
          `HuggingFace returned 401 for ${url}. ${hint} Raw: ${text.slice(0, 160)}`,
        );
      }
      throw new Error(`HuggingFace request failed (${response.statusCode}): ${text.slice(0, 200)}`);
    }
    return JSON.parse(text) as T;
  }
}
