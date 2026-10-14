import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  type UnprocessableEntityException,
} from '@nestjs/common';

import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { McpErrorCode } from '../../../../common/enums/mcp-error-code.enum';
import { ServerState } from '../../../../common/enums/server-status.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { McpFailure } from '../../errors/mcp-failure.error';
import { McpFailureKind } from '../../../../common/enums/mcp-failure-kind.enum';
import { McpServerPresenterManager } from '../../managers/mcp-server-presenter.manager';
import { McpServerToolPolicyManager } from '../../managers/mcp-server-tool-policy.manager';
import { McpToolSnapshotManager } from '../../managers/mcp-tool-snapshot.manager';
import { buildServer, OWNER, SERVER_ID } from '../../__tests__/server-fixtures';
import { McpServersService } from '../mcp-servers.service';

const SECRET = 'sk-live-SENTINEL-credential-0123456789';
const GOOD_TOOL = {
  name: 'create_issue',
  description: 'Create an issue.',
  inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
};
const REGISTER = {
  name: 'My tracker',
  url: 'https://mcp.example.com/mcp',
  authKind: AuthKind.API_KEY,
  credential: { value: SECRET },
} as const;

function build(
  overrides: { settings?: object; cap?: number | null; discover?: () => unknown } = {},
) {
  const repository = {
    findOwned: vi.fn().mockResolvedValue(buildServer()),
    findAllOwned: vi.fn().mockResolvedValue([buildServer()]),
    countOwned: vi.fn().mockResolvedValue(0),
    createWithinCap: vi.fn().mockResolvedValue({ kind: 'CREATED' }),
    updateOwned: vi.fn().mockResolvedValue(true),
    updateTool: vi.fn().mockResolvedValue(true),
    deleteOwned: vi.fn().mockResolvedValue(true),
  };
  const secrets = {
    save: vi.fn().mockResolvedValue(new Date('2026-10-14T09:00:00.000Z')),
    delete: vi.fn(),
  };
  const crypto = { seal: vi.fn().mockReturnValue({ ciphertext: 'sealed', keyVersion: 1 }) };
  const planGate = {
    resolveServerCap: vi.fn().mockResolvedValue(overrides.cap === undefined ? 5 : overrides.cap),
  };
  const settings = {
    load: vi.fn().mockResolvedValue({
      userServersEnabled: true,
      requireApproval: false,
      ...overrides.settings,
    }),
  };
  const hostPolicy = { assertAllowed: vi.fn().mockResolvedValue(undefined) };
  const client = {
    discover: vi.fn().mockImplementation(async () =>
      overrides.discover === undefined
        ? {
            protocolVersion: '2025-06-18',
            serverInfo: { name: 'T', version: '1' },
            rawTools: [GOOD_TOOL],
            moreAvailable: false,
          }
        : overrides.discover(),
    ),
  };
  const service = new McpServersService(
    repository as never,
    secrets as never,
    crypto as never,
    planGate as never,
    settings as never,
    client as never,
    new McpToolSnapshotManager(),
    new McpServerToolPolicyManager(),
    new McpServerPresenterManager(),
    hostPolicy as never,
  );
  return { service, repository, secrets, crypto, planGate, settings, client, hostPolicy };
}

function captureLogs(): () => string {
  const lines: string[] = [];
  for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
    vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
      lines.push(String(message));
    });
  }
  return () => lines.join('\n');
}

describe('McpServersService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('discovers the tools, seals the credential and stores everything for the JWT user', async () => {
      const { service, repository, crypto, client } = build();

      const result = await service.register(OWNER, REGISTER);

      expect(client.discover).toHaveBeenCalledWith({
        url: 'https://mcp.example.com/mcp',
        headers: { 'X-API-Key': SECRET },
      });
      const [input, cap] = repository.createWithinCap.mock.calls[0] as [
        Record<string, unknown>,
        number,
      ];
      expect(cap).toBe(5);
      expect(input).toMatchObject({
        ownerUserId: OWNER,
        name: 'My tracker',
        url: 'https://mcp.example.com/mcp',
        urlHost: 'mcp.example.com',
        status: ServerState.APPROVED,
      });
      expect(String(input['slug'])).toMatch(/^mcp[0-9a-f]{8}$/);
      expect(crypto.seal).toHaveBeenCalledWith(SECRET, OWNER, input['id']);
      expect(input['credential']).toEqual({
        kind: AuthKind.API_KEY,
        headerName: 'X-API-Key',
        ciphertext: 'sealed',
        keyVersion: 1,
      });
      expect(result.server.id).toBe(SERVER_ID);
    });

    it('stores every tool as WRITE with no consent', async () => {
      const { service, repository } = build();

      await service.register(OWNER, REGISTER);

      const [input] = repository.createWithinCap.mock.calls[0] as [
        { tools: Array<Record<string, unknown>> },
      ];
      expect(input.tools).toHaveLength(1);
      expect(input.tools[0]).not.toHaveProperty('riskLevel');
    });

    it('registers as PENDING_APPROVAL when the admin turned approval on', async () => {
      const { service, repository } = build({ settings: { requireApproval: true } });

      await service.register(OWNER, REGISTER);

      expect(repository.createWithinCap.mock.calls[0]?.[0]).toMatchObject({
        status: ServerState.PENDING_APPROVAL,
      });
    });

    it('registers a server that needs no credential without sealing anything', async () => {
      const { service, repository, crypto } = build();

      await service.register(OWNER, {
        name: 'Open',
        url: 'https://open.example.com/mcp',
        authKind: AuthKind.NONE,
      });

      expect(crypto.seal).not.toHaveBeenCalled();
      expect(repository.createWithinCap.mock.calls[0]?.[0]).toMatchObject({
        credential: undefined,
      });
    });

    it('sends a bearer token as Authorization: Bearer', async () => {
      const { service, client } = build();

      await service.register(OWNER, {
        name: 'B',
        url: 'https://b.example.com/mcp',
        authKind: AuthKind.BEARER_TOKEN,
        credential: { value: 'tok' },
      });

      expect(client.discover).toHaveBeenCalledWith({
        url: 'https://b.example.com/mcp',
        headers: { Authorization: 'Bearer tok' },
      });
    });

    it('refuses with 403 MCP_SERVERS_DISABLED when the admin switched the feature off', async () => {
      const { service, client } = build({ settings: { userServersEnabled: false } });

      await expect(service.register(OWNER, REGISTER)).rejects.toMatchObject({
        response: { errorCode: McpErrorCode.SERVERS_DISABLED },
      });
      expect(client.discover).not.toHaveBeenCalled();
    });

    it('refuses a plan with 0 servers before it opens any connection', async () => {
      const { service, client, repository } = build({ cap: 0 });

      await expect(service.register(OWNER, REGISTER)).rejects.toMatchObject({
        response: { errorCode: McpErrorCode.SERVER_LIMIT, limit: 0 },
      });
      expect(client.discover).not.toHaveBeenCalled();
      expect(repository.createWithinCap).not.toHaveBeenCalled();
    });

    it('refuses a user already at the cap before it opens any connection', async () => {
      const { service, client, repository } = build({ cap: 3 });
      repository.countOwned.mockResolvedValue(3);

      await expect(service.register(OWNER, REGISTER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(client.discover).not.toHaveBeenCalled();
    });

    it('lets an unlimited plan (null) register without counting', async () => {
      const { service, repository } = build({ cap: null });

      await service.register(OWNER, REGISTER);

      expect(repository.countOwned).not.toHaveBeenCalled();
      expect(repository.createWithinCap.mock.calls[0]?.[1]).toBeNull();
    });

    it('reports the cap when the insert loses the race', async () => {
      const { service, repository } = build({ cap: 2 });
      repository.createWithinCap.mockResolvedValue({ kind: 'LIMIT', current: 2 });

      await expect(service.register(OWNER, REGISTER)).rejects.toMatchObject({
        response: { errorCode: McpErrorCode.SERVER_LIMIT, limit: 2, current: 2 },
      });
    });

    it('answers 409 for a URL the user already registered', async () => {
      const { service, repository } = build();
      repository.createWithinCap.mockResolvedValue({ kind: 'DUPLICATE' });

      await expect(service.register(OWNER, REGISTER)).rejects.toBeInstanceOf(ConflictException);
    });

    it.each([
      'http://mcp.example.com/mcp',
      'https://127.0.0.1/mcp',
      'https://localhost/mcp',
      'https://169.254.169.254/latest/',
      'https://user:pass@mcp.example.com/mcp',
      'https://mcp.example.com:22/mcp',
      'https://redis/mcp',
      'https://printer.local/mcp',
    ])('answers 422 MCP_URL_BLOCKED for %s without connecting', async (url) => {
      const { service, client } = build();

      await expect(service.register(OWNER, { ...REGISTER, url })).rejects.toMatchObject({
        response: { errorCode: McpErrorCode.URL_BLOCKED },
      });
      expect(client.discover).not.toHaveBeenCalled();
    });

    it('gives the same URL_BLOCKED message whatever the reason, so it cannot be used as a probe', async () => {
      const { service } = build();
      const messages = new Set<string>();
      for (const url of [
        'http://a.example.com/',
        'https://127.0.0.1/',
        'https://a.example.com:22/',
      ]) {
        try {
          await service.register(OWNER, { ...REGISTER, url });
        } catch (error) {
          messages.add(JSON.stringify((error as UnprocessableEntityException).getResponse()));
        }
      }
      expect(messages.size).toBe(1);
    });

    it.each([
      [McpFailureKind.UNREACHABLE, McpErrorCode.SERVER_UNREACHABLE],
      [McpFailureKind.TIMEOUT, McpErrorCode.SERVER_UNREACHABLE],
      [McpFailureKind.ABORTED, McpErrorCode.SERVER_UNREACHABLE],
      [McpFailureKind.REJECTED, McpErrorCode.SERVER_REJECTED],
      [McpFailureKind.OVERSIZED, McpErrorCode.SERVER_REJECTED],
    ])('maps a %s discovery failure to 502 %s and no detail', async (kind, code) => {
      const { service } = build({
        discover: () => {
          throw new McpFailure(kind, 'EGRESS_BLOCKED_ADDRESS: mcp.example.com -> 10.0.0.5');
        },
      });

      const error = await service.register(OWNER, REGISTER).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(BadGatewayException);
      const body = JSON.stringify((error as BadGatewayException).getResponse());
      expect(body).toContain(code);
      expect(body).not.toContain('10.0.0.5');
      expect(body).not.toContain('EGRESS');
    });

    it('answers 422 when the server lists no tool ClawAI can use', async () => {
      const { service } = build({
        discover: () => ({
          protocolVersion: 'x',
          serverInfo: null,
          rawTools: [{ name: 'bad name' }],
          moreAvailable: false,
        }),
      });

      await expect(service.register(OWNER, REGISTER)).rejects.toMatchObject({
        response: { errorCode: McpErrorCode.NO_USABLE_TOOLS },
      });
    });

    it('never logs the credential or the full URL', async () => {
      const read = captureLogs();
      const { service } = build();

      await service.register(OWNER, {
        ...REGISTER,
        url: 'https://mcp.example.com/mcp?token=URLSECRET',
      });

      expect(read()).not.toContain(SECRET);
      expect(read()).not.toContain('URLSECRET');
    });

    it('rejects a credential header that could carry something else', async () => {
      const { service } = build();

      await expect(
        service.register(OWNER, { ...REGISTER, credential: { value: SECRET, headerName: 'Host' } }),
      ).rejects.toMatchObject({ response: { errorCode: McpErrorCode.CREDENTIAL_HEADER_DENIED } });
    });
  });

  describe('owner scoping (IDOR)', () => {
    it('reads, updates and deletes only through the JWT user id', async () => {
      const { service, repository } = build();

      await service.get(OWNER, SERVER_ID);
      await service.update(OWNER, SERVER_ID, { name: 'Renamed' });
      await service.remove(OWNER, SERVER_ID);

      expect(repository.findOwned).toHaveBeenCalledWith(SERVER_ID, OWNER);
      expect(repository.updateOwned).toHaveBeenCalledWith(SERVER_ID, OWNER, { name: 'Renamed' });
      expect(repository.deleteOwned).toHaveBeenCalledWith(SERVER_ID, OWNER);
    });

    it('answers 404 for another user server, exactly like one that does not exist', async () => {
      const { service, repository } = build();
      repository.findOwned.mockResolvedValue(null);
      repository.deleteOwned.mockResolvedValue(false);

      for (const action of [
        () => service.get('intruder', SERVER_ID),
        () => service.update('intruder', SERVER_ID, { name: 'x' }),
        () => service.putCredential('intruder', SERVER_ID, { value: SECRET }),
        () => service.removeCredential('intruder', SERVER_ID),
        () => service.remove('intruder', SERVER_ID),
      ]) {
        await expect(action()).rejects.toBeInstanceOf(NotFoundException);
      }
    });

    it('lists only the user own servers', async () => {
      const { service, repository } = build();

      await service.list(OWNER);

      expect(repository.findAllOwned).toHaveBeenCalledWith(OWNER, 100);
    });
  });

  describe('views never carry a secret', () => {
    it('shows hasCredential and the time, not the kind of header or the ciphertext', async () => {
      const { service } = build();

      const view = await service.get(OWNER, SERVER_ID);

      expect(view.hasCredential).toBe(true);
      expect(JSON.stringify(view)).not.toContain('ciphertext');
      expect(JSON.stringify(view)).not.toContain(SECRET);
    });

    it('answers the credential PUT with presence only', async () => {
      const { service, secrets } = build();

      const status = await service.putCredential(OWNER, SERVER_ID, { value: SECRET });

      expect(status).toEqual({
        hasCredential: true,
        kind: AuthKind.API_KEY,
        updatedAt: '2026-10-14T09:00:00.000Z',
      });
      expect(secrets.save).toHaveBeenCalledWith(OWNER, SERVER_ID, {
        kind: AuthKind.API_KEY,
        headerName: 'X-API-Key',
        ciphertext: 'sealed',
        keyVersion: 1,
      });
      expect(JSON.stringify(status)).not.toContain(SECRET);
    });

    it('refuses a credential for a server that takes none', async () => {
      const { service, repository } = build();
      repository.findOwned.mockResolvedValue(
        buildServer({ authKind: AuthKind.NONE, credential: null }),
      );

      await expect(
        service.putCredential(OWNER, SERVER_ID, { value: SECRET }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('switches an approved server off and a disabled one back on', async () => {
      const { service, repository } = build();

      await service.update(OWNER, SERVER_ID, { enabled: false });
      expect(repository.updateOwned).toHaveBeenLastCalledWith(SERVER_ID, OWNER, {
        status: ServerState.DISABLED,
      });

      repository.findOwned.mockResolvedValue(buildServer({ status: ServerState.DISABLED }));
      await service.update(OWNER, SERVER_ID, { enabled: true });
      expect(repository.updateOwned).toHaveBeenLastCalledWith(SERVER_ID, OWNER, {
        status: ServerState.APPROVED,
      });
    });

    it.each([ServerState.PENDING_APPROVAL, ServerState.NEEDS_REVIEW, ServerState.REJECTED])(
      'will not enable a %s server (that would skip its review)',
      async (status) => {
        const { service, repository } = build();
        repository.findOwned.mockResolvedValue(buildServer({ status }));

        await expect(service.update(OWNER, SERVER_ID, { enabled: true })).rejects.toMatchObject({
          response: { errorCode: McpErrorCode.STATE_NOT_ALLOWED },
        });
        expect(repository.updateOwned).not.toHaveBeenCalled();
      },
    );

    it('applies tool changes after validating all of them', async () => {
      const { service, repository } = build();

      await service.update(OWNER, SERVER_ID, {
        tools: [{ name: 'create_issue', riskLevel: RiskLevel.READ, enabled: false }],
      });

      expect(repository.updateTool).toHaveBeenCalledWith(SERVER_ID, OWNER, 'create_issue', {
        riskLevel: RiskLevel.READ,
        enabled: false,
      });
    });

    it('writes nothing when one tool in the batch is unknown', async () => {
      const { service, repository } = build();

      await expect(
        service.update(OWNER, SERVER_ID, {
          tools: [
            { name: 'create_issue', enabled: false },
            { name: 'ghost', enabled: true },
          ],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateTool).not.toHaveBeenCalled();
    });
  });
});
