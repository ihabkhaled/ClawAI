import { Send } from 'lucide-react';

import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { ModelSelector } from '@/components/chat/model-selector';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMessageComposerState } from '@/hooks/chat/use-message-composer-state';
import type { MessageComposerProps } from '@/types';

export function MessageComposer({ onSend, isPending, threadModel }: MessageComposerProps) {
  const {
    content,
    validationError,
    activeModel,
    selectedFileIds,
    setSelectedFileIds,
    setModelOverride,
    handleSubmit,
    handleKeyDown,
    handleChange,
  } = useMessageComposerState({ onSend, isPending, threadModel });

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-1">
      <div className="mb-1 flex shrink-0 items-center gap-2">
        <ModelSelector value={activeModel} onChange={setModelOverride} disabled={isPending} />
        <FileAttachmentPicker
          selectedFileIds={selectedFileIds}
          onChange={setSelectedFileIds}
          disabled={isPending}
        />
      </div>
      <div className="flex min-h-0 flex-1 gap-2">
        <Textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          className="h-full min-h-0 flex-1 resize-none"
          disabled={isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="min-h-11 min-w-11 shrink-0 self-end"
          disabled={isPending || !content.trim()}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      {validationError ? <p className="mt-1 text-sm text-destructive">{validationError}</p> : null}
    </form>
  );
}
