import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { JumpToLatestButtonProps } from '@/types';

/**
 * Floating pill rendered over the chat scroll container. Visible whenever the
 * user has scrolled meaningfully away from the bottom — clicking it scrolls
 * smoothly to the latest content and re-enables the sticky auto-follow
 * behaviour via useStickyBottomScroll.
 *
 * When `unreadCount` is a positive number (new assistant messages arrived
 * while the user was reading older history), a small badge renders next to
 * the chevron — matches the standard "jump to bottom" affordance in
 * Slack / Discord / iMessage. Capped at 99+ to keep the pill compact.
 *
 * Kept intentionally small (size="sm", icon + short label) so it does not
 * obscure the message above it. Positioning is the parent's responsibility:
 * place this inside a `relative` ancestor of the scroll container.
 */
export function JumpToLatestButton({
  visible,
  onClick,
  t,
  unreadCount,
}: JumpToLatestButtonProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }
  const label = t('chat.jumpToLatest');
  const hasUnread = unreadCount !== undefined && unreadCount > 0;
  const badgeLabel = hasUnread && unreadCount !== undefined && unreadCount > 99 ? '99+' : unreadCount;
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      aria-label={hasUnread ? `${label} (${String(unreadCount)})` : label}
      className="absolute bottom-3 end-3 z-20 gap-1.5 rounded-full shadow-md"
    >
      <ChevronDown className="h-4 w-4" />
      <span>{label}</span>
      {hasUnread ? (
        <span
          aria-hidden="true"
          className="ms-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground"
        >
          {badgeLabel}
        </span>
      ) : null}
    </Button>
  );
}
