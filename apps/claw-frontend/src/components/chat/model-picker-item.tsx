import { Check } from 'lucide-react';

import { ModelCapabilityBadges } from '@/components/chat/model-capability-badges';
import type { ModelPickerItemProps } from '@/types';
import { cn } from '@/utilities';

export function ModelPickerItem({
  id,
  option,
  isSelected,
  isActive,
  onSelect,
  onHover,
}: ModelPickerItemProps): React.ReactElement {
  return (
    // A listbox option, not a cmdk item: the list is virtualised, so only the
    // rows near the viewport are mounted and the picker owns the highlight.
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(option.value);
        }
      }}
      data-active={isActive}
      onClick={() => onSelect(option.value)}
      onMouseMove={() => {
        if (!isActive) {
          onHover(option.value);
        }
      }}
      className={cn(
        'touch:min-h-11 touch:text-base relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
        isActive && 'bg-accent text-accent-foreground',
      )}
    >
      <Check className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.capabilities !== undefined ? (
        <ModelCapabilityBadges capabilities={option.capabilities} />
      ) : null}
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
    </div>
  );
}
