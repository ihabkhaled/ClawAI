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
    'relative flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast ease-expo-out md:min-h-11',
    isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );

  // Animated active indicator: 3px-wide, 60%-tall pill anchored to the
  // inline-start edge. The `start-0` keyword respects RTL automatically and
  // the keyframe slides + scales the bar in when the route becomes active.
  // Rounded-end means the indicator looks like it's flowing OUT of the rail.
  const activeIndicator = isActive ? (
    <span
      aria-hidden
      className="animate-nav-indicator absolute start-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-e-full bg-primary"
    />
  ) : null;

  if (!hasChildren) {
    return (
      <Link href={item.href} className={leafClass}>
        {activeIndicator}
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
          {activeIndicator}
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
            className={cn(
              'h-4 w-4 transition-transform duration-normal ease-expo-out',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
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
