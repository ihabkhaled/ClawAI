import {
  FILE_RETENTION_HIDDEN,
  FILE_RETENTION_TONE_DANGER,
  FILE_RETENTION_TONE_NEUTRAL,
  FILE_RETENTION_TONE_WARNING,
} from '@/constants/file-retention-badge.constants';
import { useTranslation } from '@/lib/i18n';
import type { UseFileRetentionBadgeReturn } from '@/types';
import { daysUntilExpiry } from '@/utilities';

export function useFileRetentionBadge(
  retentionExpiresAt: string | null | undefined,
): UseFileRetentionBadgeReturn {
  const { t } = useTranslation();

  if (retentionExpiresAt === null || retentionExpiresAt === undefined || retentionExpiresAt === '') {
    return FILE_RETENTION_HIDDEN;
  }

  const days = daysUntilExpiry(retentionExpiresAt, Date.now());
  if (Number.isNaN(days)) {
    return FILE_RETENTION_HIDDEN;
  }

  if (days === 0) {
    const expiryMillis = Date.parse(retentionExpiresAt);
    if (Number.isFinite(expiryMillis) && expiryMillis <= Date.now()) {
      return {
        shouldRender: true,
        label: t('files.retention.expired'),
        toneClass: FILE_RETENTION_TONE_DANGER,
      };
    }
    return {
      shouldRender: true,
      label: t('files.retention.expiresToday'),
      toneClass: FILE_RETENTION_TONE_DANGER,
    };
  }

  if (days < 2) {
    return {
      shouldRender: true,
      label: t('files.retention.expiresInDays', { n: days }),
      toneClass: FILE_RETENTION_TONE_DANGER,
    };
  }

  if (days <= 7) {
    return {
      shouldRender: true,
      label: t('files.retention.expiresInDays', { n: days }),
      toneClass: FILE_RETENTION_TONE_WARNING,
    };
  }

  return {
    shouldRender: true,
    label: t('files.retention.expiresInDays', { n: days }),
    toneClass: FILE_RETENTION_TONE_NEUTRAL,
  };
}
