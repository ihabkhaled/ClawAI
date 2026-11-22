import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { introducesLinksOrMarkup } from '../../../common/utilities/plain-text.utility';
import { runBoundedProcess } from '../../../common/utilities/process.utility';
import { LiveFeedEventKind, LiveMode, LivePipelineStage } from '../../../generated/prisma';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import { LiveModelClient } from '../adapters/live-model.adapter';
import {
  FFMPEG_BINARY,
  FFMPEG_FRAME_TIMEOUT_MS,
  FFMPEG_MAX_FRAME_BYTES,
  VISION_FORCE_KEEP_MS,
  VISION_FRAME_WIDTH,
  VISION_MAX_OUTPUT_TOKENS,
  VISION_SAMPLE_INTERVAL_MS,
  VISION_SCENE_DIFF_THRESHOLD,
  VISION_SMART_SILENCE_MS,
  VISION_THUMB_SIZE,
  VISUAL_NOTE_LIMIT,
} from '../constants/processing.constants';
import { VISION_SYSTEM_PROMPT } from '../constants/prompts.constants';
import { visionReplySchema } from '../schemas/processing.schemas';
import { FencedRunWriter } from '../services/fenced-run-writer.service';
import { RunEventEmitter } from '../services/run-event-emitter.service';
import type { ModelReply, RunMemory, WorkerContext } from '../types/processing.types';
import { extractJsonObject } from '../utilities/json-reply.utility';
import { recordProviderCost } from '../utilities/provider-cost.utility';
import { meanAbsoluteDifference } from '../utilities/thumbnail-diff.utility';

/**
 * Vision notes (section 4). AUDIO_VISION samples a frame every 15 s and keeps it on a
 * scene change or ≥ 60 s since the last kept one; SMART_AUTO only on a scene change or
 * after ≥ 30 s without speech. A kept frame goes to the cheap vision chain; its answer
 * becomes a VISUAL feed event and a note for the summarizer. No frame → no visual claim.
 */
@Injectable()
export class VisionManager {
  constructor(
    private readonly writer: FencedRunWriter,
    private readonly model: LiveModelClient,
    private readonly policy: LivePolicyService,
    private readonly events: RunEventEmitter,
  ) {}

  async maybeSample(
    context: WorkerContext,
    memory: RunMemory,
    segmentFile: string | null,
    now = Date.now(),
  ): Promise<void> {
    if (context.mode === LiveMode.AUDIO || !segmentFile) return;
    if (now - memory.vision.lastSampleWallAt < VISION_SAMPLE_INTERVAL_MS) return;
    memory.vision.lastSampleWallAt = now;
    const thumb = await this.grab(segmentFile, [
      '-vf',
      `scale=${String(VISION_THUMB_SIZE)}:${String(VISION_THUMB_SIZE)},format=gray`,
      '-f',
      'rawvideo',
    ]);
    if (!thumb) return;
    const changed = memory.vision.lastThumb
      ? meanAbsoluteDifference(memory.vision.lastThumb, thumb) >= VISION_SCENE_DIFF_THRESHOLD
      : true;
    memory.vision.lastThumb = thumb;
    if (!this.shouldKeep(context.mode, memory, changed, now)) return;
    memory.vision.lastKeptWallAt = now;
    const jpeg = await this.grab(segmentFile, [
      '-vf',
      `scale=${String(VISION_FRAME_WIDTH)}:-2`,
      '-f',
      'image2',
      '-c:v',
      'mjpeg',
      '-q:v',
      '5',
    ]);
    if (!jpeg) return;
    await this.describe(context, memory, jpeg, memory.lastMediaAt ?? now);
  }

  shouldKeep(mode: LiveMode, memory: RunMemory, changed: boolean, now: number): boolean {
    const sinceKept = now - memory.vision.lastKeptWallAt;
    if (mode === LiveMode.AUDIO_VISION) return changed || sinceKept >= VISION_FORCE_KEEP_MS;
    const silentFor = (memory.lastMediaAt ?? 0) - (memory.lastSpeechEndAt ?? 0);
    const silent = memory.lastSpeechEndAt === null || silentFor >= VISION_SMART_SILENCE_MS;
    return changed || (silent && sinceKept >= VISION_FORCE_KEEP_MS);
  }

  private async describe(
    context: WorkerContext,
    memory: RunMemory,
    jpeg: Buffer,
    at: number,
  ): Promise<void> {
    const { config } = await this.policy.active();
    let reply: ModelReply;
    try {
      reply = await this.model.complete(config.visionModelChain, {
        system: VISION_SYSTEM_PROMPT,
        user: 'Describe this frame.',
        maxTokens: VISION_MAX_OUTPUT_TOKENS,
        imageJpegBase64: jpeg.toString('base64'),
      });
    } catch {
      reply = { content: '', connector: 'none', model: 'none', latencyMs: 0 };
    }
    const parsed = visionReplySchema.safeParse(extractJsonObject(reply.content));
    const description = parsed.success && parsed.data.visible ? parsed.data.description : '';
    const keep = description !== '' && !introducesLinksOrMarkup(description, '');
    const runId = context.lease.runId;
    const row = await this.writer.commit(context.lease, async (tx) => {
      await recordProviderCost(tx, {
        idempotencyKey: `vision:${runId}:${randomUUID()}`,
        runId,
        stage: LivePipelineStage.VISION,
        provider: reply.connector,
        model: reply.model,
        units: 1,
        latencyMs: reply.latencyMs,
        succeeded: parsed.success,
      });
      if (!keep) return null;
      return tx.liveFeedEvent.upsert({
        where: { runId_eventKey: { runId, eventKey: `visual:${String(at)}` } },
        create: {
          runId,
          eventKey: `visual:${String(at)}`,
          kind: LiveFeedEventKind.VISUAL,
          startAt: BigInt(at),
          title: '',
          body: description,
          isOpen: false,
        },
        update: {},
      });
    });
    if (!row) return;
    memory.visualNotes = [...memory.visualNotes, { at, description }].slice(-VISUAL_NOTE_LIMIT);
    await this.events.emit([
      {
        type: LiveStreamEventType.CARD,
        runId,
        startAt: at,
        data: {
          eventId: row.id,
          eventKey: row.eventKey,
          kind: row.kind,
          title: '',
          body: description,
          version: row.version,
          isOpen: false,
        },
      },
    ]);
  }

  /** First frame of a segment through ffmpeg (bounded); null when there is no video. */
  private async grab(file: string, outputArgs: readonly string[]): Promise<Buffer | null> {
    try {
      const result = await runBoundedProcess(
        FFMPEG_BINARY,
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-protocol_whitelist',
          'file',
          '-i',
          file,
          '-an',
          '-frames:v',
          '1',
          ...outputArgs,
          'pipe:1',
        ],
        { timeoutMs: FFMPEG_FRAME_TIMEOUT_MS, maxOutputBytes: FFMPEG_MAX_FRAME_BYTES },
      );
      return result.exitCode === 0 && result.stdout.length > 0 ? result.stdout : null;
    } catch {
      return null;
    }
  }
}
