import { Injectable, Logger } from '@nestjs/common';
import {
  CostConfidence,
  ModelCostSource,
  type ModelCostVersion,
  Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SeedApplyOutcome } from '../../../common/enums';
import {
  MODEL_COST_SEED_LOCK_ID,
  MODEL_COST_SEED_NOTES,
} from '../constants/model-cost-seed.constants';
import { SEED_STATUS_COMPLETED, SEED_STATUS_RUNNING } from '../constants/router-models.constants';
import { ratesAreUnchanged, toBigInt } from '../utilities/model-cost-record.utility';
import type {
  ModelCostSeedEntry,
  ModelCostSeedInput,
  ModelCostSeedRepricedModel,
  ModelCostSeedResult,
} from '../types/model-cost-seed.types';
import type { ModelCostRateInput } from '../types/model-cost.types';

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
        return { outcome, inserted: 0, skipped: input.entries.length, repriced: [] };
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
          data: missing.map((entry) => ModelCostSeedRepository.seededRow(entry, 1)),
        });
      }

      const superseded = await ModelCostSeedRepository.supersedeSeededPrices(
        transaction,
        input.entries.filter(
          (entry) =>
            entry.supersedesSeededPrice === true &&
            alreadyPriced.has(`${entry.provider}:${entry.modelKey}`),
        ),
      );

      // A filled gap whose model was priced by the provider fallback until now:
      // auth may still hold that fallback rate, so it is announced like a
      // re-price (identity + version 1, never a rate).
      const filledOverFallback: ModelCostSeedRepricedModel[] = missing
        .filter((entry) => entry.replacesFallbackRate === true)
        .map(({ provider, modelKey }) => ({ provider, modelKey, version: 1 }));

      await transaction.seedExecution.update({
        where: { name_version: { name: input.name, version: input.version } },
        data: { status: SEED_STATUS_COMPLETED, completedAt: new Date(), error: null },
      });

      this.logger.log(
        `applyOnce: inserted ${String(missing.length)} price(s) (${String(filledOverFallback.length)} over a fallback rate), superseded ${String(superseded.length)} seeded price(s), left the rest of ${String(alreadyPriced.size)} already-priced model(s) untouched for ${input.name} v${String(input.version)}`,
      );
      return {
        outcome: SeedApplyOutcome.APPLIED,
        inserted: missing.length,
        skipped: input.entries.length - missing.length - superseded.length,
        repriced: [...superseded, ...filledOverFallback],
      };
    });
  }

  /**
   * Corrects a price an EARLIER seed version wrote, by appending a version.
   *
   * Only a model whose ACTIVE row is still a seeded list price qualifies. An
   * administrator override is never touched (the same invariant
   * `applySyncedRates` keeps), nor is a synced or provider-reported price, nor
   * an identical one. The old row is RETIRED — `isActive: false`,
   * `activeKey: null`, `retiredAt` — exactly as `ModelCostRepository.publish`
   * does, and its rates are never rewritten: a past usage record can still be
   * re-priced with the rates in force when it ran.
   */
  private static async supersedeSeededPrices(
    transaction: Prisma.TransactionClient,
    entries: readonly ModelCostSeedEntry[],
  ): Promise<ModelCostSeedRepricedModel[]> {
    const repriced: ModelCostSeedRepricedModel[] = [];
    for (const entry of entries) {
      const active = await transaction.modelCostVersion.findUnique({
        where: { activeKey: `${entry.provider}:${entry.modelKey}` },
      });
      if (!ModelCostSeedRepository.isSupersedable(active, entry)) {
        continue;
      }
      const latest = await transaction.modelCostVersion.findFirst({
        where: { provider: entry.provider, modelKey: entry.modelKey },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const version = (latest?.version ?? 0) + 1;
      await transaction.modelCostVersion.update({
        where: { id: active.id },
        data: { isActive: false, activeKey: null, retiredAt: new Date() },
      });
      await transaction.modelCostVersion.create({
        data: ModelCostSeedRepository.seededRow(entry, version),
      });
      repriced.push({ provider: entry.provider, modelKey: entry.modelKey, version });
    }
    return repriced;
  }

  private static isSupersedable(
    active: ModelCostVersion | null,
    entry: ModelCostSeedEntry,
  ): active is ModelCostVersion {
    return (
      active !== null &&
      active.source === ModelCostSource.SEED &&
      !active.isAdminOverride &&
      !ratesAreUnchanged(active, ModelCostSeedRepository.rateInput(entry))
    );
  }

  private static rateInput(entry: ModelCostSeedEntry): ModelCostRateInput {
    return {
      inputPerMillionMicroUsd: toBigInt(entry.inputPerMillionMicroUsd),
      outputPerMillionMicroUsd: toBigInt(entry.outputPerMillionMicroUsd),
      cachedInputPerMillionMicroUsd: toBigInt(entry.cachedInputPerMillionMicroUsd),
      cacheWritePerMillionMicroUsd: toBigInt(entry.cacheWritePerMillionMicroUsd),
      reasoningPerMillionMicroUsd: toBigInt(entry.reasoningPerMillionMicroUsd),
      imagePerUnitMicroUsd: toBigInt(entry.imagePerUnitMicroUsd ?? null),
      audioPerUnitMicroUsd: toBigInt(entry.audioPerUnitMicroUsd ?? null),
      videoPerUnitMicroUsd: null,
      toolCallPerUnitMicroUsd: null,
      searchCallPerUnitMicroUsd: null,
      ttsPerCharacterMicroUsd: toBigInt(entry.ttsPerCharacterMicroUsd ?? null),
    };
  }

  private static seededRow(
    entry: ModelCostSeedEntry,
    version: number,
  ): Prisma.ModelCostVersionCreateManyInput {
    return {
      provider: entry.provider,
      modelKey: entry.modelKey,
      version,
      currency: 'USD',
      ...ModelCostSeedRepository.rateInput(entry),
      costClass: entry.costClass,
      // ESTIMATED, never EXACT: these came off a public price card, not a
      // contract. Matches what `ModelCostService.defaultConfidence` returns
      // for a non-override source.
      confidence: CostConfidence.ESTIMATED,
      source: ModelCostSource.SEED,
      // FALSE on purpose. A later automated sync MAY replace a seeded list
      // price with a fresher one; only a human's explicit override is
      // protected from that.
      isAdminOverride: false,
      isActive: true,
      activeKey: `${entry.provider}:${entry.modelKey}`,
      notes: MODEL_COST_SEED_NOTES,
    };
  }
}
