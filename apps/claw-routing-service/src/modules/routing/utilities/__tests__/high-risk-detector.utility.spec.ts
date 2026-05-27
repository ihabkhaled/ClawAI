import { detectHighRisk } from '../high-risk-detector.utility';

describe('detectHighRisk', () => {
  it('flags legal keywords as high risk', () => {
    const signal = detectHighRisk('Help me file a lawsuit against my landlord', null);
    expect(signal.isHighRisk).toBe(true);
    expect(signal.matchedKeywords).toContain('lawsuit');
  });

  it('flags medical keywords as high risk', () => {
    const signal = detectHighRisk('What dosage of ibuprofen should I prescribe?', null);
    expect(signal.isHighRisk).toBe(true);
    expect(signal.matchedKeywords).toEqual(expect.arrayContaining(['dosage', 'prescribe']));
  });

  it('flags finance keywords as high risk', () => {
    const signal = detectHighRisk('Walk me through filing a 10-K for an audit', null);
    expect(signal.isHighRisk).toBe(true);
    expect(signal.matchedKeywords).toEqual(expect.arrayContaining(['audit', '10-k']));
  });

  it('flags destructive infra commands as high risk', () => {
    const signal = detectHighRisk('Run drop database analytics on production', null);
    expect(signal.isHighRisk).toBe(true);
    expect(signal.matchedKeywords).toContain('drop database');
  });

  it('does not flag innocent dropdown / patient walk-through', () => {
    const signal = detectHighRisk(
      'How do I render a dropdown menu in React? Just be patient with me.',
      null,
    );
    expect(signal.isHighRisk).toBe(false);
  });

  it('flags HIGH analyzer riskLevel even when no keyword match', () => {
    const signal = detectHighRisk('Help me think about this carefully please', 'HIGH');
    expect(signal.isHighRisk).toBe(true);
    expect(signal.matchedKeywords).toHaveLength(0);
    expect(signal.analyzerRiskLevel).toBe('HIGH');
  });

  it('flags CRITICAL analyzer riskLevel', () => {
    const signal = detectHighRisk('totally innocent text', 'CRITICAL');
    expect(signal.isHighRisk).toBe(true);
  });

  it('ignores MEDIUM analyzer riskLevel', () => {
    const signal = detectHighRisk('totally innocent text', 'MEDIUM');
    expect(signal.isHighRisk).toBe(false);
  });

  it('is case insensitive', () => {
    const signal = detectHighRisk('LAWSUIT pending against us', null);
    expect(signal.isHighRisk).toBe(true);
    expect(signal.matchedKeywords).toContain('lawsuit');
  });

  it('matches multi-word phrases', () => {
    const signal = detectHighRisk('please send a cease and desist letter', null);
    expect(signal.isHighRisk).toBe(true);
    expect(signal.matchedKeywords).toContain('cease and desist');
  });

  it('returns empty signal for empty input', () => {
    const signal = detectHighRisk('', null);
    expect(signal.isHighRisk).toBe(false);
    expect(signal.matchedKeywords).toHaveLength(0);
  });
});
