import { WorkspaceObjectType } from '../../../../common/enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import type { WorkspaceEventRepository } from '../../repositories/workspace-event.repository';
import type { SyncedObjectLike } from '../../types/workspace-event.types';
import { WorkspaceSyncEventBridgeService } from '../workspace-sync-event-bridge.service';

function fakeRepo(): { repo: WorkspaceEventRepository; keys: Set<string> } {
  const keys = new Set<string>();
  const repo = {
    createIfNew: jest.fn(async (input: { idempotencyKey: string }) => {
      if (keys.has(input.idempotencyKey)) {
        return { created: false, event: {} };
      }
      keys.add(input.idempotencyKey);
      return { created: true, event: {} };
    }),
  } as unknown as WorkspaceEventRepository;
  return { repo, keys };
}

const document: SyncedObjectLike = {
  externalId: 'doc-1',
  type: WorkspaceObjectType.DOCUMENT,
  title: 'Doc',
  externalCreatedAt: new Date('2026-08-16T09:00:00Z'),
  externalUpdatedAt: new Date('2026-08-16T09:00:00Z'),
};

describe('WorkspaceSyncEventBridgeService', () => {
  it('no-ops entirely for a webhook-covered provider, to never duplicate what the webhook path already created', async () => {
    const { repo } = fakeRepo();
    const bridge = new WorkspaceSyncEventBridgeService(repo);

    const created = await bridge.bridge(WorkspaceProvider.GITHUB, 'connector-1', [document]);

    expect(created).toBe(0);
    expect(repo.createIfNew).not.toHaveBeenCalled();
  });

  it('bridges a synced object to a canonical event for a sync-only provider (e.g. Confluence)', async () => {
    const { repo } = fakeRepo();
    const bridge = new WorkspaceSyncEventBridgeService(repo);

    const created = await bridge.bridge(WorkspaceProvider.CONFLUENCE, 'connector-1', [document]);

    expect(created).toBe(1);
    expect(repo.createIfNew).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: WorkspaceProvider.CONFLUENCE,
        resourceExternalId: 'doc-1',
      }),
    );
  });

  it('re-syncing an unchanged object on the next poll tick does not create a duplicate event', async () => {
    const { repo } = fakeRepo();
    const bridge = new WorkspaceSyncEventBridgeService(repo);

    await bridge.bridge(WorkspaceProvider.CONFLUENCE, 'connector-1', [document]);
    const secondTick = await bridge.bridge(WorkspaceProvider.CONFLUENCE, 'connector-1', [document]);

    expect(secondTick).toBe(0); // nothing NEW created on the second, unchanged sync
    expect(repo.createIfNew).toHaveBeenCalledTimes(2); // still checked both times, idempotently
  });

  it('a real change (new externalUpdatedAt) on the next poll tick DOES create a new event', async () => {
    const { repo } = fakeRepo();
    const bridge = new WorkspaceSyncEventBridgeService(repo);

    await bridge.bridge(WorkspaceProvider.CONFLUENCE, 'connector-1', [document]);
    const changed: SyncedObjectLike = {
      ...document,
      externalUpdatedAt: new Date('2026-08-16T11:00:00Z'),
    };
    const secondTick = await bridge.bridge(WorkspaceProvider.CONFLUENCE, 'connector-1', [changed]);

    expect(secondTick).toBe(1);
  });

  it('skips objects with no canonical mapping (e.g. PROJECT) without throwing', async () => {
    const { repo } = fakeRepo();
    const bridge = new WorkspaceSyncEventBridgeService(repo);

    const created = await bridge.bridge(WorkspaceProvider.CLICKUP, 'connector-1', [
      { externalId: 'p1', type: WorkspaceObjectType.PROJECT, title: 'Project' },
    ]);

    expect(created).toBe(0);
    expect(repo.createIfNew).not.toHaveBeenCalled();
  });

  it('a repository failure for one object does not stop the rest of the batch', async () => {
    const repo = {
      createIfNew: jest
        .fn()
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce({ created: true, event: {} }),
    } as unknown as WorkspaceEventRepository;
    const bridge = new WorkspaceSyncEventBridgeService(repo);

    const created = await bridge.bridge(WorkspaceProvider.CONFLUENCE, 'connector-1', [
      document,
      { ...document, externalId: 'doc-2' },
    ]);

    expect(created).toBe(1);
    expect(repo.createIfNew).toHaveBeenCalledTimes(2);
  });
});
