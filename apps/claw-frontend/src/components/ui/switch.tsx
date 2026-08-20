import { cn } from '@/lib/utils';

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'peer focus-visible:ring-ring focus-visible:ring-offset-background relative inline-flex h-11 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-transparent p-0 before:absolute before:inset-x-0 before:top-1/2 before:h-6 before:-translate-y-1/2 before:rounded-full before:transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'before:bg-primary' : 'before:bg-input',
        className,
      )}
    >
      <span
        className={cn(
          'bg-background pointer-events-none relative z-10 block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export { Switch };
export type { SwitchProps };
