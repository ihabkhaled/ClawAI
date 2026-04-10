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
import type { ContextPackItemType } from '@/enums';
import { useContextPackItemFormState } from '@/hooks/context-packs/use-context-pack-item-form-state';
import type { ContextPackItemFormProps } from '@/types';

export function ContextPackItemForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: ContextPackItemFormProps) {
  const {
    type,
    setType,
    content,
    setContent,
    fileId,
    setFileId,
    fieldErrors,
    isFileRef,
    handleSubmit,
    handleOpenChange,
  } = useContextPackItemFormState({ open, onSubmit, onOpenChange });

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
