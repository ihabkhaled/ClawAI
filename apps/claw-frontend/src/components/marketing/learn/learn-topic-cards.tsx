import Link from 'next/link';

import type { LearnTopicCardsProps } from '@/types/learn-component.types';

/**
 * The hub's grid of topics.
 *
 * Reuses the `editorial-comparison__card*` vocabulary rather than introducing a
 * parallel `editorial-learn__*` set. Those class names are the editorial card
 * vocabulary despite being named for the cluster that first needed them, and
 * `editorial-class-vocabulary.test.ts` fails on any class not defined in
 * globals.css — so a new name would be an invisible, unstyled card.
 */
export function LearnTopicCards({ cards }: LearnTopicCardsProps): React.ReactElement {
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
