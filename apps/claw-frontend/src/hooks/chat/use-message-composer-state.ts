import { useCallback, useState } from 'react';

import { DEFAULT_RESEARCH_OPTIONS } from '@/constants/research.constants';
import { ResearchMode } from '@/enums/research-mode.enum';
import { sendMessageSchema } from '@/lib/validation/message.schema';
import type {
  ResearchOptions,
  UseMessageComposerStateParams,
  UseMessageComposerStateReturn,
} from '@/types';
import { logger } from '@/utilities';

export const useMessageComposerState = ({
  onSend,
  isPending,
  selectedModel,
}: UseMessageComposerStateParams): UseMessageComposerStateReturn => {
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [research, setResearch] = useState<ResearchOptions>(DEFAULT_RESEARCH_OPTIONS);

  const validateAndSend = useCallback((): boolean => {
    const result = sendMessageSchema.safeParse({ content: content.trim() });
    if (!result.success) {
      logger.warn({
        component: 'chat',
        action: 'validation-error',
        message: 'Message validation failed',
        details: { error: result.error.errors[0]?.message },
      });
      setValidationError(result.error.errors[0]?.message ?? 'Invalid message');
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
      research.mode === ResearchMode.OFF ? undefined : research,
    );
    setContent('');
    setSelectedFileIds([]);
    return true;
  }, [content, onSend, selectedModel, selectedFileIds, research]);

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
    handleSubmit,
    handleKeyDown,
    handleChange,
  };
};
