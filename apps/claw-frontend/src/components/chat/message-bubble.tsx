import { Brain, FileText, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';

import { FileGenerationBubble } from '@/components/chat/file-generation-bubble';
import { ImageGenerationBubble } from '@/components/chat/image-generation-bubble';
import { MessageProvenance } from '@/components/chat/message-provenance';
import { RoutingTransparency } from '@/components/chat/routing-transparency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MESSAGE_ROLE_LABELS } from '@/constants';
import { MessageFeedback, MessageRole, RoutingMode } from '@/enums';
import { MarkdownRenderer } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { MessageBubbleProps } from '@/types';
import { formatLatency } from '@/utilities';

export function MessageBubble({
  message,
  routingDecision,
  onFeedback,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === MessageRole.USER;
  const roleLabel = MESSAGE_ROLE_LABELS[message.role];

  const totalTokens = (message.inputTokens ?? 0) + (message.outputTokens ?? 0);
  const providerModel = [message.provider, message.model].filter(Boolean).join(' / ');
  const metadata = message.metadata as Record<string, unknown> | null;
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
        <span className="text-xs text-muted-foreground">{roleLabel}</span>
        <div
          className={cn(
            'rounded-lg px-4 py-2.5 text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}
        >
          {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : null}
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
          {!isUser && !isImageGeneration && !isFileGeneration ? (
            <MarkdownRenderer content={message.content} />
          ) : null}
        </div>
        {!isUser && (providerModel || totalTokens > 0 || message.latencyMs !== null) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {providerModel ? (
              <Badge variant="outline" className="text-xs">
                {providerModel}
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
        {!isUser ? <MessageProvenance message={message} /> : null}
        {!isUser && routingDecision ? <RoutingTransparency decision={routingDecision} /> : null}
      </div>
    </div>
  );
}
