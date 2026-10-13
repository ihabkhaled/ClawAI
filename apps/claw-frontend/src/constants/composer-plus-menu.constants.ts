/** Every focusable row of the "+" menu carries this attribute; arrow keys move between them. */
export const COMPOSER_PLUS_ITEM_ATTRIBUTE = 'data-plus-item';
/** On a main-panel row that opens a sub-panel: focus returns here when the user goes Back. */
export const COMPOSER_PLUS_RETURN_ATTRIBUTE = 'data-plus-return';
export const COMPOSER_PLUS_ITEM_SELECTOR = `[${COMPOSER_PLUS_ITEM_ATTRIBUTE}]:not(:disabled)`;
/** Set by the file library on each focusable element (search, rows, Browse all). */
export const COMPOSER_PLUS_LIBRARY_ATTRIBUTE = 'data-library-nav';
/**
 * Menu rows AND library elements in one list, in DOM order (Attach, Context, Tools), so the
 * arrow keys cross every section instead of stopping at the library's edges.
 */
export const COMPOSER_PLUS_NAV_SELECTOR = `${COMPOSER_PLUS_ITEM_SELECTOR}, [${COMPOSER_PLUS_LIBRARY_ATTRIBUTE}]:not(:disabled)`;
/** Matches any element the menu's arrow keys start from. */
export const COMPOSER_PLUS_NAV_TARGET_SELECTOR = `[${COMPOSER_PLUS_ITEM_ATTRIBUTE}], [${COMPOSER_PLUS_LIBRARY_ATTRIBUTE}]`;
/** Shared look of a radio-style option row in the research panel. */
export const COMPOSER_PLUS_OPTION_CLASS =
  'touch:min-h-11 h-auto w-full justify-start gap-2 px-2 py-1.5 text-start font-normal whitespace-normal';
/**
 * Popover width. `touch:` repeats the width because the shared popover sets
 * `touch:w-[calc(100vw-1rem)]`, which would otherwise beat the plain width on a phone.
 */
export const COMPOSER_PLUS_POPOVER_WIDTH_CLASS =
  'w-[min(22rem,calc(100vw-1rem))] touch:w-[min(22rem,calc(100vw-1rem))]';
/**
 * Makes the file library follow the popover's width, and on a short viewport lets the whole
 * menu scroll as one instead of nesting the library's own capped scroller inside it.
 */
export const COMPOSER_PLUS_LIBRARY_FIT_CLASS =
  '[&_[data-testid=file-library-menu]]:w-full short-viewport:[&_[data-testid=file-library-menu]>div.overflow-y-auto]:max-h-none short-viewport:[&_[data-testid=file-library-menu]>div.overflow-y-auto]:overscroll-auto';
/** The "+" button; focus returns here when a control that was open next to it unmounts. */
export const COMPOSER_PLUS_TRIGGER_SELECTOR = '[data-tour="composer-attach"]';
