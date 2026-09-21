'use client';

import { Menu } from 'lucide-react';

import { CurrencySwitcher } from '@/components/common/currency-switcher';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTopbarTitle } from '@/hooks/layout/use-topbar-title';
import { useTranslation } from '@/lib/i18n';
import { useSidebarStore } from '@/stores/sidebar.store';

import { Breadcrumb } from './breadcrumb';
import { GlobalSearch } from './global-search';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeSwitcher } from './theme-switcher';
import { UserMenu } from './user-menu';

export function Topbar() {
  const { toggle } = useSidebarStore();
  const { t } = useTranslation();
  const title = useTopbarTitle();

  return (
    <header
      // The toast column stacks from the top edge and measures around whatever
      // is pinned there; without this it would cover the search box and the
      // account menu.
      data-top-obstacle=""
      // `@container`: the controls in here have to answer to the WIDTH OF THIS
      // BAR, not the width of the window. Once the sidenav is a 256px rail the
      // two numbers are 256px apart, and every `sm:`-gated label in here was
      // sizing itself against the wrong one — at 793x773 the right-hand cluster
      // came to 564px inside a 537px bar, so the account menu was clipped by
      // the viewport edge and the page title was squeezed to 0px. See the
      // username label in user-menu.tsx for the one `@`-gated element.
      // The gap and the side padding are `@`-gated for the same reason as the
      // labels: at 768x1024 the bar is 512px and `sm:px-6` was spending 48px of
      // it on air, which is where the last 3px of overflow came from.
      className="border-border/30 bg-card/85 @container sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between gap-1 border-b px-2 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-[hsl(var(--surface-glass))] @2xl:gap-2 @2xl:px-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          // `nav-rail:hidden`, not `md:hidden`: this button is the ONLY way to
          // reopen the sidebar in drawer mode, so it has to disappear on
          // exactly the condition that makes the sidebar permanent — never one
          // pixel earlier. Under `md:hidden` a tablet lost it at 768px while
          // the sidebar stayed a hidden sheet, leaving no navigation at all.
          className="nav-rail:hidden shrink-0"
          onClick={toggle}
          aria-label={t('accessibility.toggleSidebar')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden min-w-0 sm:block">
          <Breadcrumb />
        </div>
        {title ? (
          <h1
            key={title}
            className="ease-expo-out animate-in fade-in slide-in-from-left-2 min-w-0 truncate text-sm font-semibold tracking-tight duration-300 sm:text-lg"
          >
            {title}
          </h1>
        ) : null}
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-2">
        <GlobalSearch />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        {/* Visible at every width, unlike the locale and theme controls beside
            it. A phone is exactly where someone notices the prices are in the
            wrong currency, and the portal has no other place to change it. */}
        <CurrencySwitcher />
        {/* Also visible at every width, for the same reason. The portal had no
            language control at all below 640px: the topbar hid it and neither
            the sidebar, the user menu nor the bottom navigation carries one,
            so a phone user's only route was the Settings page. */}
        <LocaleSwitcher />
        <div className="hidden sm:block">
          <ThemeSwitcher />
        </div>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
