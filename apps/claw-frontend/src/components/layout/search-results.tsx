import { MessageSquare } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { SearchResultsProps } from '@/types';
import { formatRelativeDate } from '@/utilities';

export function SearchResults({
  isLoading,
  threads,
  onSelect,
}: SearchResultsProps): React.ReactElement {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
        {t('chat.searching')}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
        {t('chat.globalSearchNoResults')}
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-start text-sm transition-colors hover:bg-accent"
          onClick={() => onSelect(thread.id)}
        >
          <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{thread.title ?? t('chat.untitled')}</div>
            <div className="text-xs text-muted-foreground">
              {formatRelativeDate(thread.updatedAt)}
              {thread._count?.messages !== undefined
                ? ` \u00B7 ${thread._count.messages} messages`
                : ''}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
