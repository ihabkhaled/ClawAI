import { ConnectorAccessService } from '../connector-access.service';
import { ConnectorAccessSource } from '../../enums/connector-access-source.enum';
import { ConnectorAction } from '../../enums/connector-action.enum';
import { WorkspaceConnectorAccessLevel } from '../../../../generated/prisma';

const makeService = (
  overrides: {
    connector?: unknown;
    grant?: unknown;
  } = {},
): { svc: ConnectorAccessService; connectorRepo: any; grantRepo: any } => {
  const connectorRepo = { findById: jest.fn().mockResolvedValue(overrides.connector ?? null) };
  const grantRepo = {
    findForUserConnector: jest.fn().mockResolvedValue(overrides.grant ?? null),
    upsert: jest.fn().mockResolvedValue({ id: 'g1' }),
    deleteOne: jest.fn().mockResolvedValue(undefined),
  };
  const svc = new ConnectorAccessService(connectorRepo as any, grantRepo as any);
  return { svc, connectorRepo, grantRepo };
};

describe('ConnectorAccessService', () => {
  describe('resolve', () => {
    it('returns NONE when connector does not exist', async () => {
      const { svc } = makeService({ connector: null });
      expect(await svc.resolve('u1', 'c-missing')).toEqual({
        source: ConnectorAccessSource.NONE,
        level: null,
      });
    });

    it('returns OWNER/FULL when user owns the connector', async () => {
      const { svc } = makeService({ connector: { userId: 'u1' } });
      const eff = await svc.resolve('u1', 'c1');
      expect(eff.source).toBe(ConnectorAccessSource.OWNER);
      expect(eff.level).toBe(WorkspaceConnectorAccessLevel.FULL);
    });

    it('returns GRANT with the grant level when not owner but granted', async () => {
      const { svc } = makeService({
        connector: { userId: 'someone-else' },
        grant: { accessLevel: WorkspaceConnectorAccessLevel.AI_ACTIONS },
      });
      const eff = await svc.resolve('u1', 'c1');
      expect(eff.source).toBe(ConnectorAccessSource.GRANT);
      expect(eff.level).toBe(WorkspaceConnectorAccessLevel.AI_ACTIONS);
    });

    it('returns NONE when user is neither owner nor grantee', async () => {
      const { svc } = makeService({ connector: { userId: 'someone-else' } });
      expect(await svc.resolve('u1', 'c1')).toEqual({
        source: ConnectorAccessSource.NONE,
        level: null,
      });
    });
  });

  describe('actionAllowed (pure)', () => {
    const svc = new ConnectorAccessService({} as any, {} as any);
    const allActions = [
      ConnectorAction.VIEW,
      ConnectorAction.PROPOSE_AI_ACTION,
      ConnectorAction.EDIT_CONFIG,
      ConnectorAction.MANAGE_GRANTS,
    ];

    it('OWNER can do every action', () => {
      const eff = {
        source: ConnectorAccessSource.OWNER,
        level: WorkspaceConnectorAccessLevel.FULL,
      };
      for (const a of allActions) {
        expect(svc.actionAllowed(eff, a)).toBe(true);
      }
    });

    it('NONE allows nothing', () => {
      const eff = { source: ConnectorAccessSource.NONE, level: null };
      for (const a of allActions) {
        expect(svc.actionAllowed(eff, a)).toBe(false);
      }
    });

    it('GRANT(READ_ONLY) → VIEW yes, propose/edit/manage no', () => {
      const eff = {
        source: ConnectorAccessSource.GRANT,
        level: WorkspaceConnectorAccessLevel.READ_ONLY,
      };
      expect(svc.actionAllowed(eff, ConnectorAction.VIEW)).toBe(true);
      expect(svc.actionAllowed(eff, ConnectorAction.PROPOSE_AI_ACTION)).toBe(false);
      expect(svc.actionAllowed(eff, ConnectorAction.EDIT_CONFIG)).toBe(false);
      expect(svc.actionAllowed(eff, ConnectorAction.MANAGE_GRANTS)).toBe(false);
    });

    it('GRANT(AI_ACTIONS) → VIEW+PROPOSE yes, edit/manage no', () => {
      const eff = {
        source: ConnectorAccessSource.GRANT,
        level: WorkspaceConnectorAccessLevel.AI_ACTIONS,
      };
      expect(svc.actionAllowed(eff, ConnectorAction.VIEW)).toBe(true);
      expect(svc.actionAllowed(eff, ConnectorAction.PROPOSE_AI_ACTION)).toBe(true);
      expect(svc.actionAllowed(eff, ConnectorAction.EDIT_CONFIG)).toBe(false);
      expect(svc.actionAllowed(eff, ConnectorAction.MANAGE_GRANTS)).toBe(false);
    });

    it('GRANT(FULL) → everything except MANAGE_GRANTS (owner-only)', () => {
      const eff = {
        source: ConnectorAccessSource.GRANT,
        level: WorkspaceConnectorAccessLevel.FULL,
      };
      expect(svc.actionAllowed(eff, ConnectorAction.VIEW)).toBe(true);
      expect(svc.actionAllowed(eff, ConnectorAction.PROPOSE_AI_ACTION)).toBe(true);
      expect(svc.actionAllowed(eff, ConnectorAction.EDIT_CONFIG)).toBe(true);
      expect(svc.actionAllowed(eff, ConnectorAction.MANAGE_GRANTS)).toBe(false);
    });
  });

  describe('grant / revoke', () => {
    it('only the owner can grant', async () => {
      const { svc } = makeService({ connector: { userId: 'someone-else' } });
      await expect(
        svc.grant('c1', 'grantee', 'not-the-owner', WorkspaceConnectorAccessLevel.AI_ACTIONS),
      ).rejects.toThrow('Only the connector owner');
    });

    it('owner can grant — calls repo.upsert with the right args', async () => {
      const { svc, grantRepo } = makeService({ connector: { userId: 'owner' } });
      await svc.grant('c1', 'alice', 'owner', WorkspaceConnectorAccessLevel.AI_ACTIONS);
      expect(grantRepo.upsert).toHaveBeenCalledWith(
        'c1',
        'alice',
        'owner',
        WorkspaceConnectorAccessLevel.AI_ACTIONS,
      );
    });

    it('only the owner can revoke', async () => {
      const { svc } = makeService({ connector: { userId: 'someone-else' } });
      await expect(svc.revoke('c1', 'alice', 'not-the-owner')).rejects.toThrow(
        'Only the connector owner',
      );
    });

    it('owner can revoke', async () => {
      const { svc, grantRepo } = makeService({ connector: { userId: 'owner' } });
      await svc.revoke('c1', 'alice', 'owner');
      expect(grantRepo.deleteOne).toHaveBeenCalledWith('c1', 'alice');
    });
  });
});
