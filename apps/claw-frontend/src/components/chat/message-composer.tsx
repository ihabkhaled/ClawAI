import { Send } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ModelSelector } from '@/components/chat/model-selector';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendMessageSchema } from '@/lib/validation/message.schema';
import type { MessageComposerProps, ModelSelection } from '@/types';

export function MessageComposer({ onSend, isPending, threadModel }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modelOverride, setModelOverride] = useState<ModelSelection | null>(null);

  const activeModel = modelOverride ?? threadModel ?? null;

  const validateAndSend = useCallback((): boolean => {
    const result = sendMessageSchema.safeParse({ content: content.trim() });
    if (!result.success) {
      setValidationError(result.error.errors[0]?.message ?? 'Invalid message');
      return false;
    }
    setValidationError(null);
    onSend(result.data.content, activeModel ?? undefined);
    setContent('');
    return true;
  }, [content, onSend, activeModel]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isPending) {
        return;
      }
      validateAndSend();
    },
    [isPending, validateAndSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      if (validationError) {
        setValidationError(null);
      }
    },
    [validationError],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="mb-1 flex items-center gap-2">
        <ModelSelector value={activeModel} onChange={setModelOverride} disabled={isPending} />
      </div>
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          className="min-h-[44px] resize-none"
          rows={1}
          disabled={isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="min-h-11 min-w-11 shrink-0"
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
