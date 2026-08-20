'use client';

import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaManager(): React.ReactElement | null {
  const [isOffline, setIsOffline] = React.useState(false);
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = React.useState<InstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = React.useState(false);

  React.useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = (): void => setIsOffline(false);
    const handleOffline = (): void => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (registration.waiting) setWaitingWorker(registration.waiting);
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker) return;
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
    if (!waitingWorker || !('serviceWorker' in navigator)) return;
    const handleControllerChange = (): void => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, {
      once: true,
    });
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, [waitingWorker]);

  const applyUpdate = (): void => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  };

  const install = async (): Promise<void> => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (!isOffline && !waitingWorker && (!installPrompt || installDismissed)) return null;

  return (
    <div className="safe-top fixed inset-x-2 top-2 z-[120] mx-auto flex max-w-lg flex-col gap-2 rounded-xl border bg-background/95 p-3 shadow-floating backdrop-blur sm:inset-x-auto sm:end-4 sm:top-4 sm:w-[min(28rem,calc(100vw-2rem))]">
      {isOffline ? (
        <div className="flex min-h-11 items-center gap-3 text-sm">
          <WifiOff className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            You are offline. Reconnect to continue private actions; the public offline fallback remains available.
          </span>
        </div>
      ) : null}
      {waitingWorker ? (
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm">A new ClawAI version is available.</span>
          <Button size="sm" onClick={applyUpdate}>
            Update
          </Button>
        </div>
      ) : null}
      {installPrompt && !installDismissed ? (
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm">Install ClawAI for app-like access.</span>
          <Button size="sm" onClick={() => void install()}>
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss install prompt"
            onClick={() => setInstallDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
