import { Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ModelCapability } from '@/enums';
import type { CatalogCapabilityFilterProps } from '@/types';

export function CatalogCapabilityFilter({
  selectedCapability,
  onSelect,
  t,
}: CatalogCapabilityFilterProps) {
  const active = selectedCapability === ModelCapability.SEARCH_BROWSER;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={active ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect(active ? undefined : ModelCapability.SEARCH_BROWSER)}
        className="gap-1.5"
      >
        <Globe className="h-3.5 w-3.5" />
        {t('catalog.searchBrowserHelpers')}
      </Button>
    </div>
  );
}
