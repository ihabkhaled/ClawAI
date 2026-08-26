import { Check } from 'lucide-react';

import { CommandItem } from '@/components/ui/command';
import type { ModelPickerItemProps } from '@/types';
import { cn } from '@/utilities';

export function ModelPickerItem({
  option,
  isSelected,
  onSelect,
}: ModelPickerItemProps): React.ReactElement {
  return (
    <CommandItem value={option.label} onSelect={() => onSelect(option.value)}>
      <Check className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.specifications !== undefined && option.specifications.length > 0 ? (
        <span className="flex shrink-0 flex-wrap justify-end gap-1">
          {option.specifications.map((specification) => (
            <span
              key={specification}
              className="border-border bg-muted text-muted-foreground touch:text-xs rounded border px-1.5 py-0.5 text-[10px] leading-none"
            >
              {specification}
            </span>
          ))}
        </span>
      ) : null}
    </CommandItem>
  );
}
