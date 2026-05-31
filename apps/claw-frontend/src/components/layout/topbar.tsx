'use client';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTopbarTitle } from '@/hooks/layout/use-topbar-title';
import { useTranslation } from '@/lib/i18n';
import { useSidebarStore } from '@/stores/sidebar.store';

import { GlobalSearch } from './global-search';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeSwitcher } from './theme-switcher';
import { UserMenu } from './user-menu';

export function Topbar() {
  const { toggle } = useSidebarStore();
  const { t } = useTranslation();
  const title = useTopbarTitle();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 shrink-0 md:hidden"
          onClick={toggle}
          aria-label={t('accessibility.toggleSidebar')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title ? (
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
