import { useMemo, useState } from 'react';

import type { ChatMessage, JudgeReview } from '@/types';
import { getJudgeReviewFromMessage } from '@/utilities';

export function useJudgeReview(message: ChatMessage): {
  isOpen: boolean;
  judgeReview: JudgeReview | null;
  hasJudgeReview: boolean;
  openJudgeReview: () => void;
  closeJudgeReview: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);

  const judgeReview = useMemo(() => getJudgeReviewFromMessage(message), [message]);
  const hasJudgeReview = judgeReview?.judgeDialogAvailable === true;

  const openJudgeReview = (): void => {
    setIsOpen(true);
  };

  const closeJudgeReview = (): void => {
    setIsOpen(false);
  };

  return {
    isOpen,
    judgeReview,
    hasJudgeReview,
    openJudgeReview,
    closeJudgeReview,
  };
}
