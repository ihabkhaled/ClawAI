'use client';

import type { ReactElement } from 'react';

import { ModelExposureFilterSelect } from '@/components/admin/connectors/model-exposure-filter-select';
import { ModelExposureFilterSheet } from '@/components/admin/connectors/model-exposure-filter-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MODEL_EXPOSURE_BADGE_CLASSES } from '@/constants/model-exposure.constants';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import { ModelExposureFilterOption } from '@/enums/model-exposure-filter.enum';
import type { ModelExposureToolbarProps } from '@/types/model-exposure.types';

/** Counts as labelled stats, then search and the exposure filter. */
export function ModelExposureToolbar({
  filters,
  exposedCount,
  unexposedCount,
  hasActiveFilters,
  onSearchChange,
  onExposureFilterChange,
  onSelectAllVisible,
  onClearSelection,
  t,
}: ModelExposureToolbarProps): ReactElement {
  return (
    <div className="flex flex-col gap-3" data-testid="model-exposure-toolbar">
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={BadgeVariant.OUTLINE}
          className={MODEL_EXPOSURE_BADGE_CLASSES[ConnectorModelExposure.EXPOSED]}
        >
          {t('adminConnectors.exposureUi.exposedStat', { count: exposedCount })}
        </Badge>
        <Badge
          variant={BadgeVariant.OUTLINE}
          className={MODEL_EXPOSURE_BADGE_CLASSES[ConnectorModelExposure.UNEXPOSED]}
        >
          {t('adminConnectors.exposureUi.unexposedStat', { count: unexposedCount })}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={filters.search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('adminConnectors.exposure.searchPlaceholder')}
          aria-label={t('adminConnectors.exposureUi.searchLabel')}
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <div className="touch:hidden">
          <ModelExposureFilterSelect
            exposedOnly={filters.exposedOnly}
            onChange={onExposureFilterChange}
            triggerClassName="w-48"
            t={t}
          />
        </div>
        <ModelExposureFilterSheet
          exposedOnly={filters.exposedOnly}
          hasActiveFilters={filters.exposedOnly !== null}
          onExposureFilterChange={onExposureFilterChange}
          onSelectAllVisible={onSelectAllVisible}
          onClearSelection={onClearSelection}
          t={t}
        />
        {hasActiveFilters ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="touch:min-h-11"
            onClick={() => {
              onSearchChange('');
              onExposureFilterChange(ModelExposureFilterOption.ALL);
            }}
          >
            {t('adminConnectors.exposureUi.clearFilters')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
