'use client';

import { ChevronDown, ChevronUp, ExternalLink, Globe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useResearchTranscriptPanel } from '@/hooks/chat/use-research-transcript-panel';
import { useTranslation } from '@/lib/i18n';
import type { ResearchTranscriptPanelProps } from '@/types';

export function ResearchTranscriptPanel({
  transcript,
}: ResearchTranscriptPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { open, toggle } = useResearchTranscriptPanel();

  if (transcript.sources.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 self-start px-2 text-xs text-muted-foreground"
        onClick={toggle}
        aria-expanded={open}
      >
        <Globe className="me-1 h-3.5 w-3.5" />
        {t('research.transcript.title', { count: String(transcript.sources.length) })}
        {open ? (
          <ChevronUp className="ms-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ms-1 h-3 w-3" />
        )}
      </Button>
      {open ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card/50 px-3 py-2 text-xs">
          {transcript.sources.map((source, index) => (
            <div
              key={`${source.url}-${String(index)}`}
              className="flex flex-col gap-1 rounded border border-border/50 px-2 py-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {source.title.length > 0 ? source.title : source.url}
                </span>
                {typeof source.score === 'number' ? (
                  <Badge variant="outline" className="text-[10px]">
                    {(source.score * 100).toFixed(0)}%
                  </Badge>
                ) : null}
                {typeof source.latencyMs === 'number' ? (
                  <span className="text-[10px] text-muted-foreground">
                    {String(source.latencyMs)}ms
                  </span>
                ) : null}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {source.url}
                </a>
              </div>
              {source.snippet.length > 0 ? (
                <p className="text-[11px] text-muted-foreground">{source.snippet}</p>
              ) : null}
              {source.extracted !== undefined && source.extracted.length > 0 ? (
                <details className="text-[11px] text-muted-foreground">
                  <summary className="cursor-pointer">{t('research.transcript.expand')}</summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px]">
                    {source.extracted}
                  </pre>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
