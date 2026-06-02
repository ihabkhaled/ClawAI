import { LoginBrandingPanel } from '@/components/auth/login-branding-panel';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage(): React.ReactElement {
  return (
    <div className="grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
      <LoginBrandingPanel />
      <div className="flex items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
        <LoginForm />
      </div>
    </div>
  );
}
