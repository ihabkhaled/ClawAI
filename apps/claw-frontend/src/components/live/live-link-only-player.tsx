import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LiveLinkOnlyPlayerProps } from '@/types/live.types';

/** A platform with no embeddable player: its name and a "Watch on <Platform>" button (new tab). */
export function LiveLinkOnlyPlayer({ embed, t }: LiveLinkOnlyPlayerProps): React.ReactElement {
  const platform = embed.platformName ?? '';
  return (
    <div
      className="bg-muted flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-md p-4 text-center"
      data-testid="live-link-only-player"
    >
      <p className="text-foreground text-lg font-semibold">{platform}</p>
      {embed.watchUrl === null ? (
        <p role="alert" className="text-foreground text-sm">
          {t('live.modal.playerError')}
        </p>
      ) : (
        <Button asChild>
          <a href={embed.watchUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t('live.platform.watchOn', { platform })}
          </a>
        </Button>
      )}
    </div>
  );
}
