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
import { Textarea } from "@/components/ui/textarea";
import { CONTEXT_PACK_ITEM_TYPE_LABELS } from "@/constants";
import { ContextPackItemType } from "@/enums";
import type { CreateContextPackItemRequest } from "@/types";

type ContextPackItemFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContextPackItemRequest) => void;
  isPending: boolean;
};

const ITEM_TYPE_OPTIONS = Object.values(ContextPackItemType);

export function ContextPackItemForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ContextPackItemFormProps) {
  const [type, setType] = useState<ContextPackItemType | "">(
    ContextPackItemType.NOTE,
  );
  const [content, setContent] = useState("");
  const [fileId, setFileId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;

    const data: CreateContextPackItemRequest = { type };
    if (type === ContextPackItemType.FILE_REFERENCE && fileId.trim()) {
      data.fileId = fileId;
    } else if (content.trim()) {
      data.content = content;
    }
    onSubmit(data);
  };

  const isFileRef = type === ContextPackItemType.FILE_REFERENCE;
  const isValid = !!type && (isFileRef ? fileId.trim().length > 0 : content.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Add a text note, instruction, or file reference to this context
            pack.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="item-type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(value) =>
                setType(value as ContextPackItemType)
              }
            >
              <SelectTrigger id="item-type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONTEXT_PACK_ITEM_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isFileRef ? (
            <div className="grid gap-2">
              <label htmlFor="item-file-id" className="text-sm font-medium">
                File ID
              </label>
              <Input
                id="item-file-id"
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                placeholder="Enter file ID"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <label htmlFor="item-content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="item-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the content..."
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
