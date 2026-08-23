// Rendered inside the chat thread list empty state — a horizontal grid of
// "start with this prompt" buttons. Clicking a button calls the parent
// handler with the underlying SuggestedPrompt, which then creates a thread
// and pre-fills the composer. We deliberately keep this purely presentational
// — all wiring lives in `use-chat-page.ts`.
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SuggestedPromptsProps } from '@/types';

export function SuggestedPrompts({
  prompts,
  onSelect,
  disabled,
}: SuggestedPromptsProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {t('chat.suggestedPrompts.heading')}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt.id}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className={cn(
              'h-auto justify-start px-3 py-2 text-start text-sm font-normal whitespace-normal',
              'hover:bg-accent/60',
            )}
          >
            {t(prompt.label)}
          </Button>
        ))}
      </div>
    </div>
  );
}
