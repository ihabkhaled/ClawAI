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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MEMORY_TYPE_LABELS } from "@/constants";
import { MemoryType } from "@/enums";
import type { CreateMemoryRequest, MemoryRecord } from "@/types";

type MemoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMemoryRequest) => void;
  isPending: boolean;
  memory?: MemoryRecord | null;
};

const MEMORY_TYPE_OPTIONS = Object.values(MemoryType);

export function MemoryForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  memory,
}: MemoryFormProps) {
  const [type, setType] = useState<MemoryType | "">(memory?.type ?? "");
  const [content, setContent] = useState(memory?.content ?? "");

  const isEditing = !!memory;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;

    onSubmit({ type, content });
  };

  const isValid = !!type && content.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Memory" : "Create Memory"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this memory record."
              : "Add a new memory record to persist context across conversations."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="memory-type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as MemoryType)}
            >
              <SelectTrigger id="memory-type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {MEMORY_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MEMORY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="memory-content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="memory-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the memory content..."
              rows={4}
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
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Memory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
