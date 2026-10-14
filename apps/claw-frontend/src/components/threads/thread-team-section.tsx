import type { ReactElement } from 'react';

import { ThreadModelPicker } from '@/components/threads/thread-model-picker';
import { Button } from '@/components/ui/button';
import { THREAD_GENERATION_ROLE_KEYS } from '@/constants/thread-publication.constants';
import { useTranslation } from '@/lib/i18n';
import type { ThreadGenerationFormProps } from '@/types/thread-generation-progress.types';
import { threadTeamSummaryKey } from '@/utilities/thread-recommended-team.utility';

/**
 * The model team for a Thread. The recommended team is already selected, so the owner names a
 * topic and presses Start; choosing models yourself lives under an Advanced fold.
 */
export function ThreadTeamSection({ form }: ThreadGenerationFormProps): ReactElement {
  const { t } = useTranslation();

  function roleLabel(index: number): string {
    if (index < 3) {
      return `${t('chat.threadAuthorModel')} ${index + 1}`;
    }
    return index === 3 ? t('chat.threadJudgeModel') : t('chat.threadCriticModel');
  }

  return (
    <section className="flex flex-col gap-2" data-tour="thread-create-models">
      <h3 className="text-sm font-medium">{t('chat.threadTeam.title')}</h3>
      <p className="text-muted-foreground text-sm" data-testid="thread-team-summary">
        {t(threadTeamSummaryKey(form.hasRecommendedTeam, form.isRecommendedSelected))}
      </p>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          {t('chat.threadTeam.advanced')}
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {form.selectedModels.map((model, index) => (
              <ThreadModelPicker
                key={THREAD_GENERATION_ROLE_KEYS[index]}
                id={`thread-role-${THREAD_GENERATION_ROLE_KEYS[index] ?? String(index)}`}
                label={roleLabel(index)}
                value={model}
                onChange={(selected) => form.changeModel(index, selected)}
                availability={form.modelAvailability}
                planName={form.planName}
              />
            ))}
          </div>
          {form.hasRecommendedTeam && !form.isRecommendedSelected ? (
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={form.resetToRecommended}
            >
              {t('chat.threadTeam.reset')}
            </Button>
          ) : null}
        </div>
      </details>
    </section>
  );
}
