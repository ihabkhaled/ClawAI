'use client';

import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { PwaInstallPromptEvent } from '@/types/pwa.types';

export function PwaManager(): React.ReactElement | null {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = React.useState(false);
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = React.useState<PwaInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = React.useState(false);

  React.useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = (): void => setIsOffline(false);
    const handleOffline = (): void => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setInstallPrompt(event as PwaInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
          }
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker) {
              return;
            }
            worker.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(worker);
              }
            });
          });
        })
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  React.useEffect(() => {
    if (!waitingWorker || !('serviceWorker' in navigator)) {
      return;
    }
    const handleControllerChange = (): void => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, {
      once: true,
    });
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, [waitingWorker]);

  const applyUpdate = (): void => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  };

  const install = async (): Promise<void> => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (!isOffline && !waitingWorker && (!installPrompt || installDismissed)) {
    return null;
  }

  return (
    <div
      // The chat page renders a floating "new chat" action button pinned to
      // the same bottom-end corner (see (portal)/chat/page.tsx). A symmetric
      // inset-x here used to span underneath it, and this banner's z-index
      // is intentionally the highest in the app, so on mobile it silently
      // swallowed every tap meant for that button. Reserving extra space on
      // the end side keeps the banner clear of that corner instead of
      // relying on z-order, which would only move the dead zone onto this
      // banner's own Install/Dismiss buttons. This is scoped to mobile
      // (below `sm`) only -- the desktop `sm:end-4 sm:top-4` placement is
      // unchanged from before this fix.
      className="safe-bottom bg-background/95 shadow-floating fixed start-2 end-20 bottom-[4.75rem] z-[120] mx-auto flex max-w-lg flex-col gap-2 rounded-xl border p-3 backdrop-blur sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:w-[min(28rem,calc(100vw-2rem))]"
    >
      {isOffline ? (
        <div className="flex min-h-11 items-center gap-3 text-sm">
          <WifiOff className="text-warning h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{t('pwa.offlineMessage')}</span>
        </div>
      ) : null}
      {waitingWorker ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2">
          <RefreshCw className="text-primary h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm">{t('pwa.updateAvailable')}</span>
          <Button size="sm" onClick={applyUpdate}>
            {t('pwa.updateAction')}
          </Button>
        </div>
      ) : null}
      {installPrompt && !installDismissed ? (
        <div className="flex items-center gap-2">
          <Download className="text-primary h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm">{t('pwa.installMessage')}</span>
          <Button size="sm" onClick={() => void install()}>
            {t('pwa.installAction')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('pwa.dismissInstall')}
            onClick={() => setInstallDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
