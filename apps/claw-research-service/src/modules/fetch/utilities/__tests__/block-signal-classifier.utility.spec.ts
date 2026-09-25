import { BlockSignalKind } from '../../../../common/enums/block-signal-kind.enum';
import {
  classifyBlockSignal,
  classifyBlockSignalFromError,
} from '../block-signal-classifier.utility';

const LONG = 'a'.repeat(500);

describe('classifyBlockSignal', () => {
  it('returns NONE for an ordinary page', () => {
    expect(classifyBlockSignal({ httpStatus: 200, content: LONG, mimeType: 'text/html' })).toBe(
      BlockSignalKind.NONE,
    );
  });

  it.each([
    [401, BlockSignalKind.AUTH_REQUIRED],
    [407, BlockSignalKind.AUTH_REQUIRED],
    [451, BlockSignalKind.LEGAL_UNAVAILABLE],
    [404, BlockSignalKind.NOT_FOUND],
    [410, BlockSignalKind.NOT_FOUND],
    [429, BlockSignalKind.RATE_LIMITED],
    [403, BlockSignalKind.FORBIDDEN],
    [503, BlockSignalKind.JS_CHALLENGE],
    [500, BlockSignalKind.UNKNOWN_ERROR],
  ])('maps HTTP %i to %s', (status, signal) => {
    expect(classifyBlockSignal({ httpStatus: status, content: LONG, mimeType: 'text/html' })).toBe(
      signal,
    );
  });

  it('spots a Cloudflare interstitial served with a 200', () => {
    expect(
      classifyBlockSignal({
        httpStatus: 200,
        content: 'Just a moment... checking',
        mimeType: 'text/html',
      }),
    ).toBe(BlockSignalKind.JS_CHALLENGE);
  });

  it('ranks a captcha above a JS challenge', () => {
    expect(
      classifyBlockSignal({
        httpStatus: 200,
        content: 'Just a moment... <div class="g-recaptcha"></div>',
        mimeType: 'text/html',
      }),
    ).toBe(BlockSignalKind.CAPTCHA);
  });

  it('ranks an explicit 401 above any marker', () => {
    expect(
      classifyBlockSignal({
        httpStatus: 401,
        content: 'verify you are human',
        mimeType: 'text/html',
      }),
    ).toBe(BlockSignalKind.AUTH_REQUIRED);
  });

  it('calls a thin, script-driven page an empty JS shell', () => {
    expect(
      classifyBlockSignal({
        httpStatus: 200,
        content: 'Loading…',
        mimeType: 'text/html',
        rawHtml: '<div id="root"></div><script src="/app.js"></script>',
      }),
    ).toBe(BlockSignalKind.EMPTY_JS_SHELL);
  });

  it('takes a thin static page (example.com) at its word', () => {
    expect(
      classifyBlockSignal({
        httpStatus: 200,
        content: 'Example Domain. This domain is for use in examples.',
        mimeType: 'text/html',
        rawHtml: '<html><body><h1>Example Domain</h1></body></html>',
      }),
    ).toBe(BlockSignalKind.NONE);
  });

  it('never calls non-HTML thin content a shell', () => {
    expect(
      classifyBlockSignal({ httpStatus: 200, content: 'ok', mimeType: 'application/json' }),
    ).toBe(BlockSignalKind.NONE);
  });
});

describe('classifyBlockSignalFromError', () => {
  it('reads an unresolvable host as a dead page', () => {
    expect(classifyBlockSignalFromError(new Error('getaddrinfo ENOTFOUND gone.example'))).toBe(
      BlockSignalKind.NOT_FOUND,
    );
    const wrapped = new Error('fetch failed', {
      cause: new Error('connect ECONNREFUSED 1.2.3.4:443'),
    });
    expect(classifyBlockSignalFromError(wrapped)).toBe(BlockSignalKind.NOT_FOUND);
  });

  it('reads anything else as an unknown error', () => {
    expect(classifyBlockSignalFromError(new Error('socket hang up'))).toBe(
      BlockSignalKind.UNKNOWN_ERROR,
    );
    expect(classifyBlockSignalFromError('not an error')).toBe(BlockSignalKind.UNKNOWN_ERROR);
  });
});
