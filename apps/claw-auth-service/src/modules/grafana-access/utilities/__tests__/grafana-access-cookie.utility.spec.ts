import {
  grafanaAccessCookieOptions,
  readGrafanaAccessCookie,
} from '../grafana-access-cookie.utility';

describe('readGrafanaAccessCookie', () => {
  it.each([
    [undefined, null],
    ['', null],
    ['claw_grafana=abc.def.ghi', 'abc.def.ghi'],
    ['theme=dark; claw_grafana=tok; claw_session=1', 'tok'],
    ['  claw_grafana = spaced ', 'spaced'],
    ['claw_grafana=', null],
    ['claw_grafana_other=nope; x=1', null],
    ['not-a-cookie; claw_grafana=ok', 'ok'],
  ])('reads %j as %j', (header, expected) => {
    expect(readGrafanaAccessCookie(header)).toBe(expected);
  });
});

describe('grafanaAccessCookieOptions', () => {
  it('is httpOnly, Secure, SameSite=Lax, scoped to /grafana, and in milliseconds', () => {
    expect(grafanaAccessCookieOptions(900)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/grafana',
      maxAge: 900_000,
    });
  });
});
