'use client';

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastIcon,
  ToastProgressBar,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { ToastVariant } from '@/enums/toast-variant.enum';
import { useToasterViewport } from '@/hooks/layout/use-toaster-viewport';

// Reads the current toast queue and renders each toast as a row of:
//   [icon] [title + description + optional action] [close-X] [progress-bar]
//
// Each part is opt-in:
//   - icon column hides automatically for the Default variant
//   - description hides if not provided
//   - action renders only when the consumer passes one
//   - progress bar respects per-toast `durationMs` (0 disables it)
export function Toaster(): React.ReactElement {
  const { toasts, viewportRef } = useToasterViewport();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, durationMs, action, ...props }) => {
        const resolvedVariant = variant ?? ToastVariant.Default;
        // Radix accepts `duration` in ms. Skipping the prop means "never auto
        // dismiss"; we set it explicitly so the progress bar duration and the
        // actual dismiss time stay in sync.
        const radixDuration = durationMs > 0 ? durationMs : Number.POSITIVE_INFINITY;
        return (
          <Toast key={id} variant={resolvedVariant} duration={radixDuration} {...props}>
            <ToastIcon variant={resolvedVariant} />
            <div className="flex flex-1 flex-col gap-1">
              {title ? <ToastTitle>{title}</ToastTitle> : null}
              {description ? <ToastDescription>{description}</ToastDescription> : null}
            </div>
            {action ? (
              <ToastAction altText={action.label} onClick={action.onClick}>
                {action.label}
              </ToastAction>
            ) : null}
            <ToastClose />
            {durationMs > 0 ? (
              <ToastProgressBar variant={resolvedVariant} durationMs={durationMs} />
            ) : null}
          </Toast>
        );
      })}
      <ToastViewport ref={viewportRef} />
    </ToastProvider>
  );
}
