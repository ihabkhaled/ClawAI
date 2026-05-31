'use client';

import { X, Zap } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ROUTES } from '@/constants';
import { useSidebarController } from '@/hooks/layout/use-sidebar-controller';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { GpuBadge } from './gpu-badge';
import { SidebarNavItem } from './sidebar-nav-item';

export function Sidebar() {
  const { isOpen, close, handleOverlayClick, items } = useSidebarController();
  const { t } = useTranslation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={handleOverlayClick}
          role="presentation"
          aria-hidden
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex h-full w-[min(86vw,320px)] flex-col border-e bg-card transition-transform duration-200 ease-in-out md:static md:z-auto md:w-64 md:translate-x-0',
          isOpen
            ? 'translate-x-0 max-md:shadow-floating'
            : 'max-md:ltr:-translate-x-full max-md:rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
          <Link href={ROUTES.CHAT} className="flex items-center gap-2 text-lg font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span>{t('common.brandName')}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 md:hidden"
            onClick={close}
            aria-label={t('accessibility.closeSidebar')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Separator />
        <nav className="scroll-fade-y flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <SidebarNavItem key={item.href} item={item} />
          ))}
        </nav>
        <Separator />
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {t('common.brandVersion', { version: '0.1.0' })}
          </p>
          <GpuBadge />
        </div>
      </aside>
    </>
  );
}
