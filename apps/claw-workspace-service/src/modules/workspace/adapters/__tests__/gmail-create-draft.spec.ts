import { GmailAdapter } from '../gmail.adapter';
import { GmailComposeHelper } from '../gmail-compose.helper';

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

  // v3 round 4 — anti-loop integration: when the compose helper is wired
  // in and blocks the send, the adapter MUST NOT call Gmail.
  it('honors compose helper anti-loop rejection without calling Gmail', async () => {
    const composeHelper = new GmailComposeHelper();
    const wiredAdapter = new GmailAdapter(composeHelper);
    const result = await wiredAdapter.executeWriteAction('token', 'CREATE_DRAFT', {
      to: 'no-reply@notifications.example.com',
      subject: 'Hi',
      body: 'x',
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('TO_IS_MAILER_DAEMON');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('compose helper appends signature into the RFC822 raw body', async () => {
    const composeHelper = new GmailComposeHelper();
    const wiredAdapter = new GmailAdapter(composeHelper);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'd1', message: { id: 'm1', threadId: 'tx' } }),
    });
    await wiredAdapter.executeWriteAction('token', 'CREATE_DRAFT', {
      to: 'colleague@example.com',
      subject: 'Hi',
      body: 'hello',
      signature: 'Best,\nAlice',
    });
    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body) as {
      message: { raw: string };
    };
    const decoded = Buffer.from(sent.message.raw, 'base64url').toString('utf-8');
    expect(decoded).toContain('Best,');
    expect(decoded).toContain('-- '); // RFC 3676 separator
  });
});
