import { Trash2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ADMIN_CURATION_NOTE_MAX,
  ADMIN_CURATION_PATTERN_MAX,
  ADMIN_CURATION_RULE_KINDS,
  ADMIN_CURATION_RULE_MATCHES,
} from '@/constants/plugin-admin-curation.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type {
  AdminCurationTabProps,
  UseAdminCurationRulesReturn,
} from '@/types/plugin-admin-curation.types';

import { AdminCurationListState } from './admin-curation-list-state';
import { AdminCurationSelect } from './admin-curation-select';

/** Allow and deny rules: the form to add one and the list of the ones in force. */
export function AdminCurationRulesTab({
  state,
  t,
}: AdminCurationTabProps<UseAdminCurationRulesReturn>): React.ReactElement {
  const { draft } = state;
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t('pluginsAdminCatalog.rules.help')}</p>
      <form
        className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          state.add();
        }}
      >
        <AdminCurationSelect
          id="curation-rule-kind"
          label={t('pluginsAdminCatalog.rules.kind')}
          value={draft.kind}
          options={ADMIN_CURATION_RULE_KINDS.map((item) => ({
            value: item.value,
            label: t(item.labelKey),
          }))}
          onChange={(value) => {
            state.setDraft('kind', value === 'ALLOW' ? 'ALLOW' : 'DENY');
          }}
        />
        <AdminCurationSelect
          id="curation-rule-match"
          label={t('pluginsAdminCatalog.rules.match')}
          value={draft.match}
          options={ADMIN_CURATION_RULE_MATCHES.map((item) => ({
            value: item.value,
            label: t(item.labelKey),
          }))}
          onChange={(value) => {
            const next = ADMIN_CURATION_RULE_MATCHES.find((item) => item.value === value);
            state.setDraft('match', next?.value ?? 'HOST');
          }}
        />
        <div className="space-y-1.5">
          <label htmlFor="curation-rule-pattern" className="text-xs font-medium">
            {t('pluginsAdminCatalog.rules.pattern')}
          </label>
          <Input
            id="curation-rule-pattern"
            dir="ltr"
            value={draft.pattern}
            maxLength={ADMIN_CURATION_PATTERN_MAX}
            onChange={(event) => {
              state.setDraft('pattern', event.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="curation-rule-note" className="text-xs font-medium">
            {t('pluginsAdminCatalog.rules.note')}
          </label>
          <Input
            id="curation-rule-note"
            value={draft.note}
            maxLength={ADMIN_CURATION_NOTE_MAX}
            onChange={(event) => {
              state.setDraft('note', event.target.value);
            }}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="sm:col-span-4 sm:justify-self-start"
          disabled={state.isAdding || draft.pattern.trim().length === 0}
        >
          {t('pluginsAdminCatalog.rules.add')}
        </Button>
      </form>
      {state.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={state.errorMessage} />
      )}
      <AdminCurationListState
        isLoading={state.isLoading}
        isError={state.isError}
        isEmpty={state.rules.length === 0}
        emptyKey="pluginsAdminCatalog.rules.empty"
        retry={state.retry}
        t={t}
      >
        <ul className="grid grid-cols-1 gap-3">
          {state.rules.map((rule) => (
            <li key={rule.id} className="min-w-0">
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <Badge variant={rule.kind === 'DENY' ? 'destructive' : 'success'}>
                    {rule.kind}
                  </Badge>
                  <Badge variant="outline">{rule.match}</Badge>
                  <code className="min-w-0 flex-1 text-sm break-all" dir="ltr">
                    {rule.pattern}
                  </code>
                  {rule.note === null ? null : (
                    <span className="text-muted-foreground text-xs">{rule.note}</span>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={t('pluginsAdminCatalog.rules.remove', { value: rule.pattern })}
                    onClick={() => {
                      state.remove(rule.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </AdminCurationListState>
    </div>
  );
}
