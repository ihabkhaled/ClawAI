import { Button } from '@/components/ui/button';
import { usePluralText } from '@/hooks/use-plural-text';
import type { ImportedPluginCardProps } from '@/types/plugin-import.types';
import { shortCommit } from '@/utilities/plugin-import.utility';

/** One imported plugin: where it came from, how much it holds, and a way to remove it. */
export function ImportedPluginCard({
  plugin,
  busy,
  onRemove,
  t,
}: ImportedPluginCardProps): React.ReactElement {
  const plural = usePluralText();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium break-all">
          {plugin.name} <span className="text-muted-foreground">{plugin.version}</span>
        </p>
        <p dir="ltr" className="text-muted-foreground text-xs break-all">
          {plugin.source.ref}
          {plugin.source.commitSha === null ? '' : ` (${shortCommit(plugin.source.commitSha)})`}
        </p>
        <p className="text-muted-foreground text-xs">
          {t('pluginQa.count.summary', {
            items: plural(t, 'pluginQa.count.items', plugin.preview.components.length),
            files: plural(t, 'pluginQa.count.files', plugin.fileCount),
          })}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          onRemove(plugin);
        }}
      >
        {t('pluginImport.imported.remove')}
      </Button>
    </li>
  );
}
