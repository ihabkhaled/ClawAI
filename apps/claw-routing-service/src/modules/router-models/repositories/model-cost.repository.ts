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
   * The most expensive active rate this provider publishes, by input price.
   *
   * The basis for the unpriced fallback: charging an unknown model at the
   * dearest rate we actually know for its provider can over-charge, but it can
   * never UNDER-charge, and under-charging is the failure that lets a user
   * outspend their credit. Ordered by input rate because every chat request
   * pays input; a model with a huge output rate and no input rate would not be
   * a safe ceiling.
   */
  async findMostExpensiveForProvider(provider: string): Promise<ModelCostVersion | null> {
    return this.prisma.modelCostVersion.findFirst({
      where: { provider, isActive: true, inputPerMillionMicroUsd: { not: null } },
      orderBy: [{ inputPerMillionMicroUsd: 'desc' }, { outputPerMillionMicroUsd: 'desc' }],
    });
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
