import { type Mock, vi } from 'vitest';
import { SeedApplyOutcome } from '../../../common/enums';
import { BillingModel, RouterChainEntryRole, RouterProvider } from '../../../generated/prisma';
import {
  ROUTER_CHAIN_SEED_CONFIGURATION,
  ROUTER_CHAIN_SEED_ENTRIES,
  ROUTER_CHAIN_SEED_NAME,
} from '../constants/router-chain-seed.constants';
import { type RouterChainSeedRepository } from '../repositories/router-chain-seed.repository';
import { normalizeModelId } from '../utilities/model-alias-matching.utility';
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

  // Routing is a small, constant, every-request job. Running it on a metered
  // provider put a per-token cost on the cheapest question in the system.
  it('runs the router on the Ollama Cloud connector, not on Gemini', () => {
    expect(ROUTER_CHAIN_SEED_ENTRIES[0]?.provider).toBe(RouterProvider.OLLAMA_CLOUD);
    expect(ROUTER_CHAIN_SEED_ENTRIES[0]?.role).toBe(RouterChainEntryRole.PRIMARY);
    expect(ROUTER_CHAIN_SEED_ENTRIES[0]?.billingModel).toBe(BillingModel.SUBSCRIPTION);
  });

  // Gemini keeps its place in the chain, just not the first one: a chain with
  // only one provider cannot survive that provider going down.
  it('keeps a cross-provider hop so one provider outage is survivable', () => {
    const providers = new Set(ROUTER_CHAIN_SEED_ENTRIES.map((entry) => entry.provider));

    expect(providers.has(RouterProvider.GEMINI)).toBe(true);
    expect(providers.has(RouterProvider.OLLAMA_CLOUD)).toBe(true);
  });

  // Entry 2 is a same-provider sibling so a model-specific fault tries it
  // before abandoning the connector; a provider-wide failure skips it.
  it('places a same-provider model fallback before the first cross-provider hop', () => {
    const modelFallback = ROUTER_CHAIN_SEED_ENTRIES.find(
      (e) => e.role === RouterChainEntryRole.MODEL_FALLBACK,
    );
    const providerFallback = ROUTER_CHAIN_SEED_ENTRIES.find(
      (e) => e.role === RouterChainEntryRole.PROVIDER_FALLBACK,
    );

    expect(modelFallback?.provider).toBe(ROUTER_CHAIN_SEED_ENTRIES[0]?.provider);
    expect(providerFallback?.provider).not.toBe(ROUTER_CHAIN_SEED_ENTRIES[0]?.provider);
    expect(modelFallback?.order).toBeLessThan(providerFallback?.order ?? 0);
  });

  // The defect this guards against shipped silently for a month. v2 named
  // glm-4.7, minimax-m2.1 and qwen3.5 against a catalog holding glm-5.2,
  // minimax-m2.5 and qwen3.5:397b. Matching is exact after normalization, so
  // each of those entries resolved to nothing and was skipped on every walk —
  // the admin page showed a four-entry cross-provider chain that behaved as
  // Gemini-only. Nothing failed; the entries just never ran.
  it('names no model that was already known to be retired or renamed', () => {
    const retired = ['glm-4.7', 'minimax-m2.1', 'qwen3.5:cloud', 'gemini-2.5-flash-lite'];
    const aliases = ROUTER_CHAIN_SEED_ENTRIES.map((entry) =>
      normalizeModelId(entry.modelAlias, entry.provider),
    );

    for (const name of retired) {
      expect(aliases).not.toContain(name);
    }
  });

  // A bare alias is what the catalog actually stores for OLLAMA_CLOUD. The
  // `:cloud` suffix normalizes away, so writing it is not wrong — but a size or
  // date suffix does NOT normalize away, and that is where a typo hides.
  it('writes every Ollama Cloud alias in its catalog form', () => {
    const ollamaAliases = ROUTER_CHAIN_SEED_ENTRIES.filter(
      (entry) => entry.provider === RouterProvider.OLLAMA_CLOUD,
    ).map((entry) => entry.modelAlias);

    expect(ollamaAliases.length).toBeGreaterThan(0);
    for (const alias of ollamaAliases) {
      expect(alias).toBe(normalizeModelId(alias, RouterProvider.OLLAMA_CLOUD));
    }
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
  ): { service: RouterChainSeedService; applyOnce: Mock } => {
    const applyOnce = vi.fn().mockResolvedValue(outcome);
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
