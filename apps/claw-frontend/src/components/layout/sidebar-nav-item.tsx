'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSidebarNavItemState } from '@/hooks/layout/use-sidebar-nav-item-state';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SidebarNavItemProps } from '@/types';

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const hasChildren = item.children !== undefined && item.children.length > 0;
  const isSelfActive = pathname === item.href;
  const isSubtreeActive = pathname.startsWith(`${item.href}/`);
  const isActive = isSelfActive || (!hasChildren && isSubtreeActive);
  const { expanded, toggle } = useSidebarNavItemState({
    hasChildren,
    parentHref: item.href,
    children: item.children ?? [],
    pathname,
  });

  const leafClass = cn(
    'flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:min-h-11',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );

  if (!hasChildren) {
    return (
      <Link href={item.href} className={leafClass}>
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

  return (
    <div>
      <div className="flex items-stretch">
        <Link href={item.href} className={cn(leafClass, 'flex-1')}>
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{t(item.labelKey)}</span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
          className="ms-1 flex min-h-11 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-0' : '-rotate-90')}
          />
        </button>
      </div>
      {expanded ? (
        <div className="mt-1 space-y-1 ps-6">
          {(item.children ?? []).map((child) => (
            <SidebarNavItem key={child.href} item={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
