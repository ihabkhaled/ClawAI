/**
 * Styling for a group heading inside a Select dropdown.
 *
 * Three signals, because any one alone is easy to miss in a dense list:
 *
 * - `bg-muted/60` — a translucent band. Semi-transparent rather than solid so
 *   it reads as a divider over the popover surface instead of a second panel,
 *   and so it works unchanged in both themes.
 * - `font-bold` + `text-base` — heavier and 2px larger than the `text-sm`
 *   options below it.
 * - `select-none` — dragging across a heading would otherwise paint it with the
 *   OS text-selection highlight, which looks just like a chosen option.
 *
 * `pl-8` matches the option indent so the band lines up with the check-mark
 * gutter rather than sitting proud of it. The negative-margin pair widens the
 * band to the popover edges, which the padded default cannot do.
 */
export const SELECT_GROUP_HEADER_CLASSES =
  '-mx-1 my-1 select-none bg-muted/60 py-2 pl-8 pr-2 text-base font-bold text-foreground';
