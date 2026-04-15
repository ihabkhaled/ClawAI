import { describe, expect, it } from 'vitest';

import { WorkspaceProvider } from '@/enums';
import {
  createWorkspaceConnectorSchema,
  workspacePermissionLevels,
} from '@/lib/validation/workspace-connector.schema';

describe('createWorkspaceConnectorSchema', () => {
  const validInput = {
    name: 'Workspace GitHub',
    provider: WorkspaceProvider.GITHUB,
    permissionLevel: 'READ' as const,
  };

  it('accepts valid input', () => {
    const result = createWorkspaceConnectorSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      ...validInput,
      name: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Connector name is required');
    }
  });

  it('rejects a name longer than 100 characters', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      ...validInput,
      name: 'x'.repeat(101),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Connector name must be at most 100 characters');
    }
  });

  it('rejects an invalid provider', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      ...validInput,
      provider: 'INVALID',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select a valid workspace provider');
    }
  });

  it('accepts every supported provider', () => {
    for (const provider of Object.values(WorkspaceProvider)) {
      const result = createWorkspaceConnectorSchema.safeParse({
        ...validInput,
        provider,
      });

      expect(result.success).toBe(true);
    }
  });

  it('accepts every supported permission level', () => {
    for (const permissionLevel of workspacePermissionLevels) {
      const result = createWorkspaceConnectorSchema.safeParse({
        ...validInput,
        permissionLevel,
      });

      expect(result.success).toBe(true);
    }
  });
});
