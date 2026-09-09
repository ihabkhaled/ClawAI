import Link from 'next/link';

import type { ModelFitHubCardsProps } from '@/types/model-fit-component.types';

export function ModelFitHubCards({ cards }: ModelFitHubCardsProps): React.ReactElement {
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
