import { BlockSignalKind } from '../../../../common/enums/block-signal-kind.enum';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { hasTerminalSignal, isStrategyEligible } from '../escalation-policy.utility';

const ALL = Object.values(FetchStrategyKind);

function eligible(signals: BlockSignalKind[]): FetchStrategyKind[] {
  return ALL.filter((kind) => isStrategyEligible(kind, new Set(signals)));
}

describe('isStrategyEligible', () => {
  it('lets everything but FlareSolverr run before any signal', () => {
    expect(eligible([])).toEqual(ALL.filter((kind) => kind !== FetchStrategyKind.FLARESOLVERR));
  });

  it.each([BlockSignalKind.AUTH_REQUIRED, BlockSignalKind.LEGAL_UNAVAILABLE])(
    'lets nothing run after %s',
    (signal) => {
      expect(eligible([signal])).toEqual([]);
      expect(hasTerminalSignal(new Set([signal]))).toBe(true);
    },
  );

  it.each([
    BlockSignalKind.CAPTCHA,
    BlockSignalKind.RATE_LIMITED,
    BlockSignalKind.NOT_FOUND,
    BlockSignalKind.ROBOTS_UNREACHABLE,
  ])('leaves only the public archive after %s', (signal) => {
    expect(eligible([signal])).toEqual([FetchStrategyKind.ARCHIVE_SNAPSHOT]);
  });

  it('opens FlareSolverr only after a JS challenge', () => {
    expect(eligible([BlockSignalKind.JS_CHALLENGE])).toContain(FetchStrategyKind.FLARESOLVERR);
    expect(eligible([BlockSignalKind.FORBIDDEN])).not.toContain(FetchStrategyKind.FLARESOLVERR);
  });

  it('after an empty shell, skips non-rendering origin clients and the archive', () => {
    const afterShell = eligible([BlockSignalKind.EMPTY_JS_SHELL]);
    expect(afterShell).not.toContain(FetchStrategyKind.HTTP_PLAIN);
    expect(afterShell).not.toContain(FetchStrategyKind.HTTP_TLS_IMPERSONATE);
    expect(afterShell).not.toContain(FetchStrategyKind.ARCHIVE_SNAPSHOT);
    expect(afterShell).toContain(FetchStrategyKind.HEADLESS_BROWSER);
    expect(afterShell).toContain(FetchStrategyKind.READER_PROXY);
  });

  it('lets the archive run once a real block joins the empty shell', () => {
    expect(eligible([BlockSignalKind.EMPTY_JS_SHELL, BlockSignalKind.FORBIDDEN])).toContain(
      FetchStrategyKind.ARCHIVE_SNAPSHOT,
    );
  });
});
