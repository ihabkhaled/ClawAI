import {
  AlertTriangle,
  ArrowUpCircle,
  Brain,
  FileText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { memo } from 'react';

import { ContextReceiptButton } from '@/components/chat/context-receipt-button';
import { FileGenerationBubble } from '@/components/chat/file-generation-bubble';
import { ImageGenerationBubble } from '@/components/chat/image-generation-bubble';
import { JudgeRefereeDetails } from '@/components/chat/judge-referee-details';
import { MessageAttachments } from '@/components/chat/message-attachments';
import { MessageProvenance } from '@/components/chat/message-provenance';
import { OllamaToolTranscriptPanel } from '@/components/chat/ollama-tool-transcript-panel';
import { ResearchRunDetails } from '@/components/chat/research-run-details';
import { ResearchTranscriptPanel } from '@/components/chat/research-transcript-panel';
import { RoutingTransparency } from '@/components/chat/routing-transparency';
import { ThreadContextInspector } from '@/components/chat/thread-context-inspector';
import { WhyThisModelPanel } from '@/components/chat/why-this-model-panel';
import { WorkflowBadge } from '@/components/chat/workflow-badge';
import { CopyButton } from '@/components/common/copy-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MESSAGE_ROLE_LABELS, RE_ROUTE_REASON_LABELS } from '@/constants';
import { ComponentSize, MessageFeedback, MessageRole, RoutingMode } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { MessageBubbleProps, OllamaToolTranscript, ResearchTranscript } from '@/types';
import { formatLatency, formatShortDateTime, getJudgeReviewFromMessage } from '@/utilities';

// Memoized: a chat thread renders 20-200 MessageBubble instances. Without
// memoization, every parent re-render (new SSE token, polling tick, scroll
// position change) re-rendered every bubble in the list, re-running its
// metadata destructuring AND its nested MarkdownRenderer. With memo +
// memoized MarkdownRenderer (see lib/markdown/markdown-renderer.tsx), only
// the bubble whose props actually changed re-renders.
function MessageBubbleBase({
  message,
  routingDecision,
  onFeedback,
  onRegenerate,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.role === MessageRole.USER;
  const roleLabel = MESSAGE_ROLE_LABELS[message.role];

  const totalTokens = (message.inputTokens ?? 0) + (message.outputTokens ?? 0);
  const metadata = message.metadata as Record<string, unknown> | null;
  const routeRoadmap = metadata?.['routeRoadmap'] as
    | {
        routerModel?: string | null;
        research?: {
          workflow?: string | null;
          toolsUsed?: string[];
          itemCount?: number;
        } | null;
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
  const researchSummary = routeRoadmap?.research;
  const researchBadgeLabel =
    researchSummary !== null &&
    researchSummary !== undefined &&
    typeof researchSummary.workflow === 'string'
      ? `Research: ${researchSummary.workflow}${typeof researchSummary.itemCount === 'number' ? ` (${String(researchSummary.itemCount)} items)` : ''}`
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
    <p className="whitespace-pre-wrap text-muted-foreground">{t('chat.noVisibleAnswer')}</p>
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
  const judgeReview = getJudgeReviewFromMessage(message);
  const judgeDecision = judgeReview?.judgeDecision ?? null;
  // Phase 6 — workflow live wiring. Backwards-compatible: legacy messages
  // (pre-Phase 6) have `metadata.workflow === undefined`, in which case
  // the badge renders nothing.
  const workflow = typeof metadata?.['workflow'] === 'string' ? metadata['workflow'] : null;
  const workflowReason =
    typeof metadata?.['workflowReason'] === 'string' ? metadata['workflowReason'] : null;
  const searchFirstMeta =
    typeof metadata?.['searchFirst'] === 'object' && metadata['searchFirst'] !== null
      ? (metadata['searchFirst'] as {
          applied: boolean;
          resultCount: number;
          runId: string | null;
          warning: string | null;
        })
      : undefined;
  // Banner shown on assistant messages where the model ran out of context
  // window mid-generation. BE persists this in ChatMessage.metadata.
  const isTruncatedAtContextLimit = metadata?.['truncatedAtContextLimit'] === true;

  // Ollama Cloud agentic tool-call trace. Present only when the assistant
  // turn used web_search / web_fetch one or more times. BE persists the
  // shape under metadata.toolTranscript in chat-messages.service.ts.
  const toolTranscript =
    typeof metadata?.['toolTranscript'] === 'object' && metadata['toolTranscript'] !== null
      ? (metadata['toolTranscript'] as OllamaToolTranscript)
      : null;

  // Research enricher transcript. Present when the assistant turn was
  // enriched with web research evidence (search / search+fetch /
  // search+extract). BE persists this under metadata.researchTranscript.
  const researchTranscript =
    typeof metadata?.['researchTranscript'] === 'object' &&
    metadata['researchTranscript'] !== null
      ? (metadata['researchTranscript'] as ResearchTranscript)
      : null;

  const handleFeedback = (value: MessageFeedback): void => {
    if (!onFeedback) {
      return;
    }
    const next = message.feedback === value ? null : value;
    onFeedback(message.id, next);
  };

  return (
    <div className={cn('group/bubble flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex flex-col gap-1',
          isUser ? 'max-w-[88%] items-end sm:max-w-[80%]' : 'max-w-full items-start sm:max-w-[85%]',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2',
            // Right-align meta row above the assistant bubble too; user side
            // already flows end-justified via the wrapper.
            isUser ? 'self-end' : 'self-start',
          )}
        >
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
          <span className="text-[10px] text-muted-foreground/60 transition-opacity md:opacity-60 md:group-hover/bubble:opacity-100">
            {formatShortDateTime(message.createdAt)}
          </span>
        </div>
        {!isUser && isTruncatedAtContextLimit ? (
          <div
            role="alert"
            className="flex w-full items-start gap-2 rounded-md border border-warning/40 bg-warning-surface px-3 py-2 text-xs text-warning"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">{t('chat.truncated.title')}</span>
              <span className="text-warning/90">{t('chat.truncated.body')}</span>
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            'rounded-lg px-4 py-2.5 text-sm transition-colors',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground group-hover/bubble:bg-card/80',
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
        {isUser && message.content.trim().length > 0 ? (
          <div
            className={cn(
              'flex items-center gap-1 self-end transition-opacity',
              'md:opacity-0 md:group-hover/bubble:opacity-100 md:focus-within:opacity-100',
            )}
          >
            <CopyButton
              text={message.content}
              size={ComponentSize.SM}
              label={t('chat.copyMessage')}
              className="h-7 w-7 text-muted-foreground"
            />
          </div>
        ) : null}
        {!isUser && toolTranscript !== null ? (
          <OllamaToolTranscriptPanel transcript={toolTranscript} />
        ) : null}
        {!isUser && researchTranscript !== null ? (
          <ResearchTranscriptPanel transcript={researchTranscript} />
        ) : null}
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
            {researchBadgeLabel ? (
              <Badge variant="outline" className="text-xs">
                {researchBadgeLabel}
              </Badge>
            ) : null}
            <WorkflowBadge
              workflow={workflow}
              reason={workflowReason}
              searchFirst={searchFirstMeta}
            />
            {isReRouted && originalProvider && originalModel ? (
              <Badge variant="warning" className="gap-1 text-xs">
                <RotateCcw className="h-3 w-3" />
                Re-routed from {originalProvider}/{originalModel}
                {originalScore !== null ? ` (${String(Math.round(originalScore * 100))}%)` : null}
              </Badge>
            ) : null}
            {isReRouted && reRouteReasons.length > 0
              ? reRouteReasons.map((reason) => (
                  <Badge key={reason} variant="warning" className="text-xs">
                    {RE_ROUTE_REASON_LABELS[reason] ?? reason}
                  </Badge>
                ))
              : null}
            {judgeDecision === 'ACCEPT' ? (
              <Badge variant="success" className="gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" />
                {t('chat.judgeVerified')}
              </Badge>
            ) : null}
            {judgeDecision === 'REVISE' ? (
              <Badge variant="warning" className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3" />
                {t('chat.judgeRevised')}
              </Badge>
            ) : null}
            {judgeDecision === 'ESCALATE' ? (
              <Badge variant="info" className="gap-1 text-xs">
                <ArrowUpCircle className="h-3 w-3" />
                {t('chat.judgeEscalated')}
              </Badge>
            ) : null}
            {memoryCount >= 0 ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Brain className="h-3 w-3" />
                {memoryCount === 1
                  ? t('chat.oneMemory', { count: memoryCount })
                  : t('chat.manyMemories', { count: memoryCount })}
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
          <div
            className={cn(
              'flex flex-wrap items-center gap-1 transition-opacity',
              // Hover-only on desktop (where pointer hover is the affordance);
              // always visible on touch/small viewports.
              'md:opacity-0 md:group-hover/bubble:opacity-100 md:focus-within:opacity-100',
            )}
          >
            <ContextReceiptButton messageId={message.id} />
            {hasVisibleAssistantContent ? (
              <CopyButton
                text={message.content}
                size={ComponentSize.SM}
                label={t('chat.copyMessage')}
                className="h-7 w-7 text-muted-foreground"
              />
            ) : null}
            {onRegenerate ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                onClick={() => onRegenerate(message.id)}
                aria-label={t('chat.regenerate')}
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
                  aria-label={t('chat.feedbackPositive')}
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
                  aria-label={t('chat.feedbackNegative')}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        {!isUser ? <WhyThisModelPanel message={message} /> : null}
        {!isUser ? <ThreadContextInspector messageId={message.id} /> : null}
        {!isUser && judgeDecision ? <JudgeRefereeDetails message={message} /> : null}
        {!isUser ? <ResearchRunDetails message={message} /> : null}
        {!isUser ? <MessageProvenance message={message} /> : null}
        {!isUser && routingDecision ? <RoutingTransparency decision={routingDecision} /> : null}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);
