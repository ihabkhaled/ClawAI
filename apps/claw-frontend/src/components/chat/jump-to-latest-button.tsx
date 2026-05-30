import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { JumpToLatestButtonProps } from '@/types';

/**
 * Floating pill rendered over the chat scroll container. Visible only while
 * the assistant is actively streaming AND the user has scrolled away from
 * the bottom — clicking it scrolls smoothly to the latest content and
 * re-enables the sticky auto-follow behaviour via useStickyBottomScroll.
 *
 * Kept intentionally small (size="sm", icon + short label) so it does not
 * obscure the message above it. Positioning is the parent's responsibility:
 * place this inside a `relative` ancestor of the scroll container.
 */
export function JumpToLatestButton({
  visible,
  onClick,
  t,
}: JumpToLatestButtonProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }
  const label = t('chat.jumpToLatest');
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      aria-label={label}
      className="absolute bottom-3 end-3 z-20 gap-1.5 rounded-full shadow-md"
    >
      <ChevronDown className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
