import { ResearchMode } from '../../../../common/enums/research-mode.enum';
import {
  resolveAutoResearchMode,
  resolveEffectiveResearchMode,
} from '../auto-research-mode.utility';

describe('resolveAutoResearchMode', () => {
  it('fetches the page when the link has no scheme', () => {
    expect(resolveAutoResearchMode('what does example.com/pricing say')).toBe(
      ResearchMode.SEARCH_FETCH,
    );
  });

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

describe('resolveAutoResearchMode — the 13 locales and whole words', () => {
  it.each([
    ['en', 'what is the newest iPhone'],
    ['de', 'Was sind die neuesten Nachrichten über Tesla?'],
    ['es', 'dame las últimas noticias de hoy'],
    ['fr', "quelles sont les actualités d'aujourd'hui"],
    ['it', 'quali sono le ultime notizie'],
    ['pt', 'quais são as últimas notícias de hoje'],
    ['ru', 'какие сегодня новости про Tesla'],
    ['ar', 'ما هي آخر الأخبار اليوم'],
    ['fa', 'آخرین اخبار امروز چیست'],
    ['hi', 'आज की ताज़ा खबर क्या है'],
    ['ja', 'テスラの最新ニュースを教えて'],
    ['th', 'ข่าวล่าสุดของเทสลาคืออะไร'],
    ['zh', '请告诉我特斯拉的最新消息'],
  ])('%s: a freshness question searches', (_locale, prompt) => {
    expect(resolveAutoResearchMode(prompt)).toBe(ResearchMode.SEARCH);
  });

  it.each([
    ['es', 'busca en internet el precio del cobre'],
    ['fr', 'cherche sur le web les avis sur ce produit'],
    ['de', 'bitte im Internet suchen'],
    ['zh', '请上网搜索这个问题'],
    ['ja', 'ネットで調べてください'],
  ])('%s: an explicit request for the web searches', (_locale, prompt) => {
    expect(resolveAutoResearchMode(prompt)).toBe(ResearchMode.SEARCH);
  });

  it.each([
    'write the newsletter intro for our launch',
    'recentering the divs with flexbox',
    'the nowhere man lyrics, explain the metaphor',
    'rewrite this paragraph so it reads better',
    'Das ist ein Hochhaus in Berlin',
    'Ich habe heutzutage keine Zeit für Hobbys',
    'आजादी का अर्थ समझाइए',
  ])('"%s" stays NONE (a marker inside a longer word is not a marker)', (prompt) => {
    expect(resolveAutoResearchMode(prompt)).toBe(ResearchMode.NONE);
  });
});

describe('resolveEffectiveResearchMode', () => {
  it.each([ResearchMode.AUTO, ResearchMode.SEARCH, ResearchMode.SEARCH_FETCH])(
    'resolves %s to NONE when there is no typed text (attachment-only send)',
    (mode) => {
      expect(resolveEffectiveResearchMode(mode, '')).toBe(ResearchMode.NONE);
      expect(resolveEffectiveResearchMode(mode, ' . ')).toBe(ResearchMode.NONE);
    },
  );

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
