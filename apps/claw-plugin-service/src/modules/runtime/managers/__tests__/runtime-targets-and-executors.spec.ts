import { Logger, NotFoundException } from '@nestjs/common';

import { AdapterFailureKind } from '../../../../common/enums/adapter-failure-kind.enum';
import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../../common/enums/install-status.enum';
import { InvokeErrorCode } from '../../../../common/enums/invoke-error-code.enum';
import { InvokeOutcome } from '../../../../common/enums/invoke-outcome.enum';
import { McpFailureKind } from '../../../../common/enums/mcp-failure-kind.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { RuntimeKind } from '../../../../common/enums/runtime-kind.enum';
import { ServerState } from '../../../../common/enums/server-status.enum';
import { TargetKind } from '../../../../common/enums/target-kind.enum';
import { McpFailure } from '../../../mcp-servers/errors/mcp-failure.error';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { AdapterError } from '../../errors/adapter.error';
import {
  builtinTarget,
  INSTALL,
  MCP_REMOTE_INPUT,
  remoteCatalogTarget,
  SERVER,
  serverTarget,
  USER,
} from '../../__tests__/runtime-fixtures';
import { type InstallTargetRecord, type ServerTargetRecord } from '../../types/target-record.types';
import { BuiltinExecutorManager } from '../builtin-executor.manager';
import { InvokeTargetManager } from '../invoke-target.manager';
import { McpExecutorManager } from '../mcp-executor.manager';

const EXEC = {
  userId: USER,
  signal: new AbortController().signal,
  timeoutMs: 5000,
  maxResultBytes: 4096,
};

function installRecord(overrides: Partial<InstallTargetRecord> = {}): InstallTargetRecord {
  return {
    installId: INSTALL,
    pluginId: 'plugin-1',
    status: InstallStatus.ENABLED,
    settings: { units: 'metric' },
    slug: 'weather',
    catalogStatus: CatalogStatus.PUBLISHED,
    globallyEnabled: true,
    runtimeKind: RuntimeKind.BUILTIN,
    manifest: WEATHER_MANIFEST,
    disabledTools: [],
    credential: null,
    consents: [],
    ...overrides,
  };
}

function serverRecord(overrides: Partial<ServerTargetRecord> = {}): ServerTargetRecord {
  return {
    serverId: SERVER,
    ownerUserId: USER,
    slug: 'mcp7a1c2d3e4b5f',
    url: 'https://mcp.example.com/mcp',
    authKind: AuthKind.API_KEY,
    status: ServerState.APPROVED,
    failureCount: 0,
    breakerOpenedAt: null,
    tool: {
      name: 'create_issue',
      localName: 'create_issue',
      description: 'd',
      inputSchema: { type: 'object', properties: {} },
      riskLevel: RiskLevel.WRITE,
      enabled: true,
      consentGranted: false,
    },
    ...overrides,
  };
}

describe('InvokeTargetManager', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const build = (install: InstallTargetRecord | null, server: ServerTargetRecord | null = null) => {
    const repository = {
      findInstall: vi.fn().mockResolvedValue(install),
      findServer: vi.fn().mockResolvedValue(server),
    };
    return { manager: new InvokeTargetManager(repository as never), repository };
  };
  const body = { toolName: 'get_weather' };

  it('resolves an install of a catalog tool with the tool risk and limits from the manifest', async () => {
    const { manager, repository } = build(installRecord());

    const { target, blocked } = await manager.resolve(USER, {
      ...body,
      installId: INSTALL,
    } as never);

    expect(repository.findInstall).toHaveBeenCalledWith(USER, INSTALL);
    expect(blocked).toBeNull();
    expect(target).toMatchObject({
      kind: TargetKind.CATALOG,
      slug: 'weather',
      toolName: 'get_weather',
      riskLevel: RiskLevel.READ,
      timeoutMs: 10_000,
      maxResultBytes: 16_384,
      installId: INSTALL,
      serverId: null,
    });
  });

  it('answers 404 for an install that is not the caller or does not exist', async () => {
    const { manager } = build(null);

    await expect(
      manager.resolve(USER, { ...body, installId: INSTALL } as never),
    ).rejects.toMatchObject({
      response: { errorCode: InvokeErrorCode.TARGET_NOT_FOUND },
    });
  });

  it('answers 404 for a tool the manifest does not have', async () => {
    const { manager } = build(installRecord());

    await expect(
      manager.resolve(USER, { toolName: 'delete_everything', installId: INSTALL } as never),
    ).rejects.toMatchObject({ response: { errorCode: InvokeErrorCode.TOOL_NOT_FOUND } });
  });

  it('answers 404 rather than guess when the stored manifest no longer parses', async () => {
    const { manager } = build(installRecord({ manifest: { junk: true } }));

    await expect(
      manager.resolve(USER, { ...body, installId: INSTALL } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['a disabled install', { status: InstallStatus.DISABLED }],
    ['a plugin switched off for everyone', { globallyEnabled: false }],
    ['a draft plugin', { catalogStatus: CatalogStatus.DRAFT }],
    ['a hidden plugin', { catalogStatus: CatalogStatus.HIDDEN }],
    ['a tool the admin disabled', { disabledTools: ['get_weather'] }],
  ])('blocks %s', async (_name, change) => {
    const { manager } = build(installRecord(change));

    const { blocked } = await manager.resolve(USER, { ...body, installId: INSTALL } as never);

    expect(blocked).toBe(InvokeErrorCode.UNAVAILABLE);
  });

  it('still allows a deprecated plugin that people installed', async () => {
    const { manager } = build(installRecord({ catalogStatus: CatalogStatus.DEPRECATED }));

    expect(
      (await manager.resolve(USER, { ...body, installId: INSTALL } as never)).blocked,
    ).toBeNull();
  });

  describe('consent grants', () => {
    const remote = (consents: InstallTargetRecord['consents']) =>
      installRecord({
        slug: 'vendor-mcp',
        runtimeKind: RuntimeKind.MCP_REMOTE,
        manifest: writeManifest(),
        consents,
      });

    function writeManifest(): unknown {
      return {
        ...MCP_REMOTE_INPUT,
        tools: [
          { ...(MCP_REMOTE_INPUT.tools[0] ?? {}), name: 'write_note', riskLevel: RiskLevel.WRITE },
          {
            ...(MCP_REMOTE_INPUT.tools[0] ?? {}),
            name: 'delete_note',
            riskLevel: RiskLevel.DESTRUCTIVE,
          },
        ],
      };
    }

    it('counts a stored grant only when its level equals the tool risk', async () => {
      const grant = { toolName: 'write_note', level: RiskLevel.WRITE };
      const wrong = { toolName: 'write_note', level: RiskLevel.DESTRUCTIVE };

      expect(
        (
          await build(remote([grant])).manager.resolve(USER, {
            toolName: 'write_note',
            installId: INSTALL,
          } as never)
        ).target.consentGranted,
      ).toBe(true);
      expect(
        (
          await build(remote([wrong])).manager.resolve(USER, {
            toolName: 'write_note',
            installId: INSTALL,
          } as never)
        ).target.consentGranted,
      ).toBe(false);
      expect(
        (
          await build(remote([])).manager.resolve(USER, {
            toolName: 'write_note',
            installId: INSTALL,
          } as never)
        ).target.consentGranted,
      ).toBe(false);
    });

    it('never counts a stored grant for a DESTRUCTIVE tool', async () => {
      const stored = { toolName: 'delete_note', level: RiskLevel.DESTRUCTIVE };

      const { target } = await build(remote([stored])).manager.resolve(USER, {
        toolName: 'delete_note',
        installId: INSTALL,
      } as never);

      expect(target.consentGranted).toBe(false);
    });
  });

  describe('own servers', () => {
    const call = { toolName: 'create_issue', serverId: SERVER } as never;

    it('resolves a server tool with its remote name and server state', async () => {
      const { manager, repository } = build(null, serverRecord({ failureCount: 2 }));

      const { target, blocked } = await manager.resolve(USER, call);

      expect(repository.findServer).toHaveBeenCalledWith(USER, SERVER, 'create_issue');
      expect(blocked).toBeNull();
      expect(target).toMatchObject({
        kind: TargetKind.SERVER,
        riskLevel: RiskLevel.WRITE,
        remoteName: 'create_issue',
        serverId: SERVER,
        failureCount: 2,
        installId: null,
      });
    });

    it('answers 404 for another user server and for an unknown tool', async () => {
      await expect(build(null, null).manager.resolve(USER, call)).rejects.toMatchObject({
        response: { errorCode: InvokeErrorCode.TARGET_NOT_FOUND },
      });
      await expect(
        build(null, serverRecord({ tool: null })).manager.resolve(USER, call),
      ).rejects.toMatchObject({
        response: { errorCode: InvokeErrorCode.TOOL_NOT_FOUND },
      });
    });

    it.each([
      [ServerState.NEEDS_REVIEW, InvokeErrorCode.NEEDS_REVIEW],
      [ServerState.PENDING_APPROVAL, InvokeErrorCode.UNAVAILABLE],
      [ServerState.DISABLED, InvokeErrorCode.UNAVAILABLE],
      [ServerState.REJECTED, InvokeErrorCode.UNAVAILABLE],
      [ServerState.UNREACHABLE, InvokeErrorCode.UNAVAILABLE],
    ])('blocks a %s server', async (status, code) => {
      expect(
        (await build(null, serverRecord({ status })).manager.resolve(USER, call)).blocked,
      ).toBe(code);
    });

    it('blocks a tool the owner switched off and a stored schema that is not an object', async () => {
      const off = serverRecord();
      if (off.tool !== null) off.tool.enabled = false;
      const odd = serverRecord();
      if (odd.tool !== null) odd.tool.inputSchema = 'junk';

      expect((await build(null, off).manager.resolve(USER, call)).blocked).toBe(
        InvokeErrorCode.UNAVAILABLE,
      );
      expect((await build(null, odd).manager.resolve(USER, call)).blocked).toBe(
        InvokeErrorCode.UNAVAILABLE,
      );
    });

    it('counts a WRITE grant, and ignores one on a tool that is not WRITE any more', async () => {
      const granted = serverRecord();
      if (granted.tool !== null) granted.tool.consentGranted = true;
      const stale = serverRecord();
      if (stale.tool !== null) {
        stale.tool.consentGranted = true;
        stale.tool.riskLevel = RiskLevel.DESTRUCTIVE;
      }

      expect((await build(null, granted).manager.resolve(USER, call)).target.consentGranted).toBe(
        true,
      );
      expect((await build(null, stale).manager.resolve(USER, call)).target.consentGranted).toBe(
        false,
      );
    });
  });
});

describe('BuiltinExecutorManager', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const build = (adapter: { execute: ReturnType<typeof vi.fn> } | undefined) =>
    new BuiltinExecutorManager({ get: vi.fn().mockReturnValue(adapter) } as never);

  it('runs the adapter with the install settings, the manifest hosts and the limits', async () => {
    const adapter = { execute: vi.fn().mockResolvedValue({ content: 'sunny', truncated: false }) };

    const result = await build(adapter).execute(
      builtinTarget({ settings: { units: 'imperial' } }),
      { location: 'Cairo' },
      EXEC,
    );

    expect(result).toEqual({
      outcome: InvokeOutcome.OK,
      text: 'sunny',
      errorCode: null,
      serverFault: false,
      truncated: false,
    });
    const [context, tool, args] = adapter.execute.mock.calls[0] as [
      Record<string, unknown>,
      string,
      unknown,
    ];
    expect(tool).toBe('get_weather');
    expect(args).toEqual({ location: 'Cairo' });
    expect(context).toMatchObject({
      userId: USER,
      settings: { units: 'imperial' },
      timeoutMs: 5000,
      maxResultBytes: 4096,
    });
    expect([...(context['allowedHosts'] as Set<string>)].sort()).toEqual([
      'api.open-meteo.com',
      'geocoding-api.open-meteo.com',
    ]);
  });

  it('passes the adapter truncation through', async () => {
    const adapter = { execute: vi.fn().mockResolvedValue({ content: 'x', truncated: true }) };

    expect((await build(adapter).execute(builtinTarget(), {}, EXEC)).truncated).toBe(true);
  });

  it('turns an AdapterError into an ERROR the model can read', async () => {
    const adapter = {
      execute: vi
        .fn()
        .mockRejectedValue(new AdapterError(AdapterFailureKind.BAD_INPUT, 'No place was found')),
    };

    expect(await build(adapter).execute(builtinTarget(), {}, EXEC)).toMatchObject({
      outcome: InvokeOutcome.ERROR,
      errorCode: InvokeErrorCode.TOOL_FAILED,
      text: 'No place was found',
    });
  });

  it('turns an adapter timeout into TIMEOUT', async () => {
    const adapter = {
      execute: vi.fn().mockRejectedValue(new AdapterError(AdapterFailureKind.TIMEOUT, 'slow')),
    };

    expect((await build(adapter).execute(builtinTarget(), {}, EXEC)).outcome).toBe(
      InvokeOutcome.TIMEOUT,
    );
  });

  it('hides an unexpected error behind a generic message', async () => {
    const adapter = {
      execute: vi.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5:5432 password=hunter2')),
    };

    const result = await build(adapter).execute(builtinTarget(), {}, EXEC);

    expect(result).toMatchObject({
      outcome: InvokeOutcome.ERROR,
      errorCode: InvokeErrorCode.ADAPTER_FAILED,
      text: 'The tool failed.',
    });
    expect(JSON.stringify(result)).not.toContain('hunter2');
  });

  it('reports a missing adapter', async () => {
    expect(await build(undefined).execute(builtinTarget(), {}, EXEC)).toMatchObject({
      outcome: InvokeOutcome.ERROR,
      errorCode: InvokeErrorCode.ADAPTER_MISSING,
    });
  });
});

describe('McpExecutorManager', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const build = (
    options: { call?: () => unknown; endpoint?: unknown; opened?: string | null } = {},
  ) => {
    const client = {
      callTool: vi
        .fn()
        .mockImplementation(async () =>
          options.call === undefined
            ? { text: 'done', isError: false, droppedBlocks: 0 }
            : options.call(),
        ),
    };
    const endpoints = {
      forServer: vi
        .fn()
        .mockResolvedValue(
          options.endpoint === undefined
            ? { url: 'https://mcp.example.com/mcp', headers: { 'X-API-Key': 'k' } }
            : options.endpoint,
        ),
    };
    const crypto = {
      open: vi.fn().mockReturnValue(options.opened === undefined ? 'vendor-key' : options.opened),
    };
    return {
      executor: new McpExecutorManager(client as never, endpoints as never, crypto as never),
      client,
      endpoints,
      crypto,
    };
  };

  it('calls a user server tool by its remote name through the owner endpoint', async () => {
    const { executor, client, endpoints } = build();

    const result = await executor.execute(
      serverTarget({ remoteName: 'Create-Issue' }),
      { title: 'x' },
      EXEC,
    );

    expect(endpoints.forServer).toHaveBeenCalledWith({
      id: SERVER,
      ownerUserId: USER,
      url: 'https://mcp.example.com/mcp',
      authKind: AuthKind.API_KEY,
    });
    expect(client.callTool).toHaveBeenCalledWith(
      { url: 'https://mcp.example.com/mcp', headers: { 'X-API-Key': 'k' } },
      {
        remoteName: 'Create-Issue',
        args: { title: 'x' },
        timeoutMs: 5000,
        maxResultBytes: 4096,
        signal: EXEC.signal,
      },
    );
    expect(result).toEqual({
      outcome: InvokeOutcome.OK,
      text: 'done',
      errorCode: null,
      serverFault: false,
      truncated: false,
    });
  });

  it('calls a curated catalog server at the manifest URL with the install credential', async () => {
    const { executor, client, crypto } = build();

    await executor.execute(remoteCatalogTarget(), { q: 'x' }, EXEC);

    expect(crypto.open).toHaveBeenCalledWith('sealed', USER, INSTALL);
    expect(client.callTool.mock.calls[0]?.[0]).toEqual({
      url: 'https://mcp.vendor.example.com/mcp',
      headers: { 'X-API-Key': 'vendor-key' },
    });
    expect(client.callTool.mock.calls[0]?.[1]).toMatchObject({ remoteName: 'search' });
  });

  it('needs no credential for a catalog server that takes none', async () => {
    const open = { ...MCP_REMOTE_INPUT, auth: { kind: AuthKind.NONE } };
    const { executor, client, crypto } = build();
    const target = remoteCatalogTarget();
    const noAuth = {
      ...target,
      manifest: { ...target.manifest, auth: open.auth },
      credential: null,
    };

    await executor.execute(noAuth as never, {}, EXEC);

    expect(crypto.open).not.toHaveBeenCalled();
    expect(client.callTool.mock.calls[0]?.[0]).toEqual({
      url: 'https://mcp.vendor.example.com/mcp',
      headers: {},
    });
  });

  it.each([
    ['a missing endpoint credential', { endpoint: null }, serverTarget()],
    ['a catalog credential that does not open', { opened: null }, remoteCatalogTarget()],
    [
      'a catalog server that needs a credential and has none',
      {},
      remoteCatalogTarget({ credential: null }),
    ],
  ])('blocks on %s without calling the server', async (_name, options, target) => {
    const { executor, client } = build(options);

    const result = await executor.execute(target, {}, EXEC);

    expect(result).toMatchObject({
      outcome: InvokeOutcome.BLOCKED,
      errorCode: InvokeErrorCode.CREDENTIAL_UNREADABLE,
    });
    expect(client.callTool).not.toHaveBeenCalled();
  });

  it('reports a tool-level error as ERROR without blaming the server', async () => {
    const { executor } = build({
      call: () => ({ text: 'issue not found', isError: true, droppedBlocks: 0 }),
    });

    expect(await executor.execute(serverTarget(), {}, EXEC)).toMatchObject({
      outcome: InvokeOutcome.ERROR,
      errorCode: InvokeErrorCode.TOOL_FAILED,
      text: 'issue not found',
      serverFault: false,
    });
  });

  it('notes the blocks it dropped', async () => {
    const { executor } = build({ call: () => ({ text: 'a', isError: false, droppedBlocks: 2 }) });

    expect((await executor.execute(serverTarget(), {}, EXEC)).text).toBe(
      'a\n[2 non-text content block(s) omitted]',
    );
  });

  it.each([
    [McpFailureKind.TIMEOUT, InvokeOutcome.TIMEOUT, InvokeErrorCode.TIMED_OUT, true],
    [McpFailureKind.ABORTED, InvokeOutcome.ERROR, InvokeErrorCode.ABORTED, false],
    [McpFailureKind.OVERSIZED, InvokeOutcome.ERROR, InvokeErrorCode.RESULT_TOO_LARGE, false],
    [McpFailureKind.REJECTED, InvokeOutcome.ERROR, InvokeErrorCode.TOOL_FAILED, true],
    [McpFailureKind.UNREACHABLE, InvokeOutcome.ERROR, InvokeErrorCode.TOOL_FAILED, true],
  ])(
    'maps a %s failure to %s with fault=%s and a generic message',
    async (kind, outcome, code, serverFault) => {
      const { executor } = build({
        call: () => {
          throw new McpFailure(kind, 'EGRESS_BLOCKED_ADDRESS: mcp.example.com -> 10.0.0.5');
        },
      });

      const result = await executor.execute(serverTarget(), {}, EXEC);

      expect(result).toMatchObject({ outcome, errorCode: code, serverFault });
      expect(result.text).not.toContain('10.0.0.5');
      expect(result.text).not.toContain('EGRESS');
    },
  );

  it('folds a raw egress refusal into a generic unreachable message', async () => {
    const { EgressError } = await import('../../../egress/errors/egress.error');
    const { EgressErrorCode } = await import('../../../../common/enums/egress-error-code.enum');
    const { executor } = build({
      call: () => {
        throw new EgressError(EgressErrorCode.BLOCKED_ADDRESS, 'mcp.example.com -> 127.0.0.1');
      },
    });

    const result = await executor.execute(serverTarget(), {}, EXEC);

    expect(result.text).toBe('The server could not be reached.');
    expect(result.serverFault).toBe(true);
  });
});
