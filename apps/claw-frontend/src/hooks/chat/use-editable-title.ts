'use client';

import { useCallback, useEffect, useState } from 'react';

import { useUpdateThread } from '@/hooks/chat/use-update-thread';
import type { UseEditableTitleReturn } from '@/types';
import { logger } from '@/utilities';

export function useEditableTitle(
  threadId: string,
  currentTitle: string | undefined,
): UseEditableTitleReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const { updateThread, isPending } = useUpdateThread();

  useEffect(() => {
    if (!isEditing) {
      setEditValue(currentTitle ?? '');
    }
  }, [currentTitle, isEditing]);

  const startEditing = useCallback((): void => {
    setEditValue(currentTitle ?? '');
    setIsEditing(true);
  }, [currentTitle]);

  const cancelEditing = useCallback((): void => {
    setIsEditing(false);
    setEditValue(currentTitle ?? '');
  }, [currentTitle]);

  const saveTitle = useCallback((): void => {
    const trimmed = editValue.trim();
    if (trimmed.length === 0 || trimmed === currentTitle) {
      cancelEditing();
      return;
    }
    logger.info({ component: 'chat', action: 'save-title', message: 'Saving thread title', details: { threadId, newTitleLength: trimmed.length } });
    updateThread(
      { id: threadId, data: { title: trimmed } },
      { onSuccess: () => setIsEditing(false) },
    );
  }, [editValue, currentTitle, threadId, updateThread, cancelEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveTitle();
      }
      if (e.key === 'Escape') {
        cancelEditing();
      }
    },
    [saveTitle, cancelEditing],
  );

  return {
    isEditing,
    editValue,
    setEditValue,
    isPending,
    startEditing,
    cancelEditing,
    saveTitle,
    handleKeyDown,
  };
}
