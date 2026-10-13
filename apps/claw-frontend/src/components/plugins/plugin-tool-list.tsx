import type { PluginToolListProps } from '@/types/plugins.types';

import { PluginRiskBadge } from './plugin-risk-badge';

/** What the plugin can do: one row per tool with its risk. */
export function PluginToolList({ tools, t }: PluginToolListProps): React.ReactElement {
  if (tools.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('plugins.detail.toolsEmpty')}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {tools.map((tool) => (
        <li key={tool.name} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{tool.title}</p>
            <code className="text-muted-foreground block text-xs break-all" dir="ltr">
              {tool.name}
            </code>
            <p className="text-muted-foreground text-sm">{tool.description}</p>
          </div>
          <div className="sm:shrink-0">
            <PluginRiskBadge risk={tool.riskLevel} t={t} />
          </div>
        </li>
      ))}
    </ul>
  );
}
