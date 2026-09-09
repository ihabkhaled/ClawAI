import Link from 'next/link';

import type { UseCaseRailProps } from '@/types/use-cases-component.types';

export function UseCaseRail({ label, items }: UseCaseRailProps): React.ReactElement {
  return (
    <nav className="editorial-comparison__rail" aria-label={label}>
      <p className="editorial-comparison__rail-label">{label}</p>
      <ul className="editorial-comparison__rail-list">
        {items.map((item) => (
          <li key={item.task}>
            <Link href={item.href} className="editorial-comparison__rail-link">
              <span className="editorial-comparison__rail-name">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
