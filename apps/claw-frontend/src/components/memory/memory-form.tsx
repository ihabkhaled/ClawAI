import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MEMORY_TYPE_LABELS, MEMORY_TYPE_OPTIONS } from '@/constants';
import type { MemoryType } from '@/enums';
import { useMemoryFormState } from '@/hooks/memory/use-memory-form-state';
import type { MemoryFormProps } from '@/types';

export function MemoryForm({ open, onOpenChange, onSubmit, isPending, memory }: MemoryFormProps) {
  const {
    type,
    setType,
    content,
    setContent,
    fieldErrors,
    isEditing,
    pendingLabel,
    submitLabel,
    handleSubmit,
    handleOpenChange,
  } = useMemoryFormState({ open, memory, onSubmit, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Memory' : 'Create Memory'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this memory record.'
              : 'Add a new memory record to persist context across conversations.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="memory-type" className="text-sm font-medium">
              Type
            </label>
            <Select
              value={type ?? undefined}
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
            {fieldErrors.type ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.type[0]}</p>
            ) : null}
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
            {fieldErrors.content ? (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.content[0]}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
