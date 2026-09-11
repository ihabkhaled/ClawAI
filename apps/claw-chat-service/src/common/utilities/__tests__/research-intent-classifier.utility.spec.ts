import { ResearchMode } from '../../enums/research-mode.enum';
import { ResearchWorkflow } from '../../enums/research-workflow.enum';
import { classifyResearchWorkflow } from '../research-intent-classifier.utility';

/**
 * The only auto-routing behaviour built so far — deliberately narrow. An
 * already-enabled research mode is upgraded to SITE_CRAWL only when the
 * message's own language unambiguously asks for a whole site AND contains a
 * URL. It must never turn research on, and must never upgrade a SEARCH_ONLY
 * choice, which was selected and priced as a mode that does not fetch pages
 * at all.
 */
describe('classifyResearchWorkflow', () => {
  it('upgrades to SITE_CRAWL when the message asks to crawl a URL', () => {
    const result = classifyResearchWorkflow(
      ResearchMode.SEARCH_FETCH,
      'Thoroughly discover, crawl, fetch, and understand https://example.com',
    );
    expect(result).toBe(ResearchWorkflow.SITE_CRAWL);
  });

  it('upgrades on "audit this website" phrasing with a URL', () => {
    const result = classifyResearchWorkflow(
      ResearchMode.SEARCH_FETCH,
      'audit this website: https://example.com and tell me what is wrong',
    );
    expect(result).toBe(ResearchWorkflow.SITE_CRAWL);
  });

  it('does not upgrade crawl language with no URL present', () => {
    const result = classifyResearchWorkflow(ResearchMode.SEARCH_FETCH, 'crawl my website please');
    expect(result).toBe(ResearchWorkflow.SEARCH_THEN_FETCH);
  });

  it('does not upgrade a plain fetch request with a URL but no crawl language', () => {
    // This is the spec's own regression case: a plain "search and fetch"
    // request must stay exactly that, not become a 20-page crawl.
    const result = classifyResearchWorkflow(
      ResearchMode.SEARCH_FETCH,
      'search for https://example.com and fetch what it is doing',
    );
    expect(result).toBe(ResearchWorkflow.SEARCH_THEN_FETCH);
  });

  it('never upgrades SEARCH_ONLY, even with crawl language and a URL', () => {
    // SEARCH_ONLY was chosen and priced as a mode that does not fetch pages
    // at all; crawling twenty of them is the opposite of what was asked for.
    const result = classifyResearchWorkflow(
      ResearchMode.SEARCH,
      'crawl https://example.com and audit it',
    );
    expect(result).toBe(ResearchWorkflow.SEARCH_ONLY);
  });

  it('never runs when research is off (caller short-circuits before this, but the function is still safe)', () => {
    const result = classifyResearchWorkflow(ResearchMode.NONE, 'crawl https://example.com');
    expect(result).toBe(ResearchWorkflow.SEARCH_ONLY);
  });

  it('upgrades SEARCH_EXTRACT the same way as SEARCH_FETCH', () => {
    const result = classifyResearchWorkflow(
      ResearchMode.SEARCH_EXTRACT,
      'crawl https://example.com',
    );
    expect(result).toBe(ResearchWorkflow.SITE_CRAWL);
  });

  it('matches "map the site" phrasing', () => {
    const result = classifyResearchWorkflow(
      ResearchMode.SEARCH_FETCH,
      'map the site at https://example.com',
    );
    expect(result).toBe(ResearchWorkflow.SITE_CRAWL);
  });

  it('is case-insensitive', () => {
    const result = classifyResearchWorkflow(
      ResearchMode.SEARCH_FETCH,
      'CRAWL https://EXAMPLE.com please',
    );
    expect(result).toBe(ResearchWorkflow.SITE_CRAWL);
  });
});
