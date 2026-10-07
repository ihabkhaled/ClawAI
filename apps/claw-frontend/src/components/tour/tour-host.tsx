'use client';

import { X } from 'lucide-react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { TOUR_POPOVER_WIDTH_PX } from '@/constants/tour.constants';
import { useTourHostView } from '@/hooks/tour/use-tour-host-view';

/**
 * The running tour: a dimmed page with a window cut around the highlighted element, and a card
 * that says what it is. The page behind stays visible and is not changed; the tour never clicks
 * anything for the person. Rendered into the body so no stacking context can hide it.
 */
export function TourHost(): ReactElement | null {
  const view = useTourHostView();
  if (view === null || typeof document === 'undefined') {
    return null;
  }
  const { host, ui, spotlight, position } = view;

  return createPortal(
    <div data-testid="tour-host" className="fixed inset-0 z-[200]">
      {spotlight === null ? (
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      ) : (
        <div
          data-testid="tour-spotlight"
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg ring-2 ring-white/90 transition-all duration-200 motion-reduce:transition-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
          }}
        />
      )}
      <div
        ref={view.popoverRef}
        role="dialog"
        aria-modal="false"
        aria-label={ui.dialogLabel}
        aria-labelledby="tour-card-title"
        aria-describedby="tour-card-body"
        data-testid="tour-card"
        className="bg-card text-card-foreground absolute rounded-xl border p-4 shadow-xl"
        style={{
          top: position.top,
          left: position.left,
          width: `min(${String(TOUR_POPOVER_WIDTH_PX)}px, calc(100vw - 24px))`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {view.stepLabel}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={view.skipTour}
            aria-label={ui.skip}
            title={ui.skip}
            className="-me-1 -mt-1 h-6 w-6"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <h2 id="tour-card-title" className="mt-1 text-base font-semibold">
          {view.title}
        </h2>
        <p id="tour-card-body" className="text-muted-foreground mt-1.5 text-sm">
          {view.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={view.skipTour}>
            {ui.skip}
          </Button>
          <div className="flex items-center gap-2">
            {host.stepIndex > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={view.goBack}>
                {ui.back}
              </Button>
            ) : null}
            <Button ref={view.nextRef} type="button" size="sm" onClick={view.goNext}>
              {host.isLast ? ui.done : ui.next}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
