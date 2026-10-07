'use client';

import { Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useTourContent } from '@/hooks/tour/use-tour-content';
import { useTourOffer } from '@/hooks/tour/use-tour-offer';

/**
 * A small card, bottom corner, a moment after someone lands on a page with a tour they have not
 * seen: "New here? Take a 1-minute tour". It never starts anything by itself and "Not now" is
 * remembered, so it does not nag.
 */
export function TourOffer(): ReactElement | null {
  const offer = useTourOffer();
  const content = useTourContent();
  if (offer.offeredTourId === null) {
    return null;
  }
  const tour = content.tours[offer.offeredTourId];

  return (
    <section
      data-testid="tour-offer"
      aria-label={content.ui.offerTitle}
      className="bg-card fixed end-4 bottom-20 z-[150] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-xl border p-4 shadow-lg sm:bottom-6"
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="text-primary h-4 w-4" aria-hidden="true" />
        {content.ui.offerTitle}
      </p>
      <p className="text-muted-foreground text-xs">
        {tour.title}: {tour.description}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={offer.decline}>
          {content.ui.offerLater}
        </Button>
        <Button type="button" size="sm" onClick={offer.accept}>
          {content.ui.offerStart}
        </Button>
      </div>
    </section>
  );
}
