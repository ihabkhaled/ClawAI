import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { PlanNullableLimitFieldProps } from '@/types/plugin-installs.types';

/**
 * A plan cap where blank means unlimited and 0 means disabled. The two are different things,
 * so the field shows the choice as a checkbox instead of leaving it to an empty box.
 */
export function PlanNullableLimitField({
  id,
  label,
  value,
  max,
  onChange,
  unlimitedLabel,
  placeholder,
}: PlanNullableLimitFieldProps): React.ReactElement {
  const unlimited = value === '';
  return (
    <div className="grid grid-cols-1 gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${id}-unlimited`}
          checked={unlimited}
          onCheckedChange={(checked) => onChange(checked === true ? '' : '0')}
        />
        <label htmlFor={`${id}-unlimited`} className="text-muted-foreground text-xs">
          {unlimitedLabel}
        </label>
      </div>
    </div>
  );
}
