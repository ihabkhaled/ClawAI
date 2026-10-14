import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';

import { CatalogStatus } from '../../../../common/enums/catalog-status.enum';
import { InstallStatus } from '../../../../common/enums/install-status.enum';
import { RuntimeKind } from '../../../../common/enums/runtime-kind.enum';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { INSTALL, USER } from '../../__tests__/runtime-fixtures';
import { type InstallTargetRecord } from '../../types/target-record.types';
import { PluginResolveService } from '../plugin-resolve.service';

const LIMITS = { maxRounds: 5, maxCallsPerTurn: 6 };

function install(overrides: Partial<InstallTargetRecord> = {}): InstallTargetRecord {
  return {
    installId: INSTALL,
    pluginId: 'plugin-1',
    status: InstallStatus.ENABLED,
    settings: {},
    slug: 'weather',
    catalogStatus: CatalogStatus.PUBLISHED,
    globallyEnabled: true,
    runtimeKind: RuntimeKind.BUILTIN,
    manifest: WEATHER_MANIFEST,
    disabledTools: [],
    credential: null,
    consents: [],
    ...overrides,
  };
}

function build(record: InstallTargetRecord | null, planError?: Error) {
  const targets = { findInstall: vi.fn().mockResolvedValue(record) };
  const planGate = {
    assertAllowed:
      planError === undefined
        ? vi.fn().mockResolvedValue(undefined)
        : vi.fn().mockRejectedValue(planError),
  };
  const settings = { loadLoopLimits: vi.fn().mockResolvedValue(LIMITS) };
  const service = new PluginResolveService(
    targets as never,
    planGate as never,
    settings as never,
    { offer: vi.fn().mockResolvedValue({ tools: [], lines: [], notices: [] }) } as never,
  );
  return { service, targets, planGate, settings };
}

const body = (
  refs: Array<{ installId: string; toolName?: string }> = [{ installId: INSTALL }],
) => ({ userId: USER, surface: 'chat', refs });

describe('PluginResolveService', () => {
  it('offers every enabled tool of a mentioned plugin under its native name', async () => {
    const { service, targets } = build(install());
    const result = await service.resolve(body());
    expect(targets.findInstall).toHaveBeenCalledWith(USER, INSTALL);
    expect(result.tools.length).toBeGreaterThan(0);
    for (const tool of result.tools) {
      expect(tool.nativeName).toBe(`plugin_weather_${tool.toolName}`);
      expect(tool.nativeName.length).toBeLessThanOrEqual(64);
      expect(tool.installId).toBe(INSTALL);
    }
    expect(result.limits).toEqual(LIMITS);
    expect(result.notices).toEqual([]);
    expect(result.systemBlock).toContain('weather');
  });

  it('offers only the picked tool when the chip names one', async () => {
    const first = (await build(install()).service.resolve(body())).tools[0];
    const { service } = build(install());
    const result = await service.resolve(body([{ installId: INSTALL, toolName: first?.toolName }]));
    expect(result.tools.map((tool) => tool.toolName)).toEqual([first?.toolName]);
  });

  it('drops tools an admin disabled', async () => {
    const all = (await build(install()).service.resolve(body())).tools;
    const { service } = build(install({ disabledTools: all.map((tool) => tool.toolName) }));
    const result = await service.resolve(body());
    expect(result.tools).toEqual([]);
    expect(result.notices).toEqual([{ code: 'PLUGIN_NO_TOOLS' }]);
  });

  it.each([
    ['not found or not the caller', null],
    ['disabled by the user', install({ status: InstallStatus.DISABLED })],
    ['withdrawn from the catalog', install({ catalogStatus: CatalogStatus.HIDDEN })],
    ['switched off globally', install({ globallyEnabled: false })],
    ['holding a manifest that no longer parses', install({ manifest: { broken: true } })],
  ])('offers nothing for an install that is %s', async (_label, record) => {
    const result = await build(record).service.resolve(body());
    expect(result.tools).toEqual([]);
    expect(result.notices).toEqual([{ code: 'PLUGIN_NO_TOOLS' }]);
  });

  it('looks each mentioned install up once', async () => {
    const { service, targets } = build(install());
    await service.resolve(body([{ installId: INSTALL }, { installId: INSTALL, toolName: 'x' }]));
    expect(targets.findInstall).toHaveBeenCalledTimes(1);
  });

  it('answers with no tools and a notice when the plan has no plugins', async () => {
    const { service, targets } = build(install(), new ForbiddenException());
    const result = await service.resolve(body());
    expect(result.tools).toEqual([]);
    expect(result.notices).toEqual([{ code: 'PLUGIN_NO_TOOLS' }]);
    expect(targets.findInstall).not.toHaveBeenCalled();
  });

  it('fails closed (the error reaches the caller) when the plan cannot be read', async () => {
    const { service } = build(install(), new ServiceUnavailableException());
    await expect(service.resolve(body())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
