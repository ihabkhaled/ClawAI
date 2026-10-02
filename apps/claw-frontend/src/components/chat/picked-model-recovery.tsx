'use client';

import type { ReactElement } from 'react';

import { ModelPicker } from '@/components/chat/model-picker';
import { Button } from '@/components/ui/button';
import { RoutingMode } from '@/enums';
import { usePickedModelRecovery } from '@/hooks/chat/use-picked-model-recovery';
import { useTranslation } from '@/lib/i18n';
import type { PickedModelRecoveryProps } from '@/types';

/**
 * Under a reply where the picked model and its substitutes all failed: up to
 * three models to retry with in one click, and a button that opens the model
 * picker. Every choice regenerates the same question with that model.
 */
export function PickedModelRecovery(props: PickedModelRecoveryProps): ReactElement {
  const { t } = useTranslation();
  const { suggestions, pickerProps } = usePickedModelRecovery(props, t);
  return (
    <div data-testid="picked-model-recovery" className="mt-3 flex flex-col gap-2 border-t pt-3">
      {suggestions.length > 0 ? (
        <span className="text-muted-foreground text-xs">{t('pickedModel.suggestionsTitle')}</span>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {suggestions.map((choice) => (
          <Button
            key={`${choice.provider}::${choice.model}`}
            type="button"
            variant="outline"
            size="sm"
            className="h-9 max-w-full min-w-0 truncate"
            data-testid="picked-model-suggestion"
            onClick={() =>
              props.onPick({
                routingMode: RoutingMode.MANUAL_MODEL,
                provider: choice.provider,
                model: choice.model,
              })
            }
          >
            <span className="truncate">{t('pickedModel.tryModel', { model: choice.label })}</span>
          </Button>
        ))}
        <ModelPicker {...pickerProps} />
      </div>
    </div>
  );
}
