'use client';

import { ChevronDown, ChevronUp, Globe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOllamaToolTranscriptPanel } from '@/hooks/chat/use-ollama-tool-transcript-panel';
import { useTranslation } from '@/lib/i18n';
import type { OllamaToolTranscriptPanelProps } from '@/types';

export function OllamaToolTranscriptPanel({
  transcript,
}: OllamaToolTranscriptPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { open, toggle } = useOllamaToolTranscriptPanel();

  if (transcript.turns.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 self-start px-2 text-xs text-muted-foreground"
        onClick={toggle}
      >
        <Globe className="me-1 h-3.5 w-3.5" />
        {t('chat.toolTranscript.summary', { count: String(transcript.turns.length) })}
        {open ? (
          <ChevronUp className="ms-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ms-1 h-3 w-3" />
        )}
      </Button>
      {open ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-xs">
          {transcript.capReached ? (
            <Badge variant="outline" className="self-start border-amber-500/50 text-amber-600">
              {t('chat.toolTranscript.capReached')}
            </Badge>
          ) : null}
          {transcript.turns.map((turn) => (
            <div
              key={`${String(turn.turn)}-${turn.tool}-${String(turn.durationMs)}`}
              className="flex flex-col gap-1 rounded border border-border/50 px-2 py-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {t('chat.toolTranscript.turnLabel', { turn: String(turn.turn) })}
                </Badge>
                <span className="font-mono text-[11px] text-foreground">{turn.tool}</span>
                <span className="text-[10px] text-muted-foreground">
                  {String(turn.durationMs)}ms
                </span>
                {turn.ok ? null : (
                  <Badge variant="outline" className="border-red-500/50 text-[10px] text-red-600">
                    {t('chat.toolTranscript.error')}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium">{t('chat.toolTranscript.argsLabel')}: </span>
                <span className="font-mono break-all">{JSON.stringify(turn.args)}</span>
              </div>
              {turn.resultPreview.length > 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-medium">{t('chat.toolTranscript.previewLabel')}: </span>
                  <span className="font-mono break-all">{turn.resultPreview}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
