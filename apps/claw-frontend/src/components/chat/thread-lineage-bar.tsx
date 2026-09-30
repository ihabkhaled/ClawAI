'use client';

import { ChevronDown, GitBranch } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ThreadLineageBarProps } from '@/types';

/**
 * One line above the conversation: where this branch came from, and which
 * branches were cut from it. Renders nothing for an ordinary thread, so the
 * common case spends no height (rule 40).
 */
export function ThreadLineageBar(props: ThreadLineageBarProps): React.ReactElement | null {
  if (!props.visible) {
    return null;
  }
  return (
    <nav
      aria-label={props.branchedFromLabel}
      className="text-muted-foreground flex min-w-0 flex-wrap items-center justify-between gap-2 px-1 text-xs"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {props.parent ? (
          <span className="flex min-w-0 items-center gap-1">
            <span className="shrink-0">{props.branchedFromLabel}</span>
            <Link
              href={props.parent.href}
              className="text-foreground truncate underline-offset-2 hover:underline"
            >
              {props.parent.label}
            </Link>
          </span>
        ) : null}
        {props.parentDeleted ? <span>{props.sourceDeletedLabel}</span> : null}
      </div>
      {props.branches.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              {props.branchesLabel}
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-w-72">
            {props.branches.map((branch) => (
              <DropdownMenuItem key={branch.id} asChild>
                <Link href={branch.href} className="cursor-pointer truncate">
                  {branch.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
