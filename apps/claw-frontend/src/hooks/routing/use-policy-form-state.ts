import { useEffect, useState } from 'react';

import { POLICY_FORM_DEFAULTS } from '@/constants';
import type { RoutingMode } from '@/enums';
import { createRoutingPolicySchema } from '@/lib/validation/routing.schema';
import type { FormFieldErrors, PolicyFormStateParams, PolicyFormStateReturn } from '@/types';

export function usePolicyFormState({
  open,
  policy,
  onSubmit,
}: PolicyFormStateParams): PolicyFormStateReturn {
  const [name, setName] = useState(policy?.name ?? POLICY_FORM_DEFAULTS.name);
  const [routingMode, setRoutingMode] = useState<RoutingMode>(
    policy?.routingMode ?? POLICY_FORM_DEFAULTS.routingMode,
  );
  const [priority, setPriority] = useState(policy?.priority ?? POLICY_FORM_DEFAULTS.priority);
  const [isActive, setIsActive] = useState(policy?.isActive ?? POLICY_FORM_DEFAULTS.isActive);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  const isEditing = !!policy;

  useEffect(() => {
    setFieldErrors({});
  }, [open]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    const formData = {
      name: name.trim(),
      routingMode,
      priority,
      isActive,
      config: policy?.config ?? POLICY_FORM_DEFAULTS.config,
    };

    const result = createRoutingPolicySchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(formData);
  };

  const pendingLabel = isEditing ? 'Saving...' : 'Creating...';
  const submitLabel = isEditing ? 'Save Changes' : 'Create Policy';

  return {
    name,
    setName,
    routingMode,
    setRoutingMode,
    priority,
    setPriority,
    isActive,
    setIsActive,
    fieldErrors,
    isEditing,
    pendingLabel,
    submitLabel,
    handleSubmit,
  };
}
