import { PLUGIN_FALLBACK_ICON, PLUGIN_ICONS } from '@/constants/plugins.constants';
import { cn } from '@/lib/utils';
import type { PluginIconProps } from '@/types/plugins.types';

/** The plugin icon from the fixed map; a server-supplied key can never load a remote image. */
export function PluginIcon({ iconKey, className }: PluginIconProps): React.ReactElement {
  const Icon = PLUGIN_ICONS[iconKey] ?? PLUGIN_FALLBACK_ICON;
  return <Icon className={cn('h-5 w-5', className)} aria-hidden="true" />;
}
