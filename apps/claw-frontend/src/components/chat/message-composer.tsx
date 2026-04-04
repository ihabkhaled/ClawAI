import { Send } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageComposerProps = {
  onSend: (content: string) => void;
  isPending: boolean;
};

export function MessageComposer({ onSend, isPending }: MessageComposerProps) {
  const [content, setContent] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!trimmed || isPending) return;
      onSend(trimmed);
      setContent("");
    },
    [content, isPending, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmed = content.trim();
        if (!trimmed || isPending) return;
        onSend(trimmed);
        setContent("");
      }
    },
    [content, isPending, onSend],
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
        className="min-h-[44px] resize-none"
        rows={1}
        disabled={isPending}
      />
      <Button
        type="submit"
        size="icon"
        className="shrink-0"
        disabled={isPending || !content.trim()}
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
}
