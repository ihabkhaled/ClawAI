import { ClickUpAdapter } from '../clickup.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('ClickUpAdapter', () => {
  let adapter: ClickUpAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ClickUpAdapter();
  });

  describe('healthCheck', () => {
    it('should return CONNECTED on 200 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await adapter.healthCheck('token-abc');
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return DISCONNECTED on 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
      const result = await adapter.healthCheck('bad-token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('Unauthorized');
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

    it('does not support delta sync or webhooks', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsDeltaSync).toBe(false);
      expect(caps.supportsWebhooks).toBe(false);
    });

    it('includes TICKET in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['TICKET']);
    });
  });

  describe('getDefaultScopes', () => {
    it('returns a non-empty array', () => {
      const scopes = adapter.getDefaultScopes();
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
    });
  });

  describe('refreshTokens', () => {
    it('throws since ClickUp tokens do not expire', async () => {
      await expect(
        adapter.refreshTokens('ref', { clientId: 'x', clientSecret: 'y' }),
      ).rejects.toThrow(/do not expire/);
    });

    it('throws when app credentials are missing', async () => {
      await expect(adapter.refreshTokens('ref', {})).rejects.toThrow(/clientId and clientSecret/);
    });
  });

  describe('syncObjects', () => {
    const task = (overrides: Record<string, unknown> = {}) => ({
      id: 't1',
      name: 'Fix bug',
      text_content: 'details',
      description: null,
      status: { status: 'open' },
      url: 'https://app.clickup.com/t/t1',
      creator: { username: 'alice' },
      date_created: '1700000000000',
      date_updated: '1700000100000',
      ...overrides,
    });

    it('walks teams → spaces → lists → tasks and maps every task', async () => {
      (global.fetch as jest.Mock)
        // team
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 'team1', name: 'Eng' }] }),
        })
        // space
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ spaces: [{ id: 'space1', name: 'Backend' }] }),
        })
        // list
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [{ id: 'list1', name: 'Sprint' }] }),
        })
        // tasks
        .mockResolvedValueOnce({ ok: true, json: async () => ({ tasks: [task()] }) });

      const result = await adapter.syncObjects('token');

      expect(result.objectsFound).toBe(1);
      expect(result.objects).toEqual([
        expect.objectContaining({
          externalId: 't1',
          type: 'TICKET',
          title: 'Fix bug',
          authorId: 'alice',
          metadata: expect.objectContaining({
            status: 'open',
            listId: 'list1',
            listName: 'Sprint',
            teamName: 'Eng',
          }),
        }),
      ]);
    });

    it('returns no objects when a team has no spaces', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 'team1', name: 'Eng' }] }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ spaces: [] }) });

      const result = await adapter.syncObjects('token');
      expect(result.objects).toEqual([]);
    });

    it('tolerates a failed task fetch for one list without losing sibling lists', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 'team1', name: 'Eng' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ spaces: [{ id: 'space1', name: 'Backend' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            lists: [
              { id: 'list-bad', name: 'Broken' },
              { id: 'list-good', name: 'Healthy' },
            ],
          }),
        })
        // list-bad tasks: HTTP failure
        .mockResolvedValueOnce({ ok: false, status: 500 })
        // list-good tasks: succeeds
        .mockResolvedValueOnce({ ok: true, json: async () => ({ tasks: [task({ id: 't2' })] }) });

      const result = await adapter.syncObjects('token');

      expect(result.objects).toHaveLength(1);
      expect(result.objects[0]?.externalId).toBe('t2');
    });

    // Regression test for the bug this phase found and fixed: mapping used
    // to happen OUTSIDE safeListTasks's try/catch, so a single malformed
    // task (e.g. missing `status`) threw uncaught and aborted the entire
    // sync — losing every team/space/list already collected, not just the
    // one bad list. Mapping now happens inside the same try/catch as the
    // fetch, matching GitHub's safeFetchIssues fault-isolation pattern.
    it('tolerates a malformed task (missing status) without losing sibling lists', async () => {
      const malformedTask = task({ id: 't-malformed', status: undefined });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 'team1', name: 'Eng' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ spaces: [{ id: 'space1', name: 'Backend' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            lists: [
              { id: 'list-malformed', name: 'Broken' },
              { id: 'list-good', name: 'Healthy' },
            ],
          }),
        })
        // list-malformed: one task whose `.status.status` access throws
        .mockResolvedValueOnce({ ok: true, json: async () => ({ tasks: [malformedTask] }) })
        // list-good: succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tasks: [task({ id: 't-good' })] }),
        });

      const result = await adapter.syncObjects('token');

      // The malformed task's list contributes nothing, but the sync as a
      // whole completes and the healthy list's task still comes through —
      // it must NOT throw and abort the entire sync.
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0]?.externalId).toBe('t-good');
    });

    it('caps tasks per list at CLICKUP_SYNC_TASKS_PER_LIST', async () => {
      const manyTasks = Array.from({ length: 40 }, (_, i) => task({ id: `t${String(i)}` }));
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ teams: [{ id: 'team1', name: 'Eng' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ spaces: [{ id: 'space1', name: 'Backend' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [{ id: 'list1', name: 'Sprint' }] }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ tasks: manyTasks }) });

      const result = await adapter.syncObjects('token');
      expect(result.objects.length).toBe(30);
    });
  });

  describe('fetchObjectDetails', () => {
    it('TICKET — resolves by externalId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 't1',
          name: 'Fix bug',
          text_content: 'details',
          status: { status: 'in progress' },
          url: 'https://app.clickup.com/t/t1',
          creator: { username: 'alice' },
          date_created: '1700000000000',
          date_updated: '1700000100000',
          list: { id: 'list1', name: 'Sprint' },
        }),
      });
      const live = await adapter.fetchObjectDetails('token', 't1', 'TICKET');
      expect(live?.title).toBe('Fix bug');
      expect(live?.metadata).toEqual(
        expect.objectContaining({ status: 'in progress', listId: 'list1', listName: 'Sprint' }),
      );
    });

    it('returns null for a non-TICKET object type', async () => {
      const live = await adapter.fetchObjectDetails('token', 't1', 'REPOSITORY');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', 'missing', 'TICKET');
      expect(live).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(adapter.fetchObjectDetails('token', 't1', 'TICKET')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('write actions', () => {
    describe('CREATE_CLICKUP_TASK', () => {
      it('posts to the list task endpoint and returns the created id/url', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'new-task', url: 'https://app.clickup.com/t/new-task' }),
        });
        const result = await adapter.executeWriteAction('token', 'CREATE_CLICKUP_TASK', {
          listId: 'list1',
          name: 'New task',
          description: 'desc',
        });
        expect(result).toEqual({
          success: true,
          externalId: 'new-task',
          url: 'https://app.clickup.com/t/new-task',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.clickup.com/api/v2/list/list1/task');
        expect(init.method).toBe('POST');
      });

      it('returns success:false with the API error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => 'Bad request',
        });
        const result = await adapter.executeWriteAction('token', 'CREATE_CLICKUP_TASK', {
          listId: 'list1',
          name: 'x',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('400');
      });
    });

    describe('UPDATE_CLICKUP_TASK', () => {
      it('only sends the fields present in the payload', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
        await adapter.executeWriteAction('token', 'UPDATE_CLICKUP_TASK', {
          taskId: 'task1',
          status: 'done',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.clickup.com/api/v2/task/task1');
        expect(JSON.parse(init.body as string)).toEqual({ status: 'done' });
      });
    });

    describe('COMMENT_CLICKUP_TASK', () => {
      it('posts the comment text to the task comment endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
        await adapter.executeWriteAction('token', 'COMMENT_CLICKUP_TASK', {
          taskId: 'task1',
          commentText: 'Looks good',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.clickup.com/api/v2/task/task1/comment');
        expect(JSON.parse(init.body as string)).toEqual({ comment_text: 'Looks good' });
      });
    });

    it('returns success:false for an unsupported action type', async () => {
      const result = await adapter.executeWriteAction('token', 'SOME_OTHER_ACTION', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not supported');
    });

    it('catches a thrown error and returns success:false', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
      const result = await adapter.executeWriteAction('token', 'CREATE_CLICKUP_TASK', {
        listId: 'list1',
        name: 'x',
      });
      expect(result).toEqual({ success: false, errorMessage: 'network down' });
    });
  });

  describe('supportsWrite / getSupportedActionTypes', () => {
    it('reports write support and the 3 ClickUp action types', () => {
      expect(adapter.supportsWrite()).toBe(true);
      expect(adapter.getSupportedActionTypes()).toEqual([
        'CREATE_CLICKUP_TASK',
        'UPDATE_CLICKUP_TASK',
        'COMMENT_CLICKUP_TASK',
      ]);
    });
  });
});
