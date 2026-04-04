'use client';

import { Virtuoso } from 'react-virtuoso';

export type VirtualizedListProps<T> = {
  data: T[];
  itemContent: (index: number, item: T) => React.ReactElement;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
};

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
