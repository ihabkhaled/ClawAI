import {
  buildRepairHint,
  extractJsonObject,
  validateRouterDecision,
} from '../utilities/router-decision-validation.utility';

const ELIGIBLE = ['dep_a', 'dep_b'];

const decision = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    deploymentId: 'dep_a',
    workflow: 'DIRECT',
    confidence: 0.9,
    reasonCodes: ['DOMAIN_MATCH'],
    ...overrides,
  });

describe('extractJsonObject', () => {
  it('reads a bare object', () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it('reads an object out of surrounding prose', () => {
    expect(extractJsonObject('Sure! {"a":1} hope that helps')).toBe('{"a":1}');
  });

  it('reads an object out of a markdown fence', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('keeps nested objects intact', () => {
    expect(extractJsonObject('{"a":{"b":2}}')).toBe('{"a":{"b":2}}');
  });

  // A greedy /\{[\s\S]*\}/ swallows everything to the LAST brace, so trailing
  // prose containing one yields unparsable text. This is the exact bug in the
  // legacy parser at ollama-router.manager.ts.
  it('stops at the first balanced object when prose after it contains a brace', () => {
    expect(extractJsonObject('{"a":1} and then {not json')).toBe('{"a":1}');
  });

  it('ignores braces inside string values', () => {
    expect(extractJsonObject('{"a":"}{"}')).toBe('{"a":"}{"}');
  });

  it('ignores an escaped quote inside a string', () => {
    expect(extractJsonObject('{"a":"say \\"hi\\" }"}')).toBe('{"a":"say \\"hi\\" }"}');
  });

  it('returns null when there is no object', () => {
    expect(extractJsonObject('no json here')).toBeNull();
  });

  it('returns null for an unterminated object', () => {
    expect(extractJsonObject('{"a":1')).toBeNull();
  });
});

describe('validateRouterDecision', () => {
  it('accepts a well-formed decision naming an eligible deployment', () => {
    const result = validateRouterDecision(decision(), ELIGIBLE);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.decision.deploymentId).toBe('dep_a');
      expect(result.decision.confidence).toBe(0.9);
    }
  });

  it('defaults missing reason codes rather than rejecting', () => {
    const result = validateRouterDecision(
      JSON.stringify({ deploymentId: 'dep_a', workflow: 'DIRECT', confidence: 0.9 }),
      ELIGIBLE,
    );

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.decision.reasonCodes).toEqual([]);
    }
  });

  it.each([
    ['no json', 'nothing here', 'NO_JSON_OBJECT'],
    ['unparsable', '{"a": }', 'UNPARSABLE_JSON'],
  ])('rejects %s with %s', (_label, raw, rejection) => {
    const result = validateRouterDecision(raw, ELIGIBLE);
    expect(result).toEqual({ valid: false, rejection });
  });

  it.each([
    ['a missing field', { deploymentId: undefined }],
    ['a confidence above 1', { confidence: 1.4 }],
    ['a negative confidence', { confidence: -0.1 }],
    ['a non-numeric confidence', { confidence: 'high' }],
    ['an empty deployment id', { deploymentId: '' }],
  ])('rejects %s as a schema mismatch', (_label, overrides) => {
    const result = validateRouterDecision(decision(overrides), ELIGIBLE);
    expect(result).toEqual({ valid: false, rejection: 'SCHEMA_MISMATCH' });
  });

  // A model inventing keys has drifted from the contract; accepting the drift
  // is how an unreviewed field quietly becomes load-bearing.
  it('rejects unexpected extra keys', () => {
    const result = validateRouterDecision(decision({ hiddenReasoning: 'because' }), ELIGIBLE);
    expect(result).toEqual({ valid: false, rejection: 'SCHEMA_MISMATCH' });
  });

  // Hard policy filters run before ranking. Naming something outside the
  // eligible set is a hallucinated id or an attempt to reach past a privacy
  // or entitlement filter, and the model's memory never overrides the
  // verified candidate set.
  it('refuses a deployment outside the eligible set', () => {
    const result = validateRouterDecision(decision({ deploymentId: 'dep_secret' }), ELIGIBLE);
    expect(result).toEqual({ valid: false, rejection: 'DEPLOYMENT_NOT_ELIGIBLE' });
  });

  it('refuses everything when nothing is eligible', () => {
    const result = validateRouterDecision(decision(), []);
    expect(result).toEqual({ valid: false, rejection: 'DEPLOYMENT_NOT_ELIGIBLE' });
  });

  it('refuses an oversized answer before attempting to parse it', () => {
    const result = validateRouterDecision('x'.repeat(9_000), ELIGIBLE);
    expect(result).toEqual({ valid: false, rejection: 'OVERSIZED_RESPONSE' });
  });

  it('accepts the confidence boundaries', () => {
    expect(validateRouterDecision(decision({ confidence: 0 }), ELIGIBLE).valid).toBe(true);
    expect(validateRouterDecision(decision({ confidence: 1 }), ELIGIBLE).valid).toBe(true);
  });
});

describe('buildRepairHint', () => {
  it('restates the required shape', () => {
    const hint = buildRepairHint('garbage');

    expect(hint).toContain('deploymentId');
    expect(hint).toContain('confidence');
  });

  // A bare "try again" reliably produces the same malformed answer twice.
  it('echoes the rejected answer back', () => {
    expect(buildRepairHint('I think dep_a is best')).toContain('I think dep_a is best');
  });

  it('truncates a very long rejected answer', () => {
    const hint = buildRepairHint('x'.repeat(5_000));
    expect(hint.length).toBeLessThan(1_200);
  });
});
