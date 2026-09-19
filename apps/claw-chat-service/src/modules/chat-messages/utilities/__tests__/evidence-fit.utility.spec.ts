import { fitEvidenceToBudget } from '../evidence-fit.utility';

const item = (n: number, snippetChars: number) => ({
  title: `Page ${String(n)}`,
  url: `https://example.com/p${String(n)}`,
  snippet: 'x'.repeat(snippetChars),
});

describe('fitEvidenceToBudget', () => {
  it('keeps everything untouched when it fits', () => {
    const items = [item(1, 100), item(2, 100)];
    expect(fitEvidenceToBudget(items, 10_000)).toEqual({ items, omitted: 0 });
  });

  // A big-context model still gets every page, just shorter.
  it('shortens every snippet evenly before dropping anything', () => {
    const items = Array.from({ length: 10 }, (_, i) => item(i, 2_000));
    const result = fitEvidenceToBudget(items, 6_000);
    expect(result.omitted).toBe(0);
    expect(result.items).toHaveLength(10);
    expect(result.items.every((entry) => entry.snippet.length < 600)).toBe(true);
  });

  // 200 crawled pages into a small model: keep the best-ranked, and report the
  // rest so the prompt can say what was left out rather than hide it.
  it('keeps the highest-ranked items and reports how many it dropped', () => {
    const items = Array.from({ length: 200 }, (_, i) => item(i, 1_500));
    const result = fitEvidenceToBudget(items, 20_000);
    expect(result.items[0]?.url).toBe('https://example.com/p0');
    expect(result.omitted).toBe(200 - result.items.length);
    expect(result.omitted).toBeGreaterThan(0);
    const used = result.items.reduce(
      (sum, entry) => sum + entry.snippet.length + entry.url.length,
      0,
    );
    expect(used).toBeLessThanOrEqual(20_000);
  });
});
