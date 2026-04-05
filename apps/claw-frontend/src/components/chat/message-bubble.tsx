import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { MessageProvenance } from '@/components/chat/message-provenance';
import { RoutingTransparency } from '@/components/chat/routing-transparency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MESSAGE_ROLE_LABELS } from '@/constants';
import { MessageFeedback, MessageRole } from '@/enums';
import { MarkdownRenderer } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { MessageBubbleProps } from '@/types';
import { formatLatency } from '@/utilities';

export function MessageBubble({ message, routingDecision, onFeedback }: MessageBubbleProps) {
  const isUser = message.role === MessageRole.USER;
  const roleLabel = MESSAGE_ROLE_LABELS[message.role];

  const totalTokens = (message.inputTokens ?? 0) + (message.outputTokens ?? 0);
  const providerModel = [message.provider, message.model].filter(Boolean).join(' / ');

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
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
        {!isUser && (providerModel || totalTokens > 0 || message.latencyMs !== null) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {providerModel ? (
              <Badge variant="outline" className="text-xs">
                {providerModel}
              </Badge>
            ) : null}
            {totalTokens > 0 ? (
              <span className="text-xs text-muted-foreground">{totalTokens} tokens</span>
            ) : null}
            {message.latencyMs !== null ? (
              <span className="text-xs text-muted-foreground">{formatLatency(message.latencyMs)}</span>
            ) : null}
          </div>
        ) : null}
        {!isUser && onFeedback ? (
          <div className="flex items-center gap-1">
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
          </div>
        ) : null}
        {!isUser ? <MessageProvenance message={message} /> : null}
        {!isUser && routingDecision ? <RoutingTransparency decision={routingDecision} /> : null}
      </div>
    </div>
  );
}
