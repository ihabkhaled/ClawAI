import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';

// Given the same two-column shell as login and registration. It used to be a
// bare centred <section> on an empty page, which made the one screen a user
// reaches from their inbox look like an error page from a different product.
export default function VerifyEmailPage(): React.ReactElement {
  return (
    <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
      <AuthTopControls />
      <LoginBrandingPanel />
      <div className="bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <VerifyEmailPanel />
      </div>
    </div>
  );
}
