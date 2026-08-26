import { BusinessException } from '../../../../common/errors/business.exception';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { providerPlaceholder } from '../../constants/chain-template-seeds.constants';
import { ChainTemplateService } from '../chain-template.service';

const template = {
  key: 'ticket-and-notify',
  requiredProviders: [WorkspaceProvider.JIRA, WorkspaceProvider.SLACK],
  description: 'desc',
  dslTemplate: {
    steps: [
      {
        id: 'create-ticket',
        connectorId: providerPlaceholder(WorkspaceProvider.JIRA),
        actionType: 'CREATE_TICKET',
        payload: { projectKey: '' },
      },
      {
        id: 'notify',
        connectorId: providerPlaceholder(WorkspaceProvider.SLACK),
        actionType: 'SEND_SLACK_MESSAGE',
        payload: { channel: '', text: 'x' },
      },
    ],
  },
};

function makeDeps(opts: { connectors?: Record<string, unknown> } = {}): {
  service: ChainTemplateService;
  chainService: { create: jest.Mock };
} {
  const templateRepo = { findByKey: jest.fn().mockResolvedValue(template) };
  const connectors: Record<string, unknown> = opts.connectors ?? {
    'jira-connector': {
      id: 'jira-connector',
      userId: 'u1',
      provider: 'JIRA',
      encryptedTokens: 'enc',
    },
    'slack-connector': {
      id: 'slack-connector',
      userId: 'u1',
      provider: 'SLACK',
      encryptedTokens: 'enc',
    },
  };
  const connectorRepo = {
    findById: jest.fn().mockImplementation((id: string) => Promise.resolve(connectors[id] ?? null)),
  };
  const chainService = { create: jest.fn().mockResolvedValue({ id: 'chain-1' }) };
  const service = new ChainTemplateService(
    templateRepo as never,
    connectorRepo as never,
    chainService as never,
  );
  return { service, chainService };
}

describe('ChainTemplateService.instantiate', () => {
  it('resolves each provider placeholder to the caller-selected connector and creates a real chain', async () => {
    const { service, chainService } = makeDeps();

    await service.instantiate('u1', 'ticket-and-notify', {
      name: 'My Automation',
      connectorSelections: { JIRA: 'jira-connector', SLACK: 'slack-connector' },
    });

    expect(chainService.create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        name: 'My Automation',
        dsl: {
          steps: [
            expect.objectContaining({ id: 'create-ticket', connectorId: 'jira-connector' }),
            expect.objectContaining({ id: 'notify', connectorId: 'slack-connector' }),
          ],
        },
      }),
    );
  });

  it('rejects when a required provider has no connector selection at all', async () => {
    const { service } = makeDeps();
    await expect(
      service.instantiate('u1', 'ticket-and-notify', {
        name: 'x',
        connectorSelections: { JIRA: 'jira-connector' }, // SLACK missing
      }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('rejects a connector that belongs to another user', async () => {
    const { service } = makeDeps({
      connectors: {
        'jira-connector': {
          id: 'jira-connector',
          userId: 'bob',
          provider: 'JIRA',
          encryptedTokens: 'enc',
        },
        'slack-connector': {
          id: 'slack-connector',
          userId: 'u1',
          provider: 'SLACK',
          encryptedTokens: 'enc',
        },
      },
    });
    await expect(
      service.instantiate('u1', 'ticket-and-notify', {
        name: 'x',
        connectorSelections: { JIRA: 'jira-connector', SLACK: 'slack-connector' },
      }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('rejects a connector whose provider does not match what the template step needs', async () => {
    const { service } = makeDeps({
      connectors: {
        'jira-connector': {
          id: 'jira-connector',
          userId: 'u1',
          provider: 'GITHUB',
          encryptedTokens: 'enc',
        },
        'slack-connector': {
          id: 'slack-connector',
          userId: 'u1',
          provider: 'SLACK',
          encryptedTokens: 'enc',
        },
      },
    });
    await expect(
      service.instantiate('u1', 'ticket-and-notify', {
        name: 'x',
        connectorSelections: { JIRA: 'jira-connector', SLACK: 'slack-connector' },
      }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('rejects an unauthenticated connector (no stored tokens)', async () => {
    const { service } = makeDeps({
      connectors: {
        'jira-connector': {
          id: 'jira-connector',
          userId: 'u1',
          provider: 'JIRA',
          encryptedTokens: null,
        },
        'slack-connector': {
          id: 'slack-connector',
          userId: 'u1',
          provider: 'SLACK',
          encryptedTokens: 'enc',
        },
      },
    });
    await expect(
      service.instantiate('u1', 'ticket-and-notify', {
        name: 'x',
        connectorSelections: { JIRA: 'jira-connector', SLACK: 'slack-connector' },
      }),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it('404s for an unknown template key', async () => {
    const templateRepo = { findByKey: jest.fn().mockResolvedValue(null) };
    const service = new ChainTemplateService(templateRepo as never, {} as never, {} as never);
    await expect(
      service.instantiate('u1', 'missing', { name: 'x', connectorSelections: {} }),
    ).rejects.toBeInstanceOf(BusinessException);
  });
});
