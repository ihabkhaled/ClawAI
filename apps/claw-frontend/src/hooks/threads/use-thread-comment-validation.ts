import { useRef, useState } from 'react';

import type { ThreadCommentValidation } from '@/types/thread-publication.types';

export function useThreadCommentValidation(
  comment: string,
  submitComment: () => void,
  setComment: (value: string) => void,
): ThreadCommentValidation {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  return {
    textareaRef,
    isEmpty,
    handleSubmit: () => {
      if (comment.trim().length === 0) {
        setIsEmpty(true);
        textareaRef.current?.focus();
        return;
      }
      setIsEmpty(false);
      submitComment();
    },
    handleChange: (value) => {
      setIsEmpty(false);
      setComment(value);
    },
  };
}
