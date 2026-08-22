import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { ConfirmEmailChangeForm } from '@/components/auth/confirm-email-change-form';
import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';

export default function ConfirmEmailChangePage(): React.ReactElement {
  return (
    <div className="relative grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
      <AuthTopControls />
      <LoginBrandingPanel />
      <div className="bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <ConfirmEmailChangeForm />
      </div>
    </div>
  );
}
