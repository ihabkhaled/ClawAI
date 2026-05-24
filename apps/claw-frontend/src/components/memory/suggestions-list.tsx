'use client';

import { Check, ShieldAlert, X } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { SuggestionsListProps } from '@/types/component.types';
import { formatDate } from '@/utilities';

export function SuggestionsList(props: SuggestionsListProps): React.ReactElement {
  const { suggestions, isLoading, isPending, onApprove, onReject } = props;
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingSpinner label={t('memory.loadingSuggestions')} />;
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('memory.noSuggestions')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {suggestion.type}
                </Badge>
                {suggestion.sensitivity !== 'NORMAL' && (
                  <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                    <ShieldAlert className="h-3 w-3" />
                    {suggestion.sensitivity}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {t('memory.suggestionConfidence', {
                    value: String(Math.round(suggestion.confidence * 100)),
                  })}
                </span>
              </div>
              <CardTitle className="text-xs text-muted-foreground">
                {formatDate(suggestion.createdAt)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap text-sm">{suggestion.content}</p>
            {suggestion.reason ? (
              <p className="text-xs text-muted-foreground">
                {t('memory.suggestionReason', { value: suggestion.reason })}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => onApprove(suggestion.id)}
                disabled={isPending || suggestion.sensitivity === 'REDACTED'}
              >
                <Check className="me-2 h-4 w-4" />
                {t('memory.approveSuggestion')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(suggestion.id, { suppressSimilar: false })}
                disabled={isPending}
              >
                <X className="me-2 h-4 w-4" />
                {t('memory.rejectSuggestion')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReject(suggestion.id, { suppressSimilar: true })}
                disabled={isPending}
              >
                {t('memory.rejectAndSuppress')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
