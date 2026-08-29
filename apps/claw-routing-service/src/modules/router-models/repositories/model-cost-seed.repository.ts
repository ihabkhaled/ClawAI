import { Injectable, Logger } from '@nestjs/common';
import { CostConfidence, ModelCostSource, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SeedApplyOutcome } from '../../../common/enums';
import {
  MODEL_COST_SEED_LOCK_ID,
  MODEL_COST_SEED_NOTES,
} from '../constants/model-cost-seed.constants';
import { SEED_STATUS_COMPLETED, SEED_STATUS_RUNNING } from '../constants/router-models.constants';
import { toBigInt } from '../utilities/model-cost-record.utility';
import type { ModelCostSeedInput, ModelCostSeedResult } from '../types/model-cost-seed.types';

@Injectable()
export class ModelCostSeedRepository {
  private readonly logger = new Logger(ModelCostSeedRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applies the list-price bootstrap exactly once per (name, version).
   *
   * Same three-layer run-once mechanism as `DeploymentSeedRepository`: a
   * transaction-scoped advisory lock so booting replicas serialise instead of
   * racing, a `SeedExecution` ledger row keyed on (name, version), and a
   * checksum so a COMPLETED row whose payload has since changed is REPORTED
   * rather than re-applied.
   *
   * The write itself only ever FILLS A GAP. A model that already has any price
   * history — an administrator override, a synced rate, even a retired version
   * — is skipped entirely. Two consequences, both intended:
   *   1. An administrator override can never be clobbered by this seed. That is
   *      the same invariant `applySyncedRates` enforces against a nightly
   *      scrape, and losing a hand-negotiated rate silently mis-bills every
   *      request on that model until someone notices.
   *   2. Skipping on ANY history, not just an ACTIVE row, keeps the version
   *      counter honest. Inserting version 1 for a model whose v1 was retired
   *      would collide with `@@unique([provider, modelKey, version])`.
   */
  async applyOnce(input: ModelCostSeedInput): Promise<ModelCostSeedResult> {
    this.logger.debug(
      `applyOnce: name=${input.name} version=${String(input.version)} entries=${String(input.entries.length)}`,
    );

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(${MODEL_COST_SEED_LOCK_ID})::text`,
      );

      const execution = await transaction.seedExecution.findUnique({
        where: { name_version: { name: input.name, version: input.version } },
      });

      if (execution?.status === SEED_STATUS_COMPLETED) {
        const outcome =
          execution.checksum === input.checksum
            ? SeedApplyOutcome.ALREADY_APPLIED
            : SeedApplyOutcome.CHECKSUM_MISMATCH;
        this.logger.debug(`applyOnce: short-circuit outcome=${outcome}`);
        return { outcome, inserted: 0, skipped: input.entries.length };
      }

      await transaction.seedExecution.upsert({
        where: { name_version: { name: input.name, version: input.version } },
        create: {
          name: input.name,
          version: input.version,
          checksum: input.checksum,
          status: SEED_STATUS_RUNNING,
        },
        update: { checksum: input.checksum, status: SEED_STATUS_RUNNING, error: null },
      });

      const priced = await transaction.modelCostVersion.findMany({
        where: { OR: input.entries.map(({ provider, modelKey }) => ({ provider, modelKey })) },
        select: { provider: true, modelKey: true },
      });
      const alreadyPriced = new Set(
        priced.map(({ provider, modelKey }) => `${provider}:${modelKey}`),
      );
      const missing = input.entries.filter(
        (entry) => !alreadyPriced.has(`${entry.provider}:${entry.modelKey}`),
      );

      if (missing.length > 0) {
        await transaction.modelCostVersion.createMany({
          data: missing.map((entry) => ({
            provider: entry.provider,
            modelKey: entry.modelKey,
            version: 1,
            currency: 'USD',
            inputPerMillionMicroUsd: toBigInt(entry.inputPerMillionMicroUsd),
            outputPerMillionMicroUsd: toBigInt(entry.outputPerMillionMicroUsd),
            cachedInputPerMillionMicroUsd: toBigInt(entry.cachedInputPerMillionMicroUsd),
            cacheWritePerMillionMicroUsd: toBigInt(entry.cacheWritePerMillionMicroUsd),
            reasoningPerMillionMicroUsd: toBigInt(entry.reasoningPerMillionMicroUsd),
            costClass: entry.costClass,
            // ESTIMATED, never EXACT: these came off a public price card, not a
            // contract. Matches what `ModelCostService.defaultConfidence`
            // returns for a non-override source.
            confidence: CostConfidence.ESTIMATED,
            source: ModelCostSource.SEED,
            // FALSE on purpose. A later automated sync MAY replace a seeded
            // list price with a fresher one; only a human's explicit override
            // is protected from that.
            isAdminOverride: false,
            isActive: true,
            activeKey: `${entry.provider}:${entry.modelKey}`,
            notes: MODEL_COST_SEED_NOTES,
          })),
        });
      }

      await transaction.seedExecution.update({
        where: { name_version: { name: input.name, version: input.version } },
        data: { status: SEED_STATUS_COMPLETED, completedAt: new Date(), error: null },
      });

      this.logger.log(
        `applyOnce: inserted ${String(missing.length)} price(s), left ${String(alreadyPriced.size)} already-priced model(s) untouched for ${input.name} v${String(input.version)}`,
      );
      return {
        outcome: SeedApplyOutcome.APPLIED,
        inserted: missing.length,
        skipped: input.entries.length - missing.length,
      };
    });
  }
}
