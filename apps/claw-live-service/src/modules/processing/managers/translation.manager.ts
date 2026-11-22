import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { baseLanguage } from '../../../common/utilities/language.utility';
import { introducesLinksOrMarkup } from '../../../common/utilities/plain-text.utility';
import { LivePipelineStage, LiveTranslationTarget } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import type { LiveStreamEvent } from '../../realtime/types/live-stream-event.types';
import { LiveModelClient } from '../adapters/live-model.adapter';
import {
  ATTACHED_SESSION_STATES,
  TRANSLATION_CAPTION_BATCH,
  TRANSLATION_CAPTION_MAX_WAIT_MS,
  TRANSLATION_LANGUAGE_CACHE_MS,
  TRANSLATION_MAX_OUTPUT_TOKENS,
} from '../constants/processing.constants';
import {
  CAPTION_TRANSLATION_SYSTEM_PROMPT,
  CARD_TRANSLATION_SYSTEM_PROMPT,
} from '../constants/prompts.constants';
import {
  captionTranslationReplySchema,
  cardTranslationReplySchema,
} from '../schemas/processing.schemas';
import { FencedRunWriter } from '../services/fenced-run-writer.service';
import { RunEventEmitter } from '../services/run-event-emitter.service';
import type {
  CardTranslationTarget,
  FencedTx,
  ModelReply,
  TranscriptLine,
  WorkerContext,
} from '../types/processing.types';
import { extractJsonObject } from '../utilities/json-reply.utility';
import { recordProviderCost } from '../utilities/provider-cost.utility';
import { sanitizeStreamText, streamDataBlock } from '../utilities/stream-prompt.utility';

/**
 * Captions and cards translated only for languages with ≥ 1 attached viewer (section 4),
 * cached in LiveTranslation (unique key → a replay is free and idempotent). Captions go
 * two per call when they can. Output that adds links or markup is refused.
 */
@Injectable()
export class TranslationManager {
  private readonly languages = new Map<string, { value: string[]; expiresAt: number }>();
  private readonly captionQueues = new Map<string, { lines: TranscriptLine[]; since: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: FencedRunWriter,
    private readonly model: LiveModelClient,
    private readonly policy: LivePolicyService,
    private readonly events: RunEventEmitter,
  ) {}

  /** Distinct base languages of the run's attached viewers, cached 5 s. */
  async activeLanguages(runId: string, now = Date.now()): Promise<string[]> {
    const cached = this.languages.get(runId);
    if (cached && cached.expiresAt > now) return cached.value;
    const rows = await this.prisma.liveViewerSession.findMany({
      where: { runId, state: { in: [...ATTACHED_SESSION_STATES] } },
      select: { language: true },
      distinct: ['language'],
    });
    const value = [
      ...new Set(rows.map((row) => baseLanguage(row.language)).filter((l) => l !== null)),
    ];
    this.languages.set(runId, { value, expiresAt: now + TRANSLATION_LANGUAGE_CACHE_MS });
    return value;
  }

  enqueueCaption(runId: string, line: TranscriptLine, now = Date.now()): void {
    const queue = this.captionQueues.get(runId) ?? { lines: [], since: now };
    if (queue.lines.length === 0) queue.since = now;
    queue.lines.push(line);
    this.captionQueues.set(runId, queue);
  }

  /** Translates queued captions once a batch is full or the oldest waited long enough. */
  async flushCaptions(context: WorkerContext, force = false, now = Date.now()): Promise<void> {
    const queue = this.captionQueues.get(context.lease.runId);
    if (!queue || queue.lines.length === 0) return;
    const ready =
      force ||
      queue.lines.length >= TRANSLATION_CAPTION_BATCH ||
      now - queue.since >= TRANSLATION_CAPTION_MAX_WAIT_MS;
    if (!ready) return;
    while (queue.lines.length > 0) {
      const batch = queue.lines.splice(0, TRANSLATION_CAPTION_BATCH);
      queue.since = now;
      await this.translateCaptions(context, batch);
      if (!force && queue.lines.length < TRANSLATION_CAPTION_BATCH) break;
    }
  }

  dropRun(runId: string): void {
    this.languages.delete(runId);
    this.captionQueues.delete(runId);
  }

  async translateCaptions(context: WorkerContext, lines: readonly TranscriptLine[]): Promise<void> {
    for (const language of await this.activeLanguages(context.lease.runId)) {
      const targets = lines.filter((line) => baseLanguage(line.language) !== language);
      if (targets.length === 0) continue;
      const cached = await this.prisma.liveTranslation.findMany({
        where: {
          targetKind: LiveTranslationTarget.SEGMENT,
          targetId: { in: targets.map((line) => line.id) },
          language,
          sourceVersion: 1,
        },
      });
      const hits = new Map(cached.map((row) => [row.targetId, row.text]));
      const misses = targets.filter((line) => !hits.has(line.id));
      const fresh =
        misses.length > 0
          ? await this.translateCaptionBatch(context, misses, language)
          : new Map<string, string>();
      const events = targets
        .map((line) => ({ line, text: hits.get(line.id) ?? fresh.get(line.id) }))
        .filter(
          (entry): entry is { line: TranscriptLine; text: string } => entry.text !== undefined,
        )
        .map((entry) => this.captionEvent(context.lease.runId, entry.line, entry.text, language));
      await this.events.emit(events);
    }
  }

  async translateCard(
    context: WorkerContext,
    card: CardTranslationTarget,
    type: LiveStreamEventType,
  ): Promise<void> {
    const runId = context.lease.runId;
    for (const language of await this.activeLanguages(runId)) {
      if (baseLanguage(card.language) === language) continue;
      const key = {
        targetKind: LiveTranslationTarget.EVENT,
        targetId: card.id,
        language,
        sourceVersion: card.version,
      };
      const cached = await this.prisma.liveTranslation.findUnique({
        where: { targetKind_targetId_language_sourceVersion: key },
      });
      const translated = cached
        ? { title: cached.title ?? card.title, text: cached.text }
        : await this.translateCardText(context, card, language);
      if (!translated) continue;
      await this.events.emit([
        {
          type,
          runId,
          startAt: card.startAt,
          language,
          data: {
            eventId: card.id,
            version: card.version,
            title: translated.title,
            body: translated.text,
          },
        },
      ]);
    }
  }

  private async translateCaptionBatch(
    context: WorkerContext,
    lines: readonly TranscriptLine[],
    language: string,
  ): Promise<Map<string, string>> {
    const source = lines
      .map((line, index) => `${String(index)}: ${sanitizeStreamText(line.text)}`)
      .join('\n');
    const reply = await this.call(
      context,
      CAPTION_TRANSLATION_SYSTEM_PROMPT,
      `TARGET_LANGUAGE: ${language}\n${streamDataBlock(source)}`,
    );
    const parsed = reply
      ? captionTranslationReplySchema.safeParse(extractJsonObject(reply.content))
      : null;
    const accepted = new Map<string, string>();
    for (const item of parsed?.success ? parsed.data.items : []) {
      const line = lines[item.id];
      if (line && !introducesLinksOrMarkup(item.text, line.text)) accepted.set(line.id, item.text);
    }
    if (!reply) return accepted;
    await this.writer.commit(context.lease, async (tx) => {
      await this.recordCost(tx, context, reply, accepted.size > 0);
      for (const [targetId, text] of accepted) {
        await this.store(
          tx,
          context.lease.runId,
          LiveTranslationTarget.SEGMENT,
          targetId,
          language,
          1,
          null,
          text,
          reply.model,
        );
      }
    });
    return accepted;
  }

  private async translateCardText(
    context: WorkerContext,
    card: CardTranslationTarget,
    language: string,
  ): Promise<{ title: string; text: string } | null> {
    const source = `TITLE: ${sanitizeStreamText(card.title)}\nTEXT: ${sanitizeStreamText(card.body)}`;
    const reply = await this.call(
      context,
      CARD_TRANSLATION_SYSTEM_PROMPT,
      `TARGET_LANGUAGE: ${language}\n${streamDataBlock(source)}`,
    );
    if (!reply) return null;
    const parsed = cardTranslationReplySchema.safeParse(extractJsonObject(reply.content));
    const ok =
      parsed.success &&
      !introducesLinksOrMarkup(`${parsed.data.title}\n${parsed.data.text}`, source);
    await this.writer.commit(context.lease, async (tx) => {
      await this.recordCost(tx, context, reply, ok);
      if (parsed.success && ok) {
        await this.store(
          tx,
          context.lease.runId,
          LiveTranslationTarget.EVENT,
          card.id,
          language,
          card.version,
          parsed.data.title,
          parsed.data.text,
          reply.model,
        );
      }
    });
    return parsed.success && ok ? parsed.data : null;
  }

  private async store(
    tx: FencedTx,
    runId: string,
    targetKind: LiveTranslationTarget,
    targetId: string,
    language: string,
    sourceVersion: number,
    title: string | null,
    text: string,
    model: string,
  ): Promise<void> {
    await tx.liveTranslation.upsert({
      where: {
        targetKind_targetId_language_sourceVersion: {
          targetKind,
          targetId,
          language,
          sourceVersion,
        },
      },
      create: { runId, targetKind, targetId, language, sourceVersion, title, text, model },
      update: {},
    });
  }

  private async call(
    context: WorkerContext,
    system: string,
    user: string,
  ): Promise<ModelReply | null> {
    const { config } = await this.policy.active();
    try {
      return await this.model.complete(config.summaryModelChain, {
        system,
        user,
        maxTokens: TRANSLATION_MAX_OUTPUT_TOKENS,
      });
    } catch {
      const failed = { content: '', connector: 'none', model: 'none', latencyMs: 0 };
      await this.writer.commit(context.lease, (tx) => this.recordCost(tx, context, failed, false));
      return null;
    }
  }

  private recordCost(
    tx: FencedTx,
    context: WorkerContext,
    reply: ModelReply,
    succeeded: boolean,
  ): Promise<void> {
    return recordProviderCost(tx, {
      idempotencyKey: `translation:${context.lease.runId}:${randomUUID()}`,
      runId: context.lease.runId,
      stage: LivePipelineStage.TRANSLATION,
      provider: reply.connector,
      model: reply.model,
      units: reply.content.length,
      latencyMs: reply.latencyMs,
      succeeded,
    });
  }

  private captionEvent(
    runId: string,
    line: TranscriptLine,
    text: string,
    language: string,
  ): LiveStreamEvent {
    return {
      type: LiveStreamEventType.CAPTION_TRANSLATION,
      runId,
      startAt: line.startAt,
      endAt: line.endAt,
      language,
      data: { segmentId: line.id, seq: line.seq, text },
    };
  }
}
