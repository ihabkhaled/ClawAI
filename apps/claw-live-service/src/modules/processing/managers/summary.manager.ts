import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { sha256Hex } from '../../../common/utilities/hash.utility';
import { introducesLinksOrMarkup } from '../../../common/utilities/plain-text.utility';
import { wordTokens } from '../../../common/utilities/text-similarity.utility';
import {
  type LiveFeedEvent,
  LiveFeedEventKind,
  LivePipelineStage,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { LiveModelRef } from '../../policy/types/live-policy.types';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import type { LiveStreamEvent } from '../../realtime/types/live-stream-event.types';
import { LiveModelClient } from '../adapters/live-model.adapter';
import {
  FINAL_EVENT_KEY,
  FINAL_MAX_CARDS,
  HIGHLIGHT_MEMORY_LIMIT,
  SNAPSHOT_INTERVAL_MS,
  SUMMARY_MAX_OUTPUT_TOKENS,
  SUMMARY_MIN_NEW_TRANSCRIPT_MS,
  SUMMARY_PAUSE_TRIGGER_MS,
  WORKING_SUMMARY_MAX_CHARS,
} from '../constants/processing.constants';
import { FINAL_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from '../constants/prompts.constants';
import { finalReplySchema, summaryReplySchema } from '../schemas/processing.schemas';
import { FencedRunWriter } from '../services/fenced-run-writer.service';
import { RunEventEmitter } from '../services/run-event-emitter.service';
import type {
  CardOutcome,
  ChangedCard,
  FencedTx,
  HighlightOutcome,
  ModelReply,
  OpenCard,
  RememberedHighlight,
  RunMemory,
  SummaryReply,
  SummarySpan,
  TranscriptLine,
  WorkerContext,
} from '../types/processing.types';
import { isDuplicateHighlight } from '../utilities/highlight-dedupe.utility';
import { extractJsonObject } from '../utilities/json-reply.utility';
import { recordProviderCost } from '../utilities/provider-cost.utility';
import {
  buildSummaryUserMessage,
  sanitizeStreamText,
  streamDataBlock,
} from '../utilities/stream-prompt.utility';

/**
 * Topic cards, summaries and highlights (section 4). Called on ≥ 30 s of new transcript
 * or a ≥ 8 s pause, never per chunk; input is the working summary, the open card and the
 * last ≤ 90 s. The reply is strict JSON, schema-validated and refused when it adds links
 * or markup. Writes are fenced; events are published after the commit.
 */
@Injectable()
export class SummaryManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: FencedRunWriter,
    private readonly model: LiveModelClient,
    private readonly policy: LivePolicyService,
    private readonly events: RunEventEmitter,
  ) {}

  shouldSummarize(memory: RunMemory): boolean {
    if (memory.pendingTranscriptMs <= 0) return false;
    if (memory.pendingTranscriptMs >= SUMMARY_MIN_NEW_TRANSCRIPT_MS) return true;
    const pause = (memory.lastMediaAt ?? 0) - (memory.lastSpeechEndAt ?? 0);
    return pause >= SUMMARY_PAUSE_TRIGGER_MS;
  }

  async summarize(context: WorkerContext, memory: RunMemory): Promise<ChangedCard[]> {
    const window = [...memory.recent];
    const first = memory.pendingFirst ?? window[0];
    const last = window.at(-1);
    if (!first || !last) return [];
    memory.pendingTranscriptMs = 0;
    memory.pendingFirst = null;
    memory.lastSummaryWallAt = Date.now();
    const { config } = await this.policy.active();
    const userMessage = buildSummaryUserMessage(memory, window);
    const reply = await this.callModel(
      context,
      config.summaryModelChain,
      SUMMARY_SYSTEM_PROMPT,
      userMessage,
    );
    if (!reply) return [];
    const parsed = this.validateSummary(reply.content, userMessage);
    if (!parsed) {
      await this.writer.commit(context.lease, (tx) => this.recordCost(tx, context, reply, false));
      return [];
    }
    return this.apply(context, memory, parsed, reply, { first, last });
  }

  /** On ENDED: one FINAL card covering only the analysed cards of the run. */
  async summarizeFinal(context: WorkerContext): Promise<void> {
    const runId = context.lease.runId;
    const cards = await this.prisma.liveFeedEvent.findMany({
      where: { runId, kind: LiveFeedEventKind.SUMMARY },
      orderBy: { startAt: 'asc' },
      take: FINAL_MAX_CARDS,
    });
    const first = cards[0];
    const last = cards.at(-1);
    if (!first || !last) return;
    const source = cards
      .map((card) => `- ${sanitizeStreamText(card.title)}: ${sanitizeStreamText(card.body)}`)
      .join('\n');
    const { config } = await this.policy.active();
    const reply = await this.callModel(
      context,
      config.summaryModelChain,
      FINAL_SYSTEM_PROMPT,
      streamDataBlock(source),
    );
    if (!reply) return;
    const parsed = finalReplySchema.safeParse(extractJsonObject(reply.content));
    const valid =
      parsed.success &&
      !introducesLinksOrMarkup(`${parsed.data.title}\n${parsed.data.summary}`, source);
    const row = await this.writer.commit(context.lease, async (tx) => {
      await this.recordCost(tx, context, reply, valid);
      if (!parsed.success || !valid) return null;
      return tx.liveFeedEvent.upsert({
        where: { runId_eventKey: { runId, eventKey: FINAL_EVENT_KEY } },
        create: {
          runId,
          eventKey: FINAL_EVENT_KEY,
          kind: LiveFeedEventKind.FINAL,
          startAt: first.startAt,
          endAt: last.endAt ?? last.startAt,
          title: parsed.data.title,
          body: parsed.data.summary,
          isOpen: false,
        },
        update: {},
      });
    });
    if (row) await this.events.emit([this.cardEvent(LiveStreamEventType.CARD, row)]);
  }

  /** Every 10 min: a compacted LiveMemorySnapshot (long-term memory). */
  async maybeSnapshot(context: WorkerContext, memory: RunMemory, now = Date.now()): Promise<void> {
    if (now - memory.lastSnapshotWallAt < SNAPSHOT_INTERVAL_MS || memory.lastMediaAt === null)
      return;
    memory.lastSnapshotWallAt = now;
    const open = memory.openCard ? `\n${memory.openCard.title}: ${memory.openCard.body}` : '';
    const upToAt = memory.lastMediaAt;
    await this.writer.commit(context.lease, async (tx) => {
      await tx.liveMemorySnapshot.create({
        data: {
          runId: context.lease.runId,
          upToAt: BigInt(upToAt),
          summary: `${memory.workingSummary}${open}`.trim(),
          keyFacts: memory.highlights.slice(-10).map((highlight) => highlight.text),
        },
      });
    });
  }

  private async apply(
    context: WorkerContext,
    memory: RunMemory,
    reply: SummaryReply,
    model: ModelReply,
    span: SummarySpan,
  ): Promise<ChangedCard[]> {
    const outcome = await this.writer.commit(context.lease, async (tx) => {
      await this.recordCost(tx, context, model, true);
      const card = await this.applyCard(tx, context.lease.runId, memory.openCard, reply, span);
      const highlights = await this.applyHighlights(
        tx,
        context.lease.runId,
        memory.highlights,
        reply,
        span.last,
      );
      return { card, highlights };
    });
    if (outcome.card.closed) this.appendWorkingSummary(memory, outcome.card.closed);
    memory.openCard = outcome.card.open;
    memory.highlights = [...memory.highlights, ...outcome.highlights.remembered].slice(
      -HIGHLIGHT_MEMORY_LIMIT,
    );
    await this.events.emit([...outcome.card.events, ...outcome.highlights.events]);
    return outcome.card.changed.map((type) => ({
      type,
      target: {
        id: outcome.card.open.id,
        title: outcome.card.open.title,
        body: outcome.card.open.body,
        version: outcome.card.open.version,
        startAt: outcome.card.open.startAt,
        language: span.last.language,
      },
    }));
  }

  private async applyCard(
    tx: FencedTx,
    runId: string,
    open: OpenCard | null,
    reply: SummaryReply,
    span: SummarySpan,
  ): Promise<CardOutcome> {
    if (open && !reply.topicShift) {
      const row = await this.bumpVersion(tx, open.id, reply.current);
      return {
        open: this.toOpenCard(row),
        closed: null,
        events: [this.cardEvent(LiveStreamEventType.CARD_VERSION, row)],
        changed: [LiveStreamEventType.CARD_VERSION],
      };
    }
    const events: LiveStreamEvent[] = [];
    if (open) {
      const closed = await tx.liveFeedEvent.update({
        where: { id: open.id },
        data: { isOpen: false, endAt: BigInt(span.first.startAt) },
      });
      events.push(this.cardEvent(LiveStreamEventType.CARD_VERSION, closed));
    }
    const created = await this.createCard(tx, runId, reply.current, span.first);
    events.push(this.cardEvent(LiveStreamEventType.CARD, created));
    return {
      open: this.toOpenCard(created),
      closed: open,
      events,
      changed: [LiveStreamEventType.CARD],
    };
  }

  private async createCard(
    tx: FencedTx,
    runId: string,
    current: SummaryReply['current'],
    first: TranscriptLine,
  ): Promise<LiveFeedEvent> {
    const eventKey = `summary:${String(first.seq)}`;
    const existing = await tx.liveFeedEvent.findUnique({
      where: { runId_eventKey: { runId, eventKey } },
    });
    if (existing) return this.bumpVersion(tx, existing.id, current);
    const row = await tx.liveFeedEvent.create({
      data: {
        runId,
        eventKey,
        kind: LiveFeedEventKind.SUMMARY,
        topicKey: eventKey,
        startAt: BigInt(first.startAt),
        importance: current.importance,
        title: current.title,
        body: current.summary,
        evidence: [{ seq: first.seq }],
      },
    });
    await tx.liveFeedEventVersion.create({
      data: { eventId: row.id, version: row.version, title: row.title, body: row.body },
    });
    return row;
  }

  private async bumpVersion(
    tx: FencedTx,
    eventId: string,
    current: SummaryReply['current'],
  ): Promise<LiveFeedEvent> {
    const row = await tx.liveFeedEvent.update({
      where: { id: eventId },
      data: {
        title: current.title,
        body: current.summary,
        importance: current.importance,
        version: { increment: 1 },
      },
    });
    await tx.liveFeedEventVersion.create({
      data: { eventId: row.id, version: row.version, title: row.title, body: row.body },
    });
    return row;
  }

  private async applyHighlights(
    tx: FencedTx,
    runId: string,
    kept: readonly RememberedHighlight[],
    reply: SummaryReply,
    last: TranscriptLine,
  ): Promise<HighlightOutcome> {
    const events: LiveStreamEvent[] = [];
    const remembered: RememberedHighlight[] = [];
    for (const highlight of reply.highlights) {
      const text = `${highlight.title} ${highlight.summary}`;
      if (isDuplicateHighlight(highlight.type, text, last.startAt, [...kept, ...remembered]))
        continue;
      const tokens = [...wordTokens(highlight.title)].sort().join(' ');
      const eventKey = `hl:${sha256Hex(`${highlight.type}|${tokens}`).slice(0, 24)}`;
      const existing = await tx.liveFeedEvent.findUnique({
        where: { runId_eventKey: { runId, eventKey } },
      });
      if (existing) continue;
      const row = await tx.liveFeedEvent.create({
        data: {
          runId,
          eventKey,
          kind: LiveFeedEventKind.HIGHLIGHT,
          highlightType: highlight.type,
          startAt: BigInt(last.startAt),
          endAt: BigInt(last.endAt),
          importance: highlight.importance,
          confidence: highlight.confidence,
          title: highlight.title,
          body: highlight.summary,
          evidence: [{ seq: last.seq, quote: highlight.quote }],
          isOpen: false,
        },
      });
      remembered.push({ type: highlight.type, text, at: last.startAt });
      events.push(this.cardEvent(LiveStreamEventType.HIGHLIGHT, row));
    }
    return { events, remembered };
  }

  private validateSummary(content: string, source: string): SummaryReply | null {
    const parsed = summaryReplySchema.safeParse(extractJsonObject(content));
    if (!parsed.success) return null;
    const strings = [
      parsed.data.current.title,
      parsed.data.current.summary,
      ...parsed.data.highlights.flatMap((h) => [h.title, h.summary, h.quote]),
    ];
    return introducesLinksOrMarkup(strings.join('\n'), source) ? null : parsed.data;
  }

  private async callModel(
    context: WorkerContext,
    chain: readonly LiveModelRef[],
    system: string,
    user: string,
  ): Promise<ModelReply | null> {
    try {
      return await this.model.complete(chain, {
        system,
        user,
        maxTokens: SUMMARY_MAX_OUTPUT_TOKENS,
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
      idempotencyKey: `summary:${context.lease.runId}:${randomUUID()}`,
      runId: context.lease.runId,
      stage: LivePipelineStage.SUMMARY,
      provider: reply.connector,
      model: reply.model,
      units: reply.content.length,
      costMicroUsd: 0,
      latencyMs: reply.latencyMs,
      succeeded,
    });
  }

  private appendWorkingSummary(memory: RunMemory, closed: OpenCard): void {
    const next = `${memory.workingSummary}\n${closed.title}: ${closed.body}`.trim();
    memory.workingSummary =
      next.length > WORKING_SUMMARY_MAX_CHARS ? next.slice(-WORKING_SUMMARY_MAX_CHARS) : next;
  }

  private toOpenCard(row: LiveFeedEvent): OpenCard {
    return {
      id: row.id,
      eventKey: row.eventKey,
      title: row.title,
      body: row.body,
      version: row.version,
      startAt: Number(row.startAt),
      importance: row.importance,
    };
  }

  private cardEvent(type: LiveStreamEventType, row: LiveFeedEvent): LiveStreamEvent {
    return {
      type,
      runId: row.runId,
      startAt: Number(row.startAt),
      ...(row.endAt === null ? {} : { endAt: Number(row.endAt) }),
      data: {
        eventId: row.id,
        eventKey: row.eventKey,
        kind: row.kind,
        highlightType: row.highlightType,
        title: row.title,
        body: row.body,
        importance: row.importance,
        confidence: row.confidence,
        version: row.version,
        isOpen: row.isOpen,
      },
    };
  }
}
