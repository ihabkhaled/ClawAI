import { Injectable, Logger } from '@nestjs/common';
import { SeedApplyOutcome } from '../../../common/enums';
import { Prisma, RouterConfigurationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ROUTER_CHAIN_SEED_LOCK_ID } from '../constants/router-chain-seed.constants';
import { SEED_STATUS_COMPLETED, SEED_STATUS_RUNNING } from '../constants/router-models.constants';
import type { ChainSeedInput } from '../types/router-chain-seed.types';

@Injectable()
export class RouterChainSeedRepository {
  private readonly logger = new Logger(RouterChainSeedRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes revision 1 of the default chain, once.
   *
   * The whole thing is one transaction behind a transaction-scoped advisory
   * lock, so concurrent boots cannot both create revision 1 and collide on the
   * (scope, revision) unique.
   *
   * A configuration already existing for the scope short-circuits even when the
   * ledger is missing. That belt-and-braces check matters: a ledger row can be
   * lost to a restore while the configuration survives, and re-seeding then
   * would resurrect the default chain over whatever an admin has since
   * published.
   */
  async applyOnce(input: ChainSeedInput): Promise<SeedApplyOutcome> {
    this.logger.debug(`applyOnce: ${input.name} v${String(input.version)}`);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(${ROUTER_CHAIN_SEED_LOCK_ID})::text`,
      );

      const execution = await transaction.seedExecution.findUnique({
        where: { name_version: { name: input.name, version: input.version } },
      });

      if (execution?.status === SEED_STATUS_COMPLETED) {
        return execution.checksum === input.checksum
          ? SeedApplyOutcome.ALREADY_APPLIED
          : SeedApplyOutcome.CHECKSUM_MISMATCH;
      }

      const existing = await transaction.routerConfiguration.findFirst({
        where: { scope: input.configuration.scope },
        select: { id: true },
      });
      if (existing) {
        this.logger.warn(
          `applyOnce: a configuration already exists for scope ${input.configuration.scope}; not re-seeding`,
        );
        return SeedApplyOutcome.ALREADY_APPLIED;
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

      const configuration = await transaction.routerConfiguration.create({
        data: {
          scope: input.configuration.scope,
          revision: input.configuration.revision,
          // PUBLISHED so it is the live revision, but `enabled: false` keeps it
          // inert. Seeding a chain is not switching production onto it.
          status: RouterConfigurationStatus.PUBLISHED,
          mode: input.configuration.mode,
          enabled: input.configuration.enabled,
          totalDeadlineMs: input.configuration.totalDeadlineMs,
          maxAttempts: input.configuration.maxAttempts,
          maxRouterInputTokens: input.configuration.maxRouterInputTokens,
          maxRouterOutputTokens: input.configuration.maxRouterOutputTokens,
          minConfidence: new Prisma.Decimal(input.configuration.minConfidence),
          lowConfidenceAction: input.configuration.lowConfidenceAction,
          failClosedWhenNoEligibleRouter: input.configuration.failClosedWhenNoEligibleRouter,
          skipProviderOnProviderWideFailure: input.configuration.skipProviderOnProviderWideFailure,
          safeTraceLevel: input.configuration.safeTraceLevel,
          legacyLocalRollbackEnabled: input.configuration.legacyLocalRollbackEnabled,
          publishedAt: new Date(),
          publishedBy: input.name,
        },
      });

      for (const entry of input.entries) {
        await transaction.routerChainEntry.create({
          data: {
            configurationId: configuration.id,
            order: entry.order,
            role: entry.role,
            provider: entry.provider,
            modelAlias: entry.modelAlias,
            // Deliberately null: the alias is a bootstrap guess until discovery
            // matches it to a real endpoint.
            deploymentId: null,
            attemptTimeoutMs: entry.attemptTimeoutMs,
            retries: entry.retries,
            triggers: [...entry.triggers],
            billingModel: entry.billingModel,
          },
        });
      }

      await transaction.seedExecution.update({
        where: { name_version: { name: input.name, version: input.version } },
        data: { status: SEED_STATUS_COMPLETED, completedAt: new Date(), error: null },
      });

      this.logger.log(
        `applyOnce: seeded ${input.name} with ${String(input.entries.length)} chain entries (disabled)`,
      );
      return SeedApplyOutcome.APPLIED;
    });
  }
}
