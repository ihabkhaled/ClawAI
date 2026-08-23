import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { MarketingLocaleLoadingOverlayProps } from '@/types';

export function MarketingLocaleLoadingOverlay({
  label,
}: MarketingLocaleLoadingOverlayProps): React.ReactElement {
  return (
    <div
      className="bg-background/85 fixed inset-0 z-[100] grid grid-cols-1 place-items-center backdrop-blur-sm"
      aria-live="polite"
    >
      <LoadingSpinner className="min-h-0" label={label} />
    </div>
  );
}
