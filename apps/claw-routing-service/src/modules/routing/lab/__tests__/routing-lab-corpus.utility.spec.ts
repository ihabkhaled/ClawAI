import { RouterErrorCode, RoutingLabCaseCategory } from '../../../../common/enums';
import { buildRoutingLabCorpus } from '../utilities/routing-lab-corpus.utility';
import { buildRoutingLabFaultSingleCases } from '../utilities/routing-lab-fault-single-cases.utility';

describe('buildRoutingLabCorpus', () => {
  it('builds exactly 300 cases', () => {
    expect(buildRoutingLabCorpus()).toHaveLength(300);
  });

  it('splits into 252 baseline, 15 fault-single, 15 fault-compound and 18 edge cases', () => {
    const corpus = buildRoutingLabCorpus();
    const byCategory = new Map<RoutingLabCaseCategory, number>();
    for (const labCase of corpus) {
      byCategory.set(labCase.category, (byCategory.get(labCase.category) ?? 0) + 1);
    }

    expect(byCategory.get(RoutingLabCaseCategory.BASELINE)).toBe(252);
    expect(byCategory.get(RoutingLabCaseCategory.FAULT_SINGLE)).toBe(15);
    expect(byCategory.get(RoutingLabCaseCategory.FAULT_COMPOUND)).toBe(15);
    expect(byCategory.get(RoutingLabCaseCategory.EDGE_CASE)).toBe(18);
  });

  it('gives every case a unique id', () => {
    const corpus = buildRoutingLabCorpus();
    const ids = new Set(corpus.map((labCase) => labCase.id));
    expect(ids.size).toBe(corpus.length);
  });

  it('never leaves a prompt undefined or a negative-length eligible set', () => {
    for (const labCase of buildRoutingLabCorpus()) {
      expect(typeof labCase.prompt).toBe('string');
      expect(labCase.eligibleDeploymentIds.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('covers every domain tag and every privacy class in the baseline slice', () => {
    const corpus = buildRoutingLabCorpus();
    const baseline = corpus.filter((c) => c.category === RoutingLabCaseCategory.BASELINE);

    const domains = new Set(baseline.map((c) => c.domain));
    const privacyClasses = new Set(baseline.map((c) => c.privacyClass));

    expect(domains.size).toBe(21);
    expect(privacyClasses.size).toBe(4);
  });
});

describe('buildRoutingLabFaultSingleCases', () => {
  it('builds one case per RouterErrorCode value', () => {
    const cases = buildRoutingLabFaultSingleCases();
    expect(cases).toHaveLength(Object.values(RouterErrorCode).length);
  });

  it('tags every case FAULT_SINGLE and injects exactly one fault on Gemini', () => {
    for (const labCase of buildRoutingLabFaultSingleCases()) {
      expect(labCase.category).toBe(RoutingLabCaseCategory.FAULT_SINGLE);
      const geminiSteps = Object.values(labCase.faultPlan)[0];
      expect(geminiSteps).toHaveLength(1);
    }
  });

  it('injects a distinct code per case, covering the whole taxonomy', () => {
    const codes = buildRoutingLabFaultSingleCases().map((labCase) => {
      const steps = Object.values(labCase.faultPlan)[0];
      const [step] = steps ?? [];
      return step?.outcome === 'FAULT' ? step.code : null;
    });

    expect(new Set(codes)).toEqual(new Set(Object.values(RouterErrorCode)));
  });
});
