import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PLUGIN_SETTING_BOUNDS } from '../plugin-installs.constants';

const SERVICE_SRC = join(__dirname, '..', '..', '..', '..', 'claw-plugin-service', 'src');

function readService(relativePath: string): string {
  return readFileSync(join(SERVICE_SRC, relativePath), 'utf8');
}

function toNumber(text: string): number {
  return Number(text.replaceAll('_', ''));
}

/** `NAME = 'value'` pairs of the service's PluginSettingKey enum. */
function settingKeys(): Map<string, string> {
  const source = readService('common/enums/plugin-setting-key.enum.ts');
  return new Map(
    [...source.matchAll(/(\w+) = '([\w.]+)'/gu)].map((match) => [match[1] ?? '', match[2] ?? '']),
  );
}

/** `export const NAME = 1_000;` numbers of the service's catalog constants. */
function catalogNumbers(): Map<string, number> {
  const source = readService('modules/catalog/constants/catalog.constants.ts');
  return new Map(
    [...source.matchAll(/export const (\w+) = ([\d_]+);/gu)].map((match) => [
      match[1] ?? '',
      toNumber(match[2] ?? ''),
    ]),
  );
}

function resolve(token: string, numbers: Map<string, number>): number {
  return /^[\d_]+$/u.test(token) ? toNumber(token) : (numbers.get(token) ?? Number.NaN);
}

/** Every integer rule of the service: key -> { min, max }. */
function serviceIntegerBounds(): Record<string, { min: number; max: number }> {
  const source = readService('modules/admin/constants/admin-settings.constants.ts');
  const keys = settingKeys();
  const numbers = catalogNumbers();
  const bounds: Record<string, { min: number; max: number }> = {};
  const rule = /\[PluginSettingKey\.(\w+)\]: \{ kind: 'integer', min: ([\w_]+), max: ([\w_]+) \}/gu;
  for (const match of source.matchAll(rule)) {
    const key = keys.get(match[1] ?? '') ?? '';
    bounds[key] = {
      min: resolve(match[2] ?? '', numbers),
      max: resolve(match[3] ?? '', numbers),
    };
  }
  return bounds;
}

describe('PLUGIN_SETTING_BOUNDS', () => {
  const service = serviceIntegerBounds();

  it('reads at least the seven known integer rules from the service', () => {
    expect(Object.keys(service).sort()).toEqual(Object.keys(PLUGIN_SETTING_BOUNDS).sort());
    expect(Object.keys(service)).toHaveLength(7);
  });

  it('equals the plugin service range for every integer setting', () => {
    expect(PLUGIN_SETTING_BOUNDS).toEqual(service);
  });

  it('pins the ranges the admin page promised', () => {
    expect(PLUGIN_SETTING_BOUNDS['loop.maxRounds']).toEqual({ min: 1, max: 10 });
    expect(PLUGIN_SETTING_BOUNDS['call.timeoutMs']).toEqual({ min: 1_000, max: 60_000 });
    expect(PLUGIN_SETTING_BOUNDS['call.maxResultBytes']).toEqual({ min: 1_024, max: 262_144 });
  });
});
