'use client';

import Link from 'next/link';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MobileBottomNavLinkProps } from '@/types/mobile-bottom-nav.types';

export function MobileBottomNavItem({
  item,
  isActive,
}: MobileBottomNavLinkProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'touch:text-xs relative flex h-full min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] leading-tight font-medium transition-colors sm:text-xs',
        'focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {isActive ? (
        <span
          aria-hidden
          className="bg-primary absolute top-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
        />
      ) : null}
      <item.icon
        className={cn(
          'h-5 w-5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
          isActive ? 'scale-110 motion-reduce:scale-100' : 'scale-100',
        )}
      />
      <span className="max-w-full break-words whitespace-normal">{t(item.labelKey)}</span>
    </Link>
  );
}
