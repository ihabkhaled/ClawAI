'use client';

import { X, Zap } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APP_VERSION, ROUTES } from '@/constants';
import { useSidebarController } from '@/hooks/layout/use-sidebar-controller';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { GpuBadge } from './gpu-badge';
import { LocaleSwitcher } from './locale-switcher';
import { SidebarNavItem } from './sidebar-nav-item';
import { ThemeSwitcher } from './theme-switcher';

export function Sidebar() {
  const { isOpen, close, handleOverlayClick, items } = useSidebarController();
  const { t } = useTranslation();

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={handleOverlayClick}
          role="presentation"
          aria-hidden
        />
      ) : null}

      <aside
        data-mobile-sidebar
        className={cn(
          'bg-card duration-normal ease-expo-out fixed z-50 flex flex-col transition-transform',
          'shadow-floating inset-x-0 top-auto bottom-0 h-[85dvh] rounded-t-2xl border-t',
          'md:static md:visible md:inset-auto md:h-full md:w-[var(--sidebar-width)] md:translate-y-0 md:rounded-none md:border-e md:border-t-0 md:shadow-none',
          isOpen
            ? 'visible translate-y-0'
            : 'max-md:invisible max-md:pointer-events-none max-md:translate-y-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href={ROUTES.CHAT}
            className="group focus-visible:ring-primary/40 flex min-h-11 items-center gap-3 rounded-lg transition-colors outline-none focus-visible:ring-2"
          >
            <div className="bg-primary/10 ring-primary/20 duration-normal ease-expo-out group-hover:bg-primary/15 group-hover:ring-primary/30 flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition-all">
              <Zap className="text-primary h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">{t('common.brandName')}</span>
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t('common.brandTagline')}
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
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
        <div className="flex items-center gap-2 px-4 pt-3 md:hidden">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
        <div className="safe-bottom safe-bottom-base-nav flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <span className="bg-muted/60 text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {t('common.brandVersion', { version: APP_VERSION })}
          </span>
          <GpuBadge />
        </div>
      </aside>
    </>
  );
}
