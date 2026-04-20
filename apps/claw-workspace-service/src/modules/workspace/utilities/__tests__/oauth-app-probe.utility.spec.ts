import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { OAuthProbeOutcome } from '../../enums/oauth-probe-outcome.enum';
import { probeOAuthAppCredentials } from '../oauth-app-probe.utility';

describe('probeOAuthAppCredentials', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const interpret = jest.fn();

  const buildRequest = (): { method: 'POST'; headers: Record<string, string>; body: string } => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  it('returns CONNECTED when interpret says credentials_ok', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    }) as never;
    interpret.mockReturnValueOnce(OAuthProbeOutcome.CREDENTIALS_OK);
    const result = await probeOAuthAppCredentials({
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns DISCONNECTED when interpret says credentials_bad', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 401,
      json: () => Promise.resolve({ error: 'invalid_client' }),
    }) as never;
    interpret.mockReturnValueOnce(OAuthProbeOutcome.CREDENTIALS_BAD);
    const result = await probeOAuthAppCredentials({
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
    expect(result.errorMessage).toContain('rejected by provider');
  });

  it('returns UNKNOWN when interpret says unknown', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ status: 500, json: () => Promise.resolve({}) }) as never;
    interpret.mockReturnValueOnce(OAuthProbeOutcome.UNKNOWN);
    const result = await probeOAuthAppCredentials({
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
  });

  it('returns UNKNOWN when fetch throws', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('network down')) as never;
    const result = await probeOAuthAppCredentials({
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
    expect(result.errorMessage).toBe('network down');
  });

  it('treats non-JSON payload as null', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 400,
      json: () => Promise.reject(new Error('not json')),
    }) as never;
    interpret.mockImplementation((payload: unknown) => {
      expect(payload).toBeNull();
      return OAuthProbeOutcome.UNKNOWN;
    });
    const result = await probeOAuthAppCredentials({
      tokenUrl: 'https://example.test/token',
      requestBuilder: buildRequest,
      interpret,
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.UNKNOWN);
  });
});
