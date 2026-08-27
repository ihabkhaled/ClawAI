import Link from 'next/link';

import type { ComparisonRailProps } from '@/types/public-comparison.types';

/**
 * Cross-links to the other comparisons.
 *
 * Every comparison page reaches the other four in one click, which is what turns
 * six isolated pages into a crawlable cluster — an orphan page with one inbound
 * link from a hub is indexed far more reluctantly than one inside a mesh.
 */
export function ComparisonRail({ title, items }: ComparisonRailProps): React.ReactElement {
  return (
    <nav className="editorial-comparison__rail" aria-label={title}>
      <p className="editorial-comparison__rail-label">{title}</p>
      <ul className="editorial-comparison__rail-list">
        {items.map((item) => (
          <li key={item.rival}>
            <Link href={item.href} className="editorial-comparison__rail-link">
              <span className="editorial-comparison__rail-name">{item.name}</span>
              <span className="editorial-comparison__rail-summary">{item.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
