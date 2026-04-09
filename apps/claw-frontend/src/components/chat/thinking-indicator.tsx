import { AlertTriangle, ArrowRight, XCircle } from 'lucide-react';

import { THINKING_INDICATOR_LABEL } from '@/constants';
import { cn } from '@/lib/utils';
import type { ThinkingIndicatorProps } from '@/types';

export function ThinkingIndicator({
  className,
  fallbackAttempts,
  streamError,
}: ThinkingIndicatorProps) {
  const hasFallbacks = fallbackAttempts && fallbackAttempts.length > 0;

  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="flex max-w-[85%] flex-col items-start gap-1.5">
        {hasFallbacks ? (
          <div className="flex flex-col gap-1">
            {fallbackAttempts.map((attempt) => (
              <div
                key={`${attempt.failedProvider}-${String(attempt.attempt)}`}
                className="flex items-center gap-1.5 text-xs text-amber-500"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>
                  {attempt.failedProvider}/{attempt.failedModel} failed
                </span>
                {attempt.nextProvider ? (
                  <>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>
                      trying {attempt.nextProvider}/{attempt.nextModel}...
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {streamError ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{streamError}</span>
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">
              {hasFallbacks ? 'Retrying with fallback...' : THINKING_INDICATOR_LABEL}
            </span>
            <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground">
              <div
                className="flex items-center gap-1"
                role="status"
                aria-label={THINKING_INDICATOR_LABEL}
              >
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
