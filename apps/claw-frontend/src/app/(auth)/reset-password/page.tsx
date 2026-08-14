import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
      <AuthTopControls />
      <LoginBrandingPanel />
      <div className="bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
