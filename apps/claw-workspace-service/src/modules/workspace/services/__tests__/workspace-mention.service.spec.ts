import { WorkspaceProvider } from '@claw/shared-types';

import { type ConnectorAccessService } from '../../../connector-access/services/connector-access.service';
import { WorkspaceMentionRefusal } from '../../enums/workspace-mention-refusal.enum';
import { type WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import { WorkspaceMentionService } from '../workspace-mention.service';

/**
 * A mention is a REQUEST, never a grant. These tests are mostly about what the
 * resolver refuses to hand back.
 */
type Row = { id: string; provider: string; name: string };

function serviceWith(options: {
  connectors?: Row[];
  permitted?: boolean;
  onQuery?: (userId: string, providers: readonly WorkspaceProvider[]) => void;
}): WorkspaceMentionService {
  const repo = {
    findUsableByUserAndProviders: async (
      userId: string,
      providers: readonly WorkspaceProvider[],
    ) => {
      options.onQuery?.(userId, providers);
      return Promise.resolve(options.connectors ?? []);
    },
  } as unknown as WorkspaceConnectorRepository;
  const access = {
    can: async () => Promise.resolve(options.permitted ?? true),
  } as unknown as ConnectorAccessService;
  return new WorkspaceMentionService(repo, access);
}

const CONNECTED_GITHUB: Row = { id: 'c1', provider: 'GITHUB', name: 'My GitHub' };

describe('WorkspaceMentionService', () => {
  it('resolves a mention the user has connected and may act on', async () => {
    const service = serviceWith({ connectors: [CONNECTED_GITHUB], permitted: true });

    const result = await service.resolveForMessage('user-1', '@github open a PR');

    expect(result.resolved).toEqual([
      { provider: WorkspaceProvider.GITHUB, connectorId: 'c1', displayName: 'My GitHub' },
    ]);
    expect(result.refused).toEqual([]);
  });

  it('refuses a provider the user has not connected, and says so', async () => {
    // Silently doing nothing here is how a feature becomes unexplainable.
    const service = serviceWith({ connectors: [] });

    const result = await service.resolveForMessage('user-1', '@jira file a ticket');

    expect(result.resolved).toEqual([]);
    expect(result.refused).toEqual([
      { provider: WorkspaceProvider.JIRA, reason: WorkspaceMentionRefusal.NOT_CONNECTED },
    ]);
  });

  it('refuses a connected connector the user may not act on', async () => {
    // A connector shared read-only can be seen and must not be acted on.
    const service = serviceWith({ connectors: [CONNECTED_GITHUB], permitted: false });

    const result = await service.resolveForMessage('user-1', '@github open a PR');

    expect(result.resolved).toEqual([]);
    expect(result.refused).toEqual([
      { provider: WorkspaceProvider.GITHUB, reason: WorkspaceMentionRefusal.NOT_AUTHORIZED },
    ]);
  });

  it('separates "not connected" from "not authorised"', async () => {
    // Different problems, different fixes: one is the user's settings, the
    // other is the connector owner's grant.
    const notConnected = await serviceWith({ connectors: [] }).resolveForMessage(
      'user-1',
      '@github go',
    );
    const notAuthorized = await serviceWith({
      connectors: [CONNECTED_GITHUB],
      permitted: false,
    }).resolveForMessage('user-1', '@github go');

    expect(notConnected.refused[0]?.reason).toBe(WorkspaceMentionRefusal.NOT_CONNECTED);
    expect(notAuthorized.refused[0]?.reason).toBe(WorkspaceMentionRefusal.NOT_AUTHORIZED);
  });

  it('always scopes the connector lookup to the requesting user', async () => {
    // The mention must never be able to reach another user's connector.
    let seenUserId: string | null = null;
    const service = serviceWith({
      connectors: [CONNECTED_GITHUB],
      onQuery: (userId) => {
        seenUserId = userId;
      },
    });

    await service.resolveForMessage('user-42', '@github open a PR');

    expect(seenUserId).toBe('user-42');
  });

  it('does not touch the database when nothing was mentioned', async () => {
    let queried = false;
    const service = serviceWith({
      onQuery: () => {
        queried = true;
      },
    });

    const result = await service.resolveForMessage('user-1', 'explain how promises work');

    expect(result).toEqual({ resolved: [], refused: [] });
    expect(queried).toBe(false);
  });
});
