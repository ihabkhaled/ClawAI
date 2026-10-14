import { describe, expect, it, vi } from 'vitest';

import { samePageHash } from '@/utilities/same-page-hash.utility';
import { submitOnShortcut } from '@/utilities/submit-shortcut.utility';

function press(init: { key: string; ctrlKey?: boolean; metaKey?: boolean; composing?: boolean }) {
  const submit = vi.fn();
  const preventDefault = vi.fn();
  submitOnShortcut(
    {
      key: init.key,
      ctrlKey: init.ctrlKey === true,
      metaKey: init.metaKey === true,
      nativeEvent: { isComposing: init.composing === true },
      preventDefault,
    },
    submit,
  );
  return { submit, preventDefault };
}

describe('submitOnShortcut', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }])('submits on Enter with %j', (mods) => {
    const { submit, preventDefault } = press({ key: 'Enter', ...mods });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('ignores a bare Enter, other keys and IME composition', () => {
    expect(press({ key: 'Enter' }).submit).not.toHaveBeenCalled();
    expect(press({ key: 'a', ctrlKey: true }).submit).not.toHaveBeenCalled();
    expect(press({ key: 'Enter', ctrlKey: true, composing: true }).submit).not.toHaveBeenCalled();
  });
});

describe('samePageHash', () => {
  it('returns the fragment only for the page the reader is on', () => {
    expect(samePageHash('/ar/threads/abc#comment-1', '/ar/threads/abc')).toBe('#comment-1');
    expect(samePageHash('/ar/threads/other#comment-1', '/ar/threads/abc')).toBeNull();
    expect(samePageHash('/ar/threads/abc', '/ar/threads/abc')).toBeNull();
  });
});
