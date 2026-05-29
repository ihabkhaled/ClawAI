import { useCallback, useState } from 'react';

import { createRoleSchema } from '@/lib/validation/role.schema';
import type {
  CreateRoleRequest,
  RoleFormFieldErrors,
  RoleFormState,
  UseRoleFormResult,
} from '@/types';

const emptyState = (): RoleFormState => ({
  slug: '',
  name: '',
  description: '',
  isAssignable: true,
});

export function useRoleForm(): UseRoleFormResult {
  const [state, setState] = useState<RoleFormState>(emptyState);
  const [fieldErrors, setFieldErrors] = useState<RoleFormFieldErrors>({});

  const setField = useCallback(
    <K extends keyof RoleFormState>(field: K, value: RoleFormState[K]): void => {
      setState((prev) => ({ ...prev, [field]: value }));
      setFieldErrors((prev) => {
        if (prev[field] === undefined) {
          return prev;
        }
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const buildCreateRequest = useCallback((): CreateRoleRequest | null => {
    const result = createRoleSchema.safeParse({
      slug: state.slug,
      name: state.name,
      description: state.description.length === 0 ? undefined : state.description,
      isAssignable: state.isAssignable,
    });
    if (result.success) {
      return result.data;
    }
    const errors: RoleFormFieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof RoleFormState;
      if (errors[key] === undefined) {
        errors[key] = issue.message;
      }
    }
    setFieldErrors(errors);
    return null;
  }, [state]);

  return { state, setField, fieldErrors, buildCreateRequest };
}
