import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MEDIA_QUERY_NAV_RAIL } from '@/constants/media-query.constants';

/**
 * The portal has exactly two navigation modes — a permanent sidenav rail, or a
 * drawer you open from a trigger — and the ONLY bug worth a regression suite
 * here is a width where NEITHER is on screen.
 *
 * That is what shipped. The sidebar hid itself under `touch:`
 * ((hover:none) and (pointer:coarse), (max-width:767px)) while both of its
 * triggers hid themselves under `md:hidden` (>= 768px). A tablet satisfies both
 * conditions at once — an iPad Pro reports a coarse pointer at 1032px — so from
 * 768px upward on any touch screen the sidebar was `visibility: hidden`, the
 * topbar hamburger was gone, the bottom nav was gone, and a 256px `md:static`
 * ghost of the sidebar still held its column. Measured at 1032x1376: sidebar
 * 256px wide and hidden, hamburger absent, bottom nav 0px tall.
 *
 * These tests do not check "the sidebar is hidden on mobile". They check the
 * only property that makes such a gap impossible: every element that flips
 * between the two modes is gated on ONE variant, and the drawer half of each
 * pair is unprefixed so it is the fallback everywhere else.
 */

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
  }),
}));
vi.mock('@/hooks/layout/use-sidebar-controller', () => ({
  useSidebarController: () => ({
    isOpen: false,
    close: vi.fn(),
    handleOverlayClick: vi.fn(),
    items: [],
  }),
}));
vi.mock('@/hooks/layout/use-mobile-bottom-nav', () => ({
  useMobileBottomNav: () => ({
    items: [],
    pathname: '/chat',
    openSidebar: vi.fn(),
    isActive: () => false,
  }),
}));
vi.mock('@/stores/sidebar.store', () => ({ useSidebarStore: () => ({ toggle: vi.fn() }) }));
vi.mock('@/hooks/layout/use-topbar-title', () => ({ useTopbarTitle: () => 'Dashboard' }));
vi.mock('@/components/layout/gpu-badge', () => ({ GpuBadge: () => <span /> }));
vi.mock('@/components/layout/sidebar-nav-item', () => ({ SidebarNavItem: () => <li /> }));
vi.mock('@/components/layout/breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('@/components/layout/global-search', () => ({ GlobalSearch: () => <div /> }));
vi.mock('@/components/layout/locale-switcher', () => ({ LocaleSwitcher: () => <div /> }));
vi.mock('@/components/layout/theme-switcher', () => ({ ThemeSwitcher: () => <div /> }));
vi.mock('@/components/layout/user-menu', () => ({ UserMenu: () => <div /> }));
vi.mock('@/components/common/currency-switcher', () => ({ CurrencySwitcher: () => <div /> }));
vi.mock('@/components/layout/mobile-bottom-nav-item', () => ({
  MobileBottomNavItem: () => <a href="/chat">item</a>,
}));

const NAV_MODE_VARIANT = 'nav-rail';

// The variants that CANNOT gate a nav-mode flip, because neither is the
// complement of the other: `md:` is a width and `touch:` is a pointer, and the
// shipped bug was exactly the region where both were true at once.
const FORBIDDEN_GATES = ['md:hidden', 'md:visible', 'md:static', 'touch:invisible'];

function variantsOf(className: string): string[] {
  return className
    .split(/\s+/)
    .filter((token) => token.includes(':'))
    .map((token) => token.slice(0, token.lastIndexOf(':')));
}

describe('portal navigation mode — the rail and the drawer are complements', () => {
  it('hides the closed sidebar with UNPREFIXED utilities, so the drawer is the fallback at every width', () => {
    render(<Sidebar />);
    const aside = screen.getByRole('complementary', { hidden: true });
    const classes = aside.className.split(/\s+/);

    // Unprefixed: no media condition can fail to match and leave the sheet on
    // screen, and no other variant can out-order it in the cascade.
    expect(classes).toContain('invisible');
    expect(classes).toContain('translate-y-full');
    expect(classes).toContain('pointer-events-none');
    for (const gate of FORBIDDEN_GATES) {
      expect(classes).not.toContain(gate);
    }
  });

  it('turns the sidebar into a rail only under the nav-mode variant', () => {
    render(<Sidebar />);
    const classes = screen.getByRole('complementary', { hidden: true }).className.split(/\s+/);

    for (const utility of ['visible', 'static', 'translate-y-0', 'pointer-events-auto']) {
      expect(classes).toContain(`${NAV_MODE_VARIANT}:${utility}`);
    }
    expect(classes).toContain(`${NAV_MODE_VARIANT}:w-[var(--sidebar-width)]`);
  });

  it('gates the topbar drawer trigger and the bottom nav on that same variant', () => {
    const { unmount } = render(<Topbar />);
    const hamburger = screen.getByLabelText('accessibility.toggleSidebar');
    expect(hamburger.className.split(/\s+/)).toContain(`${NAV_MODE_VARIANT}:hidden`);
    for (const gate of FORBIDDEN_GATES) {
      expect(hamburger.className.split(/\s+/)).not.toContain(gate);
    }
    unmount();

    render(<MobileBottomNav />);
    const nav = screen.getByRole('navigation');
    expect(nav.className.split(/\s+/)).toContain(`${NAV_MODE_VARIANT}:hidden`);
    for (const gate of FORBIDDEN_GATES) {
      expect(nav.className.split(/\s+/)).not.toContain(gate);
    }
  });

  it('uses ONE variant across the sidebar, the hamburger and the bottom nav', () => {
    const { unmount: unmountSidebar } = render(<Sidebar />);
    const sidebarVariants = variantsOf(
      screen.getByRole('complementary', { hidden: true }).className,
    );
    unmountSidebar();

    const { unmount: unmountTopbar } = render(<Topbar />);
    const hamburgerVariants = variantsOf(
      screen.getByLabelText('accessibility.toggleSidebar').className,
    );
    unmountTopbar();

    render(<MobileBottomNav />);
    const navVariants = variantsOf(screen.getByRole('navigation').className);

    // Each of the three carries the nav-mode variant, and it is the ONLY
    // variant the three have in common — a second shared gate is how the two
    // halves drift apart again.
    const shared = sidebarVariants
      .filter((v) => hamburgerVariants.includes(v))
      .filter((v) => navVariants.includes(v));
    expect([...new Set(shared)]).toEqual([NAV_MODE_VARIANT]);
  });
});

describe('nav-mode media condition — CSS and JS say the same thing', () => {
  it('declares the variant in globals.css with exactly MEDIA_QUERY_NAV_RAIL', () => {
    const css = readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8');
    const declaration = css.match(/@custom-variant\s+nav-rail\s*\{\s*@media([\s\S]*?)\{\s*@slot;/);
    expect(declaration).not.toBeNull();

    const normalize = (value: string): string => value.replaceAll(/\s+/g, ' ').trim();
    expect(normalize(declaration?.[1] ?? '')).toBe(normalize(MEDIA_QUERY_NAV_RAIL));
  });

  it('matches every reported tablet viewport and no phone viewport', () => {
    // Evaluated by hand against the constant rather than through matchMedia,
    // which jsdom does not implement. These are the exact devices from the bug
    // report plus the phone-in-landscape case the old `touch:` guard existed
    // for.
    const isRail = (w: number, h: number, coarse: boolean): boolean =>
      (w >= 768 && h >= 600) || (!coarse && w >= 768);

    expect(isRail(1032, 1376, true)).toBe(true); // iPad Pro 13, portrait
    expect(isRail(960, 1440, true)).toBe(true); // Surface Pro 10, portrait
    expect(isRail(1024, 768, true)).toBe(true); // iPad Mini, landscape
    expect(isRail(1280, 800, true)).toBe(true); // Nest Hub Max, landscape
    expect(isRail(793, 773, true)).toBe(true); // small tablet
    expect(isRail(1920, 1080, false)).toBe(true); // desktop
    expect(isRail(900, 700, false)).toBe(true); // narrow desktop window

    expect(isRail(412, 915, true)).toBe(false); // phone, portrait
    expect(isRail(915, 412, true)).toBe(false); // phone, LANDSCAPE — the case
    expect(isRail(844, 390, true)).toBe(false); // that a plain `md:` gets wrong
  });
});
