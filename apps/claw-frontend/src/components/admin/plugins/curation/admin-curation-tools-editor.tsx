import { Loader2, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ADMIN_CURATION_RISKS } from '@/constants/plugin-admin-curation.constants';
import { usePluralText } from '@/hooks/use-plural-text';
import type { AdminCurationToolsEditorProps } from '@/types/plugin-admin-curation.types';

import { AdminCurationSelect } from './admin-curation-select';

/** The tools of the entry: Preview asks the server for its real tool list; each tool has a risk and a switch. */
export function AdminCurationToolsEditor({
  state,
  t,
}: AdminCurationToolsEditorProps): React.ReactElement {
  const plural = usePluralText();
  const riskOptions = ADMIN_CURATION_RISKS.map((risk) => ({
    value: risk.value,
    label: t(risk.labelKey),
  }));
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t('pluginsAdminCatalog.form.toolsTitle')}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={state.isPreviewing || state.values.url.trim().length === 0}
          onClick={state.preview}
        >
          {state.isPreviewing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          {t('pluginsAdminCatalog.form.preview')}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t('pluginsAdminCatalog.form.toolsHelp')}</p>
      {state.skippedCount > 0 ? (
        <p className="text-warning text-xs">
          {plural(t, 'pluginQa.count.toolsSkipped', state.skippedCount)}
        </p>
      ) : null}
      <ul className="divide-y">
        {state.values.tools.map((tool) => (
          <li key={tool.name} className="flex flex-wrap items-center gap-3 py-2">
            <Checkbox
              id={`curation-tool-${tool.name}`}
              checked={tool.selected}
              disabled={!tool.curatable}
              aria-label={tool.name}
              onCheckedChange={(checked) => {
                state.toggleTool(tool.name, checked === true);
              }}
            />
            <div className="min-w-0 flex-1">
              <code className="text-xs break-all" dir="ltr">
                {tool.name}
              </code>
              {tool.curatable ? null : (
                <Badge variant="warning" className="ms-2">
                  {t('pluginsAdminCatalog.form.toolNameUnusable')}
                </Badge>
              )}
            </div>
            <div className="w-36">
              <AdminCurationSelect
                id={`curation-risk-${tool.name}`}
                label={t('pluginsAdminCatalog.form.risk')}
                value={tool.riskLevel}
                options={riskOptions}
                disabled={!tool.curatable}
                onChange={(value) => {
                  state.setToolRisk(
                    tool.name,
                    ADMIN_CURATION_RISKS.find((risk) => risk.value === value)?.value ?? 'WRITE',
                  );
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
