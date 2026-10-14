import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { queryKeys } from '@/repositories/shared/query-keys';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type {
  ThreadCommentComposerController,
  ThreadCommentsData,
} from '@/types/thread-community.types';
import { insertComment } from '@/utilities/thread-comment-tree.utility';

/** The inline reply box: its text, its empty-check and the post that adds the reply in place. */
export function useThreadCommentComposer(
  slug: string,
  parentId: string,
  initialText: string,
  onDone: () => void,
): ThreadCommentComposerController {
  const queryClient = useQueryClient();
  const [text, setTextState] = useState(initialText);
  const [isEmpty, setIsEmpty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    // The box opens to be typed in: focus it with the caret after the `@name ` address.
    const box = textareaRef.current;
    if (box) {
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }
  }, []);
  const mutation = useMutation({
    mutationFn: (content: string) =>
      threadPublicationsRepository.addPublicComment(slug, { content, parentId }),
    onSuccess: async (created) => {
      const key = queryKeys.threadPublications.comments(slug);
      queryClient.setQueryData<ThreadCommentsData>(key, (current) =>
        current ? insertComment(current, created) : current,
      );
      // Stale for the next visit, but not refetched now: that would fold the open replies away.
      await queryClient.invalidateQueries({ queryKey: key, refetchType: 'none' });
      onDone();
    },
  });

  return {
    text,
    textareaRef,
    isEmpty,
    isPending: mutation.isPending,
    isFailed: mutation.isError,
    setText: (value: string): void => {
      setIsEmpty(false);
      setTextState(value);
    },
    submit: (): void => {
      const content = text.trim();
      if (content.length === 0 || content === initialText.trim()) {
        setIsEmpty(true);
        textareaRef.current?.focus();
        return;
      }
      mutation.mutate(content);
    },
  };
}
