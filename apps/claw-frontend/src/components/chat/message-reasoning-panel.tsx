'use client';

import { Brain, ChevronDown } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { MessageReasoningPanelProps } from '@/types/component.types';

/**
 * The model's stored chain of thought, collapsed.
 *
 * Collapsed by default because it is context, not the answer — a reasoning
 * model can emit several times more thinking than reply, and expanding it by
 * default would bury what the reader came for.
 *
 * A native `<details>` rather than a controlled disclosure: it needs no state,
 * it works before hydration, and browser find-in-page can reach inside a closed
 * one, which a JavaScript accordion cannot.
 */
export function MessageReasoningPanel({
  reasoning,
}: MessageReasoningPanelProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <details className="border-border/60 bg-muted/30 group mt-2 rounded-lg border">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium transition-colors">
        <Brain className="h-3.5 w-3.5" aria-hidden="true" />
        {t('chat.reasoning.title')}
        <ChevronDown
          className="ms-auto h-3.5 w-3.5 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      {/* `whitespace-pre-wrap` and not the markdown renderer: this is the
          model's raw thinking, and rendering it as markdown would execute its
          formatting accidents as layout. */}
      <p className="text-muted-foreground max-h-96 overflow-y-auto px-3 pb-3 text-xs leading-relaxed whitespace-pre-wrap">
        {reasoning}
      </p>
    </details>
  );
}
