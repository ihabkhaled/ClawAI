import { afterEach, describe, expect, it } from 'vitest';

import { CHAT_COMPOSER_INPUT_ID } from '@/constants/context-save.constants';
import { focusChatComposer } from '@/utilities/chat-composer-focus.utility';

describe('focusChatComposer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the composer textarea and says so', () => {
    document.body.innerHTML = `<textarea id="${CHAT_COMPOSER_INPUT_ID}"></textarea>`;

    expect(focusChatComposer()).toBe(true);
    expect(document.activeElement?.id).toBe(CHAT_COMPOSER_INPUT_ID);
  });

  it('leaves focus alone when there is no composer on the page', () => {
    expect(focusChatComposer()).toBe(false);
  });

  it('does not try to focus a disabled composer', () => {
    document.body.innerHTML = `<textarea id="${CHAT_COMPOSER_INPUT_ID}" disabled></textarea>`;

    expect(focusChatComposer()).toBe(false);
  });
});
