import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { useLocaleNavigation } from '@/hooks/use-locale-navigation';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: (): string => '/en/chat',
  useRouter: (): { replace: typeof replace } => ({ replace }),
  useSearchParams: (): URLSearchParams => new URLSearchParams('mode=compare'),
}));

describe('useLocaleNavigation', () => {
  it('navigates to the same page under the selected locale URL', () => {
    globalThis.location.hash = '#result';
    const { result } = renderHook(() => useLocaleNavigation());

    result.current.replaceLocale(Locale.AR);

    expect(replace).toHaveBeenCalledWith('/ar/chat?mode=compare#result');
  });
});
