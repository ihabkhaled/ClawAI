import { Globe, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ShareChatButtonProps } from '@/types';

/**
 * The header entry point.
 *
 * The icon changes to a globe once the chat is public. That distinction is worth
 * a different glyph: an owner scanning their threads should be able to see which
 * conversations are reachable from the open internet without opening each one.
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
      className="sm:size-auto sm:h-9 sm:w-auto sm:px-3"
      onClick={onClick}
      aria-label={label}
    >
      {isShared ? <Globe className="h-4 w-4 sm:me-2" /> : <Share2 className="h-4 w-4 sm:me-2" />}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
