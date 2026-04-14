import { createWorkspaceConnectorSchema } from '../create-workspace-connector.dto';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { WorkspacePermissionLevel } from '../../../../common/enums/workspace-permission-level.enum';

describe('createWorkspaceConnectorSchema', () => {
  it('should parse a valid minimal payload', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      name: 'My GitHub',
      provider: WorkspaceProvider.GITHUB,
    });
    expect(result.success).toBe(true);
  });

  it('should default permissionLevel to READ', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      name: 'Test',
      provider: WorkspaceProvider.SLACK,
    });
    expect(result.success && result.data.permissionLevel).toBe(WorkspacePermissionLevel.READ);
  });

  it('should default scopes to empty array', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      name: 'Test',
      provider: WorkspaceProvider.GITHUB,
    });
    expect(result.success && result.data.scopes).toEqual([]);
  });

  it('should reject empty name', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      name: '',
      provider: WorkspaceProvider.GITHUB,
    });
    expect(result.success).toBe(false);
  });

  it('should reject name longer than 100 chars', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      name: 'a'.repeat(101),
      provider: WorkspaceProvider.GITHUB,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid provider', () => {
    const result = createWorkspaceConnectorSchema.safeParse({ name: 'Test', provider: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should accept all valid WorkspaceProvider values', () => {
    for (const provider of Object.values(WorkspaceProvider)) {
      const result = createWorkspaceConnectorSchema.safeParse({ name: 'Test', provider });
      expect(result.success).toBe(true);
    }
  });

  it('should accept optional accessToken', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      name: 'Test',
      provider: WorkspaceProvider.GITHUB,
      accessToken: 'gho_abc',
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional metadata', () => {
    const result = createWorkspaceConnectorSchema.safeParse({
      name: 'Test',
      provider: WorkspaceProvider.GITHUB,
      metadata: { workspace: 'my-org' },
    });
    expect(result.success).toBe(true);
  });
});
