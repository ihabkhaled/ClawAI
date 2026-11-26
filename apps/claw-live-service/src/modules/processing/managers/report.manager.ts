import { Injectable, Logger } from '@nestjs/common';

import { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import { cardLanguage } from '../../../common/utilities/language.utility';
import { introducesLinksOrMarkup } from '../../../common/utilities/plain-text.utility';
import { LiveFeedEventKind } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import { SUMMARY_ACCESS_SCOPE_PREFIX } from '../../sources/constants/sources.constants';
import {
  REPORT_EVENT_KEY,
  REPORT_MAX_MOMENTS,
  REPORT_MAX_OUTPUT_TOKENS,
  REPORT_MAX_QUOTES,
  REPORT_MAX_SEGMENTS,
  REPORT_MAX_VISUAL_NOTES,
  REPORT_WINDOW_MS,
} from '../constants/processing.constants';
import {
  REPORT_MOMENTS_SYSTEM_PROMPT,
  REPORT_OVERVIEW_SYSTEM_PROMPT,
} from '../constants/prompts.constants';
import { LeaseLostError } from '../errors/processing.errors';
import { reportMomentsReplySchema, reportOverviewReplySchema } from '../schemas/processing.schemas';
import { FencedRunWriter } from '../services/fenced-run-writer.service';
import { LiveCouncilService } from '../services/live-council.service';
import { RunEventEmitter } from '../services/run-event-emitter.service';
import type {
  LiveCouncilChains,
  ReportMoment,
  ReportMomentsReply,
  ReportOverview,
  ReportOverviewReply,
  ReportPart,
  ReportPartInput,
  ReportVisualNote,
  ReportWindow,
  RunMemory,
  TranscriptLine,
  WorkerContext,
} from '../types/processing.types';
import { feedEventMessage } from '../utilities/feed-event.utility';
import { extractJsonObject } from '../utilities/json-reply.utility';
import {
  formatWebNotes,
  sanitizeStreamText,
  streamDataBlock,
} from '../utilities/stream-prompt.utility';
import {
  formatReportTranscript,
  formatVideoClock,
  momentsInWindow,
  momentsWanted,
  renderReportBody,
  reportWindows,
  videoSeconds,
} from '../utilities/video-report.utility';
import { TranslationManager } from './translation.manager';

/**
 * The detailed report of a one-click video summary (owner 2026-11-26): a timestamped moment about
 * every 10 s, chapters, the overall summary and key quotes, written in the viewer's own language.
 * Built part by part over the whole transcript (draft then merge per part), then one overview.
 * Only summary runs get one; a failed part is skipped, never invented.
 */
@Injectable()
export class ReportManager {
  private readonly logger = new Logger(ReportManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly writer: FencedRunWriter,
    private readonly council: LiveCouncilService,
    private readonly policy: LivePolicyService,
    private readonly events: RunEventEmitter,
    private readonly translations: TranslationManager,
  ) {}

  async writeReport(context: WorkerContext, memory: RunMemory): Promise<void> {
    const runId = context.lease.runId;
    const run = await this.prisma.liveProcessingRun.findUnique({
      where: { id: runId },
      select: { startedAt: true, stream: { select: { accessScope: true } } },
    });
    if (!run?.stream.accessScope.startsWith(SUMMARY_ACCESS_SCOPE_PREFIX)) return;
    const lines = await this.transcript(runId);
    const first = lines[0];
    const last = lines.at(-1);
    if (!first || !last) return;
    const origin = run.startedAt.getTime();
    const language = await this.viewerLanguage(runId, memory.spokenLanguage);
    const { config } = await this.policy.active();
    const chains = { main: config.summaryModelChain, council: config.councilModelChain };
    const visuals = await this.visualNotes(runId, origin);
    const moments: ReportMoment[] = [];
    const quotes: ReportMoment[] = [];
    for (const window of reportWindows(lines, origin, REPORT_WINDOW_MS)) {
      const part = await this.writePart(context, chains, window, {
        origin,
        language,
        visuals,
        memory,
      });
      moments.push(...part.moments);
      quotes.push(...part.quotes);
      if (moments.length >= REPORT_MAX_MOMENTS) break;
    }
    if (moments.length === 0) return;
    const overview = await this.writeOverview(context, chains, moments, language, memory);
    if (!overview) return;
    const body = renderReportBody(
      {
        summary: overview.summary,
        chapters: overview.chapters,
        moments: moments.slice(0, REPORT_MAX_MOMENTS),
        quotes: quotes.slice(0, REPORT_MAX_QUOTES),
      },
      language,
    );
    await this.publish(context, { title: overview.title, body, language }, first, last);
  }

  private async writePart(
    context: WorkerContext,
    chains: LiveCouncilChains,
    window: ReportWindow,
    input: ReportPartInput,
  ): Promise<ReportPart> {
    const source = [
      `OUTPUT_LANGUAGE: ${input.language}`,
      `PART_START: ${formatVideoClock(window.fromSeconds)}`,
      `PART_END: ${formatVideoClock(window.toSeconds)}`,
      `MOMENTS_WANTED: ${String(momentsWanted(window))}`,
      `CONTEXT: ${sanitizeStreamText(input.memory.workingSummary) || '(none)'}`,
      'TRANSCRIPT:',
      formatReportTranscript(window.lines, input.origin),
      'VISUAL_NOTES:',
      this.visualsIn(input.visuals, window) || '(none)',
      'WEB_CONTEXT:',
      formatWebNotes(input.memory.webNotes),
    ].join('\n');
    const parse = (content: string): ReportMomentsReply | null => {
      const reply = reportMomentsReplySchema.safeParse(extractJsonObject(content));
      if (!reply.success) return null;
      const texts = [...reply.data.moments, ...reply.data.quotes].map((item) => item.text);
      return introducesLinksOrMarkup(texts.join('\n'), source) ? null : reply.data;
    };
    const user = streamDataBlock(source);
    const request = {
      system: REPORT_MOMENTS_SYSTEM_PROMPT,
      user,
      maxTokens: REPORT_MAX_OUTPUT_TOKENS,
    };
    const reply = await this.council.draftThenMerge(context, chains, request, parse);
    if (!reply) return { moments: [], quotes: [] };
    const parsed = parse(reply.content);
    await this.writer.commit(context.lease, (tx) =>
      this.council.recordCost(tx, context, reply, parsed !== null),
    );
    if (!parsed) return { moments: [], quotes: [] };
    return {
      moments: momentsInWindow(parsed.moments, window),
      quotes: momentsInWindow(parsed.quotes, window),
    };
  }

  private async writeOverview(
    context: WorkerContext,
    chains: LiveCouncilChains,
    moments: readonly ReportMoment[],
    language: string,
    memory: RunMemory,
  ): Promise<ReportOverview | null> {
    const timeline = moments.map(
      (moment) => `${formatVideoClock(moment.atSeconds)} ${sanitizeStreamText(moment.text)}`,
    );
    const source = [
      `OUTPUT_LANGUAGE: ${language}`,
      'TIMELINE:',
      ...timeline,
      'WEB_CONTEXT:',
      formatWebNotes(memory.webNotes),
    ].join('\n');
    const parse = (content: string): ReportOverviewReply | null => {
      const reply = reportOverviewReplySchema.safeParse(extractJsonObject(content));
      if (!reply.success) return null;
      const chapterTitles = reply.data.chapters.map((chapter) => chapter.title);
      const texts = [reply.data.title, reply.data.summary, ...chapterTitles];
      return introducesLinksOrMarkup(texts.join('\n'), source) ? null : reply.data;
    };
    const user = streamDataBlock(source);
    const request = {
      system: REPORT_OVERVIEW_SYSTEM_PROMPT,
      user,
      maxTokens: REPORT_MAX_OUTPUT_TOKENS,
    };
    const reply = await this.council.draftThenMerge(context, chains, request, parse);
    if (!reply) return null;
    const parsed = parse(reply.content);
    await this.writer.commit(context.lease, (tx) =>
      this.council.recordCost(tx, context, reply, parsed !== null),
    );
    if (!parsed) return null;
    const chapters = momentsInWindow(
      parsed.chapters.map((chapter) => ({ at: chapter.at, text: chapter.title })),
      { fromSeconds: 0, toSeconds: moments.at(-1)?.atSeconds ?? 0 },
    );
    return { title: parsed.title, summary: parsed.summary, chapters };
  }

  private async publish(
    context: WorkerContext,
    report: { title: string; body: string; language: string },
    first: TranscriptLine,
    last: TranscriptLine,
  ): Promise<void> {
    const runId = context.lease.runId;
    const row = await this.writer.commit(context.lease, (tx) =>
      tx.liveFeedEvent.upsert({
        where: { runId_eventKey: { runId, eventKey: REPORT_EVENT_KEY } },
        create: {
          runId,
          eventKey: REPORT_EVENT_KEY,
          kind: LiveFeedEventKind.REPORT,
          startAt: BigInt(first.startAt),
          endAt: BigInt(last.endAt),
          importance: 3,
          title: report.title,
          body: report.body,
          isOpen: false,
        },
        update: { title: report.title, body: report.body },
      }),
    );
    const target = {
      id: row.id,
      title: row.title,
      body: row.body,
      version: row.version,
      startAt: Number(row.startAt),
      language: cardLanguage(row.title, row.body, report.language),
    };
    try {
      await this.translations.translateCard(context, target, LiveStreamEventType.CARD);
    } catch (error: unknown) {
      if (error instanceof LeaseLostError) throw error;
      this.logger.warn(`run ${runId}: report translation failed`);
    }
    await this.events.emit([feedEventMessage(LiveStreamEventType.CARD, row)]);
  }

  private async transcript(runId: string): Promise<TranscriptLine[]> {
    const rows = await this.prisma.liveTranscriptSegment.findMany({
      where: { runId },
      orderBy: { startAt: 'asc' },
      take: REPORT_MAX_SEGMENTS,
      select: { id: true, seq: true, startAt: true, endAt: true, text: true, language: true },
    });
    return rows.map((row) => ({ ...row, startAt: Number(row.startAt), endAt: Number(row.endAt) }));
  }

  /** Every on-screen note, in video seconds. */
  private async visualNotes(runId: string, origin: number): Promise<ReportVisualNote[]> {
    const rows = await this.prisma.liveFeedEvent.findMany({
      where: { runId, kind: LiveFeedEventKind.VISUAL },
      orderBy: { startAt: 'asc' },
      take: REPORT_MAX_VISUAL_NOTES,
      select: { startAt: true, body: true },
    });
    return rows.map((row) => ({
      atSeconds: videoSeconds(Number(row.startAt), origin),
      text: sanitizeStreamText(row.body),
    }));
  }

  /** `[m:ss] description` lines of the notes inside the part. */
  private visualsIn(visuals: readonly ReportVisualNote[], window: ReportWindow): string {
    return visuals
      .filter((note) => note.atSeconds >= window.fromSeconds && note.atSeconds < window.toSeconds)
      .map((note) => `[${formatVideoClock(note.atSeconds)}] ${note.text}`)
      .join('\n');
  }

  /** The report is written in the language of the viewer who asked for it (no translation lag). */
  private async viewerLanguage(runId: string, spoken: string | null): Promise<string> {
    const session = await this.prisma.liveViewerSession.findFirst({
      where: { runId },
      orderBy: { createdAt: 'desc' },
      select: { language: true },
    });
    return session?.language ?? spoken ?? 'auto';
  }
}
