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
import { Textarea } from '@/components/ui/textarea';
import { CONTEXT_PACK_ITEM_TYPE_LABELS, CONTEXT_PACK_ITEM_TYPE_OPTIONS } from '@/constants';
import { ContextPackItemType } from '@/enums';
import { createContextPackItemSchema } from '@/lib/validation/context-pack.schema';
import type {
  ContextPackItemFormProps,
  CreateContextPackItemRequest,
  FormFieldErrors,
} from '@/types';

export function ContextPackItemForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ContextPackItemFormProps) {
  const [type, setType] = useState<ContextPackItemType>(ContextPackItemType.NOTE);
  const [content, setContent] = useState('');
  const [fileId, setFileId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  useEffect(() => {
    if (open) {
      setType(ContextPackItemType.NOTE);
      setContent('');
      setFileId('');
      setFieldErrors({});
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const isFileRef = type === ContextPackItemType.FILE_REFERENCE;
    const payload: Record<string, unknown> = { type };
    if (isFileRef && fileId.trim()) {
      payload.fileId = fileId;
    } else if (content.trim()) {
      payload.content = content;
    }

    const result = createContextPackItemSchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(result.data as CreateContextPackItemRequest);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  };

  const isFileRef = type === ContextPackItemType.FILE_REFERENCE;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Add a text note, instruction, or file reference to this context pack.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="item-type" className="text-sm font-medium">
              Type
            </label>
            <Select value={type} onValueChange={(value) => setType(value as ContextPackItemType)}>
              <SelectTrigger id="item-type">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {CONTEXT_PACK_ITEM_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONTEXT_PACK_ITEM_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.type ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.type[0]}</p>
            ) : null}
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
              {fieldErrors.fileId ? (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.fileId[0]}</p>
              ) : null}
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
              {fieldErrors.content ? (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.content[0]}</p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
