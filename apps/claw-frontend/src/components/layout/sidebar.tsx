'use client';

import { Zap } from 'lucide-react';
import Link from 'next/link';

import { Separator } from '@/components/ui/separator';
import { ROUTES, SIDEBAR_NAV_ITEMS } from '@/constants';
import { useSidebarController } from '@/hooks/layout/use-sidebar-controller';
import { cn } from '@/lib/utils';

import { SidebarNavItem } from './sidebar-nav-item';

export function Sidebar() {
  const { isOpen, close, handleOverlayClick } = useSidebarController();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={handleOverlayClick}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              close();
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close sidebar"
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex h-full w-64 flex-col border-e bg-card transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0',
          isOpen ? 'translate-x-0' : 'max-md:ltr:-translate-x-full max-md:rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <Link href={ROUTES.CHAT} className="flex items-center gap-2 text-lg font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>Claw</span>
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {SIDEBAR_NAV_ITEMS.map((item) => (
            <SidebarNavItem key={item.href} item={item} />
          ))}
        </nav>
        <Separator />
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Claw v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
