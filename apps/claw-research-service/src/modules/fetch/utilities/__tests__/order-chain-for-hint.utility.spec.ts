import { type FetchStrategyConfig, FetchStrategyKind } from '../../../../generated/prisma';
import { FetchRenderHint } from '../../enums/fetch-render-hint.enum';
import { orderChainForHint } from '../escalation-helpers.utility';

const chain = [
  FetchStrategyKind.OFFICIAL_API,
  FetchStrategyKind.HTTP_PLAIN,
  FetchStrategyKind.HTTP_TLS_IMPERSONATE,
  FetchStrategyKind.HEADLESS_BROWSER,
  FetchStrategyKind.CRAWL4AI,
  FetchStrategyKind.READER_PROXY,
  FetchStrategyKind.ARCHIVE_SNAPSHOT,
].map((kind) => ({ kind }) as FetchStrategyConfig);

const kindsOf = (ordered: FetchStrategyConfig[]): FetchStrategyKind[] =>
  ordered.map((config) => config.kind);

describe('orderChainForHint', () => {
  it('leaves the chain alone without a hint', () => {
    expect(kindsOf(orderChainForHint(chain, undefined))).toEqual(kindsOf(chain));
  });

  it('js: renderers first after the official API; reader and archive stay last', () => {
    expect(kindsOf(orderChainForHint(chain, FetchRenderHint.JS))).toEqual([
      FetchStrategyKind.OFFICIAL_API,
      FetchStrategyKind.HEADLESS_BROWSER,
      FetchStrategyKind.CRAWL4AI,
      FetchStrategyKind.HTTP_PLAIN,
      FetchStrategyKind.HTTP_TLS_IMPERSONATE,
      FetchStrategyKind.READER_PROXY,
      FetchStrategyKind.ARCHIVE_SNAPSHOT,
    ]);
  });

  it('stealth: browser-like tiers first; never adds or drops a tier', () => {
    const ordered = orderChainForHint(chain, FetchRenderHint.STEALTH);
    expect(kindsOf(ordered).slice(0, 3)).toEqual([
      FetchStrategyKind.OFFICIAL_API,
      FetchStrategyKind.HTTP_TLS_IMPERSONATE,
      FetchStrategyKind.HEADLESS_BROWSER,
    ]);
    expect(ordered).toHaveLength(chain.length);
  });
});
