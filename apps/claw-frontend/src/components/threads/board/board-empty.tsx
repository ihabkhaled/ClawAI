'use client';

import { SearchX } from 'lucide-react';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { BoardEmptyProps } from '@/types/thread-board-view.types';

export function BoardEmpty({ hasQuery, hasActiveFilters, onClear }: BoardEmptyProps): ReactElement {
  const { t } = useTranslation();
  const filtered = hasQuery || hasActiveFilters;
  return (
    <EmptyState
      icon={SearchX}
      title={t('chat.threadBoardEmptyTitle')}
      description={filtered ? t('chat.threadBoardEmptySearch') : t('chat.threadBoardEmptyBody')}
      action={
        filtered ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={onClear}>
            {t('chat.threadBoardClearFilters')}
          </Button>
        ) : undefined
      }
    />
  );
}
