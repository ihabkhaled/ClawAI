'use client';

import { DecisionSemanticSection } from '@/components/routing/decision-semantic-section';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown';
import type { DecisionDetailSectionsProps } from '@/types';
import { toMarkdownJsonBlock } from '@/utilities';

export function DecisionDetailSections({
  decision,
}: DecisionDetailSectionsProps): React.ReactElement {
  const { t } = useTranslation();

  const semantic = decision.semanticAnalysis;
  const roadmap = decision.routeRoadmap;
  const healthSnapshot = decision.connectorHealthSnapshot;
  const confidencePct =
    decision.confidence === null ? null : Math.round(Number(decision.confidence) * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('decisionDetail.sections.decision')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t('decisionDetail.field.provider')}</p>
            <Badge variant="outline">{decision.selectedProvider}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('decisionDetail.field.model')}</p>
            <Badge variant="outline">{decision.selectedModel}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('decisionDetail.field.mode')}</p>
            <span>{decision.routingMode}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('decisionDetail.field.confidence')}</p>
            <span>{confidencePct === null ? '—' : `${String(confidencePct)}%`}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t('decisionDetail.field.privacyClass')}
            </p>
            <span>{decision.privacyClass ?? '—'}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('decisionDetail.field.costClass')}</p>
            <span>{decision.costClass ?? '—'}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('decisionDetail.field.duration')}</p>
            <span>
              {decision.routingDurationMs === null ? '—' : `${String(decision.routingDurationMs)}ms`}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t('decisionDetail.field.reasonTags')}
            </p>
            <div className="flex flex-wrap gap-1">
              {decision.reasonTags.length === 0 ? (
                <span>—</span>
              ) : (
                decision.reasonTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('decisionDetail.sections.semanticAnalysis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <DecisionSemanticSection semantic={semantic} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('decisionDetail.sections.keywordSignals')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">
              {t('decisionDetail.field.detectedCategory')}
            </p>
            <span>{decision.detectedCategory ?? '—'}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t('decisionDetail.field.secondaryCategory')}
            </p>
            <span>{decision.secondaryCategory ?? '—'}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t('decisionDetail.field.matchCount')}
            </p>
            <span>{decision.matchCount === null ? '—' : String(decision.matchCount)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('decisionDetail.sections.candidates')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ul className="space-y-1">
            <li>
              <span className="text-xs text-muted-foreground">
                {t('decisionDetail.candidates.primary')}:{' '}
              </span>
              <Badge variant="default" className="text-[10px]">
                {decision.selectedProvider}/{decision.selectedModel}
              </Badge>
            </li>
            {(roadmap?.fallbackChain ?? []).length === 0 &&
            decision.fallbackProvider === null ? (
              <li className="text-muted-foreground">
                {t('decisionDetail.candidates.noFallback')}
              </li>
            ) : null}
            {(roadmap?.fallbackChain ?? []).map((entry, index) => (
              <li key={`${entry.provider}-${entry.model}-${String(index)}`}>
                <span className="text-xs text-muted-foreground">
                  {t('decisionDetail.candidates.fallback', { index: String(index + 1) })}:{' '}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {entry.provider}/{entry.model}
                </Badge>
              </li>
            ))}
            {(roadmap?.fallbackChain ?? []).length === 0 &&
            decision.fallbackProvider !== null &&
            decision.fallbackModel !== null ? (
              <li>
                <span className="text-xs text-muted-foreground">
                  {t('decisionDetail.candidates.fallback', { index: '1' })}:{' '}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {decision.fallbackProvider}/{decision.fallbackModel}
                </Badge>
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('decisionDetail.sections.health')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {healthSnapshot === null ? (
            <p className="text-muted-foreground">{t('decisionDetail.health.noData')}</p>
          ) : (
            <MarkdownRenderer content={toMarkdownJsonBlock(healthSnapshot)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
