import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import { ConnectorAccessSource } from '../enums/connector-access-source.enum';
import { ConnectorAction } from '../enums/connector-action.enum';
import { ConnectorGrantRepository } from '../repositories/connector-grant.repository';
import {
  WorkspaceConnectorAccessLevel,
  type WorkspaceConnectorGrant,
} from '../../../generated/prisma';
import type {
  ConnectorEffectiveAccess,
  SharedConnectorView,
} from '../types/connector-access.types';

// v3 round 5 (2026-05-12) — Prompt 12 polish: per-connector RBAC service.
// Single source of truth for "can user X do thing Y on connector Z?"
// All workspace-action / approval-queue / sync paths should call into
// this rather than re-implementing ad-hoc owner checks.
@Injectable()
export class ConnectorAccessService {
  private readonly logger = new Logger(ConnectorAccessService.name);

  constructor(
    private readonly connectorRepo: WorkspaceConnectorRepository,
    private readonly grantRepo: ConnectorGrantRepository,
  ) {}

  async resolve(userId: string, connectorId: string): Promise<ConnectorEffectiveAccess> {
    const connector = await this.connectorRepo.findById(connectorId);
    if (connector === null) return { source: ConnectorAccessSource.NONE, level: null };
    if (connector.userId === userId) {
      return {
        source: ConnectorAccessSource.OWNER,
        level: WorkspaceConnectorAccessLevel.FULL,
      };
    }
    const grant = await this.grantRepo.findForUserConnector(userId, connectorId);
    if (grant === null) return { source: ConnectorAccessSource.NONE, level: null };
    return { source: ConnectorAccessSource.GRANT, level: grant.accessLevel };
  }

  async can(userId: string, connectorId: string, action: ConnectorAction): Promise<boolean> {
    const effective = await this.resolve(userId, connectorId);
    if (effective.source === ConnectorAccessSource.NONE) return false;
    return this.actionAllowed(effective, action);
  }

  // Pure function — exposed for unit testing the action ↔ level matrix
  // independent of DB state.
  actionAllowed(effective: ConnectorEffectiveAccess, action: ConnectorAction): boolean {
    if (effective.source === ConnectorAccessSource.NONE || effective.level === null) return false;
    if (action === ConnectorAction.MANAGE_GRANTS) {
      return effective.source === ConnectorAccessSource.OWNER;
    }
    if (effective.source === ConnectorAccessSource.OWNER) return true;
    const lvl = effective.level;
    if (action === ConnectorAction.VIEW) {
      return (
        lvl === WorkspaceConnectorAccessLevel.READ_ONLY ||
        lvl === WorkspaceConnectorAccessLevel.AI_ACTIONS ||
        lvl === WorkspaceConnectorAccessLevel.FULL
      );
    }
    if (action === ConnectorAction.PROPOSE_AI_ACTION) {
      return (
        lvl === WorkspaceConnectorAccessLevel.AI_ACTIONS ||
        lvl === WorkspaceConnectorAccessLevel.FULL
      );
    }
    if (action === ConnectorAction.EDIT_CONFIG) {
      return lvl === WorkspaceConnectorAccessLevel.FULL;
    }
    return false;
  }

  // v3 round 6 — throws ForbiddenException when the caller can't even
  // VIEW the connector, otherwise returns the grant list. Encapsulates
  // the access check so the controller stays throw-free.
  async listGrantsAsViewer(
    userId: string,
    connectorId: string,
  ): Promise<WorkspaceConnectorGrant[]> {
    const canView = await this.can(userId, connectorId, ConnectorAction.VIEW);
    if (!canView) {
      throw new ForbiddenException({ messageKey: 'CONNECTOR_ACCESS_DENIED' });
    }
    return this.grantRepo.listForConnector(connectorId);
  }

  async grant(
    connectorId: string,
    granteeUserId: string,
    grantedBy: string,
    level: WorkspaceConnectorAccessLevel,
  ): Promise<WorkspaceConnectorGrant> {
    const owned = await this.can(grantedBy, connectorId, ConnectorAction.MANAGE_GRANTS);
    if (!owned) {
      throw new ForbiddenException({ messageKey: 'CONNECTOR_GRANT_FORBIDDEN' });
    }
    this.logger.log(
      `grant: connector=${connectorId} grantee=${granteeUserId} level=${level} by=${grantedBy}`,
    );
    return this.grantRepo.upsert(connectorId, granteeUserId, grantedBy, level);
  }

  async revoke(connectorId: string, granteeUserId: string, revokedBy: string): Promise<void> {
    const owned = await this.can(revokedBy, connectorId, ConnectorAction.MANAGE_GRANTS);
    if (!owned) {
      throw new ForbiddenException({ messageKey: 'CONNECTOR_GRANT_FORBIDDEN' });
    }
    this.logger.log(`revoke: connector=${connectorId} grantee=${granteeUserId} by=${revokedBy}`);
    // Post-pack hardening — snapshot the grant before the hard delete so
    // revocation survives it, rather than only the ephemeral log line
    // above. Skipped when there's nothing to revoke (already-gone grant),
    // matching deleteOne's existing silent-no-op behavior.
    const existing = await this.grantRepo.findForUserConnector(granteeUserId, connectorId);
    if (existing !== null) {
      await this.grantRepo.recordRevocation(existing, revokedBy);
    }
    await this.grantRepo.deleteOne(connectorId, granteeUserId);
  }

  // Phase 12 — the grantee-side counterpart to listGrantsAsViewer (which
  // lists a connector's grants for its owner). ConnectorGrantRepository
  // .listForUser existed and was called from nowhere; this is its first
  // real caller. A grant referencing a since-deleted connector is skipped
  // rather than surfaced as a broken row.
  async listSharedWithMe(userId: string): Promise<SharedConnectorView[]> {
    const grants = await this.grantRepo.listForUser(userId);
    if (grants.length === 0) return [];
    const connectors = await this.connectorRepo.findManyByIds(grants.map((g) => g.connectorId));
    const connectorById = new Map(connectors.map((c) => [c.id, c]));
    const views: SharedConnectorView[] = [];
    for (const grant of grants) {
      const connector = connectorById.get(grant.connectorId);
      if (connector === undefined) continue;
      views.push({
        connectorId: connector.id,
        connectorName: connector.name,
        provider: connector.provider,
        ownerUserId: connector.userId,
        accessLevel: grant.accessLevel,
        grantedBy: grant.grantedBy,
        grantedAt: grant.createdAt,
      });
    }
    return views;
  }
}
