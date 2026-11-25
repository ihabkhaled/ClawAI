import { LiveCaptionPlacement } from '@/enums/live.enum';
import type { LiveCaptionsOverlayProps } from '@/types/live.types';
import { cn } from '@/utilities';

/** The newest revealed caption over the video, announced politely to screen readers. */
export function LiveCaptionsOverlay({
  caption,
  label,
  placement,
}: LiveCaptionsOverlayProps): React.ReactElement {
  return (
    <div
      aria-live="polite"
      aria-label={label}
      className={cn(
        'pointer-events-none absolute inset-x-3 flex justify-center',
        placement === LiveCaptionPlacement.TOP ? 'top-3' : 'bottom-12',
      )}
      data-testid="live-captions-overlay"
    >
      {caption ? (
        <p
          className="bg-background/85 text-foreground line-clamp-3 max-w-full rounded-lg px-3 py-1.5 text-center text-sm leading-snug shadow-lg backdrop-blur-sm md:text-base"
          dir="auto"
        >
          {caption.text}
        </p>
      ) : null}
    </div>
  );
}
