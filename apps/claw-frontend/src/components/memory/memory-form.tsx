import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MEMORY_TYPE_LABELS, MEMORY_TYPE_OPTIONS } from '@/constants';
import type { MemoryType } from '@/enums';
import { useMemoryFormState } from '@/hooks/memory/use-memory-form-state';
import { useTranslation } from '@/lib/i18n';
import type { MemoryFormProps } from '@/types';

export function MemoryForm({ open, onOpenChange, onSubmit, isPending, memory }: MemoryFormProps) {
  const { t } = useTranslation();
  const {
    type,
    setType,
    content,
    setContent,
    fieldErrors,
    isEditing,
    pendingLabel,
    submitLabel,
    handleSubmit,
    handleOpenChange,
  } = useMemoryFormState({ open, memory, onSubmit, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('memory.editMemory') : t('memory.createMemory')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('memory.editMemoryDesc') : t('memory.createMemoryDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="memory-type" className="text-sm font-medium">
              {t('memory.type')}
            </label>
            <Select
              value={type ?? undefined}
              onValueChange={(value) => setType(value as MemoryType)}
            >
              <SelectTrigger id="memory-type">
                <SelectValue placeholder={t('context.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {MEMORY_TYPE_OPTIONS.map((optType) => (
                  <SelectItem key={optType} value={optType}>
                    {t(MEMORY_TYPE_LABELS[optType])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.type ? (
              <p className="text-destructive mt-1 text-sm">{fieldErrors.type[0]}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="memory-content" className="text-sm font-medium">
              {t('memory.content')}
            </label>
            <Textarea
              id="memory-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('memory.contentPlaceholder')}
              rows={4}
            />
            {fieldErrors.content ? (
              <p className="text-destructive mt-1 text-sm">{fieldErrors.content[0]}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
