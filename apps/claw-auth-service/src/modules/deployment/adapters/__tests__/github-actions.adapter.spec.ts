import { vi } from 'vitest';
import { DeploymentCredentialSource } from '@claw/shared-types';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';

import { AppConfig, type AppConfigType } from '../../../../app/config/app.config';
import { encrypt } from '../../../../common/utilities';
import { type DeploymentCredentialRepository } from '../../repositories/deployment-credential.repository';
import { GithubActionsAdapter } from '../github-actions.adapter';

const KEY = 'a'.repeat(64);

const GITHUB_API = 'https://api.github.com';

// The real value is a literal; the URL-guard tests swap it for a hostile one to
// prove the guard, not the literal, is what keeps the token on api.github.com.
const githubBase = vi.hoisted(() => ({ url: 'https://api.github.com' }));

vi.mock('../../constants/deployment-trigger.constants', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    get GITHUB_API_BASE_URL(): string {
      return githubBase.url;
    },
  };
});

const BASE_CONFIG = {
  ENCRYPTION_KEY: KEY,
  GITHUB_DEPLOY_TOKEN: 'ghp_environment_token',
  GITHUB_DEPLOY_REPOSITORY: 'ihabkhaled/ClawAI',
  GITHUB_DEPLOY_REF: 'main',
} as unknown as AppConfigType;

function mockConfig(overrides: Record<string, string | undefined> = {}): void {
  vi.spyOn(AppConfig, 'get').mockReturnValue({ ...BASE_CONFIG, ...overrides } as AppConfigType);
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
  const fetchMock = vi.fn();
  const find = vi.fn();
  const repository = { find } as unknown as DeploymentCredentialRepository;
  const adapter = (): GithubActionsAdapter => new GithubActionsAdapter(repository);

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    find.mockResolvedValue(null);
  });

  afterEach(() => vi.restoreAllMocks());

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

    const [target, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(target)).toBe(
      'https://api.github.com/repos/ihabkhaled/ClawAI/actions/workflows/deploy-production.yml/dispatches',
    );
    expect(init.method).toBe('POST');
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

  // Both lanes are read on every poll: manual dispatches of deploy-production.yml
  // and release.yml runs, whose `deploy / …` job is the automatic rollout.
  function runJson(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
      status: 'completed',
      conclusion: 'success',
      head_sha: 'a'.repeat(40),
      ...overrides,
      html_url: `https://github.com/ihabkhaled/ClawAI/actions/runs/${String(overrides.id)}`,
    };
  }

  function jobJson(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
      status: 'completed',
      conclusion: 'success',
      html_url: `https://github.com/ihabkhaled/ClawAI/actions/runs/1/job/${String(overrides.id)}`,
      steps: [],
      ...overrides,
    };
  }

  function routeGithub(routes: {
    manual?: Record<string, unknown>[] | null;
    release?: Record<string, unknown>[] | null;
    jobs?: Record<number, Record<string, unknown>[]>;
  }): void {
    fetchMock.mockImplementation(async (input: URL | string) => {
      const url = String(input);
      const ok = (body: unknown): unknown => ({ ok: true, status: 200, json: async () => body });
      if (url.includes('/workflows/deploy-production.yml/runs')) {
        return routes.manual === null
          ? { ok: false, status: 502 }
          : ok({ workflow_runs: routes.manual ?? [] });
      }
      if (url.includes('/workflows/release.yml/runs')) {
        return routes.release === null
          ? { ok: false, status: 502 }
          : ok({ workflow_runs: routes.release ?? [] });
      }
      const jobsMatch = /\/runs\/(\d+)\/jobs/.exec(url);
      const runId = jobsMatch ? Number(jobsMatch[1]) : Number.NaN;
      const jobs = routes.jobs?.[runId];
      return jobs ? ok({ jobs }) : { ok: false, status: 404 };
    });
  }

  function jobReads(): string[] {
    return fetchMock.mock.calls
      .map(([target]) => String(target))
      .filter((url) => url.includes('/jobs'));
  }

  it('reads the latest run with its jobs and names the running step', async () => {
    mockConfig();
    routeGithub({
      manual: [
        runJson({
          id: 32579565369,
          run_number: 1122,
          status: 'in_progress',
          conclusion: null,
          run_started_at: '2026-08-22T14:43:55Z',
          created_at: '2026-08-22T14:43:50Z',
          updated_at: '2026-08-22T14:45:00Z',
          head_commit: { message: 'fix(chat): keep rows mounted\n\nLonger body.' },
        }),
      ],
      jobs: {
        32579565369: [
          jobJson({
            id: 97046795781,
            name: 'Deploy',
            status: 'in_progress',
            conclusion: null,
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
          }),
        ],
      },
    });

    const run = await adapter().latestRun();

    expect(run).toMatchObject({
      id: 32579565369,
      runNumber: 1122,
      triggerSource: 'manual',
      commitTitle: 'fix(chat): keep rows mounted',
      currentStep: { jobName: 'Deploy', stepName: 'Deploy over SSH' },
      failedStep: null,
    });
    expect(run?.jobs[0]?.steps).toHaveLength(2);
  });

  it('shows an automatic release run that is newer than the last manual dispatch', async () => {
    mockConfig();
    routeGithub({
      manual: [runJson({ id: 21, run_number: 21, created_at: '2026-09-17T09:35:07Z' })],
      release: [
        runJson({
          id: 730,
          run_number: 730,
          created_at: '2026-09-24T16:17:29Z',
          head_sha: 'c'.repeat(40),
        }),
      ],
      jobs: {
        730: [
          jobJson({ id: 1, name: 'Bump version and publish release' }),
          jobJson({ id: 2, name: `deploy / Deploy ${'d'.repeat(40)}` }),
        ],
        21: [jobJson({ id: 3, name: 'Deploy' })],
      },
    });

    const run = await adapter().latestRun();

    expect(run).toMatchObject({ id: 730, triggerSource: 'auto', headSha: 'c'.repeat(40) });
    expect(jobReads()).toHaveLength(1);
  });

  it('shows only the deploy jobs of a release run, never the version-bump job', async () => {
    mockConfig();
    routeGithub({
      release: [runJson({ id: 730, run_number: 730, created_at: '2026-09-24T16:17:29Z' })],
      jobs: {
        730: [
          jobJson({
            id: 1,
            name: 'Bump version and publish release',
            steps: [
              { number: 1, name: 'Bump version', status: 'completed', conclusion: 'success' },
            ],
          }),
          jobJson({
            id: 2,
            name: `deploy / Deploy ${'d'.repeat(40)}`,
            status: 'in_progress',
            conclusion: null,
            steps: [
              { number: 1, name: 'Deploy over SSH', status: 'in_progress', conclusion: null },
            ],
          }),
        ],
      },
    });

    const run = await adapter().latestRun();

    expect(run?.jobs.map((job) => job.name)).toEqual([`deploy / Deploy ${'d'.repeat(40)}`]);
    expect(run?.currentStep).toMatchObject({ stepName: 'Deploy over SSH' });
  });

  it('prefers an in-progress run over a newer finished one', async () => {
    mockConfig();
    routeGithub({
      manual: [
        runJson({
          id: 22,
          run_number: 22,
          status: 'in_progress',
          conclusion: null,
          created_at: '2026-09-24T10:00:00Z',
        }),
      ],
      release: [runJson({ id: 731, run_number: 731, created_at: '2026-09-24T12:00:00Z' })],
      jobs: {
        22: [jobJson({ id: 5, name: 'Deploy', status: 'in_progress', conclusion: null })],
        731: [jobJson({ id: 6, name: `deploy / Deploy ${'e'.repeat(40)}` })],
      },
    });

    await expect(adapter().latestRun()).resolves.toMatchObject({
      id: 22,
      triggerSource: 'manual',
    });
  });

  it('skips release runs that deployed nothing and falls back to the newest real rollout', async () => {
    mockConfig();
    routeGithub({
      manual: [runJson({ id: 21, run_number: 21, created_at: '2026-09-17T09:35:07Z' })],
      release: [
        // CI failed: GitHub skipped the whole run, so it is never probed.
        runJson({
          id: 733,
          run_number: 733,
          conclusion: 'skipped',
          created_at: '2026-09-24T18:00:00Z',
        }),
        // Released nothing: the deploy call is a bare, skipped `deploy` job.
        runJson({ id: 732, run_number: 732, created_at: '2026-09-24T17:00:00Z' }),
        runJson({ id: 730, run_number: 730, created_at: '2026-09-24T16:17:29Z' }),
      ],
      jobs: {
        732: [
          jobJson({ id: 7, name: 'Bump version and publish release' }),
          jobJson({ id: 8, name: 'deploy', conclusion: 'skipped' }),
        ],
        730: [jobJson({ id: 9, name: `deploy / Deploy ${'d'.repeat(40)}` })],
      },
    });

    await expect(adapter().latestRun()).resolves.toMatchObject({ id: 730, triggerSource: 'auto' });
    expect(jobReads().some((url) => url.includes('/runs/733/'))).toBe(false);
  });

  it('shows a release run that is still preparing before its deploy job exists', async () => {
    mockConfig();
    routeGithub({
      manual: [runJson({ id: 21, run_number: 21, created_at: '2026-09-17T09:35:07Z' })],
      release: [
        runJson({
          id: 734,
          run_number: 734,
          status: 'in_progress',
          conclusion: null,
          created_at: '2026-09-24T19:00:00Z',
        }),
      ],
      jobs: {
        734: [
          jobJson({
            id: 10,
            name: 'Bump version and publish release',
            status: 'in_progress',
            conclusion: null,
          }),
        ],
      },
    });

    const run = await adapter().latestRun();

    expect(run).toMatchObject({ id: 734, triggerSource: 'auto' });
    expect(run?.jobs.map((job) => job.name)).toEqual(['Bump version and publish release']);
  });

  it('stops probing after a bounded number of job reads', async () => {
    mockConfig();
    const ids = [740, 741, 742, 743, 744];
    const idle = ids.map((id, index) =>
      runJson({ id, run_number: id, created_at: `2026-09-24T1${String(index)}:00:00Z` }),
    );
    const idleJobs = Object.fromEntries(
      ids.map((id) => [id, [jobJson({ id, name: 'deploy', conclusion: 'skipped' })]]),
    );
    routeGithub({ release: idle, jobs: idleJobs });

    await expect(adapter().latestRun()).resolves.toBeNull();
    expect(jobReads()).toHaveLength(3);
  });

  it('reports nothing rather than an older run when the best run cannot be read', async () => {
    mockConfig();
    routeGithub({
      manual: [runJson({ id: 21, run_number: 21, created_at: '2026-09-17T09:35:07Z' })],
      release: [runJson({ id: 730, run_number: 730, created_at: '2026-09-24T16:17:29Z' })],
      jobs: { 21: [jobJson({ id: 3, name: 'Deploy' })] },
    });

    await expect(adapter().latestRun()).resolves.toBeNull();
  });

  it('still reads the other lane when one lane cannot be listed', async () => {
    mockConfig();
    routeGithub({
      manual: null,
      release: [runJson({ id: 730, run_number: 730, created_at: '2026-09-24T16:17:29Z' })],
      jobs: { 730: [jobJson({ id: 2, name: `deploy / Deploy ${'d'.repeat(40)}` })] },
    });

    await expect(adapter().latestRun()).resolves.toMatchObject({ id: 730 });
  });

  it('names the FIRST failed step, which is the one whose log explains the run', async () => {
    mockConfig();
    routeGithub({
      manual: [runJson({ id: 1, run_number: 2, conclusion: 'failure', head_sha: 'b'.repeat(40) })],
      jobs: {
        1: [
          jobJson({
            id: 2,
            name: 'Deploy',
            conclusion: 'failure',
            steps: [
              { number: 1, name: 'Configure SSH', status: 'completed', conclusion: 'success' },
              { number: 2, name: 'Deploy over SSH', status: 'completed', conclusion: 'failure' },
              { number: 3, name: 'Publish summary', status: 'completed', conclusion: 'failure' },
            ],
          }),
        ],
      },
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

// TD-040. Every GitHub call carries the deploy token, so its URL is checked
// before it is sent. The first two tests run with a CI-shaped environment — a
// GitHub runner defines `*_ENDPOINT` variables, which makes the host check
// ENFORCE rather than stand down — so they prove api.github.com is still
// reachable, not merely that the check was skipped.
describe('GithubActionsAdapter outbound URL guard', () => {
  const fetchMock = vi.fn();
  const repository = {
    find: vi.fn().mockResolvedValue(null),
  } as unknown as DeploymentCredentialRepository;
  const adapter = (): GithubActionsAdapter => new GithubActionsAdapter(repository);

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    mockConfig();
  });

  afterEach(() => {
    githubBase.url = GITHUB_API;
    vi.unstubAllEnvs();
    resetInternalHostAllowlist();
    vi.restoreAllMocks();
  });

  function enforceLikeCi(): void {
    vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
    resetInternalHostAllowlist();
  }

  it('dispatches to api.github.com with enforcement on, and never follows a redirect', async () => {
    enforceLikeCi();

    await adapter().dispatch({ ref: 'main', targetSha: null });

    const [target, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(new URL(String(target)).host).toBe('api.github.com');
    expect(init.redirect).toBe('error');
  });

  it('reads run progress from api.github.com with enforcement on, and never follows a redirect', async () => {
    enforceLikeCi();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ workflow_runs: [] }),
    });

    await expect(adapter().latestRun()).resolves.toBeNull();

    const [target, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(new URL(String(target)).host).toBe('api.github.com');
    expect(init.redirect).toBe('error');
  });

  it.each([
    ['a file: URL', 'file:///etc'],
    ['embedded credentials', 'https://user:pass@api.github.com'],
    ['the cloud metadata address', 'http://169.254.169.254'],
  ])('refuses %s before the token is sent', async (_label, hostile) => {
    githubBase.url = hostile;

    await expect(adapter().dispatch({ ref: 'main', targetSha: null })).rejects.toMatchObject({
      code: 'DEPLOYMENT_TRIGGER_UNREACHABLE',
    });
    await expect(adapter().latestRun()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
