import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { useLocaleNavigation } from '@/hooks/use-locale-navigation';

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: (): string => '/en/chat',
  useRouter: (): { refresh: typeof refresh; replace: typeof replace } => ({ refresh, replace }),
  useSearchParams: (): URLSearchParams => new URLSearchParams('mode=compare'),
}));

describe('useLocaleNavigation', () => {
  it('navigates and refreshes the route tree so the selected dictionary renders', () => {
    globalThis.location.hash = '#result';
    const { result } = renderHook(() => useLocaleNavigation());

    result.current.replaceLocale(Locale.AR);

    expect(replace).toHaveBeenCalledWith('/ar/chat?mode=compare#result');
    expect(refresh).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledBefore(refresh);
  });
});
