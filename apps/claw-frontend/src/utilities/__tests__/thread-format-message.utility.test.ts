import { describe, expect, it } from 'vitest';

import { THREAD_FORMAT_CODE_KEYS } from '@/constants/thread-format.constants';
import { ApiClientError } from '@/services/shared/api-client';
import {
  threadFormatCodeMessage,
  threadFormatErrorKey,
  threadFormatSkippedMessage,
} from '@/utilities/thread-format-message.utility';

describe('threadFormatCodeMessage', () => {
  it.each(Object.entries(THREAD_FORMAT_CODE_KEYS))('maps %s to its own sentence', (code, key) => {
    expect(threadFormatCodeMessage(code)).toEqual({ key });
  });

  it('falls back to the unknown line and keeps the code for any other FORMAT_ code', () => {
    expect(threadFormatCodeMessage('FORMAT_BRAND_NEW')).toEqual({
      key: 'threadReview.formatUnknown',
      params: { code: 'FORMAT_BRAND_NEW' },
    });
  });
});

describe('threadFormatSkippedMessage', () => {
  it('keeps the existing line for an already well formatted article', () => {
    expect(threadFormatSkippedMessage('FORMAT_ALREADY_PRETTY').key).toBe(
      'threadArticle.formatUnchanged',
    );
  });

  it('shows the specific reason for a guard skip, and the generic line when there is no code', () => {
    expect(threadFormatSkippedMessage('FORMAT_NUMBER_CHANGED').key).toBe(
      'threadReview.formatNumberChanged',
    );
    expect(threadFormatSkippedMessage(null).key).toBe('threadArticle.formatSkipped');
  });
});

describe('threadFormatErrorKey', () => {
  it.each([
    ['THREAD_FORMAT_DAILY_LIMIT', 429, 'threadArticle.formatLimit'],
    ['THREAD_FORMAT_IN_PROGRESS', 409, 'threadArticle.formatBusy'],
    ['THREAD_FORMAT_NOT_FORMATTABLE', 409, 'threadReview.formatNotFormattable'],
  ])('maps the API code %s', (code, status, key) => {
    expect(threadFormatErrorKey(new ApiClientError({ message: 'x', status, code }))).toBe(key);
  });
});
