import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { CommandItem } from '@/components/ui/command';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ConnectorProviderComboboxItemProps } from '@/types';

export function ConnectorProviderComboboxItem({
  option,
  isSelected,
  onSelect,
}: ConnectorProviderComboboxItemProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <CommandItem value={option.label} onSelect={() => onSelect(option.value)}>
      <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
      <span className="flex-1 truncate">{option.label}</span>
      {option.hasFreeTier ? (
        <Badge variant="secondary" className="ms-2 shrink-0 text-xs">
          {t('connectors.freeTierBadge')}
        </Badge>
      ) : null}
    </CommandItem>
  );
}
