'use client';

import { FEATURES_FILE_ITEMS } from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// Documents and retrieval: upload once, then attach the same source to any
// model without re-uploading or re-formatting it per provider.
export function FeaturesFilesSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="files" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.features.files.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.features.files.intro')}</p>
      </div>

      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES_FILE_ITEMS.map((item) => (
          <div key={item.nameKey}>
            <dt className="text-foreground font-medium">{t(item.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(item.descKey)}</dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground mx-auto mt-10 max-w-3xl text-sm">
        {t('marketing.features.files.outro')}
      </p>
    </section>
  );
}
