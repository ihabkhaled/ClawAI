import { HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { ResearchAccessGuard } from '../guards/research-access.guard';

function context(user: { id?: string } | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

function entitlements(over: { isAdmin?: boolean; allowResearchMode?: boolean | null }) {
  return {
    isAdmin: over.isAdmin ?? false,
    permissions: [],
    hasPaygCredit: false,
    plan:
      over.allowResearchMode === null
        ? null
        : { featureGates: { allowResearchMode: over.allowResearchMode ?? false } },
  };
}

async function denied(promise: Promise<unknown>): Promise<BusinessException> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  return error as BusinessException;
}

describe('ResearchAccessGuard', () => {
  it('lets a plan with the research unlock through', async () => {
    const adapter = {
      getEntitlements: vi.fn().mockResolvedValue(entitlements({ allowResearchMode: true })),
    };
    await expect(
      new ResearchAccessGuard(adapter as never).canActivate(context({ id: 'u1' })),
    ).resolves.toBe(true);
    expect(adapter.getEntitlements).toHaveBeenCalledWith('u1', { enforceTrial: false });
  });

  it('refuses a plan without the unlock with 403 PLAN_FEATURE_DISABLED', async () => {
    const adapter = {
      getEntitlements: vi.fn().mockResolvedValue(entitlements({ allowResearchMode: false })),
    };
    const error = await denied(
      new ResearchAccessGuard(adapter as never).canActivate(context({ id: 'u1' })),
    );
    expect(error.code).toBe(ResearchErrorCode.PLAN_FEATURE_DISABLED);
    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('refuses an account with no plan at all', async () => {
    const adapter = {
      getEntitlements: vi.fn().mockResolvedValue(entitlements({ allowResearchMode: null })),
    };
    const error = await denied(
      new ResearchAccessGuard(adapter as never).canActivate(context({ id: 'u1' })),
    );
    expect(error.code).toBe(ResearchErrorCode.PLAN_FEATURE_DISABLED);
  });

  it('lets an admin through', async () => {
    const adapter = {
      getEntitlements: vi
        .fn()
        .mockResolvedValue(entitlements({ isAdmin: true, allowResearchMode: null })),
    };
    await expect(
      new ResearchAccessGuard(adapter as never).canActivate(context({ id: 'a1' })),
    ).resolves.toBe(true);
  });

  it('fails closed with 503 when entitlements cannot be read', async () => {
    const adapter = { getEntitlements: vi.fn().mockRejectedValue(new Error('auth down')) };
    const error = await denied(
      new ResearchAccessGuard(adapter as never).canActivate(context({ id: 'u1' })),
    );
    expect(error.code).toBe(ResearchErrorCode.ENTITLEMENTS_UNAVAILABLE);
    expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('refuses a request with no user and never asks entitlements', async () => {
    const adapter = { getEntitlements: vi.fn() };
    const error = await denied(
      new ResearchAccessGuard(adapter as never).canActivate(context(undefined)),
    );
    expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(adapter.getEntitlements).not.toHaveBeenCalled();
  });
});
