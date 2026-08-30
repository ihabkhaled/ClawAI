import Link from 'next/link';

import type { LearnRailProps } from '@/types/learn-component.types';

/**
 * Cross-links to sibling explainers.
 *
 * Capped upstream at four. A rail carrying every sibling is a link dump: it
 * dilutes each link and reads as navigation furniture rather than a
 * recommendation.
 */
export function LearnRail({ label, items }: LearnRailProps): React.ReactElement {
  return (
    <nav className="editorial-comparison__rail" aria-label={label}>
      <p className="editorial-comparison__rail-label">{label}</p>
      <ul className="editorial-comparison__rail-list">
        {items.map((item) => (
          <li key={item.topic}>
            <Link href={item.href} className="editorial-comparison__rail-link">
              <span className="editorial-comparison__rail-name">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
