import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { DEPLOYMENT_SEED_LOCK_ID } from '../constants/deployment-seed.constants';
import { SEED_STATUS_COMPLETED, SEED_STATUS_RUNNING } from '../constants/router-models.constants';
import { SeedApplyOutcome } from '../../../common/enums';
import type { DeploymentSeedSourceRow, SeedApplyInput } from '../types/deployment-seed.types';

@Injectable()
export class DeploymentSeedRepository {
  private readonly logger = new Logger(DeploymentSeedRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Every definition the backfill may derive an endpoint from. */
  async findDefinitionsForBackfill(): Promise<DeploymentSeedSourceRow[]> {
    this.logger.debug('findDefinitionsForBackfill: loading registry definitions');
    const rows = await this.prisma.routerModelRegistry.findMany({
      select: {
        id: true,
        provider: true,
        modelKey: true,
        connectorId: true,
        runtimeId: true,
        isLocal: true,
        privacySupport: true,
        contextWindowTokens: true,
        maxOutputTokens: true,
        supportsTools: true,
        supportsStructuredOutput: true,
        supportsStreaming: true,
        supportsVision: true,
      },
      orderBy: { id: 'asc' },
    });
    this.logger.debug(`findDefinitionsForBackfill: loaded ${String(rows.length)} definitions`);
    return rows;
  }

  /**
   * Applies the backfill exactly once per (name, version).
   *
   * The advisory lock is transaction-scoped, so several booting replicas
   * serialise here instead of racing to insert the same deploymentKey. An
   * already-COMPLETED row short-circuits, and a payload whose checksum no longer
   * matches that row is reported rather than written — silently re-applying a
   * changed payload would overwrite whatever an admin has since edited.
   *
   * The upsert uses an empty `update`, so replaying only ever fills gaps.
   */
  async applyOnce(input: SeedApplyInput): Promise<SeedApplyOutcome> {
    this.logger.debug(
      `applyOnce: name=${input.name} version=${String(input.version)} deployments=${String(input.deployments.length)}`,
    );

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(${DEPLOYMENT_SEED_LOCK_ID})::text`,
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
        return outcome;
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

      for (const deployment of input.deployments) {
        await transaction.modelDeployment.upsert({
          where: { deploymentKey: deployment.deploymentKey },
          create: deployment,
          // Never clobber an existing endpoint. A replay fills gaps only.
          update: {},
        });
      }

      await transaction.seedExecution.update({
        where: { name_version: { name: input.name, version: input.version } },
        data: { status: SEED_STATUS_COMPLETED, completedAt: new Date(), error: null },
      });

      this.logger.log(
        `applyOnce: applied ${String(input.deployments.length)} deployment(s) for ${input.name} v${String(input.version)}`,
      );
      return SeedApplyOutcome.APPLIED;
    });
  }
}
