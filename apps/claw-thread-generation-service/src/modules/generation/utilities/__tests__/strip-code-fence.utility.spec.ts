import { stripCodeFence } from '../strip-code-fence.utility';

const FENCE = '```';

describe('stripCodeFence', () => {
  it('unwraps a json fence', () => {
    expect(stripCodeFence(`${FENCE}json\n{"a":1}\n${FENCE}`)).toBe('{"a":1}');
  });

  it('unwraps a bare fence with surrounding whitespace', () => {
    expect(stripCodeFence(`  ${FENCE}\n{"a":1}\n${FENCE}  `)).toBe('{"a":1}');
  });

  it('leaves unfenced content untouched', () => {
    expect(stripCodeFence('{"a":1}')).toBe('{"a":1}');
  });
});
