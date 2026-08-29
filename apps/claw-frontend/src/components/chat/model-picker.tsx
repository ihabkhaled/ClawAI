import { Bot } from 'lucide-react';
import { useState } from 'react';

import { ModelPickerItem } from '@/components/chat/model-picker-item';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
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
  hideTriggerLabel,
  footer,
}: ModelPickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const totalOptionCount = groups.reduce((sum, group) => sum + group.options.length, 0);
  const isEmpty = !isLoading && totalOptionCount === 0 && autoOption === undefined;
  const isDisabled = disabled === true || isLoading === true || isEmpty;
  const allOptions: ModelPickerOption[] = autoOption
    ? [autoOption, ...groups.flatMap((group) => group.options)]
    : groups.flatMap((group) => group.options);
  const selectedOption = allOptions.find((option) => option.value === value) ?? null;

  const resolveTriggerLabel = (): string => {
    if (isLoading === true) {
      return loadingPlaceholder;
    }
    if (isEmpty) {
      return emptyPlaceholder;
    }
    return selectedOption?.label ?? placeholder;
  };

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue);
    setOpen(false);
  };

  const trigger = (
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
      {hideTriggerLabel === true ? (
        <span className="sr-only">{resolveTriggerLabel()}</span>
      ) : (
        <span className="truncate-fixed min-w-0 flex-1 text-start">{resolveTriggerLabel()}</span>
      )}
    </Button>
  );

  const picker = (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList className="max-h-[55dvh]">
        <CommandEmpty>{noResultsLabel}</CommandEmpty>
        {autoOption ? (
          <CommandGroup>
            <ModelPickerItem
              option={autoOption}
              isSelected={value === autoOption.value}
              onSelect={handleSelect}
            />
          </CommandGroup>
        ) : null}
        {groups.map((group) => (
          <CommandGroup key={group.key} heading={group.label || undefined}>
            {group.options.map((option) => (
              <ModelPickerItem
                key={option.value}
                option={option}
                isSelected={value === option.value}
                onSelect={handleSelect}
              />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      {/* Pinned below the scrolling list, not inside it: the disclaimer has to
          stay readable while the user scrolls through providers, which is
          exactly when it matters. */}
      {footer === undefined ? null : <div className="border-border border-t p-2">{footer}</div>}
    </Command>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="top-auto bottom-0 left-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <DialogHeader className="text-start">
            <DialogTitle>{ariaLabel}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 touch-pan-y overflow-hidden overscroll-contain rounded-lg border">
            {picker}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="start">
        {picker}
      </PopoverContent>
    </Popover>
  );
}
