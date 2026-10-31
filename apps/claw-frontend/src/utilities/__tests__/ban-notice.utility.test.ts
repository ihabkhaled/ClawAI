import { beforeEach, describe, expect, it } from 'vitest';

import { BAN_NOTICE_STORAGE_KEY } from '@/constants/auth.constants';
import {
  banNoticeFromResponse,
  storeBanNotice,
  takeBanNotice,
} from '@/utilities/ban-notice.utility';

describe('ban notice (ADR-200)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores a notice once and clears it on read', () => {
    storeBanNotice({ permanent: false, until: '2026-11-05T10:00:00.000Z' });
    expect(takeBanNotice()).toEqual({ permanent: false, until: '2026-11-05T10:00:00.000Z' });
    expect(takeBanNotice()).toBeNull();
  });

  it('returns null when nothing was stored or the value is unreadable', () => {
    expect(takeBanNotice()).toBeNull();
    sessionStorage.setItem(BAN_NOTICE_STORAGE_KEY, '{not json');
    expect(takeBanNotice()).toBeNull();
    sessionStorage.setItem(BAN_NOTICE_STORAGE_KEY, '"text"');
    expect(takeBanNotice()).toBeNull();
  });

  it('treats a stored notice with no valid end date as permanent', () => {
    sessionStorage.setItem(
      BAN_NOTICE_STORAGE_KEY,
      JSON.stringify({ permanent: false, until: 'x' }),
    );
    expect(takeBanNotice()).toEqual({ permanent: true, until: null });
  });

  it('reads an ACCOUNT_BANNED reply body and nothing else', () => {
    expect(
      banNoticeFromResponse({
        code: 'ACCOUNT_BANNED',
        bannedUntil: '2026-11-05T10:00:00.000Z',
        banPermanent: false,
      }),
    ).toEqual({ permanent: false, until: '2026-11-05T10:00:00.000Z' });
    expect(
      banNoticeFromResponse({ errorCode: 'ACCOUNT_BANNED', banPermanent: true, bannedUntil: null }),
    ).toEqual({
      permanent: true,
      until: null,
    });
    expect(banNoticeFromResponse({ code: 'INVALID_REFRESH_TOKEN' })).toBeNull();
    expect(banNoticeFromResponse(null)).toBeNull();
    expect(banNoticeFromResponse('x')).toBeNull();
  });
});
