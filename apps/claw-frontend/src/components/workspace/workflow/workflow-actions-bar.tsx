import { FileText, ListChecks, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { WorkflowActionsBarProps } from '@/types/component.types';

export function WorkflowActionsBar({
  hasItems,
  onAction,
  t,
}: WorkflowActionsBarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.SUMMARIZE)}
        disabled={!hasItems}
      >
        <Sparkles className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('workflow.actions.summarize_all')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.EXTRACT)}
        disabled={!hasItems}
      >
        <ListChecks className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('workflow.actions.extract_requirements')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.DRAFT)}
        disabled={!hasItems}
      >
        <FileText className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('workflow.actions.draft_prd')}
      </Button>
    </div>
  );
}
