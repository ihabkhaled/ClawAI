'use client';

import { Archive, MessageSquare, Plus, Search } from 'lucide-react';

import { VirtualizedThreadList } from '@/components/chat/virtualized-thread-list';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatPage } from '@/hooks/chat/use-chat-page';
import { useTranslation } from '@/lib/i18n';

export default function ChatPage() {
  const {
    allThreads,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    search,
    setSearch,
    showArchived,
    toggleShowArchived,
    handleNewChat,
    isCreating,
    handlePin,
    handleArchive,
    isPinPending,
    isArchivePending,
  } = useChatPage();
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('nav.chat')}
        description={t('chat.threads')}
        actions={
          <Button onClick={handleNewChat} disabled={isCreating}>
            <Plus className="me-2 h-4 w-4" />
            {t('chat.newThread')}
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row md:gap-6">
        <div className="flex w-full shrink-0 flex-col gap-3 overflow-hidden md:w-80">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('chat.searchThreads')}
                className="ps-9"
              />
            </div>
            <Button
              variant={showArchived ? 'secondary' : 'ghost'}
              size="icon"
              className="shrink-0"
              onClick={toggleShowArchived}
              aria-label={showArchived ? 'Hide archived' : 'Show archived'}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            <VirtualizedThreadList
              threads={allThreads}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              onEndReached={fetchNextPage}
              onPin={handlePin}
              onArchive={handleArchive}
              isPinPending={isPinPending}
              isArchivePending={isArchivePending}
              search={search}
            />
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center rounded-lg border border-dashed md:flex">
          <EmptyState
            icon={MessageSquare}
            title="Select a thread or start a new chat"
            description="Choose an existing conversation from the sidebar or create a new one to interact with your configured AI models."
            action={
              <Button onClick={handleNewChat} disabled={isCreating}>
                <Plus className="me-2 h-4 w-4" />
                New Chat
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
