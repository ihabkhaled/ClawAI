import { PlannedResearchAction } from '../../../../common/enums/planned-research-action.enum';
import { ResearchRenderHint } from '../../../../common/enums/research-render-hint.enum';
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

  describe('render hint', () => {
    const crawl = (render: unknown) =>
      plan({ action: 'crawl', urls: ['https://app.example.com/'], render }, [
        'https://app.example.com/',
      ]);

    it('keeps a valid js/stealth hint on a crawl', () => {
      expect(crawl('js')?.render).toBe(ResearchRenderHint.JS);
      expect(crawl(' Stealth ')?.render).toBe(ResearchRenderHint.STEALTH);
    });

    it('drops anything else instead of guessing (null, unknown word, wrong type)', () => {
      expect(crawl(null)?.render).toBeUndefined();
      expect(crawl('turbo')?.render).toBeUndefined();
      expect(crawl(1)?.render).toBeUndefined();
    });

    it('ignores a hint on a plan that opens no page', () => {
      expect(plan({ action: 'search', query: 'news today', render: 'js' })?.render).toBeUndefined();
      expect(plan({ action: 'answer', render: 'stealth' })?.render).toBeUndefined();
    });

    it('does not change the rule that a user link is always opened', () => {
      const overruled = plan({ action: 'answer', render: 'js' }, ['https://a.example.com/']);
      expect(overruled?.action).toBe(PlannedResearchAction.CRAWL_THEN_SEARCH);
      expect(overruled?.urls).toEqual(['https://a.example.com/']);
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
    ).toBe(200);
    expect(
      plan({ action: 'crawl', urls: ['https://a.com/'], maxPages: -3, narration: 'x' })?.maxPages,
    ).toBe(12);
  });

  // Shown to the user as the AI thinking, so it is kept, trimmed and bounded.
  it('keeps the planner thinking, bounded, and defaults it to empty', () => {
    const long = 'why '.repeat(400);
    expect(
      plan({ action: 'search', urls: [], query: 'abc', narration: 'x', thinking: long })?.thinking
        .length,
    ).toBe(800);
    expect(plan({ action: 'search', urls: [], query: 'abc', narration: 'x' })?.thinking).toBe('');
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
      thinking: '',
    });
  });

  it('returns null when the reply is unusable', () => {
    expect(parseCrawlFollowUp('nope')).toBeNull();
    expect(parseCrawlFollowUp('{"needsSearch":"yes"}')).toBeNull();
  });
});
