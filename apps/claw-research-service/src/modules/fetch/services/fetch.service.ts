import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { FETCH_CACHE_TTL_MS } from '../../../common/constants/fetch.constants';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { sha256Hex } from '../../../common/utilities/crypto.utility';
import { HttpFetchAdapter } from '../adapters/http-fetch.adapter';
import { FetchJobRepository } from '../repositories/fetch-job.repository';
import { PageCacheRepository } from '../repositories/page-cache.repository';
import { type FetchJob, FetchJobStatus } from '../../../generated/prisma';
import type { FetchResult } from '../types/fetch.types';
import type { FetchRequestDto } from '../dto/fetch-request.dto';

@Injectable()
export class FetchService {
  private readonly logger = new Logger(FetchService.name);

  constructor(
    private readonly adapter: HttpFetchAdapter,
    private readonly jobs: FetchJobRepository,
    private readonly cache: PageCacheRepository,
  ) {}

  async fetchPage(userId: string, dto: FetchRequestDto): Promise<FetchResult> {
    const normalized = this.normalizeUrl(dto.url);
    const cacheKey = sha256Hex(normalized);
    const job = await this.jobs.create({
      userId,
      url: normalized,
      status: FetchJobStatus.RUNNING,
    });

    if (dto.refresh !== true) {
      const cached = await this.cache.findByKey(cacheKey);
      if (cached !== null && cached.expiresAt > new Date()) {
        await this.completeFromCache(job.id, cached);
        return this.cacheToResult(normalized, cached);
      }
    }

    try {
      const result = await this.adapter.fetchPage({
        url: normalized,
        timeoutMs: dto.timeoutMs,
      });
      await this.persist(job.id, result, cacheKey);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Fetch failed ${normalized}: ${message}`);
      await this.jobs.update(job.id, {
        status: FetchJobStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });
      throw new BusinessException('research.fetch.failed', 'FETCH_FAILED', HttpStatus.BAD_GATEWAY, {
        url: normalized,
        message,
      });
    }
  }

  async getJob(id: string, userId: string): Promise<FetchJob> {
    const job = await this.jobs.findById(id, userId);
    if (job === null) {
      throw new EntityNotFoundException('FetchJob', id);
    }
    return job;
  }

  async listJobs(userId: string, limit: number): Promise<FetchJob[]> {
    return this.jobs.listByUser(userId, limit);
  }

  private normalizeUrl(raw: string): string {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.protocol = parsed.protocol.toLowerCase();
    return parsed.href;
  }

  private async completeFromCache(
    jobId: string,
    cached: { httpStatus: number; mimeType: string | null; byteSize: number },
  ): Promise<void> {
    await this.jobs.update(jobId, {
      status: FetchJobStatus.CACHED,
      httpStatus: cached.httpStatus,
      mimeType: cached.mimeType,
      byteSize: cached.byteSize,
      cacheHit: true,
      completedAt: new Date(),
    });
  }

  private cacheToResult(
    url: string,
    cached: {
      finalUrl: string | null;
      httpStatus: number;
      mimeType: string | null;
      title: string | null;
      content: string;
      links: string[];
      byteSize: number;
      fetchedAt: Date;
    },
  ): FetchResult {
    return {
      url,
      finalUrl: cached.finalUrl ?? url,
      httpStatus: cached.httpStatus,
      mimeType: cached.mimeType,
      title: cached.title,
      content: cached.content,
      links: cached.links,
      byteSize: cached.byteSize,
      cacheHit: true,
      latencyMs: 0,
    };
  }

  private async persist(jobId: string, result: FetchResult, cacheKey: string): Promise<void> {
    await this.cache.upsert(cacheKey, {
      key: cacheKey,
      url: result.url,
      finalUrl: result.finalUrl,
      httpStatus: result.httpStatus,
      mimeType: result.mimeType,
      title: result.title,
      content: result.content,
      links: result.links,
      byteSize: result.byteSize,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + FETCH_CACHE_TTL_MS),
    });
    await this.jobs.update(jobId, {
      status: FetchJobStatus.COMPLETED,
      httpStatus: result.httpStatus,
      finalUrl: result.finalUrl,
      mimeType: result.mimeType,
      byteSize: result.byteSize,
      title: result.title,
      content: result.content,
      links: result.links,
      latencyMs: result.latencyMs,
      completedAt: new Date(),
    });
  }
}
