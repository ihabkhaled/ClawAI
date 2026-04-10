import { useEffect, useState } from 'react';

import type { MemoryType } from '@/enums';
import { createMemorySchema } from '@/lib/validation/memory.schema';
import type {
  CreateMemoryRequest,
  FormFieldErrors,
  MemoryFormStateParams,
  MemoryFormStateReturn,
} from '@/types';

export function useMemoryFormState({
  open,
  memory,
  onSubmit,
  onOpenChange,
}: MemoryFormStateParams): MemoryFormStateReturn {
  const [type, setType] = useState<MemoryType | null>(memory?.type ?? null);
  const [content, setContent] = useState(memory?.content ?? '');
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  const isEditing = !!memory;

  useEffect(() => {
    if (open) {
      setType(memory?.type ?? null);
      setContent(memory?.content ?? '');
      setFieldErrors({});
    }
  }, [open, memory]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const result = createMemorySchema.safeParse({ type, content });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(result.data as CreateMemoryRequest);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  };

  const pendingLabel = isEditing ? 'Saving...' : 'Creating...';
  const submitLabel = isEditing ? 'Save Changes' : 'Create Memory';

  return {
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
  };
}
