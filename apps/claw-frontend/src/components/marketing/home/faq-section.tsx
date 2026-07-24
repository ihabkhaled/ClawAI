'use client';

import { FAQ_ENTRIES } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function FaqSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="faq" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.home.faq.title')}
        </h2>
        <dl className="mt-8 space-y-8">
          {FAQ_ENTRIES.map((entry) => (
            <div key={entry.questionKey}>
              <dt className="text-foreground font-medium">{t(entry.questionKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(entry.answerKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
