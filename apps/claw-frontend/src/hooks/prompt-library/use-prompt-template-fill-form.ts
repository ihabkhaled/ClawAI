import { useState } from 'react';

import type { PromptTemplateFillFormProps } from '@/types';

/** One string per `{{variable}}`; every field must be non-blank before insert. */
export function usePromptTemplateFillForm(props: PromptTemplateFillFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const setValue = (name: string, value: string): void =>
    setValues((previous) => ({ ...previous, [name]: value }));

  const isComplete = props.template.variables.every(
    (name) => (values[name] ?? '').trim().length > 0,
  );

  const submit = (): void => {
    if (isComplete) {
      props.onSubmit(values);
    }
  };

  return { values, setValue, isComplete, submit };
}
