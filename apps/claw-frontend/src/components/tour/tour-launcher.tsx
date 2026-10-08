'use client';

import { CircleHelp } from 'lucide-react';
import type { ReactElement } from 'react';

import { TourLauncherEntry } from '@/components/tour/tour-launcher-entry';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTourContent } from '@/hooks/tour/use-tour-content';
import { useTourLauncher } from '@/hooks/tour/use-tour-launcher';

/**
 * The help button in the top bar: this page's tours first, then every other tour, each one a
 * click away. It is how a person finds a tour again after dismissing the offer.
 */
export function TourLauncher(): ReactElement {
  const ui = useTourContent().ui;
  const launcher = useTourLauncher();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="focus-visible:ring-primary/40 shrink-0 focus-visible:ring-2"
          aria-label={ui.launcherLabel}
          title={ui.launcherLabel}
          data-testid="tour-launcher"
        >
          <CircleHelp className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        <DropdownMenuLabel>
          <span className="block text-sm">{ui.launcherTitle}</span>
          <span className="text-muted-foreground block text-xs font-normal">{ui.launcherHint}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {launcher.here.length > 0 ? (
          launcher.here.map((entry) => (
            <TourLauncherEntry
              key={entry.id}
              entry={entry}
              startLabel={ui.launcherStart}
              restartLabel={ui.launcherRestart}
              doneLabel={ui.launcherDone}
              onStart={() => launcher.start(entry.id)}
            />
          ))
        ) : (
          <p className="text-muted-foreground px-2 py-2 text-xs" data-testid="tour-none-here">
            {ui.launcherNoneHere}
          </p>
        )}
        <DropdownMenuSeparator />
        {launcher.offersDisabled ? (
          <p className="text-muted-foreground px-2 pb-1 text-xs">{ui.launcherOffersStopped}</p>
        ) : null}
        <DropdownMenuItem
          className="cursor-pointer text-sm"
          data-testid="tour-offers-toggle"
          onSelect={() => launcher.setOffersDisabled(!launcher.offersDisabled)}
        >
          {launcher.offersDisabled ? ui.launcherResumeOffers : ui.launcherStopOffers}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
