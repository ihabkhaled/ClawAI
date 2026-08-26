import { DeploymentCredentialSource } from '@claw/shared-types';

import { AppConfig, type AppConfigType } from '../../../../app/config/app.config';
import { encrypt } from '../../../../common/utilities';
import { type DeploymentCredentialRepository } from '../../repositories/deployment-credential.repository';
import { GithubActionsAdapter } from '../github-actions.adapter';

const KEY = 'a'.repeat(64);

const BASE_CONFIG = {
  ENCRYPTION_KEY: KEY,
  GITHUB_DEPLOY_TOKEN: 'ghp_environment_token',
  GITHUB_DEPLOY_REPOSITORY: 'ihabkhaled/ClawAI',
  GITHUB_DEPLOY_REF: 'main',
} as unknown as AppConfigType;

function mockConfig(overrides: Record<string, string | undefined> = {}): void {
  jest.spyOn(AppConfig, 'get').mockReturnValue({ ...BASE_CONFIG, ...overrides } as AppConfigType);
}

function storedRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'production',
    repository: 'ihabkhaled/ClawAI',
    ref: 'main',
    encryptedToken: encrypt('ghp_stored_token_value', KEY),
    tokenLastFour: 'alue',
    encryptionKeyVersion: 1,
    updatedByUserId: 'super-admin',
    createdAt: new Date('2026-08-13T10:00:00Z'),
    updatedAt: new Date('2026-08-13T10:29:58Z'),
    ...overrides,
  };
}

describe('GithubActionsAdapter', () => {
  const fetchMock = jest.fn();
  const find = jest.fn();
  const repository = { find } as unknown as DeploymentCredentialRepository;
  const adapter = (): GithubActionsAdapter => new GithubActionsAdapter(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    find.mockResolvedValue(null);
  });

  afterEach(() => jest.restoreAllMocks());

  it('prefers the stored credentials over the environment', async () => {
    mockConfig();
    find.mockResolvedValue(storedRow({ repository: 'ihabkhaled/Other', ref: 'release' }));

    await expect(adapter().resolve()).resolves.toMatchObject({
      repository: 'ihabkhaled/Other',
      ref: 'release',
      source: DeploymentCredentialSource.DATABASE,
      tokenLastFour: 'alue',
    });
  });

  it('falls back to the environment when nothing is stored', async () => {
    mockConfig();

    await expect(adapter().resolve()).resolves.toMatchObject({
      repository: 'ihabkhaled/ClawAI',
      source: DeploymentCredentialSource.ENVIRONMENT,
      tokenLastFour: 'oken',
      updatedAt: null,
    });
  });

  it('resolves nothing when neither source is whole', async () => {
    for (const partial of [
      { GITHUB_DEPLOY_TOKEN: undefined },
      { GITHUB_DEPLOY_REPOSITORY: undefined },
      { GITHUB_DEPLOY_REF: undefined },
      { GITHUB_DEPLOY_TOKEN: '   ' },
      { GITHUB_DEPLOY_REPOSITORY: 'not-a-repository' },
      { GITHUB_DEPLOY_REF: 'refs/heads/main space' },
    ]) {
      mockConfig(partial);
      await expect(adapter().resolve()).resolves.toBeNull();
    }
  });

  it('ignores a stored row whose target no longer validates', async () => {
    mockConfig({ GITHUB_DEPLOY_TOKEN: undefined });
    find.mockResolvedValue(storedRow({ repository: 'not-a-repository' }));

    await expect(adapter().resolve()).resolves.toBeNull();
  });

  it('ignores a stored token that will not decrypt under the current key', async () => {
    mockConfig({ GITHUB_DEPLOY_TOKEN: undefined });
    find.mockResolvedValue(storedRow({ encryptedToken: encrypt('token', 'b'.repeat(64)) }));

    await expect(adapter().resolve()).resolves.toBeNull();
  });

  it('points at the production deployment workflow of a repository', () => {
    mockConfig();

    expect(adapter().workflowUrl('ihabkhaled/ClawAI')).toBe(
      'https://github.com/ihabkhaled/ClawAI/actions/workflows/deploy-production.yml',
    );
  });

  it('dispatches the workflow with the target sha and a manual trigger source', async () => {
    mockConfig();

    await adapter().dispatch({ ref: 'main', targetSha: 'a'.repeat(40) });

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

  it('sends an empty target sha when GitHub should resolve the ref head', async () => {
    mockConfig();

    await adapter().dispatch({ ref: 'main', targetSha: null });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).inputs.target_sha).toBe('');
  });

  it('never puts the token in the thrown message when GitHub rejects the dispatch', async () => {
    mockConfig();
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const failure = adapter()
      .dispatch({ ref: 'main', targetSha: null })
      .catch((error: unknown) => error);

    await expect(failure).resolves.toMatchObject({ code: 'DEPLOYMENT_TRIGGER_REJECTED' });
    expect(JSON.stringify(await failure)).not.toContain('ghp_environment_token');
  });

  it('reports an unreachable GitHub without leaking the request', async () => {
    mockConfig();
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.github.com'));

    await expect(adapter().dispatch({ ref: 'main', targetSha: null })).rejects.toMatchObject({
      code: 'DEPLOYMENT_TRIGGER_UNREACHABLE',
    });
  });

  it('refuses to dispatch while unconfigured', async () => {
    mockConfig({ GITHUB_DEPLOY_REPOSITORY: undefined });

    await expect(adapter().dispatch({ ref: 'main', targetSha: null })).rejects.toMatchObject({
      code: 'DEPLOYMENT_TRIGGER_UNAVAILABLE',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the latest run with its jobs and names the running step', async () => {
    mockConfig();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          workflow_runs: [
            {
              id: 32579565369,
              run_number: 1122,
              status: 'in_progress',
              conclusion: null,
              html_url: 'https://github.com/ihabkhaled/ClawAI/actions/runs/32579565369',
              head_sha: 'a'.repeat(40),
              run_started_at: '2026-08-22T14:43:55Z',
              updated_at: '2026-08-22T14:45:00Z',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jobs: [
            {
              id: 97046795781,
              name: 'Deploy',
              status: 'in_progress',
              conclusion: null,
              html_url: 'https://github.com/ihabkhaled/ClawAI/actions/runs/1/job/2',
              started_at: '2026-08-22T14:43:57Z',
              completed_at: null,
              steps: [
                {
                  number: 1,
                  name: 'Configure SSH',
                  status: 'completed',
                  conclusion: 'success',
                  started_at: '2026-08-22T14:43:57Z',
                  completed_at: '2026-08-22T14:43:59Z',
                },
                {
                  number: 2,
                  name: 'Deploy over SSH',
                  status: 'in_progress',
                  conclusion: null,
                  started_at: '2026-08-22T14:43:59Z',
                  completed_at: null,
                },
              ],
            },
          ],
        }),
      });

    const run = await adapter().latestRun();

    expect(run).toMatchObject({
      id: 32579565369,
      runNumber: 1122,
      currentStep: { jobName: 'Deploy', stepName: 'Deploy over SSH' },
      failedStep: null,
    });
    expect(run?.jobs[0]?.steps).toHaveLength(2);
  });

  it('names the FIRST failed step, which is the one whose log explains the run', async () => {
    mockConfig();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          workflow_runs: [
            {
              id: 1,
              run_number: 2,
              status: 'completed',
              conclusion: 'failure',
              html_url: 'https://github.com/ihabkhaled/ClawAI/actions/runs/1',
              head_sha: 'b'.repeat(40),
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jobs: [
            {
              id: 2,
              name: 'Deploy',
              status: 'completed',
              conclusion: 'failure',
              html_url: 'https://github.com/ihabkhaled/ClawAI/actions/runs/1/job/2',
              steps: [
                { number: 1, name: 'Configure SSH', status: 'completed', conclusion: 'success' },
                { number: 2, name: 'Deploy over SSH', status: 'completed', conclusion: 'failure' },
                { number: 3, name: 'Publish summary', status: 'completed', conclusion: 'failure' },
              ],
            },
          ],
        }),
      });

    await expect(adapter().latestRun()).resolves.toMatchObject({
      failedStep: { jobName: 'Deploy', stepName: 'Deploy over SSH' },
      currentStep: null,
    });
  });

  it('degrades to null instead of throwing when a progress read fails', async () => {
    mockConfig();
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(adapter().latestRun()).resolves.toBeNull();
  });

  it('degrades to null when GitHub returns an unexpected shape', async () => {
    mockConfig();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ nope: true }) });

    await expect(adapter().latestRun()).resolves.toBeNull();
  });

  it('reads no run at all while unconfigured', async () => {
    mockConfig({ GITHUB_DEPLOY_TOKEN: undefined });

    await expect(adapter().latestRun()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
