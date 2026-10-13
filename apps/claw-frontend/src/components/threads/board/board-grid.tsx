import type { ReactElement } from 'react';

import { BoardCard } from '@/components/threads/board/board-card';
import type { BoardGridProps } from '@/types/thread-board-view.types';

export function BoardGrid({ items }: BoardGridProps): ReactElement {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="board-grid">
      {items.map((item) => (
        <li key={item.slug}>
          <BoardCard item={item} />
        </li>
      ))}
    </ul>
  );
}
