'use client';

import { usePasswordRotationGuard } from '@/hooks/auth/use-password-rotation-guard';
import { useTranslation } from '@/lib/i18n';

export function PasswordRotationBanner(): React.ReactElement | null {
  const { mustRotate } = usePasswordRotationGuard();
  const { t } = useTranslation();

  if (!mustRotate) {
    return null;
  }

  return (
    <section
      className="border-border bg-card flex flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-6"
      role="alert"
    >
      <div>
        <p className="font-semibold">{t('auth.mustChangePasswordTitle')}</p>
        <p className="text-muted-foreground text-sm">{t('auth.mustChangePasswordBody')}</p>
      </div>
    </section>
  );
}
