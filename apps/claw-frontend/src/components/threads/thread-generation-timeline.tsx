import type { ReactElement } from 'react';

import { ThreadGenerationStepItem } from '@/components/threads/thread-generation-step-item';
import { useTranslation } from '@/lib/i18n';
import type { ThreadGenerationTimelineProps } from '@/types/thread-generation-progress.types';

/** Every recorded step, oldest first, so the owner reads the job like a story. */
export function ThreadGenerationTimeline({ steps }: ThreadGenerationTimelineProps): ReactElement {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3" aria-label={t('chat.threadProgress.timelineTitle')}>
      <h3 className="font-medium">{t('chat.threadProgress.timelineTitle')}</h3>
      {steps.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t('chat.threadProgress.timelineEmpty')}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {steps.map((step) => (
            <ThreadGenerationStepItem key={step.seq} step={step} />
          ))}
        </ol>
      )}
    </section>
  );
}
