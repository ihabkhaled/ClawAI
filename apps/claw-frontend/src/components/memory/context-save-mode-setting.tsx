'use client';

import { Switch } from '@/components/ui/switch';
import { CONTEXT_SAVE_MODE_ASK, CONTEXT_SAVE_MODE_AUTO } from '@/constants/context-save.constants';
import { useContextSaveMode } from '@/hooks/chat/use-context-save-mode';
import { useTranslation } from '@/lib/i18n';

/**
 * The way back from "Always save automatically" (ADR-168): the same per-account
 * choice the "Remember this" dialog offers, kept on the memory page where people
 * look for it. On means a remember request is saved at once; off means ClawAI
 * asks first.
 */
export function ContextSaveModeSetting(): React.ReactElement {
  const { t } = useTranslation();
  const { mode, setMode } = useContextSaveMode();
  const isAuto = mode === CONTEXT_SAVE_MODE_AUTO;

  return (
    <section
      aria-labelledby="context-save-mode-title"
      className="border-border bg-card mt-6 flex items-center justify-between gap-4 rounded-lg border p-4"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id="context-save-mode-title" className="text-sm font-medium">
          {t('memory.saveMode.title')}
        </h2>
        <p className="text-muted-foreground text-xs">
          {isAuto ? t('memory.saveMode.descriptionAuto') : t('memory.saveMode.descriptionAsk')}
        </p>
      </div>
      <Switch
        checked={isAuto}
        onCheckedChange={(checked) =>
          setMode(checked ? CONTEXT_SAVE_MODE_AUTO : CONTEXT_SAVE_MODE_ASK)
        }
        aria-label={t('memory.saveMode.switchLabel')}
      />
    </section>
  );
}
