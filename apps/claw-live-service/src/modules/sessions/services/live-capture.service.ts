import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { LiveErrorCode } from '../../../common/enums/live-error-code.enum';
import { LiveCapability } from '../../../generated/prisma';
import {
  LIVE_CAPTURE_ACCEPTING_STATES,
  LIVE_CAPTURE_HEARTBEAT_FRESH_MS,
  LIVE_CAPTURE_MAX_BYTES,
} from '../constants/live-capture.constants';
import { LiveCaptureManager } from '../managers/live-capture.manager';
import { LiveCaptureRepository } from '../repositories/live-capture.repository';
import type { LiveCaptureAcceptedView, LiveCaptureTarget } from '../types/live-capture.types';
import { parseCaptureWav, parseChunkStartAt } from '../utilities/live-capture-wav.utility';

/**
 * Browser capture: accepts one tab-audio WAV chunk from the viewer's own browser and queues
 * it for the run's worker. Checks, in order: owner (404), session open (409), source is
 * BROWSER_CAPTURE (422), this session owns the run's audio (409), rate (429), WAV (422),
 * chunk time (422). Media time = X-Chunk-Start-At, end = start + WAV duration.
 */
@Injectable()
export class LiveCaptureService {
  constructor(
    private readonly targets: LiveCaptureRepository,
    private readonly capture: LiveCaptureManager,
  ) {}

  async ingest(
    sessionId: string,
    userId: string,
    body: unknown,
    startAtHeader: string | undefined,
  ): Promise<LiveCaptureAcceptedView> {
    const target = await this.targets.findTarget(sessionId, userId);
    if (!target) {
      throw new NotFoundException({
        message: 'Live session not found',
        errorCode: LiveErrorCode.LIVE_SESSION_NOT_FOUND,
      });
    }
    const runId = this.assertCaptureOwner(target);
    if (!(await this.capture.claimRateSlot(sessionId))) {
      throw new HttpException(
        {
          message: 'Audio chunks too frequent',
          errorCode: LiveErrorCode.LIVE_CAPTURE_RATE_LIMITED,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const wav = this.assertWav(body);
    const durationMs = parseCaptureWav(wav)?.durationMs;
    if (durationMs === undefined) {
      throw this.unprocessable(LiveErrorCode.LIVE_CAPTURE_AUDIO_INVALID, 'Invalid audio chunk');
    }
    const startAt = parseChunkStartAt(startAtHeader, Date.now());
    if (startAt === null) {
      throw this.unprocessable(LiveErrorCode.LIVE_CAPTURE_CHUNK_TIME_INVALID, 'Invalid chunk time');
    }
    await this.capture.enqueue(runId, { wav, startAt, endAt: startAt + durationMs });
    return { accepted: true };
  }

  /** State, capability and capture ownership; returns the run id the chunk goes to. */
  private assertCaptureOwner(target: LiveCaptureTarget): string {
    const lastSeen = (target.lastHeartbeatAt ?? target.startedAt).getTime();
    const watching = Date.now() - lastSeen <= LIVE_CAPTURE_HEARTBEAT_FRESH_MS;
    if (!LIVE_CAPTURE_ACCEPTING_STATES.includes(target.state) || !watching) {
      throw new ConflictException({
        message: 'Live session is not analysing',
        errorCode: LiveErrorCode.LIVE_CAPTURE_SESSION_INACTIVE,
      });
    }
    if (target.capability !== LiveCapability.BROWSER_CAPTURE) {
      throw this.unprocessable(
        LiveErrorCode.LIVE_CAPTURE_NOT_SUPPORTED,
        'This source is not analysed from the browser',
      );
    }
    if (target.runId === null || target.captureSessionId !== target.sessionId) {
      throw new ConflictException({
        message: 'Another session is capturing this stream',
        errorCode: LiveErrorCode.LIVE_CAPTURE_SESSION_MISMATCH,
      });
    }
    return target.runId;
  }

  private assertWav(body: unknown): Buffer {
    // `instanceof` (not Buffer.isBuffer) so the type is proven before any `.length` read: a
    // tampered body (array, string, object) must never reach the size checks (CodeQL js/type-confusion).
    if (Array.isArray(body) || typeof body === 'string' || !(body instanceof Buffer)) {
      throw this.unprocessable(LiveErrorCode.LIVE_CAPTURE_AUDIO_INVALID, 'Invalid audio chunk');
    }
    if (body.length === 0) {
      throw this.unprocessable(LiveErrorCode.LIVE_CAPTURE_AUDIO_INVALID, 'Invalid audio chunk');
    }
    if (body.length > LIVE_CAPTURE_MAX_BYTES) {
      throw new PayloadTooLargeException({
        message: 'Audio chunk too large',
        errorCode: LiveErrorCode.LIVE_CAPTURE_TOO_LARGE,
      });
    }
    return body;
  }

  private unprocessable(errorCode: LiveErrorCode, message: string): UnprocessableEntityException {
    return new UnprocessableEntityException({ message, errorCode });
  }
}
