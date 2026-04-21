import { Globe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SearchBrowserScoreBadgeProps } from '@/types';
import { resolveSearchBrowserScoreTone } from '@/utilities';

export function SearchBrowserScoreBadge({ score, t }: SearchBrowserScoreBadgeProps) {
  if (score === null || score < 0.5) {
    return null;
  }

  const tone = resolveSearchBrowserScoreTone(score);

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-[10px] font-medium uppercase tracking-wide', tone)}
      title={t('catalog.searchBrowserScoreTooltip')}
    >
      <Globe className="h-3 w-3" />
      {t('catalog.searchBrowserScoreLabel')} {score.toFixed(2)}
    </Badge>
  );
}
