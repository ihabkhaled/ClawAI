import {
  Download,
  Gavel,
  GitCompareArrows,
  MoreHorizontal,
  Search,
  Settings,
  Share2,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatThreadHeaderMenuProps } from '@/types';

/**
 * The chat header's overflow menu.
 *
 * Eight actions used to sit on the header row at once, which is why the header
 * was two rows tall on a laptop and three on a tablet. On a wide row the four
 * that change what the next answer looks like (compare, judge, find, share)
 * stay outside; the three in here are once-per-thread or end-of-conversation.
 *
 * Below `sm` this menu holds all seven. That is not a preference: every control
 * is floored at 44px by the global touch rule, and seven of them plus gaps left
 * the title 2px of a 375px row — it wrapped one character per line and the
 * header grew to 926px with a 2px conversation beneath it.
 *
 * Delete is always separated from the rest so it is never the item under a
 * mis-click. Radix owns the keyboard contract: arrow keys move, Escape closes
 * and returns focus to the trigger.
 */
export function ChatThreadHeaderMenu({
  menuLabel,
  collapsePrimaryActions,
  canCompare,
  compareLabel,
  onCompare,
  canUseQualityControls,
  qualityLabel,
  onQuality,
  searchLabel,
  onSearch,
  shareLabel,
  onShare,
  exportLabel,
  onExport,
  canExport,
  settingsLabel,
  onOpenSettings,
  deleteLabel,
  onDelete,
  isDeleting,
}: ChatThreadHeaderMenuProps): React.ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={menuLabel} className="shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {collapsePrimaryActions ? (
          <>
            {canCompare ? (
              <DropdownMenuItem onSelect={onCompare}>
                <GitCompareArrows className="me-2 h-4 w-4" />
                {compareLabel}
              </DropdownMenuItem>
            ) : null}
            {canUseQualityControls ? (
              <DropdownMenuItem onSelect={onQuality}>
                <Gavel className="me-2 h-4 w-4" />
                {qualityLabel}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={onSearch}>
              <Search className="me-2 h-4 w-4" />
              {searchLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onShare}>
              <Share2 className="me-2 h-4 w-4" />
              {shareLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onSelect={onExport} disabled={!canExport}>
          <Download className="me-2 h-4 w-4" />
          {exportLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenSettings}>
          <Settings className="me-2 h-4 w-4" />
          {settingsLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          disabled={isDeleting}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="me-2 h-4 w-4" />
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
