'use client';

import { PanelLeftOpen } from 'lucide-react';

import { GroupedThreadList } from '@/components/chat/grouped-thread-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Direction } from '@/enums/direction.enum';
import { useThreadListDrawer } from '@/hooks/chat/use-thread-list-drawer';
import { useTranslation } from '@/lib/i18n';
import type { ThreadListDrawerProps } from '@/types/component.types';

/**
 * The conversation list, reachable from inside a thread on a phone.
 *
 * Below `md` the only way back to the list was the header's back arrow to
 * /chat, which unmounts the thread you were reading — so moving between two
 * conversations meant losing your place in both. Desktop never had the problem:
 * it shows the list beside the thread.
 *
 * A sheet rather than a route: the point is to switch threads without tearing
 * down the one you are in.
 */
export function ThreadListDrawer({ label }: ThreadListDrawerProps): React.ReactElement {
  const drawer = useThreadListDrawer();
  const { t, dir } = useTranslation();
  // The list belongs on the reading-order edge, which flips in Arabic and
  // Persian. Same pattern the marketing mobile menu already uses; the sheet
  // primitive only offers physical sides.
  const side = dir === Direction.RTL ? 'right' : 'left';

  return (
    <Sheet open={drawer.isOpen} onOpenChange={drawer.setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} className="md:hidden">
          <PanelLeftOpen className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="flex flex-col gap-3">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>

        <Input
          value={drawer.search}
          onChange={(event) => drawer.setSearch(event.target.value)}
          placeholder={t('chat.searchThreads')}
          aria-label={t('chat.searchThreads')}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          <GroupedThreadList
            threads={drawer.threads}
            isLoading={drawer.isLoading}
            isFetchingNextPage={drawer.isFetchingNextPage}
            hasNextPage={drawer.hasNextPage}
            onEndReached={drawer.fetchNextPage}
            onPin={drawer.handlePin}
            onArchive={drawer.handleArchive}
            isPinPending={drawer.isPinPending}
            isArchivePending={drawer.isArchivePending}
            search={drawer.search}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
