'use client';

import { ShieldAlert } from 'lucide-react';

import { PluginConsentActions } from '@/components/chat/plugin-consent-actions';
import { PluginConsentConfirm } from '@/components/chat/plugin-consent-confirm';
import { PluginRiskBadge } from '@/components/plugins/plugin-risk-badge';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { usePluginConsentCard } from '@/hooks/plugins/use-plugin-consent-card';
import { useTranslation } from '@/lib/i18n';
import type { PluginConsentCardProps } from '@/types/plugin-consent-card.types';

/**
 * The question a plugin tool asks before it does something: which plugin and tool, what it will
 * send (already scrubbed of secrets and cut short by the server, shown as plain text), how risky
 * it is, and the four answers. It sits in the conversation while the turn waits; if the clock
 * runs out the server has already declined, and the buttons give way to a plain sentence.
 */
export function PluginConsentCard({
  request,
  busy,
  failed,
  onDecide,
  onExpired,
}: PluginConsentCardProps): React.ReactElement {
  const { t } = useTranslation();
  const card = usePluginConsentCard({ request, onDecide, onExpired });
  const titleId = `plugin-consent-title-${request.id}`;
  const detailId = `plugin-consent-detail-${request.id}`;
  const tone =
    request.riskLevel === PluginRiskLevel.Destructive
      ? 'border-destructive/50'
      : 'border-warning/40';
  return (
    <div
      ref={card.rootRef}
      role="alertdialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={detailId}
      data-testid="plugin-consent-card"
      className={`bg-card flex w-full min-w-0 flex-col gap-3 rounded-lg border p-3 text-sm ${tone}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        <h4 id={titleId} className="font-medium">
          {t('pluginConsent.card.title')}
        </h4>
        <PluginRiskBadge risk={request.riskLevel} t={t} />
      </div>
      <div id={detailId} className="flex min-w-0 flex-col gap-1">
        <p className="min-w-0 break-words">
          <span className="text-muted-foreground">{t('pluginConsent.card.plugin')}: </span>
          <span className="font-medium">{request.pluginName}</span>
        </p>
        <p className="min-w-0 break-words">
          <span className="text-muted-foreground">{t('pluginConsent.card.tool')}: </span>
          <span className="font-medium">{request.toolTitle}</span>{' '}
          <code className="text-muted-foreground text-xs" dir="ltr">
            {request.toolName}
          </code>
        </p>
        <p className="text-muted-foreground">{t('pluginConsent.card.arguments')}</p>
        <pre
          dir="ltr"
          className="bg-muted max-h-32 overflow-auto rounded-md p-2 text-start font-mono text-xs break-all whitespace-pre-wrap"
        >
          {request.argsPreview.length === 0
            ? t('pluginConsent.card.noArguments')
            : request.argsPreview}
        </pre>
      </div>
      {card.expired ? (
        <p role="status" className="text-warning">
          {t('pluginConsent.card.expired')}
        </p>
      ) : null}
      {!card.expired && card.confirming ? (
        <PluginConsentConfirm
          toolTitle={request.toolTitle}
          busy={busy}
          confirmRef={card.confirmRef}
          onConfirm={card.confirmAlways}
          onBack={card.back}
        />
      ) : null}
      {!card.expired && !card.confirming ? (
        <PluginConsentActions
          request={request}
          busy={busy}
          remaining={card.remaining}
          denyRef={card.denyRef}
          onChoose={card.choose}
        />
      ) : null}
      {failed ? (
        <p role="alert" className="text-destructive text-xs">
          {t('pluginConsent.card.error')}
        </p>
      ) : null}
    </div>
  );
}
