import { BadRequestException } from '@nestjs/common';

import { parsePluginManifest } from '../../../catalog/utilities/parse-plugin-manifest.utility';
import { WEATHER_MANIFEST } from '../../../seeding/constants/manifests/weather.manifest';
import { InstallSettingsManager } from '../install-settings.manager';

function manifest() {
  const parsed = parsePluginManifest(WEATHER_MANIFEST);
  if (!parsed.ok) throw new Error('fixture manifest must parse');
  return parsed.manifest;
}

describe('InstallSettingsManager', () => {
  const manager = new InstallSettingsManager();

  it('fills defaults when nothing is given', () => {
    expect(manager.resolve(manifest(), undefined)).toEqual({ units: 'metric' });
  });

  it('keeps a valid value', () => {
    expect(manager.resolve(manifest(), { units: 'imperial' })).toEqual({ units: 'imperial' });
  });

  it('answers 400 with paths and reasons but never the offending value', () => {
    let response: unknown;
    try {
      manager.resolve(manifest(), { units: 'SECRET-UNIT', surprise: 1 });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      response = (error as BadRequestException).getResponse();
    }

    expect(response).toMatchObject({
      errorCode: 'PLUGIN_SETTINGS_INVALID',
      errors: expect.arrayContaining([
        { field: 'units', message: 'value not allowed' },
        { field: 'surprise', message: 'unknown key' },
      ]),
    });
    expect(JSON.stringify(response)).not.toContain('SECRET-UNIT');
  });

  it('names the root when the whole value is the problem', () => {
    const big = { units: 'metric', pad: 'x'.repeat(9000) };

    expect(() => manager.resolve(manifest(), big)).toThrow(BadRequestException);
    try {
      manager.resolve(manifest(), big);
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        errors: [{ field: '<root>', message: 'settings too large' }],
      });
    }
  });
});
