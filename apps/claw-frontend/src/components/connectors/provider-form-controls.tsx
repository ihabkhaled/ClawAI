import { Input } from '@/components/ui/input';
import type { ProviderFieldProps, ProviderToggleProps } from '@/types/provider-definition.types';

export function ProviderField({
  label,
  name,
  type,
  required,
  pattern,
  defaultValue,
  readOnly,
}: ProviderFieldProps): React.ReactElement {
  return (
    <label className="grid grid-cols-1 gap-2 text-sm font-medium">
      {label}
      <Input
        name={name}
        type={type ?? 'text'}
        required={required}
        pattern={pattern}
        readOnly={readOnly}
        defaultValue={defaultValue ?? ''}
      />
    </label>
  );
}

export function ProviderToggle({ name, label, checked }: ProviderToggleProps): React.ReactElement {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}
