'use client';

import { useTranslation } from '@/lib/i18n';
import type { ContextInspectorConversationSectionProps } from '@/types';

/**
 * What the model was actually given from the thread.
 *
 * This is the half of the receipt that answers "why did the AI forget this?".
 * The inspector previously showed memories and pack items only, so a
 * hundred-message thread that reached the model as one message looked identical
 * to one that reached it whole.
 */
export function ContextInspectorConversationSection({
  conversation,
}: ContextInspectorConversationSectionProps): React.ReactElement {
  const { t } = useTranslation();

  if (conversation === undefined) {
    return (
      <p className="text-muted-foreground text-xs">
        {t('threadContextInspector.conversationUnavailable')}
      </p>
    );
  }

  const sent = conversation.includedMessageIds.length;
  const omitted = conversation.omittedMessageIds.length;

  return (
    <div className="space-y-1">
      <p className="text-foreground text-xs font-medium">
        {t('threadContextInspector.conversationHeading')}
      </p>
      <ul className="grid grid-cols-2 gap-2 text-xs">
        <li>
          {t('threadContextInspector.fieldMessagesSent')}: {String(sent)} /{' '}
          {String(conversation.totalThreadMessages)}
        </li>
        <li>
          {t('threadContextInspector.fieldTurnsSent')}: {String(conversation.includedTurnCount)}
        </li>
        <li>
          {t('threadContextInspector.fieldMessagesOmitted')}: {String(omitted)}
        </li>
        <li>
          {t('threadContextInspector.fieldInputTokens')}:{' '}
          {String(conversation.estimatedInputTokens)} / {String(conversation.availableInputTokens)}
        </li>
        <li>
          {t('threadContextInspector.fieldContextWindow')}:{' '}
          {String(conversation.contextWindowTokens)}
        </li>
        <li>
          {t('threadContextInspector.fieldWindowSource')}: {conversation.contextWindowSource}
        </li>
        <li className="col-span-2">
          {t('threadContextInspector.fieldReferenceSignals')}:{' '}
          {conversation.referenceSignals.length > 0
            ? conversation.referenceSignals.join(', ')
            : t('threadContextInspector.signalNone')}
        </li>
      </ul>
    </div>
  );
}
