'use client';

import { Expand, Trophy, XCircle, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ParallelModelStatus } from '@/enums';
import { useParallelMessageGroup } from '@/hooks/chat/use-parallel-message-group';
import { MarkdownRenderer } from '@/lib/markdown';
import type { ParallelMessageGroupProps } from '@/types';
import { formatLatency, getParallelColClass } from '@/utilities';

export function ParallelMessageGroup({
  messages,
  t,
}: ParallelMessageGroupProps): React.ReactElement {
  const { expanded, fastestId, bestId, openExpanded, closeExpanded } =
    useParallelMessageGroup(messages);

  const colClass = getParallelColClass(messages.length);
  const bestDiffersFromFastest = bestId !== null && bestId !== fastestId;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t('compare.title')}</span>
        <Badge variant="secondary" className="text-xs">
          {t('compare.modelCount', { count: messages.length })}
        </Badge>
      </div>

      <div className={`grid gap-3 ${colClass}`}>
        {messages.map((msg) => {
          const meta = msg.metadata as Record<string, unknown> | null;
          const status = meta?.['status'] as string | undefined;
          const isFailed = status === ParallelModelStatus.FAILED;
          const isFastest = msg.id === fastestId;
          const isBest = bestDiffersFromFastest && msg.id === bestId;
          const providerModel = [msg.provider, msg.model].filter(Boolean).join(' / ');
          const preview = msg.content.slice(0, 180);
          const hasMore = msg.content.length > 180;

          return (
            <div
              key={msg.id}
              className={`relative flex flex-col gap-2 rounded-lg border p-3 text-sm ${
                isFailed ? 'border-destructive/30 bg-destructive/5' : 'bg-muted'
              } ${isFastest ? 'border-green-500/40' : ''} ${isBest ? 'border-amber-500/40' : ''}`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 truncate">
                  {isFastest ? <Zap className="h-3 w-3 shrink-0 text-green-500" /> : null}
                  {isBest ? <Trophy className="h-3 w-3 shrink-0 text-amber-500" /> : null}
                  {isFailed ? <XCircle className="h-3 w-3 shrink-0 text-destructive" /> : null}
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {providerModel}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isFastest ? (
                    <Badge
                      variant="outline"
                      className="h-4 border-green-500/30 px-1 text-[10px] text-green-500"
                    >
                      {t('compare.fastest')}
                    </Badge>
                  ) : null}
                  {isBest ? (
                    <Badge
                      variant="outline"
                      className="h-4 border-amber-500/30 px-1 text-[10px] text-amber-500"
                    >
                      {t('compare.bestResponse')}
                    </Badge>
                  ) : null}
                  {msg.latencyMs !== null ? (
                    <span className="text-xs text-muted-foreground">
                      {formatLatency(msg.latencyMs)}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="line-clamp-4 text-sm text-foreground">
                {preview}
                {hasMore ? '…' : ''}
              </p>

              {hasMore ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 self-end px-2 text-xs"
                  onClick={() => openExpanded(msg, isFastest)}
                >
                  <Expand className="me-1 h-3 w-3" />
                  {t('compare.expand')}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      {expanded ? (
        <Dialog open onOpenChange={closeExpanded}>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {expanded.isFastest ? <Zap className="h-4 w-4 text-green-500" /> : null}
                {expanded.message.id === bestId && bestDiffersFromFastest ? (
                  <Trophy className="h-4 w-4 text-amber-500" />
                ) : null}
                {[expanded.message.provider, expanded.message.model].filter(Boolean).join(' / ')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {expanded.message.latencyMs !== null ? (
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>
                    {t('compare.latency')}: {formatLatency(expanded.message.latencyMs)}
                  </span>
                  {(expanded.message.inputTokens ?? 0) + (expanded.message.outputTokens ?? 0) >
                  0 ? (
                    <span>
                      {t('compare.tokens')}:{' '}
                      {(expanded.message.inputTokens ?? 0) + (expanded.message.outputTokens ?? 0)}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <MarkdownRenderer content={expanded.message.content} />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
