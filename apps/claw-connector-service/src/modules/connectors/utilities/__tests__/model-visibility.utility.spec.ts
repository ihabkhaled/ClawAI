import { describe, expect, it } from 'vitest';
import type {
  ModelVisibilityGate,
  ModelVisibilityRow,
  RoutingModelVisibility,
} from '../../types/connectors.types';
import {
  connectorVisibilityGates,
  routingVisibilityGates,
  summarizeVisibility,
  visibilityProviderKey,
} from '../model-visibility.utility';

const row = (overrides: Partial<ModelVisibilityRow> = {}): ModelVisibilityRow => ({
  connectorId: 'c1',
  provider: 'GEMINI',
  modelKey: 'models/gemini-2.5-pro',
  displayName: 'Gemini 2.5 Pro',
  kind: 'CHAT',
  kindReason: null,
  exposure: 'EXPOSED',
  lifecycle: 'ACTIVE',
  connector: { name: 'Gemini', isEnabled: true, providerDefinition: null },
  ...overrides,
});
const routing = (overrides: Partial<RoutingModelVisibility> = {}): RoutingModelVisibility => ({
  inRegistry: true,
  lifecycle: 'ACTIVE',
  isRouterOnly: false,
  costClass: 'STANDARD',
  ...overrides,
});
const gate = (gates: ModelVisibilityGate[], name: string) => gates.find((g) => g.gate === name);

describe('connectorVisibilityGates', () => {
  it('passes every connector gate for an exposed, active chat model', () => {
    expect(connectorVisibilityGates(row()).map((g) => g.status)).toEqual([
      'PASS',
      'PASS',
      'PASS',
      'PASS',
      'PASS',
    ]);
  });

  it('fails EXISTS and skips the rest when no row exists', () => {
    const gates = connectorVisibilityGates(null);
    expect(gates[0]).toMatchObject({ gate: 'EXISTS', status: 'FAIL' });
    expect(gates.slice(1).every((g) => g.status === 'SKIPPED')).toBe(true);
  });

  it('fails CONNECTOR_ENABLED for a disabled connector or an inactive custom provider', () => {
    const disabled = row({ connector: { name: 'G', isEnabled: false, providerDefinition: null } });
    expect(gate(connectorVisibilityGates(disabled), 'CONNECTOR_ENABLED')?.status).toBe('FAIL');
    const inactive = row({
      connector: { name: 'G', isEnabled: true, providerDefinition: { key: 'X', isActive: false } },
    });
    expect(gate(connectorVisibilityGates(inactive), 'CONNECTOR_ENABLED')?.detail).toContain(
      'inactive',
    );
  });

  it('fails LIFECYCLE_ACTIVE for a SUNSET model', () => {
    expect(
      gate(connectorVisibilityGates(row({ lifecycle: 'SUNSET' })), 'LIFECYCLE_ACTIVE')?.status,
    ).toBe('FAIL');
  });

  it('fails EXPOSED for an unexposed model', () => {
    expect(gate(connectorVisibilityGates(row({ exposure: 'UNEXPOSED' })), 'EXPOSED')?.status).toBe(
      'FAIL',
    );
  });

  it('fails KIND_CHAT for an exposed TOOL model and quotes the reason', () => {
    const kindGate = gate(
      connectorVisibilityGates(
        row({
          modelKey: 'models/gemini-decision-1',
          kind: 'TOOL',
          kindReason: 'Google lists only: createDecision',
        }),
      ),
      'KIND_CHAT',
    );
    expect(kindGate?.status).toBe('FAIL');
    expect(kindGate?.detail).toContain('Google lists only: createDecision');
  });

  it('passes KIND_CHAT for an audio-output model and fails it for input-only audio', () => {
    expect(
      gate(
        connectorVisibilityGates(row({ kind: 'AUDIO', modelKey: 'gpt-4o-mini-tts' })),
        'KIND_CHAT',
      )?.status,
    ).toBe('PASS');
    expect(
      gate(connectorVisibilityGates(row({ kind: 'AUDIO', modelKey: 'whisper-1' })), 'KIND_CHAT')
        ?.status,
    ).toBe('FAIL');
  });
});

describe('routingVisibilityGates', () => {
  it('passes registry, router-only and price for a priced registry model', () => {
    expect(routingVisibilityGates(routing()).map((g) => g.status)).toEqual([
      'PASS',
      'PASS',
      'PASS',
    ]);
  });

  it('fails IN_ROUTING_REGISTRY when absent or REMOVED, and skips router-only', () => {
    const absent = routingVisibilityGates(routing({ inRegistry: false, lifecycle: null }));
    expect(absent[0]?.status).toBe('FAIL');
    expect(absent[1]?.status).toBe('SKIPPED');
    expect(routingVisibilityGates(routing({ lifecycle: 'REMOVED' }))[0]?.status).toBe('FAIL');
  });

  it('fails NOT_ROUTER_ONLY for a router-only model', () => {
    expect(routingVisibilityGates(routing({ isRouterOnly: true }))[1]?.status).toBe('FAIL');
  });

  it('fails PRICED for an unpriced model', () => {
    expect(routingVisibilityGates(routing({ costClass: null }))[2]?.status).toBe('FAIL');
  });

  it('reports every routing gate UNKNOWN when routing-service did not answer', () => {
    expect(routingVisibilityGates(null).every((g) => g.status === 'UNKNOWN')).toBe(true);
  });
});

describe('summarizeVisibility', () => {
  it('is visible only when every gate passes, and names the first failure', () => {
    const ok = [...connectorVisibilityGates(row()), ...routingVisibilityGates(routing())];
    expect(summarizeVisibility(ok)).toEqual({ visibleInPicker: true, firstFailingGate: null });
    const hidden = [
      ...connectorVisibilityGates(row({ kind: 'TOOL' })),
      ...routingVisibilityGates(routing({ inRegistry: false })),
    ];
    expect(summarizeVisibility(hidden)).toEqual({
      visibleInPicker: false,
      firstFailingGate: 'KIND_CHAT',
    });
  });

  it('is not visible when a gate is UNKNOWN', () => {
    const gates = [...connectorVisibilityGates(row()), ...routingVisibilityGates(null)];
    expect(summarizeVisibility(gates)).toEqual({ visibleInPicker: false, firstFailingGate: null });
  });
});

describe('visibilityProviderKey', () => {
  it('uses a custom provider key, else the enum', () => {
    expect(visibilityProviderKey(row())).toBe('GEMINI');
    expect(
      visibilityProviderKey(
        row({
          connector: {
            name: 'N',
            isEnabled: true,
            providerDefinition: { key: 'NIM', isActive: true },
          },
        }),
      ),
    ).toBe('NIM');
  });
});
