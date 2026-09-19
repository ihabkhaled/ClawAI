import { PlannedResearchAction } from '../../../../common/enums/planned-research-action.enum';
import { parseCrawlFollowUp, parseResearchPlan } from '../research-plan.utility';

describe('parseResearchPlan', () => {
  const plan = (raw: unknown, userUrls: string[] = []) =>
    parseResearchPlan(typeof raw === 'string' ? raw : JSON.stringify(raw), userUrls);

  it('reads a well-formed search plan', () => {
    expect(
      plan({
        action: 'search',
        urls: [],
        query: 'ceasefire news today',
        maxPages: 5,
        narration: 'I will check the news.',
      }),
    ).toMatchObject({
      action: PlannedResearchAction.SEARCH,
      query: 'ceasefire news today',
      narration: 'I will check the news.',
    });
  });

  it('tolerates prose around the JSON object', () => {
    expect(
      plan('Sure! {"action":"answer","urls":[],"query":null,"maxPages":1,"narration":"x"} done')
        ?.action,
    ).toBe(PlannedResearchAction.ANSWER);
  });

  // Returning null makes the caller try the NEXT model. Falling back to
  // "answer" here would end the walk on one bad reply — the old gate did that.
  it('returns null for an unparseable reply so the next model is tried', () => {
    expect(plan('I think you should search the web')).toBeNull();
    expect(plan({ action: 'teleport', urls: [], narration: 'x' })).toBeNull();
  });

  // Rule 41: a link the user wrote is OPENED, never just searched for. A
  // planner that says "search" for "summarise example.com" is overruled.
  it('never lets a model skip opening a link the user wrote', () => {
    const result = plan({ action: 'search', urls: [], query: 'example', narration: 'x' }, [
      'https://example.com/',
    ]);
    expect(result?.action).toBe(PlannedResearchAction.CRAWL_THEN_SEARCH);
    expect(result?.urls).toEqual(['https://example.com/']);
  });

  it('never drops a user URL and ignores model-invented non-web URLs', () => {
    const result = plan(
      {
        action: 'crawl',
        urls: ['javascript:alert(1)', 'https://docs.example.com/'],
        narration: 'x',
      },
      ['https://example.com/'],
    );
    expect(result?.urls).toEqual(['https://example.com/', 'https://docs.example.com/']);
  });

  it('downgrades a crawl with no URL at all to a search', () => {
    expect(plan({ action: 'crawl', urls: [], query: 'x y z', narration: 'x' })?.action).toBe(
      PlannedResearchAction.SEARCH,
    );
  });

  it('bounds the page count', () => {
    expect(
      plan({ action: 'crawl', urls: ['https://a.com/'], maxPages: 9999, narration: 'x' })?.maxPages,
    ).toBe(30);
    expect(
      plan({ action: 'crawl', urls: ['https://a.com/'], maxPages: -3, narration: 'x' })?.maxPages,
    ).toBe(12);
  });

  it('caps an over-long narration', () => {
    expect(
      plan({ action: 'answer', urls: [], narration: 'a'.repeat(900) })?.narration.length,
    ).toBeLessThanOrEqual(300);
  });
});

describe('parseCrawlFollowUp', () => {
  it('reads a follow-up that still wants a search', () => {
    expect(
      parseCrawlFollowUp(
        '{"needsSearch":true,"query":"acme competitors","narration":"Checking rivals."}',
      ),
    ).toEqual({
      needsSearch: true,
      query: 'acme competitors',
      narration: 'Checking rivals.',
    });
  });

  it('returns null when the reply is unusable', () => {
    expect(parseCrawlFollowUp('nope')).toBeNull();
    expect(parseCrawlFollowUp('{"needsSearch":"yes"}')).toBeNull();
  });
});
