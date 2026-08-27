import type { ComparisonFaqProps } from '@/types/public-comparison.types';

/**
 * The questions block.
 *
 * `<dl>` because it is definitionally a term-and-definition list, and because
 * the same pairs are emitted as `FAQPage` structured data from the same source
 * object — visible text and structured data always agreeing is the condition
 * Google attaches to FAQ rich results, and generating both from one array is the
 * only way to keep that true after an edit.
 */
export function ComparisonFaq({ title, entries }: ComparisonFaqProps): React.ReactElement {
  return (
    <dl className="editorial-comparison__faq" aria-label={title}>
      {entries.map((entry) => (
        <div key={entry.question} className="editorial-comparison__faq-item">
          <dt className="editorial-comparison__faq-question">{entry.question}</dt>
          <dd className="editorial-comparison__faq-answer">{entry.answer}</dd>
        </div>
      ))}
    </dl>
  );
}
