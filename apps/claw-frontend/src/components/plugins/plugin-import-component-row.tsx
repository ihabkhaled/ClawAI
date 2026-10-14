import { Badge } from '@/components/ui/badge';
import {
  PLUGIN_IMPORT_KIND_KEYS,
  PLUGIN_IMPORT_SUPPORT_KEYS,
  PLUGIN_IMPORT_SUPPORT_VARIANTS,
} from '@/constants/plugin-import.constants';
import type { PluginImportComponentRowProps } from '@/types/plugin-import.types';
import { pluginImportReasonKey } from '@/utilities/plugin-import.utility';

/** One component of the plugin: its kind, name, and what ClawAI does with it today. */
export function PluginImportComponentRow({
  component,
  t,
}: PluginImportComponentRowProps): React.ReactElement {
  const reasonKey = pluginImportReasonKey(component.reasonKey);
  return (
    <li className="flex flex-col gap-1 rounded-md border p-3" data-testid="plugin-import-component">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{t(PLUGIN_IMPORT_KIND_KEYS[component.kind])}</Badge>
        <span className="text-sm font-medium break-all">{component.name}</span>
        <Badge variant={PLUGIN_IMPORT_SUPPORT_VARIANTS[component.support]}>
          {t(PLUGIN_IMPORT_SUPPORT_KEYS[component.support])}
        </Badge>
      </div>
      {component.url === undefined ? null : (
        <p dir="ltr" className="text-muted-foreground text-xs break-all">
          {component.url}
        </p>
      )}
      {component.description === '' ? null : (
        <p className="text-muted-foreground text-xs">{component.description}</p>
      )}
      {reasonKey === undefined ? null : (
        <p className="text-muted-foreground text-xs">{t(reasonKey)}</p>
      )}
    </li>
  );
}
