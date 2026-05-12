import { GitHubWriteActionsHelper } from '../github-write-actions.helper';

global.fetch = jest.fn();

const validBase = {
  owner: 'me',
  repo: 'app',
  pullNumber: 42,
  commitId: 'abc123',
  path: 'src/foo.ts',
  line: 10,
  suggestion: 'const x = 1;',
};

describe('GitHubWriteActionsHelper — ADD_PR_SUGGESTION split-diff polish', () => {
  let helper: GitHubWriteActionsHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new GitHubWriteActionsHelper();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 999, html_url: 'https://github.com/me/app/pulls/42#disc-999' }),
    });
  });

  it('posts a single-line suggestion with side=RIGHT by default', async () => {
    const result = await helper.execute('tok', 'ADD_PR_SUGGESTION', validBase);
    expect(result.success).toBe(true);

    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body) as Record<
      string,
      unknown
    >;
    expect(sent['line']).toBe(10);
    expect(sent['side']).toBe('RIGHT');
    expect(sent['start_line']).toBeUndefined();
    expect(sent['start_side']).toBeUndefined();
    expect(sent['body']).toBe('```suggestion\nconst x = 1;\n```');
  });

  it('includes start_line for a multi-line span', async () => {
    await helper.execute('tok', 'ADD_PR_SUGGESTION', {
      ...validBase,
      startLine: 7,
      line: 10,
    });
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body) as Record<
      string,
      unknown
    >;
    expect(sent['start_line']).toBe(7);
    expect(sent['line']).toBe(10);
  });

  it('passes through start_side LEFT for deleted-side comments', async () => {
    await helper.execute('tok', 'ADD_PR_SUGGESTION', {
      ...validBase,
      side: 'LEFT',
      startLine: 5,
      startSide: 'LEFT',
    });
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body) as Record<
      string,
      unknown
    >;
    expect(sent['side']).toBe('LEFT');
    expect(sent['start_side']).toBe('LEFT');
  });

  it('returns failure when GitHub API rejects the comment', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 422 });
    const result = await helper.execute('tok', 'ADD_PR_SUGGESTION', validBase);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('HTTP 422');
  });
});
