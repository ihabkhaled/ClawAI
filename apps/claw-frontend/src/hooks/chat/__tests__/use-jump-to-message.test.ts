import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useJumpToMessage } from '@/hooks/chat/use-jump-to-message';

const mockToast = vi.fn();

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));

describe('useJumpToMessage', () => {
  it('stays quiet when the list scrolled to the message', () => {
    const jump = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() => useJumpToMessage(jump));
    result.current.jumpToMessage('m1');

    expect(jump).toHaveBeenCalledWith('m1');
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('explains a miss instead of leaving the click silent', () => {
    // Search covers the whole thread, the list holds one page of it. A match
    // outside that page used to produce nothing at all, which reads as a broken
    // button rather than as a boundary.
    mockToast.mockClear();
    const jump = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => useJumpToMessage(jump));
    result.current.jumpToMessage('m9');

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast.mock.calls[0]?.[0]).toMatchObject({
      title: 'chat.search.notLoadedTitle',
      description: 'chat.search.notLoaded',
    });
  });
});
