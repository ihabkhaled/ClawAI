'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

import { useBreadcrumb } from '@/hooks/layout/use-breadcrumb';
import { cn } from '@/lib/utils';
import type { BreadcrumbProps } from '@/types';

// Topbar ANCESTOR breadcrumb for nested routes. Renders only the non-current
// crumbs (each a link, each followed by a chevron); the current page name is
// owned by the topbar <h1> that sits after this. Renders nothing for top-level
// pages (trail < 2). Hidden below md — mobile uses the page-header back button.
// Pure render — trail resolution + i18n live in useBreadcrumb.
export function Breadcrumb({ className }: BreadcrumbProps): React.ReactElement | null {
  const crumbs = useBreadcrumb();
  const ancestors = crumbs.filter((crumb) => !crumb.isCurrent);
  if (ancestors.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('hidden min-w-0 items-center gap-1.5 md:flex', className)}
    >
      {ancestors.map((crumb) => (
        <Fragment key={crumb.href}>
          <Link
            href={crumb.href}
            className="truncate rounded text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {crumb.label}
          </Link>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
            aria-hidden
          />
        </Fragment>
      ))}
    </nav>
  );
}
