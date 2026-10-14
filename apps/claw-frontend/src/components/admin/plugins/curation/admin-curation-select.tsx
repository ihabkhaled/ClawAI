import type { AdminCurationSelectProps } from '@/types/plugin-admin-curation.types';

/** A labelled native select, used by the curation forms and filters. */
export function AdminCurationSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: AdminCurationSelectProps): React.ReactElement {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
