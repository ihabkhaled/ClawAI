'use client';

import { X } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadChangeRequestSuggestionText } from '@/components/threads/thread-change-request-suggestion-text';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { ThreadEditorSuggestionCardProps } from '@/types/thread-publication.types';

/** The reader suggestion the owner is applying by hand, kept in view above the editor. */
export function ThreadEditorSuggestionCard({
  suggestion,
  onDismiss,
}: ThreadEditorSuggestionCardProps): ReactElement {
  const { t } = useTranslation();

  return (
    <aside
      className="border-border bg-muted/30 flex flex-col gap-2 rounded-lg border p-3"
      data-testid="thread-editor-suggestion"
      aria-label={t('threadReview.editorSuggestionTitle')}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{t('threadReview.editorSuggestionTitle')}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          <X className="h-4 w-4" aria-hidden="true" />
          {t('threadReview.editorSuggestionDismiss')}
        </Button>
      </div>
      <ThreadChangeRequestSuggestionText text={suggestion.suggestion} />
    </aside>
  );
}
