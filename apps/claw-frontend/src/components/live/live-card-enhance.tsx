import { Sparkles } from 'lucide-react';

import { LiveCardEnhancePanel } from '@/components/live/live-card-enhance-panel';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LiveCardEventProps } from '@/types/live.types';

/** "Enhance" opens the model picker; the panel (and its model queries) mounts only when opened. */
export function LiveCardEnhance({ eventId, t, locale }: LiveCardEventProps): React.ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground h-8 px-2 text-xs">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('live.card.enhance')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <LiveCardEnhancePanel eventId={eventId} t={t} locale={locale} />
      </PopoverContent>
    </Popover>
  );
}
