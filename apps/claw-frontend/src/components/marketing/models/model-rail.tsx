import Link from 'next/link';

import type { ModelRailProps } from '@/types/models-component.types';

export function ModelRail({ label, items }: ModelRailProps): React.ReactElement {
  return (
    <nav className="editorial-comparison__rail" aria-label={label}>
      <p className="editorial-comparison__rail-label">{label}</p>
      <ul className="editorial-comparison__rail-list">
        {items.map((item) => (
          <li key={item.provider}>
            <Link href={item.href} className="editorial-comparison__rail-link">
              <span className="editorial-comparison__rail-name">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
