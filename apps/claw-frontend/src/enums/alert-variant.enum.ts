// Variants for the design-system Alert primitive. `Default` matches a
// neutral surface; the rest map onto the semantic --success/--warning/
// --destructive/--info CSS tokens defined in app/globals.css.
export enum AlertVariant {
  Default = 'default',
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}
