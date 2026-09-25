import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { SpeechJobStatus } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import { SpeechFileStoreClient } from '../clients/speech-file-store.client';
import {
  SPEECH_JOB_DEADLINE_MS,
  SPEECH_RATE_LIMITED_CONCURRENCY,
  SPEECH_SEGMENT_CONCURRENCY,
  TTS_FAILED_CODE,
  TTS_FAILED_MESSAGE,
} from '../constants/speech.constants';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { SpeechJobLockStore } from '../repositories/speech-job-lock.store';
import type {
  SpeechJobInput,
  SpeechJobProgress,
  SpeechJobState,
  SpeechSynthesisResult,
  SpeechTextSegment,
  StoredSpeechSegment,
} from '../types/speech.types';
import {
  finalSpeechStatus,
  withSpeechJobState,
  withStoredSegment,
} from '../utilities/speech-job-state.utility';
import { speechFilename, speechStoreTimeoutMs } from '../utilities/speech.utility';
import { SpeechSynthesisManager } from './speech-synthesis.manager';

/**
 * The background half of a progressive "Read aloud" (2026-09-25). Started by
 * `MessageSpeechService.start` under the reply's Redis job lock, it
 * synthesises the missing segments with at most `SPEECH_SEGMENT_CONCURRENCY`
 * provider calls in flight, segment 1 first — dropping to one in flight for
 * the rest of the job after its first rate-limited attempt. Per segment:
 *
 *   reserve → provider → store the audio in file-service →
 *   record it in `metadata.speech.segments` (index order) → finalize
 *
 * and a store/record failure releases that segment's hold instead (rule 37
 * item 17: never charge for audio the user did not receive). A provider
 * failure fails only its segment; a credit refusal, a clamp, an unverifiable
 * meter, "no voice configured" or the job deadline stops every worker (rule
 * 37 item 18). The job ends READY, PARTIAL (the stored segments play and are
 * charged, the rest were released) or FAILED, writes that state, and releases
 * the lock. It never throws, and no provider attempt starts that could not be
 * stored and settled before `SPEECH_JOB_DEADLINE_MS`.
 */
@Injectable()
export class SpeechJobManager {
  private readonly logger = new Logger(SpeechJobManager.name);

  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly synthesis: SpeechSynthesisManager,
    private readonly files: SpeechFileStoreClient,
    private readonly lock: SpeechJobLockStore,
  ) {}

  async run(input: SpeechJobInput): Promise<void> {
    const started = Date.now();
    const deadlineAt = Date.parse(input.state.startedAt) + SPEECH_JOB_DEADLINE_MS;
    const progress: SpeechJobProgress = {
      state: input.state,
      stopCode: null,
      errorCode: null,
      writes: Promise.resolve(),
      concurrency: SPEECH_SEGMENT_CONCURRENCY,
      inFlight: 0,
    };
    try {
      const done = new Set(input.state.segments.map((segment) => segment.index));
      const queue = input.segments.filter((segment) => !done.has(segment.index));
      const workers = Math.min(SPEECH_SEGMENT_CONCURRENCY, queue.length);
      await Promise.all(
        Array.from({ length: workers }, async () =>
          this.worker(input, progress, queue, deadlineAt),
        ),
      );
      await progress.writes;
      await this.finish(input, progress);
    } catch (error: unknown) {
      this.logger.error(
        `ttsJob: messageId=${input.messageId} ended abnormally — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    } finally {
      await this.releaseLock(input);
      this.logger.log(
        `ttsJob messageId=${input.messageId} generation=${String(input.state.generation)} status=${progress.state.status} segments=${String(progress.state.segments.length)}/${String(input.state.totalSegments)} ms=${String(Date.now() - started)}`,
      );
    }
  }

  /**
   * Takes segments off the shared queue until it is empty, the job must stop,
   * or the job's concurrency dropped below the calls already in flight (after
   * a rate limit): that worker retires, and the last call to finish always
   * sees room, so the queue never strands. Bounded by the queue.
   */
  private async worker(
    input: SpeechJobInput,
    progress: SpeechJobProgress,
    queue: SpeechTextSegment[],
    deadlineAt: number,
  ): Promise<void> {
    while (
      queue.length > 0 &&
      progress.stopCode === null &&
      progress.inFlight < progress.concurrency
    ) {
      const segment = queue.shift();
      if (segment === undefined) {
        return;
      }
      progress.inFlight += 1;
      try {
        await this.runSegment(input, progress, segment, deadlineAt);
      } finally {
        progress.inFlight -= 1;
      }
    }
  }

  /** The job's first rate limit drops it to one provider call in flight; in-flight calls finish. */
  private onRateLimited(input: SpeechJobInput, progress: SpeechJobProgress): void {
    if (progress.concurrency === SPEECH_RATE_LIMITED_CONCURRENCY) {
      return;
    }
    progress.concurrency = SPEECH_RATE_LIMITED_CONCURRENCY;
    this.logger.warn(
      `ttsJob messageId=${input.messageId} rateLimited concurrency=${String(SPEECH_RATE_LIMITED_CONCURRENCY)}`,
    );
  }

  private async runSegment(
    input: SpeechJobInput,
    progress: SpeechJobProgress,
    segment: SpeechTextSegment,
    deadlineAt: number,
  ): Promise<void> {
    let result: SpeechSynthesisResult;
    try {
      result = await this.synthesis.synthesize({
        userId: input.userId,
        messageId: input.messageId,
        contentHash: input.state.contentHash,
        generation: input.state.generation,
        segment,
        deadlineAt,
        onRateLimited: () => this.onRateLimited(input, progress),
      });
    } catch (error: unknown) {
      this.onSegmentFailure(input, progress, segment, error);
      return;
    }
    let delivered = false;
    try {
      const stored = await this.store(input, segment, result, deadlineAt);
      await this.record(input, progress, stored);
      delivered = true;
    } catch {
      progress.errorCode = TTS_FAILED_CODE;
    }
    await this.settle(input, segment, result, delivered);
  }

  /**
   * Finalizes a delivered segment on its measured units, or releases one the
   * user did not receive. A meter hiccup here is logged, never allowed to end
   * the other workers: the audio is already stored (or already gone), and an
   * open hold expires on the auth side.
   */
  private async settle(
    input: SpeechJobInput,
    segment: SpeechTextSegment,
    result: SpeechSynthesisResult,
    delivered: boolean,
  ): Promise<void> {
    try {
      await (delivered
        ? this.synthesis.settle(result.settlement)
        : this.synthesis.releaseUnstored(result.settlement));
    } catch {
      this.logger.error(
        `ttsSettlement messageId=${input.messageId} segment=${String(segment.index + 1)} reservationId=${String(result.settlement.held.hold.reservationId)} outcome=${delivered ? 'FINALIZE_FAILED' : 'RELEASE_FAILED'}`,
      );
    }
  }

  /**
   * A provider failure fails only this segment. Anything else — a credit
   * refusal (402), an unverifiable meter or no voice (503), the deadline
   * (504) — stops every worker: the next segment would be refused again.
   */
  private onSegmentFailure(
    input: SpeechJobInput,
    progress: SpeechJobProgress,
    segment: SpeechTextSegment,
    error: unknown,
  ): void {
    const code = error instanceof BusinessException ? error.code : TTS_FAILED_CODE;
    const deadline =
      error instanceof BusinessException && error.getStatus() === HttpStatus.GATEWAY_TIMEOUT;
    progress.errorCode = code;
    if (code !== TTS_FAILED_CODE || deadline) {
      progress.stopCode = code;
    }
    this.logger.warn(
      `ttsSegment messageId=${input.messageId} segment=${String(segment.index + 1)} failed code=${code} stop=${String(progress.stopCode !== null)}`,
    );
  }

  /** The segment's audio as the owner's file. Throws on any failure or when no time is left. */
  private async store(
    input: SpeechJobInput,
    segment: SpeechTextSegment,
    result: SpeechSynthesisResult,
    deadlineAt: number,
  ): Promise<StoredSpeechSegment> {
    const timeoutMs = speechStoreTimeoutMs(deadlineAt, Date.now());
    if (timeoutMs === null) {
      throw new BusinessException(TTS_FAILED_MESSAGE, TTS_FAILED_CODE, HttpStatus.GATEWAY_TIMEOUT);
    }
    const fileId = await this.files.store({
      userId: input.userId,
      filename: speechFilename(input.messageId, result.audio.mimeType, segment.index),
      mimeType: result.audio.mimeType,
      bytes: result.audio.bytes,
      transcript: segment.text,
      timeoutMs,
    });
    return {
      index: segment.index,
      fileId,
      mimeType: result.audio.mimeType,
      characters: segment.characters,
      provider: result.candidate.provider,
      model: result.candidate.model,
    };
  }

  /** Adds the stored segment (index order) and persists; resolves once THIS write landed. */
  private async record(
    input: SpeechJobInput,
    progress: SpeechJobProgress,
    stored: StoredSpeechSegment,
  ): Promise<void> {
    progress.state = {
      ...progress.state,
      segments: withStoredSegment(progress.state.segments, stored),
    };
    await this.enqueueWrite(input.messageId, progress, progress.state);
  }

  private async finish(input: SpeechJobInput, progress: SpeechJobProgress): Promise<void> {
    const status = finalSpeechStatus(input.state.totalSegments, progress.state.segments.length);
    progress.state = {
      ...progress.state,
      status,
      errorCode:
        status === SpeechJobStatus.READY
          ? null
          : (progress.stopCode ?? progress.errorCode ?? TTS_FAILED_CODE),
    };
    await this.enqueueWrite(input.messageId, progress, progress.state);
  }

  /**
   * Chains one metadata write after the previous: re-reads the message so a
   * key another feature wrote meanwhile is kept, then replaces `speech`.
   */
  private async enqueueWrite(
    messageId: string,
    progress: SpeechJobProgress,
    state: SpeechJobState,
  ): Promise<void> {
    const write = progress.writes.then(async () => {
      const message = await this.messages.findById(messageId);
      if (message === null) {
        throw new Error('the reply no longer exists');
      }
      await this.messages.updateMetadata(messageId, withSpeechJobState(message.metadata, state));
    });
    progress.writes = write.catch(() => {});
    await write;
  }

  private async releaseLock(input: SpeechJobInput): Promise<void> {
    try {
      await this.lock.release(input.messageId, input.lockToken);
    } catch {
      // The TTL frees it; the state is already written.
      this.logger.warn(`ttsJob: lock release failed messageId=${input.messageId}`);
    }
  }
}
