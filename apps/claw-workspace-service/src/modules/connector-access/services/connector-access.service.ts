import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import { ConnectorAccessSource } from '../enums/connector-access-source.enum';
import { ConnectorAction } from '../enums/connector-action.enum';
import { ConnectorGrantRepository } from '../repositories/connector-grant.repository';
import {
  WorkspaceConnectorAccessLevel,
  type WorkspaceConnectorGrant,
} from '../../../generated/prisma';
import type { ConnectorEffectiveAccess } from '../types/connector-access.types';

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
    await this.grantRepo.deleteOne(connectorId, granteeUserId);
  }
}
