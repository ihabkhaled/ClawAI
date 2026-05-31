// Dark-mode foregrounds bumped from -400 → -300 to satisfy WCAG AA (4.5:1)
// when sitting on the matching -900/30 background tint. The -400 variants
// failed by ~0.3-0.6 in a contrast check; -300 clears comfortably.
export const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  inactive:
    "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  error:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
};

// Screen-reader category labels for StatusBadge. The badge already renders
// the raw status word visually (e.g. "active"); these add a semantic prefix
// so SR users hear "Success: active" instead of relying on colour alone.
// Maps to keys defined in `accessibility.status*` in the i18n dictionary.
export const STATUS_SR_KEYS: Record<string, string> = {
  active: 'accessibility.statusSuccess',
  inactive: 'accessibility.statusInfo',
  error: 'accessibility.statusError',
  pending: 'accessibility.statusPending',
};
