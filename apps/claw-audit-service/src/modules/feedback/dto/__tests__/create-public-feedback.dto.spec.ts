import { createPublicFeedbackSchema } from '../create-public-feedback.dto';
import { listFeedbackQuerySchema } from '../list-feedback-query.dto';

const valid = {
  type: 'BUG_REPORT',
  message: 'Something is off',
  name: 'Grace Hopper',
  email: 'Grace@Example.com',
};

describe('createPublicFeedbackSchema', () => {
  it('accepts the minimal body and normalises the email', () => {
    const parsed = createPublicFeedbackSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe('grace@example.com');
    }
  });

  it('accepts every optional field', () => {
    expect(
      createPublicFeedbackSchema.safeParse({
        ...valid,
        title: 'Short',
        pageUrl: 'https://claw.local/pricing',
        locale: 'ar',
        website: '',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['missing name', { name: undefined }],
    ['blank name', { name: '   ' }],
    ['name of only control characters', { name: String.fromCharCode(0, 1, 2) }],
    ['name over 120', { name: 'a'.repeat(121) }],
    ['missing email', { email: undefined }],
    ['malformed email', { email: 'not-an-email' }],
    ['email over 255', { email: `${'a'.repeat(250)}@example.com` }],
    ['email with a space inside', { email: 'a b@example.com' }],
    ['missing message', { message: undefined }],
    ['blank message', { message: '  ' }],
    ['message over 20000', { message: 'a'.repeat(20_001) }],
    ['unknown type', { type: 'NOPE' }],
    ['non-http pageUrl', { pageUrl: 'javascript:alert(1)' }],
    ['title over 160', { title: 'a'.repeat(161) }],
  ])('rejects %s', (_label, patch) => {
    expect(createPublicFeedbackSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('strips NUL and control characters from text and trims it', () => {
    const nul = String.fromCharCode(0);
    const parsed = createPublicFeedbackSchema.safeParse({
      ...valid,
      name: `  Grace${nul} Hopper  `,
      message: `hello${nul}\nworld`,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Grace Hopper');
      expect(parsed.data.message).toBe('hello\nworld');
    }
  });

  it('drops attachments, user ids and roles: nothing the caller adds survives', () => {
    const parsed = createPublicFeedbackSchema.safeParse({
      ...valid,
      attachments: [{ fileId: 'f' }],
      userId: 'victim',
      role: 'ADMIN',
      source: 'AUTHENTICATED',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(Object.keys(parsed.data)).not.toEqual(expect.arrayContaining(['attachments']));
      expect(parsed.data).not.toHaveProperty('userId');
      expect(parsed.data).not.toHaveProperty('role');
      expect(parsed.data).not.toHaveProperty('source');
    }
  });

  it('does not reject a filled honeypot: that must look like success', () => {
    const parsed = createPublicFeedbackSchema.safeParse({ ...valid, website: 'http://spam' });
    expect(parsed.success).toBe(true);
  });
});

describe('listFeedbackQuerySchema source filter', () => {
  it('accepts PUBLIC and AUTHENTICATED', () => {
    expect(listFeedbackQuerySchema.safeParse({ source: 'PUBLIC' }).success).toBe(true);
    expect(listFeedbackQuerySchema.safeParse({ source: 'AUTHENTICATED' }).success).toBe(true);
  });

  it('rejects anything else', () => {
    expect(listFeedbackQuerySchema.safeParse({ source: 'ROOT' }).success).toBe(false);
  });
});
