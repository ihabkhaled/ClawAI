import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { AuthenticatedRedirectBoundary } from '@/components/auth/authenticated-redirect-boundary';
import { CheckEmailPanel } from '@/components/auth/check-email-panel';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';

// Guarded like every other page in this group. Someone who is already signed in
// has, by definition, a confirmed address — so this screen has nothing to tell
// them, and leaving it reachable meant a stale tab or a bookmarked link could
// strand a working session on a page about an account that is already active.
export default function CheckEmailPage(): React.ReactElement {
  return (
    <AuthenticatedRedirectBoundary>
      <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
        <AuthTopControls />
        <LoginBrandingPanel />
        <div className="bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <CheckEmailPanel />
        </div>
      </div>
    </AuthenticatedRedirectBoundary>
  );
}
