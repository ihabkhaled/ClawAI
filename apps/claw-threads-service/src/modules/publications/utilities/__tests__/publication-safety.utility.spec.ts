import { evaluatePublicationSafety } from '../publication-safety.utility';

describe('evaluatePublicationSafety', () => {
  it('approves ordinary article content', () => {
    expect(evaluatePublicationSafety('# Research\n\nA sourced explanation.')).toEqual({
      approved: true,
      reasons: [],
    });
  });

  it('rejects credential and personal-data patterns without returning matched text', () => {
    const result = evaluatePublicationSafety(
      ['Contact person@example.com; api_key=', 'A'.repeat(20)].join(''),
    );

    expect(result).toEqual({ approved: false, reasons: ['POSSIBLE_SECRET', 'POSSIBLE_PII'] });
    expect(JSON.stringify(result)).not.toContain('person@example.com');
    expect(JSON.stringify(result)).not.toContain('A'.repeat(20));
  });

  it('detects credentials in publication content with escaped line breaks', () => {
    expect(evaluatePublicationSafety(`# Private draft\n\napi_key=${'A'.repeat(20)}`)).toEqual({
      approved: false,
      reasons: ['POSSIBLE_SECRET'],
    });
  });
});
