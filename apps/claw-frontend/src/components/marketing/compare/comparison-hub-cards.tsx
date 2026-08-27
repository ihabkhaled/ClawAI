import Link from 'next/link';

import type { ComparisonHubCardsProps } from '@/types/public-comparison.types';

export function ComparisonHubCards({ items }: ComparisonHubCardsProps): React.ReactElement {
  return (
    <ul className="editorial-comparison__cards">
      {items.map((item) => (
        <li key={item.rival} className="editorial-comparison__card">
          <p className="editorial-comparison__card-name">{item.name}</p>
          <p className="editorial-comparison__card-summary">{item.summary}</p>
          <Link href={item.href} className="editorial-comparison__card-link">
            {item.cta}
          </Link>
        </li>
      ))}
    </ul>
  );
}
