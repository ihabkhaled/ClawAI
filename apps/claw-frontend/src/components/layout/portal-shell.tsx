'use client';

import { ErrorBoundary } from '@/components/common/error-boundary';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { FeedbackReporter } from '@/components/feedback/feedback-reporter';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PortalContent } from '@/components/layout/portal-content';
import { Sidebar } from '@/components/layout/sidebar';
import { SkipToContent } from '@/components/layout/skip-to-content';
import { Topbar } from '@/components/layout/topbar';
import { TrialStatusBanner } from '@/components/layout/trial-status-banner';
import { ComponentSize } from '@/enums';
import { useAuthGuard } from '@/hooks/auth/use-auth-guard';
import { useLayoutShortcuts } from '@/hooks/layout/use-layout-shortcuts';
import { usePreferenceBootstrap } from '@/hooks/settings/use-preference-bootstrap';
import { useTranslation } from '@/lib/i18n';

// Owns every hook, auth gate, and interactive shell element for the
// authenticated portal. Split out of (portal)/layout.tsx so that file can be
// a server component exporting `noindex` metadata — client components
// cannot export route metadata. This component's body is otherwise
// unchanged from the previous layout.tsx.
export function PortalShell({ children }: { children: React.ReactNode }): React.ReactElement {
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
    <div className="bg-surface-shell flex h-dvh overflow-hidden">
      {/* Skip-to-content link — visually hidden until focused (Tab from URL
       * bar). MUST be the first focusable element in the layout per WCAG
       * 2.4.1 (Bypass Blocks). */}
      <SkipToContent />
      <Sidebar />
      <div
        className={[
          'flex flex-1 flex-col overflow-hidden',
          // On phones, reserve space for the fixed MobileBottomNav AT THE
          // COLUMN LEVEL (outside the scrollable area). Putting this clearance
          // on <main>'s padding-bottom let users scroll into a dead band of
          // pure padding past their content. Margin-bottom here shrinks the
          // column instead, so the scroll container's bottom edge ALWAYS
          // matches the last rendered child. Desktop has no bottom nav.
          'mb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom))] md:mb-0',
        ].join(' ')}
      >
        <Topbar />
        <TrialStatusBanner />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-3 focus-visible:outline-none sm:p-6"
        >
          <ErrorBoundary>
            <PortalContent>{children}</PortalContent>
          </ErrorBoundary>
        </main>
      </div>
      <MobileBottomNav />
      <FeedbackReporter />
    </div>
  );
}
