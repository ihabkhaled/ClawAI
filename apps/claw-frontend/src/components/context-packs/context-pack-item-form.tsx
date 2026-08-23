import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CONTEXT_PACK_ITEM_TYPE_LABELS, CONTEXT_PACK_ITEM_TYPE_OPTIONS } from '@/constants';
import type { ContextPackItemType } from '@/enums';
import { useContextPackItemFormState } from '@/hooks/context-packs/use-context-pack-item-form-state';
import { useTranslation } from '@/lib/i18n';
import type { ContextPackItemFormProps } from '@/types';

export function ContextPackItemForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ContextPackItemFormProps) {
  const { t } = useTranslation();
  const {
    type,
    setType,
    content,
    setContent,
    fileId,
    setFileId,
    fieldErrors,
    isFileRef,
    handleSubmit,
    handleOpenChange,
  } = useContextPackItemFormState({ open, onSubmit, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('context.addItem')}</DialogTitle>
          <DialogDescription>{t('context.addItemDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="item-type" className="text-sm font-medium">
              {t('context.itemType')}
            </label>
            <Select value={type} onValueChange={(value) => setType(value as ContextPackItemType)}>
              <SelectTrigger id="item-type">
                <SelectValue placeholder={t('context.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_PACK_ITEM_TYPE_OPTIONS.map((optType) => (
                  <SelectItem key={optType} value={optType}>
                    {t(CONTEXT_PACK_ITEM_TYPE_LABELS[optType])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.type ? (
              <p className="text-destructive mt-1 text-sm">{fieldErrors.type[0]}</p>
            ) : null}
          </div>

          {isFileRef ? (
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="item-file-id" className="text-sm font-medium">
                {t('context.fileId')}
              </label>
              <Input
                id="item-file-id"
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                placeholder={t('context.fileIdPlaceholder')}
              />
              {fieldErrors.fileId ? (
                <p className="text-destructive mt-1 text-sm">{fieldErrors.fileId[0]}</p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="item-content" className="text-sm font-medium">
                {t('context.content')}
              </label>
              <Textarea
                id="item-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('context.contentPlaceholder')}
                rows={4}
              />
              {fieldErrors.content ? (
                <p className="text-destructive mt-1 text-sm">{fieldErrors.content[0]}</p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('context.adding') : t('context.addItem')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
