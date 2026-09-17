import { Globe, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ShareChatButtonProps } from '@/types';

/**
 * The header entry point.
 *
 * The icon changes to a globe once the chat is public. That distinction is worth
 * a different glyph: an owner scanning their threads should be able to see which
 * conversations are reachable from the open internet without opening each one.
 *
 * Icon-only at every width, matching the other three primary actions beside it
 * in `ChatThreadActionRail`. It used to reveal its label from `lg` up, back
 * when those four sat on the header row and there was horizontal room to spend
 * on a word. In a vertical rail there is not: a rail wide enough for "Share" is
 * a sidebar. The name stays on `aria-label`, on `title`, and spelled out in the
 * `…` menu, which is the only form below `sm`.
 */
export function ShareChatButton({
  label,
  isShared,
  onClick,
}: ShareChatButtonProps): React.ReactElement {
  return (
    <Button
      variant={isShared ? 'default' : 'ghost'}
      size="icon-sm"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {isShared ? <Globe className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </Button>
  );
}
