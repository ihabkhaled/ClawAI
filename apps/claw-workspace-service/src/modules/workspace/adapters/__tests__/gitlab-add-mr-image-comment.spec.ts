import { GitLabWriteActionsHelper } from '../gitlab-write-actions.helper';

global.fetch = jest.fn();

const valid = {
  projectId: '42',
  iid: '7',
  baseSha: 'base',
  startSha: 'start',
  headSha: 'head',
  newPath: 'design.png',
  body: 'Move this button 20px left',
  x: 120,
  y: 250,
  width: 1024,
  height: 768,
};

describe('GitLabWriteActionsHelper — ADD_MR_IMAGE_COMMENT', () => {
  let helper: GitLabWriteActionsHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new GitLabWriteActionsHelper();
  });

  it('posts to /discussions with position_type=image and x/y/width/height', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'img-disc-1' }),
    });

    const result = await helper.execute('tok', 'ADD_MR_IMAGE_COMMENT', valid);
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('img-disc-1');

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[0]).toContain('/projects/42/merge_requests/7/discussions');
    const sent = JSON.parse(call[1].body) as { body: string; position: Record<string, unknown> };
    expect(sent.body).toBe('Move this button 20px left');
    expect(sent.position).toMatchObject({
      position_type: 'image',
      old_path: 'design.png',
      new_path: 'design.png',
      x: 120,
      y: 250,
      width: 1024,
      height: 768,
    });
  });

  it('rejects when required image coords are missing', async () => {
    const result = await helper.execute('tok', 'ADD_MR_IMAGE_COMMENT', {
      ...valid,
      width: 0,
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('ADD_MR_IMAGE_COMMENT requires');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects when body is empty', async () => {
    const result = await helper.execute('tok', 'ADD_MR_IMAGE_COMMENT', {
      ...valid,
      body: '',
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('ADD_MR_IMAGE_COMMENT requires');
  });

  it('honors a custom oldPath when caller renamed the image', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'img-2' }),
    });
    await helper.execute('tok', 'ADD_MR_IMAGE_COMMENT', {
      ...valid,
      oldPath: 'old-design.png',
    });
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body) as {
      position: Record<string, unknown>;
    };
    expect(sent.position['old_path']).toBe('old-design.png');
    expect(sent.position['new_path']).toBe('design.png');
  });

  it('surfaces GitLab API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'invalid position',
    });
    const result = await helper.execute('tok', 'ADD_MR_IMAGE_COMMENT', valid);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('GitLab API 422');
    expect(result.errorMessage).toContain('invalid position');
  });
});
