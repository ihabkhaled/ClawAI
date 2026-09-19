'use client';

import { Bot, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { NarrationLogProps } from '@/types/narration.types';
import { describeNarrationEntry, isAiVoice } from '@/utilities/narration.utility';

/**
 * The narrated work log: what the AI decided, what it crawled and searched, and
 * when it went back to the model — as one collapsible block ABOVE the answer,
 * so the answer stays its own bubble.
 *
 * One component, two data sources: live SSE entries while the turn runs, the
 * log stored on the answer afterwards. A native <details> so it works before
 * hydration and find-in-page can search a collapsed log. Open while live,
 * collapsed once the answer is there — the answer is what the user came for.
 */
export function NarrationLog({ entries, isLive, t }: NarrationLogProps): React.ReactElement | null {
  if (entries.length === 0) {
    return null;
  }

  return (
    <details
      open={isLive}
      className="border-border/60 bg-muted/30 group rounded-lg border text-sm"
      data-testid="narration-log"
    >
      <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-2 px-3 py-2 select-none">
        <Bot className={cn('h-4 w-4 shrink-0', isLive && 'animate-pulse')} aria-hidden="true" />
        <span className="text-foreground font-medium">
          {isLive ? t('narration.liveTitle') : t('narration.title')}
        </span>
        <span className="ms-auto text-xs">
          {t('narration.stepCount', { count: entries.length })}
        </span>
      </summary>
      <ol className="max-h-[40dvh] space-y-1.5 overflow-y-auto px-3 pb-3">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const aiVoice = isAiVoice(entry);
          return (
            <li key={entry.id} className="flex items-start gap-2">
              {aiVoice ? (
                <Bot className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Circle
                  className={cn(
                    'text-muted-foreground mt-1 h-2 w-2 shrink-0 fill-current',
                    isLive && isLast && 'text-primary animate-pulse',
                  )}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'min-w-0 break-words',
                  aiVoice ? 'text-foreground italic' : 'text-muted-foreground',
                )}
              >
                {describeNarrationEntry(entry, t)}
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
