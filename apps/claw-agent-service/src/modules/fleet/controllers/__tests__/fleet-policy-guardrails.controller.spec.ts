import { vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { FleetController } from '../fleet.controller';
import { OrganizationAccessService } from '../../services/organization-access.service';
import { OrganizationMembershipService } from '../../services/organization-membership.service';
import { OrganizationPolicyService } from '../../services/organization-policy.service';
import { OrganizationRepository } from '../../repositories/organization.repository';
import { updateOrganizationPolicySchema } from '../../dto/organization-policy.dto';
import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import {
  extensionEvaluationSchema,
  extensionMcpServerPolicySchema,
  extensionTransportSchema,
} from '../../__fixtures__/extension-organization-policy.contract';
import { OrganizationRole } from '../../../../generated/prisma';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

const member = { id: 'member-1', email: 'm@claw.local', role: 'USER' };
const admin = { id: 'admin-1', email: 'a@claw.local', role: 'USER' };
const outsider = { id: 'outsider-1', email: 'o@claw.local', role: 'ADMIN' };

const roles: Record<string, Record<string, OrganizationRole>> = {
  [ORG_A]: { [member.id]: OrganizationRole.MEMBER, [admin.id]: OrganizationRole.ADMIN },
  [ORG_B]: { [member.id]: OrganizationRole.MEMBER },
};

const guardedBody = updateOrganizationPolicySchema.parse({
  maximumRisk: 'R3',
  rules: [
    { tool: 'terminal.run', outcome: 'deny', reason: 'No shell.' },
    { commandGlob: 'git push*', outcome: 'ask', reason: 'Pushes need a human.' },
  ],
  trust: { repositories: ['github.com/acme/*'], domains: ['*.acme.com'], commands: ['npm *'] },
  mcpServers: { allow: [{ name: 'github' }, { name: 'jira' }], deny: [{ command: 'npx *' }] },
});

const rowFor = (body: typeof guardedBody): Record<string, unknown> => ({
  id: 'policy-id',
  organizationId: 'secret-org-id',
  ...body,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('FleetController organization policy guardrails (F053/F054)', () => {
  let controller: FleetController;
  const stored = new Map<string, Record<string, unknown>>();
  const upsertPolicy = vi.fn((organizationId: string, data: typeof guardedBody) => {
    const row = rowFor(data);
    stored.set(organizationId, row);
    return Promise.resolve(row);
  });

  beforeEach(async () => {
    stored.clear();
    upsertPolicy.mockClear();
    const repository = {
      findMembershipForUser: vi.fn((organizationId: string, userId: string) => {
        const role = roles[organizationId]?.[userId];
        return Promise.resolve(role === undefined ? null : { organizationId, userId, role });
      }),
      findPolicy: vi.fn((organizationId: string) =>
        Promise.resolve(stored.get(organizationId) ?? null),
      ),
      listPoliciesForUser: vi.fn((userId: string) =>
        Promise.resolve(
          [...stored.entries()]
            .filter(([organizationId]) => roles[organizationId]?.[userId] !== undefined)
            .map(([, row]) => row),
        ),
      ),
      upsertPolicy,
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [FleetController],
      providers: [
        OrganizationPolicyService,
        OrganizationAccessService,
        { provide: OrganizationRepository, useValue: repository },
        { provide: OrganizationMembershipService, useValue: {} },
      ],
    }).compile();
    controller = moduleRef.get(FleetController);
  });

  it('lets an org admin write rules, trust and MCP patterns', async () => {
    const saved = await controller.updatePolicy(admin, ORG_A, guardedBody);

    expect(upsertPolicy).toHaveBeenCalledWith(
      ORG_A,
      expect.objectContaining({
        rules: guardedBody.rules,
        trust: guardedBody.trust,
        mcpServers: guardedBody.mcpServers,
      }),
    );
    expect(saved.rules).toEqual(guardedBody.rules);
    expect(saved.trust.repositories).toEqual([['github.com/acme/*']]);
  });

  it('refuses a plain member writing the policy (403)', async () => {
    await expect(controller.updatePolicy(member, ORG_A, guardedBody)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(upsertPolicy).not.toHaveBeenCalled();
  });

  // REQ-SEC-001: a platform ADMIN who is not a member is an outsider; 404 not 403.
  it('hides another organization from a non-member on read and write', async () => {
    await controller.updatePolicy(admin, ORG_A, guardedBody);

    await expect(controller.organizationPolicy(outsider, ORG_A)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.updatePolicy(outsider, ORG_A, guardedBody)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // An admin of org A is an outsider to org B.
    await expect(controller.updatePolicy(admin, ORG_B, guardedBody)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lets a plain member read their organization guardrails', async () => {
    await controller.updatePolicy(admin, ORG_A, guardedBody);

    const read = await controller.organizationPolicy(member, ORG_A);

    expect(read.rules).toHaveLength(2);
    expect(read.mcpServers.deny).toEqual([{ command: 'npx *' }]);
  });

  it('serves only the caller organizations on the effective endpoint', async () => {
    await controller.updatePolicy(admin, ORG_A, guardedBody);

    await expect(controller.effectivePolicy(outsider)).resolves.toMatchObject({ rules: [] });
    await expect(controller.effectivePolicy(member)).resolves.toMatchObject({
      rules: guardedBody.rules,
    });
  });

  it('rejects an invalid body at the validation pipe', () => {
    const pipe = new ZodValidationPipe(updateOrganizationPolicySchema);

    expect(() =>
      pipe.transform({ rules: [{ tool: 'x', outcome: 'allow', reason: 'r' }] }, { type: 'body' }),
    ).toThrow('Validation failed');
  });

  describe('contract with the extension', () => {
    it('serves JSON the extension parses into the same rules, trust and MCP policy', async () => {
      await controller.updatePolicy(admin, ORG_A, guardedBody);
      stored.set(
        ORG_B,
        rowFor(
          updateOrganizationPolicySchema.parse({
            rules: [{ domainGlob: '*.internal', outcome: 'deny', reason: 'Internal.' }],
            trust: { repositories: ['github.com/acme/api'] },
            mcpServers: { allow: [{ name: 'github' }] },
          }),
        ),
      );

      const wire: unknown = JSON.parse(JSON.stringify(await controller.effectivePolicy(member)));
      const transport = extensionTransportSchema.parse(wire);
      const evaluation = extensionEvaluationSchema.parse(transport);
      const mcp = extensionMcpServerPolicySchema.parse(transport.mcpServers);

      expect(evaluation.rules).toHaveLength(3);
      expect(evaluation.trust.repositories).toEqual([
        ['github.com/acme/*'],
        ['github.com/acme/api'],
      ]);
      expect(evaluation.trust.domains).toEqual([['*.acme.com']]);
      expect(mcp).toEqual({ allow: [{ name: 'github' }], deny: [{ command: 'npx *' }] });
    });

    it('serves an unconstrained policy the extension parses', async () => {
      const wire: unknown = JSON.parse(JSON.stringify(await controller.effectivePolicy(outsider)));
      const transport = extensionTransportSchema.parse(wire);

      expect(extensionEvaluationSchema.parse(transport).rules).toEqual([]);
      expect(extensionMcpServerPolicySchema.parse(transport.mcpServers)).toEqual({
        allow: [],
        deny: [],
      });
    });

    it('serves an organization at every size bound the extension still parses', async () => {
      const max = updateOrganizationPolicySchema.parse({
        rules: Array.from({ length: 200 }, (_, i) => ({
          commandGlob: `c${i} ${'x'.repeat(990)}`,
          outcome: 'deny',
          reason: 'r'.repeat(500),
        })),
        trust: { commands: Array.from({ length: 200 }, (_, i) => `${i}${'y'.repeat(495)}`) },
        mcpServers: {
          allow: Array.from({ length: 200 }, (_, i) => ({ name: `s${i}` })),
          deny: Array.from({ length: 200 }, (_, i) => ({ url: `https://${i}.example/*` })),
        },
      });
      await controller.updatePolicy(admin, ORG_A, max);

      const wire: unknown = JSON.parse(JSON.stringify(await controller.effectivePolicy(admin)));
      const transport = extensionTransportSchema.parse(wire);

      expect(extensionEvaluationSchema.parse(transport).rules).toHaveLength(200);
      expect(extensionMcpServerPolicySchema.parse(transport.mcpServers).allow).toHaveLength(200);
    });
  });
});
