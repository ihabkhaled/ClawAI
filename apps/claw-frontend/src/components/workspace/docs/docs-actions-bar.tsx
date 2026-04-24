import { ListChecks, Mail, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AiActionKind } from '@/enums/ai-action-kind.enum';
import type { DocsActionsBarProps } from '@/types/component.types';

export function DocsActionsBar({
  onAction,
  isDraftPending,
  t,
}: DocsActionsBarProps): React.ReactElement {
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
        {t('docs.actions.summarize')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.EXTRACT)}
        disabled={isDraftPending}
      >
        <ListChecks className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('docs.actions.extract_tasks')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAction(AiActionKind.DRAFT)}
        disabled={isDraftPending}
      >
        <Mail className="mr-1.5 size-3.5" aria-hidden="true" />
        {t('docs.actions.draft_email')}
      </Button>
    </div>
  );
}
