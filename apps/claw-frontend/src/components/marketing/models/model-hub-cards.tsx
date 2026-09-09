import Link from 'next/link';

import type { ModelHubCardsProps } from '@/types/models-component.types';

export function ModelHubCards({ cards }: ModelHubCardsProps): React.ReactElement {
  return (
    <ul className="editorial-comparison__cards">
      {cards.map((card) => (
        <li key={card.provider} className="editorial-comparison__card">
          <Link href={card.href} className="editorial-comparison__card-link">
            <span className="editorial-comparison__card-name">{card.title}</span>
            <span className="editorial-comparison__card-summary">{card.summary}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
