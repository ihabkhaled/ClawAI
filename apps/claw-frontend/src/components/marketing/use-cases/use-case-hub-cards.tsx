import Link from 'next/link';

import type { UseCaseHubCardsProps } from '@/types/use-cases-component.types';

export function UseCaseHubCards({ cards }: UseCaseHubCardsProps): React.ReactElement {
  return (
    <ul className="editorial-comparison__cards">
      {cards.map((card) => (
        <li key={card.task} className="editorial-comparison__card">
          <Link href={card.href} className="editorial-comparison__card-link">
            <span className="editorial-comparison__card-name">{card.title}</span>
            <span className="editorial-comparison__card-summary">{card.summary}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
