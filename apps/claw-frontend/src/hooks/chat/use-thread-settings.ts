import { useCallback, useEffect, useState } from 'react';

import { useJudgeModelOptions } from '@/hooks/chat/use-judge-model-options';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { ChatThread, ModelSelection } from '@/types';
import { logger, showToast } from '@/utilities';

import { useUpdateThread } from './use-update-thread';

export function useThreadSettings(thread: ChatThread | null) {
  const { t } = useTranslation();
  const { updateThread, isPending } = useUpdateThread();
  const { options: judgeModelOptions } = useJudgeModelOptions();
  const [isOpen, setIsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(null);
  const [contextPackIds, setContextPackIds] = useState<string[]>([]);
  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judgeModel, setJudgeModel] = useState<string | null>(null);
  const [qualityThreshold, setQualityThreshold] = useState(0.4);
  const [maxReRouteAttempts, setMaxReRouteAttempts] = useState(2);

  useEffect(() => {
    if (thread) {
      setSystemPrompt(thread.systemPrompt ?? '');
      setTemperature(thread.temperature ?? 0.7);
      setMaxTokens(
        thread.maxTokens !== null && thread.maxTokens !== undefined ? String(thread.maxTokens) : '',
      );
      setSelectedModel(
        thread.preferredProvider && thread.preferredModel
          ? {
              provider: thread.preferredProvider,
              model: thread.preferredModel,
              displayName: thread.preferredModel,
            }
          : null,
      );
      setContextPackIds(thread.contextPackIds ?? []);
      setJudgeEnabled(thread.judgeEnabled ?? false);
      setJudgeModel(thread.judgeModel ?? null);
      setQualityThreshold(thread.qualityThreshold ?? 0.4);
      setMaxReRouteAttempts(thread.maxReRouteAttempts ?? 2);
    }
  }, [thread]);

  const toggleOpen = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSave = useCallback((): void => {
    if (!thread) {
      return;
    }
    logger.info({
      component: 'chat',
      action: 'save-thread-settings',
      message: 'Saving thread settings',
      details: { threadId: thread.id, temperature, maxTokens, provider: selectedModel?.provider },
    });

    const parsedMaxTokens = maxTokens !== '' ? Number(maxTokens) : null;

    updateThread(
      {
        id: thread.id,
        data: {
          systemPrompt: systemPrompt || null,
          temperature,
          maxTokens: parsedMaxTokens,
          preferredProvider: selectedModel?.provider ?? null,
          preferredModel: selectedModel?.model ?? null,
          contextPackIds,
          judgeEnabled,
          judgeModel,
          qualityThreshold,
          maxReRouteAttempts,
        },
      },
      {
        onSuccess: () => {
          showToast.success({ title: t('chat.settingsSaved') });
          setIsOpen(false);
        },
      },
    );
  }, [
    thread,
    systemPrompt,
    temperature,
    maxTokens,
    selectedModel,
    contextPackIds,
    judgeEnabled,
    judgeModel,
    qualityThreshold,
    maxReRouteAttempts,
    updateThread,
    t,
  ]);

  return {
    isOpen,
    toggleOpen,
    systemPrompt,
    setSystemPrompt,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    selectedModel,
    setSelectedModel,
    contextPackIds,
    setContextPackIds,
    judgeEnabled,
    setJudgeEnabled,
    judgeModel,
    setJudgeModel,
    judgeModelOptions,
    qualityThreshold,
    setQualityThreshold,
    maxReRouteAttempts,
    setMaxReRouteAttempts,
    handleSave,
    isPending,
  };
}
