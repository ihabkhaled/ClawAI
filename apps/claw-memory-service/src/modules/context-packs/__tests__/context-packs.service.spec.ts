import {
  type ContextPack,
  ContextPackItemType,
  ContextPackScope,
  ContextPackVisibility,
} from '../../../generated/prisma';
import { ContextPacksService } from '../services/context-packs.service';
import { type ContextPacksRepository } from '../repositories/context-packs.repository';

function makeStub<T extends object>(): T {
  const cache: Record<string | symbol, jest.Mock> = {};
  return new Proxy({} as T, {
    get: (_target, prop) => {
      if (!cache[prop]) {
        cache[prop] = jest.fn();
      }
      return cache[prop];
    },
  });
}

function buildPack(overrides: Partial<ContextPack> = {}): ContextPack {
  return {
    id: 'pack-1',
    userId: 'user-1',
    name: 'Demo pack',
    description: null,
    scope: ContextPackScope.USER,
    scopeRef: null,
    legacyScope: null,
    tags: [],
    visibility: ContextPackVisibility.PRIVATE,
    isEnabled: true,
    pausedUntil: null,
    pinned: false,
    color: null,
    icon: null,
    version: 1,
    templateId: null,
    ownerUserId: 'user-1',
    useCount: 0,
    lastUsedAt: null,
    qualityScore: 0.5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ContextPacksService (V2)', () => {
  it('createContextPack passes the new V2 fields through to the repository', async () => {
    const repo = makeStub<ContextPacksRepository>();
    const rabbit = { publish: jest.fn(), subscribe: jest.fn() };
    const created = buildPack({ name: 'Engineering' });
    (repo.create as unknown as jest.Mock).mockResolvedValue(created);

    const service = new ContextPacksService(
      repo,
      rabbit as unknown as ConstructorParameters<typeof ContextPacksService>[1],
      makeStub(),
    );

    const pack = await service.createContextPack('user-1', {
      name: 'Engineering',
      description: 'Style guide',
      scope: ContextPackScope.WORKSPACE,
      scopeRef: 'workspace-9',
      tags: ['eng'],
      visibility: ContextPackVisibility.WORKSPACE,
    });

    expect(pack).toEqual(created);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        ownerUserId: 'user-1',
        scope: ContextPackScope.WORKSPACE,
        scopeRef: 'workspace-9',
        visibility: ContextPackVisibility.WORKSPACE,
      }),
    );
  });

  it('resolves a legacy free-text item.type to a V2 enum', async () => {
    const repo = makeStub<ContextPacksRepository>();
    const rabbit = { publish: jest.fn(), subscribe: jest.fn() };
    (repo.findById as unknown as jest.Mock).mockResolvedValue({
      ...buildPack(),
      items: [],
    });
    (repo.addItem as unknown as jest.Mock).mockImplementation(async (input) => ({
      id: 'item-1',
      contextPackId: input.contextPackId,
      itemType: input.itemType,
      legacyType: input.legacyType ?? null,
      content: input.content ?? null,
      fileId: input.fileId ?? null,
      url: input.url ?? null,
      memoryRefId: input.memoryRefId ?? null,
      sortOrder: input.sortOrder ?? 0,
      isEnabled: true,
      pinned: false,
      tokenCountEstimate: input.tokenCountEstimate ?? 0,
      compressedSummary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const service = new ContextPacksService(
      repo,
      rabbit as unknown as ConstructorParameters<typeof ContextPacksService>[1],
      makeStub(),
    );

    const item = await service.addItem('pack-1', 'user-1', {
      type: 'snippet',
      content: 'console.log("x")',
    });

    expect(item.itemType).toBe(ContextPackItemType.SNIPPET);
    expect(item.legacyType).toBe('snippet');
  });
});
