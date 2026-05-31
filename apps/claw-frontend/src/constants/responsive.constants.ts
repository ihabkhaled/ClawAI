import type {
  ResponsiveGridColumns,
  ResponsivePageWidth,
} from '@/types/component.types';

export const RESPONSIVE_PAGE_WIDTH_CLASSES: Record<ResponsivePageWidth, string> = {
  narrow: 'max-w-3xl',
  standard: 'max-w-5xl',
  wide: 'max-w-7xl',
  full: 'max-w-none',
  chat: 'max-w-none',
};

export const RESPONSIVE_GRID_COLUMN_CLASSES: Record<ResponsiveGridColumns, string> = {
  kpi: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  wide: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
};
