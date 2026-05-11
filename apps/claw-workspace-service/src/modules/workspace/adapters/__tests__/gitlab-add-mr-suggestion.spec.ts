import { GitLabWriteActionsHelper } from '../gitlab-write-actions.helper';

global.fetch = jest.fn();

const validPayload = {
  projectId: '42',
  iid: '7',
  baseSha: 'base123',
  startSha: 'start456',
  headSha: 'head789',
  newPath: 'src/foo.ts',
  newLine: 10,
  suggestion: 'const x = 1;',
};

describe('GitLabWriteActionsHelper — ADD_MR_SUGGESTION', () => {
  let helper: GitLabWriteActionsHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new GitLabWriteActionsHelper();
  });

  it('posts to /discussions with a ```suggestion fenced body + position object', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'disc-1', web_url: 'https://gitlab.com/x/y/-/merge_requests/7#note_1' }),
    });

    const result = await helper.execute('token', 'ADD_MR_SUGGESTION', validPayload);
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('disc-1');
    expect(result.url).toBe('https://gitlab.com/x/y/-/merge_requests/7#note_1');

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('https://gitlab.com/api/v4/projects/42/merge_requests/7/discussions');
    const sent = JSON.parse(call[1].body) as { body: string; position: Record<string, unknown> };
    expect(sent.body).toBe('```suggestion\nconst x = 1;\n```');
    expect(sent.position).toMatchObject({
      base_sha: 'base123',
      start_sha: 'start456',
      head_sha: 'head789',
      old_path: 'src/foo.ts',
      new_path: 'src/foo.ts',
      position_type: 'text',
      new_line: 10,
    });
    // Did NOT include old_line when caller didn't pass it
    expect(sent.position['old_line']).toBeUndefined();
  });

  it('honors a custom oldPath when caller passes a rename', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'd2' }),
    });
    await helper.execute('token', 'ADD_MR_SUGGESTION', {
      ...validPayload,
      oldPath: 'src/old-foo.ts',
      oldLine: 9,
    });
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body) as {
      position: Record<string, unknown>;
    };
    expect(sent.position['old_path']).toBe('src/old-foo.ts');
    expect(sent.position['old_line']).toBe(9);
  });

  it('rejects when required fields are missing', async () => {
    const bad = { ...validPayload, headSha: '' };
    const result = await helper.execute('token', 'ADD_MR_SUGGESTION', bad);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('ADD_MR_SUGGESTION requires');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects when newLine is non-positive', async () => {
    const bad = { ...validPayload, newLine: 0 };
    const result = await helper.execute('token', 'ADD_MR_SUGGESTION', bad);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('ADD_MR_SUGGESTION requires');
  });

  it('surfaces GitLab API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'unprocessable',
    });
    const result = await helper.execute('token', 'ADD_MR_SUGGESTION', validPayload);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('GitLab API 422');
    expect(result.errorMessage).toContain('unprocessable');
  });

  it('resolves self-hosted baseUrl to the GitLab v4 API root', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'd' }),
    });
    await helper.execute('token', 'ADD_MR_SUGGESTION', {
      ...validPayload,
      baseUrl: 'https://gitlab.acme.example',
    });
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toBe(
      'https://gitlab.acme.example/api/v4/projects/42/merge_requests/7/discussions',
    );
  });
});
