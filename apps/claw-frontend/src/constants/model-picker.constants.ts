/** Tallest the desktop model list grows before it scrolls. */
export const MODEL_PICKER_LIST_MAX_HEIGHT_PX = 320;

/**
 * Room the popover keeps for everything but the list (search box, footer). The list shrinks below its cap on a short viewport instead of
 * pushing the footer off screen.
 */
export const MODEL_PICKER_CHROME_HEIGHT = '7rem';

/** Radix publishes the space left for the popover; it is unset inside the mobile dialog. */
export const MODEL_PICKER_AVAILABLE_HEIGHT =
  'var(--radix-popover-content-available-height, 100dvh)';

/** Estimated row height; Virtuoso measures the real one. */
export const MODEL_PICKER_ROW_HEIGHT_PX = 36;

/** List height inside the mobile bottom sheet (a definite height Virtuoso can fill). */
export const MODEL_PICKER_MOBILE_LIST_HEIGHT = '50dvh';

/** Pixels rendered above and below the viewport so fast scrolling never shows blanks. */
export const MODEL_PICKER_OVERSCAN_PX = 400;

/** DOM id of the listbox, referenced by the search input. */
export const MODEL_PICKER_LISTBOX_ID = 'model-picker-listbox';

/** Height of the Compare model list; a definite value so Virtuoso can window it. */
export const PARALLEL_MODEL_LIST_HEIGHT = 'min(16rem, 42dvh)';
