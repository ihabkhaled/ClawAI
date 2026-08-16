import { describe, expect, it } from 'vitest';

import { WORKSPACE_ACTION_TYPE_LABEL } from '@/constants/workspace-action.constants';
import { WorkspaceActionType } from '@/enums/workspace-action-type.enum';

describe('WORKSPACE_ACTION_TYPE_LABEL', () => {
  it('gives every action type a human-readable label distinct from its raw enum key', () => {
    for (const actionType of Object.values(WorkspaceActionType)) {
      const label = WORKSPACE_ACTION_TYPE_LABEL[actionType];
      expect(label, `missing label for ${actionType}`).toBeTruthy();
      expect(label, `${actionType} falls back to its raw enum key`).not.toBe(actionType);
    }
  });
});
