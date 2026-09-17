import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MEDIA_QUERY_NAV_RAIL } from '@/constants/media-query.constants';
import { useSidebarController } from '@/hooks/layout/use-sidebar-controller';

const close = vi.fn();
let isOpen = true;

vi.mock('next/navigation', () => ({ usePathname: () => '/chat' }));
vi.mock('@/stores/sidebar.store', () => ({
  useSidebarStore: () => ({ isOpen, close }),
}));
vi.mock('@/hooks/layout/use-sidebar-visible-items', () => ({
  useSidebarVisibleItems: () => ({ items: [] }),
}));
vi.mock('@/utilities', () => ({ logger: { debug: vi.fn() } }));

type MatchMediaCall = { query: string; matches: boolean };

function stubMatchMedia(matches: boolean): MatchMediaCall[] {
  const calls: MatchMediaCall[] = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      calls.push({ query, matches });
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    },
  });
  return calls;
}

afterEach(() => {
  document.body.style.overflow = '';
  isOpen = true;
  vi.clearAllMocks();
});

/**
 * The modal treatment — body-scroll lock, focus trap, Escape to close — belongs
 * to the DRAWER. It used to be gated on a hard-coded `(min-width: 768px)` while
 * the CSS decided the same question with `touch:`. On a tablet the two
 * disagreed: the sidebar was invisible to the eye and still modal to the
 * keyboard, and the body's scroll was locked behind a sheet nobody could see.
 */
describe('useSidebarController — the modal treatment follows the CSS, not a second breakpoint', () => {
  it('asks the SAME media query the nav-rail CSS variant uses', () => {
    const calls = stubMatchMedia(false);
    renderHook(() => useSidebarController());

    expect(calls.map((call) => call.query)).toContain(MEDIA_QUERY_NAV_RAIL);
  });

  it('locks body scroll when the sidenav is a drawer', () => {
    stubMatchMedia(false);
    renderHook(() => useSidebarController());

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('leaves body scroll alone when the sidenav is a permanent rail', () => {
    stubMatchMedia(true);
    renderHook(() => useSidebarController());

    expect(document.body.style.overflow).toBe('');
  });

  it('restores body scroll when the drawer unmounts', () => {
    stubMatchMedia(false);
    const { unmount } = renderHook(() => useSidebarController());
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
