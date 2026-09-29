'use client';

import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { APP_VERSION } from '@/constants';
import {
  PWA_CACHE_PREFIX,
  PWA_INSTALL_DISMISSED_KEY,
  PWA_UPDATE_CHECK_INTERVAL_MS,
} from '@/constants/pwa.constants';
import { useTranslation } from '@/lib/i18n';
import { appVersionRepository } from '@/repositories/app-version/app-version.repository';
import type { PwaInstallPromptEvent } from '@/types/pwa.types';
import { isNewerVersion } from '@/utilities/app-version.utility';
import { serviceWorkerUrl, shouldRegisterServiceWorker } from '@/utilities/service-worker.utility';

export function PwaManager(): React.ReactElement | null {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = React.useState(false);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const registrationRef = React.useRef<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = React.useState<PwaInstallPromptEvent | null>(null);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [installDismissed, setInstallDismissed] = React.useState(true); // Default to dismissed until checked.

  React.useEffect(() => {
    setInstallDismissed(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === 'true');
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

    if ('serviceWorker' in navigator && !shouldRegisterServiceWorker(process.env.NODE_ENV)) {
      // A worker installed by an earlier build keeps answering with its cached
      // chunks, so local verification measures the previous bundle until it is
      // removed by hand. Remove it here instead (TD-034).
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });
      // Its caches outlive it, and one of them holds the stale chunks.
      void caches.keys().then((keys) => {
        for (const key of keys.filter((name) => name.startsWith(PWA_CACHE_PREFIX))) {
          void caches.delete(key);
        }
      });
    }

    if ('serviceWorker' in navigator && shouldRegisterServiceWorker(process.env.NODE_ENV)) {
      void navigator.serviceWorker
        .register(serviceWorkerUrl(APP_VERSION))
        .then((registration) => {
          registrationRef.current = registration;
        })
        .catch(() => undefined);
    }

    // The banner means exactly one thing: the server now runs a later release
    // than the one this page was built as. The waiting service worker cannot
    // answer that — `sw.js` is byte-identical across releases, so an open tab
    // never saw a new one, and a freshly reloaded page (already current)
    // installs one and looked out of date. Ask the server instead; a page that
    // is already on the deployed version, or newer, never shows it.
    let cancelled = false;
    const check = (): void => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void appVersionRepository.deployed().then((deployed) => {
        if (!cancelled && deployed !== null) {
          setUpdateAvailable(isNewerVersion(deployed, APP_VERSION));
        }
      });
    };
    check();
    const checkTimer = setInterval(check, PWA_UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      cancelled = true;
      clearInterval(checkTimer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  // Take the new release now: hand control to a worker that is already
  // waiting, then reload. The navigation is network-first, so the reload gets
  // the new build whether or not a worker was waiting, and the new page reads
  // equal to the deployed version, so the banner is gone.
  const applyUpdate = (): void => {
    setUpdateAvailable(false);
    registrationRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  const install = async (): Promise<void> => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const dismissInstall = (): void => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
    setInstallDismissed(true);
  };

  if (!isOffline && !updateAvailable && (!installPrompt || installDismissed)) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="safe-bottom pointer-events-auto fixed start-4 end-20 bottom-[4.75rem] z-[120] flex justify-center sm:inset-x-0 sm:bottom-8">
        <Button onClick={() => setIsMinimized(false)} className="rounded-full shadow-lg">
          <Download className="me-2 h-4 w-4" />
          {t('pwa.expand')}
        </Button>
      </div>
    );
  }

  return (
    // `pointer-events-auto` is load-bearing: a Radix modal sets
    // `pointer-events: none` on <body> while it is open, so this banner --
    // which sits above every dialog at z-[120] and covers part of one -- was
    // painted on top yet swallowed every click, leaving no way to dismiss it
    // without closing the dialog first.
    //
    // The chat page pins a floating "new chat" button to the bottom-end
    // corner, and this banner carries the highest z-index in the app. A
    // symmetric inset used to span underneath that button and swallow every
    // tap meant for it, so the end-side gap is reserved on mobile rather than
    // relying on z-order. On wider screens the panel is centred at the bottom,
    // where it clears the button on its own.
    <div className="safe-bottom safe-bottom-base-5 bg-background/95 shadow-floating pointer-events-auto fixed start-4 end-20 bottom-[4.75rem] z-[120] mx-auto flex max-w-lg flex-col gap-3 rounded-xl border p-5 backdrop-blur sm:inset-x-0 sm:bottom-8">
      {isOffline ? (
        <div className="flex items-center gap-3">
          <span className="bg-warning/10 text-warning flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <WifiOff className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <p className="text-muted-foreground min-w-0 flex-1 text-xs leading-relaxed">
            {t('pwa.offlineMessage')}
          </p>
        </div>
      ) : null}
      {updateAvailable ? (
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <RefreshCw className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium">{t('pwa.updateAvailable')}</p>
          <Button size="sm" onClick={applyUpdate}>
            {t('pwa.updateAction')}
          </Button>
        </div>
      ) : null}
      {installPrompt && !installDismissed ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Download className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t('pwa.installTitle')}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t('pwa.installMessage')}
              </p>
            </div>
          </div>
          <div className="border-border/60 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
            <Button variant="ghost" size="sm" onClick={() => setIsMinimized(true)}>
              {t('pwa.minimise')}
            </Button>
            <Button size="sm" onClick={() => void install()}>
              {t('pwa.installAction')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground ms-1 h-8 w-8 shrink-0"
              aria-label={t('pwa.neverShowAgain')}
              onClick={dismissInstall}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
