import type { WorkspaceProviderAuthMode } from '@/enums/workspace-provider-auth-mode.enum';
import { WorkspaceProviderFieldType } from '@/enums/workspace-provider-field-type.enum';
import type { ProviderConfigField } from '@/types';

export function isFieldApplicableToAuthMode(
  field: ProviderConfigField,
  authMode: WorkspaceProviderAuthMode,
): boolean {
  if (field.appliesToAuthModes === undefined) {
    return true;
  }
  return field.appliesToAuthModes.includes(authMode);
}

export function resolveFieldInputType(field: ProviderConfigField): string {
  if (field.secret) {
    return 'password';
  }
  if (field.type === WorkspaceProviderFieldType.EMAIL) {
    return 'email';
  }
  return 'text';
}
