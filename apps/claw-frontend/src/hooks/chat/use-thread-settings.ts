import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/lib/i18n/use-translation';
import type { ChatThread, ModelSelection } from '@/types';
import { showToast } from '@/utilities';

import { useUpdateThread } from './use-update-thread';

export function useThreadSettings(thread: ChatThread | null) {
  const { t } = useTranslation();
  const { updateThread, isPending } = useUpdateThread();
  const [isOpen, setIsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(null);

  useEffect(() => {
    if (thread) {
      setSystemPrompt(thread.systemPrompt ?? '');
      setTemperature(thread.temperature ?? 0.7);
      setMaxTokens(thread.maxTokens != null ? String(thread.maxTokens) : '');
      setSelectedModel(thread.preferredProvider && thread.preferredModel ? { provider: thread.preferredProvider, model: thread.preferredModel, displayName: thread.preferredModel } : null);
    }
  }, [thread]);

  const toggleOpen = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSave = useCallback((): void => {
    if (!thread) {
      return;
    }

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
        },
      },
      {
        onSuccess: () => {
          showToast.success({ title: t('chat.settingsSaved') });
        },
      },
    );
  }, [thread, systemPrompt, temperature, maxTokens, selectedModel, updateThread, t]);

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
    handleSave,
    isPending,
  };
}
