import { Injectable, Logger } from '@nestjs/common';

import type { BoundedProcessResult } from '../../../common/utilities/process.types';
import { runBoundedProcess } from '../../../common/utilities/process.utility';
import {
  YTDLP_BINARY,
  YTDLP_MAX_CONCURRENT,
  YTDLP_MAX_OUTPUT_BYTES,
  YTDLP_SLOT_POLL_MS,
  YTDLP_SLOT_WAIT_MS,
  YTDLP_YOUTUBE_BLOCKED_PATTERN,
  YTDLP_YOUTUBE_CLIENT_FALLBACKS,
} from '../constants/server-pull.constants';
import type { YtdlpRun } from '../types/server-pull.types';
import { isYoutubeWatchUrl } from '../utilities/server-pull-url.utility';

/**
 * Every yt-dlp run of the service goes through here: argv only, bounded in time and output, at most
 * YTDLP_MAX_CONCURRENT at once per replica. A run waits for a free slot (up to YTDLP_SLOT_WAIT_MS)
 * instead of failing at once: a busy replica used to drop the viewer to browser capture.
 *
 * YouTube blocks data-centre addresses at times ("Sign in to confirm you're not a bot", production
 * 2026-11-26). A failed YouTube run is retried with the clients that still answer from a server
 * (`android_vr`, measured from production), never with cookies or an account.
 */
@Injectable()
export class YtdlpRunnerService {
  private readonly logger = new Logger(YtdlpRunnerService.name);
  private running = 0;

  /** The first run `accept`s, trying the YouTube client fallbacks for a YouTube link; null when none does. */
  async run(request: YtdlpRun): Promise<BoundedProcessResult | null> {
    const variants = isYoutubeWatchUrl(request.watchUrl)
      ? [[], ...YTDLP_YOUTUBE_CLIENT_FALLBACKS]
      : [[]];
    let last: BoundedProcessResult | null = null;
    for (const extra of variants) {
      last = await this.once(
        [...request.args, ...extra, '--', request.watchUrl],
        request.timeoutMs,
      );
      if (last !== null && request.accept(last)) return last;
      // Only YouTube's server block is worth another client; "not live" or "not found" is final.
      if (last === null || !YTDLP_YOUTUBE_BLOCKED_PATTERN.test(last.stderrTail)) break;
    }
    if (last !== null) {
      this.logger.warn(
        `yt-dlp gave up on ${request.watchUrl} after ${String(variants.length)} tries: exit=${String(last.exitCode)} ${last.stderrTail.slice(-200).trim()}`,
      );
    }
    return null;
  }

  private async once(
    args: readonly string[],
    timeoutMs: number,
  ): Promise<BoundedProcessResult | null> {
    if (!(await this.takeSlot())) {
      this.logger.warn('yt-dlp busy: no free slot in time');
      return null;
    }
    try {
      return await runBoundedProcess(YTDLP_BINARY, args, {
        timeoutMs,
        maxOutputBytes: YTDLP_MAX_OUTPUT_BYTES,
      });
    } catch {
      return null;
    } finally {
      this.running -= 1;
    }
  }

  /** Waits (bounded) for a free slot and takes it. */
  private async takeSlot(): Promise<boolean> {
    const deadline = Date.now() + YTDLP_SLOT_WAIT_MS;
    while (this.running >= YTDLP_MAX_CONCURRENT) {
      if (Date.now() >= deadline) return false;
      await new Promise((done) => setTimeout(done, YTDLP_SLOT_POLL_MS));
    }
    this.running += 1;
    return true;
  }
}
