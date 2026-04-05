import { useEffect, useState } from 'react';

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
import { ROUTING_MODE_OPTIONS, ROUTING_MODE_LABELS, POLICY_FORM_DEFAULTS } from '@/constants';
import type { RoutingMode } from '@/enums';
import { createRoutingPolicySchema } from '@/lib/validation/routing.schema';
import type { FormFieldErrors, PolicyFormProps } from '@/types';

export function PolicyForm({ open, onOpenChange, onSubmit, isPending, policy }: PolicyFormProps) {
  const [name, setName] = useState(policy?.name ?? POLICY_FORM_DEFAULTS.name);
  const [routingMode, setRoutingMode] = useState<RoutingMode>(
    policy?.routingMode ?? POLICY_FORM_DEFAULTS.routingMode,
  );
  const [priority, setPriority] = useState(policy?.priority ?? POLICY_FORM_DEFAULTS.priority);
  const [isActive, setIsActive] = useState(policy?.isActive ?? POLICY_FORM_DEFAULTS.isActive);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  const isEditing = !!policy;

  useEffect(() => {
    setFieldErrors({});
  }, [open]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const formData = {
      name: name.trim(),
      routingMode,
      priority,
      isActive,
      config: policy?.config ?? POLICY_FORM_DEFAULTS.config,
    };

    const result = createRoutingPolicySchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(formData);
  };

  const pendingLabel = isEditing ? 'Saving...' : 'Creating...';
  const submitLabel = isEditing ? 'Save Changes' : 'Create Policy';

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
