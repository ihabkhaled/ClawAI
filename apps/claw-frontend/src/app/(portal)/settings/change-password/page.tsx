'use client';

import { ChangePasswordCard } from '@/components/settings/change-password-card';
import { useChangePasswordPage } from '@/hooks/settings/use-change-password-page';

export default function ChangePasswordPage(): React.ReactElement {
  const { form, handleSubmit, isPending, t } = useChangePasswordPage();

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t('auth.mustChangePasswordTitle')}</h1>
        <p className="text-muted-foreground text-sm">{t('auth.mustChangePasswordBody')}</p>
      </div>
      <ChangePasswordCard form={form} onSubmit={handleSubmit} isPending={isPending} t={t} />
    </div>
  );
}
