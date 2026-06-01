'use client';

import { Users } from 'lucide-react';

import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { RolePackResultCard } from '@/components/chat/role-pack-result-card';
import { EmptyState } from '@/components/common/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_PACK_OPTIONS } from '@/constants';
import type { RolePackName } from '@/enums/role-pack.enum';
import { useRolePackPage } from '@/hooks/chat/use-role-pack-page';

export default function RolePackPage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    pack,
    setPack,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSubmit,
    isPending,
    isPolling,
    isRolePackReady,
    rolePackResult,
    handleViewInThread,
    stages,
    errorMessage,
  } = useRolePackPage();

  const isRunning = isPending || isPolling;
  const submitLabel = isRunning ? t('rolePack.running') : t('rolePack.sendPrompt');
  const showResult = isRolePackReady && rolePackResult !== null && !isRunning;
  const hasProgress = stages.length > 0;

  const packSelector = (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground" htmlFor="role-pack-select">
        {t('rolePack.packLabel')}
      </label>
      <Select
        value={pack}
        onValueChange={(value) => setPack(value as RolePackName)}
        disabled={isRunning}
      >
        <SelectTrigger id="role-pack-select" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_PACK_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const resultSlot = showResult ? (
    <RolePackResultCard result={rolePackResult} onViewInThread={handleViewInThread} t={t} />
  ) : null;

  const emptySlot = (
    <EmptyState
      icon={Users}
      title={t('rolePack.noResults')}
      description={t('rolePack.description')}
    />
  );

  return (
    <OrchestrationPageShell
      headerIcon={Users}
      headerTitle={t('nav.rolePackLab')}
      headerDescription={t('rolePack.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={content}
      onPromptChange={setContent}
      promptLabel={t('rolePack.contentLabel')}
      promptPlaceholder={t('rolePack.contentPlaceholder')}
      extraFieldsSlot={packSelector}
      onSubmit={handleSend}
      submitLabel={submitLabel}
      isSubmitDisabled={!canSubmit}
      isPending={isRunning}
      hasProgress={hasProgress}
      stages={stages}
      resultSlot={resultSlot}
      emptySlot={emptySlot}
      errorMessage={errorMessage}
      t={t}
    />
  );
}
