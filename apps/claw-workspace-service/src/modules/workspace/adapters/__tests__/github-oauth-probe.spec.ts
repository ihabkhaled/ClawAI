import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { GitHubAdapter } from '../github.adapter';
import { GitHubWriteActionsHelper } from '../github-write-actions.helper';

describe('GitHubAdapter.validateOAuthAppConfig', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const adapter = new GitHubAdapter(new GitHubWriteActionsHelper());
  const creds = { clientId: 'test-id', clientSecret: 'test-secret' };

  it('returns CONNECTED on bad_verification_code (client accepted)', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ error: 'bad_verification_code' }),
    }) as never;
    const result = await adapter.validateOAuthAppConfig(creds);
    expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
  });

  it('returns DISCONNECTED on incorrect_client_credentials', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ error: 'incorrect_client_credentials' }),
    }) as never;
    const result = await adapter.validateOAuthAppConfig(creds);
    expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
  });

  it('throws when clientId missing', async () => {
    await expect(adapter.validateOAuthAppConfig({ clientSecret: 'x' })).rejects.toThrow(
      /clientId and clientSecret/,
    );
  });
});
