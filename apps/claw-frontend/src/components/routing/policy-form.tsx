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
import { ROUTING_MODE_OPTIONS, ROUTING_MODE_LABELS } from '@/constants';
import type { RoutingMode } from '@/enums';
import { usePolicyFormState } from '@/hooks/routing/use-policy-form-state';
import { useTranslation } from '@/lib/i18n';
import type { PolicyFormProps } from '@/types';

export function PolicyForm({ open, onOpenChange, onSubmit, isPending, policy }: PolicyFormProps) {
  const { t } = useTranslation();
  const {
    name,
    setName,
    routingMode,
    setRoutingMode,
    priority,
    setPriority,
    isActive,
    setIsActive,
    weightsJsonText,
    setWeightsJsonText,
    weightsJsonError,
    fieldErrors,
    isEditing,
    pendingLabel,
    submitLabel,
    handleSubmit,
  } = usePolicyFormState({ open, policy, onSubmit, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('routing.editPolicy') : t('routing.createPolicy')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('routing.editPolicyDesc') : t('routing.createPolicyDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="policy-name" className="text-sm font-medium">
              {t('routing.name')}
            </label>
            <Input
              id="policy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('routing.namePlaceholder')}
            />
            {fieldErrors.name ? (
              <p className="text-destructive mt-1 text-sm">{fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="policy-mode" className="text-sm font-medium">
              {t('routing.mode')}
            </label>
            <Select
              value={routingMode}
              onValueChange={(value) => setRoutingMode(value as RoutingMode)}
            >
              <SelectTrigger id="policy-mode">
                <SelectValue placeholder={t('routing.selectModePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {ROUTING_MODE_OPTIONS.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {ROUTING_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.routingMode ? (
              <p className="text-destructive mt-1 text-sm">{fieldErrors.routingMode[0]}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="policy-priority" className="text-sm font-medium">
              {t('routing.priority')}
            </label>
            <Input
              id="policy-priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={0}
              max={100}
            />
            {fieldErrors.priority ? (
              <p className="text-destructive mt-1 text-sm">{fieldErrors.priority[0]}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="policy-active" className="text-sm font-medium">
              {t('routing.status')}
            </label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(value) => setIsActive(value === 'active')}
            >
              <SelectTrigger id="policy-active">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('routing.active')}</SelectItem>
                <SelectItem value="inactive">{t('routing.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="policy-weights-json" className="text-sm font-medium">
              {t('routing.weightsJsonLabel')}
            </label>
            <Textarea
              id="policy-weights-json"
              value={weightsJsonText}
              onChange={(e) => setWeightsJsonText(e.target.value)}
              placeholder={t('routing.weightsJsonPlaceholder')}
              className="font-mono text-xs"
              rows={10}
            />
            <p className="text-muted-foreground text-xs">{t('routing.weightsJsonHelp')}</p>
            {weightsJsonError ? (
              <p className="text-destructive mt-1 text-sm">{t(weightsJsonError)}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
