import { SALIENT_SEARCH_WORD_LIMIT } from '../../constants/salient-terms.constants';
import { extractSalientTerms, searchTermsFor } from '../salient-terms.utility';

/**
 * Why the word search is capped at all.
 *
 * Each term is now one bounded query, so the cap is a spend limit rather than
 * a relevance filter: a common word costs a small scan and earns a floor
 * weight, and cannot evict anything. It used to be both, and failed as both —
 * a live round reproduced it exactly, "10 candidates from 200 hits", with the
 * thread that stated the fact minutes earlier not among them.
 */
describe('searchTermsFor caps the word path', () => {
  it('keeps only the most discriminating words', () => {
    const terms = extractSalientTerms(
      'create a file in the workspace and record the deployment codename for the releases',
    );

    const search = searchTermsFor(terms);

    expect(search.length).toBeLessThanOrEqual(SALIENT_SEARCH_WORD_LIMIT);
    // Words arrive longest-first, which is the proxy for discriminating power.
    expect(search).toContain('deployment');
  });

  it('leaves an identifier search alone, however many identifiers there are', () => {
    // Identifiers are already the precision gate; capping them would drop a
    // subject the user named explicitly.
    const terms = extractSalientTerms('compare ORCHID-731 with MERIDIAN-88 and ATLAS-12');

    expect(searchTermsFor(terms)).toEqual(['ORCHID-731', 'MERIDIAN-88', 'ATLAS-12']);
  });

  it('returns every word when there are few of them', () => {
    const terms = extractSalientTerms('canary cohort codename');

    expect(searchTermsFor(terms)).toHaveLength(3);
  });
});

/**
 * The word cap, measured against the prompt that exposed it.
 *
 * Words are ranked longest-first, which is a weak proxy and ranked this prompt
 * exactly backwards: `conversation`, `containing`, `genuinely`, `operation`,
 * `workspace` and `inventing` are the six longest, and none of them says
 * anything about the subject. At a cap of six, the only two words that could
 * find the right thread — `cohort` and `canary` — never reached the database.
 */
describe('a search keeps the words that identify the subject', () => {
  const prompt = [
    'In an earlier conversation I gave you the canary cohort codename for ClawAI',
    'releases. Create COHORT.txt with workspace.file operation "create" containing',
    'only that codename. If you genuinely do not have it, write UNKNOWN instead of',
    'inventing one. Reply DONE.',
  ].join(' ');

  it('searches on the subject words, not only the longest ones', () => {
    const terms = searchTermsFor(extractSalientTerms(prompt));

    expect(terms).toContain('cohort');
    expect(terms).toContain('canary');
  });

  it('stays bounded, because each term costs its own query', () => {
    expect(searchTermsFor(extractSalientTerms(prompt)).length).toBeLessThanOrEqual(
      SALIENT_SEARCH_WORD_LIMIT,
    );
  });
});
