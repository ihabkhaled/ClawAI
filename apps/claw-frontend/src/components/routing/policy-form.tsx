import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROUTING_MODE_OPTIONS,
  ROUTING_MODE_LABELS,
  POLICY_FORM_DEFAULTS,
} from "@/constants";
import type { RoutingMode } from "@/enums";
import type { RoutingPolicy, CreatePolicyRequest } from "@/types";

type PolicyFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePolicyRequest) => void;
  isPending: boolean;
  policy?: RoutingPolicy | null;
};

export function PolicyForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  policy,
}: PolicyFormProps) {
  const [name, setName] = useState(
    policy?.name ?? POLICY_FORM_DEFAULTS.name,
  );
  const [routingMode, setRoutingMode] = useState<RoutingMode>(
    policy?.routingMode ?? POLICY_FORM_DEFAULTS.routingMode,
  );
  const [priority, setPriority] = useState(
    policy?.priority ?? POLICY_FORM_DEFAULTS.priority,
  );
  const [isActive, setIsActive] = useState(
    policy?.isActive ?? POLICY_FORM_DEFAULTS.isActive,
  );

  const isEditing = !!policy;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      routingMode,
      priority,
      isActive,
      config: policy?.config ?? POLICY_FORM_DEFAULTS.config,
    });
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Policy" : "Create Policy"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the routing policy configuration."
              : "Create a new routing policy to control request distribution."}
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
          </div>

          <div className="grid gap-2">
            <label htmlFor="policy-active" className="text-sm font-medium">
              Status
            </label>
            <Select
              value={isActive ? "active" : "inactive"}
              onValueChange={(value) => setIsActive(value === "active")}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
