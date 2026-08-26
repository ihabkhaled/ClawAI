'use client';

import Link from 'next/link';

import { ModelFamilyCard } from '@/components/marketing/home/model-family-card';
import { MARKETING_HOME_PATHS } from '@/constants/marketing-home.constants';
import {
  MARKETING_MODEL_FAMILIES,
  MARKETING_NEWEST_MODELS,
} from '@/constants/subscription-marketing.constants';
import { useTranslation } from '@/lib/i18n';

export function ModelRosterSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="models" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.modelRoster.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.modelRoster.intro')}</p>
        </div>

        <div className="border-primary/25 bg-primary/5 mx-auto mt-8 max-w-5xl rounded-xl border p-4 sm:p-5">
          <h3 className="text-foreground text-center text-sm font-semibold tracking-wide">
            {t('marketing.home.modelRoster.newestTitle')}
          </h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-2xl text-center text-xs">
            {t('marketing.home.modelRoster.newestIntro')}
          </p>
          <ul
            aria-label={t('marketing.home.modelRoster.newestTitle')}
            className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          >
            {MARKETING_NEWEST_MODELS.map((model) => (
              <li
                key={model.id}
                className="border-border bg-card flex min-w-0 flex-col rounded-md border px-3 py-2"
              >
                <span className="text-foreground truncate text-sm font-medium">{model.label}</span>
                <span className="text-muted-foreground touch:text-xs truncate text-[11px]">
                  {model.provider}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MARKETING_MODEL_FAMILIES.map((family) => (
            <ModelFamilyCard key={family.name} family={family} />
          ))}
        </div>

        <p className="text-muted-foreground mx-auto mt-8 max-w-3xl text-center text-sm">
          {t('marketing.home.modelRoster.footnote')}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href={MARKETING_HOME_PATHS.FEATURES} className="text-primary hover:underline">
            {t('marketing.home.modelRoster.linkFeatures')}
          </Link>
          <Link href={MARKETING_HOME_PATHS.ARCHITECTURE} className="text-primary hover:underline">
            {t('marketing.home.modelRoster.linkArchitecture')}
          </Link>
        </div>
      </div>
    </section>
  );
}
