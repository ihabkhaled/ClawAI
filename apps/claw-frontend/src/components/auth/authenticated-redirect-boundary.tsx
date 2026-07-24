'use client';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ComponentSize } from '@/enums';
import { useRedirectIfAuthenticated } from '@/hooks/auth/use-redirect-if-authenticated';
import { useTranslation } from '@/lib/i18n';

// Wraps the login/register page content. While auth state is hydrating, or
// while an already-authenticated user is being redirected into the app, it
// shows a spinner instead of the form — so a logged-in visitor never sees a
// flash of the login screen before the redirect fires.
export function AuthenticatedRedirectBoundary({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { shouldRenderAuthPage } = useRedirectIfAuthenticated();
  const { t } = useTranslation();

  if (!shouldRenderAuthPage) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size={ComponentSize.LG} label={t('auth.authenticating')} />
      </div>
    );
  }

  return <>{children}</>;
}
