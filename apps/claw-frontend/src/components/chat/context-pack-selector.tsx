import { useContextPacks } from '@/hooks/context-packs/use-context-packs';
import type { ContextPackSelectorProps } from '@/types';

export function ContextPackSelector({
  t,
  selectedIds,
  onChange,
}: ContextPackSelectorProps): React.ReactElement {
  const { contextPacks, isLoading } = useContextPacks();

  const handleToggle = (packId: string): void => {
    if (selectedIds.includes(packId)) {
      onChange(selectedIds.filter((id) => id !== packId));
    } else {
      onChange([...selectedIds, packId]);
    }
  };

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (contextPacks.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        {t('chat.noContextPacks')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contextPacks.map((pack) => (
        <label
          key={pack.id}
          className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(pack.id)}
            onChange={() => handleToggle(pack.id)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-medium">{pack.name}</span>
            {pack.description ? (
              <span className="truncate text-xs text-muted-foreground">
                {pack.description}
              </span>
            ) : null}
          </div>
        </label>
      ))}
    </div>
  );
}
