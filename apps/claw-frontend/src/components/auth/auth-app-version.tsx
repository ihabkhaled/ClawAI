'use client';

import { APP_VERSION } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function AuthAppVersion(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <p className="text-muted-foreground absolute inset-x-0 bottom-3 text-center text-xs">
      {t('common.brandVersion', { version: APP_VERSION })}
    </p>
  );
}
