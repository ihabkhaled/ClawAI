import { RoutingMode } from '../../../../generated/prisma';
import { isAutoRouteSentinel, resolveRuntimeRouting } from '../runtime-v2-routing.utility';

describe('runtime-v2 routing selection', () => {
  it('recognises the automatic-routing sentinel regardless of case or padding', () => {
    expect(isAutoRouteSentinel('AUTO')).toBe(true);
    expect(isAutoRouteSentinel('auto')).toBe(true);
    expect(isAutoRouteSentinel('  Auto  ')).toBe(true);
    expect(isAutoRouteSentinel('OPENAI')).toBe(false);
    expect(isAutoRouteSentinel('automatic')).toBe(false);
  });

  it('routes automatically instead of pinning a connector named AUTO', () => {
    // The regression: AUTO/AUTO was published as MANUAL_MODEL, so the executor
    // asked the connector service for a provider named "AUTO" and every
    // auto-routed Runtime V2 run failed before the model was called.
    expect(resolveRuntimeRouting('AUTO', 'AUTO')).toEqual({
      routingMode: RoutingMode.AUTO,
    });
  });

  it('routes automatically when only one half is the sentinel', () => {
    expect(resolveRuntimeRouting('AUTO', 'gpt-4o-mini')).toEqual({
      routingMode: RoutingMode.AUTO,
    });
    expect(resolveRuntimeRouting('OPENAI', 'AUTO')).toEqual({
      routingMode: RoutingMode.AUTO,
    });
  });

  it('keeps an explicit manual selection pinned', () => {
    expect(resolveRuntimeRouting('OPENAI', 'gpt-4o-mini')).toEqual({
      routingMode: RoutingMode.MANUAL_MODEL,
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      allowedModels: ['OPENAI/gpt-4o-mini'],
    });
  });
});
