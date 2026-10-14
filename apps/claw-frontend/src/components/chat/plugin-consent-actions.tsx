'use client';

import { Button } from '@/components/ui/button';
import { PluginConsentChoice } from '@/enums/plugin-consent-card.enum';
import { useTranslation } from '@/lib/i18n';
import type { PluginConsentActionsProps } from '@/types/plugin-consent-card.types';

/** The four answers of the consent card and the seconds left. Only the options the server allows appear. */
export function PluginConsentActions({
  request,
  busy,
  remaining,
  denyRef,
  onChoose,
}: PluginConsentActionsProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onChoose(PluginConsentChoice.AllowOnce)}
        >
          {t('pluginConsent.card.allowOnce')}
        </Button>
        {request.options.allowChat ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onChoose(PluginConsentChoice.AllowChat)}
          >
            {t('pluginConsent.card.allowChat')}
          </Button>
        ) : null}
        {request.options.always ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onChoose(PluginConsentChoice.AlwaysAllow)}
          >
            {t('pluginConsent.card.alwaysAllow')}
          </Button>
        ) : null}
        <Button
          ref={denyRef}
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onChoose(PluginConsentChoice.Deny)}
        >
          {t('pluginConsent.card.deny')}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {t('pluginConsent.card.timeLeft', { value: String(remaining) })}
      </p>
    </div>
  );
}
