'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SidebarNavItemProps } from '@/types';

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{t(item.labelKey)}</span>
      {item.badge ? (
        <span className="ms-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
