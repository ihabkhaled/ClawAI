'use client';

import { Zap } from 'lucide-react';

import { LOGIN_FEATURE_HIGHLIGHTS } from '@/constants/login.constants';
import { useTranslation } from '@/lib/i18n';

/**
 * What the desktop branding column says, for phones.
 *
 * `LoginBrandingPanel` is `hidden lg:flex`, so every auth page below 1024px was
 * a form card alone on an empty screen — no brand mark, no explanation of what
 * the product is, and on reset-password nothing at all above two password
 * fields. This is the same promise in the space a phone actually has: the mark,
 * the headline, and the three highlights as titles only, since their
 * descriptions are what make the desktop column tall.
 *
 * Reuses the existing `auth.*` keys, so all 13 locales already carry the copy
 * and nothing here can drift from the desktop wording.
 */
export function AuthMobileIntro(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex w-full max-w-md flex-col gap-4 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm">
          <Zap className="text-primary-foreground h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-base font-semibold tracking-tight">
            {t('auth.welcomeTitle')}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {t('auth.welcomeSubtitle')}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl leading-snug font-bold tracking-tight">
          {t('auth.brandingHeadline')}
        </h2>
        <p className="text-muted-foreground text-sm">{t('auth.brandingSubheadline')}</p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label={t('auth.featuresAriaLabel')}>
        {LOGIN_FEATURE_HIGHLIGHTS.map((feature) => {
          const Icon = feature.icon;
          return (
            <li
              key={feature.titleKey}
              className="border-border/60 bg-muted/40 flex items-center gap-1.5 rounded-full border px-2.5 py-1"
            >
              <Icon className="text-primary h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium">{t(feature.titleKey)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
