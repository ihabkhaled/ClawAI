import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ThreadGenerationSelectionsViewProps } from '@/types/thread-generation-progress.types';
import { boardLanguageLabel, boardTypeLabelKey } from '@/utilities/thread-board-view.utility';
import { formatMicroUsd, threadRoleLabelKey } from '@/utilities/thread-generation-progress.utility';
import { threadRoleNumber } from '@/utilities/thread-role-number.utility';

/** What the owner chose for this job: topic, type, language, cap, and every role with fallbacks. */
export function ThreadGenerationSelectionsView({
  selections,
}: ThreadGenerationSelectionsViewProps): ReactElement {
  const { t } = useTranslation();
  const typeKey = boardTypeLabelKey(selections.publicationType);
  return (
    <section
      className="flex flex-col gap-3"
      aria-label={t('chat.threadProgress.selectedTitle')}
      data-testid="thread-progress-selections"
    >
      <h3 className="font-medium">{t('chat.threadProgress.selectedTitle')}</h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-muted-foreground text-xs">{t('chat.threadTopic')}</dt>
          <dd className="break-words">{selections.topic}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('chat.threadPublicationType')}</dt>
          <dd>{typeKey === null ? selections.publicationType : t(typeKey)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('chat.threadContentLocale')}</dt>
          <dd>{boardLanguageLabel(selections.contentLocale)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('chat.threadSpendCapUsd')}</dt>
          <dd>{formatMicroUsd(selections.spendCapMicroUsd)}</dd>
        </div>
      </dl>
      <ul className="flex flex-col gap-2 text-sm">
        {selections.roles.map((role) => (
          <li key={role.roleId} className="border-border min-w-0 rounded-md border p-2">
            <p className="font-medium">
              {t(threadRoleLabelKey(role.roleKind))}
              {threadRoleNumber(role.roleId)}
            </p>
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer">
                {t('chat.threadProgress.detailsLabel')}
              </summary>
              <p className="mt-1 flex flex-wrap gap-1" dir="ltr">
                <span className="bg-muted rounded-full px-2 py-0.5 break-all">
                  {role.provider} / {role.model}
                </span>
              </p>
              <p className="text-muted-foreground mt-1 break-all">
                {role.fallbacks.length === 0
                  ? t('chat.threadProgress.noFallbacks')
                  : t('chat.threadProgress.fallbacks', {
                      list: role.fallbacks
                        .map((entry) => `${entry.provider} / ${entry.model}`)
                        .join(', '),
                    })}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
