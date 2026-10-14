import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { ServerState } from '../../../../common/enums/server-status.enum';
import { McpServerSecretsRepository } from '../mcp-server-secrets.repository';
import { McpServersRepository } from '../mcp-servers.repository';

const NOW = new Date('2026-10-14T08:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'srv-1',
    ownerUserId: 'user-1',
    slug: 'mcpabcdef123456',
    name: 'Tracker',
    url: 'https://mcp.example.com/mcp',
    urlHost: 'mcp.example.com',
    authKind: 'API_KEY',
    status: 'APPROVED',
    serverInfo: { name: 'T', version: '1' },
    toolsHash: 'hash',
    lastCheckedAt: NOW,
    lastErrorCode: null,
    failureCount: 1,
    breakerOpenedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    credential: { kind: 'API_KEY', updatedAt: NOW },
    tools: [
      {
        name: 'create_issue',
        localName: 'create_issue',
        description: 'd',
        inputSchema: { type: 'object' },
        schemaHash: 'h',
        riskLevel: 'WRITE',
        enabled: true,
        consentGranted: false,
      },
    ],
    ...overrides,
  };
}

function build() {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    mcpServer: {
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    mcpServerTool: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    $transaction: vi
      .fn()
      .mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx)),
    $executeRaw: vi.fn().mockResolvedValue(1),
    mcpServer: {
      findFirst: vi.fn().mockResolvedValue(row()),
      findMany: vi.fn().mockResolvedValue([row()]),
      count: vi.fn().mockResolvedValue(2),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    mcpServerTool: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  return { repository: new McpServersRepository(prisma as never), prisma, tx };
}

const CREATE = {
  id: 'srv-1',
  ownerUserId: 'user-1',
  slug: 'mcpabcdef123456',
  name: 'Tracker',
  url: 'https://mcp.example.com/mcp',
  urlHost: 'mcp.example.com',
  authKind: AuthKind.API_KEY,
  status: ServerState.APPROVED,
  serverInfo: { name: 'T', version: '1' },
  toolsHash: 'hash',
  tools: [
    {
      name: 'create_issue',
      localName: 'create_issue',
      description: 'd',
      inputSchema: { type: 'object' },
      schemaHash: 'h',
    },
  ],
  credential: {
    kind: AuthKind.API_KEY,
    headerName: 'X-API-Key',
    ciphertext: 'sealed',
    keyVersion: 1,
  },
};

describe('McpServersRepository', () => {
  it('finds a server only for its owner and maps the enums', async () => {
    const { repository, prisma } = build();

    const record = await repository.findOwned('srv-1', 'user-1');

    expect(prisma.mcpServer.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'srv-1', ownerUserId: 'user-1' },
    });
    expect(record).toMatchObject({ authKind: AuthKind.API_KEY, status: ServerState.APPROVED });
    expect(record?.tools[0]?.riskLevel).toBe(RiskLevel.WRITE);
    expect(record?.credential).toEqual({ kind: AuthKind.API_KEY, updatedAt: NOW });
  });

  it('never selects a credential ciphertext', async () => {
    const { repository, prisma } = build();

    await repository.findOwned('srv-1', 'user-1');
    await repository.findAllOwned('user-1', 10);

    for (const call of [
      prisma.mcpServer.findFirst.mock.calls[0],
      prisma.mcpServer.findMany.mock.calls[0],
    ]) {
      expect(JSON.stringify(call?.[0])).not.toContain('ciphertext');
    }
  });

  it('answers null for a server that is not the owner', async () => {
    const { repository, prisma } = build();
    prisma.mcpServer.findFirst.mockResolvedValue(null);

    expect(await repository.findOwned('srv-1', 'intruder')).toBeNull();
  });

  it('lists the owner servers newest first with a cap, and counts them', async () => {
    const { repository, prisma } = build();

    await repository.findAllOwned('user-1', 100);

    expect(prisma.mcpServer.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { ownerUserId: 'user-1' },
      take: 100,
    });
    expect(await repository.countOwned('user-1')).toBe(2);
  });

  describe('createWithinCap', () => {
    it('takes the per-user advisory lock, then creates the server with its tools and credential', async () => {
      const { repository, tx } = build();

      const outcome = await repository.createWithinCap(CREATE, 3);

      expect(outcome).toEqual({ kind: 'CREATED' });
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      const data = (tx.mcpServer.create.mock.calls[0]?.[0] as { data: Record<string, unknown> })
        .data;
      expect(data).toMatchObject({
        ownerUserId: 'user-1',
        slug: 'mcpabcdef123456',
        status: 'APPROVED',
      });
      expect((data['tools'] as { create: unknown[] }).create).toHaveLength(1);
      expect(data['credential']).toEqual({
        create: {
          userId: 'user-1',
          kind: AuthKind.API_KEY,
          headerName: 'X-API-Key',
          ciphertext: 'sealed',
          keyVersion: 1,
        },
      });
    });

    it('creates a server without a credential', async () => {
      const { repository, tx } = build();

      await repository.createWithinCap(
        { ...CREATE, credential: undefined, authKind: AuthKind.NONE },
        null,
      );

      expect(
        (tx.mcpServer.create.mock.calls[0]?.[0] as { data: { credential: unknown } }).data
          .credential,
      ).toBeUndefined();
    });

    it('reports a duplicate URL without creating', async () => {
      const { repository, tx } = build();
      tx.mcpServer.findUnique.mockResolvedValue({ id: 'other' });

      expect(await repository.createWithinCap(CREATE, 3)).toEqual({ kind: 'DUPLICATE' });
      expect(tx.mcpServer.create).not.toHaveBeenCalled();
    });

    it.each([
      [0, 0],
      [3, 3],
      [3, 7],
    ])('stops at the cap %i when the user already has %i', async (cap, current) => {
      const { repository, tx } = build();
      tx.mcpServer.count.mockResolvedValue(current);

      expect(await repository.createWithinCap(CREATE, cap)).toEqual({ kind: 'LIMIT', current });
      expect(tx.mcpServer.create).not.toHaveBeenCalled();
    });

    it('treats a null cap as unlimited', async () => {
      const { repository, tx } = build();
      tx.mcpServer.count.mockResolvedValue(10_000);

      expect(await repository.createWithinCap(CREATE, null)).toEqual({ kind: 'CREATED' });
    });
  });

  it('updates and deletes only through the owner id', async () => {
    const { repository, prisma } = build();

    expect(await repository.updateOwned('srv-1', 'user-1', { name: 'New' })).toBe(true);
    expect(await repository.updateTool('srv-1', 'user-1', 'create_issue', { enabled: false })).toBe(
      true,
    );
    expect(await repository.deleteOwned('srv-1', 'user-1')).toBe(true);

    expect(prisma.mcpServer.updateMany).toHaveBeenCalledWith({
      where: { id: 'srv-1', ownerUserId: 'user-1' },
      data: { name: 'New' },
    });
    expect(prisma.mcpServerTool.updateMany).toHaveBeenCalledWith({
      where: { serverId: 'srv-1', localName: 'create_issue', server: { ownerUserId: 'user-1' } },
      data: { enabled: false },
    });
    expect(prisma.mcpServer.deleteMany).toHaveBeenCalledWith({
      where: { id: 'srv-1', ownerUserId: 'user-1' },
    });
  });

  it('reports nothing changed for a server that is not the owner', async () => {
    const { repository, prisma } = build();
    prisma.mcpServer.updateMany.mockResolvedValue({ count: 0 });
    prisma.mcpServer.deleteMany.mockResolvedValue({ count: 0 });
    prisma.mcpServerTool.updateMany.mockResolvedValue({ count: 0 });

    expect(await repository.updateOwned('srv-1', 'intruder', { name: 'x' })).toBe(false);
    expect(await repository.updateTool('srv-1', 'intruder', 'a', { enabled: true })).toBe(false);
    expect(await repository.deleteOwned('srv-1', 'intruder')).toBe(false);
  });

  describe('replaceSnapshot', () => {
    const write = {
      toolsHash: 'new-hash',
      serverInfo: null,
      status: ServerState.NEEDS_REVIEW,
      tools: [
        {
          name: 'a',
          localName: 'a',
          description: 'd',
          inputSchema: {},
          schemaHash: 'h',
          riskLevel: RiskLevel.WRITE,
          enabled: true,
          consentGranted: false,
        },
      ],
    };

    it('replaces the tools in one transaction for the owner', async () => {
      const { repository, tx } = build();

      expect(await repository.replaceSnapshot('srv-1', 'user-1', write)).toBe(true);

      expect(tx.mcpServer.updateMany.mock.calls[0]?.[0]).toMatchObject({
        where: { id: 'srv-1', ownerUserId: 'user-1' },
        data: { toolsHash: 'new-hash', status: 'NEEDS_REVIEW', lastErrorCode: null },
      });
      expect(tx.mcpServerTool.deleteMany).toHaveBeenCalledWith({ where: { serverId: 'srv-1' } });
      expect(tx.mcpServerTool.createMany).toHaveBeenCalledTimes(1);
    });

    it('touches no tool when the server is not the owner', async () => {
      const { repository, tx } = build();
      tx.mcpServer.updateMany.mockResolvedValue({ count: 0 });

      expect(await repository.replaceSnapshot('srv-1', 'intruder', write)).toBe(false);
      expect(tx.mcpServerTool.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('circuit breaker state', () => {
    it('closes on success', async () => {
      const { repository, prisma } = build();

      await repository.recordSuccess('srv-1');

      expect(prisma.mcpServer.updateMany.mock.calls[0]?.[0]).toMatchObject({
        where: { id: 'srv-1' },
        data: { failureCount: 0, breakerOpenedAt: null, lastErrorCode: null },
      });
    });

    it('counts a failure and opens at the threshold in one statement', async () => {
      const { repository, prisma } = build();

      await repository.recordFailure('srv-1', 'PLUGIN_TOOL_FAILED', 5);

      const [strings, ...values] = prisma.$executeRaw.mock.calls[0] as [string[], ...unknown[]];
      expect(strings.join('?')).toContain('failure_count = failure_count + 1');
      expect(strings.join('?')).toContain('CASE WHEN failure_count + 1 >=');
      expect(values).toEqual(['PLUGIN_TOOL_FAILED', 5, 'srv-1']);
    });

    it('lets one caller take the half-open probe', async () => {
      const { repository, prisma } = build();
      const opened = new Date('2026-10-14T07:59:00.000Z');

      expect(await repository.claimProbe('srv-1', opened)).toBe(true);
      expect(prisma.mcpServer.updateMany.mock.calls[0]?.[0]).toMatchObject({
        where: { id: 'srv-1', breakerOpenedAt: opened },
      });

      prisma.mcpServer.updateMany.mockResolvedValue({ count: 0 });
      expect(await repository.claimProbe('srv-1', opened)).toBe(false);
    });

    it('notes a check with a uniform error code, scoped to the owner', async () => {
      const { repository, prisma } = build();

      await repository.markChecked('srv-1', 'user-1', 'MCP_SERVER_UNREACHABLE');

      expect(prisma.mcpServer.updateMany.mock.calls[0]?.[0]).toMatchObject({
        where: { id: 'srv-1', ownerUserId: 'user-1' },
        data: { lastErrorCode: 'MCP_SERVER_UNREACHABLE' },
      });
    });
  });
});

describe('McpServerSecretsRepository', () => {
  const sealed = {
    kind: AuthKind.API_KEY,
    headerName: 'X-API-Key',
    ciphertext: 'sealed',
    keyVersion: 1,
  };

  it('stores the sealed secret and returns only the time', async () => {
    const prisma = {
      mcpServerCredential: { upsert: vi.fn().mockResolvedValue({ updatedAt: NOW }) },
    };

    expect(
      await new McpServerSecretsRepository(prisma as never).save('user-1', 'srv-1', sealed),
    ).toBe(NOW);

    expect(prisma.mcpServerCredential.upsert).toHaveBeenCalledWith({
      where: { serverId: 'srv-1' },
      create: { userId: 'user-1', serverId: 'srv-1', ...sealed },
      update: sealed,
      select: { updatedAt: true },
    });
  });

  it('reads the sealed secret only for the owner and deletes only the owner row', async () => {
    const prisma = {
      mcpServerCredential: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ kind: 'API_KEY', headerName: 'X-API-Key', ciphertext: 'sealed' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new McpServerSecretsRepository(prisma as never);

    expect(await repository.findSealed('user-1', 'srv-1')).toEqual({
      kind: AuthKind.API_KEY,
      headerName: 'X-API-Key',
      ciphertext: 'sealed',
    });
    expect(await repository.delete('user-1', 'srv-1')).toBe(true);

    expect(prisma.mcpServerCredential.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { serverId: 'srv-1', userId: 'user-1' },
    });
    expect(prisma.mcpServerCredential.deleteMany).toHaveBeenCalledWith({
      where: { serverId: 'srv-1', userId: 'user-1' },
    });
  });

  it('answers null when there is no credential for that owner', async () => {
    const prisma = { mcpServerCredential: { findFirst: vi.fn().mockResolvedValue(null) } };

    expect(
      await new McpServerSecretsRepository(prisma as never).findSealed('intruder', 'srv-1'),
    ).toBeNull();
  });
});
