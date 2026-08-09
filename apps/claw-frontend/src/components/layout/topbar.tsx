'use client';

import { Menu } from 'lucide-react';

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
    // Glass topbar: backdrop-blur over the surface-glass token tint, with a
    // subtle bottom hairline (border-border/30) so it separates from the
    // shell without competing with the sidebar's solid border. Falls back to
    // a flat card tint on browsers without backdrop-filter support.
    <header className="border-border/30 bg-card/85 sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between gap-1 border-b px-2 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-[hsl(var(--surface-glass))] sm:gap-2 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 md:hidden"
          onClick={toggle}
          aria-label={t('accessibility.toggleSidebar')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Breadcrumb />
        {title ? (
          // The `key={title}` forces React to re-mount the heading whenever
          // the page title changes so the tailwindcss-animate enter
          // animation replays. `animate-in fade-in slide-in-from-left-2
          // duration-300` is the standard combo from tailwindcss-animate.
          <h1
            key={title}
            className="ease-expo-out animate-in fade-in slide-in-from-left-2 truncate text-base font-semibold tracking-tight duration-300 sm:text-lg"
          >
            {title}
          </h1>
        ) : null}
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-2">
        <GlobalSearch />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <LocaleSwitcher />
        <ThemeSwitcher />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
