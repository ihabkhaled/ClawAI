'use client';

import { FEATURES_MODEL_FAMILIES } from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// One subscription, every frontier family. Model names are brand literals from
// the constants file; only the positioning blurb is translated.
export function FeaturesProvidersSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="providers" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.features.providers.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.features.providers.intro')}</p>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES_MODEL_FAMILIES.map((family) => (
          <li key={family.name} className="border-border bg-card rounded-lg border p-5 shadow-sm">
            <h3 className="text-foreground font-semibold">{family.name}</h3>
            <p className="text-muted-foreground mt-2 text-sm">{t(family.descKey)}</p>
            <p className="text-muted-foreground mt-4 text-xs font-medium tracking-wide uppercase">
              {t('marketing.features.providers.modelsLabel')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {family.models.map((model) => (
                <li
                  key={model}
                  className="border-border bg-muted text-muted-foreground rounded-md border px-2 py-0.5 text-xs"
                >
                  {model}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mx-auto mt-10 max-w-3xl text-sm">
        {t('marketing.features.providers.outro')}
      </p>
    </section>
  );
}
