'use client';

import { MessageSquare, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { useGlobalThreadSearch } from '@/hooks/chat/use-global-thread-search';
import { cn } from '@/lib/utils';
import type { ChatThread, GlobalSearchProps } from '@/types';
import { formatRelativeDate } from '@/utilities';

function SearchResults({
  isLoading,
  threads,
  onSelect,
}: {
  isLoading: boolean;
  threads: ChatThread[];
  onSelect: (id: string) => void;
}): React.ReactElement {
  if (isLoading) {
    return <div className="px-3 py-4 text-center text-sm text-muted-foreground">Searching...</div>;
  }

  if (threads.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-sm text-muted-foreground">No threads found</div>
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
            <div className="truncate font-medium">{thread.title ?? 'Untitled'}</div>
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

export function GlobalSearch({ className }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { threads, isLoading, search, setSearch, isOpen, handleOpenChange } =
    useGlobalThreadSearch();

  const handleToggle = useCallback((): void => {
    handleOpenChange(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, handleOpenChange]);

  const handleSelect = useCallback(
    (threadId: string): void => {
      handleOpenChange(false);
      router.push(ROUTES.CHAT_THREAD(threadId));
    },
    [handleOpenChange, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleOpenChange(false);
      }
    },
    [handleOpenChange],
  );

  const showResults = isOpen && search.length > 0;

  return (
    <div className={cn('relative', className)}>
      {isOpen ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search all threads..."
              className="h-9 w-64 ps-8 text-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => handleOpenChange(false)}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleToggle}
          aria-label="Search threads"
        >
          <Search className="h-4 w-4" />
        </Button>
      )}

      {showResults ? (
        <div className="absolute end-0 top-full z-50 mt-1 w-80 rounded-md border bg-popover p-1 shadow-md">
          <SearchResults isLoading={isLoading} threads={threads} onSelect={handleSelect} />
        </div>
      ) : null}
    </div>
  );
}
