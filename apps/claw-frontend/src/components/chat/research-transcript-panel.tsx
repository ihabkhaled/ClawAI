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
  const {
    open,
    toggle,
    title,
    isMeasured,
    linksFoundLabel,
    searchRequestsLabel,
    fetchRequestsLabel,
  } = useResearchTranscriptPanel(transcript);

  if (transcript.sources.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 self-start px-2 text-xs"
        onClick={toggle}
        aria-expanded={open}
      >
        <Globe className="me-1 h-3.5 w-3.5" />
        {/* What this badge may claim is decided in the hook. It used to read
            "Used N sources" over a mix of links found and pages read. */}
        {title}
        {open ? <ChevronUp className="ms-1 h-3 w-3" /> : <ChevronDown className="ms-1 h-3 w-3" />}
      </Button>
      {/* Hidden entirely on messages written before the counts were measured.
          They were hardcoded zeros, so the panel rendered "0 searches / 0
          fetches" directly under a source count — three numbers, none of them
          measured. A missing badge is honest; a zero is not. */}
      {isMeasured ? (
        <div className="text-muted-foreground touch:text-xs flex flex-wrap gap-1 ps-2 text-[10px]">
          {linksFoundLabel === null ? null : (
            <Badge
              variant="outline"
              className="touch:text-xs border-slate-500/40 bg-slate-500/10 text-[10px]"
            >
              {linksFoundLabel}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="touch:text-xs border-sky-500/40 bg-sky-500/10 text-[10px]"
          >
            {searchRequestsLabel}
          </Badge>
          <Badge
            variant="outline"
            className="touch:text-xs border-violet-500/40 bg-violet-500/10 text-[10px]"
          >
            {fetchRequestsLabel}
          </Badge>
        </div>
      ) : null}
      {open ? (
        <div className="border-border bg-card/50 flex flex-col gap-2 rounded-md border px-3 py-2 text-xs">
          {transcript.sources.map((source, index) => (
            <div
              key={`${source.url}-${String(index)}`}
              className="border-border/50 flex flex-col gap-1 rounded border px-2 py-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground font-medium">
                  {source.title.length > 0 ? source.title : source.url}
                </span>
                {typeof source.score === 'number' ? (
                  <Badge variant="outline" className="touch:text-xs text-[10px]">
                    {(source.score * 100).toFixed(0)}%
                  </Badge>
                ) : null}
                {typeof source.latencyMs === 'number' ? (
                  <span className="text-muted-foreground touch:text-xs text-[10px]">
                    {String(source.latencyMs)}ms
                  </span>
                ) : null}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary touch:text-xs inline-flex items-center gap-1 text-[11px] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {source.url}
                </a>
              </div>
              {source.snippet.length > 0 ? (
                <p className="text-muted-foreground touch:text-xs text-[11px]">{source.snippet}</p>
              ) : null}
              {source.extracted !== undefined && source.extracted.length > 0 ? (
                <details className="text-muted-foreground touch:text-xs text-[11px]">
                  <summary className="cursor-pointer">{t('research.transcript.expand')}</summary>
                  <pre className="touch:text-xs mt-1 font-mono text-[10px] break-words whitespace-pre-wrap">
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
