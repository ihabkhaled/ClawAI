import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RouterConfigurationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ROUTER_CONFIGURATION_GLOBAL_SCOPE } from '../constants/router-chain.constants';
import type {
  RouterConfigurationSnapshot,
  SnapshotChainEntry,
} from '../types/router-chain-resolution.types';
import type {
  ChainEntryInput,
  RouterConfigurationDetail,
  RouterConfigurationSummary,
} from '../../router-configuration-admin/types/router-configuration-admin.types';
import {
  mapConfigurationDetail,
  mapConfigurationSummary,
} from '../../router-configuration-admin/utilities/router-configuration-record.utility';

@Injectable()
export class RouterConfigurationRepository {
  private readonly logger = new Logger(RouterConfigurationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads the live configuration and its chain as one frozen view.
   *
   * Both reads happen inside a single transaction so an admin publishing
   * mid-load cannot produce a snapshot that is half revision N and half N+1 —
   * a decision must correspond to exactly one revision that actually existed.
   *
   * Deployments are fetched by id rather than joined because a chain entry
   * holds a plain deploymentId, not a relation: a seeded entry legitimately
   * points at nothing until discovery resolves its alias, and a foreign key
   * would make "not resolved yet" unrepresentable.
   */
  async findPublishedSnapshot(
    scope: string = ROUTER_CONFIGURATION_GLOBAL_SCOPE,
  ): Promise<RouterConfigurationSnapshot | null> {
    this.logger.debug(`findPublishedSnapshot: scope=${scope}`);

    return this.prisma.$transaction(async (transaction) => {
      const configuration = await transaction.routerConfiguration.findFirst({
        where: { scope, status: RouterConfigurationStatus.PUBLISHED },
        include: { entries: { orderBy: { order: 'asc' } } },
      });

      if (!configuration) {
        this.logger.debug(`findPublishedSnapshot: no published configuration for scope=${scope}`);
        return null;
      }

      const deploymentIds = configuration.entries
        .map((entry) => entry.deploymentId)
        .filter((id): id is string => id !== null);

      const deployments =
        deploymentIds.length > 0
          ? await transaction.modelDeployment.findMany({
              where: { id: { in: deploymentIds } },
              select: { id: true, activationState: true, providerModelId: true },
            })
          : [];

      const byId = new Map(deployments.map((deployment) => [deployment.id, deployment]));

      const entries: SnapshotChainEntry[] = configuration.entries.map((entry) => {
        const deployment = entry.deploymentId ? byId.get(entry.deploymentId) : undefined;
        return {
          entryId: entry.id,
          order: entry.order,
          enabled: entry.enabled,
          role: entry.role,
          provider: entry.provider,
          modelAlias: entry.modelAlias,
          // A dangling id — the deployment was deleted out from under the entry
          // — reads as unresolved rather than as a usable endpoint.
          deploymentId: deployment?.id ?? null,
          deploymentActivationState: deployment?.activationState ?? null,
          deploymentProviderModelId: deployment?.providerModelId ?? null,
          attemptTimeoutMs: entry.attemptTimeoutMs,
          retries: entry.retries,
          triggers: entry.triggers,
          billingModel: entry.billingModel,
        };
      });

      return {
        configurationId: configuration.id,
        scope: configuration.scope,
        revision: configuration.revision,
        mode: configuration.mode,
        enabled: configuration.enabled,
        totalDeadlineMs: configuration.totalDeadlineMs,
        maxAttempts: configuration.maxAttempts,
        minConfidence: Number(configuration.minConfidence),
        lowConfidenceAction: configuration.lowConfidenceAction,
        failClosedWhenNoEligibleRouter: configuration.failClosedWhenNoEligibleRouter,
        skipProviderOnProviderWideFailure: configuration.skipProviderOnProviderWideFailure,
        legacyLocalRollbackEnabled: configuration.legacyLocalRollbackEnabled,
        entries,
      };
    });
  }

  /**
   * Lists configuration revisions for a scope, newest revision first. Used by
   * the admin revisions list — filterable by status, paginated.
   */
  async listRevisions(params: {
    scope: string;
    status?: RouterConfigurationStatus;
    skip: number;
    take: number;
  }): Promise<{ items: RouterConfigurationSummary[]; total: number }> {
    this.logger.debug(`listRevisions: scope=${params.scope} status=${params.status ?? 'any'}`);

    const where: Prisma.RouterConfigurationWhereInput = { scope: params.scope };
    if (params.status !== undefined) {
      where.status = params.status;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.routerConfiguration.findMany({
        where,
        include: { entries: true },
        orderBy: { revision: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.routerConfiguration.count({ where }),
    ]);

    this.logger.debug(`listRevisions: total=${total} returned=${rows.length}`);
    return { items: rows.map((row) => mapConfigurationSummary(row)), total };
  }

  /**
   * Loads one revision with its chain entries in `order` order — the admin
   * detail view. Unlike `findPublishedSnapshot`, status is not filtered: an
   * admin views drafts, the published revision, and superseded history alike.
   */
  async findRevisionById(id: string): Promise<RouterConfigurationDetail | null> {
    this.logger.debug(`findRevisionById: id=${id}`);
    const row = await this.prisma.routerConfiguration.findUnique({
      where: { id },
      include: { entries: true },
    });
    return row ? mapConfigurationDetail(row) : null;
  }

  /**
   * Loads the currently PUBLISHED revision for a scope, full detail — used by
   * draft creation (copy-on-write from the live config) and by enable/disable
   * (which act on "the live revision", not a specific id).
   */
  async findPublishedRevision(
    scope: string = ROUTER_CONFIGURATION_GLOBAL_SCOPE,
  ): Promise<RouterConfigurationDetail | null> {
    this.logger.debug(`findPublishedRevision: scope=${scope}`);
    const row = await this.prisma.routerConfiguration.findFirst({
      where: { scope, status: RouterConfigurationStatus.PUBLISHED },
      include: { entries: true },
    });
    return row ? mapConfigurationDetail(row) : null;
  }

  /**
   * Creates a new DRAFT revision for a scope.
   *
   * Copy-on-write: when a PUBLISHED revision exists for the scope, the draft
   * starts as a copy of its config fields and entries, so an admin edits a
   * working copy of what is live rather than rebuilding from scratch. With no
   * PUBLISHED revision yet, the draft starts empty at schema defaults — the
   * bootstrap case.
   *
   * The revision number is `max(revision for scope) + 1`, computed inside the
   * same transaction as the insert; a genuine concurrent-create race loses to
   * the (scope, revision) unique constraint rather than silently colliding —
   * acceptable for an admin-only, low-concurrency path.
   */
  async createDraft(scope: string): Promise<RouterConfigurationDetail> {
    this.logger.debug(`createDraft: scope=${scope}`);

    return this.prisma.$transaction(async (transaction) => {
      const [latest, source] = await Promise.all([
        transaction.routerConfiguration.findFirst({
          where: { scope },
          orderBy: { revision: 'desc' },
          select: { revision: true },
        }),
        transaction.routerConfiguration.findFirst({
          where: { scope, status: RouterConfigurationStatus.PUBLISHED },
          include: { entries: true },
        }),
      ]);

      const configuration = await transaction.routerConfiguration.create({
        data: {
          scope,
          revision: (latest?.revision ?? 0) + 1,
          status: RouterConfigurationStatus.DRAFT,
          mode: source?.mode,
          enabled: source?.enabled,
          totalDeadlineMs: source?.totalDeadlineMs,
          maxAttempts: source?.maxAttempts,
          maxRouterInputTokens: source?.maxRouterInputTokens,
          maxRouterOutputTokens: source?.maxRouterOutputTokens,
          minConfidence: source ? new Prisma.Decimal(source.minConfidence) : undefined,
          lowConfidenceAction: source?.lowConfidenceAction,
          failClosedWhenNoEligibleRouter: source?.failClosedWhenNoEligibleRouter,
          skipProviderOnProviderWideFailure: source?.skipProviderOnProviderWideFailure,
          safeTraceLevel: source?.safeTraceLevel,
          legacyLocalRollbackEnabled: source?.legacyLocalRollbackEnabled,
        },
      });

      if (source) {
        for (const entry of source.entries) {
          await transaction.routerChainEntry.create({
            data: {
              configurationId: configuration.id,
              order: entry.order,
              enabled: entry.enabled,
              role: entry.role,
              deploymentId: entry.deploymentId,
              modelAlias: entry.modelAlias,
              provider: entry.provider,
              attemptTimeoutMs: entry.attemptTimeoutMs,
              retries: entry.retries,
              triggers: [...entry.triggers],
              skipWhenProviderCircuitOpen: entry.skipWhenProviderCircuitOpen,
              minConfidence: entry.minConfidence,
              maxCostMicroUsd: entry.maxCostMicroUsd,
              billingModel: entry.billingModel,
            },
          });
        }
      }

      const created = await transaction.routerConfiguration.findUniqueOrThrow({
        where: { id: configuration.id },
        include: { entries: true },
      });
      return mapConfigurationDetail(created);
    });
  }

  /**
   * Declaratively replaces a configuration's chain entries: existing rows are
   * all removed and the given list is recreated in order, so add, remove, and
   * reorder are one call instead of three. Array position (1-based) becomes
   * `order`.
   *
   * Delete-then-recreate (rather than diff-and-patch) sidesteps a transient
   * collision with the (configurationId, order) unique constraint that an
   * in-place reorder would risk on a swap — e.g. entry 1 and entry 2 trading
   * places both target the other's current `order` mid-update.
   */
  async replaceEntries(
    configurationId: string,
    entries: readonly ChainEntryInput[],
  ): Promise<RouterConfigurationDetail | null> {
    this.logger.debug(`replaceEntries: configurationId=${configurationId} count=${entries.length}`);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.routerChainEntry.deleteMany({ where: { configurationId } });

      let order = 1;
      for (const entry of entries) {
        await transaction.routerChainEntry.create({
          data: {
            configurationId,
            order,
            enabled: entry.enabled,
            role: entry.role,
            deploymentId: entry.deploymentId ?? null,
            modelAlias: entry.modelAlias,
            provider: entry.provider,
            attemptTimeoutMs: entry.attemptTimeoutMs,
            retries: entry.retries,
            triggers: [...entry.triggers],
            skipWhenProviderCircuitOpen: entry.skipWhenProviderCircuitOpen,
            minConfidence:
              entry.minConfidence === undefined ? null : new Prisma.Decimal(entry.minConfidence),
            maxCostMicroUsd:
              entry.maxCostMicroUsd === undefined ? null : BigInt(entry.maxCostMicroUsd),
            billingModel: entry.billingModel,
          },
        });
        order += 1;
      }

      const updated = await transaction.routerConfiguration.findUnique({
        where: { id: configurationId },
        include: { entries: true },
      });
      return updated ? mapConfigurationDetail(updated) : null;
    });
  }

  /**
   * Publishes a DRAFT revision, respecting "one PUBLISHED per scope": any
   * revision currently PUBLISHED for the same scope is marked SUPERSEDED in
   * the same transaction, so there is never a window with two PUBLISHED rows
   * for the partial unique index to reject, and never a window with zero —
   * the supersede and the publish commit together.
   *
   * Returns null if `id` does not exist or is not currently DRAFT. The
   * service is expected to have already validated status for a clean error
   * message; this is the atomic re-check under the transaction, guarding the
   * genuine race where status changed between the service's check and this
   * call.
   */
  async publish(id: string, publishedBy: string): Promise<RouterConfigurationDetail | null> {
    this.logger.debug(`publish: id=${id} publishedBy=${publishedBy}`);

    return this.prisma.$transaction(async (transaction) => {
      const target = await transaction.routerConfiguration.findUnique({ where: { id } });
      if (target?.status !== RouterConfigurationStatus.DRAFT) {
        return null;
      }

      const currentlyPublished = await transaction.routerConfiguration.findFirst({
        where: { scope: target.scope, status: RouterConfigurationStatus.PUBLISHED },
      });

      if (currentlyPublished) {
        await transaction.routerConfiguration.update({
          where: { id: currentlyPublished.id },
          data: { status: RouterConfigurationStatus.SUPERSEDED },
        });
      }

      const published = await transaction.routerConfiguration.update({
        where: { id },
        data: {
          status: RouterConfigurationStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedBy,
          supersedesRevision: currentlyPublished?.revision ?? null,
        },
        include: { entries: true },
      });

      return mapConfigurationDetail(published);
    });
  }

  /**
   * Flips `enabled` on the currently PUBLISHED revision for a scope — the
   * write side of the switch `CloudRouterManager` reads via
   * `snapshot.enabled`. Publish status and `enabled` are independent axes on
   * purpose (seeding writes PUBLISHED + enabled:false so a seeded chain never
   * goes live by itself); this only ever touches the latter. Returns null
   * when no revision is currently PUBLISHED for the scope.
   */
  async setEnabled(scope: string, enabled: boolean): Promise<RouterConfigurationDetail | null> {
    this.logger.debug(`setEnabled: scope=${scope} enabled=${String(enabled)}`);

    return this.prisma.$transaction(async (transaction) => {
      const published = await transaction.routerConfiguration.findFirst({
        where: { scope, status: RouterConfigurationStatus.PUBLISHED },
      });
      if (!published) {
        return null;
      }

      const updated = await transaction.routerConfiguration.update({
        where: { id: published.id },
        data: { enabled },
        include: { entries: true },
      });
      return mapConfigurationDetail(updated);
    });
  }
}
