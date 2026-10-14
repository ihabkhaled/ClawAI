import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
  Optional,
} from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import {
  BOARD_COUNTS_PORT,
  type BoardCountsPort,
} from '../../publication-community/ports/board-counts.port';
import {
  BOARD_NOTIFY_MAX_TRACKED,
  BOARD_NOTIFY_MIN_INTERVAL_MS,
  MILLISECONDS_PER_DAY,
  VIEW_DEDUPE_WINDOW_MS,
  VIEW_RETENTION_DAYS,
  VIEW_RETENTION_INTERVAL_MS,
} from '../constants/publication-view.constants';
import { PublicationViewsRepository } from '../repositories/publication-views.repository';
import type {
  PublicationViewCounts,
  PublicationViewRequest,
} from '../types/publication-view.types';
import {
  hashAnonymousViewer,
  hashReader,
  isBotUserAgent,
} from '../utilities/publication-viewer.utility';

/**
 * Privacy-safe reach counters for a public Thread.
 *
 * Only humans count: crawlers and scripted clients are ignored, so search engines
 * reading a page never inflate it. A reload inside the dedupe window is one view.
 * A signed-in reader is also counted once as a distinct reader. Neither the address
 * nor the account id is stored, only keyed hashes, and no endpoint ever returns
 * who read anything.
 */
@Injectable()
export class PublicationViewsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicationViewsService.name);
  private purgeTimer: ReturnType<typeof setInterval> | undefined;
  /** When each publication's Board row was last refreshed from a view (coalescing). */
  private readonly lastBoardNotify = new Map<string, number>();

  constructor(
    private readonly views: PublicationViewsRepository,
    @Optional() @Inject(BOARD_COUNTS_PORT) private readonly boardCounts?: BoardCountsPort,
  ) {}

  onModuleInit(): void {
    this.purgeTimer = setInterval(() => void this.purgeOldViews(), VIEW_RETENTION_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  async record(slug: string, request: PublicationViewRequest): Promise<PublicationViewCounts> {
    const secret = AppConfig.get().INTER_SERVICE_AUTH_TOKEN;
    const isHuman = request.userId !== null || !isBotUserAgent(request.userAgent);
    const viewerHash =
      request.userId === null
        ? hashAnonymousViewer(secret, request.ip, request.userAgent ?? '')
        : hashReader(secret, request.userId);
    const counts = isHuman
      ? await this.views.recordView({
          slug,
          viewerHash,
          readerHash: request.userId === null ? null : hashReader(secret, request.userId),
          windowStart: new Date(Date.now() - VIEW_DEDUPE_WINDOW_MS),
        })
      : await this.views.readCounts(slug);
    if (counts === null) throw new NotFoundException('Publication not found');
    if (isHuman) this.notifyBoard(slug);
    return counts;
  }

  /**
   * Pushes the new view count to the Board row. It is coalesced per publication (one refresh per
   * interval, however many views arrive) and runs in the background: a public, unauthenticated
   * endpoint must not wait for, or multiply, a database refresh. The reconcile job heals any miss.
   */
  private notifyBoard(slug: string): void {
    if (!this.boardCounts) return;
    const now = Date.now();
    const last = this.lastBoardNotify.get(slug);
    if (last !== undefined && now - last < BOARD_NOTIFY_MIN_INTERVAL_MS) return;
    if (this.lastBoardNotify.size >= BOARD_NOTIFY_MAX_TRACKED) this.lastBoardNotify.clear();
    this.lastBoardNotify.set(slug, now);
    this.boardCounts.viewsChanged(slug).catch((error: unknown) => {
      this.logger.warn(
        `Board view count update failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    });
  }

  private async purgeOldViews(): Promise<void> {
    try {
      const removed = await this.views.purgeViewsBefore(
        new Date(Date.now() - VIEW_RETENTION_DAYS * MILLISECONDS_PER_DAY),
      );
      if (removed > 0) this.logger.log(`Purged ${String(removed)} expired view rows`);
    } catch {
      this.logger.warn('View retention purge failed; it will run again');
    }
  }
}
