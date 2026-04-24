import { Injectable } from '@nestjs/common';
import { type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
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

  async upsertOutcomeRecord(input: CreateRoutingOutcomeInput) {
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
      },
    });
  }

  async createFeedbackRecord(input: CreateRoutingFeedbackInput) {
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

  async replaceModelProfiles(records: RouterModelProfileRecord[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.routerModelProfile.deleteMany(),
      ...(records.length > 0
        ? [
            this.prisma.routerModelProfile.createMany({
              data: records.map((record) => ({
                ...record,
                lastUpdated: new Date(),
              })),
            }),
          ]
        : []),
    ]);
  }

  async replaceTopicProfiles(records: RouterTopicProfileRecord[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.routerTopicProfile.deleteMany(),
      ...(records.length > 0
        ? [
            this.prisma.routerTopicProfile.createMany({
              data: records.map((record) => ({
                ...record,
                lastUpdated: new Date(),
              })),
            }),
          ]
        : []),
    ]);
  }

  async createCalibrationSnapshot(
    version: string,
    summary: Prisma.InputJsonValue,
    promptHints: Prisma.InputJsonValue,
  ) {
    await this.prisma.routingCalibrationSnapshot.updateMany({
      data: { active: false },
      where: { active: true },
    });

    return this.prisma.routingCalibrationSnapshot.create({
      data: {
        version,
        windowDays: 30,
        summary,
        promptHints,
        active: true,
      },
    });
  }

  async getLatestCalibrationSnapshot() {
    return this.prisma.routingCalibrationSnapshot.findFirst({
      where: { active: true },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async listModelProfiles(taskFamily?: string, limit = 25) {
    return this.prisma.routerModelProfile.findMany({
      where: taskFamily ? { taskFamily } : undefined,
      orderBy: [{ weightedSuccessScore: 'desc' }, { confidenceInProfile: 'desc' }],
      take: limit,
    });
  }

  async listTopicProfiles(taskFamily?: string, limit = 25) {
    return this.prisma.routerTopicProfile.findMany({
      where: taskFamily ? { taskFamily } : undefined,
      orderBy: [{ weightedSuccessScore: 'desc' }, { confidenceInProfile: 'desc' }],
      take: limit,
    });
  }

  async findBestModelProfile(taskFamily: string) {
    return this.prisma.routerModelProfile.findFirst({
      where: { taskFamily },
      orderBy: [{ weightedSuccessScore: 'desc' }, { confidenceInProfile: 'desc' }],
    });
  }

  async findModelProfile(provider: string, model: string, taskFamily: string) {
    return this.prisma.routerModelProfile.findFirst({
      where: { provider, model, taskFamily },
    });
  }
}
