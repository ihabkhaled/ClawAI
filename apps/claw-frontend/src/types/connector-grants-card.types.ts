import type { WorkspaceConnectorAccessLevel } from '@/enums/workspace-connector-access-level.enum';

import type { WorkspaceConnectorGrant } from './connector-grant.types';

// v3 round 8 — controller hook return shape for the connector grants
// card. Keeps the component pure-render per the FE architecture rule.

export type UseConnectorGrantsCardResult = {
  grants: WorkspaceConnectorGrant[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  granteeUserId: string;
  setGranteeUserId: (value: string) => void;
  accessLevel: WorkspaceConnectorAccessLevel;
  setAccessLevel: (value: WorkspaceConnectorAccessLevel) => void;

  submitGrant: () => Promise<void>;
  revoke: (granteeUserId: string) => Promise<void>;

  isGranting: boolean;
  isRevoking: boolean;
  pendingGranteeId: string | null;
  mutationError: Error | null;
};
