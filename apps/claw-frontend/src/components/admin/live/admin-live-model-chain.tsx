import { Plus } from 'lucide-react';

import { AdminLiveModelChainRow } from '@/components/admin/live/admin-live-model-chain-row';
import { Button } from '@/components/ui/button';
import type { AdminLiveModelChainProps } from '@/types/live-admin.types';
import { liveModelRefValue } from '@/utilities/live-model-chain.utility';

/** One ordered model list of the policy (first model, then fallbacks or extra agents). */
export function AdminLiveModelChain({
  editor,
  chain,
  groups,
  isLoading,
  invalid,
  t,
  actions,
}: AdminLiveModelChainProps): React.ReactElement {
  const titleId = `admin-live-${editor.kind}-title`;
  return (
    <fieldset
      aria-labelledby={titleId}
      className="border-border flex min-w-0 flex-col gap-2 rounded-lg border p-3"
      data-testid={`admin-live-${editor.kind}`}
    >
      <legend id={titleId} className="text-foreground px-1 text-sm font-semibold">
        {t(editor.titleKey, { max: editor.max })}
      </legend>
      <p className="text-muted-foreground text-xs">{t(editor.hintKey)}</p>
      <ol className="flex flex-col gap-2">
        {chain.map((ref, index) => (
          <AdminLiveModelChainRow
            key={`${String(index)}-${liveModelRefValue(ref)}`}
            editor={editor}
            index={index}
            count={chain.length}
            value={liveModelRefValue(ref)}
            groups={groups}
            isLoading={isLoading}
            t={t}
            actions={actions}
          />
        ))}
      </ol>
      {invalid ? (
        <p role="alert" className="text-destructive text-xs">
          {t('live.admin.chainLimit', { min: editor.min, max: editor.max })}
        </p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={chain.length >= editor.max}
        onClick={() => actions.addChainRow(editor.kind)}
        data-testid={`admin-live-${editor.kind}-add`}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t(editor.addKey)}
      </Button>
    </fieldset>
  );
}
