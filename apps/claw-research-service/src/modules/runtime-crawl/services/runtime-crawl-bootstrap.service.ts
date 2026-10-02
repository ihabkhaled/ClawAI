import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { RUNTIME_CRAWL_STALE_RUN_FACTOR } from '../constants/runtime-crawl.constants';
import { RuntimeCrawlRunRepository } from '../repositories/runtime-crawl-run.repository';
import { RuntimeCrawlConfigService } from './runtime-crawl-config.service';

/**
 * Idempotent seeder for the singleton limits row (an admin edit is never
 * overwritten), plus the boot sweep that turns a RUNNING row whose process
 * died into a truthful FAILED one, so it can neither hold a user's
 * concurrency slot forever nor claim to still be reading pages.
 */
@Injectable()
export class RuntimeCrawlBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(RuntimeCrawlBootstrapService.name);

  constructor(
    private readonly config: RuntimeCrawlConfigService,
    private readonly runs: RuntimeCrawlRunRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const config = await this.config.get();
    const staleBefore = new Date(
      Date.now() - config.runTimeoutSeconds * RUNTIME_CRAWL_STALE_RUN_FACTOR * 1000,
    );
    const swept = await this.runs.failStale(
      staleBefore,
      ResearchErrorCode.RUNTIME_CRAWL_INTERRUPTED,
      'The crawl was interrupted by a service restart before it finished.',
    );
    if (swept > 0) {
      this.logger.warn(`runtime_crawl.swept stale=${String(swept)}`);
    }
  }
}
