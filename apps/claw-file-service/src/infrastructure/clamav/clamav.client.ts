import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../app/config/app.config';
import {
  ANTIVIRUS_UNAVAILABLE_REASON,
  CLAMAV_FAIL_FAST_WINDOW_MS,
  CLAMAV_PING_TIMEOUT_MS,
  CLAMAV_PONG_REPLY,
  CLAMAV_SCAN_DEADLINE_MS,
  CLAMAV_SCAN_SOCKET_TIMEOUT_MS,
} from '../../common/constants/clamav.constants';
import { ClamScanOutcome } from '../../common/enums/clam-scan-outcome.enum';
import {
  clamErrorCode,
  computeClamBackoffMs,
  isTransientClamError,
  sendInstream,
  sendPing,
} from '../../common/utilities/clamav-scanner.utility';
import type { ClamScanResult } from '../../modules/files/types/file-security.types';

/**
 * The one clamd client (ClamAV, port 3310).
 *
 * `scan` rides out a clamd restart: transient connection errors are retried
 * with bounded exponential backoff until CLAMAV_SCAN_DEADLINE_MS, then the
 * scan FAILS CLOSED as UNAVAILABLE — an unscanned file is never clean.
 * `ping` is the health probe (`zPING` → `PONG`), and never throws.
 *
 * Logs carry the socket error CODE only: Node's message embeds the container
 * IP (`connect ECONNREFUSED 172.18.0.6:3310`).
 */
@Injectable()
export class ClamavClient {
  private readonly logger = new Logger(ClamavClient.name);
  /** Until when a scan tries once instead of waiting a whole deadline again. */
  private failFastUntilMs = 0;

  async scan(buffer: Buffer): Promise<ClamScanResult> {
    const config = AppConfig.get();
    if (!config.CLAMAV_ENABLED) {
      this.logger.debug('scan: ClamAV disabled — skipping scan');
      return { clean: true, outcome: ClamScanOutcome.DISABLED, reason: 'scan_disabled' };
    }

    const startedAt = Date.now();
    const failFast = startedAt < this.failFastUntilMs;
    let attempt = 0;
    let lastCode = 'UNKNOWN';

    for (;;) {
      attempt += 1;
      try {
        const reply = await sendInstream(
          config.CLAMAV_HOST,
          config.CLAMAV_PORT,
          buffer,
          CLAMAV_SCAN_SOCKET_TIMEOUT_MS,
        );
        this.failFastUntilMs = 0;
        if (attempt > 1) {
          this.logger.log(
            `scan: clamd answered after ${String(attempt)} attempts (${String(Date.now() - startedAt)} ms)`,
          );
        }
        return this.interpret(reply);
      } catch (error: unknown) {
        lastCode = clamErrorCode(error);
        const elapsed = Date.now() - startedAt;
        const remaining = CLAMAV_SCAN_DEADLINE_MS - elapsed;
        if (failFast || !isTransientClamError(error) || remaining <= 0) {
          break;
        }
        const delay = Math.min(computeClamBackoffMs(attempt), remaining);
        this.logger.warn(
          `scan: clamd unreachable (${lastCode}), attempt ${String(attempt)}, retrying in ${String(delay)} ms (${String(elapsed)}/${String(CLAMAV_SCAN_DEADLINE_MS)} ms)`,
        );
        await this.sleep(delay);
      }
    }

    if (!failFast && isTransientClamError({ code: lastCode })) {
      this.failFastUntilMs = Date.now() + CLAMAV_FAIL_FAST_WINDOW_MS;
    }
    this.logger.error(
      `scan: FAIL CLOSED — clamd unreachable (${lastCode}) after ${String(attempt)} attempts in ${String(Date.now() - startedAt)} ms${failFast ? ' (fail-fast window)' : ''}`,
    );
    return {
      clean: false,
      outcome: ClamScanOutcome.UNAVAILABLE,
      reason: ANTIVIRUS_UNAVAILABLE_REASON,
    };
  }

  /**
   * clamd readiness: true on PONG, false when it does not answer in
   * CLAMAV_PING_TIMEOUT_MS, null when ClamAV is disabled (not measured).
   */
  async ping(): Promise<boolean | null> {
    const config = AppConfig.get();
    if (!config.CLAMAV_ENABLED) {
      return null;
    }
    try {
      const reply = await sendPing(config.CLAMAV_HOST, config.CLAMAV_PORT, CLAMAV_PING_TIMEOUT_MS);
      return reply === CLAMAV_PONG_REPLY;
    } catch (error: unknown) {
      this.logger.debug(`ping: clamd unreachable (${clamErrorCode(error)})`);
      return false;
    }
  }

  private interpret(reply: string): ClamScanResult {
    if (reply.endsWith('OK')) {
      this.logger.debug('scan: file is clean');
      return { clean: true, outcome: ClamScanOutcome.CLEAN, reason: 'clean' };
    }
    if (reply.endsWith('FOUND')) {
      const threat = reply.replace('stream: ', '').replace(' FOUND', '').trim();
      this.logger.warn(`scan: THREAT DETECTED — ${threat}`);
      return { clean: false, outcome: ClamScanOutcome.INFECTED, reason: threat };
    }
    this.logger.warn(`scan: unexpected clamd reply — ${reply}`);
    return {
      clean: false,
      outcome: ClamScanOutcome.UNEXPECTED,
      reason: `unexpected_response: ${reply}`,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
