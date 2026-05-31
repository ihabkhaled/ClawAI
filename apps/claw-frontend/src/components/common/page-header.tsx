import type { PageHeaderProps } from '@/types/component.types';

export function PageHeader({
  title,
  description,
  actions,
  badges,
}: PageHeaderProps): React.ReactElement {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}
