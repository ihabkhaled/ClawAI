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
 * Icon-only until `lg`, matching the other three primary header actions. It
 * used to reveal its label from `sm` up, which left it as the single labelled
 * control on a tablet header full of icons.
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
      className="lg:size-auto lg:h-8 lg:w-auto lg:px-2.5"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {isShared ? (
        <Globe className="h-4 w-4 lg:me-1.5" />
      ) : (
        <Share2 className="h-4 w-4 lg:me-1.5" />
      )}
      <span className="hidden lg:inline">{label}</span>
    </Button>
  );
}
