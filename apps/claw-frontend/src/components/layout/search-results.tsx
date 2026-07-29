import { MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
      <div className="text-muted-foreground px-3 py-4 text-center text-sm">
        {t('chat.searching')}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-muted-foreground px-3 py-4 text-center text-sm">
        {t('chat.globalSearchNoResults')}
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      {threads.map((thread) => (
        <Button
          variant="unstyled"
          size="unstyled"
          key={thread.id}
          type="button"
          className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-2 text-start text-sm transition-colors"
          onClick={() => onSelect(thread.id)}
        >
          <MessageSquare className="text-muted-foreground h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{thread.title ?? t('chat.untitled')}</div>
            <div className="text-muted-foreground text-xs">
              {formatRelativeDate(thread.updatedAt)}
              {thread._count?.messages !== undefined
                ? ` \u00B7 ${thread._count.messages} messages`
                : ''}
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
