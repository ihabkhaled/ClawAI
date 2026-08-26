'use client';

import type { ReactElement } from 'react';

import { ModelExposureTable } from '@/components/admin/connectors/model-exposure-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModelExposureSection } from '@/hooks/admin/use-model-exposure-section';
import { useTranslation } from '@/lib/i18n';
import type { ModelExposureSectionProps } from '@/types';

export function ModelExposureSection({ connectorId }: ModelExposureSectionProps): ReactElement {
  const { t } = useTranslation();
  const exposure = useModelExposureSection(connectorId);

  return (
    // Labelled as a region so assistive tech, and the burn-in, can address this
    // table specifically; the page also renders a read-only model list.
    <Card data-testid="model-exposure-section" aria-label={t('adminConnectors.exposure.title')}>
      <CardHeader>
        <CardTitle className="text-lg">{t('adminConnectors.exposure.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          {t('adminConnectors.exposure.description')}
        </p>
        <ModelExposureTable
          visibleRows={exposure.visibleRows}
          selected={exposure.selected}
          toggle={exposure.toggle}
          selectAllVisible={exposure.selectAllVisible}
          clearSelection={exposure.clearSelection}
          filters={exposure.filters}
          setFilter={exposure.setFilter}
          exposedCount={exposure.exposedCount}
          unexposedCount={exposure.unexposedCount}
          impact={exposure.impact}
          isLoading={exposure.isLoading}
          isSaving={exposure.isSaving}
          errorMessage={exposure.errorMessage}
          onApply={exposure.apply}
          t={t}
        />
      </CardContent>
    </Card>
  );
}
