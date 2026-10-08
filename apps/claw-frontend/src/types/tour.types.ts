import type { RefObject } from 'react';

import type { TourId } from '@/enums/tour-id.enum';
import type { TourPopoverSide } from '@/enums/tour-popover-side.enum';

/** One step: a stable id (its text is looked up by it) and the data-tour value to highlight. */
export type TourStepDefinition = {
  id: string;
  /** The `data-tour` value of the element to highlight. `null` shows a centered card. */
  target: string | null;
};

export type TourDefinition = {
  id: TourId;
  /** Paths (no locale prefix) where this tour is offered. A trailing `/*` matches anything deeper. */
  routes: readonly string[];
  /** Paths inside `routes` where it is not offered. */
  excludedRoutes: readonly string[];
  /** Offer it to a person the first time they land on one of its routes. */
  autoOffer: boolean;
  steps: readonly TourStepDefinition[];
};

export type TourStepContent = { title: string; body: string };

export type TourContent = {
  title: string;
  description: string;
  steps: Readonly<Record<string, TourStepContent>>;
};

export type TourUiContent = {
  next: string;
  back: string;
  skip: string;
  done: string;
  stepOf: string;
  dialogLabel: string;
  launcherLabel: string;
  launcherTitle: string;
  launcherHint: string;
  launcherHere: string;
  launcherDone: string;
  launcherStart: string;
  launcherRestart: string;
  offerTitle: string;
  offerStart: string;
  offerLater: string;
  offerNever: string;
  launcherNoneHere: string;
  launcherStopOffers: string;
  launcherResumeOffers: string;
  launcherOffersStopped: string;
  missingTarget: string;
};

export type TourDictionary = {
  ui: TourUiContent;
  tours: Readonly<Record<TourId, TourContent>>;
};

/** What the browser remembers about tours. */
export type TourProgress = {
  completed: Readonly<Record<string, true>>;
  dismissedOffers: Readonly<Record<string, true>>;
  /** The person chose "don't show tours again": no offers anywhere, replay still works. */
  offersDisabled: boolean;
};

export type TourStore = {
  activeTourId: TourId | null;
  stepIndex: number;
  progress: TourProgress;
  /** Loads what this person has already seen. Safe to call again for another account. */
  hydrate: (storageKey: string) => void;
  start: (tourId: TourId) => void;
  next: (totalSteps: number) => void;
  back: () => void;
  /** Ends the tour as completed (the last step's Done). */
  finish: () => void;
  /** Ends the tour without marking it completed. */
  skip: () => void;
  dismissOffer: (tourId: TourId) => void;
  /** Turns the first-visit offers off (or back on) everywhere. Replaying a tour still works. */
  setOffersDisabled: (value: boolean) => void;
};

export type TourViewport = { width: number; height: number };

export type TourRect = { top: number; left: number; width: number; height: number };

export type TourPopoverPosition = {
  top: number;
  left: number;
  side: TourPopoverSide;
};

export type TourHostState = {
  tour: TourDefinition;
  step: TourStepDefinition;
  stepIndex: number;
  totalSteps: number;
  rect: TourRect | null;
  isLast: boolean;
  isTargetMissing: boolean;
};

export type TourLauncherEntry = {
  id: TourId;
  title: string;
  description: string;
  isCompleted: boolean;
};

export type TourLauncherController = {
  /** Only the tours of the page the person is on: a tour of another page cannot be shown here. */
  here: readonly TourLauncherEntry[];
  offersDisabled: boolean;
  setOffersDisabled: (value: boolean) => void;
  start: (tourId: TourId) => void;
};

export type TourOfferController = {
  offeredTourId: TourId | null;
  accept: () => void;
  decline: () => void;
  /** "Don't show tours again": turns offers off everywhere. */
  never: () => void;
};

export type TourHostViewController = {
  host: TourHostState;
  ui: TourUiContent;
  title: string;
  body: string;
  stepLabel: string;
  spotlight: TourRect | null;
  position: TourPopoverPosition;
  popoverRef: RefObject<HTMLDivElement | null>;
  nextRef: RefObject<HTMLButtonElement | null>;
  goNext: () => void;
  goBack: () => void;
  skipTour: () => void;
};

export type TourLauncherEntryProps = {
  entry: TourLauncherEntry;
  startLabel: string;
  restartLabel: string;
  doneLabel: string;
  onStart: () => void;
};
