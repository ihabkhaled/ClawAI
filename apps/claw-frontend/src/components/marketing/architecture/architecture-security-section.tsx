'use client';

import { ARCHITECTURE_SECURITY_CONTROLS } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureSecuritySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="security" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.architecturePage.security.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.architecturePage.security.intro')}
          </p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHITECTURE_SECURITY_CONTROLS.map((control) => (
            <div key={control.nameKey}>
              <dt className="text-foreground font-medium">{t(control.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(control.descKey)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mx-auto mt-8 max-w-3xl text-sm">
          {t('marketing.architecturePage.security.disclaimer')}
        </p>
      </div>
    </section>
  );
}
