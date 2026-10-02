import { HttpStatus, Injectable } from '@nestjs/common';

import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import {
  RUNTIME_CRAWL_DAY_MS,
  RUNTIME_CRAWL_STALE_RUN_FACTOR,
} from '../constants/runtime-crawl.constants';
import { RuntimeCrawlRunRepository } from '../repositories/runtime-crawl-run.repository';
import type { RuntimeCrawlConfig } from '../../../generated/prisma';
import type { StartRuntimeCrawlDto } from '../dto/start-runtime-crawl.dto';
import type { RuntimeCrawlEffectiveLimits } from '../types/runtime-crawl.types';

/**
 * Every hard per-user cap, decided BEFORE a run row or a single fetch exists.
 * A request is clamped to the config, never trusted: a client asking for 200
 * pages on a 50-page config gets 50, and the run row records the 50.
 */
@Injectable()
export class RuntimeCrawlLimitsService {
  constructor(private readonly runs: RuntimeCrawlRunRepository) {}

  async resolve(
    userId: string,
    dto: StartRuntimeCrawlDto,
    config: RuntimeCrawlConfig,
  ): Promise<RuntimeCrawlEffectiveLimits> {
    if (!config.enabled || config.maxPagesPerRun === 0) {
      throw this.refuse(
        ResearchErrorCode.RUNTIME_CRAWL_DISABLED,
        'research.runtimeCrawl.disabled',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const now = Date.now();
    const usage = await this.runs.usageSince(
      userId,
      new Date(now - RUNTIME_CRAWL_DAY_MS),
      new Date(now - config.runTimeoutSeconds * RUNTIME_CRAWL_STALE_RUN_FACTOR * 1000),
    );
    if (usage.running >= config.maxConcurrentRunsPerUser) {
      throw this.refuse(
        ResearchErrorCode.RUNTIME_CRAWL_CONCURRENCY_EXCEEDED,
        'research.runtimeCrawl.concurrencyExceeded',
      );
    }
    if (usage.runsToday >= config.maxRunsPerUserPerDay) {
      throw this.refuse(
        ResearchErrorCode.RUNTIME_CRAWL_DAILY_RUNS_EXCEEDED,
        'research.runtimeCrawl.dailyRunsExceeded',
      );
    }
    const remaining = config.dailyPageBudgetPerUser - usage.pagesToday;
    if (remaining <= 0) {
      throw this.refuse(
        ResearchErrorCode.RUNTIME_CRAWL_DAILY_BUDGET_EXCEEDED,
        'research.runtimeCrawl.dailyBudgetExceeded',
      );
    }
    return this.clamp(dto, config, remaining);
  }

  private clamp(
    dto: StartRuntimeCrawlDto,
    config: RuntimeCrawlConfig,
    remaining: number,
  ): RuntimeCrawlEffectiveLimits {
    if (dto.profile === 'extract') {
      return { maxPages: 1, maxDepth: 0 };
    }
    const wanted = dto.maxPages ?? config.maxPagesPerRun;
    return {
      maxPages: Math.max(1, Math.min(wanted, config.maxPagesPerRun, remaining)),
      maxDepth: Math.min(dto.maxDepth ?? config.maxLinkDepth, config.maxLinkDepth),
    };
  }

  private refuse(
    code: ResearchErrorCode,
    messageKey: string,
    status: HttpStatus = HttpStatus.TOO_MANY_REQUESTS,
  ): BusinessException {
    return new BusinessException(messageKey, code, status);
  }
}
