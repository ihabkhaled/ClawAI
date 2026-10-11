import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ModelCostVersion } from '../../../generated/prisma';
import { type PublishModelCostInput } from '../types/model-cost.types';

@Injectable()
export class ModelCostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(provider: string, modelKey: string): Promise<ModelCostVersion | null> {
    return this.prisma.modelCostVersion.findUnique({
      where: { activeKey: `${provider}:${modelKey}` },
    });
  }

  /**
   * The dearest TEXT-CHAT rate this provider publishes, ranked by the COMBINED
   * input + output rate per million tokens.
   *
   * The basis for the unpriced fallback: charging an unknown model at the
   * dearest rate we actually know for its provider can over-charge, but it can
   * never UNDER-charge, and under-charging is the failure that lets a user
   * outspend their credit. Ranked by the combined rate (not input alone) so a
   * model with a cheap input and a huge output cannot hide behind a
   * higher-input, cheaper-output sibling.
   *
   * Only TOKEN-priced chat rows qualify. A per-unit row (image, video, audio,
   * speech) keeps its money in a unit column and carries a zero output rate by
   * design; standing it in for an unknown CHAT model would price that model's
   * output at $0. Prisma cannot order by a sum, so the (small, per-provider)
   * candidate set is ranked here.
   */
  async findMostExpensiveForProvider(provider: string): Promise<ModelCostVersion | null> {
    const candidates = await this.prisma.modelCostVersion.findMany({
      where: {
        provider,
        isActive: true,
        inputPerMillionMicroUsd: { gt: 0n },
        outputPerMillionMicroUsd: { gt: 0n },
        imagePerUnitMicroUsd: null,
        audioPerUnitMicroUsd: null,
        videoPerUnitMicroUsd: null,
        ttsPerCharacterMicroUsd: null,
      },
    });
    let dearest: ModelCostVersion | null = null;
    let dearestTotal = 0n;
    for (const candidate of candidates) {
      const total =
        (candidate.inputPerMillionMicroUsd ?? 0n) + (candidate.outputPerMillionMicroUsd ?? 0n);
      if (dearest === null || total > dearestTotal) {
        dearest = candidate;
        dearestTotal = total;
      }
    }
    return dearest;
  }

  async listActive(): Promise<ModelCostVersion[]> {
    return this.prisma.modelCostVersion.findMany({
      where: { isActive: true },
      orderBy: [{ provider: 'asc' }, { modelKey: 'asc' }],
    });
  }

  async listVersions(provider: string, modelKey: string): Promise<ModelCostVersion[]> {
    return this.prisma.modelCostVersion.findMany({
      where: { provider, modelKey },
      orderBy: { version: 'desc' },
    });
  }

  // Retires the current active row and inserts the next version in ONE
  // transaction. Two concurrent publishes cannot both leave an active row —
  // the partial-unique active_key index rejects the loser.
  async publish(input: PublishModelCostInput): Promise<ModelCostVersion> {
    const activeKey = `${input.provider}:${input.modelKey}`;
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.modelCostVersion.findUnique({ where: { activeKey } });
      if (previous) {
        await tx.modelCostVersion.update({
          where: { id: previous.id },
          data: { isActive: false, activeKey: null, retiredAt: new Date() },
        });
      }
      return tx.modelCostVersion.create({
        data: {
          provider: input.provider,
          modelKey: input.modelKey,
          version: (previous?.version ?? 0) + 1,
          currency: input.currency,
          inputPerMillionMicroUsd: input.inputPerMillionMicroUsd,
          outputPerMillionMicroUsd: input.outputPerMillionMicroUsd,
          cachedInputPerMillionMicroUsd: input.cachedInputPerMillionMicroUsd,
          cacheWritePerMillionMicroUsd: input.cacheWritePerMillionMicroUsd,
          reasoningPerMillionMicroUsd: input.reasoningPerMillionMicroUsd,
          imagePerUnitMicroUsd: input.imagePerUnitMicroUsd,
          audioPerUnitMicroUsd: input.audioPerUnitMicroUsd,
          videoPerUnitMicroUsd: input.videoPerUnitMicroUsd,
          toolCallPerUnitMicroUsd: input.toolCallPerUnitMicroUsd,
          searchCallPerUnitMicroUsd: input.searchCallPerUnitMicroUsd,
          ttsPerCharacterMicroUsd: input.ttsPerCharacterMicroUsd,
          costClass: input.costClass,
          confidence: input.confidence,
          source: input.source,
          isAdminOverride: input.isAdminOverride,
          localComputeOwnership: input.localComputeOwnership,
          createdByUserId: input.createdByUserId,
          notes: input.notes,
          isActive: true,
          activeKey,
          lastVerifiedAt: new Date(),
        },
      });
    });
  }

  // Records that an existing rate was re-confirmed by a sync, without minting a
  // new version. Keeps `lastVerifiedAt` honest when nothing actually changed.
  async touchVerified(id: string): Promise<void> {
    await this.prisma.modelCostVersion.update({
      where: { id },
      data: { lastVerifiedAt: new Date() },
    });
  }
}
