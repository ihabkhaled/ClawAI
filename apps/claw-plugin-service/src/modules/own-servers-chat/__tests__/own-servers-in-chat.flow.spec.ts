import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';

import { AuthKind } from '../../../common/enums/auth-kind.enum';
import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { InvokeOutcome } from '../../../common/enums/invoke-outcome.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { TargetKind } from '../../../common/enums/target-kind.enum';
import { buildServer, OWNER, SERVER_ID } from '../../mcp-servers/__tests__/server-fixtures';
import { McpClientManager } from '../../mcp-servers/managers/mcp-client.manager';
import { InvokeTargetManager } from '../../runtime/managers/invoke-target.manager';
import { McpExecutorManager } from '../../runtime/managers/mcp-executor.manager';
import { PluginResolveService } from '../../runtime/services/plugin-resolve.service';
import { serverTarget } from '../../runtime/__tests__/runtime-fixtures';
import { type ServerTargetRecord } from '../../runtime/types/target-record.types';
import {
  buildEgress,
  RecordingTransport,
  ScriptedResolver,
} from '../../egress/__tests__/egress-test-doubles';
import { OWN_SERVER_ICON_KEY } from '../constants/own-servers-chat.constants';
import { PluginMentionsController } from '../controllers/plugin-mentions.controller';
import { OwnServerMentionsManager } from '../managers/own-server-mentions.manager';
import { OwnServerOffersManager } from '../managers/own-server-offers.manager';

import { ZWSP } from './own-servers-in-chat.fixtures';

const LIMITS = { maxRounds: 5, maxCallsPerTurn: 6 };
const NOW = Date.parse('2026-10-14T12:00:00.000Z');

describe('resolve with an own server', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  function service(servers = [buildServer()], plan: 'ok' | 'denied' = 'ok') {
    const targets = { findInstall: vi.fn().mockResolvedValue(null) };
    const planGate = {
      assertAllowed: vi.fn().mockImplementation(() => {
        if (plan === 'denied') throw new ForbiddenException();
        return Promise.resolve();
      }),
    };
    const settings = {
      loadLoopLimits: vi.fn().mockResolvedValue(LIMITS),
      load: vi.fn().mockResolvedValue({ userServersEnabled: true }),
    };
    const repository = {
      findOwned: vi.fn((id: string, user: string) =>
        Promise.resolve(servers.find((s) => s.id === id && s.ownerUserId === user) ?? null),
      ),
    };
    const offers = new OwnServerOffersManager(repository as never, settings as never);
    return {
      resolve: new PluginResolveService(
        targets as never,
        planGate as never,
        settings as never,
        offers,
      ),
      repository,
      targets,
    };
  }

  const body = (userId = OWNER, refs = [{ installId: SERVER_ID }]) => ({
    userId,
    surface: 'chat',
    refs,
  });

  it('offers the own server tools next to the limits chat-service needs', async () => {
    const { resolve, targets } = service();
    const result = await resolve.resolve(body());
    expect(targets.findInstall).toHaveBeenCalledWith(OWNER, SERVER_ID);
    expect(result.tools.map((tool) => tool.nativeName)).toEqual([
      'plugin_mcp3f2b8f0e9d3c_create_issue',
    ]);
    expect(result.systemBlock).toContain('mcp3f2b8f0e9d3c');
    expect(result.limits).toEqual(LIMITS);
    expect(result.notices).toEqual([]);
  });

  it('answers another user with no tools, the same as an unknown id', async () => {
    const { resolve } = service();
    const result = await resolve.resolve(body('user-other'));
    expect(result.tools).toEqual([]);
    expect(result.notices).toEqual([{ code: 'PLUGIN_NO_TOOLS' }]);
  });

  it('keeps the plan gate: a plan without plugins offers no own server either', async () => {
    const { resolve, repository } = service([buildServer()], 'denied');
    const result = await resolve.resolve(body());
    expect(result.tools).toEqual([]);
    expect(repository.findOwned).not.toHaveBeenCalled();
  });

  it('still answers when the own server is failing: a localized-notice code, no throw', async () => {
    const { resolve } = service([buildServer({ status: ServerState.UNREACHABLE })]);
    const result = await resolve.resolve(body());
    expect(result.tools).toEqual([]);
    expect(result.notices.map((notice) => notice.code)).toEqual([
      'PLUGIN_NO_TOOLS',
      'PLUGIN_SERVER_UNAVAILABLE',
    ]);
  });
});

describe('invoke target for an own server named by its id', () => {
  const record = (overrides: Partial<ServerTargetRecord> = {}): ServerTargetRecord => ({
    serverId: SERVER_ID,
    ownerUserId: OWNER,
    slug: 'mcp3f2b8f0e9d3c',
    url: 'https://mcp.example.com/mcp',
    authKind: AuthKind.API_KEY,
    status: ServerState.APPROVED,
    failureCount: 0,
    breakerOpenedAt: null,
    tool: {
      name: 'create_issue',
      localName: 'create_issue',
      description: 'd',
      inputSchema: { type: 'object' },
      riskLevel: RiskLevel.WRITE,
      enabled: true,
      consentGranted: false,
    },
    ...overrides,
  });

  const body = { installId: SERVER_ID, toolName: 'create_issue', args: {} } as never;

  it('falls back to the callers own server when the id is not an install', async () => {
    const repository = {
      findInstall: vi.fn().mockResolvedValue(null),
      findServer: vi.fn().mockResolvedValue(record()),
    };
    const resolved = await new InvokeTargetManager(repository as never).resolve(OWNER, body);
    expect(repository.findServer).toHaveBeenCalledWith(OWNER, SERVER_ID, 'create_issue');
    expect(resolved.blocked).toBeNull();
    expect(resolved.target.kind).toBe(TargetKind.SERVER);
    expect(resolved.target.serverId).toBe(SERVER_ID);
  });

  it('reads a disabled server as blocked, not as runnable', async () => {
    const repository = {
      findInstall: vi.fn().mockResolvedValue(null),
      findServer: vi.fn().mockResolvedValue(record({ status: ServerState.DISABLED })),
    };
    const resolved = await new InvokeTargetManager(repository as never).resolve(OWNER, body);
    expect(resolved.blocked).toBe(InvokeErrorCode.UNAVAILABLE);
  });

  it('answers 404 when the id is neither the callers install nor the callers server', async () => {
    const repository = {
      findInstall: vi.fn().mockResolvedValue(null),
      findServer: vi.fn().mockResolvedValue(null),
    };
    await expect(
      new InvokeTargetManager(repository as never).resolve('user-other', body),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findServer).toHaveBeenCalledWith('user-other', SERVER_ID, 'create_issue');
  });
});

describe('a stored own-server URL stays behind the egress guard', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['a private address', '10.0.0.5'],
    ['the cloud metadata address', '169.254.169.254'],
    ['loopback', '127.0.0.1'],
  ])(
    'a name that now resolves to %s never reaches the wire and reads as unreachable',
    async (_label, address) => {
      const transport = new RecordingTransport();
      const { egress } = buildEgress(new ScriptedResolver(() => [address]), transport);
      const endpoints = {
        forServer: vi
          .fn()
          .mockResolvedValue({ url: 'https://rebound.example.com/mcp', headers: {} }),
      };
      const executor = new McpExecutorManager(
        new McpClientManager(egress),
        endpoints as never,
        { open: vi.fn() } as never,
      );
      const result = await executor.execute(
        serverTarget(),
        {},
        {
          userId: OWNER,
          signal: new AbortController().signal,
          timeoutMs: 2000,
          maxResultBytes: 4096,
        },
      );
      expect(transport.sent).toHaveLength(0);
      expect(result.outcome).toBe(InvokeOutcome.ERROR);
      expect(result.text).toBe('The server could not be reached.');
      expect(result.text).not.toContain(address);
    },
  );
});

describe('the @ picker rows', () => {
  const run = (servers = [buildServer()], enabled = true, failing = false) => {
    const repository = {
      findAllOwned: vi
        .fn()
        .mockImplementation(() =>
          failing ? Promise.reject(new Error('db')) : Promise.resolve(servers),
        ),
    };
    const settings = { load: vi.fn().mockResolvedValue({ userServersEnabled: enabled }) };
    return new OwnServerMentionsManager(repository as never, settings as never);
  };

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists an approved own server under its id, slug and name', async () => {
    expect(await run().mentions(OWNER, NOW)).toEqual([
      {
        installId: SERVER_ID,
        slug: 'mcp3f2b8f0e9d3c',
        name: 'My tracker',
        iconKey: OWN_SERVER_ICON_KEY,
        enabled: true,
      },
    ]);
  });

  it('marks a switched-off, in-review or breaker-open server as not enabled', async () => {
    const rows = [
      buildServer({ id: 'a', status: ServerState.DISABLED }),
      buildServer({ id: 'b', status: ServerState.NEEDS_REVIEW }),
      buildServer({ id: 'c', failureCount: 5, breakerOpenedAt: new Date(NOW - 1000) }),
    ];
    const result = await run(rows).mentions(OWNER, NOW);
    expect(result.map((row) => row.enabled)).toEqual([false, false, false]);
  });

  it('never lists a row owned by someone else', async () => {
    const rows = [buildServer({ ownerUserId: 'user-other' })];
    expect(await run(rows).mentions(OWNER, NOW)).toEqual([]);
  });

  it('lists nothing when user servers are off, and nothing when the read fails', async () => {
    expect(await run([buildServer()], false).mentions(OWNER, NOW)).toEqual([]);
    expect(await run([buildServer()], true, true).mentions(OWNER, NOW)).toEqual([]);
  });

  it('cleans a hostile server name', async () => {
    const rows = [buildServer({ name: `Evil${ZWSP}\n<script>` })];
    const [row] = await run(rows).mentions(OWNER, NOW);
    expect(row?.name).toBe('Evil <script>');
  });

  it('the controller returns the installed plugins first, then the own servers', async () => {
    const installed = [
      { installId: 'i1', slug: 'weather', name: 'Weather', iconKey: 'cloud', enabled: true },
    ];
    const installs = { mentions: vi.fn().mockResolvedValue(installed) };
    const controller = new PluginMentionsController(installs as never, run());
    const result = await controller.mentions({ id: OWNER } as never, 'en');
    expect(installs.mentions).toHaveBeenCalledWith(OWNER, 'en');
    expect(result.map((row) => row.slug)).toEqual(['weather', 'mcp3f2b8f0e9d3c']);
  });

  it('keeps the installed plugins when the own-server list fails', async () => {
    const installs = {
      mentions: vi
        .fn()
        .mockResolvedValue([
          { installId: 'i1', slug: 'w', name: 'W', iconKey: 'x', enabled: true },
        ]),
    };
    const controller = new PluginMentionsController(installs as never, run([], true, true));
    expect(await controller.mentions({ id: OWNER } as never, undefined)).toHaveLength(1);
  });
});
