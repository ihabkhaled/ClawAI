'use client';

import { Virtuoso } from 'react-virtuoso';

import type { VirtualizedListProps } from '@/types';

export function VirtualizedList<T>({
  data,
  itemContent,
  className,
  style,
  overscan = 200,
}: VirtualizedListProps<T>): React.ReactElement {
  return (
    <Virtuoso
      data={data}
      itemContent={itemContent}
      className={className}
      style={style}
      overscan={overscan}
    />
  );
}
