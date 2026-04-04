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
import { Textarea } from "@/components/ui/textarea";
import type { CreateContextPackRequest } from "@/types";

type ContextPackFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContextPackRequest) => void;
  isPending: boolean;
};

export function ContextPackForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ContextPackFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateContextPackRequest = { name };
    if (description.trim()) data.description = description;
    if (scope.trim()) data.scope = scope;
    onSubmit(data);
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Context Pack</DialogTitle>
          <DialogDescription>
            Create a new context pack to group instructions, notes, and file
            references for AI interactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="pack-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="pack-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My context pack"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="pack-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="pack-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this pack is for..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="pack-scope" className="text-sm font-medium">
              Scope (optional)
            </label>
            <Input
              id="pack-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g. global, project-specific"
            />
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
              {isPending ? "Creating..." : "Create Pack"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
