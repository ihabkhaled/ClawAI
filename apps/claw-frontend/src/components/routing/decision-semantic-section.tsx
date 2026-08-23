'use client';

import { SemanticAnalysisStatusEnum } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown';
import type { DecisionSemanticSectionProps } from '@/types';
import { toMarkdownJsonBlock } from '@/utilities';

export function DecisionSemanticSection({
  semantic,
}: DecisionSemanticSectionProps): React.ReactElement {
  const { t } = useTranslation();

  if (semantic === null) {
    return <p className="text-muted-foreground">{t('decisionDetail.semantic.notRun')}</p>;
  }

  if (semantic.status === SemanticAnalysisStatusEnum.SUCCESS && semantic.analysis !== null) {
    return <MarkdownRenderer content={toMarkdownJsonBlock(semantic.analysis)} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-amber-600 dark:text-amber-400">
        {t('decisionDetail.semantic.failed', { status: semantic.status })}
      </p>
      {semantic.failureReason !== undefined ? (
        <p className="text-muted-foreground text-xs">{semantic.failureReason}</p>
      ) : null}
      {semantic.rawOutputExcerpt !== undefined ? (
        <pre className="bg-muted touch:text-xs overflow-x-auto rounded p-2 text-[11px]">
          {semantic.rawOutputExcerpt}
        </pre>
      ) : null}
    </div>
  );
}
