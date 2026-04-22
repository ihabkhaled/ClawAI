import {
  ArrowUpCircle,
  Brain,
  FileText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';

import { FileGenerationBubble } from '@/components/chat/file-generation-bubble';
import { ImageGenerationBubble } from '@/components/chat/image-generation-bubble';
import { JudgeRefereeDetails } from '@/components/chat/judge-referee-details';
import { MessageAttachments } from '@/components/chat/message-attachments';
import { MessageProvenance } from '@/components/chat/message-provenance';
import { RoutingTransparency } from '@/components/chat/routing-transparency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MESSAGE_ROLE_LABELS, RE_ROUTE_REASON_LABELS } from '@/constants';
import { MessageFeedback, MessageRole, RoutingMode } from '@/enums';
import { MarkdownRenderer } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { MessageBubbleProps } from '@/types';
import { formatLatency, formatShortDateTime } from '@/utilities';

export function MessageBubble({
  message,
  routingDecision,
  onFeedback,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === MessageRole.USER;
  const roleLabel = MESSAGE_ROLE_LABELS[message.role];

  const totalTokens = (message.inputTokens ?? 0) + (message.outputTokens ?? 0);
  const metadata = message.metadata as Record<string, unknown> | null;
  const routeRoadmap = metadata?.['routeRoadmap'] as
    | {
        routerModel?: string | null;
        finalProvider?: string | null;
        finalModel?: string | null;
      }
    | undefined;
  const routerModel =
    typeof routeRoadmap?.routerModel === 'string' ? routeRoadmap.routerModel : null;
  const displayedProvider = routeRoadmap?.finalProvider ?? message.provider;
  const displayedModel = routeRoadmap?.finalModel ?? message.model;
  const providerModel = [displayedProvider, displayedModel ?? 'unknown']
    .filter(Boolean)
    .join(' / ');
  const routeSummary =
    message.routingMode === RoutingMode.AUTO && routerModel
      ? `Route: ${routerModel} -> ${displayedModel ?? 'unknown'}`
      : null;
  const memoryCount = typeof metadata?.['memoryCount'] === 'number' ? metadata['memoryCount'] : 0;
  const contextFileIds = Array.isArray(metadata?.['fileIds'])
    ? (metadata['fileIds'] as string[])
    : [];
  const isImageGeneration = metadata?.['type'] === 'image_generation';
  const imageGenerationId =
    typeof metadata?.['generationId'] === 'string' ? metadata['generationId'] : undefined;
  const isFileGeneration = metadata?.['type'] === 'file_generation';
  const fileGenerationId =
    typeof metadata?.['generationId'] === 'string' && isFileGeneration
      ? metadata['generationId']
      : undefined;
  const hasVisibleAssistantContent = message.content.trim().length > 0;
  const assistantContent = hasVisibleAssistantContent ? (
    <MarkdownRenderer content={message.content} />
  ) : (
    <p className="whitespace-pre-wrap text-muted-foreground">
      No visible final answer was produced for this reply. Regenerate to retry.
    </p>
  );
  const isReRouted = metadata?.['reRouted'] === true;
  const originalProvider =
    typeof metadata?.['originalProvider'] === 'string' ? metadata['originalProvider'] : null;
  const originalModel =
    typeof metadata?.['originalModel'] === 'string' ? metadata['originalModel'] : null;
  const originalScore =
    typeof metadata?.['originalScore'] === 'number' ? metadata['originalScore'] : null;
  const reRouteReasons = Array.isArray(metadata?.['reRouteReasons'])
    ? (metadata['reRouteReasons'] as string[])
    : [];
  const judgeDecision =
    typeof metadata?.['judgeDecision'] === 'string' ? metadata['judgeDecision'] : null;

  const handleFeedback = (value: MessageFeedback): void => {
    if (!onFeedback) {
      return;
    }
    const next = message.feedback === value ? null : value;
    onFeedback(message.id, next);
  };

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
          <span className="text-[10px] text-muted-foreground/60">
            {formatShortDateTime(message.createdAt)}
          </span>
        </div>
        <div
          className={cn(
            'rounded-lg px-4 py-2.5 text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {isUser ? (
            <>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {contextFileIds.length > 0 ? <MessageAttachments fileIds={contextFileIds} /> : null}
            </>
          ) : null}
          {!isUser && isImageGeneration && imageGenerationId ? (
            <ImageGenerationBubble
              generationId={imageGenerationId}
              prompt={message.content}
              isAutoMode={message.routingMode === RoutingMode.AUTO}
            />
          ) : null}
          {!isUser && isFileGeneration && fileGenerationId ? (
            <FileGenerationBubble generationId={fileGenerationId} prompt={message.content} />
          ) : null}
          {!isUser && !isImageGeneration && !isFileGeneration ? assistantContent : null}
        </div>
        {!isUser && (providerModel || totalTokens > 0 || message.latencyMs !== null) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {providerModel ? (
              <Badge variant="outline" className="text-xs">
                {providerModel}
              </Badge>
            ) : null}
            {routeSummary ? (
              <Badge variant="outline" className="text-xs">
                {routeSummary}
              </Badge>
            ) : null}
            {isReRouted && originalProvider && originalModel ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/50 text-xs text-amber-600 dark:text-amber-400"
              >
                <RotateCcw className="h-3 w-3" />
                Re-routed from {originalProvider}/{originalModel}
                {originalScore !== null ? ` (${String(Math.round(originalScore * 100))}%)` : null}
              </Badge>
            ) : null}
            {isReRouted && reRouteReasons.length > 0
              ? reRouteReasons.map((reason) => (
                  <Badge
                    key={reason}
                    variant="outline"
                    className="border-amber-500/30 text-xs text-amber-600 dark:text-amber-400"
                  >
                    {RE_ROUTE_REASON_LABELS[reason] ?? reason}
                  </Badge>
                ))
              : null}
            {judgeDecision === 'ACCEPT' ? (
              <Badge
                variant="outline"
                className="gap-1 border-green-500/50 text-xs text-green-600 dark:text-green-400"
              >
                <ShieldCheck className="h-3 w-3" />
                Verified
              </Badge>
            ) : null}
            {judgeDecision === 'REVISE' ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/50 text-xs text-amber-600 dark:text-amber-400"
              >
                <RefreshCw className="h-3 w-3" />
                Revised
              </Badge>
            ) : null}
            {judgeDecision === 'ESCALATE' ? (
              <Badge
                variant="outline"
                className="gap-1 border-blue-500/50 text-xs text-blue-600 dark:text-blue-400"
              >
                <ArrowUpCircle className="h-3 w-3" />
                Escalated
              </Badge>
            ) : null}
            {memoryCount >= 0 ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Brain className="h-3 w-3" />
                {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'}
              </Badge>
            ) : null}
            {contextFileIds.length >= 0 ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <FileText className="h-3 w-3" />
                {contextFileIds.length} {contextFileIds.length === 1 ? 'file' : 'files'}
              </Badge>
            ) : null}
            {totalTokens > 0 ? (
              <span className="text-xs text-muted-foreground">{totalTokens} tokens</span>
            ) : null}
            {message.latencyMs !== null ? (
              <span className="text-xs text-muted-foreground">
                {formatLatency(message.latencyMs)}
              </span>
            ) : null}
          </div>
        ) : null}
        {!isUser ? (
          <div className="flex items-center gap-1">
            {onRegenerate ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                onClick={() => onRegenerate(message.id)}
                aria-label="Regenerate"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {onFeedback ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 w-7 p-0',
                    message.feedback === MessageFeedback.POSITIVE
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => handleFeedback(MessageFeedback.POSITIVE)}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 w-7 p-0',
                    message.feedback === MessageFeedback.NEGATIVE
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => handleFeedback(MessageFeedback.NEGATIVE)}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        {!isUser && judgeDecision ? (
          <JudgeRefereeDetails
            criticModel={
              typeof metadata?.['criticModel'] === 'string' ? metadata['criticModel'] : ''
            }
            criticFeedback={
              Array.isArray(metadata?.['criticFeedback'])
                ? (metadata['criticFeedback'] as string[])
                : []
            }
            criticScore={
              typeof metadata?.['criticScore'] === 'number' ? metadata['criticScore'] : 0
            }
            judgeModel={typeof metadata?.['judgeModel'] === 'string' ? metadata['judgeModel'] : ''}
            judgeDecision={judgeDecision}
            judgeReasoning={
              typeof metadata?.['judgeReasoning'] === 'string' ? metadata['judgeReasoning'] : ''
            }
            judgeConfidence={
              typeof metadata?.['judgeConfidence'] === 'number' ? metadata['judgeConfidence'] : 0
            }
          />
        ) : null}
        {!isUser ? <MessageProvenance message={message} /> : null}
        {!isUser && routingDecision ? <RoutingTransparency decision={routingDecision} /> : null}
      </div>
    </div>
  );
}
