import { Copy, Terminal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RUNTIME_RAW_EVENTS_VISIBLE_LIMIT } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeRawEventsDrawerProps } from '@/types';
import { serializeRuntimeEvent } from '@/utilities';

// Dev-only collapsible drawer that lists the last 50 raw runtime events.
// Each event is rendered as a copy-friendly JSON block. Events are kept as
// `unknown` so the drawer never decodes shape — it is intentionally a
// passthrough surface for debugging both cloud and local-runtime streams.
//
// Uses a native <details> element (no shadcn Collapsible exists in this
// codebase) so the drawer ships zero extra dependencies and stays
// keyboard-accessible by default.
export function RuntimeRawEventsDrawer({
  events,
  isOpen,
  onToggle,
  className,
}: RuntimeRawEventsDrawerProps): React.ReactElement {
  const { t } = useTranslation();
  const visibleEvents = events.slice(-RUNTIME_RAW_EVENTS_VISIBLE_LIMIT);

  const handleToggle = (event: React.SyntheticEvent<HTMLDetailsElement>): void => {
    onToggle(event.currentTarget.open);
  };

  const handleCopy = (event: unknown): void => {
    if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
      return;
    }
    void navigator.clipboard.writeText(serializeRuntimeEvent(event));
  };

  return (
    <details
      open={isOpen}
      onToggle={handleToggle}
      className={cn(
        'group w-full rounded-lg border border-border/60 bg-muted/40 px-3 py-2',
        className,
      )}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
        aria-label={t('runtimeProgress.rawEvents.toggle')}
      >
        <Terminal className="h-3.5 w-3.5" />
        {t('runtimeProgress.rawEvents.title')}
        <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-normal">
          {visibleEvents.length}
        </span>
      </summary>
      <div className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {visibleEvents.length === 0 ? (
          <div className="text-[11px] italic text-muted-foreground">
            {t('runtimeProgress.rawEvents.empty')}
          </div>
        ) : (
          visibleEvents.map((event, index) => (
            <div
              // Raw events have no stable identifier — the position-suffixed
              // serialized payload is the only unique signature available
              // without decoding the payload shape.
              key={`${String(index)}:${serializeRuntimeEvent(event).slice(0, 80)}`}
              className="rounded-md border border-border/40 bg-background/60 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  #{visibleEvents.length - index}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground"
                  onClick={() => handleCopy(event)}
                  aria-label={t('runtimeProgress.rawEvents.copy')}
                >
                  <Copy className="h-3 w-3" />
                  {t('runtimeProgress.rawEvents.copy')}
                </Button>
              </div>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-snug text-muted-foreground">
                {serializeRuntimeEvent(event)}
              </pre>
            </div>
          ))
        )}
      </div>
    </details>
  );
}
