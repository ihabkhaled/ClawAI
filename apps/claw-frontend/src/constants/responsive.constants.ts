import { ResponsiveGridColumns, ResponsivePageWidth } from '@/enums';

export const RESPONSIVE_PAGE_WIDTH_CLASSES: Record<ResponsivePageWidth, string> = {
  [ResponsivePageWidth.NARROW]: 'max-w-3xl',
  [ResponsivePageWidth.STANDARD]: 'max-w-5xl',
  [ResponsivePageWidth.WIDE]: 'max-w-7xl',
  [ResponsivePageWidth.FULL]: 'max-w-none',
  [ResponsivePageWidth.CHAT]: 'max-w-none',
};

export const RESPONSIVE_GRID_COLUMN_CLASSES: Record<ResponsiveGridColumns, string> = {
  [ResponsiveGridColumns.KPI]: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  [ResponsiveGridColumns.CARDS]: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  [ResponsiveGridColumns.WIDE]: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
};
