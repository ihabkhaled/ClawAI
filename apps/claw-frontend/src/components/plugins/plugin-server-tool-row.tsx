import { Switch } from '@/components/ui/switch';
import type { PluginServerToolRowProps } from '@/types/plugin-servers.types';

import { PluginRiskBadge } from './plugin-risk-badge';

/** One discovered tool: its name and what the server says it does, the risk, and the switch. */
export function PluginServerToolRow({
  tool,
  onToggle,
  t,
}: PluginServerToolRowProps): React.ReactElement {
  return (
    <li className="flex items-start gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium break-all" dir="ltr">
            {tool.name}
          </span>
          <PluginRiskBadge risk={tool.riskLevel} t={t} />
        </div>
        {tool.description === '' ? null : (
          <p className="text-muted-foreground text-xs break-words">{tool.description}</p>
        )}
      </div>
      <Switch
        checked={tool.enabled}
        aria-label={t('pluginsServers.tools.enableLabel', { value: tool.name })}
        onCheckedChange={(enabled) => {
          onToggle(tool.name, enabled);
        }}
      />
    </li>
  );
}
