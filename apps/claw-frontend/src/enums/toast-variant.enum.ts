// Variants for the design-system Toast primitive. Each variant maps onto a
// semantic CSS-variable palette + lucide icon (see toast.constants.ts):
//   - Default: neutral surface (info-grey)
//   - Success: --success / CheckCircle2 (green)
//   - Error / Destructive: --destructive / XCircle (red).
//     `Destructive` is kept as an alias for the historical shadcn variant name
//     so existing call sites and Radix data attributes (`group-[.destructive]`)
//     keep working without churn.
//   - Warning: --warning / AlertTriangle (amber)
//   - Info: --info / Info (blue)
export enum ToastVariant {
  Default = 'default',
  Success = 'success',
  Error = 'error',
  Destructive = 'destructive',
  Warning = 'warning',
  Info = 'info',
}
