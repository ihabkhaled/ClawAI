import { ThreadFailureRemedy } from '@claw/shared-types';
import { LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  THREAD_CLASS_REASON_KEYS,
  THREAD_HEALING_RESULT_KEYS,
  THREAD_PHASE_KEYS,
} from '@/constants/thread-recovery.constants';
import { useTranslation } from '@/lib/i18n';
import type { ThreadRecoveryPanelProps } from '@/types/thread-generation-progress.types';
import { viewHealingAttempts } from '@/utilities/thread-recovery.utility';

import { ThreadErrorNotice } from './thread-error-notice';

/**
 * After a failure: which phase failed, why in one sentence, what the service already tried, and
 * up to three one-click ways forward (ADR-181). Shown only when the service sent a failure class;
 * an older service leaves the plain failure card alone.
 */
export function ThreadGenerationRecoveryPanel({
  failure,
  healing,
  recovery,
}: ThreadRecoveryPanelProps): ReactElement | null {
  const { t } = useTranslation();
  if (failure.failureClass === undefined || failure.phase === undefined) {
    return null;
  }
  const tried = viewHealingAttempts(healing);

  return (
    <section
      className="border-border bg-muted/30 flex min-w-0 flex-col gap-3 rounded-md border p-4 text-sm"
      aria-labelledby="thread-recovery-title"
      data-testid="thread-recovery-panel"
    >
      <h3 id="thread-recovery-title" className="flex items-center gap-2 font-semibold">
        <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('chat.threadProgress.recovery.title')}
      </h3>
      <p data-testid="thread-recovery-phase">
        {t('chat.threadProgress.recovery.phaseLine', {
          phase: t(THREAD_PHASE_KEYS[failure.phase]),
        })}
      </p>
      <p className="font-medium" data-testid="thread-recovery-reason">
        {t(THREAD_CLASS_REASON_KEYS[failure.failureClass])}
      </p>
      <div>
        <p className="font-medium">{t('chat.threadProgress.recovery.triedTitle')}</p>
        {tried.length === 0 ? (
          <p className="text-muted-foreground">{t('chat.threadProgress.recovery.triedNone')}</p>
        ) : (
          <ul
            className="text-muted-foreground flex flex-col gap-1"
            data-testid="thread-recovery-tried"
          >
            {tried.map(({ attempt, messageKey, model }) => (
              <li key={attempt.seq} className="min-w-0">
                <span>{t(messageKey)}</span>
                {model === '' ? null : (
                  <span className="ms-1 break-all" dir="ltr">
                    ({model})
                  </span>
                )}{' '}
                <span>{t(THREAD_HEALING_RESULT_KEYS[attempt.result])}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {recovery.actions.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <p className="font-medium">{t('chat.threadProgress.recovery.remediesTitle')}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {recovery.actions.map((action) =>
              action.remedy === ThreadFailureRemedy.ADD_CREDIT ? (
                <Button key={action.remedy} asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={recovery.addCreditHref}>{t(action.labelKey, action.params)}</Link>
                </Button>
              ) : (
                <Button
                  key={action.remedy}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-9 w-full whitespace-normal sm:w-auto"
                  disabled={recovery.pending !== null}
                  isLoading={recovery.pending === action.remedy}
                  onClick={() => recovery.run(action.remedy)}
                >
                  {t(action.labelKey, action.params)}
                </Button>
              ),
            )}
          </div>
        </div>
      )}
      {recovery.error === null ? null : <ThreadErrorNotice message={recovery.error} />}
    </section>
  );
}
