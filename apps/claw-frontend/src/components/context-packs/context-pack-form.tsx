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
import { Textarea } from '@/components/ui/textarea';
import { useContextPackFormState } from '@/hooks/context-packs/use-context-pack-form-state';
import { useTranslation } from '@/lib/i18n';
import type { ContextPackFormProps } from '@/types';

export function ContextPackForm({ open, onOpenChange, onSubmit, isPending }: ContextPackFormProps) {
  const { t } = useTranslation();
  const {
    name,
    setName,
    description,
    setDescription,
    scope,
    setScope,
    fieldErrors,
    handleSubmit,
    handleOpenChange,
  } = useContextPackFormState({ open, onSubmit, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('context.createPack')}</DialogTitle>
          <DialogDescription>
            {t('context.createPackDesc')}
            interactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="pack-name" className="text-sm font-medium">
              {t('context.name')}
            </label>
            <Input
              id="pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('context.namePlaceholder')}
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="pack-description" className="text-sm font-medium">
              {t('context.descriptionOptional')}
            </label>
            <Textarea
              id="pack-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('context.descriptionPlaceholder')}
              rows={3}
            />
            {fieldErrors.description ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.description[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="pack-scope" className="text-sm font-medium">
              {t('context.scopeOptional')}
            </label>
            <Input
              id="pack-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder={t('context.scopePlaceholder')}
            />
            {fieldErrors.scope ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.scope[0]}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('context.creating') : t('context.createPack')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
