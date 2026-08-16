'use client';

import { ShieldCheck } from 'lucide-react';

import { OrchestrationLabInfo } from '@/components/chat/orchestration/orchestration-lab-info';
import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { VerifyResultCard } from '@/components/chat/verify-result-card';
import { EmptyState } from '@/components/common/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VERIFIER_MAX_REVISIONS_OPTIONS } from '@/constants';
import { useVerifyPage } from '@/hooks/chat/use-verify-page';

export default function VerifyPage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    maxRevisions,
    setMaxRevisions,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSubmit,
    isRunning,
    isError,
    isVerifyError,
    isVerifyReady,
    verifyResult,
    handleViewInThread,
    stages,
    hasProgress,
  } = useVerifyPage();

  const submitLabel = isRunning ? t('verify.running') : t('verify.sendPrompt');
  const hasAnyError = isError || isVerifyError;
  const errorMessage = hasAnyError ? t('verify.sendFailed') : null;
  const showResult = isVerifyReady && verifyResult !== null && !isRunning;

  const maxRevisionsField = (
    <div className="space-y-2">
      <label className="text-foreground block text-sm font-medium" htmlFor="verify-max-revisions">
        {t('verify.maxRevisionsLabel')}
      </label>
      <Select
        value={String(maxRevisions)}
        onValueChange={(value) => setMaxRevisions(Number(value))}
        disabled={isRunning}
      >
        <SelectTrigger id="verify-max-revisions" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VERIFIER_MAX_REVISIONS_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">{t('verify.maxRevisionsHelper')}</p>
    </div>
  );

  const resultSlot = showResult ? (
    <VerifyResultCard result={verifyResult} onViewInThread={handleViewInThread} t={t} />
  ) : null;

  const emptySlot = (
    <>
      <EmptyState
        icon={ShieldCheck}
        title={t('verify.noResults')}
        description={t('verify.description')}
      />
      <OrchestrationLabInfo
        goal={t('verify.goal')}
        benefits={[t('verify.benefit1'), t('verify.benefit2'), t('verify.benefit3')]}
        t={t}
      />
    </>
  );

  return (
    <OrchestrationPageShell
      headerIcon={ShieldCheck}
      headerTitle={t('nav.verifierLab')}
      headerDescription={t('verify.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={content}
      onPromptChange={setContent}
      promptLabel={t('verify.contentLabel')}
      promptPlaceholder={t('verify.contentPlaceholder')}
      extraFieldsSlot={maxRevisionsField}
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
