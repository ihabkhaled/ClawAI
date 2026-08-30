import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  calculateCostMicroUsd,
  calculateWeightedTokens,
  estimateWeightedTokens,
  hasUsablePricing,
} from '@claw/shared-utilities';
import { EventPattern, type ModelCostRates, type RawTokenBreakdown } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { AppConfig } from '../../../app/config/app.config';
import {
  CostClass,
  CostConfidence,
  LocalComputeOwnership,
  ModelCostSource,
} from '../../../generated/prisma';
import {
  LOCAL_COST_PROVIDERS,
  PRISMA_TO_SHARED_COST_CLASS,
} from '../constants/model-cost.constants';
import { normalizeModelId } from '../utilities/model-alias-matching.utility';
import { ModelCostRepository } from '../repositories/model-cost.repository';
import {
  ratesAreUnchanged,
  toBigInt,
  toModelCostSnapshot,
} from '../utilities/model-cost-record.utility';
import { type ModelCostQuote } from '../types/model-cost-quote.types';
import {
  type ApplySyncedCostResult,
  type ModelCostRateDto,
  type ModelCostSnapshot,
  type PublishModelCostInput,
} from '../types/model-cost.types';

// Owns what a model costs. Quota is metered in cost-normalized weighted tokens,
// so this is the number every allowance ultimately derives from.
//
// Two rules here are load-bearing and easy to get wrong:
//   1. An automated sync NEVER overwrites an active administrator override.
//      Losing a hand-negotiated rate to a nightly scrape would silently mis-bill
//      every request on that model.
//   2. An unpriced model is UNSAFE, not free. Returning `isPriced: false` lets
//      the caller fail closed on a limited plan instead of granting unbounded
//      provider spend.
@Injectable()
export class ModelCostService {
  private readonly logger = new Logger(ModelCostService.name);

  constructor(
    private readonly repository: ModelCostRepository,
    // @Optional() matches the house style for every other publisher in this
    // service. A price is authoritative in Postgres the moment `publish`
    // commits; the event is only a cache hint, so a broker that is down must
    // degrade to a 300 s staleness window, never fail the administrator's
    // repricing.
    @Optional() private readonly rabbitMQ?: RabbitMQService,
  ) {}

  async getSnapshot(provider: string, modelKey: string): Promise<ModelCostSnapshot> {
    this.logger.debug(`getSnapshot: provider=${provider} model=${modelKey}`);
    const record = await this.repository.findActive(provider, modelKey);
    if (record) {
      return toModelCostSnapshot(record);
    }
    // Providers decorate their own ids. Gemini answers `models/gemini-2.5-flash`
    // where the price row is written `gemini-2.5-flash`, so an exact-match
    // lookup called a PRICED model unpriced and the reservation refused it.
    // `normalizeModelId` strips only decoration — never a dated suffix or a size
    // marker, which name a different model.
    const normalized = normalizeModelId(modelKey, provider);
    if (normalized !== modelKey.toLowerCase()) {
      const byNormalized = await this.repository.findActive(provider, normalized);
      if (byNormalized) {
        this.logger.debug(`getSnapshot: matched ${modelKey} as ${normalized}`);
        return toModelCostSnapshot(byNormalized);
      }
    }
    return this.unpricedSnapshot(provider, modelKey);
  }

  // No registry row. Local models fall back to the configured compute cost;
  // everything else is explicitly unpriced.
  private unpricedSnapshot(provider: string, modelKey: string): ModelCostSnapshot {
    const config = AppConfig.get();
    const isLocal = ModelCostService.isLocalProvider(provider);
    if (!isLocal) {
      this.logger.warn(`unpricedSnapshot: no active cost row for ${provider}/${modelKey}`);
      return ModelCostService.emptySnapshot(provider, modelKey, null);
    }

    const ownership =
      config.LOCAL_COMPUTE_OWNERSHIP === 'PLATFORM_HOSTED'
        ? LocalComputeOwnership.PLATFORM_HOSTED
        : LocalComputeOwnership.USER_OWNED;

    if (ownership === LocalComputeOwnership.USER_OWNED) {
      // The user's own hardware: genuinely zero marginal cost to the platform.
      return {
        ...ModelCostService.emptySnapshot(provider, modelKey, ownership),
        inputPerMillionMicroUsd: 0,
        outputPerMillionMicroUsd: 0,
        costClass: PRISMA_TO_SHARED_COST_CLASS[CostClass.FREE],
        isPriced: true,
      };
    }

    const rate = config.LOCAL_COMPUTE_COST_PER_MILLION_MICRO_USD;
    if (rate <= 0) {
      // Hosting the compute but pricing it at zero is a misconfiguration, not a
      // free tier. Fail closed rather than serve unlimited free inference.
      this.logger.error(
        'unpricedSnapshot: LOCAL_COMPUTE_OWNERSHIP=PLATFORM_HOSTED with a zero cost estimate — treating local models as UNPRICED',
      );
      return ModelCostService.emptySnapshot(provider, modelKey, ownership);
    }
    return {
      ...ModelCostService.emptySnapshot(provider, modelKey, ownership),
      inputPerMillionMicroUsd: rate,
      outputPerMillionMicroUsd: rate,
      costClass: PRISMA_TO_SHARED_COST_CLASS[CostClass.CHEAP],
      isPriced: true,
    };
  }

  private static isLocalProvider(provider: string): boolean {
    const normalized = provider.toUpperCase();
    return LOCAL_COST_PROVIDERS.includes(normalized);
  }

  private static emptySnapshot(
    provider: string,
    modelKey: string,
    ownership: LocalComputeOwnership | null,
  ): ModelCostSnapshot {
    return {
      provider,
      model: modelKey,
      version: 0,
      currency: 'USD',
      inputPerMillionMicroUsd: null,
      outputPerMillionMicroUsd: null,
      cachedInputPerMillionMicroUsd: null,
      cacheWritePerMillionMicroUsd: null,
      reasoningPerMillionMicroUsd: null,
      imagePerUnitMicroUsd: null,
      audioPerUnitMicroUsd: null,
      videoPerUnitMicroUsd: null,
      toolCallPerUnitMicroUsd: null,
      searchCallPerUnitMicroUsd: null,
      costClass: PRISMA_TO_SHARED_COST_CLASS[CostClass.STANDARD],
      isAdminOverride: false,
      effectiveFrom: new Date(0).toISOString(),
      lastVerifiedAt: null,
      source: ModelCostSource.SEED,
      isPriced: false,
      localComputeOwnership: ownership,
    };
  }

  // Administrator publish. Always mints a new version — history is never
  // rewritten, so a past usage record can still be re-priced with the rates that
  // were in force when it ran.
  async publish(input: PublishModelCostInput): Promise<number> {
    const record = await this.repository.publish(input);
    this.logger.log(
      `publish: ${input.provider}/${input.modelKey} v${record.version} source=${input.source} override=${input.isAdminOverride}`,
    );
    // auth-service caches a provider rate for PAYG_RATE_CACHE_TTL_SECONDS
    // (300 s) while reserving PAYG credit. Without this the new price would not
    // reach the wallet for up to five minutes, so an administrator correcting a
    // wrong rate would keep mis-billing users for the rest of the TTL. This
    // makes the correction land on the NEXT request instead.
    //
    // Fire-and-forget on purpose: the price is already committed and
    // authoritative in Postgres. Blocking the administrator's request on the
    // broker, or failing their publish because the broker is down, would trade
    // a bounded 300 s staleness for an outright outage.
    void this.safePublish(EventPattern.ROUTING_MODEL_COST_PUBLISHED, {
      provider: input.provider,
      modelKey: input.modelKey,
      version: record.version,
    });
    return record.version;
  }

  // Payload is deliberately just the identity and the version — never the
  // rates. A rate is a margin input, and an event on a topic exchange is
  // readable by any consumer that binds to the pattern; the consumer that needs
  // the number re-reads it over the authenticated internal route.
  private async safePublish(pattern: EventPattern, payload: unknown): Promise<void> {
    if (this.rabbitMQ === undefined) {
      return;
    }
    try {
      await this.rabbitMQ.publish(pattern, payload);
    } catch (error) {
      this.logger.warn(`event publish failed pattern=${pattern}: ${(error as Error).message}`);
    }
  }

  // Applies rates discovered by an automated sync. Refuses to touch a model an
  // administrator has pinned, and skips a no-op rather than churning versions.
  async applySyncedRates(input: PublishModelCostInput): Promise<ApplySyncedCostResult> {
    const active = await this.repository.findActive(input.provider, input.modelKey);
    if (active?.isAdminOverride) {
      this.logger.warn(
        `applySyncedRates: skipped ${input.provider}/${input.modelKey} — administrator override active`,
      );
      return { applied: false, reason: 'ADMIN_OVERRIDE_ACTIVE' };
    }
    if (active && ratesAreUnchanged(active, input)) {
      await this.repository.touchVerified(active.id);
      return { applied: false, reason: 'RATES_UNCHANGED' };
    }
    // Routed through `publish` on purpose, so ROUTING_MODEL_COST_PUBLISHED is
    // emitted exactly when a rate ACTUALLY changed. Both early returns above
    // leave the stored price untouched, so neither may bust a downstream cache:
    // a nightly no-op sync must not wake every consumer's rate cache.
    const version = await this.publish({ ...input, isAdminOverride: false });
    return { applied: true, version };
  }

  // Adapts a validated DTO (numbers) to the repository shape (BigInt).
  async publishFromDto(
    dto: ModelCostRateDto,
    source: ModelCostSource,
    isAdminOverride: boolean,
  ): Promise<number> {
    return this.publish({
      provider: dto.provider,
      modelKey: dto.modelKey,
      currency: dto.currency,
      inputPerMillionMicroUsd: toBigInt(dto.inputPerMillionMicroUsd),
      outputPerMillionMicroUsd: toBigInt(dto.outputPerMillionMicroUsd),
      cachedInputPerMillionMicroUsd: toBigInt(dto.cachedInputPerMillionMicroUsd),
      cacheWritePerMillionMicroUsd: toBigInt(dto.cacheWritePerMillionMicroUsd),
      reasoningPerMillionMicroUsd: toBigInt(dto.reasoningPerMillionMicroUsd),
      imagePerUnitMicroUsd: toBigInt(dto.imagePerUnitMicroUsd),
      audioPerUnitMicroUsd: toBigInt(dto.audioPerUnitMicroUsd),
      videoPerUnitMicroUsd: toBigInt(dto.videoPerUnitMicroUsd),
      toolCallPerUnitMicroUsd: toBigInt(dto.toolCallPerUnitMicroUsd),
      searchCallPerUnitMicroUsd: toBigInt(dto.searchCallPerUnitMicroUsd),
      costClass: dto.costClass,
      confidence: ModelCostService.defaultConfidence(source),
      source,
      isAdminOverride,
      localComputeOwnership: dto.localComputeOwnership,
      createdByUserId: null,
      notes: dto.notes,
    });
  }

  // Worst-case pre-flight cost. `maxOutputTokens` is the ceiling the request
  // could produce, not a likely value — a reservation that only covers the
  // typical case does not actually bound spend.
  async estimate(params: {
    provider: string;
    modelKey: string;
    promptTokens: number;
    maxOutputTokens: number;
  }): Promise<ModelCostQuote> {
    const snapshot = await this.getSnapshot(params.provider, params.modelKey);
    if (!snapshot.isPriced || !hasUsablePricing(snapshot)) {
      return { weightedTokens: 0, costMicroUsd: 0, isPriced: false };
    }
    const weightedTokens = estimateWeightedTokens(
      params.promptTokens,
      params.maxOutputTokens,
      snapshot,
    );
    return { weightedTokens, costMicroUsd: weightedTokens, isPriced: true };
  }

  // Post-execution price from measured usage.
  async price(params: {
    provider: string;
    modelKey: string;
    raw: RawTokenBreakdown;
  }): Promise<{ weightedTokens: number; costMicroUsd: number; isPriced: boolean }> {
    const snapshot = await this.getSnapshot(params.provider, params.modelKey);
    if (!snapshot.isPriced || !hasUsablePricing(snapshot)) {
      return { weightedTokens: 0, costMicroUsd: 0, isPriced: false };
    }
    const rates: ModelCostRates = snapshot;
    return {
      weightedTokens: calculateWeightedTokens(params.raw, rates),
      costMicroUsd: calculateCostMicroUsd(params.raw, rates),
      isPriced: true,
    };
  }

  async listActive(): Promise<ModelCostSnapshot[]> {
    const records = await this.repository.listActive();
    return records.map((record) => toModelCostSnapshot(record));
  }

  async listVersions(provider: string, modelKey: string): Promise<ModelCostSnapshot[]> {
    const records = await this.repository.listVersions(provider, modelKey);
    return records.map((record) => toModelCostSnapshot(record));
  }

  // Confidence label used when seeding a model whose price came from a public
  // card rather than a contract.
  static defaultConfidence(source: ModelCostSource): CostConfidence {
    return source === ModelCostSource.ADMIN_OVERRIDE
      ? CostConfidence.EXACT
      : CostConfidence.ESTIMATED;
  }
}
