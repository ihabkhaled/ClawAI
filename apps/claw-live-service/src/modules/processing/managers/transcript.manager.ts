import { Injectable } from '@nestjs/common';

import { LiveChunkOutcome } from '../../../common/enums/live-chunk-outcome.enum';
import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { resolveSpokenLanguage } from '../../../common/utilities/language.utility';
import { LiveFeedEventKind, LivePipelineStage } from '../../../generated/prisma';
import { TranscriptionAdapter } from '../adapters/transcription.adapter';
import { SUMMARY_WINDOW_MS } from '../constants/processing.constants';
import { FencedRunWriter } from '../services/fenced-run-writer.service';
import { RunEventEmitter } from '../services/run-event-emitter.service';
import type {
  AudioChunk,
  ChunkResult,
  ProviderCostInput,
  RunMemory,
  TranscribeReply,
  TranscriptLine,
  WorkerContext,
} from '../types/processing.types';
import { recordProviderCost } from '../utilities/provider-cost.utility';

/**
 * One 6 s chunk → STT → a fenced LiveTranscriptSegment (seq from the run's counter) +
 * its provider cost + a CAPTION event. No speech is a silence; an STT failure after
 * retries is a GAP marker. Text is never invented.
 */
@Injectable()
export class TranscriptManager {
  constructor(
    private readonly stt: TranscriptionAdapter,
    private readonly writer: FencedRunWriter,
    private readonly events: RunEventEmitter,
  ) {}

  async handleChunk(
    context: WorkerContext,
    memory: RunMemory,
    chunk: AudioChunk,
  ): Promise<ChunkResult> {
    const runId = context.lease.runId;
    const reply = await this.stt.transcribe(chunk.wav, `live:${runId}:${String(chunk.startAt)}`);
    memory.lastMediaAt = chunk.endAt;
    if (!reply) {
      await this.commitGap(context, chunk);
      return { outcome: LiveChunkOutcome.GAP, line: null };
    }
    memory.processedMs += chunk.endAt - chunk.startAt;
    const text = reply.text.trim();
    if (reply.noSpeech || text === '') {
      await this.commitSilence(context, chunk, reply);
      return { outcome: LiveChunkOutcome.SILENCE, line: null };
    }
    const language = resolveSpokenLanguage(reply.language, text, memory.spokenLanguage);
    if (language !== null) memory.spokenLanguage = language;
    const line = await this.commitSegment(context, chunk, { ...reply, language }, text);
    this.remember(memory, line);
    await this.events.emit([
      {
        type: LiveStreamEventType.CAPTION,
        runId,
        startAt: line.startAt,
        endAt: line.endAt,
        data: {
          segmentId: line.id,
          seq: line.seq,
          text: line.text,
          language: line.language,
          uncertain: false,
        },
      },
    ]);
    return { outcome: LiveChunkOutcome.TEXT, line };
  }

  private async commitSegment(
    context: WorkerContext,
    chunk: AudioChunk,
    reply: TranscribeReply,
    text: string,
  ): Promise<TranscriptLine> {
    const runId = context.lease.runId;
    return this.writer.commit(context.lease, async (tx) => {
      const run = await tx.liveProcessingRun.update({
        where: { id: runId },
        data: { nextSegmentSeq: { increment: 1 }, checkpointAt: BigInt(chunk.endAt) },
        select: { nextSegmentSeq: true },
      });
      const seq = run.nextSegmentSeq - 1;
      const segment = await tx.liveTranscriptSegment.create({
        data: {
          runId,
          seq,
          startAt: BigInt(chunk.startAt),
          endAt: BigInt(chunk.endAt),
          text,
          language: reply.language,
          provider: reply.provider,
        },
        select: { id: true },
      });
      await recordProviderCost(
        tx,
        this.costInput(`stt:${runId}:${String(seq)}`, runId, reply, chunk),
      );
      return {
        id: segment.id,
        seq,
        startAt: chunk.startAt,
        endAt: chunk.endAt,
        text,
        language: reply.language,
      };
    });
  }

  private async commitSilence(
    context: WorkerContext,
    chunk: AudioChunk,
    reply: TranscribeReply,
  ): Promise<void> {
    const runId = context.lease.runId;
    await this.writer.commit(context.lease, async (tx) => {
      await tx.liveProcessingRun.update({
        where: { id: runId },
        data: { checkpointAt: BigInt(chunk.endAt) },
      });
      await recordProviderCost(
        tx,
        this.costInput(`stt:${runId}:t${String(chunk.startAt)}`, runId, reply, chunk),
      );
    });
  }

  private async commitGap(context: WorkerContext, chunk: AudioChunk): Promise<void> {
    const runId = context.lease.runId;
    const eventKey = `gap:${String(chunk.startAt)}`;
    await this.writer.commit(context.lease, async (tx) => {
      await tx.liveFeedEvent.upsert({
        where: { runId_eventKey: { runId, eventKey } },
        create: {
          runId,
          eventKey,
          kind: LiveFeedEventKind.GAP,
          startAt: BigInt(chunk.startAt),
          endAt: BigInt(chunk.endAt),
          title: '',
          body: '',
          isOpen: false,
        },
        update: {},
      });
    });
  }

  private costInput(
    idempotencyKey: string,
    runId: string,
    reply: TranscribeReply,
    chunk: AudioChunk,
  ): ProviderCostInput {
    return {
      // Caption latency: from the end of the speech (media wall clock) to this commit.
      latencyMs: Math.max(0, Date.now() - chunk.endAt),
      idempotencyKey,
      runId,
      stage: LivePipelineStage.STT,
      provider: reply.provider,
      model: reply.model,
      units: Math.round(reply.durationSeconds),
      costMicroUsd: reply.costMicroUsd,
      succeeded: true,
    };
  }

  private remember(memory: RunMemory, line: TranscriptLine): void {
    memory.recent.push(line);
    memory.recent = memory.recent.filter((kept) => kept.endAt >= line.endAt - SUMMARY_WINDOW_MS);
    memory.pendingTranscriptMs += line.endAt - line.startAt;
    memory.pendingFirst ??= line;
    memory.lastSpeechEndAt = line.endAt;
  }
}
