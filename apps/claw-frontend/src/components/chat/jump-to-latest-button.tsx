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
 *
 * Below `sm` it is an icon-only circle (the label stays for screen readers
 * and in `aria-label`): the labelled pill was ~150px wide and covered the
 * first words of the reply on a phone. The circle sits at the inline-end
 * edge, inside the strip the transcript rows give up for the floating rail
 * (rule 36 §12), so it covers no text there.
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
  const badgeLabel =
    hasUnread && unreadCount !== undefined && unreadCount > 99 ? '99+' : unreadCount;
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      aria-label={hasUnread ? `${label} (${String(unreadCount)})` : label}
      className="absolute end-3 bottom-3 z-20 gap-1.5 rounded-full shadow-md max-sm:px-0"
      data-jump-to-latest=""
    >
      <ChevronDown className="h-4 w-4" />
      <span className="max-sm:sr-only">{label}</span>
      {hasUnread ? (
        <span
          aria-hidden="true"
          className="bg-primary touch:text-xs text-primary-foreground ms-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] leading-none font-semibold"
        >
          {badgeLabel}
        </span>
      ) : null}
    </Button>
  );
}
