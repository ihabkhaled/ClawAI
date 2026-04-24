import { FileText, Layers, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { FigmaActionsBarProps } from '@/types/component.types';

export function FigmaActionsBar({
  onAction,
  isDraftPending,
  t,
}: FigmaActionsBarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.SUMMARIZE)}
        disabled={isDraftPending}
      >
        <Sparkles className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('figma.actions.summarize')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.EXTRACT)}
        disabled={isDraftPending}
      >
        <Layers className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('figma.actions.extract_components')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.DRAFT)}
        disabled={isDraftPending}
      >
        <FileText className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('figma.actions.draft_spec')}
      </Button>
    </div>
  );
}
