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
import { ROUTING_MODE_OPTIONS, ROUTING_MODE_LABELS } from '@/constants';
import type { RoutingMode } from '@/enums';
import { usePolicyFormState } from '@/hooks/routing/use-policy-form-state';
import type { PolicyFormProps } from '@/types';

export function PolicyForm({ open, onOpenChange, onSubmit, isPending, policy }: PolicyFormProps) {
  const {
    name,
    setName,
    routingMode,
    setRoutingMode,
    priority,
    setPriority,
    isActive,
    setIsActive,
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
          <DialogTitle>{isEditing ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the routing policy configuration.'
              : 'Create a new routing policy to control request distribution.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="policy-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="policy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Routing Policy"
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="policy-mode" className="text-sm font-medium">
              Routing Mode
            </label>
            <Select
              value={routingMode}
              onValueChange={(value) => setRoutingMode(value as RoutingMode)}
            >
              <SelectTrigger id="policy-mode">
                <SelectValue placeholder="Select routing mode" />
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
              <p className="mt-1 text-sm text-destructive">{fieldErrors.routingMode[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="policy-priority" className="text-sm font-medium">
              Priority
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
              <p className="mt-1 text-sm text-destructive">{fieldErrors.priority[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="policy-active" className="text-sm font-medium">
              Status
            </label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(value) => setIsActive(value === 'active')}
            >
              <SelectTrigger id="policy-active">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
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
