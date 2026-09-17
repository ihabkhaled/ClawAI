import { ResearchMode } from '../../../../common/enums/research-mode.enum';
import {
  resolveAutoResearchMode,
  resolveEffectiveResearchMode,
} from '../auto-research-mode.utility';

describe('resolveAutoResearchMode', () => {
  it('fetches the page when the prompt contains a link', () => {
    // The case the manual-only flow handled worst: the link was ignored unless
    // a fetch mode had been selected first.
    expect(resolveAutoResearchMode('summarise https://example.com/post for me')).toBe(
      ResearchMode.SEARCH_FETCH,
    );
  });

  it('works on a link regardless of the language around it', () => {
    // The URL rule is the only signal here that is language-independent.
    expect(resolveAutoResearchMode('لخص https://example.com/post')).toBe(ResearchMode.SEARCH_FETCH);
  });

  it('searches when the answer depends on what is true right now', () => {
    for (const prompt of [
      'what is the latest news on that',
      'who won today',
      'current price of copper',
      'find sources for this claim',
    ]) {
      expect(resolveAutoResearchMode(prompt)).toBe(ResearchMode.SEARCH);
    }
  });

  it('stays quiet for a question the web cannot answer better', () => {
    // A false positive spends the user's search allowance and adds latency to
    // a question that never needed the web. A miss costs only what the product
    // already did.
    for (const prompt of [
      'write me a haiku about rain',
      'refactor this function to use a map',
      'explain how a hash table works',
    ]) {
      expect(resolveAutoResearchMode(prompt)).toBe(ResearchMode.NONE);
    }
  });
});

describe('resolveEffectiveResearchMode', () => {
  it('never lets AUTO reach the research call', () => {
    expect(resolveEffectiveResearchMode(ResearchMode.AUTO, 'latest news')).toBe(
      ResearchMode.SEARCH,
    );
    expect(resolveEffectiveResearchMode(ResearchMode.AUTO, 'write a poem')).toBe(ResearchMode.NONE);
  });

  it('leaves an explicit choice alone', () => {
    // The user overrode the default on purpose; detection must not argue.
    expect(resolveEffectiveResearchMode(ResearchMode.SEARCH, 'write a poem')).toBe(
      ResearchMode.SEARCH,
    );
    expect(resolveEffectiveResearchMode(ResearchMode.NONE, 'latest news today')).toBe(
      ResearchMode.NONE,
    );
  });

  it('treats an absent mode as no research', () => {
    expect(resolveEffectiveResearchMode(undefined, 'latest news')).toBe(ResearchMode.NONE);
  });
});
