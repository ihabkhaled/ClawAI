import { useState } from 'react';

import type { PromptTemplateFormProps, PromptTemplateFormValues } from '@/types';

/** Local field state for the create/edit form; seeded once from the template being edited. */
export function usePromptTemplateForm(props: PromptTemplateFormProps) {
  const [values, setValues] = useState<PromptTemplateFormValues>({
    title: props.editing?.title ?? '',
    body: props.editing?.body ?? '',
    tags: props.editing?.tags.join(', ') ?? '',
  });

  const setField = (field: keyof PromptTemplateFormValues, value: string): void =>
    setValues((previous) => ({ ...previous, [field]: value }));

  const canSave = values.title.trim().length > 0 && values.body.trim().length > 0;

  const submit = (): void => {
    if (canSave) {
      props.onSave(values);
    }
  };

  return { values, setField, canSave, submit };
}
