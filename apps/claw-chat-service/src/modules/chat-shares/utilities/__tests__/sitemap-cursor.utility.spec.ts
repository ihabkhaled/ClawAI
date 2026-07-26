import { decodeSitemapCursor, encodeSitemapCursor } from '../sitemap-cursor.utility';

describe('sitemap cursor', () => {
  it('round-trips the compound updatedAt and id keyset', () => {
    const cursor = {
      updatedAt: new Date('2026-07-26T10:20:30.000Z'),
      id: '39fb8c45-72d6-4e7f-9e4c-fdb0ddfa9c33',
    };

    expect(decodeSitemapCursor(encodeSitemapCursor(cursor))).toEqual(cursor);
  });

  it.each(['', 'not-base64!', Buffer.from('date-only').toString('base64url')])(
    'rejects malformed cursor %s',
    (value) => {
      expect(decodeSitemapCursor(value)).toBeNull();
    },
  );
});
