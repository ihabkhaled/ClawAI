import type { ComparisonSectionProps } from '@/types/public-comparison.types';

export function ComparisonSection({
  id,
  title,
  children,
}: ComparisonSectionProps): React.ReactElement {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="editorial-comparison__section">
      <h2 id={`${id}-heading`} className="editorial-comparison__section-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}
