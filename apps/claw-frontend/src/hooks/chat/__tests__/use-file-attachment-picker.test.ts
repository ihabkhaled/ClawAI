import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFileAttachmentPicker } from '@/hooks/chat/use-file-attachment-picker';

vi.mock('@/lib/i18n/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const coarse = vi.hoisted(() => ({ value: false }));
vi.mock('@/hooks/ui/use-media-query', () => ({
  useMediaQuery: () => coarse.value,
}));

describe('useFileAttachmentPicker', () => {
  function setup(selectedFileIds: string[] = []) {
    return renderHook(() => useFileAttachmentPicker({ selectedFileIds }));
  }

  it('counts the attached files for the trigger badge', () => {
    expect(setup(['a', 'b', 'c']).result.current.selectedCount).toBe(3);
  });

  it('opens and closes the menu', () => {
    const { result } = setup();
    expect(result.current.menuOpen).toBe(false);

    act(() => result.current.setMenuOpen(true));
    expect(result.current.menuOpen).toBe(true);

    act(() => result.current.closeMenu());
    expect(result.current.menuOpen).toBe(false);
  });

  it('opens the library and closes the menu in one step, and the dialog outlives the menu', () => {
    const { result } = setup();

    act(() => result.current.setMenuOpen(true));
    expect(result.current.menuOpen).toBe(true);

    act(() => result.current.openLibrary());

    expect(result.current.libraryOpen).toBe(true);
    expect(result.current.menuOpen).toBe(false);

    act(() => result.current.setLibraryOpen(false));
    expect(result.current.libraryOpen).toBe(false);
  });

  it('keeps the default focus (the search box) on a mouse device', () => {
    coarse.value = false;
    const { result } = setup();
    const event = new Event('focus', { cancelable: true });

    result.current.handleOpenAutoFocus(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('takes focus off the search box on a touch device so the keyboard stays down', () => {
    coarse.value = true;
    const { result } = setup();
    const content = document.createElement('div');
    content.tabIndex = -1;
    document.body.append(content);
    Object.defineProperty(result.current.contentRef, 'current', { value: content, writable: true });
    const event = new Event('focus', { cancelable: true });

    result.current.handleOpenAutoFocus(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(content);
    content.remove();
    coarse.value = false;
  });
});
