'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import type { ModelFamilyDialogProps } from '@/types';
import { sortCatalogModelsByRecency } from '@/utilities/public-models.utility';

/**
 * Every model one provider can actually serve here.
 *
 * The roster card shows only a six-name sample, which is the right amount of
 * information for a landing page but leaves a visitor unable to answer the one
 * question they came with: "is the model I use on this list?". This is that
 * list, in full, without sending them to another page first.
 *
 * Same ordering as the card (newest first), so the six names they just read
 * stay at the top instead of being reshuffled by the dialog.
 *
 * No prices or cost rates: rule 37 forbids a provider rate in any non-admin
 * response, and `PublicCatalogModel` deliberately carries none.
 */
export function ModelFamilyDialog({
  provider,
  open,
  onOpenChange,
}: ModelFamilyDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const models = sortCatalogModelsByRecency(provider.provider, provider.models);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{provider.displayName}</DialogTitle>
          <DialogDescription>
            {t('marketing.home.modelRoster.modelsDialogDescription', {
              provider: provider.displayName,
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Scrolls rather than growing: a provider with sixty models must not
            push the close button off a phone screen. */}
        <ul className="-mx-1 max-h-[60vh] space-y-1 overflow-y-auto px-1">
          {models.map((model) => (
            <li
              key={model.modelKey}
              className="border-border/60 flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-medium">{model.displayName}</span>
              {model.maxContextTokens === null ? null : (
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {Math.round(model.maxContextTokens / 1000)}K
                </span>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
