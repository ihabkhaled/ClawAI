import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';

import { ToastVariant } from '@/enums/toast-variant.enum';

// Default auto-dismiss duration per variant (ms). Errors/destructive linger
// longer so users have time to read them; success snaps away faster. The
// progress bar at the bottom of each toast animates from full to empty over
// this duration so the user can visually predict the dismiss moment.
export const TOAST_DEFAULT_DURATION_MS: Record<ToastVariant, number> = {
  [ToastVariant.Default]: 5000,
  [ToastVariant.Success]: 4000,
  [ToastVariant.Error]: 7000,
  [ToastVariant.Destructive]: 7000,
  [ToastVariant.Warning]: 6000,
  [ToastVariant.Info]: 5000,
};

// Per-variant icon. `null` for the default variant — neutral toasts skip the
// leading icon column to keep them visually quiet.
export const TOAST_VARIANT_ICONS: Record<ToastVariant, LucideIcon | null> = {
  [ToastVariant.Default]: null,
  [ToastVariant.Success]: CheckCircle2,
  [ToastVariant.Error]: XCircle,
  [ToastVariant.Destructive]: XCircle,
  [ToastVariant.Warning]: AlertTriangle,
  [ToastVariant.Info]: Info,
};

// Container Tailwind classes per variant. We layer on top of the existing
// shadcn base styles — these only add the semantic border + ring + accent
// surface so success looks green, error looks red, etc. The historical
// `destructive` variant is preserved exactly to avoid breaking any consumers
// still styling via `group-[.destructive]`.
// `toast-surface` (globals.css) replaces the old `bg-<variant>/10` so the tint
// composites over an OPAQUE base on mobile and over the page from `sm:` up.
// Desktop is pixel-identical to the previous translucent treatment.
export const TOAST_VARIANT_CONTAINER_CLASSES: Record<ToastVariant, string> = {
  [ToastVariant.Default]: 'border bg-background text-foreground',
  [ToastVariant.Success]:
    'success group border-success/40 toast-surface [--toast-tint:var(--success)] text-foreground',
  [ToastVariant.Error]:
    'destructive group border-destructive/40 toast-surface [--toast-tint:var(--destructive)] text-foreground',
  [ToastVariant.Destructive]:
    'destructive group border-destructive bg-destructive text-destructive-foreground',
  [ToastVariant.Warning]:
    'warning group border-warning/40 toast-surface [--toast-tint:var(--warning)] text-foreground',
  [ToastVariant.Info]:
    'info group border-info/40 toast-surface [--toast-tint:var(--info)] text-foreground',
};

// Tailwind classes that recolor the leading icon for each variant. These line
// up with the semantic CSS variables defined in globals.css so dark mode
// inherits the brighter variant automatically.
export const TOAST_VARIANT_ICON_CLASSES: Record<ToastVariant, string> = {
  [ToastVariant.Default]: 'text-muted-foreground',
  [ToastVariant.Success]: 'text-success',
  [ToastVariant.Error]: 'text-destructive',
  [ToastVariant.Destructive]: 'text-destructive-foreground',
  [ToastVariant.Warning]: 'text-warning',
  [ToastVariant.Info]: 'text-info',
};

// Progress bar fill color per variant. The progress bar sits flush against the
// bottom edge of the toast and animates from `width: 100%` to `width: 0%` over
// `TOAST_DEFAULT_DURATION_MS[variant]`.
export const TOAST_VARIANT_PROGRESS_CLASSES: Record<ToastVariant, string> = {
  [ToastVariant.Default]: 'bg-muted-foreground/40',
  [ToastVariant.Success]: 'bg-success',
  [ToastVariant.Error]: 'bg-destructive',
  [ToastVariant.Destructive]: 'bg-destructive-foreground/70',
  [ToastVariant.Warning]: 'bg-warning',
  [ToastVariant.Info]: 'bg-info',
};
