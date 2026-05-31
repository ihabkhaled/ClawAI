'use client';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PortalContent } from '@/components/layout/portal-content';
import { Sidebar } from '@/components/layout/sidebar';
import { SkipToContent } from '@/components/layout/skip-to-content';
import { Topbar } from '@/components/layout/topbar';
import { ComponentSize } from '@/enums';
import { useAuthGuard } from '@/hooks/auth/use-auth-guard';
import { useLayoutShortcuts } from '@/hooks/layout/use-layout-shortcuts';
import { usePreferenceBootstrap } from '@/hooks/settings/use-preference-bootstrap';
import { useTranslation } from '@/lib/i18n';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isReady } = useAuthGuard();
  const { t } = useTranslation();
  usePreferenceBootstrap();
  useLayoutShortcuts();

  if (!isReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size={ComponentSize.LG} label={t('auth.authenticating')} />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-shell">
      {/* Skip-to-content link — visually hidden until focused (Tab from URL
       * bar). MUST be the first focusable element in the layout per WCAG
       * 2.4.1 (Bypass Blocks). */}
      <SkipToContent />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className={[
            'flex-1 overflow-y-auto p-3 sm:p-6 focus-visible:outline-none',
            // On phones, leave room for the fixed MobileBottomNav (its height
            // plus the iOS safe-area inset). Desktop has no bottom nav, so the
            // standard sm:p-6 padding applies.
            'pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom))]',
            'md:pb-6',
          ].join(' ')}
        >
          <ErrorBoundary>
            <PortalContent>{children}</PortalContent>
          </ErrorBoundary>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
