import {
  BOT_CHECK_SCRIPT_TIMEOUT_MS,
  TURNSTILE_SCRIPT_ID,
  TURNSTILE_SCRIPT_URL,
} from '@/constants/bot-check.constants';
import type { TurnstileWidgetHandle } from '@/types/bot-check.types';

import { loadExternalScript } from './script-loader';

/**
 * Wrapper around Cloudflare Turnstile (explicit render). The only module that
 * touches `window.turnstile`.
 *
 * A token is single use, so the handle keeps at most one: `nextToken` hands it
 * over (or waits for the widget to produce one), and `reset` asks the widget
 * for a fresh one for the next submit. An error resolves waiters with `null`
 * so a broken widget never holds the form hostage; the server then answers
 * BOT_CHECK_REQUIRED and the form says so.
 */
export async function mountTurnstileWidget(
  container: HTMLElement,
  siteKey: string,
): Promise<TurnstileWidgetHandle> {
  await loadExternalScript(TURNSTILE_SCRIPT_ID, TURNSTILE_SCRIPT_URL, BOT_CHECK_SCRIPT_TIMEOUT_MS);
  const turnstile = window.turnstile;
  if (turnstile === undefined) {
    throw new Error('Turnstile did not initialise');
  }

  let latest: string | null = null;
  const waiters = new Set<(value: string | null) => void>();
  const notify = (value: string | null): void => {
    for (const waiter of [...waiters]) {
      waiter(value);
    }
  };

  const widgetId = turnstile.render(container, {
    sitekey: siteKey,
    callback: (value: string) => {
      latest = value;
      if (waiters.size > 0) {
        latest = null;
        notify(value);
      }
    },
    'expired-callback': () => {
      latest = null;
    },
    'error-callback': () => {
      latest = null;
      notify(null);
    },
  });
  if (widgetId === undefined) {
    throw new Error('Turnstile did not render');
  }

  return {
    nextToken: (timeoutMs: number) => {
      if (latest !== null) {
        const ready = latest;
        latest = null;
        return Promise.resolve(ready);
      }
      return new Promise<string | null>((resolve) => {
        const done = (value: string | null): void => {
          clearTimeout(timer);
          waiters.delete(done);
          resolve(value);
        };
        const timer = setTimeout(() => done(null), timeoutMs);
        waiters.add(done);
      });
    },
    reset: () => {
      latest = null;
      turnstile.reset(widgetId);
    },
    remove: () => {
      notify(null);
      turnstile.remove(widgetId);
    },
  };
}
