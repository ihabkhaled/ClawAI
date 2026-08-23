// One model rendered as a card. Used inside `ModelCardGrid` for the new
// "grid view" toggle on the cross-provider Models page. The card supports a
// passive presentational mode (no selection props) and a multi-select compare
// mode where clicking the card flips the `selected` state via the parent.
import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LIFECYCLE_LABELS, PROVIDER_DISPLAY_NAMES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ModelCardProps } from '@/types';
import { formatContextTokens, getLifecycleBadgeVariant } from '@/utilities';

export function ModelCard({ model, selected, onToggleSelect }: ModelCardProps): React.ReactElement {
  const { t } = useTranslation();
  const isSelectable = onToggleSelect !== undefined;
  const isSelected = selected === true;

  const baseClass = cn(
    'group relative flex flex-col gap-3 rounded-lg border bg-card p-4 text-start text-card-foreground transition-all duration-fast ease-quint-out',
    isSelectable &&
      'cursor-pointer hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isSelectable && isSelected && 'border-primary ring-2 ring-primary/40',
  );

  const handleClick = (): void => {
    if (!isSelectable) {
      return;
    }
    onToggleSelect(model.id);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (!isSelectable) {
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleSelect(model.id);
    }
  };

  const body = (
    <>
      {isSelectable ? (
        <span
          aria-hidden="true"
          className={cn(
            'bg-background absolute end-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
            isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
          )}
        >
          {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      ) : null}

      <div className="flex flex-col gap-0.5 pe-6">
        <h3 className="truncate text-sm font-semibold">{model.displayName}</h3>
        <p className="text-muted-foreground truncate text-xs">{model.modelKey}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="touch:text-xs text-[10px]">
          {PROVIDER_DISPLAY_NAMES[model.provider] ?? model.provider}
        </Badge>
        <Badge
          variant={getLifecycleBadgeVariant(model.lifecycle)}
          className="touch:text-xs text-[10px]"
        >
          {LIFECYCLE_LABELS[model.lifecycle] ?? model.lifecycle}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1">
        {model.supportsStreaming ? (
          <Badge variant="secondary" className="touch:text-xs text-[10px]">
            {t('models.streaming')}
          </Badge>
        ) : null}
        {model.supportsTools ? (
          <Badge variant="secondary" className="touch:text-xs text-[10px]">
            {t('models.tools')}
          </Badge>
        ) : null}
        {model.supportsVision ? (
          <Badge variant="secondary" className="touch:text-xs text-[10px]">
            {t('models.vision')}
          </Badge>
        ) : null}
      </div>

      <div className="text-muted-foreground mt-auto flex items-center justify-between text-xs">
        <span>{t('models.context')}</span>
        <span className="text-foreground font-medium">
          {formatContextTokens(model.maxContextTokens)}
        </span>
      </div>
    </>
  );

  // Selectable cards render as a `<button>` so screen readers and keyboard
  // users get standard "button" semantics + Enter/Space activation. When the
  // card is presentational (no selection props) it falls through to a `<div>`.
  if (!isSelectable) {
    return <div className={baseClass}>{body}</div>;
  }

  return (
    <Button
      variant="unstyled"
      size="unstyled"
      type="button"
      onClick={handleClick}
      onKeyDown={handleKey}
      aria-pressed={isSelected}
      className={baseClass}
    >
      {body}
    </Button>
  );
}
