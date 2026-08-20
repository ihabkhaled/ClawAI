import { Bot } from 'lucide-react';
import { useState } from 'react';

import { ModelPickerItem } from '@/components/chat/model-picker-item';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ModelPickerOption, ModelPickerProps } from '@/types';
import { cn } from '@/utilities';

export function ModelPicker({
  id,
  groups,
  value,
  onChange,
  disabled,
  isLoading,
  autoOption,
  placeholder,
  loadingPlaceholder,
  emptyPlaceholder,
  searchPlaceholder,
  noResultsLabel,
  triggerClassName,
  ariaLabel,
}: ModelPickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const totalOptionCount = groups.reduce((sum, group) => sum + group.options.length, 0);
  const isEmpty = !isLoading && totalOptionCount === 0 && autoOption === undefined;
  const isDisabled = disabled === true || isLoading === true || isEmpty;
  const allOptions: ModelPickerOption[] = autoOption
    ? [autoOption, ...groups.flatMap((group) => group.options)]
    : groups.flatMap((group) => group.options);
  const selectedOption = allOptions.find((option) => option.value === value) ?? null;

  const resolveTriggerLabel = (): string => {
    if (isLoading === true) return loadingPlaceholder;
    if (isEmpty) return emptyPlaceholder;
    return selectedOption?.label ?? placeholder;
  };

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={isDisabled}
          className={cn('w-full justify-start gap-2 font-normal', triggerClassName)}
        >
          <Bot className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-start">{resolveTriggerLabel()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1rem)] p-0 sm:w-[min(420px,calc(100vw-2rem))]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[55dvh]">
            <CommandEmpty>{noResultsLabel}</CommandEmpty>
            {autoOption ? (
              <CommandGroup>
                <ModelPickerItem option={autoOption} isSelected={value === autoOption.value} onSelect={handleSelect} />
              </CommandGroup>
            ) : null}
            {groups.map((group) => (
              <CommandGroup key={group.key} heading={group.label || undefined}>
                {group.options.map((option) => (
                  <ModelPickerItem key={option.value} option={option} isSelected={value === option.value} onSelect={handleSelect} />
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
