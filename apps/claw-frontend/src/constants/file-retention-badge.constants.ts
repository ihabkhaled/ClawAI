import type { UseFileRetentionBadgeReturn } from '@/types';

export const FILE_RETENTION_TONE_DANGER =
  'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';

export const FILE_RETENTION_TONE_WARNING =
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';

export const FILE_RETENTION_TONE_NEUTRAL =
  'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';

export const FILE_RETENTION_HIDDEN: UseFileRetentionBadgeReturn = {
  shouldRender: false,
  label: '',
  toneClass: '',
};
