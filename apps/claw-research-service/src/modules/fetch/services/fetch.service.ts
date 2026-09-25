import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { FETCH_CACHE_TTL_MS } from '../../../common/constants/fetch.constants';
import { BlockSignalKind } from '../../../common/enums/block-signal-kind.enum';
import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { sha256Hex } from '../../../common/utilities/crypto.utility';
import { ResearchUsageService } from '../../../common/services/research-usage.service';
import { MACHINE_READABLE_STRATEGIES } from '../constants/fetch-strategy.constants';
import { DomainPolicyOutcome } from '../enums/domain-policy-outcome.enum';
import { FetchPurpose } from '../enums/fetch-purpose.enum';
import { RobotsOutcome } from '../enums/robots-outcome.enum';
import { FetchEscalationError } from '../errors/fetch-escalation.error';
import { FetchJobRepository } from '../repositories/fetch-job.repository';
import { PageCacheRepository } from '../repositories/page-cache.repository';
import { evaluateDomainPolicy } from '../utilities/domain-policy.utility';
import { loggablePath } from '../utilities/escalation-helpers.utility';
import { FetchStrategyOrchestratorService } from './fetch-strategy-orchestrator.service';
import { RobotsPolicyService } from './robots-policy.service';
import { type FetchJob, FetchJobStatus, FetchStrategyKind } from '../../../generated/prisma';
import type { EscalationOptions } from '../types/fetch-strategy.types';
import type { FetchResult } from '../types/fetch.types';
import type { RobotsDecision } from '../types/robots-policy.types';
import type { FetchRequestDto } from '../dto/fetch-request.dto';

/**
 * The one fetch entry point of research-service (rule 41 §12 — no second
 * fetch path). Order, every time:
 *
 * 1. normalize the URL and apply the operator domain allow/blocklist;
 * 2. robots.txt (`RobotsPolicyService`): a Disallow refuses the fetch here,
 *    before a job row, a usage record or any strategy exists;
 * 3. the page cache (unless `refresh`);
 * 4. the escalation chain (`FetchStrategyOrchestratorService`, ADR-121).
 */
@Injectable()
export class FetchService {
  private readonly logger = new Logger(FetchService.name);

  constructor(
    private readonly orchestrator: FetchStrategyOrchestratorService,
    private readonly robots: RobotsPolicyService,
    private readonly jobs: FetchJobRepository,
    private readonly cache: PageCacheRepository,
    private readonly researchUsage: ResearchUsageService,
  ) {}

  async fetchPage(
    userId: string,
    dto: FetchRequestDto,
    purpose: FetchPurpose = FetchPurpose.PAGE,
  ): Promise<FetchResult> {
    const normalized = this.normalizeUrl(dto.url);
    this.enforceDomainPolicy(normalized);
    const robots = await this.robots.evaluate(normalized);
    this.enforceRobots(normalized, robots);

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
      const { result } = await this.orchestrator.fetchWithEscalation(
        { url: normalized, timeoutMs: dto.timeoutMs },
        this.escalationOptions(purpose, robots),
      );
      await this.persist(job.id, result, cacheKey);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Fetch failed ${loggablePath(normalized)}: ${message}`);
      await this.jobs.update(job.id, {
        status: FetchJobStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });
      throw new BusinessException(
        'research.fetch.failed',
        ResearchErrorCode.FETCH_FAILED,
        HttpStatus.BAD_GATEWAY,
        {
          url: normalized,
          message,
          signals: error instanceof FetchEscalationError ? error.signals : [],
          strategiesTried:
            error instanceof FetchEscalationError
              ? error.attempts.map((attempt) => attempt.kind)
              : [],
        },
      );
    } finally {
      await this.researchUsage.record(userId, 'WEB_FETCH', job.id);
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

  /**
   * A robots.txt Disallow is a refusal: 403, nothing fetched, nothing billed.
   * Logged with the robots URL so an operator can see which rule applied.
   */
  private enforceRobots(url: string, robots: RobotsDecision): void {
    if (robots.outcome !== RobotsOutcome.DISALLOWED) {
      return;
    }
    this.logger.log(
      `fetch.refused reason=robots_disallow path=${loggablePath(url)} robots=${robots.robotsUrl}`,
    );
    throw new BusinessException(
      'research.fetch.robotsDisallowed',
      ResearchErrorCode.FETCH_ROBOTS_DISALLOWED,
      HttpStatus.FORBIDDEN,
      { url, robotsUrl: robots.robotsUrl },
    );
  }

  private escalationOptions(purpose: FetchPurpose, robots: RobotsDecision): EscalationOptions {
    const excludeKinds: FetchStrategyKind[] = [];
    // The env switch stays as the operator's hard kill for the in-process
    // browser (a resource lever — ADR-094); DB enablement cannot override it.
    if (!AppConfig.get().RESEARCH_HEADLESS_RENDER_ENABLED) {
      excludeKinds.push(FetchStrategyKind.HEADLESS_BROWSER);
    }
    if (purpose === FetchPurpose.MACHINE_READABLE) {
      excludeKinds.push(
        ...Object.values(FetchStrategyKind).filter(
          (kind) => !MACHINE_READABLE_STRATEGIES.has(kind),
        ),
      );
    }
    return {
      excludeKinds,
      minHostIntervalMs: robots.crawlDelayMs,
      initialSignals:
        robots.outcome === RobotsOutcome.UNREACHABLE ? [BlockSignalKind.ROBOTS_UNREACHABLE] : [],
    };
  }

  private normalizeUrl(raw: string): string {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.protocol = parsed.protocol.toLowerCase();
    return parsed.href;
  }

  private enforceDomainPolicy(url: string): void {
    const config = AppConfig.get();
    const result = evaluateDomainPolicy(
      url,
      config.RESEARCH_DOMAIN_ALLOWLIST,
      config.RESEARCH_DOMAIN_BLOCKLIST,
    );
    if (result.outcome === DomainPolicyOutcome.BLOCKED) {
      throw new BusinessException(
        result.reason ?? 'Domain blocked by policy',
        ResearchErrorCode.DOMAIN_BLOCKED,
        HttpStatus.FORBIDDEN,
        { url, host: result.host },
      );
    }
    if (result.outcome === DomainPolicyOutcome.NOT_ALLOWED) {
      throw new BusinessException(
        result.reason ?? 'Domain not on allowlist',
        ResearchErrorCode.DOMAIN_NOT_ALLOWED,
        HttpStatus.FORBIDDEN,
        { url, host: result.host },
      );
    }
    if (result.outcome === DomainPolicyOutcome.INVALID_URL) {
      throw new BusinessException(
        result.reason ?? 'Invalid URL',
        ResearchErrorCode.UNSAFE_URL,
        HttpStatus.BAD_REQUEST,
        { url },
      );
    }
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
      servedBy: result.servedBy ?? null,
      archivedAt: result.archivedAt === undefined ? null : new Date(result.archivedAt),
      completedAt: new Date(),
    });
  }
}
