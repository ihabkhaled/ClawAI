import { AuthMobileIntro } from '@/components/auth/auth-mobile-intro';
import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
      <AuthTopControls />
      <LoginBrandingPanel />
      {/* On a phone the branding column is hidden, so the intro moves inline
          above the form — see AuthMobileIntro. Starts at the top rather than
          centred, because a card centred under a heading leaves the heading
          floating. */}
      <div className="bg-background flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <AuthMobileIntro />
        <ResetPasswordForm />
      </div>
    </div>
  );
}
