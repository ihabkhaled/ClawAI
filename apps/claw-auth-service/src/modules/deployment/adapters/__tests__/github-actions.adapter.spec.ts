import { AppConfig, type AppConfigType } from '../../../../app/config/app.config';
import { GithubActionsAdapter } from '../github-actions.adapter';

const BASE_CONFIG = {
  GITHUB_DEPLOY_TOKEN: 'ghp_token',
  GITHUB_DEPLOY_REPOSITORY: 'ihabkhaled/ClawAI',
  GITHUB_DEPLOY_REF: 'main',
} as unknown as AppConfigType;

function mockConfig(overrides: Record<string, string | undefined> = {}): void {
  jest.spyOn(AppConfig, 'get').mockReturnValue({ ...BASE_CONFIG, ...overrides } as AppConfigType);
}

describe('GithubActionsAdapter', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
  });

  afterEach(() => jest.restoreAllMocks());

  it('is enabled only when the whole credential set is present and well formed', () => {
    mockConfig();
    expect(new GithubActionsAdapter().isEnabled()).toBe(true);

    for (const partial of [
      { GITHUB_DEPLOY_TOKEN: undefined },
      { GITHUB_DEPLOY_REPOSITORY: undefined },
      { GITHUB_DEPLOY_REF: undefined },
      { GITHUB_DEPLOY_TOKEN: '   ' },
      { GITHUB_DEPLOY_REPOSITORY: 'not-a-repository' },
      { GITHUB_DEPLOY_REF: 'refs/heads/main space' },
    ]) {
      mockConfig(partial);
      expect(new GithubActionsAdapter().isEnabled()).toBe(false);
    }
  });

  it('exposes no ref or workflow url while unconfigured', () => {
    mockConfig({ GITHUB_DEPLOY_TOKEN: undefined });
    const adapter = new GithubActionsAdapter();

    expect(adapter.defaultRef()).toBeNull();
    expect(adapter.workflowUrl()).toBeNull();
  });

  it('points at the production deployment workflow of the configured repository', () => {
    mockConfig();

    expect(new GithubActionsAdapter().workflowUrl()).toBe(
      'https://github.com/ihabkhaled/ClawAI/actions/workflows/deploy-production.yml',
    );
  });

  it('dispatches the workflow with the target sha and a manual trigger source', async () => {
    mockConfig();

    await new GithubActionsAdapter().dispatch({ ref: 'main', targetSha: 'a'.repeat(40) });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/ihabkhaled/ClawAI/actions/workflows/deploy-production.yml/dispatches',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      ref: 'main',
      inputs: { target_sha: 'a'.repeat(40), trigger_source: 'manual' },
    });
  });

  it('sends an empty target sha when the ref head should be resolved by GitHub', async () => {
    mockConfig();

    await new GithubActionsAdapter().dispatch({ ref: 'main', targetSha: null });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).inputs.target_sha).toBe('');
  });

  it('never puts the token in the thrown message when GitHub rejects the dispatch', async () => {
    mockConfig();
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const failure = new GithubActionsAdapter()
      .dispatch({ ref: 'main', targetSha: null })
      .catch((error: unknown) => error);

    await expect(failure).resolves.toMatchObject({ code: 'DEPLOYMENT_TRIGGER_REJECTED' });
    expect(JSON.stringify(await failure)).not.toContain('ghp_token');
  });

  it('reports an unreachable GitHub without leaking the request', async () => {
    mockConfig();
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.github.com'));

    await expect(
      new GithubActionsAdapter().dispatch({ ref: 'main', targetSha: null }),
    ).rejects.toMatchObject({ code: 'DEPLOYMENT_TRIGGER_UNREACHABLE' });
  });

  it('refuses to dispatch while unconfigured', async () => {
    mockConfig({ GITHUB_DEPLOY_REPOSITORY: undefined });

    await expect(
      new GithubActionsAdapter().dispatch({ ref: 'main', targetSha: null }),
    ).rejects.toMatchObject({ code: 'DEPLOYMENT_TRIGGER_UNAVAILABLE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
