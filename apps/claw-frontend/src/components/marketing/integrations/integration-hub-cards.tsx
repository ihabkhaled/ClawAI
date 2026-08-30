import Link from 'next/link';

import type { IntegrationHubCardsProps } from '@/types/integrations-component.types';

export function IntegrationHubCards({ cards }: IntegrationHubCardsProps): React.ReactElement {
  return (
    <ul className="editorial-comparison__cards">
      {cards.map((card) => (
        <li key={card.topic} className="editorial-comparison__card">
          <Link href={card.href} className="editorial-comparison__card-link">
            <span className="editorial-comparison__card-name">{card.title}</span>
            <span className="editorial-comparison__card-summary">{card.summary}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
