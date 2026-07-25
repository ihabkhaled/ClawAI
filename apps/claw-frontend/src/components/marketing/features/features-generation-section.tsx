'use client';

import {
  FEATURES_GENERATION_FORMATS,
  FEATURES_GENERATION_ITEMS,
} from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// Output beyond chat: images, exportable documents, and sourced research.
export function FeaturesGenerationSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="generation" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.features.generation.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.features.generation.intro')}</p>
      </div>

      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
        {FEATURES_GENERATION_ITEMS.map((item) => (
          <div key={item.nameKey}>
            <dt className="text-foreground font-medium">{t(item.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(item.descKey)}</dd>
          </div>
        ))}
      </dl>

      <div className="mx-auto mt-10 max-w-5xl">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t('marketing.features.generation.formatsLabel')}
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {FEATURES_GENERATION_FORMATS.map((format) => (
            <li
              key={format}
              className="border-border bg-muted text-muted-foreground rounded-md border px-2.5 py-1 text-xs"
            >
              {format}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
