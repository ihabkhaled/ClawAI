'use client';

import { ExternalLink, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvidenceViewerProps } from '@/types';

export function EvidenceViewer({ bundle, t }: EvidenceViewerProps): React.ReactElement | null {
  if (bundle === null) {
    return null;
  }
  return (
    <Card className="max-w-full min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Search className="text-primary mt-1 size-4" />
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">{t('research.evidence.title')}</CardTitle>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="text-[10px]">
              {bundle.workflow}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {bundle.mode}
            </Badge>
            {bundle.requestedModel !== null ? (
              <span>
                {t('research.evidence.requestedModel')}: {bundle.requestedModel}
              </span>
            ) : null}
            <span>
              {t('research.evidence.toolsUsed')}: {bundle.toolsUsed.join(', ') || '—'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {bundle.items.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t('research.evidence.empty')}</p>
        ) : (
          <ol className="flex flex-col gap-2 text-sm">
            {bundle.items.map((item, index) => (
              <li
                key={item.id}
                className="flex max-w-full min-w-0 flex-col gap-1 rounded border p-2"
              >
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono text-xs">[{index + 1}]</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex max-w-full min-w-0 items-start gap-1 text-xs break-all hover:underline"
                  >
                    {item.url}
                    <ExternalLink className="mt-0.5 size-3 shrink-0" />
                  </a>
                </div>
                <div className="text-sm font-medium break-words">
                  {item.title ?? t('research.evidence.noTitle')}
                </div>
                <div className="text-muted-foreground text-xs break-words">{item.snippet}</div>
                <div className="text-muted-foreground flex flex-wrap gap-2 text-[10px]">
                  <span>{item.source}</span>
                  {item.providerKind !== null ? <span>• {item.providerKind}</span> : null}
                  <span>
                    • {t('research.evidence.confidence')}: {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
        {bundle.warnings.length > 0 ? (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            <div className="mb-1 font-medium">{t('research.evidence.warnings')}</div>
            <ul className="list-inside list-disc space-y-1">
              {bundle.warnings.map((w, i) => (
                <li key={`${w}-${i.toString()}`}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
