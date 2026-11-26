import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

import { ModelPicker } from '@/components/chat/model-picker';
import { Button } from '@/components/ui/button';
import { LiveModelChainDirection } from '@/enums/live-model-chain.enum';
import type { AdminLiveModelChainRowProps } from '@/types/live-admin.types';

/** One model of a chain: the chat model picker, move up/down, remove. */
export function AdminLiveModelChainRow({
  editor,
  index,
  count,
  value,
  groups,
  isLoading,
  t,
  actions,
}: AdminLiveModelChainRowProps): React.ReactElement {
  const position = { position: index + 1 };
  const id = `admin-live-${editor.kind}-${String(index)}`;
  return (
    <li className="flex min-w-0 items-center gap-2" data-testid={id}>
      <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">{index + 1}.</span>
      <div className="min-w-0 flex-1">
        <ModelPicker
          id={id}
          groups={groups}
          value={value}
          onChange={(next) => actions.setChainModel(editor.kind, index, next)}
          isLoading={isLoading}
          ariaLabel={t('live.admin.modelPosition', position)}
          placeholder={t('live.admin.modelPlaceholder')}
          loadingPlaceholder={t('live.admin.loading')}
          emptyPlaceholder={t('live.admin.modelPlaceholder')}
          searchPlaceholder={t('common.search')}
          noResultsLabel={t('common.noResults')}
        />
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('live.admin.moveUp', position)}
        disabled={index === 0}
        onClick={() => actions.moveChainRow(editor.kind, index, LiveModelChainDirection.UP)}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('live.admin.moveDown', position)}
        disabled={index === count - 1}
        onClick={() => actions.moveChainRow(editor.kind, index, LiveModelChainDirection.DOWN)}
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('live.admin.removeModel', position)}
        disabled={count <= editor.min}
        onClick={() => actions.removeChainRow(editor.kind, index)}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </li>
  );
}
