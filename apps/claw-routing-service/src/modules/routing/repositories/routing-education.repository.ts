import { Injectable } from '@nestjs/common';
import {
  type RouterModelProfile,
  type RouterTopicProfile,
  type RoutingCalibrationSnapshot,
  type RoutingFeedbackRecord,
  type RoutingOutcomeRecord,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  CommitCalibrationBatchInput,
  CreateRoutingFeedbackInput,
  CreateRoutingOutcomeInput,
  RouterModelProfileRecord,
  RouterTopicProfileRecord,
  RoutingDecisionWithEducation,
} from '../types/routing-education.types';

@Injectable()
export class RoutingEducationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDecisionByMessageId(messageId: string): Promise<RoutingDecisionWithEducation | null> {
    return this.prisma.routingDecision.findFirst({
      where: { messageId },
      include: {
        outcomes: true,
        feedbackRecords: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<RoutingDecisionWithEducation | null>;
  }

  async findDecisionByAssistantMessageId(
    assistantMessageId: string,
  ): Promise<RoutingDecisionWithEducation | null> {
    return this.prisma.routingDecision.findFirst({
      where: {
        outcomes: {
          some: {
            assistantMessageId,
          },
        },
      },
      include: {
        outcomes: true,
        feedbackRecords: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<RoutingDecisionWithEducation | null>;
  }

  async upsertOutcomeRecord(input: CreateRoutingOutcomeInput): Promise<RoutingOutcomeRecord> {
    return this.prisma.routingOutcomeRecord.upsert({
      where: { routingDecisionId: input.routingDecisionId },
      create: {
        routingDecisionId: input.routingDecisionId,
        messageId: input.messageId ?? null,
        assistantMessageId: input.assistantMessageId ?? null,
        threadId: input.threadId,
        finalExecutionProvider: input.finalExecutionProvider,
        finalExecutionModel: input.finalExecutionModel,
        executionStatus: input.executionStatus,
        executionSuccess: input.executionSuccess,
        actualLatencyMs: input.actualLatencyMs ?? null,
        actualCostEstimate: input.actualCostEstimate ?? null,
        finalStatus: input.finalStatus ?? 'completed',
        fallbackUsed: input.fallbackUsed ?? false,
        judgeOutcome: input.judgeOutcome ?? 'NONE',
        judgeConfidence: input.judgeConfidence ?? null,
        criticScore: input.criticScore ?? null,
        issueTags: input.issueTags ?? [],
        revised: input.revised ?? false,
        escalated: input.escalated ?? false,
        followUpSignal: input.followUpSignal ?? null,
        evaluatorVersion: input.evaluatorVersion ?? null,
      },
      update: {
        messageId: input.messageId ?? null,
        assistantMessageId: input.assistantMessageId ?? null,
        threadId: input.threadId,
        finalExecutionProvider: input.finalExecutionProvider,
        finalExecutionModel: input.finalExecutionModel,
        executionStatus: input.executionStatus,
        executionSuccess: input.executionSuccess,
        actualLatencyMs: input.actualLatencyMs ?? null,
        actualCostEstimate: input.actualCostEstimate ?? null,
        finalStatus: input.finalStatus ?? 'completed',
        fallbackUsed: input.fallbackUsed ?? false,
        judgeOutcome: input.judgeOutcome ?? 'NONE',
        judgeConfidence: input.judgeConfidence ?? null,
        criticScore: input.criticScore ?? null,
        issueTags: input.issueTags ?? [],
        revised: input.revised ?? false,
        escalated: input.escalated ?? false,
        followUpSignal: input.followUpSignal ?? null,
        evaluatorVersion: input.evaluatorVersion ?? null,
      },
    });
  }

  async createFeedbackRecord(input: CreateRoutingFeedbackInput): Promise<RoutingFeedbackRecord> {
    return this.prisma.routingFeedbackRecord.create({
      data: {
        routingDecisionId: input.routingDecisionId ?? null,
        messageId: input.messageId,
        threadId: input.threadId,
        assistantMessageId: input.assistantMessageId ?? null,
        feedbackValue: input.feedbackValue,
        source: input.source ?? 'thumbs',
        weight: input.weight ?? 1,
        taskFamily: input.taskFamily ?? null,
      },
    });
  }

  async findEducationWindow(windowDays: number): Promise<RoutingDecisionWithEducation[]> {
    const since = new Date(Date.now() - windowDays * 86_400_000);
    return this.prisma.routingDecision.findMany({
      where: { createdAt: { gte: since } },
      include: {
        outcomes: true,
        feedbackRecords: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<RoutingDecisionWithEducation[]>;
  }

  /**
   * V5 learning evolution (ADR-069) — batch recalibration first, rollback.
   *
   * Writes the full computed batch (snapshot row with its own copy of the
   * profile arrays, plus the promoted live profile tables) as a single
   * atomic transaction. If any step fails, nothing changes — the previous
   * calibration stays active and the live tables stay untouched, so a
   * failed recalibration never leaves a snapshot with no matching live data
   * or live data with no recorded version.
   */
  async commitCalibrationBatch(
    input: CommitCalibrationBatchInput,
  ): Promise<RoutingCalibrationSnapshot> {
    const now = new Date();
    const [, snapshot] = await this.prisma.$transaction([
      this.prisma.routingCalibrationSnapshot.updateMany({
        data: { active: false },
        where: { active: true },
      }),
      this.prisma.routingCalibrationSnapshot.create({
        data: {
          version: input.version,
          windowDays: input.windowDays,
          summary: input.summary,
          promptHints: input.promptHints,
          modelProfiles: input.modelProfiles,
          topicProfiles: input.topicProfiles,
          active: true,
        },
      }),
      this.prisma.routerModelProfile.deleteMany(),
      this.prisma.routerModelProfile.createMany({
        data: input.modelProfileRows.map((record) => ({ ...record, lastUpdated: now })),
      }),
      this.prisma.routerTopicProfile.deleteMany(),
      this.prisma.routerTopicProfile.createMany({
        data: input.topicProfileRows.map((record) => ({ ...record, lastUpdated: now })),
      }),
    ]);

    return snapshot;
  }

  /**
   * V5 learning evolution (ADR-069) — rollback. Restores a previously
   * committed snapshot's own archived profile rows to the live serving
   * tables and reactivates that snapshot, without recomputing anything from
   * raw RoutingOutcomeRecord/RoutingFeedbackRecord history.
   */
  async restoreCalibrationSnapshot(input: {
    version: string;
    modelProfileRows: RouterModelProfileRecord[];
    topicProfileRows: RouterTopicProfileRecord[];
  }): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.routingCalibrationSnapshot.updateMany({
        data: { active: false },
        where: { active: true },
      }),
      this.prisma.routingCalibrationSnapshot.updateMany({
        data: { active: true },
        where: { version: input.version },
      }),
      this.prisma.routerModelProfile.deleteMany(),
      this.prisma.routerModelProfile.createMany({
        data: input.modelProfileRows.map((record) => ({ ...record, lastUpdated: now })),
      }),
      this.prisma.routerTopicProfile.deleteMany(),
      this.prisma.routerTopicProfile.createMany({
        data: input.topicProfileRows.map((record) => ({ ...record, lastUpdated: now })),
      }),
    ]);
  }

  async getLatestCalibrationSnapshot(): Promise<RoutingCalibrationSnapshot | null> {
    return this.prisma.routingCalibrationSnapshot.findFirst({
      where: { active: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async getCalibrationSnapshotByVersion(
    version: string,
  ): Promise<RoutingCalibrationSnapshot | null> {
    return this.prisma.routingCalibrationSnapshot.findFirst({
      where: { version },
      orderBy: { generatedAt: 'desc' },
    });
  }

  /** The snapshot immediately before the currently active one, if any. */
  async getPreviousCalibrationSnapshot(): Promise<RoutingCalibrationSnapshot | null> {
    const recent = await this.prisma.routingCalibrationSnapshot.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 2,
    });
    return recent[1] ?? null;
  }

  async listModelProfiles(taskFamily?: string, limit = 25): Promise<RouterModelProfile[]> {
    return this.prisma.routerModelProfile.findMany({
      where: taskFamily ? { taskFamily } : undefined,
      orderBy: [{ weightedSuccessScore: 'desc' }, { confidenceInProfile: 'desc' }],
      take: limit,
    });
  }

  async listTopicProfiles(taskFamily?: string, limit = 25): Promise<RouterTopicProfile[]> {
    return this.prisma.routerTopicProfile.findMany({
      where: taskFamily ? { taskFamily } : undefined,
      orderBy: [{ weightedSuccessScore: 'desc' }, { confidenceInProfile: 'desc' }],
      take: limit,
    });
  }

  async findBestModelProfile(taskFamily: string): Promise<RouterModelProfile | null> {
    return this.prisma.routerModelProfile.findFirst({
      where: { taskFamily },
      orderBy: [{ weightedSuccessScore: 'desc' }, { confidenceInProfile: 'desc' }],
    });
  }

  async findModelProfile(
    provider: string,
    model: string,
    taskFamily: string,
  ): Promise<RouterModelProfile | null> {
    return this.prisma.routerModelProfile.findFirst({
      where: { provider, model, taskFamily },
    });
  }
}
