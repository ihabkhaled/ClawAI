'use client';

import { MessageSquare, Plus, Search } from 'lucide-react';

import { GroupedThreadList } from '@/components/chat/grouped-thread-list';
import { SuggestedPrompts } from '@/components/chat/suggested-prompts';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SUGGESTED_PROMPTS } from '@/constants';
import { FLOATING_ACTION_RAIL_SLOT_ONE } from '@/constants/floating-action.constants';
import { ChatThreadListTab } from '@/enums';
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
    activeTab,
    setActiveTab,
    handleNewChat,
    handleSuggestedPrompt,
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
          <Button onClick={handleNewChat} disabled={isCreating} className="hidden md:inline-flex">
            <Plus className="me-2 h-4 w-4" />
            {t('chat.newThread')}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden md:flex-row md:gap-6">
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden md:w-80 md:flex-none">
          <div className="relative">
            <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('chat.searchThreads')}
              className="ps-9"
            />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ChatThreadListTab)}
          >
            <TabsList className="w-full">
              <TabsTrigger value={ChatThreadListTab.ALL} className="flex-1">
                {t('chat.tabs.all')}
              </TabsTrigger>
              <TabsTrigger value={ChatThreadListTab.PINNED} className="flex-1">
                {t('chat.tabs.pinned')}
              </TabsTrigger>
              <TabsTrigger value={ChatThreadListTab.ARCHIVED} className="flex-1">
                {t('chat.tabs.archived')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="min-h-0 flex-1 overflow-hidden">
            <GroupedThreadList
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
            title={t('chat.selectOrStartTitle')}
            description={t('chat.selectOrStartDesc')}
            action={
              <div className="flex w-full max-w-md flex-col items-stretch gap-4">
                <Button onClick={handleNewChat} disabled={isCreating}>
                  <Plus className="me-2 h-4 w-4" />
                  {t('chat.newThread')}
                </Button>
                <SuggestedPrompts
                  prompts={SUGGESTED_PROMPTS}
                  onSelect={handleSuggestedPrompt}
                  disabled={isCreating}
                />
              </div>
            }
          />
        </div>
      </div>

      {/*
        Mobile FAB. The desktop sidebar hosts the prominent "New Chat" button
        in the header; below the md breakpoint that button is hidden and this
        floating action button replaces it so a thumb-only user can always
        start a new thread without scrolling back to the header.
      */}
      <Button
        size="icon"
        onClick={handleNewChat}
        disabled={isCreating}
        aria-label={t('chat.newChatFab')}
        className={`${FLOATING_ACTION_RAIL_SLOT_ONE} z-30 h-14 w-14 rounded-full shadow-lg md:hidden`}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
