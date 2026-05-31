'use client';

import { Zap } from 'lucide-react';

import { LOGIN_FEATURE_HIGHLIGHTS } from '@/constants/login.constants';
import { useTranslation } from '@/lib/i18n';

export function LoginBrandingPanel(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="hidden h-full w-full flex-col justify-between bg-gradient-to-br from-primary/15 via-primary/5 to-background p-10 lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Zap className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold tracking-tight">{t('auth.welcomeTitle')}</span>
          <span className="text-xs text-muted-foreground">{t('auth.welcomeSubtitle')}</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{t('auth.brandingHeadline')}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t('auth.brandingSubheadline')}</p>
        </div>

        <ul className="space-y-4" aria-label={t('auth.featuresAriaLabel')}>
          {LOGIN_FEATURE_HIGHLIGHTS.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.titleKey} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium leading-snug">{t(feature.titleKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(feature.descriptionKey)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">{t('auth.tagline')}</p>
    </div>
  );
}
