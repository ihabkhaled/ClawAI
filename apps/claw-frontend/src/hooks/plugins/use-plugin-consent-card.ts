import { useCallback, useEffect, useRef, useState } from 'react';

import { PLUGIN_CONSENT_TICK_MS } from '@/constants/plugin-consent-card.constants';
import { PluginConsentChoice } from '@/enums/plugin-consent-card.enum';
import type { UsePluginConsentCardArgs } from '@/types/plugin-consent-card.types';
import { secondsLeft } from '@/utilities/plugin-consent-card.utility';

/**
 * One consent card's behaviour: a countdown that ends at the request deadline (the buttons then
 * go away and the server has already declined it), a second confirmation before "Always allow"
 * on a tool that can delete things, and keyboard handling. Deny takes the first focus, so a
 * stray Enter never approves anything; Escape denies, or steps back out of the confirmation.
 */
export function usePluginConsentCard({ request, onDecide, onExpired }: UsePluginConsentCardArgs) {
  const [remaining, setRemaining] = useState(() => secondsLeft(request.expiresAt, Date.now()));
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const denyRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const expired = remaining <= 0;

  useEffect(() => {
    if (secondsLeft(request.expiresAt, Date.now()) <= 0) {
      setRemaining(0);
      return undefined;
    }
    const timer = setInterval(() => {
      const next = secondsLeft(request.expiresAt, Date.now());
      setRemaining(next);
      if (next <= 0) {
        clearInterval(timer);
        onExpired();
      }
    }, PLUGIN_CONSENT_TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [request.expiresAt, onExpired]);

  useEffect(() => {
    const target = confirming ? confirmRef.current : denyRef.current;
    target?.focus();
  }, [confirming, expired]);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') {
        return;
      }
      event.stopPropagation();
      if (confirming) {
        setConfirming(false);
      } else {
        onDecide(request.id, { choice: PluginConsentChoice.Deny });
      }
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [confirming, onDecide, request.id]);

  const choose = useCallback(
    (choice: PluginConsentChoice): void => {
      if (choice === PluginConsentChoice.AlwaysAllow && request.options.alwaysNeedsConfirmation) {
        setConfirming(true);
        return;
      }
      onDecide(request.id, { choice });
    },
    [onDecide, request.id, request.options.alwaysNeedsConfirmation],
  );

  const confirmAlways = useCallback((): void => {
    onDecide(request.id, { choice: PluginConsentChoice.AlwaysAllow, confirmDestructive: true });
  }, [onDecide, request.id]);

  const back = useCallback((): void => {
    setConfirming(false);
  }, []);

  return {
    remaining,
    expired,
    confirming,
    rootRef,
    denyRef,
    confirmRef,
    choose,
    confirmAlways,
    back,
  };
}
