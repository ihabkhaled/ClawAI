import { THINKING_INDICATOR_LABEL } from '@/constants';
import { cn } from '@/lib/utils';
import type { ThinkingIndicatorProps } from '@/types';

export function ThinkingIndicator({ className }: ThinkingIndicatorProps) {
  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="flex max-w-[75%] flex-col gap-1 items-start">
        <span className="text-xs text-muted-foreground">{THINKING_INDICATOR_LABEL}</span>
        <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground">
          <div className="flex items-center gap-1" role="status" aria-label={THINKING_INDICATOR_LABEL}>
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
