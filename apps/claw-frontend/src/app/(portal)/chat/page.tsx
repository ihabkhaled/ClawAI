'use client';

import { MessageSquare, Plus, Search } from 'lucide-react';

import { ThreadListItem } from '@/components/chat/thread-list-item';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateThread } from '@/hooks/chat/use-create-thread';
import { useThreads } from '@/hooks/chat/use-threads';
import type { ChatThread } from '@/types';

function ThreadList({
  isLoading,
  threads,
  search,
}: {
  isLoading: boolean;
  threads: ChatThread[];
  search: string;
}): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label="Loading threads..." />;
  }

  if (threads.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {search ? 'No threads match your search.' : 'No threads yet.'}
      </div>
    );
  }

  return (
    <>
      {threads.map((thread) => (
        <ThreadListItem key={thread.id} thread={thread} />
      ))}
    </>
  );
}

export default function ChatPage() {
  const { threads, isLoading, search, setSearch } = useThreads();
  const { createThread, isPending: isCreating } = useCreateThread();

  const handleNewChat = () => {
    createThread({});
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Chat"
        description="Manage your AI conversation threads"
        actions={
          <Button onClick={handleNewChat} disabled={isCreating}>
            <Plus className="me-2 h-4 w-4" />
            New Chat
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row md:gap-6">
        <div className="flex w-full shrink-0 flex-col gap-3 overflow-hidden md:w-80">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads..."
              className="ps-9"
            />
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            <ThreadList isLoading={isLoading} threads={threads} search={search} />
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
