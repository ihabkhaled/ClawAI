import { describe, expect, it } from 'vitest';

import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { en } from '@/lib/i18n/locales/en';
import { THREAD_LIST_TRANSLATIONS } from '@/lib/i18n/locales/thread-list-translations';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import { describeThreadListFailure } from '@/utilities/thread-list-failure.utility';
import {
  fillThreadListText,
  formatThreadListDate,
  threadListStrings,
} from '@/utilities/thread-list-text.utility';
import {
  buildThreadListSearch,
  isThreadListFiltered,
  pageAfterDelete,
  parseThreadListUrlState,
} from '@/utilities/thread-list-url-state.utility';

const read = (query: string) => parseThreadListUrlState(new URLSearchParams(query));

describe('parseThreadListUrlState', () => {
  it('defaults an empty address', () => {
    expect(read('')).toEqual({ q: '', status: ThreadListStatus.ALL, page: 1 });
  });

  it('reads q, status and page', () => {
    expect(read('q=%20local%20&status=failed&page=3')).toEqual({
      q: 'local',
      status: ThreadListStatus.FAILED,
      page: 3,
    });
  });

  it.each(['page=0', 'page=-2', 'page=abc', 'page=1.5', 'status=BOGUS'])(
    'falls back on malformed input %s',
    (query) => {
      const state = read(query);
      expect(state.page).toBe(1);
      expect(state.status).toBe(ThreadListStatus.ALL);
    },
  );

  it('caps a very long search', () => {
    expect(read(`q=${'a'.repeat(500)}`).q).toHaveLength(120);
  });
});

describe('buildThreadListSearch', () => {
  it('leaves defaults out', () => {
    expect(buildThreadListSearch({ q: '', status: ThreadListStatus.ALL, page: 1 })).toBe('');
  });

  it('round-trips a full state', () => {
    const state = { q: 'a b&c', status: ThreadListStatus.PUBLISHED, page: 4 };
    expect(read(buildThreadListSearch(state).slice(1))).toEqual(state);
  });
});

describe('isThreadListFiltered / pageAfterDelete', () => {
  it('a bare page is not a filter', () => {
    expect(isThreadListFiltered({ q: '', status: ThreadListStatus.ALL, page: 5 })).toBe(false);
    expect(isThreadListFiltered({ q: 'x', status: ThreadListStatus.ALL, page: 1 })).toBe(true);
    expect(isThreadListFiltered({ q: '', status: ThreadListStatus.READY, page: 1 })).toBe(true);
  });

  it('steps back only when the last row of a page after the first was deleted', () => {
    expect(pageAfterDelete(3, 1)).toBe(2);
    expect(pageAfterDelete(3, 4)).toBe(3);
    expect(pageAfterDelete(1, 1)).toBe(1);
  });
});

describe('describeThreadListFailure', () => {
  it('maps a known code to its translation key and keeps retryable', () => {
    expect(
      describeThreadListFailure({ code: 'PROVIDER_UNAVAILABLE', retryable: true, step: null }),
    ).toMatchObject({
      messageKey: 'chat.threadProgress.code.providerUnavailable',
      retryable: true,
    });
  });

  it('never echoes provider text for an unknown code', () => {
    const view = describeThreadListFailure({ code: 'WEIRD', retryable: false, step: 'x' });
    expect(view.listKey).toBe('threadListReasonGeneric');
    expect(view.messageKey).toBeNull();
    expect(view.retryable).toBe(false);
  });

  // Every code ThreadsService owner-page-status can emit (JOB_CANCELLED, PUBLICATION_REVOKED,
  // GENERATION_JOB_MISSING, GENERATION_FAILED) plus a stored job code and an arbitrary one.
  it.each([
    'JOB_CANCELLED',
    'PUBLICATION_REVOKED',
    'GENERATION_JOB_MISSING',
    'GENERATION_FAILED',
    'PROVIDER_RATE_LIMITED',
    'SOMETHING_NEW_FROM_A_PROVIDER',
  ])('code %s has a translated reason and never prints the raw code', (code) => {
    const view = describeThreadListFailure({ code, retryable: true, step: null });
    const text =
      view.listKey === null
        ? resolveTranslation(en, view.messageKey ?? '', view.params)
        : THREAD_LIST_TRANSLATIONS.en[view.listKey];
    expect(text).not.toBe(view.messageKey);
    expect(text).not.toContain(code);
    expect(text).not.toContain('{code}');
    expect(text.length).toBeGreaterThan(5);
  });

  it('explains cancelled and revoked in their own words in every locale', () => {
    for (const strings of Object.values(THREAD_LIST_TRANSLATIONS)) {
      expect(strings.threadListReasonCancelled.length).toBeGreaterThan(3);
      expect(strings.threadListReasonRevoked.length).toBeGreaterThan(3);
      expect(strings.threadListReasonMissing.length).toBeGreaterThan(3);
      expect(strings.threadListReasonGeneric.length).toBeGreaterThan(3);
    }
    expect(
      describeThreadListFailure({ code: 'JOB_CANCELLED', retryable: true, step: null }).listKey,
    ).toBe('threadListReasonCancelled');
    expect(
      describeThreadListFailure({ code: 'PUBLICATION_REVOKED', retryable: false, step: null })
        .listKey,
    ).toBe('threadListReasonRevoked');
  });
});

describe('thread list text', () => {
  it('has every key in all 13 locales', () => {
    const english = Object.keys(THREAD_LIST_TRANSLATIONS.en);
    for (const strings of Object.values(THREAD_LIST_TRANSLATIONS)) {
      expect(Object.keys(strings).sort()).toEqual([...english].sort());
      expect(Object.values(strings).every((value) => value.length > 0)).toBe(true);
    }
    expect(Object.keys(THREAD_LIST_TRANSLATIONS)).toHaveLength(13);
  });

  it('keeps every placeholder in every locale', () => {
    for (const strings of Object.values(THREAD_LIST_TRANSLATIONS)) {
      expect(strings.threadListPublishAria).toContain('{title}');
      expect(strings.threadListDeleteAria).toContain('{title}');
      expect(strings.threadListNoResults).toContain('{query}');
      expect(strings.threadListCreatedOn).toContain('{date}');
    }
  });

  it('falls back to English for an unknown locale', () => {
    expect(threadListStrings('xx')).toBe(THREAD_LIST_TRANSLATIONS.en);
    expect(threadListStrings('ar')).toBe(THREAD_LIST_TRANSLATIONS.ar);
  });

  it('fills placeholders', () => {
    expect(fillThreadListText('Hi {name} {name}', { name: 'A' })).toBe('Hi A A');
    expect(fillThreadListText('plain')).toBe('plain');
  });

  it('formats a date and survives a bad one', () => {
    expect(formatThreadListDate('2026-10-31T10:00:00.000Z', 'en')).toContain('2026');
    expect(formatThreadListDate('nope', 'en')).toBe('');
    expect(formatThreadListDate('2026-10-31T10:00:00.000Z', 'not a locale')).not.toBe('');
  });
});
