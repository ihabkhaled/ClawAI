import { vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { type AgentOrganizationClient } from '../clients/agent-organization.client';
import { type UsageAttributionRepository } from '../repositories/usage-attribution.repository';
import { UsageAttributionService } from '../services/usage-attribution.service';
import { type UsageAggregateRow } from '../types/usage-attribution.types';

function row(key: Record<string, string | null>, weightedTokens: number): UsageAggregateRow {
  return { key, requests: 2, weightedTokens, inputTokens: 10, outputTokens: 5 };
}

function build() {
  const repo = {
    sumByWorkflow: vi.fn(),
    sumByModel: vi.fn(),
    sumByUser: vi.fn(),
  };
  const organizations = { getUsageScope: vi.fn() };
  const service = new UsageAttributionService(
    repo as Pick<
      UsageAttributionRepository,
      'sumByWorkflow' | 'sumByModel' | 'sumByUser'
    > as UsageAttributionRepository,
    organizations as Pick<AgentOrganizationClient, 'getUsageScope'> as AgentOrganizationClient,
  );
  return { repo, organizations, service };
}

describe('UsageAttributionService', () => {
  it('breaks the caller down by surface and model, scoped to the caller only', async () => {
    const { repo, service } = build();
    repo.sumByWorkflow.mockResolvedValue([
      row({ workflow: null }, 100),
      row({ workflow: 'runtime-v2' }, 300),
    ]);
    repo.sumByModel.mockResolvedValue([
      row({ provider: 'openai', model: 'gpt' }, 150),
      row({ provider: 'gemini', model: 'flash' }, 250),
    ]);

    const view = await service.breakdownForUser('user-1', {});

    expect(repo.sumByWorkflow.mock.calls[0]?.[0]).toEqual(['user-1']);
    expect(repo.sumByModel.mock.calls[0]?.[0]).toEqual(['user-1']);
    expect(view.totals).toEqual({
      requests: 4,
      weightedTokens: 400,
      inputTokens: 20,
      outputTokens: 10,
    });
    expect(view.bySurface.map((line) => line.surface)).toEqual(['runtime-v2', 'unattributed']);
    expect(view.byModel[0]).toMatchObject({ provider: 'gemini', model: 'flash' });
    const span = Date.parse(view.to) - Date.parse(view.from);
    expect(span).toBe(30 * 86_400_000);
  });

  it('refuses a window that runs backwards or is too wide', async () => {
    const { service, repo } = build();
    await expect(
      service.breakdownForUser('user-1', {
        from: '2026-09-10T00:00:00Z',
        to: '2026-09-01T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.breakdownForUser('user-1', {
        from: '2025-01-01T00:00:00Z',
        to: '2026-09-01T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.sumByModel).not.toHaveBeenCalled();
  });

  it('aggregates an administered organization over its members only', async () => {
    const { service, repo, organizations } = build();
    organizations.getUsageScope.mockResolvedValue({
      organizationId: 'org-1',
      memberUserIds: ['admin-1', 'member-2', 'member-2'],
    });
    repo.sumByUser.mockResolvedValue([row({ userId: 'member-2' }, 70)]);
    repo.sumByModel.mockResolvedValue([row({ provider: 'openai', model: 'gpt' }, 70)]);

    const view = await service.breakdownForOrganization('org-1', 'admin-1', {});

    expect(organizations.getUsageScope).toHaveBeenCalledWith('org-1', 'admin-1');
    expect(repo.sumByUser.mock.calls[0]?.[0]).toEqual(['admin-1', 'member-2']);
    expect(view.memberCount).toBe(2);
    expect(view.byMember).toEqual([
      { userId: 'member-2', requests: 2, weightedTokens: 70, inputTokens: 10, outputTokens: 5 },
    ]);
  });

  it('reads no ledger row for a stranger or a plain member', async () => {
    const { service, repo, organizations } = build();
    organizations.getUsageScope.mockRejectedValueOnce(new NotFoundException());
    await expect(service.breakdownForOrganization('org-1', 'stranger', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    organizations.getUsageScope.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.breakdownForOrganization('org-1', 'member', {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.sumByUser).not.toHaveBeenCalled();
    expect(repo.sumByModel).not.toHaveBeenCalled();
  });
});
