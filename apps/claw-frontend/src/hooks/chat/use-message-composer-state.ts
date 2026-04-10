import { useCallback, useState } from 'react';

import { sendMessageSchema } from '@/lib/validation/message.schema';
import type {
  ModelSelection,
  UseMessageComposerStateParams,
  UseMessageComposerStateReturn,
} from '@/types';
import { logger } from '@/utilities';

export const useMessageComposerState = ({
  onSend,
  isPending,
  threadModel,
}: UseMessageComposerStateParams): UseMessageComposerStateReturn => {
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modelOverride, setModelOverride] = useState<ModelSelection | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const activeModel = modelOverride ?? threadModel ?? null;

  const validateAndSend = useCallback((): boolean => {
    const result = sendMessageSchema.safeParse({ content: content.trim() });
    if (!result.success) {
      logger.warn({ component: 'chat', action: 'validation-error', message: 'Message validation failed', details: { error: result.error.errors[0]?.message } });
      setValidationError(result.error.errors[0]?.message ?? 'Invalid message');
      return false;
    }
    setValidationError(null);
    logger.debug({ component: 'chat', action: 'compose-submit', message: 'Submitting composed message', details: { contentLength: result.data.content.length, hasModelOverride: !!activeModel, fileCount: selectedFileIds.length } });
    onSend(
      result.data.content,
      activeModel ?? undefined,
      selectedFileIds.length > 0 ? selectedFileIds : undefined,
    );
    setContent('');
    setSelectedFileIds([]);
    return true;
  }, [content, onSend, activeModel, selectedFileIds]);

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
    modelOverride,
    setModelOverride,
    selectedFileIds,
    setSelectedFileIds,
    handleSubmit,
    handleKeyDown,
    handleChange,
    activeModel,
  };
};
