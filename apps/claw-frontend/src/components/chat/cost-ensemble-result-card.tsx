import { ExternalLink } from 'lucide-react';

import { CostTierBadge } from '@/components/chat/cost-tier-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COST_TIER_LABEL_KEYS } from '@/constants';
import type { CostEnsembleResultCardProps } from '@/types';

export function CostEnsembleResultCard({ result, onViewInThread, t }: CostEnsembleResultCardProps) {
  const { classification, tier, candidates, selectedIndex } = result.metadata;

  const tierLabelKey = COST_TIER_LABEL_KEYS[tier] ?? COST_TIER_LABEL_KEYS['single'];
  const tierLabel = t(tierLabelKey ?? 'costEnsemble.tierSingle');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t('costEnsemble.tier')}</CardTitle>
              <CostTierBadge tier={tier} label={tierLabel} />
            </div>
            <Button variant="outline" size="sm" onClick={onViewInThread}>
              <ExternalLink className="me-2 h-3 w-3" />
              {t('costEnsemble.viewInThread')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">{t('costEnsemble.complexity')}</p>
              <p className="font-semibold">{(classification.complexity * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">{t('costEnsemble.risk')}</p>
              <p className="font-semibold">{(classification.risk * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">{t('costEnsemble.ambiguity')}</p>
              <p className="font-semibold">{(classification.ambiguity * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-medium text-muted-foreground">{t('costEnsemble.reasoning')}</p>
            <p className="mt-1 text-foreground">{classification.reasoning}</p>
          </div>
          <div className="text-sm">
            <p className="font-medium text-muted-foreground">
              {t('costEnsemble.candidates')}: {String(candidates.length)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t('costEnsemble.candidates')} #{String(selectedIndex + 1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{result.content}</p>
        </CardContent>
      </Card>
    </div>
  );
}
