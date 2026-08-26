import { FeedbackType } from '@claw/shared-types';
import {
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MAX_ATTACHMENTS,
  FEEDBACK_MAX_CONTENT_LENGTH,
  FEEDBACK_MAX_SUBJECT_LENGTH,
  FEEDBACK_MAX_TITLE_LENGTH,
  FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES,
} from '@claw/shared-constants';

import { createFeedbackSchema } from '../create-feedback.dto';
import { listFeedbackQuerySchema } from '../list-feedback-query.dto';
import { updateFeedbackStatusSchema } from '../update-feedback-status.dto';

const image = {
  fileId: 'file-1',
  filename: 'shot.png',
  mimeType: 'image/png',
  sizeBytes: 1_024,
  isScreenshot: false,
};

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: FeedbackType.BUG_REPORT,
    title: 'Something broke',
    contentMarkdown: 'It broke when I clicked save.',
    ...overrides,
  };
}

describe('createFeedbackSchema accepts legitimate submissions', () => {
  it.each(Object.values(FeedbackType))('accepts feedback of type %s', (type) => {
    expect(() => createFeedbackSchema.parse(payload({ type }))).not.toThrow();
  });

  it('accepts a submission with no subject and no attachments', () => {
    const parsed = createFeedbackSchema.parse(payload());

    expect(parsed.subject).toBeUndefined();
    expect(parsed.attachments).toBeUndefined();
  });

  it('accepts attachments up to the count limit', () => {
    const attachments = Array.from({ length: FEEDBACK_MAX_ATTACHMENTS }, (_item, index) => ({
      ...image,
      fileId: `file-${String(index)}`,
    }));

    expect(() => createFeedbackSchema.parse(payload({ attachments }))).not.toThrow();
  });
});

describe('createFeedbackSchema rejects malformed and abusive input', () => {
  it('rejects a missing title', () => {
    expect(() => createFeedbackSchema.parse(payload({ title: '' }))).toThrow();
  });

  it('rejects missing content', () => {
    expect(() => createFeedbackSchema.parse(payload({ contentMarkdown: '' }))).toThrow();
  });

  it('rejects a type that is not in the enum', () => {
    expect(() => createFeedbackSchema.parse(payload({ type: 'ARBITRARY' }))).toThrow();
  });

  it.each([
    ['title', 'a'.repeat(FEEDBACK_MAX_TITLE_LENGTH + 1)],
    ['subject', 'a'.repeat(FEEDBACK_MAX_SUBJECT_LENGTH + 1)],
    ['contentMarkdown', 'a'.repeat(FEEDBACK_MAX_CONTENT_LENGTH + 1)],
  ])('rejects an over-length %s', (field, value) => {
    expect(() => createFeedbackSchema.parse(payload({ [field]: value }))).toThrow();
  });

  it('rejects more attachments than the limit', () => {
    const attachments = Array.from({ length: FEEDBACK_MAX_ATTACHMENTS + 1 }, (_item, index) => ({
      ...image,
      fileId: `file-${String(index)}`,
    }));

    expect(() => createFeedbackSchema.parse(payload({ attachments }))).toThrow();
  });

  it('rejects a single attachment over the per-file cap', () => {
    const attachments = [{ ...image, sizeBytes: FEEDBACK_MAX_ATTACHMENT_BYTES + 1 }];

    expect(() => createFeedbackSchema.parse(payload({ attachments }))).toThrow();
  });

  it('rejects attachments that are individually fine but too large together', () => {
    const perFile = Math.floor(FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES / 2) + 1;
    const attachments = [
      { ...image, fileId: 'a', sizeBytes: perFile },
      { ...image, fileId: 'b', sizeBytes: perFile },
    ];

    expect(() => createFeedbackSchema.parse(payload({ attachments }))).toThrow();
  });

  it.each([
    'text/html',
    'application/pdf',
    'image/svg+xml',
    'application/javascript',
    'application/x-msdownload',
  ])('rejects the disallowed attachment type %s', (mimeType) => {
    expect(() =>
      createFeedbackSchema.parse(payload({ attachments: [{ ...image, mimeType }] })),
    ).toThrow();
  });

  it('rejects a zero-byte attachment', () => {
    expect(() =>
      createFeedbackSchema.parse(payload({ attachments: [{ ...image, sizeBytes: 0 }] })),
    ).toThrow();
  });

  it('strips unknown keys rather than persisting them', () => {
    const parsed = createFeedbackSchema.parse(
      payload({ status: 'RESOLVED', userId: 'someone-else', ticketNumber: 'FDB-000999' }),
    );

    // Status, owner and ticket number are decided by the server. A caller
    // cannot open a ticket that is already resolved or attributed to someone
    // else by adding fields to the body.
    expect(parsed).not.toHaveProperty('status');
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed).not.toHaveProperty('ticketNumber');
  });

  it('ignores a prototype-pollution shaped key', () => {
    const parsed = createFeedbackSchema.parse(
      JSON.parse(
        '{"type":"BUG_REPORT","title":"t","contentMarkdown":"c","__proto__":{"admin":true}}',
      ),
    );

    expect(parsed).not.toHaveProperty('admin');
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });
});

describe('listFeedbackQuerySchema bounds the search surface', () => {
  it('defaults to a bounded page and limit', () => {
    const parsed = listFeedbackQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBeGreaterThan(0);
  });

  it('refuses a limit beyond the maximum page size', () => {
    expect(() => listFeedbackQuerySchema.parse({ limit: 10_000 })).toThrow();
  });

  it('refuses a negative or zero page', () => {
    expect(() => listFeedbackQuerySchema.parse({ page: 0 })).toThrow();
    expect(() => listFeedbackQuerySchema.parse({ page: -1 })).toThrow();
  });

  it('refuses an over-long search term', () => {
    expect(() => listFeedbackQuerySchema.parse({ search: 'a'.repeat(5_000) })).toThrow();
  });

  it('refuses a sort field that is not on the allowlist', () => {
    expect(() => listFeedbackQuerySchema.parse({ sortBy: 'password' })).toThrow();
  });

  it('refuses a status or type outside the enum', () => {
    expect(() => listFeedbackQuerySchema.parse({ status: 'PWNED' })).toThrow();
    expect(() => listFeedbackQuerySchema.parse({ type: 'PWNED' })).toThrow();
  });

  it('accepts a NoSQL-operator-shaped search as a plain string', () => {
    // Mongo receives this through $text search as a literal term, never as an
    // operator, so the only requirement is that it does not crash validation.
    const parsed = listFeedbackQuerySchema.parse({ search: '{"$ne": null}' });

    expect(typeof parsed.search).toBe('string');
  });
});

describe('updateFeedbackStatusSchema', () => {
  it('refuses a status outside the lifecycle enum', () => {
    expect(() => updateFeedbackStatusSchema.parse({ status: 'DELETED' })).toThrow();
  });

  it('refuses an over-long note', () => {
    expect(() =>
      updateFeedbackStatusSchema.parse({ status: 'RESOLVED', note: 'a'.repeat(5_000) }),
    ).toThrow();
  });
});
