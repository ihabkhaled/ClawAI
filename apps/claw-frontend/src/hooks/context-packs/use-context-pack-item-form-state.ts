import { useEffect, useState } from 'react';

import { ContextPackItemType } from '@/enums';
import { createContextPackItemSchema } from '@/lib/validation/context-pack.schema';
import type {
  ContextPackItemFormStateParams,
  ContextPackItemFormStateReturn,
  CreateContextPackItemRequest,
  FormFieldErrors,
} from '@/types';

export function useContextPackItemFormState({
  open,
  onSubmit,
  onOpenChange,
}: ContextPackItemFormStateParams): ContextPackItemFormStateReturn {
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

  const isFileRef = type === ContextPackItemType.FILE_REFERENCE;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

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

  return {
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
  };
}
