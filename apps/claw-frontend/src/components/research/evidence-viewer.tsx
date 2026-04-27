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
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Search className="mt-1 size-4 text-primary" />
        <div className="flex-1">
          <CardTitle className="text-sm">{t('research.evidence.title')}</CardTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
          <p className="text-xs text-muted-foreground">{t('research.evidence.empty')}</p>
        ) : (
          <ol className="flex flex-col gap-2 text-sm">
            {bundle.items.map((item, index) => (
              <li key={item.id} className="flex flex-col gap-1 rounded border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">[{index + 1}]</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {item.url}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="text-sm font-medium">
                  {item.title ?? t('research.evidence.noTitle')}
                </div>
                <div className="text-xs text-muted-foreground">{item.snippet}</div>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
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
