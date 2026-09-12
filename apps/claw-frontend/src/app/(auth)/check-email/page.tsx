import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { CheckEmailPanel } from '@/components/auth/check-email-panel';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';

// Deliberately NOT wrapped in AuthenticatedRedirectBoundary. Everyone who sees
// this page is by definition not signed in and cannot be — that is the whole
// point of it — and an already-signed-in visitor who follows the link from an
// old tab should read the explanation rather than be bounced somewhere else.
export default function CheckEmailPage(): React.ReactElement {
  return (
    <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
      <AuthTopControls />
      <LoginBrandingPanel />
      <div className="bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <CheckEmailPanel />
      </div>
    </div>
  );
}
