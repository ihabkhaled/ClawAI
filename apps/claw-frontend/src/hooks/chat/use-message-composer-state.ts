import { useCallback, useEffect, useState } from 'react';

import { COMPOSER_SEED_STORAGE_KEY } from '@/constants/chat.constants';
import { DEFAULT_RESEARCH_OPTIONS } from '@/constants/research.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import { useComposerAttachments } from '@/hooks/files/use-composer-attachments';
import { useResearchProviders } from '@/hooks/research/use-research-providers';
import { sendMessageSchema } from '@/lib/validation/message.schema';
import type {
  ResearchOptions,
  UseMessageComposerStateParams,
  UseMessageComposerStateReturn,
} from '@/types';
import { logger } from '@/utilities';
import {
  clearComposerDraft,
  readComposerDraft,
  writeComposerDraft,
} from '@/utilities/composer-draft.utility';

export const useMessageComposerState = ({
  onSend,
  isPending,
  selectedModel,
  threadId,
}: UseMessageComposerStateParams): UseMessageComposerStateReturn => {
  // Seeded from the saved draft rather than restored in an effect: an effect
  // would render an empty composer first and then fill it, which reads as the
  // page overwriting what you typed.
  const [content, setContent] = useState(() => readComposerDraft(threadId));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [research, setResearch] = useState<ResearchOptions>(DEFAULT_RESEARCH_OPTIONS);
  const providerQuery = useResearchProviders();
  const { ingestFiles, isUploading: isUploadingAttachment } = useComposerAttachments({
    selectedFileIds,
    onChange: setSelectedFileIds,
    disabled: isPending,
  });

  // Hydrate the composer from a one-shot seed written by the /chat
  // suggested-prompt buttons. Read on mount, then immediately clear the key
  // so navigating away and back doesn't re-seed. Skip if the user already
  // typed (content !== '') — happens when the effect races with hot reload.
  useEffect(() => {
    try {
      const seed = window.localStorage.getItem(COMPOSER_SEED_STORAGE_KEY);
      if (seed !== null && seed.trim().length > 0) {
        window.localStorage.removeItem(COMPOSER_SEED_STORAGE_KEY);
        setContent((prev) => (prev.length > 0 ? prev : seed));
        logger.info({
          component: 'chat',
          action: 'composer-seed-consumed',
          message: 'Pre-filled composer from suggested-prompt seed',
          details: { length: seed.length },
        });
      }
    } catch (error) {
      logger.warn({
        component: 'chat',
        action: 'composer-seed-read',
        message: 'localStorage read failed; suggested prompt seed not applied',
        details: { error: (error as Error).message },
      });
    }
  }, []);

  // Persist on every keystroke. localStorage writes are synchronous but cheap
  // at this size, and debouncing would lose the last few characters on the exact
  // event this exists for — a crash or a tab close mid-sentence.
  useEffect(() => {
    writeComposerDraft(threadId, content);
  }, [content, threadId]);

  const validateAndSend = useCallback((): boolean => {
    const result = sendMessageSchema.safeParse({ content: content.trim() });
    if (!result.success) {
      logger.warn({
        component: 'chat',
        action: 'validation-error',
        message: 'Message validation failed',
        details: { error: result.error.issues[0]?.message },
      });
      setValidationError(result.error.issues[0]?.message ?? 'Invalid message');
      return false;
    }
    setValidationError(null);
    logger.debug({
      component: 'chat',
      action: 'compose-submit',
      message: 'Submitting composed message',
      details: {
        contentLength: result.data.content.length,
        hasModelOverride: selectedModel !== null,
        fileCount: selectedFileIds.length,
        researchMode: research.mode,
      },
    });
    onSend(
      result.data.content,
      selectedModel ?? undefined,
      selectedFileIds.length > 0 ? selectedFileIds : undefined,
      research.mode === ResearchMode.NONE ? undefined : research,
    );
    setContent('');
    // Cleared explicitly rather than left to the effect: the message has been
    // sent, so a draft of it is no longer a draft.
    clearComposerDraft(threadId);
    setSelectedFileIds([]);
    return true;
  }, [content, onSend, selectedModel, selectedFileIds, research, threadId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      if (isPending) {
        return;
      }
      validateAndSend();
    },
    [isPending, validateAndSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isPending) {
          return;
        }
        validateAndSend();
      }
    },
    [isPending, validateAndSend],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setContent(e.target.value);
      if (validationError) {
        setValidationError(null);
      }
    },
    [validationError],
  );

  return {
    content,
    setContent,
    validationError,
    selectedFileIds,
    setSelectedFileIds,
    research,
    setResearch,
    researchProviders: providerQuery.providers,
    isResearchProvidersLoading: providerQuery.isLoading,
    handleSubmit,
    handleKeyDown,
    handleChange,
    ingestFiles,
    isUploadingAttachment,
  };
};
