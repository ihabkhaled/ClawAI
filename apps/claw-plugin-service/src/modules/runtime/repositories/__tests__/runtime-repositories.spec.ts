import { Logger } from '@nestjs/common';

import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../../common/enums/install-status.enum';
import { InvocationState } from '../../../../common/enums/invocation-status.enum';
import { InvokeOutcome } from '../../../../common/enums/invoke-outcome.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../../common/enums/runtime-kind.enum';
import { ServerState } from '../../../../common/enums/server-status.enum';
import { ConsentDecision } from '../../../../common/enums/consent-decision.enum';
import { InvocationAuditManager } from '../../managers/invocation-audit.manager';
import { InvocationAuditRepository } from '../invocation-audit.repository';
import { InvokeTargetsRepository } from '../invoke-targets.repository';
import { builtinTarget, CALL_ID, USER } from '../../__tests__/runtime-fixtures';

const NOW = new Date('2026-10-14T08:00:00.000Z');

describe('InvokeTargetsRepository', () => {
  const installRow = {
    id: 'install-1',
    pluginId: 'plugin-1',
    status: 'ENABLED',
    settings: { units: 'metric' },
    plugin: { slug: 'weather', status: 'PUBLISHED', globallyEnabled: true },
    version: {
      runtimeKind: 'BUILTIN',
      manifest: { slug: 'weather' },
      tools: [
        { name: 'get_weather', disabledByAdmin: true },
        { name: 'other', disabledByAdmin: false },
      ],
    },
    credential: { kind: 'API_KEY', headerName: 'X-API-Key', ciphertext: 'sealed' },
    consents: [{ toolName: 'get_weather', level: 'WRITE' }],
  };

  it('reads an install only for its owner and maps the enums, disabled tools and consents', async () => {
    const prisma = { pluginInstall: { findFirst: vi.fn().mockResolvedValue(installRow) } };

    const record = await new InvokeTargetsRepository(prisma as never).findInstall(
      USER,
      'install-1',
    );

    expect(prisma.pluginInstall.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'install-1', userId: USER },
    });
    expect(record).toMatchObject({
      installId: 'install-1',
      status: InstallStatus.ENABLED,
      catalogStatus: CatalogStatus.PUBLISHED,
      runtimeKind: RuntimeKind.BUILTIN,
      disabledTools: ['get_weather'],
      credential: { kind: AuthKind.API_KEY, headerName: 'X-API-Key', ciphertext: 'sealed' },
      consents: [{ toolName: 'get_weather', level: RiskLevel.WRITE }],
    });
  });

  it('answers null for another user install', async () => {
    const prisma = { pluginInstall: { findFirst: vi.fn().mockResolvedValue(null) } };

    expect(
      await new InvokeTargetsRepository(prisma as never).findInstall('intruder', 'install-1'),
    ).toBeNull();
  });

  it('reads a server only for its owner, with just the one tool asked for', async () => {
    const prisma = {
      mcpServer: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'srv-1',
          ownerUserId: USER,
          slug: 'mcpabc',
          url: 'https://mcp.example.com/mcp',
          authKind: 'NONE',
          status: 'NEEDS_REVIEW',
          failureCount: 2,
          breakerOpenedAt: NOW,
          tools: [
            {
              name: 'Create-Issue',
              localName: 'create_issue',
              description: 'd',
              inputSchema: {},
              riskLevel: 'DESTRUCTIVE',
              enabled: true,
              consentGranted: false,
            },
          ],
        }),
      },
    };

    const record = await new InvokeTargetsRepository(prisma as never).findServer(
      USER,
      'srv-1',
      'create_issue',
    );

    const query = prisma.mcpServer.findFirst.mock.calls[0]?.[0] as {
      where: unknown;
      select: { tools: { where: unknown } };
    };
    expect(query.where).toEqual({ id: 'srv-1', ownerUserId: USER });
    expect(query.select.tools.where).toEqual({ localName: 'create_issue' });
    expect(record).toMatchObject({
      status: ServerState.NEEDS_REVIEW,
      authKind: AuthKind.NONE,
      failureCount: 2,
    });
    expect(record?.tool).toMatchObject({ name: 'Create-Issue', riskLevel: RiskLevel.DESTRUCTIVE });
  });

  it('answers a server with no such tool as tool null, and a foreign server as null', async () => {
    const withoutTool = {
      mcpServer: {
        findFirst: vi.fn().mockResolvedValue({
          id: 's',
          ownerUserId: USER,
          slug: 'x',
          url: 'u',
          authKind: 'NONE',
          status: 'APPROVED',
          failureCount: 0,
          breakerOpenedAt: null,
          tools: [],
        }),
      },
    };
    const foreign = { mcpServer: { findFirst: vi.fn().mockResolvedValue(null) } };

    expect(
      (await new InvokeTargetsRepository(withoutTool as never).findServer(USER, 's', 'a'))?.tool,
    ).toBeNull();
    expect(
      await new InvokeTargetsRepository(foreign as never).findServer('intruder', 's', 'a'),
    ).toBeNull();
  });
});

describe('InvocationAuditRepository', () => {
  it('inserts a row once per (user, call id) and says whether it did', async () => {
    const prisma = { pluginInvocation: { createMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    const repository = new InvocationAuditRepository(prisma as never);
    const row = { userId: USER, callId: CALL_ID } as never;

    expect(await repository.insert(row)).toBe(true);
    prisma.pluginInvocation.createMany.mockResolvedValue({ count: 0 });
    expect(await repository.insert(row)).toBe(false);

    expect(prisma.pluginInvocation.createMany).toHaveBeenCalledWith({
      data: [row],
      skipDuplicates: true,
    });
  });

  it('checks a call id for one user only', async () => {
    const prisma = { pluginInvocation: { findFirst: vi.fn().mockResolvedValue({ id: 'x' }) } };

    expect(await new InvocationAuditRepository(prisma as never).existsForCall(USER, CALL_ID)).toBe(
      true,
    );
    expect(prisma.pluginInvocation.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { userId: USER, callId: CALL_ID },
    });
  });

  it('counts calls since a time without counting the refusals for rate', async () => {
    const prisma = { pluginInvocation: { count: vi.fn().mockResolvedValue(4) } };

    expect(await new InvocationAuditRepository(prisma as never).countSince(USER, NOW)).toBe(4);
    expect(prisma.pluginInvocation.count).toHaveBeenCalledWith({
      where: {
        userId: USER,
        createdAt: { gte: NOW },
        status: { not: InvocationState.RATE_LIMITED },
      },
    });
  });
});

describe('InvocationAuditManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const entry = {
    userId: USER,
    target: builtinTarget(),
    callId: CALL_ID,
    surface: 'chat',
    status: InvokeOutcome.OK,
    consentDecision: ConsentDecision.NOT_REQUIRED,
    tainted: false,
    argsHash: 'a'.repeat(64),
    resultBytes: 12,
    truncated: false,
    errorCode: null,
    durationMs: 8,
  };

  it('writes a row of ids, hashes, sizes and timing, and nothing else', async () => {
    const repository = { insert: vi.fn().mockResolvedValue(true), existsForCall: vi.fn() };

    await new InvocationAuditManager(repository as never).record({
      ...entry,
      conversationId: 'c-1',
    });

    expect(repository.insert).toHaveBeenCalledWith({
      userId: USER,
      installId: entry.target.installId,
      pluginId: 'plugin-1',
      serverId: null,
      callId: CALL_ID,
      toolName: 'get_weather',
      conversationId: 'c-1',
      messageId: null,
      surface: 'chat',
      status: 'OK',
      riskLevel: RiskLevel.READ,
      consentDecision: 'NOT_REQUIRED',
      taintedTurn: false,
      argsHash: 'a'.repeat(64),
      resultBytes: 12,
      truncated: false,
      errorCode: null,
      durationMs: 8,
    });
  });

  it('swallows a write failure: the user already has the answer', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const repository = {
      insert: vi.fn().mockRejectedValue(new Error('db down')),
      existsForCall: vi.fn(),
    };

    await expect(
      new InvocationAuditManager(repository as never).record(entry),
    ).resolves.toBeUndefined();
  });

  it('asks the repository whether a call id was used', async () => {
    const repository = { insert: vi.fn(), existsForCall: vi.fn().mockResolvedValue(true) };

    expect(
      await new InvocationAuditManager(repository as never).alreadyRecorded(USER, CALL_ID),
    ).toBe(true);
  });
});
