import { GmailAdapter } from '../gmail.adapter';

global.fetch = jest.fn();

describe('GmailAdapter.executeWriteAction — CREATE_DRAFT', () => {
  let adapter: GmailAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GmailAdapter();
  });

  it('returns success with draftId and #drafts URL when Gmail draft creation succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'r-draft-123',
        message: { id: 'msg-1', threadId: 'thread-9' },
      }),
    });

    const result = await adapter.executeWriteAction('token', 'CREATE_DRAFT', {
      to: 'someone@example.com',
      subject: 'Hello',
      body: 'Draft body',
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('r-draft-123');
    expect(result.url).toBe('https://mail.google.com/mail/u/0/#drafts/thread-9');
    expect(result.metadata).toEqual({
      draftId: 'r-draft-123',
      messageId: 'msg-1',
      threadId: 'thread-9',
    });
  });

  it('falls back to #drafts URL without thread fragment when Gmail returns no threadId', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'r-draft-7', message: { id: 'msg-7' } }),
    });

    const result = await adapter.executeWriteAction('token', 'CREATE_DRAFT', {
      to: 'a@b.com',
      subject: 'Subj',
      body: 'Body',
    });

    expect(result.success).toBe(true);
    expect(result.url).toBe('https://mail.google.com/mail/u/0/#drafts');
  });

  it('rejects payload missing required fields', async () => {
    const result = await adapter.executeWriteAction('token', 'CREATE_DRAFT', {
      to: 'a@b.com',
      // subject missing
      body: 'Body',
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('createDraft requires');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces Gmail API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'forbidden',
    });

    const result = await adapter.executeWriteAction('token', 'CREATE_DRAFT', {
      to: 'a@b.com',
      subject: 'Subj',
      body: 'Body',
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('HTTP 403');
    expect(result.errorMessage).toContain('forbidden');
  });

  it('passes threadId through when supplied (reply-as-draft semantics)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'd1', message: { id: 'm1', threadId: 'tx' } }),
    });

    await adapter.executeWriteAction('token', 'CREATE_DRAFT', {
      to: 'a@b.com',
      subject: 'Re: Hi',
      body: 'Body',
      threadId: 'tx',
    });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(call[1].body) as {
      message: { raw: string; threadId?: string };
    };
    expect(requestBody.message.threadId).toBe('tx');
  });

  it('returns "unsupported action type" for unknown action', async () => {
    const result = await adapter.executeWriteAction('token', 'NOPE', {});
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('unsupported action type NOPE');
  });
});
