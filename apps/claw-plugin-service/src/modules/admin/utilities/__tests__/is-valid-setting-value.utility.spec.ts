import {
  isSettingValue,
  isValidSettingValue,
  settingRuleFor,
  storedSettingValue,
} from '../is-valid-setting-value.utility';

describe('isValidSettingValue', () => {
  it('accepts only booleans for a boolean rule', () => {
    expect(isValidSettingValue({ kind: 'boolean' }, true)).toBe(true);
    expect(isValidSettingValue({ kind: 'boolean' }, false)).toBe(true);
    expect(isValidSettingValue({ kind: 'boolean' }, 1)).toBe(false);
    expect(isValidSettingValue({ kind: 'boolean' }, 'true')).toBe(false);
  });

  it('accepts whole numbers inside the range, bounds included', () => {
    const rule = { kind: 'integer', min: 1, max: 10 } as const;

    expect(isValidSettingValue(rule, 1)).toBe(true);
    expect(isValidSettingValue(rule, 10)).toBe(true);
    expect(isValidSettingValue(rule, 0)).toBe(false);
    expect(isValidSettingValue(rule, 11)).toBe(false);
    expect(isValidSettingValue(rule, 2.5)).toBe(false);
    expect(isValidSettingValue(rule, Number.NaN)).toBe(false);
    expect(isValidSettingValue(rule, '5')).toBe(false);
    expect(isValidSettingValue(rule, true)).toBe(false);
  });
});

describe('settingRuleFor and isSettingValue', () => {
  it('knows the editable keys and nothing inherited', () => {
    expect(settingRuleFor('loop.maxRounds')).toEqual({ kind: 'integer', min: 1, max: 10 });
    expect(settingRuleFor('userServers.enabled')).toEqual({ kind: 'boolean' });
    expect(settingRuleFor('made.up')).toBeUndefined();
    expect(settingRuleFor('constructor')).toBeUndefined();
    expect(settingRuleFor('toString')).toBeUndefined();
  });

  it('knows the value kinds', () => {
    expect(isSettingValue(true)).toBe(true);
    expect(isSettingValue(3)).toBe(true);
    expect(isSettingValue('3')).toBe(false);
    expect(isSettingValue(null)).toBe(false);
    expect(isSettingValue({})).toBe(false);
  });
});

describe('storedSettingValue', () => {
  const rule = { kind: 'integer', min: 1, max: 10 } as const;

  it('returns the stored value while it is valid', () => {
    expect(storedSettingValue(rule, 4)).toBe(4);
  });

  it('returns undefined for a bad value, a wrong kind or no rule', () => {
    expect(storedSettingValue(rule, 40)).toBeUndefined();
    expect(storedSettingValue(rule, 'x')).toBeUndefined();
    expect(storedSettingValue(undefined, 4)).toBeUndefined();
  });
});
