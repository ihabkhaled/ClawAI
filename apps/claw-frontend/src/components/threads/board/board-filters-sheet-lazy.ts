import dynamic from 'next/dynamic';

export const LazyBoardFiltersSheet = dynamic(
  () => import('@/components/threads/board/board-filters-sheet').then((m) => m.BoardFiltersSheet),
  { ssr: false },
);
