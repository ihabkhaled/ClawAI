'use client';

import { useTranslation } from '@/lib/i18n';
import type { MarketingFaqCategoryBlockProps } from '@/types/marketing-faq.types';

// One FAQ category: heading, one-line framing, then the question/answer pairs
// as a description list. Extracted to its own file because helper functions
// that return JSX are not allowed inside a section component.
export function FaqCategoryBlock({ category }: MarketingFaqCategoryBlockProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div id={category.id} className="scroll-mt-24">
      <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
        {t(category.titleKey)}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">{t(category.descriptionKey)}</p>
      <dl className="mt-6 space-y-4">
        {category.questions.map((question) => (
          <div
            key={question.id}
            id={question.id}
            className="border-border bg-card scroll-mt-24 rounded-lg border p-5"
          >
            <dt className="text-foreground font-medium">{t(question.questionKey)}</dt>
            <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t(question.answerKey)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
