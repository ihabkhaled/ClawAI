import { PII_PATTERNS, SECRET_PATTERNS } from '../secret-patterns.constants';

// Adversarial inputs shaped to trigger catastrophic backtracking: long runs
// that ALMOST match, then fail at the very end.
const EVIL_INPUTS = [
  `${'1'.repeat(20_000)}x`,
  `${'1234 '.repeat(4000)}x`,
  `${'a'.repeat(20_000)}!`,
  `${'sk-'.repeat(5000)}!`,
  `${'a.'.repeat(10_000)}@`,
  `${'AB12'.repeat(5000)}!`,
  `${'-'.repeat(20_000)}x`,
  `${'eyJ'.repeat(5000)}.`,
];

// Generous relative to the ~0.05ms these actually take. A pattern that
// backtracked would blow past this by orders of magnitude, not miss it
// narrowly, so the threshold does not need to be tight to be meaningful.
const MAX_MATCH_MS = 100;

describe('secret and PII patterns', () => {
  // These run against message content a stranger controls. A pattern that
  // backtracks catastrophically turns "user pastes a long string into a chat"
  // into a denial of service on the publish path.
  describe.each([
    ['SECRET_PATTERNS', SECRET_PATTERNS],
    ['PII_PATTERNS', PII_PATTERNS],
  ])('%s', (_label, patterns) => {
    it.each(patterns.map((pattern, index) => [index, pattern]))(
      'pattern %i resists adversarial input',
      (_index, pattern: RegExp) => {
        for (const input of EVIL_INPUTS) {
          const startedAt = process.hrtime.bigint();
          pattern.test(input);
          const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
          expect(elapsedMs).toBeLessThan(MAX_MATCH_MS);
        }
      },
    );

    it.each(patterns.map((pattern, index) => [index, pattern]))(
      'pattern %i is not global, so .test() is stateless',
      (_index, pattern: RegExp) => {
        // A /g regex carries lastIndex between calls, so the SAME pattern would
        // match on one message and silently miss on the next. Every scan here
        // must be independent.
        expect(pattern.global).toBe(false);
      },
    );
  });
});
