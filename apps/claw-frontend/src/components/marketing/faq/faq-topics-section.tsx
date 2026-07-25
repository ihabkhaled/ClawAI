'use client';

import { MARKETING_FAQ_CATEGORIES } from '@/constants/marketing-faq.constants';
import { useTranslation } from '@/lib/i18n';

// Jump-links strip sitting under the hero: one anchor per FAQ category so a
// visitor who arrived with a billing question does not have to scroll past
// "what is ClawAI". Plain anchors — no client-side routing, no hooks beyond
// the translation hook.
export function FaqTopicsSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-surface-shell border-b">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {t('marketing.faqPage.topics.title')}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {MARKETING_FAQ_CATEGORIES.map((category) => (
            <li key={category.id}>
              <a
                href={`#${category.id}`}
                className="border-border bg-card text-foreground hover:bg-muted inline-flex rounded-full border px-3 py-1.5 text-sm transition-colors"
              >
                {t(category.titleKey)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
