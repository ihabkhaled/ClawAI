'use client';

import { Badge } from '@/components/ui/badge';
import type { SecurityCaptchaStatusProps } from '@/types/admin-security-settings.types';

/**
 * What a captcha card has in force right now: On only when both keys resolve,
 * and where each key comes from (saved on this page, the server configuration,
 * or not set). Production keys usually live on the server, so the empty boxes
 * below do not mean the provider is off.
 */
export function SecurityCaptchaStatus({
  status,
  testId,
  t,
}: SecurityCaptchaStatusProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 pt-1" data-testid={testId} data-active={status.active}>
      <div className="flex flex-wrap items-center gap-2">
        {status.active ? (
          <Badge variant="success">{t('adminSecurity.status.on')}</Badge>
        ) : (
          <Badge variant="outline">{t('adminSecurity.status.off')}</Badge>
        )}
        <span className="text-muted-foreground text-sm">
          {t('adminSecurity.status.keySources', {
            siteKey: t(status.siteKeySourceKey),
            secretKey: t(status.secretKeySourceKey),
          })}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{t('adminSecurity.status.overrideNote')}</p>
    </div>
  );
}
