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

      {/* Sidebar
       * Desktop (md+): static left rail, w-[var(--sidebar-width)], border-e.
       * Mobile (max-md): bottom-sheet — full-width, inset bottom, h-85dvh,
       * rounded-t-2xl, border-t (NOT border-e), slides down via translate-y-full
       * when closed. Drag-handle visible only on mobile. */}
      <aside
        className={cn(
          'fixed z-50 flex flex-col bg-card transition-transform duration-normal ease-expo-out',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 top-auto h-[85dvh] rounded-t-2xl border-t shadow-floating',
          // Desktop overrides: revert to left rail layout
          'md:static md:inset-auto md:h-full md:w-[var(--sidebar-width)] md:translate-y-0 md:rounded-none md:border-e md:border-t-0 md:shadow-none',
          isOpen ? 'translate-y-0' : 'max-md:translate-y-full',
        )}
      >
        {/* Mobile-only drag handle */}
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex h-16 items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href={ROUTES.CHAT}
            className="group flex items-center gap-3 rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-all duration-normal ease-expo-out group-hover:bg-primary/15 group-hover:ring-primary/30">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">{t('common.brandName')}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('common.brandTagline')}
              </span>
            </div>
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
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {t('common.brandVersion', { version: '0.1.0' })}
          </span>
          <GpuBadge />
        </div>
      </aside>
    </>
  );
}
