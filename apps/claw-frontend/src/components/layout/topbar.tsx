'use client';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSidebarStore } from '@/stores/sidebar.store';

import { GlobalSearch } from './global-search';
import { UserMenu } from './user-menu';

export function Topbar() {
  const { toggle } = useSidebarStore();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 md:hidden"
          onClick={toggle}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <GlobalSearch />
        <Separator orientation="vertical" className="h-6" />
        <UserMenu />
      </div>
    </header>
  );
}
