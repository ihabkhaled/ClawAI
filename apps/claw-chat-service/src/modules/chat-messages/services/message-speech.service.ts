import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SpeechUnavailableReason } from '@claw/shared-types';

import { SpeechJobStatus } from '../../../common/enums';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { MessageRole } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { SpeechFileStoreClient } from '../clients/speech-file-store.client';
import {
  SPEECH_MAX_CHARACTERS,
  SPEECH_STATE_VERSION,
  TEXT_TO_SPEECH_PLAN_FEATURE,
  TTS_CANCEL_PENDING_CODE,
  TTS_CANCEL_PENDING_MESSAGE,
  TTS_FAILED_CODE,
  TTS_JOB_LOCK_UNAVAILABLE_MESSAGE,
  TTS_NOTHING_TO_READ_CODE,
  TTS_NOTHING_TO_READ_MESSAGE,
} from '../constants/speech.constants';
import { SpeechJobManager } from '../managers/speech-job.manager';
import { SpeechSynthesisManager } from '../managers/speech-synthesis.manager';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { SpeechJobCancelStore } from '../repositories/speech-job-cancel.store';
import { SpeechJobLockStore } from '../repositories/speech-job-lock.store';
import type {
  MessageSpeechStartResult,
  MessageSpeechStateResponse,
  SpeakableText,
  SpeechAvailability,
  SpeechJobState,
  SpeechSourceMessage,
} from '../types/speech.types';
import {
  isCancellableSpeechJob,
  isStaleSpeechJob,
  readSpeechJobState,
  toSpeechStateResponse,
  withSpeechJobState,
} from '../utilities/speech-job-state.utility';
import { segmentSpeakableText } from '../utilities/speech-segments.utility';
import { prepareSpeakableText } from '../utilities/speakable-text.utility';
import { AccessControlService } from './access-control.service';

/**
 * "Read aloud" — progressive text-to-speech of one assistant reply
 * (multimodal batch 9; asynchronous since 2026-09-25, ADR-120 addendum).
 *
 * `start` (POST) never waits on a provider. Order is load-bearing: ownership
 * (404 for a stranger, like a missing id) → plan gate (403 before anything
 * paid) → speakable text → a READY reading of the SAME text replays for free
 * (200) → a running job is reported, never doubled (202) → otherwise the
 * reply's Redis job lock is taken, `metadata.speech` is written GENERATING
 * and `SpeechJobManager` runs in the background (202). A losing replica
 * answers the state as it is. `getState` (GET) is the poll: owner-only, free.
 * `cancel` (POST …/speech/cancel) is the owner's Stop: idempotent, never paid.
 */
@Injectable()
export class MessageSpeechService {
  private readonly logger = new Logger(MessageSpeechService.name);

  constructor(
    private readonly messages: ChatMessagesRepository,
    private readonly threads: ChatThreadsRepository,
    private readonly accessControl: AccessControlService,
    private readonly synthesis: SpeechSynthesisManager,
    private readonly files: SpeechFileStoreClient,
    private readonly jobs: SpeechJobManager,
    private readonly lock: SpeechJobLockStore,
    private readonly cancels: SpeechJobCancelStore,
  ) {}

  async getAvailability(userId: string): Promise<SpeechAvailability> {
    let onPlan: boolean;
    try {
      onPlan = await this.accessControl.hasPlanFeatureFor(userId, TEXT_TO_SPEECH_PLAN_FEATURE);
    } catch {
      return { available: false, reason: SpeechUnavailableReason.TEMPORARILY_UNAVAILABLE };
    }
    if (!onPlan) {
      return { available: false, reason: SpeechUnavailableReason.PLAN_DISABLED };
    }
    return (await this.synthesis.hasConfiguredVoice())
      ? { available: true, reason: null }
      : { available: false, reason: SpeechUnavailableReason.NO_VOICE_CONFIGURED };
  }

  /** The poll: the reading of the reply's CURRENT text, as stored. Owner-only; nothing paid. */
  async getState(userId: string, messageId: string): Promise<MessageSpeechStateResponse> {
    const message = await this.loadOwnedReply(userId, messageId);
    const speakable = this.speakable(message);
    return toSpeechStateResponse(
      readSpeechJobState(message.metadata),
      speakable.contentHash,
      Date.now(),
    );
  }

  /**
   * The owner's Stop (pack §72). Owner-only (a stranger gets the missing-id
   * 404). Only a live GENERATING job of the reply's CURRENT text is
   * cancelled: the Redis flag for its generation is set FIRST (so every
   * replica's job sees it within `SPEECH_JOB_CANCEL_POLL_INTERVAL_MS`), then
   * `metadata.speech` is written CANCELLED. Segments already stored stay
   * (they were heard and charged); the job releases any in-flight hold.
   * Anything else — NONE, READY, PARTIAL, FAILED, already CANCELLED, stale —
   * is a no-op that answers the state as it is (200, idempotent). Redis down
   * → 503: a stop that cannot reach the job is never claimed.
   */
  async cancel(userId: string, messageId: string): Promise<MessageSpeechStateResponse> {
    const message = await this.loadOwnedReply(userId, messageId);
    const speakable = this.speakable(message);
    const now = Date.now();
    const stored = readSpeechJobState(message.metadata);
    const current = stored?.contentHash === speakable.contentHash ? stored : null;
    if (current === null || !isCancellableSpeechJob(current, now)) {
      this.logger.log(
        `speech: cancel messageId=${messageId} outcome=NOOP status=${current?.status ?? SpeechJobStatus.NONE}`,
      );
      return toSpeechStateResponse(current, speakable.contentHash, now);
    }
    await this.requestCancel(messageId, current.generation);
    const cancelled = await this.markCancelled(messageId, current.generation);
    this.logger.log(
      `speech: cancel messageId=${messageId} generation=${String(current.generation)} outcome=CANCELLED stored=${String((cancelled ?? current).segments.length)}/${String(current.totalSegments)}`,
    );
    return toSpeechStateResponse(
      cancelled ?? { ...current, status: SpeechJobStatus.CANCELLED, errorCode: null },
      speakable.contentHash,
      now,
    );
  }

  async start(userId: string, messageId: string): Promise<MessageSpeechStartResult> {
    const message = await this.loadOwnedReply(userId, messageId);
    await this.accessControl.assertTextToSpeechAccess(userId);
    const speakable = this.speakable(message);
    const now = Date.now();
    const stored = readSpeechJobState(message.metadata);
    const current = stored?.contentHash === speakable.contentHash ? stored : null;
    if (current !== null && (await this.isReplayable(current, userId))) {
      this.logger.log(
        `speech: replay messageId=${messageId} segments=${String(current.segments.length)}`,
      );
      return this.answer(HttpStatus.OK, current, speakable, now);
    }
    if (current?.status === SpeechJobStatus.GENERATING && !isStaleSpeechJob(current, now)) {
      return this.answer(HttpStatus.ACCEPTED, current, speakable, now);
    }
    // A READY reading we could not replay (its file is gone) is redone in full.
    return this.launch(
      userId,
      messageId,
      speakable,
      now,
      current?.status === SpeechJobStatus.READY,
    );
  }

  /** Takes the reply's job lock and starts the background job, or reports the sibling's. */
  private async launch(
    userId: string,
    messageId: string,
    speakable: SpeakableText,
    now: number,
    discardReady: boolean,
  ): Promise<MessageSpeechStartResult> {
    const lockToken = await this.acquireLock(messageId);
    if (lockToken === null) {
      const running = await this.reload(messageId);
      if (
        running?.status === SpeechJobStatus.CANCELLED &&
        running.contentHash === speakable.contentHash
      ) {
        // The stopped job still holds the lock while it releases its last hold.
        throw new BusinessException(
          TTS_CANCEL_PENDING_MESSAGE,
          TTS_CANCEL_PENDING_CODE,
          HttpStatus.CONFLICT,
        );
      }
      // A sibling replica (or a concurrent request) owns the job: report, never double.
      return this.answer(HttpStatus.ACCEPTED, running, speakable, now, true);
    }
    let state: SpeechJobState;
    try {
      state = await this.beginJob(messageId, speakable, now, discardReady);
    } catch (error: unknown) {
      await this.lock.release(messageId, lockToken).catch(() => {});
      throw error;
    }
    if (state.status === SpeechJobStatus.READY) {
      // Finished by a sibling between our read and our lock.
      await this.lock.release(messageId, lockToken).catch(() => {});
      return this.answer(HttpStatus.OK, state, speakable, now);
    }
    void this.jobs.run({
      userId,
      messageId,
      lockToken,
      speakable,
      segments: segmentSpeakableText(speakable.text),
      state,
    });
    return this.answer(HttpStatus.ACCEPTED, state, speakable, now);
  }

  /**
   * Under the lock: re-read (a sibling may just have finished), keep the
   * segments a PARTIAL / FAILED / stale run already stored and charged, and
   * write the new GENERATING state under a NEW generation — every requestId of
   * this job is new, so no settled hold is ever reused (rule 37 item 15).
   */
  private async beginJob(
    messageId: string,
    speakable: SpeakableText,
    now: number,
    discardReady: boolean,
  ): Promise<SpeechJobState> {
    const message = await this.messages.findById(messageId);
    if (message === null) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }
    const latest = readSpeechJobState(message.metadata);
    const sameText = latest?.contentHash === speakable.contentHash;
    if (sameText && latest.status === SpeechJobStatus.READY && !discardReady) {
      return latest;
    }
    const keep = sameText && latest.status !== SpeechJobStatus.READY ? latest.segments : [];
    const state: SpeechJobState = {
      version: SPEECH_STATE_VERSION,
      status: SpeechJobStatus.GENERATING,
      contentHash: speakable.contentHash,
      generation: (latest?.generation ?? 0) + 1,
      startedAt: new Date(now).toISOString(),
      totalSegments: segmentSpeakableText(speakable.text).length,
      characters: speakable.characters,
      truncated: speakable.truncated,
      segments: keep,
      errorCode: null,
    };
    await this.messages.updateMetadata(messageId, withSpeechJobState(message.metadata, state));
    this.logger.log(
      `speech: job started messageId=${messageId} generation=${String(state.generation)} segments=${String(state.totalSegments)} kept=${String(keep.length)} characters=${String(state.characters)}`,
    );
    return state;
  }

  /**
   * A READY reading whose first file still exists (null = file-service could
   * not say; replay rather than charge twice).
   */
  private async isReplayable(state: SpeechJobState, userId: string): Promise<boolean> {
    const first = state.segments.at(0);
    return state.status !== SpeechJobStatus.READY || first === undefined
      ? false
      : (await this.files.exists(first.fileId, userId)) !== false;
  }

  /** The reply's Redis job lock, or null when a sibling owns it. Redis down → 503, nothing paid. */
  private async acquireLock(messageId: string): Promise<string | null> {
    try {
      return await this.lock.acquire(messageId);
    } catch {
      this.logger.error(`speech: job lock unavailable messageId=${messageId}`);
      throw new BusinessException(
        TTS_JOB_LOCK_UNAVAILABLE_MESSAGE,
        TTS_FAILED_CODE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /** Sets the cross-replica stop flag. Redis down → 503: a stop is never claimed that cannot reach the job. */
  private async requestCancel(messageId: string, generation: number): Promise<void> {
    try {
      await this.cancels.request(messageId, generation);
    } catch {
      this.logger.error(`speech: cancel flag unavailable messageId=${messageId}`);
      throw new BusinessException(
        TTS_JOB_LOCK_UNAVAILABLE_MESSAGE,
        TTS_FAILED_CODE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Writes CANCELLED over the reply's GENERATING state of `generation` (every
   * other metadata key kept). Null when the job finished or a newer
   * generation started meanwhile — then the state is left as it is.
   */
  private async markCancelled(
    messageId: string,
    generation: number,
  ): Promise<SpeechJobState | null> {
    const message = await this.messages.findById(messageId);
    const latest = message === null ? null : readSpeechJobState(message.metadata);
    if (
      message === null ||
      latest?.generation !== generation ||
      latest.status !== SpeechJobStatus.GENERATING
    ) {
      return latest;
    }
    const cancelled: SpeechJobState = {
      ...latest,
      status: SpeechJobStatus.CANCELLED,
      errorCode: null,
    };
    await this.messages.updateMetadata(messageId, withSpeechJobState(message.metadata, cancelled));
    return cancelled;
  }

  private async reload(messageId: string): Promise<SpeechJobState | null> {
    const message = await this.messages.findById(messageId);
    return message === null ? null : readSpeechJobState(message.metadata);
  }

  /**
   * The state for this text. `generating` = a sibling owns the job but may
   * not have written GENERATING yet: say so rather than NONE, so the client
   * keeps polling instead of POSTing again.
   */
  private answer(
    httpStatus: number,
    state: SpeechJobState | null,
    speakable: SpeakableText,
    now: number,
    generating = false,
  ): MessageSpeechStartResult {
    const body = toSpeechStateResponse(state, speakable.contentHash, now);
    return {
      httpStatus,
      body:
        generating && body.status === SpeechJobStatus.NONE
          ? { ...body, status: SpeechJobStatus.GENERATING, truncated: speakable.truncated }
          : body,
    };
  }

  private speakable(message: SpeechSourceMessage): SpeakableText {
    const speakable = prepareSpeakableText(message.content, SPEECH_MAX_CHARACTERS);
    if (speakable.characters === 0) {
      throw new BusinessException(
        TTS_NOTHING_TO_READ_MESSAGE,
        TTS_NOTHING_TO_READ_CODE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return speakable;
  }

  /** The assistant reply, or the same 404 a missing id gets (rules/16 IDOR). */
  private async loadOwnedReply(userId: string, messageId: string): Promise<SpeechSourceMessage> {
    const message = await this.messages.findById(messageId);
    const thread = message === null ? null : await this.threads.findById(message.threadId);
    if (message === null || thread?.userId !== userId) {
      throw new EntityNotFoundException('ChatMessage', messageId);
    }
    if (message.role !== MessageRole.ASSISTANT) {
      throw new BusinessException(
        TTS_NOTHING_TO_READ_MESSAGE,
        TTS_NOTHING_TO_READ_CODE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return { id: message.id, content: message.content, metadata: message.metadata };
  }
}
