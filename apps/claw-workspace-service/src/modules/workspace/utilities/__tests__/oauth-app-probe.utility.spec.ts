import { vi } from 'vitest';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { OAuthProbeOutcome } from '../../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../oauth-app-probe.utility';

describe('probeOAuthAppCredentials', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetInternalHostAllowlist();
    vi.restoreAllMocks();
  });

  const interpret = vi.fn();

  const buildRequest = (): { method: 'POST'; headers: Record<string, string>; body: string } => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  it('returns CONNECTED when interpret says credentials_ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    }) as never;
    interpret.mockReturnValueOnce(OAuthProbeOutcome.CREDENTIALS_OK);
    const result = await probeOAuthAppCredentials({
      declaredBase: 'https://example.test',
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns DISCONNECTED when interpret says credentials_bad', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: () => Promise.resolve({ error: 'invalid_client' }),
    }) as never;
    interpret.mockReturnValueOnce(OAuthProbeOutcome.CREDENTIALS_BAD);
    const result = await probeOAuthAppCredentials({
      declaredBase: 'https://example.test',
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
    expect(result.errorMessage).toContain('rejected by provider');
  });

  it('returns UNKNOWN when interpret says unknown', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ status: 500, json: () => Promise.resolve({}) }) as never;
    interpret.mockReturnValueOnce(OAuthProbeOutcome.UNKNOWN);
    const result = await probeOAuthAppCredentials({
      declaredBase: 'https://example.test',
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
  });

  it('returns UNKNOWN when fetch throws', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down')) as never;
    const result = await probeOAuthAppCredentials({
      declaredBase: 'https://example.test',
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
    expect(result.errorMessage).toBe('network down');
  });

  it('treats non-JSON payload as null', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: () => Promise.reject(new Error('not json')),
    }) as never;
    interpret.mockImplementation((payload: unknown) => {
      expect(payload).toBeNull();
      return OAuthProbeOutcome.UNKNOWN;
    });
    const result = await probeOAuthAppCredentials({
      declaredBase: 'https://example.test',
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
  });
  // TD-040: the probe sends the client secret, so its URL goes through the
  // guarded door — declared host only, no redirects, refusal before any I/O.
  describe('outbound URL guard', () => {
    it('sends to the declared token host with redirects refused', async () => {
      vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
      resetInternalHostAllowlist();
      const fetchMock = vi.fn().mockResolvedValue({ status: 400, json: () => Promise.resolve({}) });
      vi.stubGlobal('fetch', fetchMock);
      interpret.mockReturnValueOnce(OAuthProbeOutcome.CREDENTIALS_OK);
      const result = await probeOAuthAppCredentials({
        declaredBase: 'https://example.test',
        tokenUrl: 'https://example.test/token',
        requestBuilder: buildRequest,
        interpret,
      });
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
      const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(new URL(target).host).toBe('example.test');
      expect(init.redirect).toBe('error');
    });

    it('refuses a token URL off the declared host before any network call', async () => {
      vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
      resetInternalHostAllowlist();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const result = await probeOAuthAppCredentials({
        declaredBase: 'https://example.test',
        tokenUrl: 'https://attacker.example/token',
        requestBuilder: buildRequest,
        interpret,
      });
      expect(result.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
      expect(result.errorMessage).toContain('attacker.example');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
