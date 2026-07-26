/**
 * The subset of `Badge` variants a domain component may ask for by name.
 *
 * Exists so a prop can carry "which tone" without a string-literal union and
 * without leaking the shadcn variant table into domain types.
 */
export enum BadgeTone {
  DEFAULT = 'default',
  SECONDARY = 'secondary',
  DESTRUCTIVE = 'destructive',
  OUTLINE = 'outline',
  SUCCESS = 'success',
  WARNING = 'warning',
  INFO = 'info',
}
