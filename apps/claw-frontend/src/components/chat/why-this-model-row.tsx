import type { WhyThisModelRowProps } from '@/types/why-this-model-row.types';

export function WhyThisModelRow({
  label,
  children,
}: WhyThisModelRowProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}
