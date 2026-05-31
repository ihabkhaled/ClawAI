import { useTranslation } from '@/lib/i18n';
import type { UseFileRetentionBadgeReturn } from '@/types';
import { daysUntilExpiry } from '@/utilities';

const TONE_DANGER =
  'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
const TONE_WARNING =
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
const TONE_NEUTRAL =
  'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';

const HIDDEN: UseFileRetentionBadgeReturn = {
  shouldRender: false,
  label: '',
  toneClass: '',
};

export function useFileRetentionBadge(
  retentionExpiresAt: string | null | undefined,
): UseFileRetentionBadgeReturn {
  const { t } = useTranslation();

  if (retentionExpiresAt === null || retentionExpiresAt === undefined || retentionExpiresAt === '') {
    return HIDDEN;
  }

  const days = daysUntilExpiry(retentionExpiresAt, Date.now());
  if (Number.isNaN(days)) {
    return HIDDEN;
  }

  if (days === 0) {
    const expiryMillis = Date.parse(retentionExpiresAt);
    if (Number.isFinite(expiryMillis) && expiryMillis <= Date.now()) {
      return {
        shouldRender: true,
        label: t('files.retention.expired'),
        toneClass: TONE_DANGER,
      };
    }
    return {
      shouldRender: true,
      label: t('files.retention.expiresToday'),
      toneClass: TONE_DANGER,
    };
  }

  if (days < 2) {
    return {
      shouldRender: true,
      label: t('files.retention.expiresInDays', { n: days }),
      toneClass: TONE_DANGER,
    };
  }

  if (days <= 7) {
    return {
      shouldRender: true,
      label: t('files.retention.expiresInDays', { n: days }),
      toneClass: TONE_WARNING,
    };
  }

  return {
    shouldRender: true,
    label: t('files.retention.expiresInDays', { n: days }),
    toneClass: TONE_NEUTRAL,
  };
}
