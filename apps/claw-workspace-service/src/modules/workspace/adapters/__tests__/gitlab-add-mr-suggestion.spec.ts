import { type Mock, vi } from 'vitest';
import { GitLabWriteActionsHelper } from '../gitlab-write-actions.helper';

global.fetch = vi.fn();

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
    vi.clearAllMocks();
    helper = new GitLabWriteActionsHelper();
  });

  it('posts to /discussions with a ```suggestion fenced body + position object', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'disc-1',
        web_url: 'https://gitlab.com/x/y/-/merge_requests/7#note_1',
      }),
    });

    const result = await helper.execute('token', 'ADD_MR_SUGGESTION', validPayload);
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('disc-1');
    expect(result.url).toBe('https://gitlab.com/x/y/-/merge_requests/7#note_1');

    const call = (global.fetch as Mock).mock.calls[0];
    expect(call).toBeDefined();
    expect(call?.[0]).toBe('https://gitlab.com/api/v4/projects/42/merge_requests/7/discussions');
    const sent = JSON.parse(call?.[1].body) as { body: string; position: Record<string, unknown> };
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
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'd2' }),
    });
    await helper.execute('token', 'ADD_MR_SUGGESTION', {
      ...validPayload,
      oldPath: 'src/old-foo.ts',
      oldLine: 9,
    });
    const sentCall = (global.fetch as Mock).mock.calls[0];
    expect(sentCall).toBeDefined();
    const sent = JSON.parse(sentCall?.[1].body) as {
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
    (global.fetch as Mock).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'unprocessable',
    });
    const result = await helper.execute('token', 'ADD_MR_SUGGESTION', validPayload);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('GitLab API 422');
    expect(result.errorMessage).toContain('unprocessable');
  });

  // TD-040. A write payload is proposed by a user or a model, so a `baseUrl`
  // inside it must never decide where the GitLab token goes. It used to be
  // honoured, which let a prompt-injected proposal send the token anywhere.
  it('refuses a payload baseUrl that is not gitlab.com, before any request', async () => {
    const result = await helper.execute('token', 'ADD_MR_SUGGESTION', {
      ...validPayload,
      baseUrl: 'https://gitlab.acme.example',
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('gitlab.acme.example');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('still reaches gitlab.com when the payload names it, with redirects refused', async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'd' }),
    });
    await helper.execute('token', 'ADD_MR_SUGGESTION', {
      ...validPayload,
      baseUrl: 'https://gitlab.com',
    });
    const [url, init] = (global.fetch as Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://gitlab.com/api/v4/projects/42/merge_requests/7/discussions');
    expect(init.redirect).toBe('error');
  });
});
