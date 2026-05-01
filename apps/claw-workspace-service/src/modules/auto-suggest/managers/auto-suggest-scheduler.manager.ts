import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AppConfig } from '../../../app/config/app.config';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import { tryAcquireAdvisoryLock } from '../../../common/utilities/advisory-lock.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  AUTO_SUGGEST_CANDIDATE_BATCH_SIZE,
  AUTO_SUGGEST_LOCK_NAMESPACE_PREFIX,
  AUTO_SUGGEST_RECENT_TICKET_LOOKBACK_DAYS,
  AUTO_SUGGEST_STALE_PR_AGE_DAYS,
  MEETING_NOTES_SCAN_LOOKBACK_HOURS,
  MEETING_NOTES_TRANSCRIPT_KEYWORDS,
  MEETING_NOTES_TRANSCRIPT_WINDOW_HOURS,
} from '../constants/auto-suggest.constants';
import type { AutoSuggestJobType, CandidateSuggestion } from '../types/auto-suggest.types';

import { AutoSuggestOrchestratorManager } from './auto-suggest-orchestrator.manager';

@Injectable()
export class AutoSuggestSchedulerManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AutoSuggestOrchestratorManager,
  ) {}

  @Cron(AppConfig.get().AUTO_SUGGEST_JIRA_CRON, { name: 'workspace.auto_suggest.jira' })
  async tickJira(): Promise<void> {
    if (!AppConfig.get().AUTO_SUGGEST_ENABLED) return;
    const lockHeld = await tryAcquireAdvisoryLock(this.prisma, `${AUTO_SUGGEST_LOCK_NAMESPACE_PREFIX}.jira`);
    if (!lockHeld) return;
    await this.orchestrator.runJob('JIRA_TICKET_SUMMARY', () => this.collectJiraCandidates());
  }

  @Cron(AppConfig.get().AUTO_SUGGEST_GITHUB_STALE_PR_CRON, {
    name: 'workspace.auto_suggest.github_stale_pr',
  })
  async tickGithubStalePr(): Promise<void> {
    if (!AppConfig.get().AUTO_SUGGEST_ENABLED) return;
    const lockHeld = await tryAcquireAdvisoryLock(
      this.prisma,
      `${AUTO_SUGGEST_LOCK_NAMESPACE_PREFIX}.github_stale_pr`,
    );
    if (!lockHeld) return;
    await this.orchestrator.runJob('GITHUB_STALE_PR', () => this.collectStalePrCandidates());
  }

  @Cron(AppConfig.get().AUTO_SUGGEST_MEETING_NOTES_CRON, {
    name: 'workspace.auto_suggest.meeting_notes',
  })
  async tickMeetingNotes(): Promise<void> {
    if (!AppConfig.get().AUTO_SUGGEST_ENABLED) return;
    const lockHeld = await tryAcquireAdvisoryLock(
      this.prisma,
      `${AUTO_SUGGEST_LOCK_NAMESPACE_PREFIX}.meeting_notes`,
    );
    if (!lockHeld) return;
    await this.orchestrator.runJob('MEETING_NOTES_SCAN', () => this.collectMeetingNotesCandidates());
  }

  // Manual trigger entry point used by admin endpoint.
  async triggerNow(jobType: AutoSuggestJobType): Promise<void> {
    if (jobType === 'JIRA_TICKET_SUMMARY') {
      await this.orchestrator.runJob(jobType, () => this.collectJiraCandidates());
      return;
    }
    if (jobType === 'GITHUB_STALE_PR') {
      await this.orchestrator.runJob(jobType, () => this.collectStalePrCandidates());
      return;
    }
    if (jobType === 'MEETING_NOTES_SCAN') {
      await this.orchestrator.runJob(jobType, () => this.collectMeetingNotesCandidates());
      return;
    }
    // INBOX_REPLY etc. — not yet implemented in v1; the orchestrator records
    // a no-op run so observability still captures the trigger.
    await this.orchestrator.runJob(jobType, async () => []);
  }

  // Stream 23.2/23.3 — find MEETING objects whose end fell in the last
  // MEETING_NOTES_SCAN_LOOKBACK_HOURS, and that have an attached transcript-like
  // file (DOCUMENT/FILE) updated within MEETING_NOTES_TRANSCRIPT_WINDOW_HOURS
  // of the meeting end. Emit a SUMMARIZE candidate per match.
  private async collectMeetingNotesCandidates(): Promise<CandidateSuggestion[]> {
    const now = Date.now();
    const lookbackCutoff = new Date(now - MEETING_NOTES_SCAN_LOOKBACK_HOURS * 60 * 60 * 1000);
    const meetings = await this.prisma.workspaceObject.findMany({
      where: {
        type: 'MEETING',
        externalUpdatedAt: { gte: lookbackCutoff },
      },
      take: AUTO_SUGGEST_CANDIDATE_BATCH_SIZE,
      select: {
        id: true,
        userId: true,
        connectorId: true,
        externalId: true,
        title: true,
        provider: true,
        externalUpdatedAt: true,
      },
    });
    if (meetings.length === 0) return [];
    const candidates: CandidateSuggestion[] = [];
    const transcriptWindowMs = MEETING_NOTES_TRANSCRIPT_WINDOW_HOURS * 60 * 60 * 1000;
    for (const meeting of meetings) {
      const endTs = meeting.externalUpdatedAt?.getTime() ?? now;
      const transcriptCandidate = await this.prisma.workspaceObject.findFirst({
        where: {
          userId: meeting.userId,
          type: { in: ['DOCUMENT', 'FILE'] },
          externalUpdatedAt: {
            gte: new Date(endTs - transcriptWindowMs),
            lte: new Date(endTs + transcriptWindowMs),
          },
          OR: MEETING_NOTES_TRANSCRIPT_KEYWORDS.map((kw) => ({
            title: { contains: kw, mode: 'insensitive' as const },
          })),
        },
        orderBy: { externalUpdatedAt: 'desc' },
        select: { id: true, title: true, externalId: true },
      });
      if (transcriptCandidate === null) continue;
      candidates.push({
        userId: meeting.userId,
        connectorId: meeting.connectorId,
        provider: meeting.provider as WorkspaceProvider,
        actionKind: 'SUMMARIZE',
        sourceObjectId: meeting.id,
        draftPayload: {
          meetingObjectId: meeting.id,
          meetingTitle: meeting.title,
          transcriptObjectId: transcriptCandidate.id,
          transcriptTitle: transcriptCandidate.title,
          context: `Post-meeting summary: ${meeting.title}. Transcript: ${transcriptCandidate.title}`,
          privacyClass: 'INTERNAL',
        },
        generatedBy: { jobType: 'MEETING_NOTES_SCAN' },
      });
    }
    return candidates;
  }

  // Pulls Jira tickets updated in the last 7 days. The full "ticket needs
  // summary" heuristic (>10 comments + no recent summary) is deferred to
  // a future iteration; this MVP wires the cron path end-to-end against
  // existing data.
  private async collectJiraCandidates(): Promise<CandidateSuggestion[]> {
    const cutoff = new Date(Date.now() - AUTO_SUGGEST_RECENT_TICKET_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const objects = await this.prisma.workspaceObject.findMany({
      where: {
        provider: 'JIRA',
        type: 'TICKET',
        updatedAt: { gt: cutoff },
      },
      take: AUTO_SUGGEST_CANDIDATE_BATCH_SIZE,
      select: {
        id: true,
        userId: true,
        connectorId: true,
        externalId: true,
        title: true,
      },
    });
    return objects.map((o) => ({
      userId: o.userId,
      connectorId: o.connectorId,
      provider: WorkspaceProvider.JIRA,
      actionKind: 'SUMMARIZE',
      sourceObjectId: o.id,
      draftPayload: { objectId: o.id, externalId: o.externalId, title: o.title },
      generatedBy: { jobType: 'JIRA_TICKET_SUMMARY' },
    }));
  }

  // Stale-PR nudge candidates: GitHub PRs with no activity for AUTO_SUGGEST_STALE_PR_AGE_DAYS+ days.
  private async collectStalePrCandidates(): Promise<CandidateSuggestion[]> {
    const cutoff = new Date(Date.now() - AUTO_SUGGEST_STALE_PR_AGE_DAYS * 24 * 60 * 60 * 1000);
    const objects = await this.prisma.workspaceObject.findMany({
      where: {
        provider: 'GITHUB',
        type: 'PULL_REQUEST',
        updatedAt: { lt: cutoff },
      },
      take: AUTO_SUGGEST_CANDIDATE_BATCH_SIZE,
      select: {
        id: true,
        userId: true,
        connectorId: true,
        externalId: true,
        title: true,
      },
    });
    return objects.map((o) => ({
      userId: o.userId,
      connectorId: o.connectorId,
      provider: WorkspaceProvider.GITHUB,
      actionKind: 'COMMENT_PR',
      sourceObjectId: o.id,
      draftPayload: {
        objectId: o.id,
        externalId: o.externalId,
        title: o.title,
        nudgeBody: 'Polite nudge — this PR has been idle for 7+ days. Want a status update?',
      },
      generatedBy: { jobType: 'GITHUB_STALE_PR' },
    }));
  }
}
