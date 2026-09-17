import { Injectable, Logger } from '@nestjs/common';
import { type WorkspaceProvider } from '@claw/shared-types';

import { ConnectorAction } from '../../connector-access/enums/connector-action.enum';
import { ConnectorAccessService } from '../../connector-access/services/connector-access.service';
import { WorkspaceMentionRefusal } from '../enums/workspace-mention-refusal.enum';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';
import {
  type RefusedWorkspaceMention,
  type ResolvedWorkspaceMention,
  type WorkspaceMentionResolution,
} from '../types/workspace-mention.types';
import { parseWorkspaceMentions } from '../utilities/workspace-mention.utility';

/**
 * Turns `@github` in a message into a connector the user is allowed to act on.
 *
 * The whole point of this class is that a mention is a REQUEST, never a grant.
 * Typing `@github` says what the user wants; it says nothing about whether they
 * have GitHub connected or whether they may act on it. Both are answered
 * against the database:
 *
 *   1. The connector must belong to this user, be CONNECTED and be enabled.
 *      The userId is part of the query's WHERE clause, so a mention cannot
 *      reach someone else's connector even if the id were somehow known.
 *   2. The user must pass ConnectorAccessService.can(PROPOSE_AI_ACTION). A
 *      connector shared read-only can be seen and cannot be acted on.
 *
 * Refusals are returned, not swallowed. "Not connected" and "not authorised"
 * have different fixes — one is the user's settings, the other is the owner's
 * grant — and a feature that silently does nothing in both cases is one nobody
 * can debug.
 */
@Injectable()
export class WorkspaceMentionService {
  private readonly logger = new Logger(WorkspaceMentionService.name);

  constructor(
    private readonly connectors: WorkspaceConnectorRepository,
    private readonly access: ConnectorAccessService,
  ) {}

  async resolveForMessage(userId: string, message: string): Promise<WorkspaceMentionResolution> {
    const mentioned = parseWorkspaceMentions(message);
    if (mentioned.length === 0) {
      return { resolved: [], refused: [] };
    }

    const usable = await this.connectors.findUsableByUserAndProviders(userId, mentioned);
    const byProvider = new Map<string, (typeof usable)[number]>();
    for (const connector of usable) {
      if (!byProvider.has(connector.provider)) {
        byProvider.set(connector.provider, connector);
      }
    }

    const resolved: ResolvedWorkspaceMention[] = [];
    const refused: RefusedWorkspaceMention[] = [];
    for (const provider of mentioned) {
      const connector = byProvider.get(provider);
      if (connector === undefined) {
        refused.push({ provider, reason: WorkspaceMentionRefusal.NOT_CONNECTED });
        continue;
      }
      const permitted = await this.access.can(
        userId,
        connector.id,
        ConnectorAction.PROPOSE_AI_ACTION,
      );
      if (!permitted) {
        refused.push({ provider, reason: WorkspaceMentionRefusal.NOT_AUTHORIZED });
        continue;
      }
      resolved.push({
        provider: provider as WorkspaceProvider,
        connectorId: connector.id,
        displayName: connector.name,
      });
    }

    this.logger.debug(
      `resolveForMessage: user=${userId} mentioned=${mentioned.length} resolved=${resolved.length} refused=${refused.length}`,
    );
    return { resolved, refused };
  }
}
