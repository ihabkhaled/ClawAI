import { ChevronsUpDown } from 'lucide-react';

import { ConnectorProviderComboboxItem } from '@/components/connectors/connector-provider-combobox-item';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PROVIDER_DISPLAY_NAMES } from '@/constants';
import type { ConnectorProvider } from '@/enums';
import { useConnectorProviderCombobox } from '@/hooks/connectors/use-connector-provider-combobox';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ConnectorProviderComboboxProps } from '@/types';

export function ConnectorProviderCombobox({
  value,
  onChange,
  disabled,
}: ConnectorProviderComboboxProps): React.ReactElement {
  const { t } = useTranslation();
  const { open, setOpen, groups } = useConnectorProviderCombobox();

  const triggerLabel =
    value !== null ? PROVIDER_DISPLAY_NAMES[value] : t('connectors.selectProvider');

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue as ConnectorProvider);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="connector-provider"
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={triggerLabel}
          disabled={disabled}
          className="w-full justify-between gap-2 font-normal"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="text-muted-foreground h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[min(420px,calc(100vw-2rem))] p-0')} align="start">
        <Command className="flex max-h-[min(24rem,60dvh)] flex-col">
          <CommandInput placeholder={t('connectors.searchProviderPlaceholder')} />
          <CommandList className="max-h-none min-h-0 flex-1">
            <CommandEmpty>{t('connectors.noProviderResults')}</CommandEmpty>
            {groups.map((group) =>
              group.options.length > 0 ? (
                <CommandGroup key={group.key} heading={group.label}>
                  {group.options.map((option) => (
                    <ConnectorProviderComboboxItem
                      key={option.value}
                      option={option}
                      isSelected={value === option.value}
                      onSelect={handleSelect}
                    />
                  ))}
                </CommandGroup>
              ) : null,
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
