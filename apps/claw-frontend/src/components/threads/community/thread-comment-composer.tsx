import { Send } from 'lucide-react';
import type { FormEvent, ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { THREAD_COMMENT_MAX_LENGTH } from '@/constants/thread-community.constants';
import { useThreadCommentComposer } from '@/hooks/threads/use-thread-comment-composer';
import { useTranslation } from '@/lib/i18n';
import type { ThreadCommentComposerProps } from '@/types/thread-community.types';
import { submitOnShortcut } from '@/utilities/submit-shortcut.utility';

/** The inline reply box under a comment, opened with `@username ` already in it. */
export function ThreadCommentComposer({
  slug,
  parentId,
  replyingTo,
  initialText,
  onDone,
}: ThreadCommentComposerProps): ReactElement {
  const { t } = useTranslation();
  const composer = useThreadCommentComposer(slug, parentId, initialText, onDone);
  const fieldId = `thread-reply-${parentId}`;
  const name = replyingTo?.displayName || replyingTo?.username || t('chat.threadCommunityMember');

  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      data-testid="thread-reply-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        composer.submit();
      }}
    >
      <label htmlFor={fieldId} className="text-muted-foreground text-xs font-medium">
        {t('chat.threadCommunityReplyLabel', { name })}
      </label>
      <Textarea
        id={fieldId}
        ref={composer.textareaRef}
        dir="auto"
        maxLength={THREAD_COMMENT_MAX_LENGTH}
        value={composer.text}
        aria-invalid={composer.isEmpty}
        aria-describedby={composer.isEmpty || composer.isFailed ? `${fieldId}-error` : undefined}
        disabled={composer.isPending}
        onChange={(event) => composer.setText(event.target.value)}
        onKeyDown={(event) => submitOnShortcut(event, composer.submit)}
      />
      {composer.isEmpty || composer.isFailed ? (
        <p id={`${fieldId}-error`} role="alert" className="text-destructive text-sm">
          {composer.isEmpty
            ? t('chat.threadPublicCommentRequired')
            : t('chat.threadCommunityReplyFailed')}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={composer.isPending}
          isLoading={composer.isPending}
        >
          <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t('chat.threadCommunityPostReply')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onDone}
          disabled={composer.isPending}
        >
          {t('chat.threadCommunityCancel')}
        </Button>
      </div>
    </form>
  );
}
