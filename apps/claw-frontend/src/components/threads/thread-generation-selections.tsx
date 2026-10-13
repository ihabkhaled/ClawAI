import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { ThreadGenerationSelectionsViewProps } from '@/types/thread-generation-progress.types';
import { formatMicroUsd, threadRoleLabelKey } from '@/utilities/thread-generation-progress.utility';

/** What the owner chose for this job: topic, type, language, cap, and every role with fallbacks. */
export function ThreadGenerationSelectionsView({
  selections,
}: ThreadGenerationSelectionsViewProps): ReactElement {
  const { t } = useTranslation();
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
          <dd>{selections.publicationType}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('chat.threadContentLocale')}</dt>
          <dd>{selections.contentLocale}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{t('chat.threadSpendCapUsd')}</dt>
          <dd>{formatMicroUsd(selections.spendCapMicroUsd)}</dd>
        </div>
      </dl>
      <ul className="flex flex-col gap-2 text-sm">
        {selections.roles.map((role) => (
          <li key={role.roleId} className="border-border min-w-0 rounded-md border p-2">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{t(threadRoleLabelKey(role.roleKind))}</span>
              <span className="text-muted-foreground text-xs">{role.roleId}</span>
            </p>
            <p className="break-all">
              {role.provider} / {role.model}
            </p>
            <p className="text-muted-foreground text-xs break-all">
              {role.fallbacks.length === 0
                ? t('chat.threadProgress.noFallbacks')
                : t('chat.threadProgress.fallbacks', {
                    list: role.fallbacks
                      .map((entry) => `${entry.provider} / ${entry.model}`)
                      .join(', '),
                  })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
