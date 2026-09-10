import { Bot } from 'lucide-react';

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
import { useModelPicker } from '@/hooks/chat/use-model-picker';
import type { ModelPickerProps } from '@/types';
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
  useShortTriggerLabel,
  footer,
}: ModelPickerProps): React.ReactElement {
  const {
    open,
    isMobile,
    isDisabled,
    highlightedValue,
    triggerLabel,
    triggerShortLabel,
    onOpenChange,
    onHighlightChange,
    close,
  } = useModelPicker({
    value,
    groups,
    autoOption,
    isLoading,
    disabled,
    placeholder,
    loadingPlaceholder,
    emptyPlaceholder,
  });

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue);
    close();
  };

  const visibleLabel = useShortTriggerLabel === true ? triggerShortLabel : triggerLabel;

  const trigger = (
    <Button
      id={id}
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      // The full label even when the trigger shows the short one, so a screen
      // reader and a hover tooltip both name the choice completely.
      aria-label={ariaLabel ?? triggerLabel}
      title={triggerLabel}
      disabled={isDisabled}
      className={cn('w-full justify-start gap-2 font-normal', triggerClassName)}
    >
      <Bot className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      {/* Always a visible label. The icon-only form this replaced put the name
          in an `sr-only` span, which on a phone left nothing on screen saying
          which model would answer. */}
      <span className="truncate-fixed min-w-0 flex-1 text-start">{visibleLabel}</span>
    </Button>
  );

  const picker = (
    // `value` here is cmdk's HIGHLIGHT, not the selection. Seeding it with the
    // current choice on open is what makes cmdk scroll that row into view — the
    // list is ~180 rows and used to open at the top every single time.
    <Command
      value={highlightedValue}
      onValueChange={onHighlightChange}
      className="flex h-full min-h-0 flex-col"
    >
      <CommandInput placeholder={searchPlaceholder} />
      {/* `flex-1 min-h-0`, never a `dvh` fraction. A viewport-relative cap does
          not know about the header, the search box or the footer above and
          below it, so on a short viewport the list claimed its 55% and pushed
          the footer out through the bottom of the dialog. */}
      <CommandList className="max-h-none min-h-0 flex-1">
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
      {footer === undefined ? null : (
        <div className="border-border shrink-0 border-t p-2">{footer}</div>
      )}
    </Command>
  );

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="top-auto bottom-0 left-0 flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-t-2xl rounded-b-none p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <DialogHeader className="shrink-0 text-start">
            {/* The selected model, not a fixed word. The title used to read
                "Auto" whichever model was chosen, which on a phone was the only
                place the choice could have been named at all. */}
            <DialogTitle className="truncate-fixed">{triggerLabel}</DialogTitle>
          </DialogHeader>
          {/* `flex`, not a bare block. A block wrapper gives the command box
              nothing to stretch against, so it sized to its content, overflowed
              this box and had its footer CLIPPED — the disclaimer read
              "Local models draw from" and stopped. */}
          <div className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden overscroll-contain rounded-lg border">
            {picker}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="flex max-h-[min(28rem,calc(100dvh-6rem))] w-[min(420px,calc(100vw-2rem))] flex-col p-0"
        align="start"
      >
        {picker}
      </PopoverContent>
    </Popover>
  );
}
