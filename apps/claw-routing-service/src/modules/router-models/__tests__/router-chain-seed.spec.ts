import { SeedApplyOutcome } from '../../../common/enums';
import { RouterChainEntryRole, RouterProvider } from '../../../generated/prisma';
import {
  ROUTER_CHAIN_SEED_CONFIGURATION,
  ROUTER_CHAIN_SEED_ENTRIES,
  ROUTER_CHAIN_SEED_NAME,
} from '../constants/router-chain-seed.constants';
import { type RouterChainSeedRepository } from '../repositories/router-chain-seed.repository';
import { RouterChainSeedService } from '../services/router-chain-seed.service';
import type { ChainSeedInput } from '../types/router-chain-seed.types';

describe('default chain definition', () => {
  it('orders entries uniquely and contiguously from 1', () => {
    const orders = ROUTER_CHAIN_SEED_ENTRIES.map((entry) => entry.order);

    expect(new Set(orders).size).toBe(orders.length);
    expect([...orders].sort((a, b) => a - b)).toEqual(
      Array.from({ length: orders.length }, (_, index) => index + 1),
    );
  });

  it('starts on Gemini and falls across to Ollama Cloud', () => {
    expect(ROUTER_CHAIN_SEED_ENTRIES[0]?.provider).toBe(RouterProvider.GEMINI);
    expect(ROUTER_CHAIN_SEED_ENTRIES[0]?.role).toBe(RouterChainEntryRole.PRIMARY);
    expect(ROUTER_CHAIN_SEED_ENTRIES.some((e) => e.provider === RouterProvider.OLLAMA_CLOUD)).toBe(
      true,
    );
  });

  // Entry 2 is a same-provider sibling so a model-specific fault tries it
  // before abandoning Google; a provider-wide failure skips it.
  it('places a same-provider model fallback before the first cross-provider hop', () => {
    const modelFallback = ROUTER_CHAIN_SEED_ENTRIES.find(
      (e) => e.role === RouterChainEntryRole.MODEL_FALLBACK,
    );
    const providerFallback = ROUTER_CHAIN_SEED_ENTRIES.find(
      (e) => e.role === RouterChainEntryRole.PROVIDER_FALLBACK,
    );

    expect(modelFallback?.provider).toBe(RouterProvider.GEMINI);
    expect(providerFallback?.provider).toBe(RouterProvider.OLLAMA_CLOUD);
    expect(modelFallback?.order).toBeLessThan(providerFallback?.order ?? 0);
  });

  // Quality escalation answers low confidence, which is not a provider failure.
  it('reaches quality escalation only through LOW_CONFIDENCE', () => {
    const escalation = ROUTER_CHAIN_SEED_ENTRIES.find(
      (e) => e.role === RouterChainEntryRole.QUALITY_ESCALATION,
    );

    expect(escalation?.triggers).toEqual(['LOW_CONFIDENCE']);
  });

  // Ollama Cloud bills by subscription; costing it per token would be fiction.
  it('never claims token billing for an Ollama Cloud entry', () => {
    for (const entry of ROUTER_CHAIN_SEED_ENTRIES) {
      if (entry.provider === RouterProvider.OLLAMA_CLOUD) {
        expect(entry.billingModel).toBe('SUBSCRIPTION');
      }
    }
  });

  // Model ids retire constantly and at least one pack suggestion already looks
  // behind this repo's own constants. Nothing is presumed reachable.
  it('carries only aliases, never a presumed endpoint', () => {
    for (const entry of ROUTER_CHAIN_SEED_ENTRIES) {
      expect(entry.modelAlias.length).toBeGreaterThan(0);
      expect(entry).not.toHaveProperty('deploymentId');
    }
  });

  it('gives every entry a bounded timeout', () => {
    for (const entry of ROUTER_CHAIN_SEED_ENTRIES) {
      expect(entry.attemptTimeoutMs).toBeGreaterThan(0);
      expect(entry.attemptTimeoutMs).toBeLessThanOrEqual(
        ROUTER_CHAIN_SEED_CONFIGURATION.totalDeadlineMs,
      );
    }
  });

  // Only the primary retries; a fallback that also retried would multiply the
  // worst case well past the total deadline.
  it('retries only on the primary entry', () => {
    for (const entry of ROUTER_CHAIN_SEED_ENTRIES) {
      if (entry.role !== RouterChainEntryRole.PRIMARY) {
        expect(entry.retries).toBe(0);
      }
    }
  });

  // Seeding a chain is not switching production onto it.
  it('is seeded disabled', () => {
    expect(ROUTER_CHAIN_SEED_CONFIGURATION.enabled).toBe(false);
  });

  it('keeps the legacy local rollback reachable', () => {
    expect(ROUTER_CHAIN_SEED_CONFIGURATION.legacyLocalRollbackEnabled).toBe(true);
  });

  // An unexplained model choice is worse than an honest refusal.
  it('fails closed when no router is eligible', () => {
    expect(ROUTER_CHAIN_SEED_CONFIGURATION.failClosedWhenNoEligibleRouter).toBe(true);
  });
});

describe('RouterChainSeedService', () => {
  const build = (
    outcome: SeedApplyOutcome,
  ): { service: RouterChainSeedService; applyOnce: jest.Mock } => {
    const applyOnce = jest.fn().mockResolvedValue(outcome);
    return {
      service: new RouterChainSeedService({
        applyOnce,
      } as unknown as RouterChainSeedRepository),
      applyOnce,
    };
  };

  it('applies the seed under its versioned identity', async () => {
    const { service, applyOnce } = build(SeedApplyOutcome.APPLIED);

    await expect(service.seed()).resolves.toBe(SeedApplyOutcome.APPLIED);

    const input = applyOnce.mock.calls[0]?.[0] as ChainSeedInput;
    expect(input.name).toBe(ROUTER_CHAIN_SEED_NAME);
    expect(input.entries).toHaveLength(ROUTER_CHAIN_SEED_ENTRIES.length);
  });

  it('is a no-op on replay', async () => {
    const { service } = build(SeedApplyOutcome.ALREADY_APPLIED);
    await expect(service.seed()).resolves.toBe(SeedApplyOutcome.ALREADY_APPLIED);
  });

  // Overwriting would destroy whatever an admin has since published.
  it('reports a changed definition without overwriting or throwing', async () => {
    const { service } = build(SeedApplyOutcome.CHECKSUM_MISMATCH);
    await expect(service.seed()).resolves.toBe(SeedApplyOutcome.CHECKSUM_MISMATCH);
  });

  it('runs on module init', async () => {
    const { service, applyOnce } = build(SeedApplyOutcome.APPLIED);
    await service.onModuleInit();
    expect(applyOnce).toHaveBeenCalledTimes(1);
  });

  it('produces a stable checksum across runs', async () => {
    const first = build(SeedApplyOutcome.APPLIED);
    const second = build(SeedApplyOutcome.APPLIED);

    await first.service.seed();
    await second.service.seed();

    expect((first.applyOnce.mock.calls[0]?.[0] as ChainSeedInput).checksum).toBe(
      (second.applyOnce.mock.calls[0]?.[0] as ChainSeedInput).checksum,
    );
  });
});
