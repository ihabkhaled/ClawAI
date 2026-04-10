import { useEffect, useState } from 'react';

import { createContextPackSchema } from '@/lib/validation/context-pack.schema';
import type {
  ContextPackFormStateParams,
  ContextPackFormStateReturn,
  CreateContextPackRequest,
  FormFieldErrors,
} from '@/types';

export function useContextPackFormState({
  open,
  onSubmit,
  onOpenChange,
}: ContextPackFormStateParams): ContextPackFormStateReturn {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setScope('');
      setFieldErrors({});
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const payload: Record<string, unknown> = { name };
    if (description.trim()) {
      payload.description = description;
    }
    if (scope.trim()) {
      payload.scope = scope;
    }

    const result = createContextPackSchema.safeParse(payload);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(result.data as CreateContextPackRequest);
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setFieldErrors({});
    }
    onOpenChange(nextOpen);
  };

  return {
    name,
    setName,
    description,
    setDescription,
    scope,
    setScope,
    fieldErrors,
    handleSubmit,
    handleOpenChange,
  };
}
