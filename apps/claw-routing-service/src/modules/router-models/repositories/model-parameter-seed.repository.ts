import { Injectable, Logger } from '@nestjs/common';
import { ModelLifecycle, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SeedApplyOutcome } from '../../../common/enums';
import {
  MODEL_PARAMETER_SEED_LOCK_ID,
  PARAMETER_COUNT_PINNED_FIELD,
} from '../constants/model-parameter-count.constants';
import { SEED_STATUS_COMPLETED, SEED_STATUS_RUNNING } from '../constants/router-models.constants';
import {
  type ModelParameterSeedInput,
  type ModelParameterSeedResult,
} from '../types/model-parameter-count.types';
import { lookupPublishedParameterCount } from '../utilities/model-parameter-count.utility';

@Injectable()
export class ModelParameterSeedRepository {
  private readonly logger = new Logger(ModelParameterSeedRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Backfills the parameter count of registry rows that have none, once per
   * (name, version).
   *
   * Same three-layer run-once mechanism as the other routing seeds: a
   * transaction-scoped advisory lock so booting replicas serialise, a
   * `SeedExecution` ledger row keyed on (name, version), and a checksum so a
   * COMPLETED row whose rule table has since changed is REPORTED, not
   * re-applied (bump the version to apply an edited table).
   *
   * It only ever FILLS A GAP. A row that already carries a count (a runtime's
   * report, an earlier sync, an admin) is untouched, and so is a row whose
   * `parameterCountBillions` an admin pinned, including one pinned to NULL
   * ("this model's size is unknown"). A row no rule matches stays NULL: the
   * picker then shows the context window alone.
   */
  async applyOnce(input: ModelParameterSeedInput): Promise<ModelParameterSeedResult> {
    this.logger.debug(`applyOnce: name=${input.name} version=${String(input.version)}`);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(${MODEL_PARAMETER_SEED_LOCK_ID})::text`,
      );

      const execution = await transaction.seedExecution.findUnique({
        where: { name_version: { name: input.name, version: input.version } },
      });
      if (execution?.status === SEED_STATUS_COMPLETED) {
        const outcome =
          execution.checksum === input.checksum
            ? SeedApplyOutcome.ALREADY_APPLIED
            : SeedApplyOutcome.CHECKSUM_MISMATCH;
        return { outcome, filled: 0, skipped: 0 };
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

      const empty = await transaction.routerModelRegistry.findMany({
        where: {
          parameterCountBillions: null,
          lifecycle: { not: ModelLifecycle.REMOVED },
          // A local file's size is what its runtime reports, which the sync writes.
          isLocal: false,
        },
        select: { id: true, modelKey: true },
      });
      const pinned = await transaction.routerAdminOverride.findMany({
        where: { fieldName: PARAMETER_COUNT_PINNED_FIELD, isActive: true },
        select: { profileId: true },
      });
      const pinnedIds = new Set(pinned.map((override) => override.profileId));

      let filled = 0;
      for (const row of empty) {
        const count = pinnedIds.has(row.id) ? null : lookupPublishedParameterCount(row.modelKey);
        if (count === null) {
          continue;
        }
        await transaction.routerModelRegistry.update({
          where: { id: row.id },
          data: {
            parameterCountBillions: count.totalBillions,
            activeParameterCountBillions: count.activeBillions,
          },
        });
        filled += 1;
      }

      await transaction.seedExecution.update({
        where: { name_version: { name: input.name, version: input.version } },
        data: { status: SEED_STATUS_COMPLETED, completedAt: new Date(), error: null },
      });

      this.logger.log(
        `applyOnce: filled ${String(filled)} of ${String(empty.length)} rows without a count for ${input.name} v${String(input.version)}`,
      );
      return { outcome: SeedApplyOutcome.APPLIED, filled, skipped: empty.length - filled };
    });
  }
}
