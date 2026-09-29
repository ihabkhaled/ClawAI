import { Eraser, Trash2 } from 'lucide-react';

import { MaskEditorCanvas } from '@/components/chat/mask-editor-canvas';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  MASK_BRUSH_MAX_PERCENT,
  MASK_BRUSH_MIN_PERCENT,
  MASK_BRUSH_STEP_PERCENT,
} from '@/constants/image-mask-editor.constants';
import { MaskBrushMode } from '@/enums/mask-brush-mode.enum';
import { useMaskEditorDialog } from '@/hooks/chat/use-mask-editor-dialog';
import { useTranslation } from '@/lib/i18n';
import type { UseMaskEditorDialogParams } from '@/types/image-mask-editor.types';

/**
 * The inside of the mask dialog: canvas, brush controls, Apply. Mounted only
 * while the dialog is open, so the image is downloaded and the canvas built on
 * demand and thrown away on close.
 */
export function MaskEditDialogBody(props: UseMaskEditorDialogParams): React.ReactElement {
  const { t } = useTranslation();
  const dialog = useMaskEditorDialog(props);
  const { editor } = dialog;
  const erasing = editor.mode === MaskBrushMode.Erase;
  const keyboardStatus = editor.isKeyboardPainting
    ? t('chat.maskEdit.paintingOn')
    : t('chat.maskEdit.paintingOff');

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {dialog.imageFailed ? (
        <p role="alert" className="text-destructive text-sm" data-testid="mask-edit-image-failed">
          {t('chat.maskEdit.imageFailed')}
        </p>
      ) : null}
      {dialog.imageUrl === null && !dialog.imageFailed ? (
        <p role="status" className="text-muted-foreground text-sm">
          {t('chat.maskEdit.loading')}
        </p>
      ) : null}
      {dialog.imageUrl === null ? null : (
        <MaskEditorCanvas
          imageUrl={dialog.imageUrl}
          imageAlt={dialog.imageAlt}
          canvasLabel={t('chat.maskEdit.canvasLabel')}
          hintId={dialog.hintId}
          editor={editor}
        />
      )}
      <p id={dialog.hintId} className="text-muted-foreground text-xs">
        {t('chat.maskEdit.keyboardHint')}
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {keyboardStatus}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label
          htmlFor={dialog.brushId}
          className="flex min-w-0 flex-1 basis-48 items-center gap-2 text-sm"
        >
          <span className="shrink-0">{t('chat.maskEdit.brushSize')}</span>
          <input
            id={dialog.brushId}
            type="range"
            min={MASK_BRUSH_MIN_PERCENT}
            max={MASK_BRUSH_MAX_PERCENT}
            step={MASK_BRUSH_STEP_PERCENT}
            value={editor.brushPercent}
            onChange={dialog.onBrushChange}
            className="min-h-11 min-w-0 flex-1"
            data-testid="mask-editor-brush"
          />
        </label>
        <div className="flex items-center gap-2 text-sm">
          <Eraser className="h-4 w-4" aria-hidden="true" />
          <span>{t('chat.maskEdit.erase')}</span>
          <Switch
            checked={erasing}
            onCheckedChange={dialog.onErase}
            aria-label={t('chat.maskEdit.erase')}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={editor.clear}
          disabled={!editor.hasPaint}
          data-testid="mask-editor-clear"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('chat.maskEdit.clear')}
        </Button>
      </div>

      {dialog.errorMessage === null ? null : (
        <p role="alert" className="text-destructive text-sm" data-testid="mask-edit-error">
          {dialog.errorMessage}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={props.onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          onClick={dialog.onApply}
          disabled={!dialog.canApply}
          isLoading={dialog.isSaving}
          data-testid="mask-editor-apply"
        >
          {dialog.isSaving ? t('chat.maskEdit.applying') : t('chat.maskEdit.apply')}
        </Button>
      </DialogFooter>
    </div>
  );
}
