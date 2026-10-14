import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { BreakerDecision } from '../../../../common/enums/breaker-decision.enum';
import { McpErrorCode } from '../../../../common/enums/mcp-error-code.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { buildServer, buildTool } from '../../__tests__/server-fixtures';
import { McpEndpointManager } from '../mcp-endpoint.manager';
import { McpServerHealthManager } from '../mcp-server-health.manager';
import { McpServerPlanGateManager } from '../mcp-server-plan-gate.manager';
import { McpServerPresenterManager } from '../mcp-server-presenter.manager';
import { McpServerToolPolicyManager } from '../mcp-server-tool-policy.manager';

describe('McpServerToolPolicyManager', () => {
  const policy = new McpServerToolPolicyManager();
  const tools = [
    buildTool(),
    buildTool({ name: 'list', localName: 'list', riskLevel: RiskLevel.READ }),
  ];

  it('lets the owner mark a tool READ and switch it off', () => {
    expect(
      policy.plan(tools, [{ name: 'create_issue', riskLevel: RiskLevel.READ, enabled: false }]),
    ).toEqual([
      { localName: 'create_issue', update: { enabled: false, riskLevel: RiskLevel.READ } },
    ]);
  });

  it('stores a standing consent only for a WRITE tool', () => {
    expect(policy.plan(tools, [{ name: 'create_issue', consent: true }])[0]?.update).toEqual({
      consentGranted: true,
    });
    expect(() => policy.plan(tools, [{ name: 'list', consent: true }])).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ errorCode: McpErrorCode.CONSENT_NOT_ALLOWED }),
      }),
    );
    expect(() =>
      policy.plan(tools, [
        { name: 'create_issue', riskLevel: RiskLevel.DESTRUCTIVE, consent: true },
      ]),
    ).toThrow();
  });

  it('clears a stored consent when the risk changes', () => {
    const granted = [buildTool({ consentGranted: true })];

    expect(
      policy.plan(granted, [{ name: 'create_issue', riskLevel: RiskLevel.DESTRUCTIVE }])[0]?.update,
    ).toEqual({
      riskLevel: RiskLevel.DESTRUCTIVE,
      consentGranted: false,
    });
  });

  it('can revoke a consent', () => {
    const granted = [buildTool({ consentGranted: true })];

    expect(policy.plan(granted, [{ name: 'create_issue', consent: false }])[0]?.update).toEqual({
      consentGranted: false,
    });
  });

  it('writes nothing for a change that changes nothing', () => {
    expect(
      policy.plan(tools, [{ name: 'create_issue', riskLevel: RiskLevel.WRITE }])[0]?.update,
    ).toEqual({});
  });

  it('refuses an unknown tool and a tool named twice', () => {
    expect(() => policy.plan(tools, [{ name: 'ghost', enabled: true }])).toThrow();
    expect(() =>
      policy.plan(tools, [
        { name: 'list', enabled: true },
        { name: 'list', enabled: false },
      ]),
    ).toThrow();
  });
});

describe('McpServerHealthManager (circuit breaker with half-open)', () => {
  const NOW = 1_000_000_000_000;
  const build = (claim = true) => {
    const repository = {
      claimProbe: vi.fn().mockResolvedValue(claim),
      recordSuccess: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };
    return { manager: new McpServerHealthManager(repository as never), repository };
  };

  it('lets calls through while the failure streak is under 5', async () => {
    const { manager } = build();

    expect(await manager.admit({ id: 's', failureCount: 4, breakerOpenedAt: null }, NOW)).toBe(
      BreakerDecision.ALLOW,
    );
  });

  it('blocks calls for 30 seconds after the breaker opens', async () => {
    const { manager, repository } = build();

    expect(
      await manager.admit(
        { id: 's', failureCount: 5, breakerOpenedAt: new Date(NOW - 29_000) },
        NOW,
      ),
    ).toBe(BreakerDecision.OPEN);
    expect(repository.claimProbe).not.toHaveBeenCalled();
  });

  it('lets exactly one probe through after the cool-down (half-open)', async () => {
    const { manager, repository } = build(true);
    const opened = new Date(NOW - 31_000);

    expect(await manager.admit({ id: 's', failureCount: 5, breakerOpenedAt: opened }, NOW)).toBe(
      BreakerDecision.PROBE,
    );
    expect(repository.claimProbe).toHaveBeenCalledWith('s', opened);
  });

  it('keeps everyone else blocked while another caller holds the probe', async () => {
    const { manager } = build(false);

    expect(
      await manager.admit(
        { id: 's', failureCount: 5, breakerOpenedAt: new Date(NOW - 31_000) },
        NOW,
      ),
    ).toBe(BreakerDecision.OPEN);
  });

  it('passes success and failure to the repository with the threshold', async () => {
    const { manager, repository } = build();

    await manager.succeeded('s');
    await manager.failed('s', 'PLUGIN_TOOL_FAILED');

    expect(repository.recordSuccess).toHaveBeenCalledWith('s');
    expect(repository.recordFailure).toHaveBeenCalledWith('s', 'PLUGIN_TOOL_FAILED', 5);
  });
});

describe('McpEndpointManager', () => {
  const server = {
    id: 'srv',
    ownerUserId: 'u1',
    url: 'https://mcp.example.com/mcp',
    authKind: AuthKind.API_KEY,
  };

  it('opens the credential for this owner and server and builds the header', async () => {
    const secrets = {
      findSealed: vi.fn().mockResolvedValue({
        kind: AuthKind.API_KEY,
        headerName: 'X-API-Key',
        ciphertext: 'sealed',
      }),
    };
    const crypto = { open: vi.fn().mockReturnValue('the-key') };

    const endpoint = await new McpEndpointManager(secrets as never, crypto as never).forServer(
      server,
    );

    expect(secrets.findSealed).toHaveBeenCalledWith('u1', 'srv');
    expect(crypto.open).toHaveBeenCalledWith('sealed', 'u1', 'srv');
    expect(endpoint).toEqual({ url: server.url, headers: { 'X-API-Key': 'the-key' } });
  });

  it('needs no credential for a server that takes none', async () => {
    const secrets = { findSealed: vi.fn() };

    const endpoint = await new McpEndpointManager(
      secrets as never,
      { open: vi.fn() } as never,
    ).forServer({
      ...server,
      authKind: AuthKind.NONE,
    });

    expect(endpoint).toEqual({ url: server.url, headers: {} });
    expect(secrets.findSealed).not.toHaveBeenCalled();
  });

  it('returns null when the credential is missing or no longer opens', async () => {
    const missing = new McpEndpointManager(
      { findSealed: vi.fn().mockResolvedValue(null) } as never,
      {} as never,
    );
    const unreadable = new McpEndpointManager(
      {
        findSealed: vi
          .fn()
          .mockResolvedValue({ kind: AuthKind.API_KEY, headerName: 'X-API-Key', ciphertext: 'x' }),
      } as never,
      { open: vi.fn().mockReturnValue(null) } as never,
    );

    expect(await missing.forServer(server)).toBeNull();
    expect(await unreadable.forServer(server)).toBeNull();
  });
});

describe('McpServerPlanGateManager', () => {
  const entitlements = (cap: unknown, allow = true) => ({
    getEntitlements: vi.fn().mockResolvedValue({
      role: 'USER',
      plan: { limits: { maxUserMcpServers: cap }, featureGates: { allowPlugins: allow } },
    }),
  });

  it('returns the cap, null for unlimited and 0 for disabled', async () => {
    expect(await new McpServerPlanGateManager(entitlements(5) as never).resolveServerCap('u')).toBe(
      5,
    );
    expect(
      await new McpServerPlanGateManager(entitlements(null) as never).resolveServerCap('u'),
    ).toBeNull();
    expect(await new McpServerPlanGateManager(entitlements(0) as never).resolveServerCap('u')).toBe(
      0,
    );
  });

  it('refuses when allowPlugins is off', async () => {
    await expect(
      new McpServerPlanGateManager(entitlements(5, false) as never).resolveServerCap('u'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed on an unreadable cap and on an auth-service outage', async () => {
    await expect(
      new McpServerPlanGateManager(entitlements('lots') as never).resolveServerCap('u'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      new McpServerPlanGateManager({
        getEntitlements: vi.fn().mockRejectedValue(new Error('down')),
      } as never).resolveServerCap('u'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('McpServerPresenterManager', () => {
  it('names each tool with the native plugin_<slug>_<tool> form', () => {
    const view = new McpServerPresenterManager().toDetail(buildServer());

    expect(view.tools[0]?.nativeName).toBe('plugin_mcp3f2b8f0e9d3c_create_issue');
    expect(view.tools[0]?.remoteName).toBe('create_issue');
  });

  it('reads malformed stored serverInfo as null', () => {
    expect(
      new McpServerPresenterManager().toView(buildServer({ serverInfo: 'junk' })).serverInfo,
    ).toBeNull();
  });
});
