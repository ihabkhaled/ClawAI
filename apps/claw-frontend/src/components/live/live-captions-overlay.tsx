import type { LiveCaptionsOverlayProps } from '@/types/live.types';

/** The newest revealed caption over the video, announced politely to screen readers. */
export function LiveCaptionsOverlay({
  caption,
  label,
}: LiveCaptionsOverlayProps): React.ReactElement {
  return (
    <div
      aria-live="polite"
      aria-label={label}
      className="pointer-events-none absolute inset-x-2 bottom-14 flex justify-center"
      data-testid="live-captions-overlay"
    >
      {caption ? (
        <p
          className="bg-background/90 text-foreground max-w-full rounded px-3 py-1 text-center text-sm md:text-base"
          dir="auto"
        >
          {caption.text}
        </p>
      ) : null}
    </div>
  );
}
