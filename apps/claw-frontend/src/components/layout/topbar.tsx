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
    <header
      // The toast column stacks from the top edge and measures around whatever
      // is pinned there; without this it would cover the search box and the
      // account menu.
      data-top-obstacle=""
      className="border-border/30 bg-card/85 sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between gap-1 border-b px-2 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-[hsl(var(--surface-glass))] sm:gap-2 sm:px-6"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
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
        <div className="hidden sm:block">
          <LocaleSwitcher />
        </div>
        <div className="hidden sm:block">
          <ThemeSwitcher />
        </div>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}
