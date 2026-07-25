'use client';

import { HOW_IT_WORKS_TRANSPARENCY_ITEMS } from '@/constants/marketing-how-it-works.constants';
import { useTranslation } from '@/lib/i18n';

export function TransparencySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="transparency" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.howItWorksPage.transparency.title')}
        </h2>
        <p className="text-muted-foreground mt-4">
          {t('marketing.howItWorksPage.transparency.intro')}
        </p>

        <dl className="mt-8 space-y-6">
          {HOW_IT_WORKS_TRANSPARENCY_ITEMS.map((item) => (
            <div key={item.nameKey}>
              <dt className="text-foreground font-medium">{t(item.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(item.descKey)}</dd>
            </div>
          ))}
        </dl>

        <p className="text-muted-foreground mt-8">
          {t('marketing.howItWorksPage.transparency.outro')}
        </p>
      </div>
    </section>
  );
}
