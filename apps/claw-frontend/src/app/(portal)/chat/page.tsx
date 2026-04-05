'use client';

import { Archive, MessageSquare, Plus, Search } from 'lucide-react';

import { ThreadListItem } from '@/components/chat/thread-list-item';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatPage } from '@/hooks/chat/use-chat-page';
import { useTranslation } from '@/lib/i18n';
import type { ChatThread } from '@/types';

function ThreadList({
  isLoading,
  pinnedThreads,
  unpinnedThreads,
  search,
  onPin,
  onArchive,
  isPinPending,
  isArchivePending,
}: {
  isLoading: boolean;
  pinnedThreads: ChatThread[];
  unpinnedThreads: ChatThread[];
  search: string;
  onPin: (id: string, isPinned: boolean) => void;
  onArchive: (id: string, isArchived: boolean) => void;
  isPinPending: boolean;
  isArchivePending: boolean;
}): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label="Loading threads..." />;
  }

  if (pinnedThreads.length === 0 && unpinnedThreads.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {search ? 'No threads match your search.' : 'No threads yet.'}
      </div>
    );
  }

  return (
    <>
      {pinnedThreads.map((thread) => (
        <ThreadListItem
          key={thread.id}
          thread={thread}
          onPin={onPin}
          onArchive={onArchive}
          isPinPending={isPinPending}
          isArchivePending={isArchivePending}
        />
      ))}
      {pinnedThreads.length > 0 && unpinnedThreads.length > 0 ? (
        <div className="my-1 border-t" />
      ) : null}
      {unpinnedThreads.map((thread) => (
        <ThreadListItem
          key={thread.id}
          thread={thread}
          onPin={onPin}
          onArchive={onArchive}
          isPinPending={isPinPending}
          isArchivePending={isArchivePending}
        />
      ))}
    </>
  );
}

export default function ChatPage() {
  const {
    pinnedThreads,
    unpinnedThreads,
    isLoading,
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

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            <ThreadList
              isLoading={isLoading}
              pinnedThreads={pinnedThreads}
              unpinnedThreads={unpinnedThreads}
              search={search}
              onPin={handlePin}
              onArchive={handleArchive}
              isPinPending={isPinPending}
              isArchivePending={isArchivePending}
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
