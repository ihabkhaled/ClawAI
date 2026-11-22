import { buildBriefResearchQueries, buildFallbackResearchQueries } from '../research-query.utility';

/** The production topic box of 2026-11-22: an instruction about length, not a subject. */
const INSTRUCTION_BOX =
  'this topic is huge, I want you to give me a very gignatic thread, never skip any detail, write the plan 100% done, and write the whole thing, never skip any detail or cpncise Never concise';

describe('research queries when the topic box may be an instruction (2026-11-22)', () => {
  it('searches the planner subject and queries, never the box text itself', () => {
    const queries = buildBriefResearchQueries(INSTRUCTION_BOX, {
      subject: 'High-throughput RFID event architecture for hundreds of warehouses',
      researchQueries: ['RFID reader event ingestion Kafka', 'warehouse RFID deduplication'],
    });

    expect(queries).toContain('RFID reader event ingestion Kafka');
    expect(queries).toContain('warehouse RFID deduplication');
    expect(queries.some((query) => /gignatic|concise|skip any detail/iu.test(query))).toBe(false);
    expect(queries.some((query) => query.includes('RFID event architecture'))).toBe(true);
  });

  it('still searches a source the box names (a DOI) next to the planner queries', () => {
    const queries = buildBriefResearchQueries('Make it long. See doi:10.1145/3600006.3613165', {
      subject: 'Event sourcing for inventory',
      researchQueries: ['event sourcing inventory'],
    });

    expect(queries.some((query) => query.includes('10.1145/3600006.3613165'))).toBe(true);
    expect(queries).toContain('event sourcing inventory');
  });

  it('caps the planner at six queries and drops blank or repeated ones', () => {
    const queries = buildBriefResearchQueries('x', {
      subject: 'S',
      researchQueries: ['a b', 'A B', '', 'c d', 'e f', 'g h', 'i j', 'k l', 'm n'],
    });

    expect(queries.length).toBeLessThanOrEqual(6);
    expect(queries.filter((query) => query.toLowerCase() === 'a b')).toHaveLength(1);
  });

  it('without a planner answer, interleaves the box queries with the conversation ones', () => {
    const queries = buildFallbackResearchQueries(
      INSTRUCTION_BOX,
      'RFID architecture. hundreds of warehouses with RFID readers and containers',
    );

    expect(queries.some((query) => /RFID/u.test(query))).toBe(true);
    expect(queries.length).toBeLessThanOrEqual(6);
  });

  it('uses only the box when the conversation gives nothing', () => {
    expect(buildFallbackResearchQueries('How do bees communicate?', '   ')).toEqual([
      'How do bees communicate?',
    ]);
  });
});
