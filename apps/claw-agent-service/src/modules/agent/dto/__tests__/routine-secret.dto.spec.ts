import {
  createRoutineSecretSchema,
  replaceRoutineSecretSchema,
  routineSecretNameSchema,
  setRoutineSecretsPolicySchema,
} from '../routine-secret.dto';

describe('routineSecretNameSchema', () => {
  it.each(['A', 'API_KEY', 'A1_B2', 'Z'.repeat(1) + '9'.repeat(63)])('accepts %s', (name) => {
    expect(routineSecretNameSchema.safeParse(name).success).toBe(true);
  });

  it('accepts exactly 64 characters and rejects 65', () => {
    expect(routineSecretNameSchema.safeParse(`A${'B'.repeat(63)}`).success).toBe(true);
    expect(routineSecretNameSchema.safeParse(`A${'B'.repeat(64)}`).success).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['lower case', 'api_key'],
    ['starts with digit', '1KEY'],
    ['starts with underscore', '_KEY'],
    ['dash', 'API-KEY'],
    ['space', 'API KEY'],
    ['dot', 'A.B'],
    ['newline suffix', 'KEY\n'],
    ['path traversal', '../KEY'],
    ['unicode', 'KÉY'],
    ['number', 5],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, name) => {
    expect(routineSecretNameSchema.safeParse(name).success).toBe(false);
  });

  it.each([
    'PATH',
    'HOME',
    'NODE_OPTIONS',
    'BASH_ENV',
    'CLAW_RUNNER_TOKEN',
    'LD_PRELOAD',
    'DYLD_INSERT_LIBRARIES',
  ])('rejects the reserved name %s', (name) => {
    expect(routineSecretNameSchema.safeParse(name).success).toBe(false);
  });

  it('does not reserve names that merely contain a reserved word', () => {
    expect(routineSecretNameSchema.safeParse('MY_PATH').success).toBe(true);
    expect(routineSecretNameSchema.safeParse('CLAWBACK').success).toBe(true);
  });
});

describe('createRoutineSecretSchema', () => {
  it('accepts a value of exactly 8192 bytes and rejects 8193', () => {
    expect(
      createRoutineSecretSchema.safeParse({ name: 'K', value: 'x'.repeat(8192) }).success,
    ).toBe(true);
    expect(
      createRoutineSecretSchema.safeParse({ name: 'K', value: 'x'.repeat(8193) }).success,
    ).toBe(false);
  });

  it('counts bytes, not characters', () => {
    expect(
      createRoutineSecretSchema.safeParse({ name: 'K', value: 'é'.repeat(4096) }).success,
    ).toBe(true);
    expect(
      createRoutineSecretSchema.safeParse({ name: 'K', value: 'é'.repeat(4097) }).success,
    ).toBe(false);
  });

  it('keeps the value byte for byte: no trim, no transform', () => {
    const result = createRoutineSecretSchema.safeParse({ name: 'K', value: '  padded\n' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.value).toBe('  padded\n');
  });

  it.each([
    ['empty value', { name: 'K', value: '' }],
    ['NUL in value', { name: 'K', value: 'a\0b' }],
    ['missing value', { name: 'K' }],
    ['missing name', { value: 'v' }],
    ['numeric value', { name: 'K', value: 5 }],
    ['null value', { name: 'K', value: null }],
    ['null body', null],
    ['array body', []],
  ])('rejects %s', (_label, body) => {
    expect(createRoutineSecretSchema.safeParse(body).success).toBe(false);
  });

  it('drops unknown keys such as userId or routineId', () => {
    const result = createRoutineSecretSchema.safeParse({
      name: 'K',
      value: 'v',
      userId: 'someone-else',
      routineId: 'other',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ name: 'K', value: 'v' });
  });

  it('never echoes the rejected value in its messages', () => {
    const sentinel = `SENTINEL-${'x'.repeat(9000)}`;
    const result = createRoutineSecretSchema.safeParse({ name: 'K', value: sentinel });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).not.toContain('SENTINEL');
    const nul = createRoutineSecretSchema.safeParse({ name: 'K', value: 'SENTINEL\0' });
    expect(JSON.stringify(nul.error?.issues)).not.toContain('SENTINEL');
  });
});

describe('replaceRoutineSecretSchema and setRoutineSecretsPolicySchema', () => {
  it('replace takes only a value', () => {
    expect(replaceRoutineSecretSchema.safeParse({ value: 'v' }).success).toBe(true);
    expect(replaceRoutineSecretSchema.safeParse({}).success).toBe(false);
  });

  it.each([true, false])('policy accepts %s', (flag) => {
    expect(
      setRoutineSecretsPolicySchema.safeParse({ webhookRunsReceiveSecrets: flag }).success,
    ).toBe(true);
  });

  it.each([{}, { webhookRunsReceiveSecrets: 'true' }, { webhookRunsReceiveSecrets: 1 }, null])(
    'policy rejects %j',
    (body) => {
      expect(setRoutineSecretsPolicySchema.safeParse(body).success).toBe(false);
    },
  );
});
