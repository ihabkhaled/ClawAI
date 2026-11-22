import { Input } from '@/components/ui/input';
import type { AdminLiveNumberFieldProps } from '@/types/live-admin.types';

/** One labelled numeric text field of the policy form. */
export function AdminLiveNumberField({
  id,
  label,
  value,
  invalid,
  onChange,
}: AdminLiveNumberFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        name={id}
        inputMode="decimal"
        dir="ltr"
        value={value}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
