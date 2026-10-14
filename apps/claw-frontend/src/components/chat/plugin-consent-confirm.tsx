'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { PluginConsentConfirmProps } from '@/types/plugin-consent-card.types';

/** The second question before "Always allow" on a tool that can delete things. */
export function PluginConsentConfirm({
  toolTitle,
  busy,
  confirmRef,
  onConfirm,
  onBack,
}: PluginConsentConfirmProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2" data-testid="plugin-consent-confirm">
      <p className="font-medium">{t('pluginConsent.card.confirmTitle')}</p>
      <p className="text-muted-foreground">
        {t('pluginConsent.card.confirmBody', { value: toolTitle })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={confirmRef}
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={onConfirm}
        >
          {t('pluginConsent.card.confirmYes')}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onBack}>
          {t('pluginConsent.card.confirmBack')}
        </Button>
      </div>
    </div>
  );
}
