'use client';

import { Loader2 } from 'lucide-react';

import type { BotCheckNoticeProps } from '@/types/bot-check.types';

/**
 * The browser check under an auth form: where the Turnstile widget renders
 * (empty, and hidden, unless an admin configured Turnstile) and a quiet
 * "Checking your browser…" line while the proof of work runs. The line has a
 * fixed height so it appearing never moves the button.
 */
export function BotCheckNotice({
  isChecking,
  setTurnstileContainer,
  t,
}: BotCheckNoticeProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <div
        ref={setTurnstileContainer}
        role="group"
        aria-label={t('auth.botCheck.widgetLabel')}
        className="flex justify-center empty:hidden"
        data-testid="bot-check-turnstile"
      />
      <p
        role="status"
        aria-live="polite"
        className="text-muted-foreground flex h-4 items-center gap-2 text-xs"
        data-testid="bot-check-status"
      >
        {isChecking ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            {t('auth.botCheck.checking')}
          </>
        ) : null}
      </p>
    </div>
  );
}
