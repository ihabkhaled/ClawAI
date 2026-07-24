import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { AuthenticatedRedirectBoundary } from '@/components/auth/authenticated-redirect-boundary';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage(): React.ReactElement {
  return (
    <AuthenticatedRedirectBoundary>
      <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
        <AuthTopControls />
        <LoginBrandingPanel />
        <div className="bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <LoginForm />
        </div>
      </div>
    </AuthenticatedRedirectBoundary>
  );
}
