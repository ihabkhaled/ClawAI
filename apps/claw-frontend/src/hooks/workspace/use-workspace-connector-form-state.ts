import { useEffect, useState } from 'react';

import { WorkspacePermissionLevel, WorkspaceProvider } from '@/enums';
import { createWorkspaceConnectorSchema } from '@/lib/validation/workspace-connector.schema';
import type {
  WorkspaceConnectorFormStateParams,
  WorkspaceConnectorFormStateReturn,
} from '@/types/workspace.types';

export function useWorkspaceConnectorFormState({
  open,
  onSubmit,
  onOpenChange,
}: WorkspaceConnectorFormStateParams): WorkspaceConnectorFormStateReturn {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<WorkspaceProvider>(WorkspaceProvider.GITHUB);
  const [permissionLevel, setPermissionLevel] = useState<WorkspacePermissionLevel>(
    WorkspacePermissionLevel.READ,
  );
  const [fieldErrors, setFieldErrors] = useState<WorkspaceConnectorFormStateReturn['fieldErrors']>(
    {},
  );

  useEffect(() => {
    if (open) {
      setName('');
      setProvider(WorkspaceProvider.GITHUB);
      setPermissionLevel(WorkspacePermissionLevel.READ);
      setFieldErrors({});
    }
  }, [open]);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();

    const result = createWorkspaceConnectorSchema.safeParse({
      name,
      provider,
      permissionLevel,
    });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(result.data);
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
    provider,
    setProvider,
    permissionLevel,
    setPermissionLevel,
    fieldErrors,
    pendingLabel: 'Creating...',
    submitLabel: 'Create Connector',
    handleSubmit,
    handleOpenChange,
  };
}
