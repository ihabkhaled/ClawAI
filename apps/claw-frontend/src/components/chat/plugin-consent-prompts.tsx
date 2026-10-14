'use client';

import { PluginConsentCard } from '@/components/chat/plugin-consent-card';
import { usePluginConsentPrompts } from '@/hooks/plugins/use-plugin-consent-prompts';
import { useTranslation } from '@/lib/i18n';

/**
 * The consent cards waiting in the conversation. Mounted while a reply is in flight; it finds the
 * open questions on the server, so a reload or a reconnected stream shows the same cards. Renders
 * nothing when nothing is waiting.
 */
export function PluginConsentPrompts(): React.ReactElement | null {
  const { t } = useTranslation();
  const prompts = usePluginConsentPrompts();
  if (prompts.requests.length === 0) {
    return null;
  }
  return (
    <section
      aria-label={t('pluginConsent.card.listLabel')}
      aria-live="assertive"
      data-testid="plugin-consent-prompts"
      className="flex w-full min-w-0 flex-col gap-2"
    >
      {prompts.requests.map((request) => (
        <PluginConsentCard
          key={request.id}
          request={request}
          busy={prompts.isDeciding}
          failed={prompts.decideFailed}
          onDecide={prompts.answer}
          onExpired={prompts.refresh}
        />
      ))}
    </section>
  );
}
