import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { boardReaderPath, threadPublicPath } from '@/utilities/thread-board-list-url.utility';
import { boardItemHref } from '@/utilities/thread-board-view.utility';

const ARABIC = 'كيف-يعمل-التمثيل-a1b2c3d4';
const ENCODED = encodeURIComponent(ARABIC);

describe('Thread links for a non-Latin slug', () => {
  it('opens the guest card at the encoded public address', () => {
    expect(boardItemHref(ThreadBoardMode.Guest, ARABIC, Locale.AR)).toBe(`/ar/threads/${ENCODED}`);
  });

  it('opens the member card at the encoded reader address', () => {
    expect(boardItemHref(ThreadBoardMode.Member, ARABIC, Locale.EN)).toBe(`/board/${ENCODED}`);
    expect(boardReaderPath(ARABIC)).toBe(`/board/${ENCODED}`);
  });

  it('builds the public path from the real slug, once-encoded', () => {
    expect(threadPublicPath(ARABIC)).toBe(`/threads/${ENCODED}`);
    expect(threadPublicPath('茶道-a1b2c3d4')).toBe(
      `/threads/${encodeURIComponent('茶道-a1b2c3d4')}`,
    );
  });
});
