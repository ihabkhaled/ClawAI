import { describe, expect, it } from 'vitest';

import { ConnectorProvider } from '@/enums';
import {
  ModelBillingFilter,
  ModelBillingMode,
  ModelBillingSource,
} from '@/enums/model-billing.enum';
import type { CreditPolicyConnector } from '@/types/model-billing.types';

import {
  buildProviderCreditPolicy,
  countModelsByBilling,
  filterRowsByBilling,
  isLocalExemptProvider,
  matchesModelBillingFilter,
  resolveModelBilling,
  resolveModelBillingFilterCount,
} from '../model-billing.utility';

const connector = (
  id: string,
  provider: ConnectorProvider,
  isEnabled: boolean,
  isPayAsYouGo: boolean | undefined,
): CreditPolicyConnector => ({ id, provider, isEnabled, isPayAsYouGo });

describe('buildProviderCreditPolicy (mirrors connector-service rollUpPaygPolicy)', () => {
  it('marks a provider credit when ANY enabled connector for it is pay-as-you-go', () => {
    const policy = buildProviderCreditPolicy([
      connector('a', ConnectorProvider.OPENAI, true, false),
      connector('b', ConnectorProvider.OPENAI, true, true),
    ]);

    expect(policy.get('OPENAI')).toEqual({ isCredit: true, connectorId: 'b' });
  });

  it('ignores a disabled credit connector but still registers the provider as included', () => {
    const policy = buildProviderCreditPolicy([
      connector('a', ConnectorProvider.ANTHROPIC, false, true),
    ]);

    expect(policy.get('ANTHROPIC')).toEqual({ isCredit: false, connectorId: 'a' });
  });

  it('treats a missing isPayAsYouGo as not credit', () => {
    const policy = buildProviderCreditPolicy([
      connector('a', ConnectorProvider.GEMINI, true, undefined),
    ]);

    expect(policy.get('GEMINI')?.isCredit).toBe(false);
  });

  it('keeps the connector that made the provider credit even when a later one is not', () => {
    const policy = buildProviderCreditPolicy([
      connector('paid', ConnectorProvider.OPENROUTER, true, true),
      connector('free', ConnectorProvider.OPENROUTER, true, false),
    ]);

    expect(policy.get('OPENROUTER')).toEqual({ isCredit: true, connectorId: 'paid' });
  });
});

describe('resolveModelBilling (mirrors auth-service isMeteredProvider)', () => {
  it('answers from the connector policy, case-insensitively', () => {
    const policy = buildProviderCreditPolicy([
      connector('c1', ConnectorProvider.OPENAI, true, true),
    ]);

    expect(resolveModelBilling(' openai ', policy)).toEqual({
      mode: ModelBillingMode.CREDIT,
      source: ModelBillingSource.CONNECTOR,
      connectorId: 'c1',
    });
  });

  it('honours an admin who switched a default-paid provider to included', () => {
    const policy = buildProviderCreditPolicy([
      connector('c1', ConnectorProvider.OPENAI, true, false),
    ]);

    expect(resolveModelBilling('OPENAI', policy).mode).toBe(ModelBillingMode.INCLUDED);
  });

  it('falls back to PAYG_DEFAULT_PROVIDERS for a provider with no connector', () => {
    const policy = buildProviderCreditPolicy([]);

    expect(resolveModelBilling('ANTHROPIC', policy)).toEqual({
      mode: ModelBillingMode.CREDIT,
      source: ModelBillingSource.PROVIDER_DEFAULT,
      connectorId: null,
    });
    expect(resolveModelBilling('SOME_UNKNOWN', policy).mode).toBe(ModelBillingMode.INCLUDED);
  });

  it('never meters a local provider, even when its connector says credit', () => {
    const policy = buildProviderCreditPolicy([
      connector('o1', ConnectorProvider.OLLAMA, true, true),
    ]);

    expect(resolveModelBilling('ollama', policy)).toEqual({
      mode: ModelBillingMode.INCLUDED,
      source: ModelBillingSource.LOCAL_EXEMPT,
      connectorId: 'o1',
    });
    expect(isLocalExemptProvider('LLAMACPP')).toBe(true);
    expect(isLocalExemptProvider('OPENAI')).toBe(false);
  });
});

describe('billing filter helpers', () => {
  const policy = buildProviderCreditPolicy([
    connector('c1', ConnectorProvider.OPENAI, true, true),
    connector('c2', ConnectorProvider.GEMINI, true, false),
  ]);
  const rows = [{ provider: 'OPENAI' }, { provider: 'GEMINI' }, { provider: 'OLLAMA' }];

  it('matches modes to filters', () => {
    expect(matchesModelBillingFilter(ModelBillingMode.CREDIT, ModelBillingFilter.ALL)).toBe(true);
    expect(matchesModelBillingFilter(ModelBillingMode.CREDIT, ModelBillingFilter.CREDIT)).toBe(
      true,
    );
    expect(matchesModelBillingFilter(ModelBillingMode.CREDIT, ModelBillingFilter.INCLUDED)).toBe(
      false,
    );
    expect(matchesModelBillingFilter(ModelBillingMode.INCLUDED, ModelBillingFilter.INCLUDED)).toBe(
      true,
    );
  });

  it('filters rows by billing mode', () => {
    expect(filterRowsByBilling(rows, ModelBillingFilter.ALL, policy)).toHaveLength(3);
    expect(filterRowsByBilling(rows, ModelBillingFilter.CREDIT, policy)).toEqual([
      { provider: 'OPENAI' },
    ]);
    expect(filterRowsByBilling(rows, ModelBillingFilter.INCLUDED, policy)).toHaveLength(2);
  });

  it('counts rows per mode and resolves chip counts', () => {
    const counts = countModelsByBilling(rows, policy);

    expect(counts).toEqual({ [ModelBillingMode.CREDIT]: 1, [ModelBillingMode.INCLUDED]: 2 });
    expect(resolveModelBillingFilterCount(ModelBillingFilter.ALL, counts, 3)).toBe(3);
    expect(resolveModelBillingFilterCount(ModelBillingFilter.CREDIT, counts, 3)).toBe(1);
    expect(resolveModelBillingFilterCount(ModelBillingFilter.INCLUDED, counts, 3)).toBe(2);
  });
});
