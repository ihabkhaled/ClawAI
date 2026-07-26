'use client';

import { HOW_IT_WORKS_MODEL_FAMILIES } from '@/constants/marketing-how-it-works.constants';
import { useTranslation } from '@/lib/i18n';

export function ModelAccessSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="models" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.howItWorksPage.models.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.howItWorksPage.models.intro')}</p>
      </div>

      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {HOW_IT_WORKS_MODEL_FAMILIES.map((family) => (
          <div key={family.name}>
            <dt className="text-foreground font-medium">{family.name}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(family.strengthKey)}</dd>
            {/* Full-opacity `text-muted-foreground`, never `/80`. An opacity
                modifier on an already-muted colour composites toward the page
                background: at 12px this measured 3.24:1 against white and failed
                the Lighthouse `color-contrast` assertion on every card. Even at the
                darkest token value the /80 variant only reaches 3.59:1, so the
                modifier itself is the defect — not the token behind it. */}
            <dd className="text-muted-foreground mt-2 text-xs">{family.models.join(' · ')}</dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground mx-auto mt-10 max-w-3xl">
        {t('marketing.howItWorksPage.models.outro')}
      </p>
    </section>
  );
}
