import { RESPONSIVE_PAGE_WIDTH_CLASSES } from '@/constants/responsive.constants';
import { ResponsivePageWidth } from '@/enums';
import { cn } from '@/lib/utils';
import type { ResponsivePageProps } from '@/types/component.types';

export function ResponsivePage({
  children,
  width = ResponsivePageWidth.STANDARD,
  fullHeight = false,
  className,
}: ResponsivePageProps): React.ReactElement {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        RESPONSIVE_PAGE_WIDTH_CLASSES[width],
        fullHeight ? 'flex h-full min-h-0 flex-col' : 'pb-[max(1rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  );
}
