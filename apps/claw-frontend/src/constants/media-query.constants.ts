// Shared media-query strings used by useMediaQuery-based hooks.
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The `lg` breakpoint, as a media query rather than a Tailwind prefix.
 *
 * A Tailwind prefix cannot pick a component *variant* — it only styles what is
 * already rendered. The composer toolbar needs the model picker to be an
 * icon-only square on a phone or a narrow tablet and a labelled trigger on a
 * laptop, and those are two different props on the same component. Rendering
 * both and hiding one with `lg:hidden` mounts every picker, popover and query
 * twice.
 *
 * `lg` rather than `md` because the portal's own sidebar appears at `md`: a
 * 768px tablet leaves the conversation about 464px, and a labelled model
 * trigger plus the credit badge does not fit in it. Measured at 768x1024 — the
 * label squeezed to "a…" and the toolbar overflowed.
 *
 * Keep this string in step with `lg` in tailwind.config — 1024px.
 */
export const MEDIA_QUERY_LG_UP = '(min-width: 1024px)';

/**
 * The `sm` breakpoint, as a media query.
 *
 * Below it the chat header has room for the back button, the thread drawer, the
 * title and one overflow trigger — and nothing else. Measured at 375px: seven
 * 44px controls (the touch-target floor is a global rule) plus gaps left the
 * title block 2px wide, and the title wrapped one character per line into a
 * 926px-tall header with a 2px conversation under it.
 *
 * Keep in step with `sm` in tailwind.config — 640px.
 */
export const MEDIA_QUERY_SM_UP = '(min-width: 640px)';
