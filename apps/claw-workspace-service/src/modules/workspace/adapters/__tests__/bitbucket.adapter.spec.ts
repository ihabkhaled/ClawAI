import { BitbucketAdapter } from '../bitbucket.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('BitbucketAdapter', () => {
  let adapter: BitbucketAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new BitbucketAdapter();
  });

  describe('healthCheck', () => {
    it('should return CONNECTED on 200 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await adapter.healthCheck('token-abc');
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
    });

    it('should return DISCONNECTED on 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
      const result = await adapter.healthCheck('bad-token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toContain('Unauthorized');
    });

    it('should return DEGRADED on non-401 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DEGRADED);
      expect(result.errorMessage).toBe('HTTP 503');
    });

    it('should return DISCONNECTED on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('ECONNREFUSED');
    });
  });

  describe('getCapabilities', () => {
    it('supports OAuth only, not PAT', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsOAuth).toBe(true);
      expect(caps.supportsPat).toBe(false);
    });

    it('supports webhooks but not delta sync', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsWebhooks).toBe(true);
      expect(caps.supportsDeltaSync).toBe(false);
    });

    it('includes REPOSITORY and PULL_REQUEST in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['REPOSITORY', 'PULL_REQUEST']);
    });
  });

  describe('supportsPkce', () => {
    it('is false — Bitbucket OAuth2 rejects code_challenge with HTTP 400', () => {
      expect(adapter.supportsPkce()).toBe(false);
    });
  });

  describe('getDefaultScopes', () => {
    it('returns a non-empty array', () => {
      expect(adapter.getDefaultScopes().length).toBeGreaterThan(0);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('exchanges a code for tokens via Basic auth', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          scopes: 'repository account',
        }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('at');
      expect(tokens.scopes).toEqual(['repository', 'account']);
      const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['Authorization']).toMatch(/^Basic /);
    });

    it('throws when app credentials are missing', async () => {
      await expect(
        adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {}),
      ).rejects.toThrow(/clientId and clientSecret/);
    });

    it('throws on a non-ok token response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' }),
      });
      await expect(
        adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {
          clientId: 'id',
          clientSecret: 'secret',
        }),
      ).rejects.toThrow();
    });
  });

  describe('refreshTokens', () => {
    it('refreshes and normalizes the token response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'at2', expires_in: 3600 }),
      });
      const tokens = await adapter.refreshTokens('rt', { clientId: 'id', clientSecret: 'secret' });
      expect(tokens.accessToken).toBe('at2');
    });

    it('throws when app credentials are missing', async () => {
      await expect(adapter.refreshTokens('rt', {})).rejects.toThrow(/clientId and clientSecret/);
    });
  });

  describe('syncObjects', () => {
    const repo = (overrides: Record<string, unknown> = {}) => ({
      uuid: '{repo-1}',
      full_name: 'acme/backend',
      description: 'Backend service',
      links: { html: { href: 'https://bitbucket.org/acme/backend' } },
      owner: { username: 'acme' },
      created_on: '2026-01-01T00:00:00Z',
      updated_on: '2026-01-02T00:00:00Z',
      is_private: true,
      mainbranch: { name: 'main' },
      ...overrides,
    });

    const pr = (overrides: Record<string, unknown> = {}) => ({
      id: 42,
      title: 'Fix bug',
      description: 'details',
      state: 'OPEN',
      links: { html: { href: 'https://bitbucket.org/acme/backend/pull-requests/42' } },
      author: { username: 'alice' },
      created_on: '2026-01-03T00:00:00Z',
      updated_on: '2026-01-04T00:00:00Z',
      ...overrides,
    });

    it('walks workspaces → repos → PRs for the first 3 repos', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [{ slug: 'acme' }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [repo()] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [pr()] }) });

      const result = await adapter.syncObjects('token');

      expect(result.objects).toEqual([
        expect.objectContaining({
          externalId: '{repo-1}',
          type: 'REPOSITORY',
          title: 'acme/backend',
        }),
        expect.objectContaining({ externalId: '42', type: 'PULL_REQUEST', title: 'Fix bug' }),
      ]);
    });

    it('returns an empty repo list when the account has no workspaces (410)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 410 });
      const result = await adapter.syncObjects('token');
      expect(result.objects).toEqual([]);
    });

    it('throws when the workspaces fetch fails with a non-410 error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(adapter.syncObjects('token')).rejects.toThrow(/HTTP 500/);
    });

    it('skips a workspace whose repo fetch fails, without aborting the whole sync', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ values: [{ slug: 'bad-ws' }, { slug: 'good-ws' }] }),
        })
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [repo()] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [] }) });

      const result = await adapter.syncObjects('token');
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0]?.externalId).toBe('{repo-1}');
    });

    // Fault-isolation regression: a PR-fetch failure for one repo must not
    // lose repos already collected, matching GitHub's safeFetchIssues and
    // the fix Phase 13 applied to ClickUp.
    it('tolerates a failed PR fetch for one repo without losing the repo objects', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [{ slug: 'acme' }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [repo()] }) })
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await adapter.syncObjects('token');
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0]?.type).toBe('REPOSITORY');
    });

    it('tolerates a thrown network error during PR fetch without aborting', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [{ slug: 'acme' }] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [repo()] }) })
        .mockRejectedValueOnce(new Error('ECONNRESET'));

      const result = await adapter.syncObjects('token');
      expect(result.objects).toHaveLength(1);
    });
  });

  describe('fetchObjectDetails', () => {
    it('REPOSITORY — resolves by fullName metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          uuid: '{repo-1}',
          full_name: 'acme/backend',
          description: 'desc',
          links: { html: { href: 'https://bitbucket.org/acme/backend' } },
          owner: { username: 'acme' },
          created_on: '2026-01-01T00:00:00Z',
          updated_on: '2026-01-02T00:00:00Z',
        }),
      });
      const live = await adapter.fetchObjectDetails('token', '{repo-1}', 'REPOSITORY', {
        fullName: 'acme/backend',
      });
      expect(live?.title).toBe('acme/backend');
    });

    it('REPOSITORY — returns null when fullName metadata is missing', async () => {
      const live = await adapter.fetchObjectDetails('token', '{repo-1}', 'REPOSITORY');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('REPOSITORY — returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', 'missing', 'REPOSITORY', {
        fullName: 'acme/missing',
      });
      expect(live).toBeNull();
    });

    it('REPOSITORY — throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(
        adapter.fetchObjectDetails('token', '{repo-1}', 'REPOSITORY', { fullName: 'acme/backend' }),
      ).rejects.toThrow(/HTTP 500/);
    });

    it('PULL_REQUEST — resolves by fullName + prId metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 42,
          title: 'Fix bug',
          description: 'details',
          state: 'OPEN',
          links: { html: { href: 'https://bitbucket.org/acme/backend/pull-requests/42' } },
          author: { username: 'alice' },
          created_on: '2026-01-03T00:00:00Z',
          updated_on: '2026-01-04T00:00:00Z',
        }),
      });
      const live = await adapter.fetchObjectDetails('token', '42', 'PULL_REQUEST', {
        fullName: 'acme/backend',
        prId: 42,
      });
      expect(live?.title).toBe('Fix bug');
    });

    it('PULL_REQUEST — returns null when fullName/prId metadata is missing', async () => {
      const live = await adapter.fetchObjectDetails('token', '42', 'PULL_REQUEST');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('PULL_REQUEST — returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', '42', 'PULL_REQUEST', {
        fullName: 'acme/backend',
        prId: 42,
      });
      expect(live).toBeNull();
    });

    it('returns null for an unrecognized object type', async () => {
      const live = await adapter.fetchObjectDetails('token', 'x', 'TICKET');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('write actions', () => {
    describe('CREATE_PR_COMMENT_BB', () => {
      it('posts a raw-content comment to the PR comments endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            id: 1,
            links: { html: { href: 'https://bitbucket.org/comment/1' } },
          }),
        });
        const result = await adapter.executeWriteAction('token', 'CREATE_PR_COMMENT_BB', {
          workspace: 'acme',
          repo: 'backend',
          prId: '42',
          body: 'Looks good',
        });
        expect(result).toEqual({
          success: true,
          externalId: '1',
          url: 'https://bitbucket.org/comment/1',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/repositories/acme/backend/pullrequests/42/comments');
        expect(JSON.parse(init.body as string)).toEqual({ content: { raw: 'Looks good' } });
      });
    });

    describe('APPROVE_PR_BB', () => {
      it('posts to the PR approve endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
        await adapter.executeWriteAction('token', 'APPROVE_PR_BB', {
          workspace: 'acme',
          repo: 'backend',
          prId: '42',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/pullrequests/42/approve');
        expect(init.method).toBe('POST');
      });
    });

    describe('CREATE_BITBUCKET_ISSUE', () => {
      it('posts title+description to the issues endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 7, links: { html: { href: 'https://bitbucket.org/issue/7' } } }),
        });
        const result = await adapter.executeWriteAction('token', 'CREATE_BITBUCKET_ISSUE', {
          workspace: 'acme',
          repo: 'backend',
          title: 'Bug',
          description: 'It breaks',
        });
        expect(result.success).toBe(true);
        const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(JSON.parse(init.body as string)).toEqual({
          title: 'Bug',
          content: { raw: 'It breaks' },
        });
      });
    });

    it('returns success:false with the API error on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });
      const result = await adapter.executeWriteAction('token', 'APPROVE_PR_BB', {
        workspace: 'acme',
        repo: 'backend',
        prId: '42',
      });
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('400');
    });

    it('returns success:false for an unsupported action type', async () => {
      const result = await adapter.executeWriteAction('token', 'DELETE_REPO_BB', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not supported');
    });

    it('catches a thrown error from the dispatched handler', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
      const result = await adapter.executeWriteAction('token', 'APPROVE_PR_BB', {
        workspace: 'acme',
        repo: 'backend',
        prId: '42',
      });
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('network down');
    });
  });

  describe('supportsWrite / getSupportedActionTypes', () => {
    it('supports write actions', () => {
      expect(adapter.supportsWrite()).toBe(true);
    });

    it('lists the 3 supported action types', () => {
      expect(adapter.getSupportedActionTypes()).toEqual(
        expect.arrayContaining(['CREATE_PR_COMMENT_BB', 'APPROVE_PR_BB', 'CREATE_BITBUCKET_ISSUE']),
      );
    });
  });
});
