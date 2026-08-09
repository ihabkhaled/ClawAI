'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
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
    {
      'cursor-not-allowed text-muted-foreground/50': item.disabled === true,
      'bg-primary/10 font-semibold text-primary': item.disabled !== true && isActive,
      'text-muted-foreground hover:bg-accent hover:text-accent-foreground':
        item.disabled !== true && !isActive,
    },
  );

  // Animated active indicator: 3px-wide, 60%-tall pill anchored to the
  // inline-start edge. The `start-0` keyword respects RTL automatically and
  // the keyframe slides + scales the bar in when the route becomes active.
  // Rounded-end means the indicator looks like it's flowing OUT of the rail.
  const activeIndicator = isActive ? (
    <span
      aria-hidden
      className="animate-nav-indicator bg-primary absolute start-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-e-full"
    />
  ) : null;

  if (!hasChildren) {
    if (item.disabled === true) {
      return (
        <span aria-disabled="true" className={leafClass}>
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{t(item.labelKey)}</span>
        </span>
      );
    }
    return (
      <Link href={item.href} className={leafClass}>
        {activeIndicator}
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{t(item.labelKey)}</span>
        {item.badge ? (
          <span className="bg-primary/10 text-primary ms-auto rounded-full px-2 py-0.5 text-xs">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-stretch">
        {item.disabled === true ? (
          <span aria-disabled="true" className={cn(leafClass, 'flex-1')}>
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{t(item.labelKey)}</span>
          </span>
        ) : (
          <Link href={item.href} className={cn(leafClass, 'flex-1')}>
            {activeIndicator}
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{t(item.labelKey)}</span>
          </Link>
        )}
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={toggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground ms-1 flex min-h-11 w-8 items-center justify-center rounded-lg transition-colors"
        >
          <ChevronDown
            className={cn(
              'duration-normal ease-expo-out h-4 w-4 transition-transform',
              expanded ? 'rotate-0' : '-rotate-90',
            )}
          />
        </Button>
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
